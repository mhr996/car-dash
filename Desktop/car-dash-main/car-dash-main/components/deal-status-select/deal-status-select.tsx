import React, { useState, useEffect } from 'react';
import IconClock from '@/components/icon/icon-clock';
import IconPlayCircle from '@/components/icon/icon-play-circle';
import IconCircleCheck from '@/components/icon/icon-circle-check';
import IconX from '@/components/icon/icon-x';
import { getTranslation } from '@/i18n';

interface DealStatusSelectProps {
    id?: string;
    name?: string;
    defaultValue?: string;
    className?: string;
    onChange?: (status: string) => void;
}

const DealStatusSelect = ({ defaultValue = '', className = '', onChange, name = 'status', id }: DealStatusSelectProps) => {
    const { t } = getTranslation();
    const [selectedStatus, setSelectedStatus] = useState(defaultValue);

    // Update selectedStatus when defaultValue changes
    useEffect(() => {
        setSelectedStatus(defaultValue);
    }, [defaultValue]);

    const statuses = [
        {
            value: 'pending',
            label: t('deal_status_pending'),
            icon: IconClock,
            color: 'text-amber-600 dark:text-amber-400',
            bgColor: 'bg-amber-50 dark:bg-amber-900/20',
            borderColor: 'border-amber-200 dark:border-amber-800',
        },
        {
            value: 'active',
            label: t('deal_status_active'),
            icon: IconPlayCircle,
            color: 'text-blue-600 dark:text-blue-400',
            bgColor: 'bg-blue-50 dark:bg-blue-900/20',
            borderColor: 'border-blue-200 dark:border-blue-800',
        },
        {
            value: 'completed',
            label: t('deal_status_completed'),
            icon: IconCircleCheck,
            color: 'text-emerald-600 dark:text-emerald-400',
            bgColor: 'bg-emerald-50 dark:bg-emerald-900/20',
            borderColor: 'border-emerald-200 dark:border-emerald-800',
        },
        {
            value: 'cancelled',
            label: t('deal_status_cancelled'),
            icon: IconX,
            color: 'text-red-600 dark:text-red-400',
            bgColor: 'bg-red-50 dark:bg-red-900/20',
            borderColor: 'border-red-200 dark:border-red-800',
        },
    ];

    const handleStatusSelect = (status: string) => {
        setSelectedStatus(status);
        if (onChange) {
            onChange(status);
        }
    };

    return (
        <div className={`${className}`}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {statuses.map((status) => {
                    const IconComponent = status.icon;
                    const isSelected = selectedStatus === status.value;

                    return (
                        <div
                            key={status.value}
                            className={`cursor-pointer rounded-lg p-3 border-2 transition-all duration-200 transform ${
                                isSelected
                                    ? `${status.bgColor} ${status.borderColor} ${status.color} shadow-md`
                                    : `bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400`
                            }`}
                            onClick={() => handleStatusSelect(status.value)}
                        >
                            <div className="flex flex-col items-center text-center space-y-2">
                                <div className={`p-2 rounded-full transition-colors duration-200 ${isSelected ? status.bgColor : 'bg-gray-100 dark:bg-gray-700'}`}>
                                    <IconComponent className={`w-5 h-5 ${isSelected ? status.color : 'text-gray-500 dark:text-gray-400'}`} />
                                </div>
                                <span className={`font-medium text-xs transition-colors duration-200 ${isSelected ? status.color : 'text-gray-700 dark:text-gray-300'}`}>{status.label}</span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default DealStatusSelect;
