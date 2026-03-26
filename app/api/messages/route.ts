import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/messages
 * List messages with optional filters
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const limit = parseInt(searchParams.get('limit') || '50');
        const offset = parseInt(searchParams.get('offset') || '0');
        const status = searchParams.get('status');
        const type = searchParams.get('type');
        const customerId = searchParams.get('customer_id');

        let query = supabaseAdmin
            .from('messages')
            .select('*')
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (status) query = query.eq('status', status);
        if (type) query = query.eq('type', type);
        if (customerId) query = query.eq('customer_id', customerId);

        const { data, error } = await query;

        if (error) {
            console.error('Messages fetch error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ data, count: data?.length ?? 0 });
    } catch (err) {
        console.error('Messages API error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

/**
 * POST /api/messages
 * Create a new message (save to DB)
 * Body: { recipient, recipient_display?, type, subject?, content, target_type?, customer_id?, phone_numbers?, group_filter? }
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const {
            recipient,
            recipient_display,
            type,
            subject,
            content,
            target_type = 'individual',
            customer_id,
            phone_numbers,
            group_filter,
        } = body;

        if (!recipient || !type || !content) {
            return NextResponse.json(
                { error: 'recipient, type, and content are required' },
                { status: 400 }
            );
        }

        const { data, error } = await supabaseAdmin.from('messages').insert({
            recipient,
            recipient_display: recipient_display || recipient,
            type,
            subject: subject || null,
            content,
            status: 'pending',
            target_type,
            customer_id: customer_id || null,
            phone_numbers: phone_numbers || null,
            group_filter: group_filter || null,
        }).select().single();

        if (error) {
            console.error('Message insert error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ data, message: 'Message saved' });
    } catch (err) {
        console.error('Messages API error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
