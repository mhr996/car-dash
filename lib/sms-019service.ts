/**
 * 019sms.co.il SMS Service
 * Send SMS via 019sms API - adapted from smsService.ts for Car Dash
 */

const SMS_API_URL = process.env.SMS_019_API_URL || process.env.EXPO_PUBLIC_019SMS_API_URL || 'https://019sms.co.il/api';
const SMS_TOKEN = process.env.SMS_019_TOKEN || process.env.EXPO_PUBLIC_019SMS_TOKEN || '';
const SMS_USERNAME = process.env.SMS_019_USERNAME || process.env.EXPO_PUBLIC_019SMS_USERNAME || '';
const SMS_SOURCE = process.env.SMS_019_SOURCE || process.env.EXPO_PUBLIC_019SMS_SOURCE || 'Mynbo';

export interface SendSMSResult {
    success: boolean;
    status?: number;
    message?: string;
    error?: string;
}

/**
 * Format phone number for 019sms API (5xxxxxxx or 05xxxxxxx)
 */
export function formatPhoneForSMS(phone: string): string {
    let cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('972')) {
        cleaned = '0' + cleaned.substring(3);
    }
    if (!cleaned.startsWith('0') && cleaned.startsWith('5')) {
        cleaned = '0' + cleaned;
    }
    return cleaned;
}

/**
 * Validate Israeli phone number
 */
export function validateIsraeliPhone(phone: string): boolean {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10 && cleaned.startsWith('05')) return true;
    if (cleaned.length === 9 && cleaned.startsWith('5')) return true;
    if (cleaned.length === 12 && cleaned.startsWith('9725')) return true;
    return false;
}

export interface SMSCredentials {
    username?: string;
    token?: string;
    source?: string;
}

/**
 * Send SMS via 019sms.co.il API
 * @param phoneNumbers - Array of phone numbers (format: 05xxxxxxxx or 5xxxxxxxx)
 * @param message - SMS content (max 1005 chars)
 * @param overrides - Optional credentials to override env (for testing from settings)
 * @returns SendSMSResult
 */
export async function sendSMS(
    phoneNumbers: string[],
    message: string,
    overrides?: SMSCredentials
): Promise<SendSMSResult> {
    const username = overrides?.username || SMS_USERNAME;
    const token = overrides?.token || SMS_TOKEN;
    const source = overrides?.source || SMS_SOURCE;

    if (!token || !username || !source) {
        return {
            success: false,
            error: 'SMS credentials not configured (SMS_019_TOKEN, SMS_019_USERNAME, SMS_019_SOURCE)',
        };
    }

    const validPhones = phoneNumbers
        .map((p) => formatPhoneForSMS(p))
        .filter((p) => validateIsraeliPhone(p));

    if (validPhones.length === 0) {
        return { success: false, error: 'No valid Israeli phone numbers provided' };
    }

    const msg = message.slice(0, 1005).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
    const phonesXml = validPhones.map((p) => `<phone>${p}</phone>`).join('');

    const xmlBody = `<?xml version="1.0" encoding="UTF-8"?>
<sms>
<user><username>${username}</username></user>
<source>${source}</source>
<destinations>${phonesXml}</destinations>
<message>${msg}</message>
</sms>`;

    try {
        const res = await fetch(SMS_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/xml',
                Accept: 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: xmlBody,
        });

        const text = await res.text();
        let data: { status?: number; message?: string; sms?: { status?: number; message?: string } } = {};
        try {
            data = JSON.parse(text);
        } catch {
            // non-JSON response
        }

        const responseData = data.sms || data;
        const status = Number(responseData.status ?? -1);

        if (process.env.NODE_ENV === 'development' && status !== 0) {
            console.log('[019sms] FAIL:', responseData.message || text);
        }

        // status 0 = success per 019sms docs
        if (status === 0 || res.ok) {
            return {
                success: true,
                status,
                message: responseData.message || 'Sent',
            };
        }

        const errMsg = responseData.message || text || `HTTP ${res.status}`;
        return {
            success: false,
            status,
            message: responseData.message,
            error: errMsg,
        };
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error('[019sms] Error:', msg);
        return { success: false, error: msg };
    }
}
