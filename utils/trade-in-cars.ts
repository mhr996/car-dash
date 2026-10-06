/** Helpers for exchange / trade-in deals that may have one or more customer cars. */

export type TradeInCarInfo = {
    type: string;
    make: string;
    model: string;
    plateNumber: string;
    year: number;
    kilometers: number;
    estimatedValue: number;
};

export type OldCarFormFields = {
    manufacturer: string;
    name: string;
    year: string;
    kilometers: string;
    condition: string;
    number: string;
    market_price: string;
    purchase_price: string;
};

export const emptyOldCarForm = (): OldCarFormFields => ({
    manufacturer: '',
    name: '',
    year: '',
    kilometers: '',
    condition: '',
    number: '',
    market_price: '',
    purchase_price: '',
});

export function getTradeInCarIds(deal: {
    car_taken_from_client?: string | number | { id?: string | number } | null;
    cars_taken_from_client?: Array<string | number> | null;
}): string[] {
    if (Array.isArray(deal.cars_taken_from_client)) {
        const ids = Array.from(new Set(deal.cars_taken_from_client.filter(Boolean).map(String)));
        if (ids.length > 0) return ids;
    }
    const single = deal.car_taken_from_client;
    if (!single) return [];
    if (typeof single === 'string' || typeof single === 'number') return [String(single)];
    if (typeof single === 'object' && single.id) return [String(single.id)];
    return [];
}

export function orderTradeInCars<T extends { id: string | number }>(cars: T[], ids: string[]): T[] {
    const byId = new Map(cars.map((car) => [String(car.id), car]));
    return ids.map((id) => {
        const car = byId.get(String(id));
        if (!car) throw new Error(`Trade-in car ${id} could not be loaded`);
        return car;
    });
}

export function getExchangeInvoiceCars<T extends { id: string | number }>(deal: Parameters<typeof getTradeInCarIds>[0], cars: T[]): T[] {
    const ids = getTradeInCarIds(deal);
    const ordered = ids.length > 0 ? orderTradeInCars(cars, ids) : cars;
    if (ordered.length === 0) throw new Error('Exchange invoice requires incoming vehicle details');
    return ordered;
}

export function mapCarToTradeInInfo(car: {
    type?: string | null;
    brand?: string | null;
    title?: string | null;
    car_number?: string | null;
    year?: number | string | null;
    kilometers?: number | string | null;
    buy_price?: number | string | null;
}): TradeInCarInfo {
    return {
        type: car.type || '',
        make: car.brand || '',
        model: car.title || '',
        plateNumber: car.car_number || '',
        year: parseInt(String(car.year ?? 0), 10) || 0,
        kilometers: parseFloat(String(car.kilometers ?? 0)) || 0,
        estimatedValue: parseFloat(String(car.buy_price ?? 0)) || 0,
    };
}

export function sumTradeInBuyPrice(cars: { buy_price?: number | string | null }[]): number {
    return cars.reduce((sum, c) => sum + (parseFloat(String(c.buy_price ?? 0)) || 0), 0);
}

export function getExchangeDealValues(
    deal: {
        selling_price?: number | null;
        customer_car_eval_value?: number | null;
        additional_customer_amount?: number | null;
        additional_company_amount?: number | null;
        loss_amount?: number | null;
    },
    outgoingCar: { sale_price?: number | null; buy_price?: number | null } | null,
    incomingCars: Array<{ buy_price?: number | string | null }>,
) {
    const salePrice = deal.selling_price ?? outgoingCar?.sale_price ?? 0;
    const incomingValue = deal.customer_car_eval_value ?? sumTradeInBuyPrice(incomingCars);
    const difference = salePrice - incomingValue;
    return {
        salePrice,
        incomingValue,
        difference,
        customerTopUp: deal.additional_customer_amount ?? Math.max(difference, 0),
        companyTopUp: deal.additional_company_amount ?? Math.max(-difference, 0),
        profit: outgoingCar?.buy_price == null ? null : salePrice - outgoingCar.buy_price - (deal.loss_amount ?? 0),
    };
}

