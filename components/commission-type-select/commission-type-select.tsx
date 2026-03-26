'use client';
import React, { useState, useEffect, useRef } from 'react';
import IconCaretDown from '@/components/icon/icon-caret-down';
import IconDollarSign from '@/components/icon/icon-dollar-sign';
import IconReceipt from '@/components/icon/icon-receipt';
import IconInvoice from '@/components/icon/icon-invoice';
import { getTranslation } from '@/i18n';

interface CommissionTypeSelectProps {
    id?: string;
    name?: string;
    defaultValue?: string;
    className?: string;
    onChange?: (commissionType: string) => void;
}

const commissionTypes = [
    {
        value: 'tax_invoice',
        labelKey: 'commission_type_tax_invoice',
        descKey: 'commission_type_tax_invoice_desc',
        icon: IconInvoice,
        color: 'text-blue-600 dark:text-blue-400',
        bgColor: 'bg-blue-50 dark:bg-blue-900/20',
        borderColor: 'border-blue-200 dark:border-blue-800',
    },
    {
        value: 'receipt_only',
        labelKey: 'commission_type_receipt',
        descKey: 'commission_type_receipt_desc',
        icon: IconReceipt,
        color: 'text-green-600 dark:text-green-400',
        bgColor: 'bg-green-50 dark:bg-green-900/20',
        borderColor: 'border-green-200 dark:border-green-800',
    },
    {
        value: 'tax_invoice_receipt',
        labelKey: 'commission_type_both',
        descKey: 'commission_type_both_desc',
        icon: IconDollarSign,
        color: 'text-purple-600 dark:text-purple-400',
        bgColor: 'bg-purple-50 dark:bg-purple-900/20',
        borderColor: 'border-purple-200 dark:border-purple-800',
    },
];

const CommissionTypeSelect = ({ defaultValue = '', className = 'form-select text-white-dark', onChange, name = 'commission_type', id }: CommissionTypeSelectProps) => {
    const { t } = getTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const [selectedType, setSelectedType] = useState(defaultValue);
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setSelectedType(defaultValue);
    }, [defaultValue]);

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
        onChange?.(type);
    };

    const getSelectedLabel = () => {
        const selected = commissionTypes.find((type) => type.value === selectedType);
        if (selected) {
            const IconComponent = selected.icon;
            return (
                <div className="flex items-center gap-3 px-3 py-2">
                    <div className={`p-2 rounded-full ${selected.bgColor}`}>
                        <IconComponent className={`w-4 h-4 ${selected.color}`} />
                    </div>
                    <span className={`font-medium ${selected.color}`}>{t(selected.labelKey)}</span>
                </div>
            );
        }
        return (
            <div className="flex items-center gap-3 px-3 py-2 text-gray-500 dark:text-gray-400">
                <div className="p-2 rounded-full bg-gray-100 dark:bg-gray-800">
                    <IconDollarSign className="w-4 h-4" />
                </div>
                <span>{t('select_commission_type')}</span>
            </div>
        );
    };

    return (
        <div ref={wrapperRef} className="relative">
            <div
                className={`${className} cursor-pointer rounded-lg border border-gray-300 dark:border-[#374151] bg-white dark:bg-black hover:border-primary dark:hover:border-primary transition-all duration-200 min-h-[60px] flex items-center justify-between px-4`}
                onClick={() => setIsOpen(!isOpen)}
            >
                {getSelectedLabel()}
                <IconCaretDown className={`w-4 h-4 transition-transform duration-200 text-gray-500 dark:text-gray-400 ${isOpen ? 'rotate-180' : ''}`} />
            </div>
            {isOpen && (
                <div className="absolute z-50 mt-2 w-full rounded-lg border border-gray-200 dark:border-[#374151] bg-white dark:bg-black shadow-lg shadow-black/10 dark:shadow-black/50">
                    <div className="max-h-60 overflow-y-auto p-2">
                        {commissionTypes.map((type) => {
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
                                            <div className={`font-medium text-gray-900 dark:text-white mb-1 ${selectedType === type.value ? type.color : ''}`}>{t(type.labelKey)}</div>
                                            <div className="text-sm text-gray-500 dark:text-gray-400">{t(type.descKey)}</div>
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

export default CommissionTypeSelect;
