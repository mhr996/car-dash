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

            // Proxy the PDF using the public retrieval_key URL (no auth needed)
            // Ref: https://docs.tranzila.com/docs/invoices/hdj5h8w2jhfuj-get-financial-document-for-web-use-only-end-client
            case 'get_pdf':
                return await getDocumentPdf(data);

            // Fetch document data as JSON using the billing API
            // Ref: https://docs.tranzila.com/docs/invoices/h7oy1pnmr45jh-get-financial-documents
            case 'get_documents':
                return await getDocuments(data);

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
            client_id: data.client_id || data.id_number || data.customer_id_number || '',
            client_email: data.client_email || data.email || '',
            client_phone: data.client_phone || data.phone || '',
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
        // Per official Tranzila docs, use top-level fields:
        //   canceldoc: 'Y'
        //   related_document_number: <integer>  (the original document's number)
        //   relation_type: 1  (1 = by document number, 2 = by document id)
        if (data.canceldoc === 'Y') {
            payload.canceldoc = 'Y';

            if (data.related_document_number) {
                payload.related_document_number = data.related_document_number;
                payload.relation_type = data.relation_type;
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
            console.log('🔄 related_document_number:', payload.related_document_number);
            console.log('🔄 relation_type:', payload.relation_type);
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
 * Proxy a document PDF to the client.
 * Endpoint: GET https://my.tranzila.com/api/get_financial_document/{retrieval_key}
 * This URL is public — no auth headers required.
 * Ref: https://docs.tranzila.com/docs/invoices/hdj5h8w2jhfuj-get-financial-document-for-web-use-only-end-client
 */
async function getDocumentPdf(data: any = {}) {
    try {
        if (!data.retrieval_key) {
            return NextResponse.json({ error: 'Missing retrieval_key' }, { status: 400 });
        }

        const pdfUrl = `https://my.tranzila.com/api/get_financial_document/${data.retrieval_key}`;
        console.log('📄 Fetching PDF from:', pdfUrl);

        const pdfResponse = await fetch(pdfUrl, {
            method: 'GET',
            headers: { Accept: 'application/pdf, text/html' },
        });

        if (!pdfResponse.ok) {
            return NextResponse.json({ ok: false, error: `Tranzila returned ${pdfResponse.status}` }, { status: 502 });
        }

        const contentType = pdfResponse.headers.get('content-type') || 'application/pdf';
        const pdfBuffer = await pdfResponse.arrayBuffer();

        return new NextResponse(pdfBuffer, {
            status: 200,
            headers: {
                'Content-Type': contentType,
                'Content-Disposition': 'inline; filename="document.pdf"',
            },
        });
    } catch (e: any) {
        console.error('Error fetching PDF:', e);
        return NextResponse.json({ ok: false, error: e?.message || 'Unknown error' }, { status: 500 });
    }
}

/**
 * Fetch document data (JSON) from Tranzila billing API.
 * Endpoint: POST https://billing5.tranzila.com/api/documents_db/get_documents
 * Accepts: terminal_names (required) + at least one of: transaction_ids, start_date+end_date, client_email
 * Returns: JSON with documents array including id, number, type, action, retrieval_key, etc.
 * Ref: https://docs.tranzila.com/docs/invoices/h7oy1pnmr45jh-get-financial-documents
 */
async function getDocuments(data: any = {}) {
    try {
        const headers = generateTranzilaAuthHeaders();

        const payload: any = {
            terminal_names: [TRANZILA_CONFIG.terminal],
        };

        // At least one search filter is required
        if (data.transaction_ids) {
            payload.transaction_ids = Array.isArray(data.transaction_ids) ? data.transaction_ids : [data.transaction_ids];
        }
        if (data.start_date) payload.start_date = data.start_date;
        if (data.end_date) payload.end_date = data.end_date;
        if (data.client_email) payload.client_email = data.client_email;

        if (!payload.transaction_ids && !payload.start_date && !payload.client_email) {
            return NextResponse.json({ error: 'Provide at least one of: transaction_ids, start_date+end_date, client_email' }, { status: 400 });
        }

        console.log('📋 get_documents payload:', JSON.stringify(payload, null, 2));

        const url = `${TRANZILA_CONFIG.billingApiUrl}/get_documents`;
        const response = await fetch(url, {
            method: 'POST',
            headers: { ...headers, 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        let result: any = null;
        try {
            result = await response.json();
        } catch {}

        return NextResponse.json({
            ok: response.ok && result?.status_code === 0,
            status: response.status,
            response: result,
        });
    } catch (e: any) {
        console.error('Error fetching documents:', e);
        return NextResponse.json({ ok: false, error: e?.message || 'Unknown error' }, { status: 500 });
    }
}
