const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { loadModule, declarations, evaluate } = require('./helpers/typescript.cjs');

const tradeIn = loadModule('utils/trade-in-cars.ts');
const { formatCurrency } = loadModule('utils/number-formatter.ts');
const snapshot = (value) => JSON.parse(JSON.stringify(value));
const quietConsole = { log() {}, error() {} };
const addPage = 'app/(defaults)/bills/add/page.tsx';
const editPage = 'app/(defaults)/sales-deals/edit/[id]/page.tsx';
const outgoingCar = {
    id: 10, title: 'Outgoing model', brand: 'Outgoing make', year: 2024, car_number: 'OUT-123',
    kilometers: 12345, type: 'used', market_price: 190000, sale_price: 180000, buy_price: 98765,
};
const incomingCars = [
    { id: 21, title: 'Incoming model A', brand: 'Incoming make A', year: 2020, car_number: 'IN-456', kilometers: 34567, type: 'used', market_price: 35000, buy_price: 30000 },
    { id: 22, title: 'Incoming model B', brand: 'Incoming make B', year: 2021, car_number: 'IN-789', kilometers: 45678, type: 'used', market_price: 50000, buy_price: 45000 },
];
const deal = {
    id: 1, deal_type: 'exchange', cars_taken_from_client: ['22', '21'], car_taken_from_client: 21,
    selling_price: 105000, customer_car_eval_value: 80000, additional_customer_amount: 25000,
    additional_company_amount: 0, loss_amount: 777, amount: 5458, car: outgoingCar,
    customer: { name: 'Fixture customer', phone: '0500000000', id_number: '001234567' },
};

test('trade-in references normalize numeric, string, and joined legacy IDs', () => {
    for (const value of [21, '21', { id: 21 }, { id: '21' }]) {
        assert.deepEqual(snapshot(tradeIn.getTradeInCarIds({ car_taken_from_client: value })), ['21']);
    }
    assert.deepEqual(snapshot(tradeIn.getTradeInCarIds({ cars_taken_from_client: [22, '21', '22', 21], car_taken_from_client: 99 })), ['22', '21']);
    for (const value of [[], null, ['', null]]) {
        assert.deepEqual(snapshot(tradeIn.getTradeInCarIds({ cars_taken_from_client: value, car_taken_from_client: 21 })), ['21']);
    }
    assert.deepEqual(snapshot(tradeIn.getTradeInCarIds({})), []);
});

test('incoming cars retain deal order despite numeric database IDs and exclude unrelated rows', () => {
    const ordered = tradeIn.orderTradeInCars([...incomingCars, outgoingCar], ['22', '21']);
    assert.equal(ordered[0], incomingCars[1]);
    assert.equal(ordered[1], incomingCars[0]);
    assert.equal(ordered.length, 2);
    assert.throws(() => tradeIn.orderTradeInCars([incomingCars[0]], ['22', '21']), /Trade-in car 22 could not be loaded/);
});

test('exchange values use agreed prices and recorded valuation, not current inventory pricing', () => {
    assert.deepEqual(snapshot(tradeIn.getExchangeDealValues(deal, outgoingCar, incomingCars)), {
        salePrice: 105000, incomingValue: 80000, difference: 25000, customerTopUp: 25000, companyTopUp: 0, profit: 5458,
    });
});

test('exchange values preserve explicit zeros and infer the correct top-up direction for legacy deals', () => {
    const zero = tradeIn.getExchangeDealValues({
        selling_price: 0, customer_car_eval_value: 0, additional_customer_amount: 0, additional_company_amount: 0,
    }, outgoingCar, incomingCars);
    assert.equal(zero.salePrice, 0);
    assert.equal(zero.incomingValue, 0);
    assert.equal(zero.customerTopUp, 0);
    assert.equal(zero.companyTopUp, 0);
    const companyPays = tradeIn.getExchangeDealValues({ selling_price: 50000 }, outgoingCar, incomingCars);
    assert.equal(companyPays.incomingValue, 75000);
    assert.equal(companyPays.difference, -25000);
    assert.equal(companyPays.companyTopUp, 25000);
    assert.equal(companyPays.customerTopUp, 0);
    const customerPays = tradeIn.getExchangeDealValues({ selling_price: 90000 }, null, incomingCars);
    assert.equal(customerPays.customerTopUp, 15000);
    assert.equal(customerPays.companyTopUp, 0);
    assert.equal(customerPays.profit, null);
});

