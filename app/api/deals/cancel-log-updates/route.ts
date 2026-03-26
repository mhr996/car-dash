import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { patchDealCancelledInLogs } from '@/utils/deal-cancel-logs';

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
        const { dealId, cancellationReason, cancelledAt } = body;

        if (!dealId || typeof cancellationReason !== 'string' || !cancellationReason.trim()) {
            return NextResponse.json({ error: 'dealId and cancellationReason are required' }, { status: 400 });
        }
        if (typeof cancelledAt !== 'string' || !cancelledAt.trim()) {
            return NextResponse.json({ error: 'cancelledAt is required' }, { status: 400 });
        }

        const admin = createClient(url, serviceKey, {
            auth: { autoRefreshToken: false, persistSession: false },
        });

        await patchDealCancelledInLogs(admin, String(dealId), cancellationReason.trim(), {
            cancelledAt: cancelledAt.trim(),
        });

        return NextResponse.json({ ok: true });
    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : 'Internal error';
        console.error('cancel-log-updates:', e);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
