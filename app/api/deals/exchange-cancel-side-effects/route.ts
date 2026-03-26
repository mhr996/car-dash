import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { applyExchangeDealCancellationSideEffects } from '@/utils/exchange-deal-cancel';

/**
 * Runs exchange cancellation cleanup with the service role so RLS cannot block
 * updates to cars / logs (common cause of “deal cancelled but car/logs unchanged”).
 */
export async function POST(request: NextRequest) {
    try {
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        if (!serviceKey || !url || !anonKey) {
            return NextResponse.json(
                { error: 'Server missing SUPABASE_SERVICE_ROLE_KEY or Supabase URL/anon key' },
                { status: 503 },
            );
        }

        const authHeader = request.headers.get('authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Missing or invalid Authorization header' }, { status: 401 });
        }

        const token = authHeader.slice(7);
        const supabaseAuth = createClient(url, anonKey, {
            auth: { autoRefreshToken: false, persistSession: false },
        });
        const {
            data: { user },
            error: authErr,
        } = await supabaseAuth.auth.getUser(token);
        if (authErr || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { dealId, customerCarId, showroomCarId, cancellationReason } = body;

        if (!dealId || typeof cancellationReason !== 'string' || !cancellationReason.trim()) {
            return NextResponse.json({ error: 'dealId and cancellationReason are required' }, { status: 400 });
        }

        const admin = createClient(url, serviceKey, {
            auth: { autoRefreshToken: false, persistSession: false },
        });

        await applyExchangeDealCancellationSideEffects(
            {
                dealId: String(dealId),
                customerCarId: customerCarId != null ? String(customerCarId) : null,
                showroomCarId: showroomCarId != null ? String(showroomCarId) : null,
                cancellationReason: cancellationReason.trim(),
            },
            admin,
        );

        return NextResponse.json({ ok: true });
    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : 'Internal error';
        console.error('exchange-cancel-side-effects:', e);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
