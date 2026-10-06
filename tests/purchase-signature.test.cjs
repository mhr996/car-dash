const assert = require('node:assert/strict');
const { test } = require('node:test');
const { loadModule } = require('./helpers/typescript.cjs');

const seller = { id: 2, name: 'Fixture seller' };
const car = { id: 15, source_type: 'customer', customers: seller };
const signature = { car_id: 15, seller_id: 2, seller_type: 'customer', seller_signature_url: 'http://fixture.test/signature.png', signed_by_name: seller.name, signed_at: '2026-10-06T00:00:00Z' };

function service({ queryError = null, writeError = null, uploadError = null, stored = signature } = {}) {
    const writes = [];
    const uploads = [];
    const mocks = {
        '@/lib/supabase': {
            from: () => ({
                select: () => ({
                    eq: () => ({ returns: () => ({ maybeSingle: async () => ({ data: stored, error: queryError }) }) }),
                }),
                upsert: async (values, options) => { writes.push({ values, options }); return { error: writeError }; },
            }),
        },
        '@/utils/file-upload': {
            uploadFile: async (...args) => { uploads.push(args); return uploadError ? { success: false, error: uploadError } : { success: true, url: '/cars/15/fixture-signature.png' }; },
            getPublicUrlFromPath: (path) => `http://fixture.test${path}`,
        },
        globals: { File, fetch: async () => ({ ok: true, blob: async () => new Blob(['offline fixture'], { type: 'image/png' }) }) },
    };
    return { ...loadModule('utils/purchase-signature.ts', mocks), writes, uploads };
}

test('loads a saved signature or reports a missing signature without inventing one', async () => {
    assert.equal((await service().getPurchaseSignature(15)).seller_signature_url, signature.seller_signature_url);
    assert.equal(await service({ stored: null }).getPurchaseSignature(15), null);
    await assert.rejects(service({ queryError: { message: 'Offline schema unavailable' } }).getPurchaseSignature(15), /Offline schema unavailable/);
});

test('signatures belong to the exact purchase and seller, not just a matching seller name', () => {
    const { validPurchaseSignature } = service();
    assert.equal(validPurchaseSignature(signature, car), true);
    assert.equal(validPurchaseSignature(signature, { ...car, id: 150 }), false);
    assert.equal(validPurchaseSignature(signature, { ...car, customers: { ...seller, id: 3 } }), false);
    assert.equal(validPurchaseSignature(signature, { ...car, source_type: 'provider', providers: seller }), false);
    assert.equal(validPurchaseSignature(null, car), false);
});

test('uploads seller signature and persists seller identity before reporting success', async () => {
    const api = service();
    const saved = await api.savePurchaseSignature(car, 'data:image/png;base64,ZmFrZQ==');
    assert.equal(api.uploads.length, 1);
    assert.equal(api.uploads[0][1], 'cars');
    assert.equal(api.uploads[0][2], '15');
    assert.equal(api.writes.length, 1);
    assert.equal(api.writes[0].options.onConflict, 'car_id');
    assert.equal(saved.seller_id, seller.id);
    assert.equal(saved.seller_type, 'customer');
    assert.equal(saved.signed_by_name, seller.name);
    assert.match(saved.seller_signature_url, /fixture-signature.png$/);
});

test('provider signature identity is separate from an identically numbered customer', async () => {
    const api = service();
    const saved = await api.savePurchaseSignature({ ...car, source_type: 'provider', providers: seller }, 'data:image/png;base64,ZmFrZQ==');
    assert.equal(saved.seller_type, 'provider');
    assert.equal(api.validPurchaseSignature(saved, car), false);
});

test('upload and database failures are surfaced and do not return a success-shaped signature', async () => {
    const uploadFailure = service({ uploadError: 'Offline upload failure' });
    await assert.rejects(uploadFailure.savePurchaseSignature(car, 'data:image/png;base64,ZmFrZQ=='), /Offline upload failure/);
    assert.equal(uploadFailure.writes.length, 0);
    const writeFailure = service({ writeError: { message: 'Offline write failure' } });
    await assert.rejects(writeFailure.savePurchaseSignature(car, 'data:image/png;base64,ZmFrZQ=='), /Offline write failure/);
    const invalid = service();
    await assert.rejects(invalid.savePurchaseSignature(car, 'https://fixture.test/not-a-signature'), /PNG signature is required/);
    assert.equal(invalid.uploads.length, 0);
});

