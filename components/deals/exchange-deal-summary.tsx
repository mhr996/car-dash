'use client';
import Link from 'next/link';
import { getTranslation } from '@/i18n';
import type { Deal } from '@/types';
import { formatCurrency } from '@/utils/number-formatter';
import { getExchangeDealValues } from '@/utils/trade-in-cars';

interface ExchangeCar {
    id: string | number;
    title: string;
    brand: string;
    year: number;
    car_number?: string;
    type?: string;
    kilometers?: number;
    market_price?: number;
    buy_price?: number;
    sale_price?: number;
}

interface Props {
    deal: Pick<Deal, 'selling_price' | 'customer_car_eval_value' | 'additional_customer_amount' | 'additional_company_amount' | 'amount' | 'loss_amount'>;
    outgoingCar: ExchangeCar | null;
    incomingCars: ExchangeCar[];
    canViewPurchasePrice: boolean;
    canViewCars: boolean;
}

export function ExchangeDealSummary({ deal, outgoingCar, incomingCars, canViewPurchasePrice, canViewCars }: Props) {
    const { t } = getTranslation();
    const values = getExchangeDealValues(deal, outgoingCar, incomingCars);
    const currency = (value: number | null | undefined) => (value == null ? '-' : formatCurrency(value));
    const financialRows: Array<[string, number | null | undefined]> = [
        [t('exchange_agreed_sale_price'), values.salePrice],
        [t('total_customer_cars_eval'), values.incomingValue],
        [t('exchange_price_difference'), values.difference],
        [t('additional_amount_from_customer'), values.customerTopUp],
        [t('additional_amount_from_company'), values.companyTopUp],
    ];
    if (canViewPurchasePrice) {
        financialRows.push([t('deal_amount'), deal.amount], [t('loss_amount'), deal.loss_amount ?? 0], [t('profit_loss'), values.profit]);
    }
    const vehicleCard = (car: ExchangeCar, incoming: boolean, index: number) => {
        const details: Array<[string, string | number]> = [
            [t('brand'), car.brand],
            [t('year'), car.year],
            [t('car_number'), car.car_number || '-'],
            [t('kilometers'), car.kilometers?.toLocaleString() ?? '-'],
            [t('car_type'), car.type || '-'],
            [t('car_id'), car.id],
            [t('market_price'), currency(car.market_price)],
            [incoming ? t('exchange_trade_in_value') : t('exchange_agreed_sale_price'), currency(incoming ? car.buy_price : values.salePrice)],
        ];
        if (!incoming && canViewPurchasePrice) details.push([t('buy_price'), currency(car.buy_price)]);
        return (
            <div
                key={car.id}
                className={`rounded-lg border p-4 ${incoming ? 'border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-900/20' : 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20'}`}
            >
                <h6 className="mb-3 text-lg font-semibold">
                    {canViewCars ? (
                        <Link href={`/cars/preview/${car.id}`} className="text-primary hover:underline">
                            {car.title}
                        </Link>
                    ) : (
                        car.title
                    )}
                    {incoming && incomingCars.length > 1 && <span className="ml-2 text-sm">#{index + 1}</span>}
                </h6>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                    {details.map(([label, value]) => (
                        <div key={label}>
                            <dt className="text-gray-500 dark:text-gray-400">{label}</dt>
                            <dd className="mt-1 font-medium">{value}</dd>
                        </div>
                    ))}
                </dl>
            </div>
        );
    };
    return (
        <section className="panel" aria-label={t('exchange_vehicle_overview')}>
            <h5 className="mb-5 text-xl font-bold">{t('exchange_vehicle_overview')}</h5>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div className="space-y-3">
                    <h6 className="font-bold text-blue-700 dark:text-blue-300">{t('exchange_outgoing_car')}</h6>
                    {outgoingCar ? vehicleCard(outgoingCar, false, 0) : <p className="text-danger">{t('car_not_found')}</p>}
                </div>
                <div className="space-y-3">
                    <h6 className="font-bold text-orange-700 dark:text-orange-300">{t('exchange_incoming_cars')}</h6>
                    {incomingCars.length > 0 ? (
                        incomingCars.map((car, index) => vehicleCard(car, true, index))
                    ) : (
                        <p role="alert" className="text-danger">
                            {t('exchange_incoming_data_unavailable')}
                        </p>
                    )}
                </div>
            </div>
            <dl className="mt-6 grid grid-cols-1 gap-4 border-t border-gray-200 pt-4 dark:border-gray-700 sm:grid-cols-2 lg:grid-cols-3">
                {financialRows.map(([label, value]) => (
                    <div key={label} className="rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
                        <dt className="text-sm text-gray-500 dark:text-gray-400">{label}</dt>
                        <dd className="mt-1 text-lg font-bold">{currency(value)}</dd>
                    </div>
                ))}
            </dl>
        </section>
    );
}
