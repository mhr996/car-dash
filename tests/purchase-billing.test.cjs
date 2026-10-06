const assert = require('node:assert/strict');
const { test } = require('node:test');
const { createClient } = require('@supabase/supabase-js');
const { loadModule, declarations, evaluate } = require('./helpers/typescript.cjs');

const billing = loadModule('utils/purchase-billing.ts');
const page = 'app/(defaults)/purchases-deals/invoice/add/page.tsx';
const quietConsole = { error() {}, log() {} };
const { TranzilaReconciliationRequiredError } = loadModule('utils/tranzila-document.ts', {
    '@/lib/supabase': {},
    globals: { console: quietConsole },
});

test('purchase references accept database IDs and reject invalid identifiers', () => {
    assert.doesNotThrow(() => billing.validatePurchaseCarId(1));
    assert.doesNotThrow(() => billing.validatePurchaseCarId('10'));
    assert.throws(() => billing.validatePurchaseCarId('1,free_text.like.%'), /Invalid purchase car ID/);
});

test('purchase seller follows source type, including brokerage and legacy sources', () => {
    const providers = { id: 1, name: 'Provider' };
    const customers = { id: 2, name: 'Customer' };
    for (const source_type of ['customer', 'broker', 'brokerage']) {
        assert.equal(billing.resolvePurchaseSeller({ source_type, providers, customers }), customers);
    }
    assert.equal(billing.resolvePurchaseSeller({ providers, customers }), providers);
    assert.equal(billing.resolvePurchaseSeller({ source_type: 'customer', providers }), undefined);
});

test('combined invoices support credit and refund separately, but cannot be cancelled twice', () => {
    const original = { id: 1, bill_type: 'tax_invoice_receipt', tranzila_document_number: '12' };
    const credit = { id: 2, bill_type: 'credit_note', cancel_tranzila_doc_number: '12' };
    assert.equal(billing.cancellablePurchaseBills([original], 'credit_note').length, 1);
    assert.equal(billing.cancellablePurchaseBills([original], 'refund_receipt').length, 1);
    assert.equal(billing.cancellablePurchaseBills([original, credit], 'credit_note').length, 0);
    assert.equal(billing.cancellablePurchaseBills([original, credit], 'refund_receipt').length, 1);
});

function formContext(overrides = {}) {
    const alerts = [];
    return {
        alerts,
        party: { id: 2, name: 'Fixture', id_number: 123456789 },
        car: { id: 1, buy_price: 118 },
        billType: 'tax_invoice_receipt',
        billDate: '2026-10-06',
        items: [{ id: '1', item_description: 'Vehicle', unit_price: 118, quantity: 1 }],
        payments: [{ payment_type: 'cash', amount: 118 }],
        totalPaid: 118,
        hasSellerSignature: true,
        totalWithTax: 118,
        itemsTotalBeforeTax: 100,
        taxAmount: 18,
        status: 'pending',
        carDetailsText: 'Fixture vehicle',
        freeText: 'Fixture note',
        cancelBillId: '',
        cancelTranzilaDocId: '',
        cancelTranzilaDocNumber: '',
        cancelAmount: '',
        cancelDescription: '',
        billsToCancel: [],
        t: (key) => key,
        setAlert: (alert) => alerts.push(alert),
        console: quietConsole,
        ...overrides,
    };
}

function loadValidation(overrides) {
    return evaluate(`${declarations(page, ['validateForm'])}\nglobalThis.validate = validateForm;`, formContext(overrides));
}

test('purchase invoice/receipt requires matching payments to the cent', () => {
    assert.equal(loadValidation().validate(), true);
    assert.equal(loadValidation({ totalPaid: 117.98 }).validate(), false);
    assert.equal(loadValidation({ totalPaid: 118.02 }).validate(), false);
    assert.equal(loadValidation({ totalPaid: 118.009 }).validate(), true);
    assert.equal(loadValidation({ totalPaid: 118.01 }).validate(), true);
});

test('rejects invalid invoice lines and negative or non-finite payments', () => {
    for (const quantity of [0, -1, NaN, Infinity]) {
        assert.equal(loadValidation({ items: [{ item_description: 'Vehicle', unit_price: 118, quantity }] }).validate(), false);
    }
    assert.equal(loadValidation({ items: [{ item_description: '', unit_price: 118, quantity: 1 }] }).validate(), false);
    assert.equal(loadValidation({ items: [] }).validate(), false);
    for (const amount of [-1, NaN, Infinity]) {
        assert.equal(loadValidation({ payments: [{ payment_type: 'cash', amount }] }).validate(), false);
    }
});

test('full cancellation validates original bill and rejects partial or excessive refunds', () => {
    const fixture = {
        billType: 'refund_receipt', cancelBillId: '1', cancelTranzilaDocId: 'doc-id',
        cancelTranzilaDocNumber: '12', cancelAmount: '118',
        billsToCancel: [{ id: 1, total_with_tax: 118 }],
    };
    assert.equal(loadValidation(fixture).validate(), true);
    assert.equal(loadValidation({ ...fixture, cancelAmount: '50' }).validate(), false);
    assert.equal(loadValidation({ ...fixture, cancelAmount: '200' }).validate(), false);
    assert.equal(loadValidation({ ...fixture, billsToCancel: [] }).validate(), false);
});

