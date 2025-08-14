import React, { useState, useEffect } from 'react';
import IconSearch from '@/components/icon/icon-search';
import IconFilter from '@/components/icon/icon-filter';
import IconX from '@/components/icon/icon-x';
import { getTranslation } from '@/i18n';

interface FilterProps {
    onFilterChange: (filters: LogFilters) => void;
    onClearFilters: () => void;
}

export interface LogFilters {
    search: string;
    carNumber: string;
    clientId: string;
    clientName: string;
    dateFrom: string;
    dateTo: string;
}

const LogFilters: React.FC<FilterProps> = ({ onFilterChange, onClearFilters }) => {
    const { t } = getTranslation();
    const [isExpanded, setIsExpanded] = useState(false);
    const [filters, setFilters] = useState<LogFilters>({
        search: '',
        carNumber: '',
        clientId: '',
        clientName: '',
        dateFrom: '',
        dateTo: '',
    });

    useEffect(() => {
        onFilterChange(filters);
    }, [filters, onFilterChange]);

    const handleInputChange = (field: keyof LogFilters, value: string) => {
        setFilters((prev) => ({
            ...prev,
            [field]: value,
        }));
    };

    const handleClearFilters = () => {
        setFilters({
            search: '',
            carNumber: '',
            clientId: '',
            clientName: '',
            dateFrom: '',
            dateTo: '',
        });
        onClearFilters();
    };

    const hasActiveFilters = Object.values(filters).some((value) => value !== '');

    return (
        <div className="">
            <div className="mb-4.5 flex flex-col gap-5 md:flex-row md:items-center">
                <div className="flex items-center gap-2">
                    <button type="button" className={`btn btn-secondary gap-2`} onClick={() => setIsExpanded(!isExpanded)}>
                        <IconFilter className="w-4 h-4" />
                        {t('filters')}
                        {hasActiveFilters && <span className="badge bg-primary text-white rounded-full text-xs px-2">{Object.values(filters).filter((v) => v !== '').length}</span>}
                    </button>
                    {hasActiveFilters && (
                        <button type="button" className="btn btn-outline-danger gap-2" onClick={handleClearFilters}>
                            <IconX className="w-4 h-4" />
                            {t('clear_filters')}
                        </button>
                    )}
                </div>
                <div className="ltr:ml-auto rtl:mr-auto relative">
                    <IconSearch className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
                    <input type="text" className="form-input w-auto pl-10" placeholder={t('search')} value={filters.search} onChange={(e) => handleInputChange('search', e.target.value)} />
                </div>
            </div>

            {isExpanded && (
                <div className="panel border-white-light px-5 py-4 dark:border-[#1b2e4b]">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {/* Car Number Filter */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('car_number')}</label>
                            <input
                                type="text"
                                className="form-input"
                                placeholder={t('filter_by_car_number')}
                                value={filters.carNumber}
                                onChange={(e) => handleInputChange('carNumber', e.target.value)}
                            />
                        </div>

                        {/* Client ID Filter */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('client_id_number')}</label>
                            <input type="text" className="form-input" placeholder={t('filter_by_client_id')} value={filters.clientId} onChange={(e) => handleInputChange('clientId', e.target.value)} />
                        </div>

                        {/* Client Name Filter */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('client_name')}</label>
                            <input
                                type="text"
                                className="form-input"
                                placeholder={t('filter_by_client_name')}
                                value={filters.clientName}
                                onChange={(e) => handleInputChange('clientName', e.target.value)}
                            />
                        </div>

                        {/* Date From Filter */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('date_from')}</label>
                            <input type="date" className="form-input" value={filters.dateFrom} onChange={(e) => handleInputChange('dateFrom', e.target.value)} />
                        </div>

                        {/* Date To Filter */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('date_to')}</label>
                            <input type="date" className="form-input" value={filters.dateTo} onChange={(e) => handleInputChange('dateTo', e.target.value)} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LogFilters;
