const assert = require('node:assert/strict');
const { test } = require('node:test');
const { loadModule, declarations, evaluate } = require('./helpers/typescript.cjs');

const payload = loadModule('utils/contract-payload.ts');
const { createPurchaseContractData } = loadModule('utils/purchase-contract.ts');
const tradeIn = loadModule('utils/trade-in-cars.ts');
const quietConsole = { error() {}, warn() {}, log() {} };
const company = { name: 'Fixture dealership', address: 'Fixture company address', phone: '0501111111', tax_number: '001234567', signature_url: '/company-signature.png' };
const provider = { id: 1, name: 'Fixture provider', address: 'Fixture provider address', phone: '0502222222', id_number: '002345678' };
const customer = { id: 2, name: 'Fixture customer', address: 'Fixture customer address', phone: '0503333333', id_number: 123456789 };
const car = { id: 15, created_at: '2026-10-06T00:00:00Z', brand: 'Fixture make', title: 'Fixture model', year: 2025, buy_price: 11800, kilometers: 1000, source_type: 'provider', providers: provider, customers: customer };

function templates(kind) {
    const purchase = kind === 'purchase';
    const route = purchase ? 'app/api/generate-car-purchase-contract-pdf/route.ts' : 'app/api/generate-contract-pdf/route.ts';
    const suffix = purchase ? 'CarPurchaseContractHTML' : 'ContractHTML';
    const names = ['English', 'Arabic', 'Hebrew'].map((language) => `generate${language}${suffix}`);
    const dependencies = purchase ? '' : declarations(route, ['renderTradeInCarsBlock']);
    const context = evaluate(`${dependencies}\n${declarations(route, names)}\nglobalThis.renderers = [${names.join(',')}];`, { ...tradeIn });
    return context.renderers;
}

test('purchase contract retains numeric customer IDs, provider leading zeros, address and company signature', () => {
    const providerContract = createPurchaseContractData(car, company);
    assert.equal(providerContract.sellerTaxNumber, '002345678');
    assert.equal(providerContract.buyerId, '001234567');
    assert.equal(providerContract.companySignatureUrl, '/company-signature.png');
    assert.equal(providerContract.carPlateNumber, 'CAR-15');
    assert.equal(createPurchaseContractData(car, company, '/seller-signature.png').customerSignatureUrl, '/seller-signature.png');
    for (const source_type of ['customer', 'brokerage', 'broker']) {
        const contract = createPurchaseContractData({ ...car, source_type }, company);
        assert.equal(contract.sellerTaxNumber, '123456789');
        assert.equal(contract.sellerAddress, customer.address);
        assert.equal(contract.sellerPhone, customer.phone);
    }
});

test('all purchase templates render seller/buyer IDs and correctly positioned signatures', () => {
    const contract = createPurchaseContractData(car, company, '/seller-signature.png');
    for (const render of templates('purchase')) {
        const html = render(contract, company);
        assert.ok(html.includes(provider.id_number));
        assert.ok(html.includes(company.tax_number));
        assert.ok(html.includes(provider.address));
        assert.ok(html.includes('src="/seller-signature.png" alt="Seller Signature"'));
        assert.ok(html.includes('src="/company-signature.png" alt="Company Signature"'));
    }
});

test('all sales templates render buyer ID and saved company/customer signatures', () => {
    const contract = {
        ...createPurchaseContractData(car, company),
        buyerId: String(customer.id_number), buyerAddress: customer.address,
        customerSignatureUrl: '/customer-signature.png',
    };
    for (const render of templates('sales')) {
        const html = render(contract, company);
        assert.ok(html.includes(String(customer.id_number)));
        assert.ok(html.includes(customer.address));
        assert.ok(html.includes('src="/customer-signature.png"'));
        assert.ok(html.includes('src="/company-signature.png"'));
    }
});

test('all intermediary templates retain actual seller and buyer IDs and contact information', () => {
    const contract = {
        ...createPurchaseContractData(car, company),
        dealType: 'intermediary',
        isIntermediaryDeal: true,
        actualSeller: { name: provider.name, id: provider.id_number, address: provider.address, phone: provider.phone },
        actualBuyer: { name: customer.name, id: String(customer.id_number), address: customer.address, phone: customer.phone },
    };
    for (const render of templates('sales')) {
        const html = render(contract, company);
        for (const value of [provider.id_number, provider.address, provider.phone, String(customer.id_number), customer.address, customer.phone]) {
            assert.ok(html.includes(value), `Missing intermediary field ${value}`);
        }
    }
});

