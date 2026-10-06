const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const ts = require('typescript');

const pagePath = path.join(__dirname, '../app/(defaults)/sales-deals/edit/[id]/page.tsx');
const source = fs.readFileSync(pagePath, 'utf8');
const sourceFile = ts.createSourceFile(pagePath, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const helper = sourceFile.statements.find(
    (statement) => ts.isVariableStatement(statement) && statement.declarationList.declarations.some((declaration) => declaration.name.getText(sourceFile) === 'createTranzilaDocument'),
);
assert.ok(helper, 'Tranzila helper must exist');
const sharedPath = path.join(__dirname, '../utils/tranzila-document.ts');
const sharedSourceFile = ts.createSourceFile(sharedPath, fs.readFileSync(sharedPath, 'utf8'), ts.ScriptTarget.Latest, true);
const reconciliationError = sharedSourceFile.statements.find((statement) => ts.isClassDeclaration(statement) && statement.name?.text === 'TranzilaReconciliationRequiredError');
assert.ok(reconciliationError, 'Reconciliation error must exist');
const reconciliationSource = reconciliationError.getText(sharedSourceFile).replace(/^export /, '');
const storeDocument = sharedSourceFile.statements.find((statement) => ts.isFunctionDeclaration(statement) && statement.name?.text === 'createAndStoreTranzilaDocument');
const storeDocumentSource = storeDocument.getText(sharedSourceFile).replace(/^export /, '');

function loadHelper(responseBody, { updateError = null, fetchError = null, jsonError = null } = {}) {
    const updates = [];
    const requests = [];
    const context = vm.createContext({
        Error,
        console: { log() {}, error() {} },
        getTranslation: () => ({ t: (key) => key }),
        fetch: async (url, options) => {
            requests.push({ url, options });
            if (fetchError) throw new Error(fetchError);
            return {
                json: async () => {
                    if (jsonError) throw new Error(jsonError);
                    return responseBody;
                },
            };
        },
        supabase: {
            from: (table) => ({
                update: (values) => ({
                    eq: async (column, value) => {
                        updates.push({ table, values, column, value });
                        return { error: updateError };
                    },
                }),
            }),
        },
    });
    const compiled = ts.transpileModule(`${reconciliationSource}\n${storeDocumentSource}\n${helper.getText(sourceFile)}`, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText;
    vm.runInContext(`${compiled}\nglobalThis.createDocument = createTranzilaDocument;`, context);
    return { createDocument: context.createDocument, updates, requests };
}

const bill = { bill_type: 'receipt_only', customer_name: 'Offline fixture', date: '2026-09-29' };
const payments = [{ payment_type: 'cash', amount: 100 }];

test('requires reconciliation when Tranzila reports success without a document', async () => {
    const { createDocument, updates, requests } = loadHelper({ ok: true, response: { status_code: 0 } });
    await assert.rejects(createDocument(123, bill, payments), { name: 'TranzilaReconciliationRequiredError', message: /Bill 123.*Do not retry.*omitted required document details/ });
    assert.equal(requests.length, 1);
    assert.equal(updates.length, 0);
});

test('stores a complete success response without changing the document identifiers', async () => {
    const document = { id: 'external-id', number: 'external-number', retrieval_key: 'offline-key' };
    const { createDocument, updates } = loadHelper({ ok: true, response: { status_code: 0, document } });
    await createDocument(123, bill, payments);
    assert.equal(updates.length, 1);
    assert.equal(updates[0].values.tranzila_document_id, document.id);
    assert.equal(updates[0].values.tranzila_document_number, document.number);
    assert.equal(updates[0].value, 123);
});

test('requires reconciliation for incomplete document details', async () => {
    for (const missingField of ['id', 'number', 'retrieval_key']) {
        const document = { id: 'external-id', number: 'external-number', retrieval_key: 'offline-key' };
        delete document[missingField];
        const { createDocument, updates } = loadHelper({ ok: true, response: { status_code: 0, document } });
        await assert.rejects(createDocument(123, bill, payments), { name: 'TranzilaReconciliationRequiredError' });
        assert.equal(updates.length, 0);
    }
});

test('requires reconciliation for invalid document identifier and retrieval key types', async () => {
    for (const values of [{ id: {} }, { number: ' ' }, { number: [] }, { retrieval_key: 123 }, { retrieval_key: ' ' }]) {
        const { createDocument, updates } = loadHelper({ ok: true, response: { status_code: 0, document: { id: 'external-id', number: 'external-number', retrieval_key: 'offline-key', ...values } } });
        await assert.rejects(createDocument(123, bill, payments), { name: 'TranzilaReconciliationRequiredError' });
        assert.equal(updates.length, 0);
    }
});

test('includes the external document number when the local database update fails', async () => {
    const document = { id: 'external-id', number: 'external-number', retrieval_key: 'offline-key' };
    const { createDocument } = loadHelper({ ok: true, response: { status_code: 0, document } }, { updateError: { message: 'offline database failure' } });
    await assert.rejects(createDocument(123, bill, payments), { name: 'TranzilaReconciliationRequiredError', message: /Tranzila document: external-number.*offline database failure/ });
});

test('does not classify a confirmed API rejection as possible success', async () => {
    const { createDocument } = loadHelper({ ok: true, response: { status_code: 10002, status_msg: 'Unknown document type' } });
    await assert.rejects(createDocument(123, bill, payments), { name: 'Error', message: 'Tranzila error (10002): Unknown document type' });
});

test('requires reconciliation for transport failures, unreadable JSON, and malformed responses', async () => {
    for (const [responseBody, options] of [
        [null, { fetchError: 'offline connection lost' }],
        [null, { jsonError: 'offline invalid JSON' }],
        [null, {}],
        [{ ok: false, error: 'upstream unavailable' }, {}],
        [{ ok: true, response: {} }, {}],
    ]) {
        const { createDocument, requests, updates } = loadHelper(responseBody, options);
        await assert.rejects(createDocument(123, bill, payments), { name: 'TranzilaReconciliationRequiredError' });
        assert.equal(requests.length, 1);
        assert.equal(updates.length, 0);
    }
});

let submitHandler;
function findSubmitHandler(node) {
    if (ts.isVariableDeclaration(node) && node.name.getText(sourceFile) === 'handleCreateBill') {
        submitHandler = node;
    }
    ts.forEachChild(node, findSubmitHandler);
}
findSubmitHandler(sourceFile);
assert.ok(submitHandler, 'Bill submit handler must exist');

function loadSubmitHandler(needsReconciliation) {
    const deletes = [];
    const inserts = [];
    const alerts = [];
    const context = vm.createContext({
        Error,
        console: { log() {}, error() {} },
        billCreationReviewMessage: null,
        setBillCreationReviewMessage: (message) => {
            context.billCreationReviewMessage = message;
        },
        setAlert: (alert) => alerts.push(alert),
        setCreatingBill() {},
        validateBillForm: () => true,
        billForm: { ...bill, phone: 'offline', total_with_tax: '100' },
        deal: null,
        dealId: '123',
        selectedCar: null,
        bills: [],
        carsTakenFromClient: [],
        payments,
        t: (key) => key,
        needsReconciliation,
        supabase: {
            from: (table) => ({
                insert: (values) => {
                    inserts.push({ table, values });
                    return {
                        error: null,
                        select: () => ({ single: async () => ({ data: { id: 123 }, error: null }) }),
                    };
                },
                delete: () => ({
                    eq: async (column, value) => {
                        deletes.push({ table, column, value });
                        return { error: null };
                    },
                }),
            }),
        },
    });
    const code = `${reconciliationSource}
        const createTranzilaDocument = async () => {
            if (needsReconciliation) throw new TranzilaReconciliationRequiredError(123, 'Offline uncertain response');
            throw new Error('Offline confirmed rejection');
        };
        const ${submitHandler.getText(sourceFile)};
        globalThis.submit = handleCreateBill;`;
    vm.runInContext(ts.transpileModule(code, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText, context);
    return { submit: () => context.submit({ preventDefault() {} }), deletes, inserts, alerts };
}

test('retains the bill and payments on uncertain creation and blocks resubmission in the mounted page', async () => {
    const { submit, deletes, inserts, alerts } = loadSubmitHandler(true);
    await submit();
    assert.equal(inserts.length, 2);
    assert.equal(deletes.length, 0);
    assert.match(alerts[0].message, /Bill 123.*Do not retry/);
    await submit();
    assert.equal(inserts.length, 2);
    assert.equal(deletes.length, 0);
    assert.equal(alerts.length, 2);
});

test('still rolls back the bill and payments on a confirmed rejection', async () => {
    const { submit, deletes, alerts } = loadSubmitHandler(false);
    await submit();
    assert.equal(deletes.length, 2);
    assert.deepEqual(
        deletes.map((entry) => entry.table),
        ['bills', 'bill_payments'],
    );
    assert.match(alerts[0].message, /tranzila_document_creation_failed: Offline confirmed rejection/);
});