test('unsigned purchase bills are rejected before validation or issuance', async () => {
    assert.equal(loadValidation({ hasSellerSignature: false }).validate(), false);
    const { submit, events } = loadSubmit({ validPurchaseSignature: () => false });
    await submit();
    assert.equal(events.length, 0);
});

function loadSubmit({ outcome = 'success', paymentError = null, insertError = null, ...overrides } = {}) {
    const events = [];
    const globals = formContext({
        ...billing,
        TranzilaReconciliationRequiredError,
        submitting: { current: false },
        billCreationReviewMessage: null,
        setSaving() {},
        setTimeout() {},
        router: { push() {} },
        returnTo: '/fixture',
        validateForm: () => true,
        createTranzilaDocument: async () => {
            events.push({ action: 'issue' });
            if (outcome === 'uncertain') throw new TranzilaReconciliationRequiredError(123, 'Offline uncertain response');
            if (outcome === 'rejected') throw new Error('Confirmed rejection');
        },
        getPurchaseSignature: async () => ({ seller_signature_url: '/fixture.png' }),
        validPurchaseSignature: () => true,
        supabase: {
            from: (table) => ({
                insert: (values) => {
                    events.push({ table, action: 'insert', values });
                    return {
                        error: table === 'bill_payments' ? paymentError : null,
                        select: () => ({ single: async () => ({ data: insertError ? null : { id: 123 }, error: insertError }) }),
                    };
                },
                delete: () => ({
                    eq: async () => {
                        events.push({ table, action: 'delete' });
                        return { error: null };
                    },
                }),
            }),
        },
        ...overrides,
    });
    globals.setBillCreationReviewMessage = (message) => { globals.billCreationReviewMessage = message; };
    const context = evaluate(`${declarations(page, ['handleSubmit'])}\nglobalThis.submit = handleSubmit;`, globals);
    context.setBillCreationReviewMessage = (message) => { context.billCreationReviewMessage = message; };
    return { context, events, submit: () => context.submit({ preventDefault() {} }) };
}

test('saves local bill and all payment fields before issuing the external document', async () => {
    const payment = { payment_type: 'visa', amount: 118, approval_number: 'APPROVAL', visa_card_type: 'Fixture', visa_installments: 2, visa_last_four: '1234' };
    const { submit, events } = loadSubmit({ payments: [payment] });
    await submit();
    assert.deepEqual(events.map((event) => `${event.table || 'external'}:${event.action}`), ['bills:insert', 'bill_payments:insert', 'external:issue']);
    assert.equal(events[0].values[0].purchase_car_id, 1);
    assert.equal(events[0].values[0].deal_id, null);
    assert.equal(events[0].values[0].free_text, 'Fixture note');
    assert.equal(events[1].values[0].approval_number, 'APPROVAL');
    assert.equal(events[1].values[0].visa_card_type, 'Fixture');
    assert.equal(Object.hasOwn(events[1].values[0], 'id'), false);
});

for (const billType of ['receipt_only', 'tax_invoice_receipt']) {
    test(`${billType} omits payment IDs from actual Supabase insert columns and uses database-generated IDs`, async () => {
        const requests = [];
        const supabase = createClient('https://fixture.invalid', 'fixture-key', {
            auth: { persistSession: false, autoRefreshToken: false },
            global: {
                fetch: async (url, options) => {
                    const requestUrl = new URL(url);
                    const table = requestUrl.pathname.split('/').at(-1);
                    const body = options.body ? JSON.parse(options.body) : null;
                    requests.push({ table, method: options.method, columns: requestUrl.searchParams.get('columns'), body });
                    if (table === 'bills' && options.method === 'POST') {
                        return new Response(JSON.stringify({ id: 123 }), { status: 201, headers: { 'Content-Type': 'application/json' } });
                    }
                    if (table === 'bill_payments' && options.method === 'POST') {
                        const columns = (requestUrl.searchParams.get('columns') || '').split(',');
                        if (columns.includes('"id"') && body.some((payment) => payment.id == null)) {
                            return new Response(JSON.stringify({
                                code: '23502', details: null, hint: null,
                                message: 'null value in column "id" of relation "bill_payments" violates not-null constraint',
                            }), { status: 400, headers: { 'Content-Type': 'application/json' } });
                        }
                        return new Response(null, { status: 201 });
                    }
                    throw new Error(`Unexpected fixture request: ${options.method} ${table}`);
                },
            },
        });
        const paymentFixtures = [
            { payment_type: 'cash', amount: 18 },
            { id: 'old-payment-id', bill_id: 'old-bill-id', payment_type: 'visa', amount: 100, approval_number: 'APPROVAL', visa_card_type: 'Fixture', visa_installments: 2, visa_last_four: '1234' },
            { payment_type: 'cash', amount: 0 },
        ];
        const { submit, events, context } = loadSubmit({ billType, payments: paymentFixtures, supabase });
        await submit();
        assert.deepEqual(requests.map((request) => [request.table, request.method]), [['bills', 'POST'], ['bill_payments', 'POST']]);
        const paymentRequest = requests[1];
        assert.ok(!paymentRequest.columns.split(',').includes('"id"'));
        assert.equal(paymentRequest.body.length, 2);
        for (const payment of paymentRequest.body) {
            assert.equal(Object.hasOwn(payment, 'id'), false);
            assert.equal(payment.bill_id, 123);
            assert.equal(payment.created_at, requests[0].body[0].created_at);
        }
        assert.equal(paymentRequest.body[0].amount, 18);
        assert.equal(paymentRequest.body[1].amount, 100);
        assert.equal(paymentRequest.body[1].approval_number, 'APPROVAL');
        assert.equal(paymentRequest.body[1].visa_installments, 2);
        assert.equal(paymentRequest.body[1].visa_last_four, '1234');
        assert.equal(paymentFixtures[1].id, 'old-payment-id');
        assert.equal(paymentFixtures[1].bill_id, 'old-bill-id');
        assert.equal(events.filter((event) => event.action === 'issue').length, 1);
        assert.equal(context.alerts.at(-1).type, 'success');
    });
}

