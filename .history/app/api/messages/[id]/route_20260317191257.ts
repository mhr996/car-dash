import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/messages/[id]
 * Get single message by ID
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        if (!id) {
            return NextResponse.json({ error: 'Message ID required' }, { status: 400 });
        }

        const { data, error } = await supabaseAdmin
            .from('messages')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return NextResponse.json({ error: 'Message not found' }, { status: 404 });
            }
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ data });
    } catch (err) {
        console.error('Message API error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}


export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        if (!id) {
            return NextResponse.json({ error: 'Message ID required' }, { status: 400 });
        }

        const body = await request.json();
        const allowed = ['status', 'error_message', 'provider_message_id', 'sent_at'];
        const updates: Record<string, unknown> = {};
        for (const key of allowed) {
            if (body[key] !== undefined) updates[key] = body[key];
        }

        if (Object.keys(updates).length === 0) {
            return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
        }

        const { data, error } = await supabaseAdmin
            .from('messages')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ data });
    } catch (err) {
        console.error('Message update API error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
