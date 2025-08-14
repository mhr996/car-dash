import React, { useState, useEffect, useRef } from 'react';
import IconCaretDown from '@/components/icon/icon-caret-down';
import { getTranslation } from '@/i18n';

interface DealTypeSelectProps {
    id?: string;
    name?: string;
    defaultValue?: string;
    className?: string;
    onChange?: (value: string) => void;
}

const DealTypeSelect = ({ defaultValue, className = 'form-select text-white-dark', onChange, name = 'deal_type', id }: DealTypeSelectProps) => {
    const { t } = getTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const [selectedType, setSelectedType] = useState(defaultValue);
    const wrapperRef = useRef<HTMLDivElement>(null);

    // Update selectedType when defaultValue changes
    useEffect(() => {
        setSelectedType(defaultValue);
    }, [defaultValue]);
    const dealTypes = [
        { value: 'new_sale', label: t('deal_type_new_sale') },
        { value: 'used_sale', label: t('deal_type_used_sale') },
        { value: 'new_used_sale_tax_inclusive', label: t('deal_type_new_used_sale_tax_inclusive') },
        { value: 'exchange', label: t('deal_type_exchange') },
        { value: 'intermediary', label: t('deal_type_intermediary') },
        { value: 'financing_assistance_intermediary', label: t('deal_type_financing_assistance_intermediary') },
        { value: 'company_commission', label: t('deal_type_company_commission') },
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
        const selected = dealTypes.find((type) => type.value === selectedType);
        return selected ? selected.label : t('select_deal_type');
    };

    return (
        <div ref={wrapperRef} className="relative">
            <div className={`${className} cursor-pointer dark:bg-black dark:text-white-dark dark:border-[#191e3a] flex items-center justify-between`} onClick={() => setIsOpen(!isOpen)}>
                <span>{getSelectedLabel()}</span>
                <IconCaretDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </div>
            {isOpen && (
                <div className="absolute z-50 mt-1 w-full rounded-md border border-gray-300 bg-white shadow-lg dark:bg-black dark:border-[#191e3a]">
                    <div className="max-h-60 overflow-y-auto">
                        {dealTypes.map((type) => (
                            <div
                                key={type.value}
                                className="cursor-pointer px-4 py-3 hover:bg-gray-100 dark:text-white-dark dark:hover:bg-[#191e3a] border-b border-gray-100 dark:border-[#191e3a] last:border-b-0"
                                onClick={() => handleTypeSelect(type.value)}
                            >
                                <div className="font-medium">{type.label}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default DealTypeSelect;