test('sales page supplies numeric buyer/seller IDs, addresses and phones to contract builder', () => {
    const globals = {
        deal: { created_at: car.created_at, deal_type: 'intermediary', selling_price: 11800, seller: provider, buyer: customer },
        car, customer: null, companyInfo: company, customerSignature: '/customer-signature.png',
        paymentMethods: [], paymentNotes: '', carsTakenFromClient: [], t: (key) => key,
    };
    const context = evaluate(`${declarations('app/(defaults)/sales-deals/preview/[id]/page.tsx', ['createContractData'])}\nglobalThis.build = createContractData;`, globals);
    const contract = context.build();
    assert.equal(contract.sellerTaxNumber, provider.id_number);
    assert.equal(contract.actualSeller.phone, provider.phone);
    assert.equal(contract.buyerId, String(customer.id_number));
    assert.equal(contract.actualBuyer.phone, customer.phone);
});

test('Arabic language aliases and regional variants resolve identically in both generators', async () => {
    for (const name of ['contract-pdf-generator-new', 'car-purchase-contract-pdf-generator']) {
        const exports = loadModule(`utils/${name}.ts`);
        const Generator = Object.values(exports)[0];
        for (const language of ['ar', 'ae', 'ar-IL', 'AR']) {
            assert.equal(JSON.parse(await Generator.generateContractHTML({}, language)).template, 'arabic');
        }
    }
    assert.equal(payload.contractTemplate('he-IL'), 'hebrew');
    assert.equal(payload.contractTemplate('en-US'), 'english');
});

test('legacy HTML is supported, but malformed structured data cannot become a success-shaped PDF', () => {
    assert.equal(payload.parseContractPayload('<html><body>Fixture</body></html>'), null);
    assert.throws(() => payload.parseContractPayload('{"contract":'), { name: 'SyntaxError' });
    assert.throws(() => payload.parseContractPayload('{}'), /Invalid contract data format/);
    assert.throws(() => payload.parseContractPayload(JSON.stringify({ contract: {}, template: 'english' }), 'car-purchase'), /Invalid contract data format/);
});

test('contract company lookups reject missing data/errors while display lookups preserve existing defaults', async () => {
    let result = { data: null, error: { code: 'PGRST116', message: 'Offline missing settings' } };
    const { getCompanyInfo } = loadModule('lib/company-info.ts', {
        './supabase': { from: () => ({ select: () => ({ limit: () => ({ single: async () => result }) }) }) },
        globals: { console: quietConsole },
    });
    assert.equal((await getCompanyInfo()).name, 'Car Dealership');
    await assert.rejects(getCompanyInfo(false, true), /Offline missing settings/);
    result = { data: company, error: null };
    assert.equal((await getCompanyInfo(false, true)).signature_url, company.signature_url);
});

