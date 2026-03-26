import type { SupabaseClient } from '@supabase/supabase-js';
import supabase from '@/lib/supabase';
import { patchDealCancelledInLogs } from '@/utils/deal-cancel-logs';

type JsonLogRow = {
    id: string;
    deal?: { id?: string | number } | null;
    car?: { id?: string | number } | null;
};

async function fetchRelevantLogs(
    db: SupabaseClient,
    dealId: string,
    customerCarId: string | null | undefined,
    showroomCarId: string | null | undefined,
): Promise<JsonLogRow[]> {
    const byId = new Map<string, JsonLogRow>();
    const merge = (rows: JsonLogRow[] | null) => {
        for (const r of rows || []) byId.set(r.id, r);
    };

    const did = String(dealId);

    const { data: byDeal, error: errDeal } = await db.from('logs').select('*').eq('deal->>id', did);
    if (errDeal) {
        console.warn('exchange-deal-cancel: deal->>id filter failed, using scan fallback', errDeal.message);
    } else {
        merge(byDeal as JsonLogRow[]);
    }

    if (customerCarId) {
        const cid = String(customerCarId);
        const { data: byCar, error: errCar } = await db.from('logs').select('*').eq('car->>id', cid);
        if (errCar) {
            console.warn('exchange-deal-cancel: car->>id filter failed (customer car)', errCar.message);
        } else {
            merge(byCar as JsonLogRow[]);
        }
    }

    if (showroomCarId) {
        const sid = String(showroomCarId);
        const { data: byShow, error: errShow } = await db.from('logs').select('*').eq('car->>id', sid);
        if (errShow) {
            console.warn('exchange-deal-cancel: car->>id filter failed (showroom car)', errShow.message);
        } else {
            merge(byShow as JsonLogRow[]);
        }
    }

    if (byId.size > 0) {
        return Array.from(byId.values());
    }

    const { data: scan, error: scanErr } = await db.from('logs').select('*').order('created_at', { ascending: false }).limit(8000);

    if (scanErr) {
        console.error('exchange-deal-cancel: log scan failed', scanErr);
        return [];
    }

    const out: JsonLogRow[] = [];
    for (const log of (scan || []) as JsonLogRow[]) {
        let hit = false;
        if (log.deal && String(log.deal.id) === did) hit = true;
        if (customerCarId && log.car && String(log.car.id) === String(customerCarId)) hit = true;
        if (showroomCarId && log.car && String(log.car.id) === String(showroomCarId)) hit = true;
        if (hit) out.push(log);
    }
    return out;
}

/**
 * After an exchange deal is marked cancelled and FK fields cleared on `deals`,
 * mark the customer trade-in car as returned (archived), annotate logs, and re-log the showroom car as inventory.
 *
 * @param db — Pass a service-role client from the API route if browser RLS blocks updates.
 */
export async function applyExchangeDealCancellationSideEffects(
    params: {
        dealId: string;
        customerCarId: string | null | undefined;
        showroomCarId: string | null | undefined;
        cancellationReason: string;
    },
    db: SupabaseClient = supabase as unknown as SupabaseClient,
): Promise<void> {
    const { dealId, customerCarId, showroomCarId, cancellationReason } = params;

    if (customerCarId) {
        const { data: updatedCar, error: carErr } = await db
            .from('cars')
            .update({
                status: 'returned_to_customer',
                public: false,
            })
            .eq('id', customerCarId)
            .select('id,status')
            .maybeSingle();

        if (carErr) {
            console.error('exchange-deal-cancel: failed to update customer trade-in car', carErr);
            throw carErr;
        }
        if (!updatedCar) {
            throw new Error(
                'Could not update customer trade-in car (no row or RLS blocked read/write). Use API with SUPABASE_SERVICE_ROLE_KEY or fix RLS on cars.',
            );
        }
        if (updatedCar.status !== 'returned_to_customer') {
            throw new Error(
                'cars.status must allow returned_to_customer. Run the SQL in migrations/supabase_exchange_cancel.sql or relax cars_status_check.',
            );
        }
    }

    await patchDealCancelledInLogs(db, dealId, cancellationReason, { exchangeCancelled: true });

    const logs = await fetchRelevantLogs(db, dealId, customerCarId, showroomCarId);
    const logErrors: string[] = [];

    for (const log of logs) {
        const row = log as JsonLogRow & { deal?: Record<string, unknown>; car?: Record<string, unknown> };
        const updates: Record<string, unknown> = {};
        let touched = false;

        if (customerCarId && row.car && String((row.car as { id?: string }).id) === String(customerCarId)) {
            updates.car = {
                ...row.car,
                status: 'returned_to_customer',
                returned_to_customer: true,
                deal_cancelled: true,
            };
            touched = true;
        }

        if (showroomCarId && row.car && String((row.car as { id?: string }).id) === String(showroomCarId)) {
            const nextCar = {
                ...(typeof updates.car === 'object' && updates.car !== null ? (updates.car as object) : row.car),
                exchange_returned_to_showroom: true,
                deal_cancelled_showroom_restored: true,
            };
            updates.car = nextCar;
            touched = true;
        }

        if (touched) {
            const { error: upErr } = await db.from('logs').update(updates).eq('id', row.id);
            if (upErr) {
                console.error('exchange-deal-cancel: log update failed', row.id, upErr);
                logErrors.push(`${row.id}: ${upErr.message}`);
            }
        }
    }

    if (logErrors.length > 0) {
        throw new Error(`Failed to update some activity logs (${logErrors.length}). First: ${logErrors[0]}`);
    }

    if (showroomCarId) {
        const { error: pubErr } = await db.from('cars').update({ public: true }).eq('id', showroomCarId);
        if (pubErr) console.error('exchange-deal-cancel: showroom public update', pubErr);

        const { data: carRow, error: carErr } = await db
            .from('cars')
            .select(
                `
                *,
                providers:providers!cars_provider_fkey(id, name, address, phone)
            `,
            )
            .eq('id', showroomCarId)
            .single();

        if (!carErr && carRow) {
            const r = carRow as Record<string, unknown> & { providers?: unknown };
            const enrichedCar: Record<string, unknown> = {
                ...r,
                exchange_returned_to_showroom: true,
                deal_cancelled_showroom_restored: true,
            };
            if (r.providers) {
                enrichedCar.provider_details = r.providers;
            }

            const { error: insErr } = await db.from('logs').insert([{ type: 'car_added', car: enrichedCar }]);
            if (insErr) {
                console.error('exchange-deal-cancel: failed to insert showroom car_added log', insErr);
                throw insErr;
            }
        }
    }
}