function invoiceGenerator(page, cars) {
    const requests = [];
    const context = evaluate(`${declarations(page, ['createTranzilaDocument'])}\nglobalThis.createDocument = createTranzilaDocument;`, {
        ...tradeIn, Error, console: quietConsole, carsTakenFromClient: cars,
        getTranslation: () => ({ t: (key) => key }),
        createAndStoreTranzilaDocument: async (_id, _date, data) => requests.push(snapshot(data)),
        fetch: async (_url, options) => {
            requests.push(JSON.parse(options.body).data);
            return { json: async () => ({ ok: true, response: { status_code: 0, document: { id: 'fixture', number: '123', retrieval_key: 'fixture-key' } } }) };
        },
        supabase: { from: () => ({ update: () => ({ eq: async () => ({ error: null }) }) }) },
    });
    return {
        requests,
        issue: (bill, selectedDeal, payments) => context.createDocument(123, bill, payments, selectedDeal, outgoingCar, [], cars),
    };
}

function invoiceTotals(data) {
    const gross = data.items.reduce((sum, item) => sum + item.unit_price * item.units_number, 0);
    const net = gross / (1 + data.vat_percent / 100);
    return { gross, net, vat: gross - net, payments: data.payments.reduce((sum, payment) => sum + payment.amount, 0) };
}

for (const page of [addPage, editPage]) {
    for (const billType of ['tax_invoice', 'tax_invoice_receipt']) {
        for (const amount of [5458, 0]) {
            test(`${page}: ${billType}, commission ${amount}, includes all cars at zero without changing totals`, async () => {
                const bill = { bill_type: billType, customer_name: 'Fixture customer', date: '2026-10-06', total_with_tax: amount || 105000 };
                const payments = [{ payment_type: 'cash', amount: amount || 105000 }];
                const selectedDeal = { ...deal, amount };
                const generator = invoiceGenerator(page, incomingCars);
                await generator.issue(bill, selectedDeal, payments);
                assert.equal(generator.requests.length, 1);
                const payload = generator.requests[0];
                assert.equal(payload.document_type, billType === 'tax_invoice' ? 'IN' : 'IR');
                assert.equal(payload.vat_percent, amount === 0 ? 0 : 18);
                assert.equal(payload.client_id, '001234567');
                assert.equal(payload.items[0].unit_price, 0);
                assert.ok(payload.items[0].name.includes(outgoingCar.car_number));

                const ordered = tradeIn.orderTradeInCars(incomingCars, tradeIn.getTradeInCarIds(selectedDeal));
                const info = snapshot(tradeIn.buildTradeInInvoiceItems(ordered));
                assert.deepEqual(payload.items.slice(1, 1 + info.length), info);
                for (const car of incomingCars) {
                    const line = payload.items.find((item) => item.name.includes(car.car_number));
                    assert.ok(line, `Missing incoming vehicle ${car.car_number}`);
                    for (const field of [car.brand, car.title, String(car.year), car.car_number]) assert.ok(line.name.includes(field));
                    assert.equal(line.unit_price, 0);
                    assert.equal(line.units_number, 1);
                    assert.equal(line.price_type, 'G');
                    assert.equal(line.currency_code, 'ILS');
                }
                for (const line of info) assert.equal(line.unit_price * line.units_number, 0);

                const baseline = invoiceGenerator(page, []);
                await baseline.issue(bill, { ...selectedDeal, deal_type: 'normal' }, payments);
                const names = new Set(info.map((item) => item.name));
                const withoutInfo = { ...payload, items: payload.items.filter((item) => !names.has(item.name)) };
                assert.deepEqual(withoutInfo, baseline.requests[0]);
                assert.deepEqual(invoiceTotals(payload), invoiceTotals(baseline.requests[0]));
                assert.equal(invoiceTotals(payload).gross, amount || selectedDeal.selling_price);
            });
        }

        test(`${page}: ${billType} refuses incomplete incoming data before external issuance`, async () => {
            const bill = { bill_type: billType, customer_name: 'Fixture', date: '2026-10-06' };
            for (const [selectedDeal, cars, error] of [
                [deal, [incomingCars[0]], /Trade-in car 22 could not be loaded/],
                [{ ...deal, cars_taken_from_client: [], car_taken_from_client: null }, [], /Exchange invoice requires incoming vehicle details/],
            ]) {
                const generator = invoiceGenerator(page, cars);
                await assert.rejects(generator.issue(bill, selectedDeal, [{ payment_type: 'cash', amount: 5458 }]), error);
                assert.equal(generator.requests.length, 0);
            }
        });
    }
}

