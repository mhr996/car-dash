'use client';
import React from 'react';
import { getTranslation } from '@/i18n';
import ProviderSelect from '@/components/provider-select/provider-select';
import CustomerSelect from '@/components/customer-select/customer-select';
import { CarSource, Customer } from '@/types';

interface CarSourceFieldsProps {
    carSource: CarSource;
    onSourceChange: (source: CarSource) => void;
    providerValue: string;
    onProviderChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
    selectedCustomer: Customer | null;
    onCustomerSelect: (customer: Customer | null) => void;
    onCreateCustomer: () => void;
    providerError?: string;
    customerError?: string;
}

const sourceButtonClass = (active: boolean) =>
    `flex-1 px-3 py-3 rounded-lg border-2 transition-colors ${
        active
            ? 'border-primary bg-primary text-white'
            : 'border-gray-300 bg-white text-gray-700 hover:border-primary hover:bg-primary hover:text-white dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300'
    }`;

const CarSourceFields = ({
    carSource,
    onSourceChange,
    providerValue,
    onProviderChange,
    selectedCustomer,
    onCustomerSelect,
    onCreateCustomer,
    providerError,
    customerError,
}: CarSourceFieldsProps) => {
    const { t } = getTranslation();
    const usesCustomer = carSource === 'customer' || carSource === 'brokerage' || carSource === 'broker';

    return (
        <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-white mb-3">
                {t('car_source')} <span className="text-red-500">*</span>
            </label>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">{t('car_source_description')}</p>

            <div className="flex flex-wrap gap-3 mb-4">
                <button type="button" onClick={() => onSourceChange('provider')} className={sourceButtonClass(carSource === 'provider')}>
                    <div className="text-center">
                        <div className="font-medium">{t('from_provider')}</div>
                    </div>
                </button>
                <button type="button" onClick={() => onSourceChange('customer')} className={sourceButtonClass(carSource === 'customer')}>
                    <div className="text-center">
                        <div className="font-medium">{t('from_customer')}</div>
                    </div>
                </button>
                <button
                    type="button"
                    onClick={() => onSourceChange('brokerage')}
                    className={sourceButtonClass(carSource === 'brokerage' || carSource === 'broker')}
                >
                    <div className="text-center">
                        <div className="font-medium">{t('from_brokerage')}</div>
                    </div>
                </button>
            </div>

            {carSource === 'provider' && (
                <div>
                    <label htmlFor="provider" className="block text-sm font-medium text-gray-700 dark:text-white mb-2">
                        {t('select_provider')} <span className="text-red-500">*</span>
                    </label>
                    <ProviderSelect defaultValue={providerValue} className={`form-input ${providerError ? 'border-red-500' : ''}`} name="provider" onChange={onProviderChange} />
                    {providerError && <p className="text-red-500 text-xs mt-1">{providerError}</p>}
                </div>
            )}

            {usesCustomer && (
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-white mb-2">
                        {t('select_customer')} <span className="text-red-500">*</span>
                    </label>
                    <CustomerSelect selectedCustomer={selectedCustomer} onCustomerSelect={onCustomerSelect} onCreateNew={onCreateCustomer} className="form-input" />
                    {customerError && <p className="text-red-500 text-xs mt-1">{customerError}</p>}
                </div>
            )}
        </div>
    );
};

export default CarSourceFields;