export function sumOldCarsPurchasePrice(cars: OldCarFormFields[]): number {
    return cars.reduce((sum, c) => sum + (parseFloat(c.purchase_price || '0') || 0), 0);
}

export function formatTradeInCarsLabel(cars: TradeInCarInfo[]): string {
    return cars
        .map((c) => [c.model, c.make, c.year, c.plateNumber].filter(Boolean).join(' '))
        .filter(Boolean)
        .join('، ');
}

/** Short display line for a DB car row (brand/title/year/plate). */
export function formatCarDisplayName(car: {
    brand?: string | null;
    title?: string | null;
    year?: number | string | null;
    car_number?: string | null;
}): string {
    const parts = [car.brand, car.title, car.year != null ? String(car.year) : ''].filter(Boolean);
    const base = parts.join(' ');
    return car.car_number ? `${base} - ${car.car_number}` : base;
}

/** Build car_details / invoice text including showroom + all trade-in cars. */
export function buildDealCarsDetailsText(
    showroomCar: { brand?: string | null; title?: string | null; year?: number | string | null; car_number?: string | null } | null | undefined,
    tradeInCars: Array<{ brand?: string | null; title?: string | null; year?: number | string | null; car_number?: string | null; buy_price?: number | string | null }> = [],
    labels?: { tradeInPrefix?: string },
): string {
    const parts: string[] = [];
    if (showroomCar) {
        parts.push(formatCarDisplayName(showroomCar));
    }
    const prefix = labels?.tradeInPrefix || 'Trade-in';
    tradeInCars.forEach((car, index) => {
        const n = tradeInCars.length > 1 ? ` #${index + 1}` : '';
        const value = car.buy_price != null ? ` (₪${Number(car.buy_price).toLocaleString()})` : '';
        parts.push(`${prefix}${n}: ${formatCarDisplayName(car)}${value}`);
    });
    return parts.join(' | ');
}

/** Tranzila / PDF info lines for each customer trade-in car (Hebrew, matches existing invoice style). */
export function buildTradeInInvoiceItems(
    tradeInCars: Array<{ brand?: string | null; title?: string | null; year?: number | string | null; car_number?: string | null; buy_price?: number | string | null }>,
): Array<{
    type: string;
    code: null;
    name: string;
    price_type: string;
    unit_price: number;
    units_number: number;
    unit_type: number;
    currency_code: string;
    to_doc_currency_exchange_rate: number;
}> {
    const items: ReturnType<typeof buildTradeInInvoiceItems> = [];
    tradeInCars.forEach((car, index) => {
        const n = tradeInCars.length > 1 ? ` #${index + 1}` : '';
        const buy = parseFloat(String(car.buy_price ?? 0)) || 0;
        items.push({
            type: 'I',
            code: null,
            name: `רכב מהלקוח${n}: ${formatCarDisplayName(car)}`,
            price_type: 'G',
            unit_price: 0,
            units_number: 1,
            unit_type: 1,
            currency_code: 'ILS',
            to_doc_currency_exchange_rate: 1,
        });
        if (buy > 0) {
            items.push({
                type: 'I',
                code: null,
                name: `ערך רכב מהלקוח${n}: ₪${buy.toLocaleString()}`,
                price_type: 'G',
                unit_price: 0,
                units_number: 1,
                unit_type: 1,
                currency_code: 'ILS',
                to_doc_currency_exchange_rate: 1,
            });
        }
    });
    return items;
}

/** Prefer tradeInCars; fall back to singular tradeInCar for older payloads. */
export function resolveTradeInCars(contract: {
    tradeInCars?: TradeInCarInfo[];
    tradeInCar?: TradeInCarInfo;
}): TradeInCarInfo[] {
    if (contract.tradeInCars && contract.tradeInCars.length > 0) return contract.tradeInCars;
    if (contract.tradeInCar) return [contract.tradeInCar];
    return [];
}
