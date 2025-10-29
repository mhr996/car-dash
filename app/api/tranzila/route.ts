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
 * - 2 = Cash
 * - 3 = Check
 * - 4 = Bank Transfer
 */
async function createDocument(data: any = {}) {
    try {
        const headers = generateTranzilaAuthHeaders();

        // Build document payload based on Tranzila invoice/document schema
        const payload = {
            terminal_name: TRANZILA_CONFIG.terminal,
            document_type: data.document_type || '320', // 305=Invoice, 320=Invoice+Receipt, 400=Receipt
            document_date: data.document_date || null, // Format: yyyy-mm-dd
            document_currency_code: data.document_currency_code || 'ILS',
            document_language: data.document_language || 'heb',
            response_language: data.response_language || 'eng',
            vat_percent: data.vat_percent !== undefined ? data.vat_percent : 17,
            action: data.action !== undefined ? data.action : 1,

            // Client information
            client_company: data.client_company || data.customer_name || 'Test Company',
            client_name: data.client_name || data.contact_person || 'Test Contact',
            client_id: data.client_id || data.customer_id || '123456789',
            client_email: data.client_email || data.email || 'test@example.com',
            client_phone: data.client_phone || null,
            client_address_line_1: data.client_address_line_1 || null,
            client_address_line_2: data.client_address_line_2 || null,
            client_city: data.client_city || null,
            client_zip: data.client_zip || null,
            client_country_code: data.client_country_code || 'IL',

            // Reference fields
            created_by_user: data.created_by_user || 'car-dash-dev',
            created_by_system: data.created_by_system || 'car-dash',

            // Items
            items: data.items || [
                {
                    type: 'I', // I = Item, S = Service
                    code: null,
                    name: data.item_name || 'Test Item',
                    price_type: 'G', // G = Gross, N = Net
                    unit_price: data.overrideAmount ? Number(data.overrideAmount) : 1, // SAFE TEST AMOUNT
                    units_number: 1,
                    unit_type: 1,
                    currency_code: 'ILS',
                    to_doc_currency_exchange_rate: 1,
                },
            ],

            // Payments - mandatory field
            payments: data.payments || [
                {
                    payment_method: 1, // 1 = Credit Card
                    payment_date: data.payment_date || new Date().toISOString().split('T')[0], // yyyy-mm-dd
                    amount: data.overrideAmount ? Number(data.overrideAmount) : 1, // SAFE TEST AMOUNT
                    currency_code: 'ILS',
                    to_doc_currency_exchange_rate: 1,
                },
            ],
        };

        console.log('Creating Tranzila document/invoice...');

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