test('purchase signing control respects permissions, pending saves and saved-signature state', () => {
    const React = require('react');
    const { renderToStaticMarkup } = require('react-dom/server');
    const { PurchaseSignatureControl } = loadModule('components/contracts/purchase-signature-control.tsx', {
        '@/i18n': { getTranslation: () => ({ t: (key) => key }) },
        '@/components/modals/signature-modal': { __esModule: true, default: () => null },
        '@/components/icon/icon-pencil': { __esModule: true, default: () => null },
    });
    const props = { signature: { signatureUrl: null, loading: false, saving: false, error: null, save: async () => {} }, canSign: true, onAlert() {} };
    const render = (changes) => renderToStaticMarkup(React.createElement(PurchaseSignatureControl, { ...props, ...changes }));
    assert.match(render(), /sign_purchase/);
    assert.match(render({ signature: { ...props.signature, signatureUrl: signature.seller_signature_url } }), /update_signature/);
    assert.match(render({ signature: { ...props.signature, saving: true } }), /disabled/);
    assert.match(render({ signature: { ...props.signature, loading: true } }), /disabled/);
    assert.doesNotMatch(render({ canSign: false }), /<button/);
    assert.match(render({ signature: { ...props.signature, error: 'Offline signature lookup failure' } }), /role="alert".*Offline signature lookup failure/);
});

test('signature hook loads persisted signatures and does not overwrite another purchase after an in-flight save', async () => {
    const slots = [];
    let cursor = 0;
    const pendingEffects = [];
    let resolveSave;
    const secondCar = { ...car, id: 16 };
    const secondSignature = { ...signature, car_id: 16, seller_signature_url: 'http://fixture.test/second-signature.png' };
    const hooks = {
        useState: (initial) => {
            const index = cursor++;
            if (!(index in slots)) slots[index] = initial;
            return [slots[index], (value) => { slots[index] = value; }];
        },
        useRef: (initial) => {
            const index = cursor++;
            if (!(index in slots)) slots[index] = { current: initial };
            return slots[index];
        },
        useEffect: (callback, deps) => {
            const index = cursor++;
            if (!slots[index] || deps.some((value, i) => slots[index].deps[i] !== value)) {
                slots[index]?.cleanup?.();
                slots[index] = { deps };
                pendingEffects.push(() => { slots[index].cleanup = callback(); });
            }
        },
    };
    const { usePurchaseSignature } = loadModule('hooks/usePurchaseSignature.ts', {
        react: hooks,
        '@/utils/purchase-signature': {
            validPurchaseSignature: service().validPurchaseSignature,
            getPurchaseSignature: async (id) => id === car.id ? signature : secondSignature,
            savePurchaseSignature: async () => new Promise((resolve) => { resolveSave = resolve; }),
        },
        globals: { console: { error() {} } },
    });
    const render = (selectedCar) => {
        cursor = 0;
        const state = usePurchaseSignature(selectedCar);
        pendingEffects.splice(0).forEach((effect) => effect());
        return state;
    };
    const flush = () => new Promise((resolve) => setImmediate(resolve));
    assert.equal(render(car).loading, true);
    await flush();
    const firstState = render(car);
    assert.equal(firstState.signatureUrl, signature.seller_signature_url);
    const save = firstState.save('data:image/png;base64,ZmFrZQ==');
    await assert.rejects(firstState.save('data:image/png;base64,ZmFrZQ=='), /already in progress/);
    render(secondCar);
    await flush();
    assert.equal(render(secondCar).signatureUrl, secondSignature.seller_signature_url);
    resolveSave(signature);
    await save;
    assert.equal(render(secondCar).signatureUrl, secondSignature.seller_signature_url);
});
