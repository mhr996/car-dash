import type { SupabaseClient } from '@supabase/supabase-js';

type LogRow = {
    id: string;
    deal?: Record<string, unknown> | null;
};

/** ISO string for `logs.deal.cancelled_at` (e.g. from date input YYYY-MM-DD → …T00:00:00.000Z) */
export async function patchDealCancelledInLogs(
    db: SupabaseClient,
    dealId: string,
    cancellationReason: string,
    options?: { exchangeCancelled?: boolean; cancelledAt: string },
): Promise<void> {
    const did = String(dealId);
    const cancelledAt = options?.cancelledAt?.trim();
    if (!cancelledAt) throw new Error('cancelledAt is required for log patch');

    const { data: rows, error } = await db.from('logs').select('id, deal').eq('deal->>id', did);

    if (error) {
        console.warn('patchDealCancelledInLogs: deal->>id filter failed', error.message);
        const { data: scan, error: scanErr } = await db
            .from('logs')
            .select('id, deal')
            .order('created_at', { ascending: false })
            .limit(8000);
        if (scanErr) {
            console.error('patchDealCancelledInLogs: scan fallback failed', scanErr);
            throw scanErr;
        }
        const matched = (scan || []).filter(
            (r: LogRow) => r.deal && String((r.deal as { id?: unknown }).id) === did,
        ) as LogRow[];
        await applyPatches(db, matched, did, cancellationReason, cancelledAt, options);
        return;
    }

    const matched = (rows || []).filter(
        (r: LogRow) => r.deal && String((r.deal as { id?: unknown }).id) === did,
    );
    await applyPatches(db, matched, did, cancellationReason, cancelledAt, options);
}

async function applyPatches(
    db: SupabaseClient,
    rows: LogRow[],
    dealId: string,
    cancellationReason: string,
    cancelledAt: string,
    options?: { exchangeCancelled?: boolean },
): Promise<void> {
    const errors: string[] = [];
    for (const row of rows) {
        const prev = row.deal;
        if (!prev || String((prev as { id?: unknown }).id) !== dealId) continue;
        const nextDeal = {
            ...prev,
            status: 'cancelled',
            cancellation_reason: cancellationReason,
            cancelled_at: cancelledAt,
            deal_cancelled: true,
            ...(options?.exchangeCancelled ? { exchange_cancelled: true } : {}),
        };
        const { error: upErr } = await db.from('logs').update({ deal: nextDeal }).eq('id', row.id);
        if (upErr) {
            console.error('patchDealCancelledInLogs: update failed', row.id, upErr);
            errors.push(`${row.id}: ${upErr.message}`);
        }
    }
    if (errors.length > 0) {
        throw new Error(`Failed to update some activity logs (${errors.length}). First: ${errors[0]}`);
    }
}
