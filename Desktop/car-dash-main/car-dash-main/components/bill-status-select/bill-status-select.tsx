import React, { useState, useEffect, useRef } from 'react';
import IconCaretDown from '@/components/icon/icon-caret-down';
import IconClock from '@/components/icon/icon-clock';
import IconCircleCheck from '@/components/icon/icon-circle-check';
import IconExclamationTriangle from '@/components/icon/icon-exclamation-triangle';
import { getTranslation } from '@/i18n';

interface BillStatusSelectProps {
    id?: string;
    name?: string;
    defaultValue?: string;
    className?: string;
    onChange?: (status: string) => void;
}

const BillStatusSelect = ({ defaultValue = '', className = 'form-select text-white-dark', onChange, name = 'status', id }: BillStatusSelectProps) => {
    const { t } = getTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const [selectedStatus, setSelectedStatus] = useState(defaultValue);
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setSelectedStatus(defaultValue);
    }, [defaultValue]);

    const statuses = [
        {
            value: 'pending',
            label: t('bill_status_pending'),
            icon: IconClock,
            color: 'text-amber-600 dark:text-amber-400',
            bgColor: 'bg-amber-50 dark:bg-amber-900/20',
            borderColor: 'border-amber-200 dark:border-amber-800',
            description: t('bill_status_pending_desc') || 'Bill is awaiting payment',
        },
        {
            value: 'paid',
            label: t('bill_status_paid'),
            icon: IconCircleCheck,
            color: 'text-emerald-600 dark:text-emerald-400',
            bgColor: 'bg-emerald-50 dark:bg-emerald-900/20',
            borderColor: 'border-emerald-200 dark:border-emerald-800',
            description: t('bill_status_paid_desc') || 'Bill has been paid',
        },
        {
            value: 'overdue',
            label: t('bill_status_overdue'),
            icon: IconExclamationTriangle,
            color: 'text-red-600 dark:text-red-400',
            bgColor: 'bg-red-50 dark:bg-red-900/20',
            borderColor: 'border-red-200 dark:border-red-800',
            description: t('bill_status_overdue_desc') || 'Bill payment is overdue',
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

    const handleStatusSelect = (status: string) => {
        setSelectedStatus(status);
        setIsOpen(false);
        if (onChange) {
            onChange(status);
        }
    };

    const getSelectedLabel = () => {
        const selected = statuses.find((status) => status.value === selectedStatus);
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
                    <IconClock className="w-4 h-4" />
                </div>
                <span>{t('select_bill_status')}</span>
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
                        {statuses.map((status) => {
                            const IconComponent = status.icon;
                            return (
                                <div
                                    key={status.value}
                                    className={`cursor-pointer rounded-lg p-4 mb-1 last:mb-0 hover:bg-gray-50 dark:hover:bg-[#1a2238] transition-all duration-200 ${
                                        selectedStatus === status.value ? `${status.bgColor} ${status.borderColor} border` : 'border border-transparent'
                                    }`}
                                    onClick={() => handleStatusSelect(status.value)}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`p-3 rounded-full ${status.bgColor}`}>
                                            <IconComponent className={`w-5 h-5 ${status.color}`} />
                                        </div>
                                        <div className="flex-1">
                                            <div className={`font-medium text-gray-900 dark:text-white mb-1 ${selectedStatus === status.value ? status.color : ''}`}>{status.label}</div>
                                            <div className="text-sm text-gray-500 dark:text-gray-400">{status.description}</div>
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

export default BillStatusSelect;
