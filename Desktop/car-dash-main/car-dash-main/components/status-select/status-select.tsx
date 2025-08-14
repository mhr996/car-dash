import React, { useState, useEffect, useRef } from 'react';
import IconCaretDown from '@/components/icon/icon-caret-down';
import { getTranslation } from '@/i18n';

interface StatusSelectProps {
    id?: string;
    name?: string;
    defaultValue?: string;
    className?: string;
    onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
}

const StatusSelect = ({ defaultValue, className = 'form-select text-white-dark', onChange, name = 'status', id }: StatusSelectProps) => {
    const { t } = getTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const [selectedStatus, setSelectedStatus] = useState(defaultValue);
    const wrapperRef = useRef<HTMLDivElement>(null);

    // Update selectedStatus when defaultValue changes
    useEffect(() => {
        setSelectedStatus(defaultValue);
    }, [defaultValue]);

    const statusOptions = [
        { value: 'new', label: t('new') },
        { value: 'used', label: t('used') },
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
    const handleStatusSelect = (statusValue: string) => {
        setSelectedStatus(statusValue);
        setIsOpen(false);
        if (onChange) {
            const event = {
                target: { value: statusValue, name: name },
            } as React.ChangeEvent<HTMLSelectElement>;
            onChange(event);
        }
    };
    const getSelectedLabel = () => {
        const selected = statusOptions.find((status) => status.value === selectedStatus);
        return selected ? selected.label : t('select_status');
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
                        {statusOptions.map((status) => (
                            <div
                                key={status.value}
                                className="cursor-pointer px-4 py-2 hover:bg-gray-100 dark:text-white-dark dark:hover:bg-[#191e3a]"
                                onClick={() => handleStatusSelect(status.value)}
                            >
                                {status.label}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default StatusSelect;