test('uncertain issuance retains local records and blocks a second submission', async () => {
    const { context, submit, events } = loadSubmit({ outcome: 'uncertain' });
    await submit();
    assert.match(context.billCreationReviewMessage, /Do not retry/);
    await submit();
    assert.equal(events.filter((event) => event.action === 'issue').length, 1);
    assert.equal(events.filter((event) => event.action === 'delete').length, 0);
});

test('confirmed rejection rolls back payments before the bill', async () => {
    const { submit, events } = loadSubmit({ outcome: 'rejected' });
    await submit();
    assert.deepEqual(events.filter((event) => event.action === 'delete').map((event) => event.table), ['bill_payments', 'bills']);
});

test('local save failures never issue an external document', async () => {
    for (const options of [{ insertError: { message: 'Offline insert error' } }, { paymentError: { message: 'Offline payment error' } }]) {
        const { submit, events } = loadSubmit(options);
        await submit();
        assert.equal(events.filter((event) => event.action === 'issue').length, 0);
    }
});

test('refund and credit preserve cancellation references with opposite directions', async () => {
    for (const [billType, direction] of [['credit_note', 'positive'], ['refund_receipt', 'negative']]) {
        const { submit, events } = loadSubmit({ billType, cancelAmount: '118', cancelTranzilaDocId: 'original-id', cancelTranzilaDocNumber: '12' });
        await submit();
        const saved = events[0].values[0];
        assert.equal(saved.bill_direction, direction);
        assert.equal(saved.cancel_tranzila_doc_number, '12');
        assert.equal(saved.cancel_tranzila_doc_id, 'original-id');
        assert.equal(saved.bill_amount, 118);
    }
});

test('double clicks and already-completed submissions cannot issue duplicate documents', async () => {
    const { submit, events } = loadSubmit();
    await Promise.all([submit(), submit()]);
    await submit();
    assert.equal(events.filter((event) => event.action === 'issue').length, 1);
});

test('purchase Tranzila requests map all five document types and their VAT/cancellation fields', async () => {
    const requests = [];
    const context = evaluate(`${declarations(page, ['createTranzilaDocument'])}\nglobalThis.issue = createTranzilaDocument;`, {
        carDetailsText: 'Fixture vehicle', cancelBillId: '1',
        createAndStoreTranzilaDocument: async (billId, date, data) => requests.push({ billId, date, data }),
        supabase: {
            from: () => ({
                select: () => ({
                    eq: () => ({
                        returns: async () => ({ data: [{ payment_type: 'cash', amount: 118 }], error: null }),
                    }),
                }),
            }),
        },
    });
    const items = [{ item_description: 'Fixture vehicle', unit_price: 118, quantity: 1 }];
    const payments = [{ payment_type: 'cash', amount: 118 }];
    for (const [bill_type, document_type, vat_percent] of [
        ['tax_invoice', 'IN', 18], ['receipt_only', 'RE', 0], ['tax_invoice_receipt', 'IR', 18],
        ['credit_note', 'IN', 18], ['refund_receipt', 'RE', 0],
    ]) {
        await context.issue(123, { bill_type, date: '2026-10-06', cancel_amount: 118, cancel_tranzila_doc_number: '12' }, items, payments, { name: 'Fixture seller', id_number: 123456789 });
        const request = requests.at(-1);
        assert.equal(request.billId, 123);
        assert.equal(request.data.document_type, document_type);
        assert.equal(request.data.vat_percent, vat_percent);
        assert.equal(request.data.client_id, '123456789');
        if (bill_type === 'credit_note' || bill_type === 'refund_receipt') {
            assert.equal(request.data.action, 3);
            assert.equal(request.data.canceldoc, 'Y');
            assert.equal(request.data.related_document_number, 12);
        } else {
            assert.equal(request.data.action, 1);
            assert.equal(request.data.canceldoc, undefined);
        }
        assert.equal(request.data.payments.length, document_type === 'IN' ? 0 : 1);
    }
});
