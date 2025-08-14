import React, { useState, useEffect, useRef } from 'react';
import IconCaretDown from '@/components/icon/icon-caret-down';
import { getTranslation } from '@/i18n';

interface CustomerTypeSelectProps {
    id?: string;
    name?: string;
    defaultValue?: string;
    className?: string;
    onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
}

const CustomerTypeSelect = ({ defaultValue, className = 'form-select text-white-dark', onChange, name = 'customer_type', id }: CustomerTypeSelectProps) => {
    const { t } = getTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const [selectedType, setSelectedType] = useState(defaultValue);
    const wrapperRef = useRef<HTMLDivElement>(null);

    // Update selectedType when defaultValue changes
    useEffect(() => {
        setSelectedType(defaultValue);
    }, [defaultValue]);

    const customerTypes = [
        { value: 'new', label: t('customer_type_new') },
        { value: 'existing', label: t('customer_type_existing') },
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
            const event = {
                target: { value: type, name: name },
            } as React.ChangeEvent<HTMLSelectElement>;
            onChange(event);
        }
    };

    const getSelectedLabel = () => {
        const selected = customerTypes.find((type) => type.value === selectedType);
        return selected ? selected.label : t('select_customer_type');
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
                        {customerTypes.map((type) => (
                            <div key={type.value} className="cursor-pointer px-4 py-2 hover:bg-gray-100 dark:text-white-dark dark:hover:bg-[#191e3a]" onClick={() => handleTypeSelect(type.value)}>
                                {type.label}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default CustomerTypeSelect;