test('legacy single-car exchange invoices include numeric incoming references', async () => {
    for (const page of [addPage, editPage]) {
        const generator = invoiceGenerator(page, [incomingCars[0]]);
        await generator.issue(
            { bill_type: 'tax_invoice', customer_name: 'Fixture', date: '2026-10-06' },
            { ...deal, cars_taken_from_client: [], car_taken_from_client: 21 }, [],
        );
        const lines = generator.requests[0].items.filter((item) => item.name.includes('IN-456'));
        assert.equal(lines.length, 1);
        assert.equal(lines[0].unit_price, 0);
    }
});

function selectionHandler(deals, carQuery, billQuery = async () => ({ data: [], error: null })) {
    const state = { selectedDeal: null, cars: [], bills: [], form: {}, alert: null };
    const request = { current: 0 };
    const context = evaluate(`${declarations(addPage, ['handleDealSelect'])}\nglobalThis.selectDeal = handleDealSelect;`, {
        ...tradeIn, Error, console: quietConsole, deals, dealSelectionRequest: request, t: (key) => key,
        setSelectedDeal: (value) => { state.selectedDeal = value; },
        setCarsTakenFromClient: (value) => { state.cars = value; },
        setExistingBills: (value) => { state.bills = value; },
        setAlert: (value) => { state.alert = value; },
        setBillForm: (update) => { state.form = update(state.form); },
        supabase: {
            from: (table) => ({
                select: () => table === 'cars'
                    ? { in: (_column, ids) => ({ returns: () => carQuery(ids) }) }
                    : { eq: (_column, id) => billQuery(id) },
            }),
        },
    });
    return { state, request, select: context.selectDeal };
}

test('bill selection loads numeric incoming rows in deal order and fills complete vehicle details', async () => {
    const handler = selectionHandler([deal], async (ids) => {
        assert.deepEqual(snapshot(ids), ['22', '21']);
        return { data: incomingCars, error: null };
    });
    await handler.select('1');
    assert.equal(handler.state.selectedDeal, deal);
    assert.deepEqual(snapshot(handler.state.cars).map((car) => car.id), [22, 21]);
    for (const car of [outgoingCar, ...incomingCars]) assert.ok(handler.state.form.car_details.includes(car.car_number));
});

test('bill selection reports missing incoming rows, query errors, and bill lookup failures', async () => {
    for (const [carsResult, billsResult] of [
        [{ data: [incomingCars[0]], error: null }, { data: [] }],
        [{ data: null, error: new Error('Fixture car query failure') }, { data: [] }],
        [{ data: incomingCars, error: null }, { data: null, error: new Error('Fixture bill query failure') }],
    ]) {
        const handler = selectionHandler([deal], async () => carsResult, async () => billsResult);
        await handler.select('1');
        assert.equal(handler.state.selectedDeal, null);
        assert.equal(handler.state.cars.length, 0);
        assert.equal(handler.state.alert.type, 'danger');
    }
});

test('a slow previous deal selection cannot overwrite the current deal or its financials', async () => {
    let resolveCars;
    const pending = new Promise((resolve) => { resolveCars = resolve; });
    const secondDeal = { ...deal, id: 2, deal_type: 'normal', amount: 1234, customer: { name: 'Second customer', phone: '0520000000' } };
    const handler = selectionHandler([deal, secondDeal], () => pending);
    const first = handler.select('1');
    await handler.select('2');
    resolveCars({ data: incomingCars, error: null });
    await first;
    assert.equal(handler.state.selectedDeal.id, 2);
    assert.equal(handler.state.cars.length, 0);
    assert.equal(handler.state.form.customer_name, 'Second customer');
    assert.equal(handler.state.form.total_with_tax, '1234');
});

test('clearing a deal selection invalidates an outstanding request', async () => {
    let resolveCars;
    const handler = selectionHandler([deal], () => new Promise((resolve) => { resolveCars = resolve; }));
    const pending = handler.select('1');
    handler.request.current += 1;
    resolveCars({ data: incomingCars, error: null });
    await pending;
    assert.equal(handler.state.selectedDeal, null);
    assert.equal(handler.state.cars.length, 0);
    assert.deepEqual(handler.state.form, {});
});

function renderSummary(overrides = {}, language = 'en') {
    const labels = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'public', 'locales', `${language}.json`), 'utf8'));
    const { ExchangeDealSummary } = loadModule('components/deals/exchange-deal-summary.tsx', {
        '@/i18n': { getTranslation: () => ({ t: (key) => labels[key] || key }) },
        'next/link': { __esModule: true, default: ({ children, href, className }) => React.createElement('a', { href, className }, children) },
    });
    return {
        labels,
        html: renderToStaticMarkup(React.createElement(ExchangeDealSummary, {
            deal, outgoingCar, incomingCars, canViewPurchasePrice: true, canViewCars: true, ...overrides,
        })),
    };
}