test('PDF APIs preserve configured signatures and surface company/rendering failures instead of falling back', async () => {
    const { NextRequest } = require('next/server');
    for (const kind of ['sales', 'purchase']) {
        let pdfInput;
        let companyError = null;
        const route = kind === 'purchase' ? 'generate-car-purchase-contract-pdf' : 'generate-contract-pdf';
        const api = loadModule(`app/api/${route}/route.ts`, {
            '@/lib/company-info': { getCompanyInfo: async () => { if (companyError) throw companyError; return company; } },
            '@/utils/pdf-service': { PDFService: { getInstance: () => ({ generateContractPDF: async (input) => { pdfInput = input; return new Uint8Array([37, 80, 68, 70]); } }) } },
            globals: { Buffer, console: quietConsole },
        });
        const contract = { ...createPurchaseContractData(car, company), companySignatureUrl: undefined };
        const request = () => new NextRequest(`http://fixture.test/api/${route}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contractHtml: JSON.stringify({ contract, template: 'english', ...(kind === 'purchase' ? { contractType: 'car-purchase' } : {}) }) }),
        });
        const success = await api.POST(request());
        assert.equal(success.status, 200);
        assert.ok(pdfInput.contractHtml.includes('src="/company-signature.png"'));
        assert.equal(pdfInput.baseUrl, 'http://fixture.test');
        pdfInput = null;
        companyError = new Error('Offline company lookup failure');
        const failure = await api.POST(request());
        assert.equal(failure.status, 500);
        assert.match((await failure.json()).details, /Offline company lookup failure/);
        assert.equal(pdfInput, null);
    }
});

test('real PDF rendering waits for delayed relative signature images and rejects broken images', { timeout: 120000 }, async () => {
    const puppeteer = require('puppeteer');
    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
    const { PDFService } = loadModule('utils/pdf-service.ts', { globals: { console: quietConsole, process, setTimeout, Uint8Array } });
    const service = PDFService.getInstance();
    const observations = [];
    const fixturePage = await browser.newPage();
    const dataUrl = await fixturePage.evaluate(() => {
        const canvas = document.createElement('canvas');
        canvas.width = 120;
        canvas.height = 40;
        const context = canvas.getContext('2d');
        context.strokeStyle = 'black';
        context.lineWidth = 3;
        context.beginPath();
        context.moveTo(10, 30);
        context.lineTo(35, 10);
        context.lineTo(60, 30);
        context.lineTo(110, 10);
        context.stroke();
        return canvas.toDataURL('image/png');
    });
    await fixturePage.close();
    const png = Buffer.from(dataUrl.split(',')[1], 'base64');
    let stylesheet = '';
    service.getBrowser = async () => ({
        newPage: async () => {
            const page = await browser.newPage();
            await page.setRequestInterception(true);
            page.on('request', async (request) => {
                if (request.url().endsWith('/company-signature.png')) {
                    await new Promise((resolve) => setTimeout(resolve, 150));
                    await request.respond({ status: 200, contentType: 'image/png', body: png });
                } else if (request.url().endsWith('/broken.png')) {
                    await request.respond({ status: 404, body: 'Not found' });
                } else if (request.resourceType() === 'script') {
                    await request.respond({ status: 200, contentType: 'text/javascript', body: `const fixtureStyle = document.createElement('style'); fixtureStyle.textContent = ${JSON.stringify(stylesheet)}; document.head.appendChild(fixtureStyle); window.tailwindReady = true;` });
                } else {
                    await request.respond({ status: 200, contentType: 'text/css', body: '' });
                }
            });
            const pdf = page.pdf.bind(page);
            page.pdf = async (options) => {
                observations.push(await page.evaluate(() => ({
                    text: document.body.textContent,
                    images: Array.from(document.images).map((image) => ({ src: image.src, width: image.naturalWidth, renderedHeight: image.getBoundingClientRect().height })),
                })));
                return pdf(options);
            };
            return page;
        },
    });
    try {
        for (const kind of ['purchase', 'sales']) {
            for (const render of templates(kind)) {
                const contract = createPurchaseContractData(car, company, '/company-signature.png');
                const contractHtml = render(contract, company);
                const postcss = require('postcss');
                const tailwind = require('tailwindcss');
                stylesheet = (await postcss([tailwind({ content: [{ raw: contractHtml, extension: 'html' }] })]).process('@tailwind base; @tailwind components; @tailwind utilities;', { from: undefined })).css;
                const bytes = await service.generateContractPDF({ contractHtml, baseUrl: 'http://fixture.test' });
                const pdf = Buffer.from(bytes);
                assert.equal(pdf.subarray(0, 5).toString(), '%PDF-');
                assert.ok(pdf.includes(Buffer.from('/Subtype /Image')), 'Saved signature must be embedded in the PDF');
                const observation = observations.at(-1);
                assert.ok(observation.text.includes(provider.id_number));
                assert.ok(observation.text.includes(company.tax_number));
                assert.equal(observation.images.filter((image) => image.src === 'http://fixture.test/company-signature.png' && image.width === 120 && image.renderedHeight >= 24).length, 2);
            }
        }
        await assert.rejects(service.generateContractPDF({ contractHtml: '<html><head></head><body><img src="/broken.png" alt="Company Signature"></body></html>', baseUrl: 'http://fixture.test' }), /Failed to load contract image: Company Signature/);
    } finally {
        await browser.close();
    }
});
