import React, { useState, useEffect, useRef } from 'react';
import IconCaretDown from '@/components/icon/icon-caret-down';
import IconCreditCard from '@/components/icon/icon-credit-card';
import IconBank from '@/components/icon/icon-bank';
import IconTransfer from '@/components/icon/icon-transfer';
import IconCheck from '@/components/icon/icon-check';
import IconDollarSign from '@/components/icon/icon-dollar-sign';
import { getTranslation } from '@/i18n';

interface PaymentTypeSelectProps {
    id?: string;
    name?: string;
    defaultValue?: string;
    className?: string;
    onChange?: (paymentType: string) => void;
}

const PaymentTypeSelect = ({ defaultValue = '', className = 'form-select text-white-dark', onChange, name = 'payment_type', id }: PaymentTypeSelectProps) => {
    const { t } = getTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const [selectedType, setSelectedType] = useState(defaultValue);
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setSelectedType(defaultValue);
    }, [defaultValue]);
    const paymentTypes = [
        {
            value: 'cash',
            label: t('cash'),
            icon: IconDollarSign,
            color: 'text-emerald-600 dark:text-emerald-400',
            bgColor: 'bg-emerald-50 dark:bg-emerald-900/20',
            borderColor: 'border-emerald-200 dark:border-emerald-800',
            description: t('cash_description') || 'Payment in cash',
        },
        {
            value: 'visa',
            label: t('visa_card'),
            icon: IconCreditCard,
            color: 'text-blue-600 dark:text-blue-400',
            bgColor: 'bg-blue-50 dark:bg-blue-900/20',
            borderColor: 'border-blue-200 dark:border-blue-800',
            description: t('visa_description') || 'Payment via credit/debit card',
        },
        {
            value: 'bank_transfer',
            label: t('bank_transfer'),
            icon: IconBank,
            color: 'text-green-600 dark:text-green-400',
            bgColor: 'bg-green-50 dark:bg-green-900/20',
            borderColor: 'border-green-200 dark:border-green-800',
            description: t('bank_transfer_description') || 'Direct bank transfer',
        },
        {
            value: 'check',
            label: t('check'),
            icon: IconCheck,
            color: 'text-amber-600 dark:text-amber-400',
            bgColor: 'bg-amber-50 dark:bg-amber-900/20',
            borderColor: 'border-amber-200 dark:border-amber-800',
            description: t('check_description') || 'Payment via check',
        },
    ];

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleTypeSelect = (type: string) => {
        setSelectedType(type);
        setIsOpen(false);
        if (onChange) {
            onChange(type);
        }
    };

    const getSelectedLabel = () => {
        const selected = paymentTypes.find((type) => type.value === selectedType);
        if (selected) {
            const IconComponent = selected.icon;
            return (
                <div className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200`}>
                    <div className={`p-2 rounded-full ${selected.bgColor}`}>
                        <IconComponent className={`w-4 h-4 ${selected.color}`} />
                    </div>
                    <span className={`font-medium ${selected.color}`}>{selected.label}</span>
                </div>
            );
        }
        return (
            <div className="flex items-center gap-3 px-3 py-2 text-gray-500 dark:text-gray-400">
                <div className="p-2 rounded-full bg-gray-100 dark:bg-gray-800">
                    <IconCreditCard className="w-4 h-4" />
                </div>
                <span>{t('select_payment_type')}</span>
            </div>
        );
    };

    return (
        <div ref={wrapperRef} className="relative">
            <div
                className={`${className} cursor-pointer rounded-lg border border-gray-300 dark:border-[#191e3a] bg-white dark:bg-black hover:border-primary dark:hover:border-primary transition-all duration-200 min-h-[60px] flex items-center justify-between px-4`}
                onClick={() => setIsOpen(!isOpen)}
            >
                {getSelectedLabel()}
                <IconCaretDown className={`w-4 h-4 transition-transform duration-200 text-gray-500 dark:text-gray-400 ${isOpen ? 'rotate-180' : ''}`} />
            </div>
            {isOpen && (
                <div className="absolute z-50 mt-2 w-full rounded-lg border border-gray-200 dark:border-[#191e3a] bg-white dark:bg-black shadow-lg shadow-black/10 dark:shadow-black/50">
                    <div className="max-h-60 overflow-y-auto p-2">
                        {paymentTypes.map((type) => {
                            const IconComponent = type.icon;
                            return (
                                <div
                                    key={type.value}
                                    className={`cursor-pointer rounded-lg p-4 mb-1 last:mb-0 hover:bg-gray-50 dark:hover:bg-[#1a2238] transition-all duration-200 ${
                                        selectedType === type.value ? `${type.bgColor} ${type.borderColor} border` : 'border border-transparent'
                                    }`}
                                    onClick={() => handleTypeSelect(type.value)}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`p-3 rounded-full ${type.bgColor}`}>
                                            <IconComponent className={`w-5 h-5 ${type.color}`} />
                                        </div>
                                        <div className="flex-1">
                                            <div className={`font-medium text-gray-900 dark:text-white mb-1 ${selectedType === type.value ? type.color : ''}`}>{type.label}</div>
                                            <div className="text-sm text-gray-500 dark:text-gray-400">{type.description}</div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

export default PaymentTypeSelect;
