import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendSMS } from '@/lib/sms-019service';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * POST /api/messages/send
 * Save message + send via SMS provider (when integrated)
 *
 * Body: {
 *   recipient: string,
 *   type: string,
 *   subject?: string,
 *   content: string,
 *   target_type: 'all' | 'group' | 'individual',
 *   customer_id?: string,
 *   phone_numbers?: string[],
 *   group_filter?: string
 * }
 *
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const {
            recipient,
            type,
            subject,
            content,
            target_type = 'individual',
            customer_id,
            phone_numbers,
            group_filter,
            sms_username,
            sms_token,
            sms_source,
        } = body;

        if (!recipient || !type || !content) {
            return NextResponse.json(
                { error: 'recipient, type, and content are required' },
                { status: 400 }
            );
        }

        // 1. Save to database (minimal columns for compatibility)
        const { data: savedMessage, error: insertError } = await supabaseAdmin
            .from('messages')
            .insert({
                recipient,
                type,
                content,
                status: 'pending',
            })
            .select()
            .single();

        if (insertError) {
            console.error('Message insert error:', insertError);
            return NextResponse.json({ error: insertError.message }, { status: 500 });
        }

        // 2. Send via 019sms if phone_numbers provided
        const numbers = Array.isArray(phone_numbers) ? phone_numbers : [];
        let status = 'sent';
        let errorMessage: string | null = null;

        if (numbers.length > 0) {
            const creds =
                sms_username && sms_token
                    ? { username: sms_username, token: sms_token, source: sms_source }
                    : undefined;
            const result = await sendSMS(numbers, content, creds);
            if (result.success) {
                status = 'sent';
            } else {
                status = 'failed';
                errorMessage = result.error || result.message || 'SMS send failed';
            }
        }

        const updateData: { status: string; sent_at?: string } = { status };
        if (status === 'sent') updateData.sent_at = new Date().toISOString();
        await supabaseAdmin.from('messages').update(updateData).eq('id', savedMessage.id);

        if (status === 'failed') {
            return NextResponse.json(
                { error: errorMessage, data: { ...savedMessage, status: 'failed' } },
                { status: 502 }
            );
        }

        return NextResponse.json({
            data: { ...savedMessage, status: 'sent' },
            message: 'Message saved and sent',
        });
    } catch (err) {
        console.error('Send message API error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