test('preview renders both directions, all vehicle identifiers, agreed values, and actual profit', () => {
    const { html, labels } = renderSummary();
    for (const key of ['exchange_outgoing_car', 'exchange_incoming_cars', 'exchange_agreed_sale_price', 'exchange_price_difference']) {
        assert.ok(html.includes(labels[key]));
    }
    for (const car of [outgoingCar, ...incomingCars]) {
        for (const value of [car.brand, car.title, car.car_number, String(car.year), car.kilometers.toLocaleString()]) assert.ok(html.includes(value));
        assert.ok(html.includes(`href="/cars/preview/${car.id}"`));
    }
    for (const value of [105000, 80000, 25000, 30000, 45000, 5458]) assert.ok(html.includes(formatCurrency(value)));
    assert.ok(!html.includes(formatCurrency(outgoingCar.sale_price)));
});

test('preview hides purchase cost, internal amounts, loss, profit, and vehicle links without permissions', () => {
    const { html, labels } = renderSummary({ canViewPurchasePrice: false, canViewCars: false });
    for (const key of ['buy_price', 'deal_amount', 'loss_amount', 'profit_loss']) assert.ok(!html.includes(labels[key]));
    for (const value of [outgoingCar.buy_price, deal.amount, deal.loss_amount]) assert.ok(!html.includes(formatCurrency(value)));
    assert.ok(!html.includes('href='));
    assert.ok(html.includes(formatCurrency(incomingCars[0].buy_price)));
    assert.ok(html.includes(formatCurrency(deal.customer_car_eval_value)));
});

test('preview explicitly warns about missing incoming data and retains zero agreed values', () => {
    const { html, labels } = renderSummary({ incomingCars: [], deal: { ...deal, selling_price: 0, customer_car_eval_value: 0 } });
    assert.ok(html.includes('role="alert"'));
    assert.ok(html.includes(labels.exchange_incoming_data_unavailable));
    assert.ok(html.includes(formatCurrency(0)));
    assert.ok(!html.includes(formatCurrency(outgoingCar.sale_price)));
});

test('exchange labels are present in every application language', () => {
    for (const language of ['en', 'he', 'ae']) {
        const { html, labels } = renderSummary({}, language);
        for (const key of [
            'exchange_vehicle_overview', 'exchange_outgoing_car', 'exchange_incoming_cars',
            'exchange_agreed_sale_price', 'exchange_trade_in_value', 'exchange_price_difference', 'exchange_incoming_data_unavailable',
        ]) {
            assert.equal(typeof labels[key], 'string');
            assert.ok(labels[key].length > 0);
        }
        assert.ok(html.includes(labels.exchange_vehicle_overview));
    }
});

test('exchange overview fits desktop and mobile widths in LTR and RTL layouts', { timeout: 60000 }, async () => {
    const puppeteer = require('puppeteer');
    const postcss = require('postcss');
    const tailwind = require('tailwindcss');
    const markup = ['en', 'he', 'ae'].map((language) => renderSummary({}, language).html);
    const css = (await postcss([tailwind({ content: [{ raw: markup.join('\n'), extension: 'html' }] })])
        .process('@tailwind base; @tailwind utilities;', { from: undefined })).css;
    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
    try {
        const page = await browser.newPage();
        for (const [index, language] of ['en', 'he', 'ae'].entries()) {
            for (const width of [1280, 390]) {
                await page.setViewport({ width, height: 900 });
                await page.setContent(`<html dir="${language === 'en' ? 'ltr' : 'rtl'}"><head><style>${css}\nbody { margin: 0; padding: 16px; } .panel { padding: 24px; }</style></head><body>${markup[index]}</body></html>`);
                const layout = await page.evaluate(() => {
                    const grid = document.querySelector('section > div.grid');
                    const boxes = Array.from(grid.children).map((element) => {
                        const { x, y, width } = element.getBoundingClientRect();
                        return { x, y, width };
                    });
                    return { width: window.innerWidth, scrollWidth: document.documentElement.scrollWidth, boxes, text: document.body.textContent };
                });
                assert.ok(layout.scrollWidth <= layout.width, `${language} overflows at ${width}px`);
                for (const car of [outgoingCar, ...incomingCars]) assert.ok(layout.text.includes(car.car_number));
                if (width >= 1024) {
                    assert.notEqual(layout.boxes[0].x, layout.boxes[1].x);
                    assert.equal(layout.boxes[0].y, layout.boxes[1].y);
                } else {
                    assert.equal(layout.boxes[0].x, layout.boxes[1].x);
                    assert.ok(layout.boxes[1].y > layout.boxes[0].y);
                }
            }
        }
    } finally {
        await browser.close();
    }
});
