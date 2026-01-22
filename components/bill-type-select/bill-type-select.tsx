import React, { useState, useEffect, useRef } from 'react';
import IconCaretDown from '@/components/icon/icon-caret-down';
import IconDollarSign from '@/components/icon/icon-dollar-sign';
import IconReceipt from '@/components/icon/icon-receipt';
import IconInvoice from '@/components/icon/icon-invoice';
import IconMinusCircle from '@/components/icon/icon-minus-circle';
import { getTranslation } from '@/i18n';

interface BillTypeSelectProps {
    id?: string;
    name?: string;
    defaultValue?: string;
    className?: string;
    dealType?: string; // Add dealType prop to filter available options
    showCreditNote?: boolean; // Whether to show credit note option (only available from deal edit page)
    disabledTypes?: string[]; // Bill types to hide (e.g., ['tax_invoice'] if deal already has one)
    onChange?: (billType: string) => void;
}

const BillTypeSelect = ({
    defaultValue = '',
    className = 'form-select text-white-dark',
    dealType,
    showCreditNote = false,
    disabledTypes = [],
    onChange,
    name = 'bill_type',
    id,
}: BillTypeSelectProps) => {
    const { t } = getTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const [selectedType, setSelectedType] = useState(defaultValue);
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setSelectedType(defaultValue);
    }, [defaultValue]);
    const billTypes = [
        {
            value: 'tax_invoice',
            label: t('tax_invoice_only'),
            icon: IconInvoice,
            color: 'text-blue-600 dark:text-blue-400',
            bgColor: 'bg-blue-50 dark:bg-blue-900/20',
            borderColor: 'border-blue-200 dark:border-blue-800',
            description: t('tax_invoice_description') || 'Generate tax invoice document',
        },
        {
            value: 'receipt_only',
            label: t('receipt_only'),
            icon: IconReceipt,
            color: 'text-green-600 dark:text-green-400',
            bgColor: 'bg-green-50 dark:bg-green-900/20',
            borderColor: 'border-green-200 dark:border-green-800',
            description: t('receipt_description') || 'Generate receipt document',
        },
        {
            value: 'tax_invoice_receipt',
            label: t('tax_invoice_and_receipt'),
            icon: IconDollarSign,
            color: 'text-purple-600 dark:text-purple-400',
            bgColor: 'bg-purple-50 dark:bg-purple-900/20',
            borderColor: 'border-purple-200 dark:border-purple-800',
            description: t('both_documents_description') || 'Generate both tax invoice and receipt',
        },
        {
            value: 'general',
            label: t('general_bill'),
            icon: IconReceipt,
            color: 'text-orange-600 dark:text-orange-400',
            bgColor: 'bg-orange-50 dark:bg-orange-900/20',
            borderColor: 'border-orange-200 dark:border-orange-800',
            description: t('general_bill_description') || 'Create a general bill with custom description and amount',
        },
        {
            value: 'credit_note',
            label: t('credit_note'),
            icon: IconMinusCircle,
            color: 'text-red-600 dark:text-red-400',
            bgColor: 'bg-red-50 dark:bg-red-900/20',
            borderColor: 'border-red-200 dark:border-red-800',
            description: t('credit_note_description') || 'Create a credit note to cancel/reverse a previous invoice',
        },
    ];

    // Filter bill types based on deal type
    const getFilteredBillTypes = () => {
        let types = billTypes;

        // Only show credit note if explicitly enabled (from deal edit page)
        if (!showCreditNote) {
            types = types.filter((type) => type.value !== 'credit_note');
        }

        // Remove any explicitly disabled types (e.g., tax_invoice if deal already has one)
        if (disabledTypes.length > 0) {
            types = types.filter((type) => !disabledTypes.includes(type.value));
        }

        if (dealType === 'intermediary') {
            // For intermediary deals, show tax_invoice_receipt, general, and optionally credit_note
            return types.filter((type) => type.value === 'tax_invoice_receipt' || type.value === 'general' || type.value === 'credit_note');
        } else {
            // For all other deal types, show tax_invoice, receipt_only, general, and optionally credit_note
            return types.filter((type) => type.value === 'tax_invoice' || type.value === 'receipt_only' || type.value === 'general' || type.value === 'credit_note');
        }
    };

    const filteredBillTypes = getFilteredBillTypes();

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
        const selected = filteredBillTypes.find((type) => type.value === selectedType);
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
                    <IconDollarSign className="w-4 h-4" />
                </div>
                <span>{t('select_bill_type')}</span>
            </div>
        );
    };

    // Reset selectedType if it's not available in the filtered options
    useEffect(() => {
        if (selectedType && !filteredBillTypes.find((type) => type.value === selectedType)) {
            setSelectedType('');
            if (onChange) {
                onChange('');
            }
        }
    }, [filteredBillTypes, selectedType, onChange]);

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
                        {filteredBillTypes.map((type) => {
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

export default BillTypeSelect;
