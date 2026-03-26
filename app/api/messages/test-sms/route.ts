import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/messages/test-sms
 * اختبار اتصال 019sms
 * ?username=nohad&token=eyJ... لتجربة قيم مختلفة
 */
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username') || process.env.SMS_019_USERNAME || '';
    const token = searchParams.get('token') || process.env.SMS_019_TOKEN || '';
    const source = process.env.SMS_019_SOURCE || 'Mynbo';
    const apiUrl = process.env.SMS_019_API_URL || 'https://019sms.co.il/api';

    if (!token || !username) {
        return NextResponse.json({
            error: 'Missing SMS_019_USERNAME or SMS_019_TOKEN in .env.local',
            env: { hasUsername: !!username, hasToken: !!token },
        });
    }

    const xmlBody = `<?xml version="1.0" encoding="UTF-8"?>
<sms>
<user><username>${username}</username></user>
<source>${source}</source>
<destinations><phone>0500000000</phone></destinations>
<message>Test</message>
</sms>`;

    try {
        const res = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/xml',
                Accept: 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: xmlBody,
        });
        const text = await res.text();
        let parsed: unknown = text;
        try {
            parsed = JSON.parse(text);
        } catch {
            parsed = text;
        }
        return NextResponse.json({
            request: { username, source, url: apiUrl },
            response: { status: res.status, body: parsed },
        });
    } catch (err) {
        return NextResponse.json({
            error: err instanceof Error ? err.message : String(err),
            request: { username, source },
        });
    }
}
