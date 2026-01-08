import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

/**
 * Tranzila API Integration Route
 *
 * This route handles communication with Tranzila billing API
 * for creating invoices and receipts.
 */

// Tranzila API Configuration
const TRANZILA_CONFIG = {
    billingApiUrl: 'https://billing5.tranzila.com/api/documents_db',
    terminal: process.env.TRanzila_TERMINAL || '',
    publicKey: process.env.TRanzila_PUBLIC_KEY || '',
    secretKey: process.env.TRanzila_SECRET_KEY || '',
};

// Function to generate Tranzila authentication headers
function generateTranzilaAuthHeaders(): {
    'X-tranzila-api-app-key': string;
    'X-tranzila-api-request-time': string;
    'X-tranzila-api-nonce': string;
    'X-tranzila-api-access-token': string;
} {
    const appKey = TRANZILA_CONFIG.publicKey;
    const secret = TRANZILA_CONFIG.secretKey;

    // Per Tranzila documentation:
    // time = Unix seconds (not ms)
    // nonce = 80 chars [A-Za-z0-9]
    // hash = HMAC_SHA256(message = appKey, key = secret + time + nonce) as HEX
    const requestTime = Math.floor(Date.now() / 1000).toString();

    // Generate 80-char alphanumeric nonce
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let nonce = '';
    for (let i = 0; i < 80; i++) {
        const idx = crypto.randomInt(0, alphabet.length);
        nonce += alphabet[idx];
    }

    const hmacKey = secret + requestTime + nonce;
    const accessToken = crypto.createHmac('sha256', hmacKey).update(appKey).digest('hex');

    return {
        'X-tranzila-api-app-key': appKey,
        'X-tranzila-api-request-time': requestTime,
        'X-tranzila-api-nonce': nonce,
        'X-tranzila-api-access-token': accessToken,
    };
}

/**
 * POST /api/tranzila
 *
 * Handles Tranzila API requests for invoices and receipts
 *
 * Request body:
 * - action: 'create_document'
 * - data: Document data (items, client info, payments, etc.)
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { action, data } = body;

        if (!action) {
            return NextResponse.json({ error: 'Missing action parameter' }, { status: 400 });
        }

        // Validate Tranzila configuration
        if (!TRANZILA_CONFIG.publicKey || !TRANZILA_CONFIG.secretKey) {
            return NextResponse.json({ error: 'Tranzila API credentials not configured' }, { status: 500 });
        }

        switch (action) {
            case 'create_document':
                return await createDocument(data);

            default:
                return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
        }
    } catch (error) {
        console.error('Tranzila API Error:', error);
        return NextResponse.json(
            {
                error: 'Internal server error',
                message: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 },
        );
    }
}

/**
 * Create an invoice/receipt document via Tranzila Billing API
 * Ref: https://docs.tranzila.com/docs/invoices/27ffheryfv066-create-document
 *
 * Document Types (Numeric Codes):
 * - 305 = Tax Invoice (חשבונית מס)
 * - 320 = Tax Invoice + Receipt (חשבונית מס קבלה)
 * - 400 = Receipt (קבלה)
 *
 * Payment Methods:
 * - 1 = Credit Card
 * - 3 = Check (Cheque)
 * - 4 = Bank Transfer
 * - 5 = Cash
 * - 6 = PayPal
 * - 10 = Other
 */
async function createDocument(data: any = {}) {
    try {
        const headers = generateTranzilaAuthHeaders();

        // Build document payload based on Tranzila invoice/document schema
        const payload: any = {
            terminal_name: TRANZILA_CONFIG.terminal,
            document_type: data.document_type || '320', // 305=Invoice, 320=Invoice+Receipt, 400=Receipt
            document_date: data.document_date || null, // Format: yyyy-mm-dd
            document_currency_code: data.document_currency_code || 'ILS',
            document_language: data.document_language || 'heb',
            response_language: data.response_language || 'eng',
            vat_percent: data.vat_percent !== undefined ? data.vat_percent : 17,
            action: data.action !== undefined ? data.action : 1,

            // Client information
            client_company: data.client_company || data.customer_name || '',
            client_name: data.client_name || data.contact_person || '',
            client_id: data.client_id || data.id_number || data.customer_id_number || '123456789',
            client_email: data.client_email || data.email || 'email@email.com',
            client_phone: data.client_phone || data.phone || '123456789',
            client_address_line_1: data.client_address_line_1 || null,
            client_address_line_2: data.client_address_line_2 || null,
            client_city: data.client_city || null,
            client_zip: data.client_zip || null,
            client_country_code: data.client_country_code || 'IL',

            // Reference fields
            created_by_user: data.created_by_user || '',
            created_by_system: data.created_by_system || 'car-dash',

            // Payments - use explicitly provided payments
            payments: data.payments || [],
        };

        // Only include items for invoices (not receipts)
        // RE = Receipt only, should not have items
        if (data.document_type !== 'RE') {
            payload.items = data.items || [];
        }

        console.log('📋 ============ TRANZILA API REQUEST ============');
        console.log('📦 Incoming data parameter:', JSON.stringify(data, null, 2));
        console.log('📤 Full payload being sent to Tranzila:', JSON.stringify(payload, null, 2));
        console.log('🔑 Client ID field:', payload.client_id);
        console.log('📧 Client Email field:', payload.client_email);
        console.log('📞 Client Phone field:', payload.client_phone);
        console.log('💰 Items count:', payload.items.length);
        console.log('💳 Payments count:', payload.payments.length);
        console.log('==================================================');

        // Use the billing API endpoint for document creation
        const url = `${TRANZILA_CONFIG.billingApiUrl}/create_document`;

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                ...headers,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        let result: any = null;
        try {
            result = await response.json();
        } catch {}

        console.log('Document creation response:', {
            ok: response.ok,
            status: response.status,
            statusText: response.statusText,
            response: result,
        });

        return NextResponse.json({
            ok: response.ok,
            status: response.status,
            statusText: response.statusText,
            response: result,
        });
    } catch (e: any) {
        console.error('Error creating document:', e);
        return NextResponse.json(
            {
                ok: false,
                error: e?.message || 'Unknown error',
            },
            { status: 500 },
        );
    }
}

export async function GET() {
    return NextResponse.json({
        message: 'Tranzila API integration is running',
        endpoints: ['create_document'],
        documentTypes: {
            '305': 'Tax Invoice (חשבונית מס)',
            '320': 'Tax Invoice + Receipt (חשבונית מס קבלה)',
            '400': 'Receipt (קבלה)',
        },
        paymentMethods: {
            1: 'Credit Card',
            2: 'Cash',
            3: 'Check',
            4: 'Bank Transfer',
        },
    });
}
