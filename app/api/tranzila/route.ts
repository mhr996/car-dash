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

            case 'get_document':
                return await getDocument(data);

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
 * Document Types (from Tranzila API):
 * - IR = Tax Invoice + Receipt (חשבונית מס קבלה)
 * - IN = Tax Invoice (חשבונית מס)
 * - RE = Receipt (קבלה)
 * - DI = Deal Invoice
 *
 * For Credit Notes / Cancellations:
 * - Set `canceldoc: 'Y'` to mark as a credit document
 * - Add document relation with type 1 (by number) or 2 (by id) to reference original
 *
 * Document Relation Types:
 * - 1 = Cancelling document number - for whole document cancellation
 * - 2 = Cancelling document id - for whole document cancellation
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

            // Items - always include (frontend sends placeholder for receipts)
            items: data.items || [],

            // Payments - use explicitly provided payments
            payments: data.payments || [],
        };

        // For credit notes / cancellation documents:
        // 1. Set canceldoc to 'Y' to mark as credit document
        // 2. Add document relation to reference the original document being cancelled
        if (data.canceldoc === 'Y') {
            payload.canceldoc = 'Y';

            // Add document relation if provided
            // Type 1 = by document number, Type 2 = by document id
            if (data.cancel_document_number) {
                payload.document_relations = [
                    {
                        type: 1, // Cancelling by document number
                        number: data.cancel_document_number,
                    },
                ];
            } else if (data.cancel_document_id) {
                payload.document_relations = [
                    {
                        type: 2, // Cancelling by document id
                        id: data.cancel_document_id,
                    },
                ];
            }
        }

        console.log('📋 ============ TRANZILA API REQUEST ============');
        console.log('📦 Incoming data parameter:', JSON.stringify(data, null, 2));
        console.log('📤 Full payload being sent to Tranzila:', JSON.stringify(payload, null, 2));
        console.log('🔑 Client ID field:', payload.client_id);
        console.log('📧 Client Email field:', payload.client_email);
        console.log('📞 Client Phone field:', payload.client_phone);
        console.log('💰 Items count:', payload.items ? payload.items.length : 0);
        console.log('💳 Payments count:', payload.payments.length);
        if (payload.canceldoc) {
            console.log('🔄 This is a CREDIT/CANCELLATION document');
            console.log('🔄 Document relations:', JSON.stringify(payload.document_relations, null, 2));
        }
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
        endpoints: ['create_document', 'get_document'],
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

/**
 * Get document details from Tranzila
 * Used for fetching original receipt data when creating refund receipts
 * Uses search_documents endpoint as get_document returns PDF
 */
async function getDocument(data: any = {}) {
    try {
        const headers = generateTranzilaAuthHeaders();

        if (!data.document_id) {
            return NextResponse.json({ error: 'Missing document_id' }, { status: 400 });
        }

        console.log('📄 ============ TRANZILA GET DOCUMENT REQUEST ============');
        console.log('🎯 Document ID:', data.document_id);
        console.log('==================================================');

        // Use search_documents endpoint to get document details in JSON format
        // The get_document endpoint returns PDF which is not useful for extracting data
        const searchPayload = {
            terminal_name: TRANZILA_CONFIG.terminal,
            document_id: parseInt(data.document_id),
            response_language: 'eng',
        };

        const searchUrl = `${TRANZILA_CONFIG.billingApiUrl}/search_documents`;
        const searchResponse = await fetch(searchUrl, {
            method: 'POST',
            headers: {
                ...headers,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(searchPayload),
        });

        let searchResult: any = null;
        try {
            searchResult = await searchResponse.json();
        } catch {}

        console.log('Search document response:', JSON.stringify(searchResult, null, 2));

        return NextResponse.json({
            ok: searchResponse.ok && searchResult?.status_code === 0,
            status: searchResponse.status,
            response: searchResult,
        });
    } catch (e: any) {
        console.error('Error getting document:', e);
        return NextResponse.json(
            {
                ok: false,
                error: e?.message || 'Unknown error',
            },
            { status: 500 },
        );
    }
}
