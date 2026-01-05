import React, { useState, useEffect, useRef } from 'react';
import IconSearch from '@/components/icon/icon-search';
import IconFilter from '@/components/icon/icon-filter';
import IconX from '@/components/icon/icon-x';
import IconCaretDown from '@/components/icon/icon-caret-down';
import BrandSelect from '@/components/brand-select/brand-select';
import ProviderSelect from '@/components/provider-select/provider-select';
import { getTranslation } from '@/i18n';

interface FilterProps {
    onFilterChange: (filters: CarFilters) => void;
    onClearFilters: () => void;
}

export interface CarFilters {
    search: string;
    brand: string;
    provider: string;
    status: string;
    yearFrom: string;
    yearTo: string;
    priceFrom: string;
    priceTo: string;
    dateFrom: string;
    dateTo: string;
    publicStatus: string;
}

// Custom Select Component styled like BrandSelect
interface CustomSelectProps {
    options: Array<{ value: string; label: string }>;
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
    className?: string;
}

const CustomSelect: React.FC<CustomSelectProps> = ({ options, value, onChange, placeholder, className = 'form-select text-white-dark' }) => {
    const { t } = getTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const wrapperRef = useRef<HTMLDivElement>(null);

    const filteredOptions = options.filter((option) => option.label.toLowerCase().includes(searchTerm.toLowerCase()));

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (selectedValue: string) => {
        onChange(selectedValue);
        setIsOpen(false);
        setSearchTerm('');
    };

    const selectedOption = options.find((option) => option.value === value);

    return (
        <div ref={wrapperRef} className="relative">
            <div className={`${className} cursor-pointer dark:bg-black dark:text-white-dark dark:border-[#191e3a] flex items-center justify-between`} onClick={() => setIsOpen(!isOpen)}>
                <span>{selectedOption?.label || placeholder}</span>
                <IconCaretDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </div>
            {isOpen && (
                <div className="absolute z-50 mt-1 w-full rounded-md border border-gray-300 bg-white shadow-lg dark:bg-black dark:border-[#191e3a]">
                    {options.length > 5 && (
                        <div className="p-2">
                            <input
                                type="text"
                                className="w-full rounded border border-gray-300 p-2 focus:border-primary focus:outline-none dark:bg-black dark:border-[#191e3a] dark:text-white-dark"
                                placeholder={t('search')}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                autoFocus
                            />
                        </div>
                    )}
                    <div className="max-h-60 overflow-y-auto">
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map((option) => (
                                <div key={option.value} className="cursor-pointer px-4 py-2 hover:bg-gray-100 dark:text-white-dark dark:hover:bg-[#191e3a]" onClick={() => handleSelect(option.value)}>
                                    {option.label}
                                </div>
                            ))
                        ) : (
                            <div className="px-4 py-2 text-gray-500 dark:text-gray-400 text-center">No options found</div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

const CarFilters: React.FC<FilterProps> = ({ onFilterChange, onClearFilters }) => {
    const { t } = getTranslation();
    const [isExpanded, setIsExpanded] = useState(false);
    const [filters, setFilters] = useState<CarFilters>({
        search: '',
        brand: '',
        provider: '',
        status: '',
        yearFrom: '',
        yearTo: '',
        priceFrom: '',
        priceTo: '',
        dateFrom: '',
        dateTo: '',
        publicStatus: '',
    });

    const statusOptions = [
        { value: '', label: t('all_statuses') },
        { value: 'new', label: t('new') },
        { value: 'used', label: t('used') },
        { value: 'received_from_client', label: t('received_from_client') },
    ];

    const publicStatusOptions = [
        { value: '', label: t('all') },
        { value: 'true', label: t('public') },
        { value: 'false', label: t('private') },
    ];

    const currentYear = new Date().getFullYear();
    const yearOptions = [
        { value: '', label: t('any_year') },
        ...Array.from({ length: 50 }, (_, i) => {
            const year = currentYear - i;
            return { value: year.toString(), label: year.toString() };
        }),
    ];

    useEffect(() => {
        onFilterChange(filters);
    }, [filters, onFilterChange]);

    const handleInputChange = (field: keyof CarFilters, value: string) => {
        setFilters((prev) => ({
            ...prev,
            [field]: value,
        }));
    };

    const handleClearFilters = () => {
        setFilters({
            search: '',
            brand: '',
            provider: '',
            status: '',
            yearFrom: '',
            yearTo: '',
            priceFrom: '',
            priceTo: '',
            dateFrom: '',
            dateTo: '',
            publicStatus: '',
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
                        {/* Brand Filter */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('brand')}</label>
                            <BrandSelect defaultValue={filters.brand} onChange={(e) => handleInputChange('brand', e.target.value)} className="form-select" />
                        </div>

                        {/* Provider Filter */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('provider')}</label>
                            <ProviderSelect defaultValue={filters.provider} onChange={(e) => handleInputChange('provider', e.target.value)} className="form-select" />
                        </div>

                        {/* Status Filter */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('car_status')}</label>
                            <CustomSelect
                                options={statusOptions}
                                value={filters.status}
                                onChange={(value) => handleInputChange('status', value)}
                                placeholder={t('all_statuses')}
                                className="form-select"
                            />
                        </div>

                        {/* Public Status Filter */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('visibility')}</label>
                            <CustomSelect
                                options={publicStatusOptions}
                                value={filters.publicStatus}
                                onChange={(value) => handleInputChange('publicStatus', value)}
                                placeholder={t('all')}
                                className="form-select"
                            />
                        </div>

                        {/* Year From Filter */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('year_from')}</label>
                            <CustomSelect
                                options={yearOptions}
                                value={filters.yearFrom}
                                onChange={(value) => handleInputChange('yearFrom', value)}
                                placeholder={t('any_year')}
                                className="form-select"
                            />
                        </div>

                        {/* Year To Filter */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('year_to')}</label>
                            <CustomSelect options={yearOptions} value={filters.yearTo} onChange={(value) => handleInputChange('yearTo', value)} placeholder={t('any_year')} className="form-select" />
                        </div>

                        {/* Price From Filter */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('price_from')}</label>
                            <input type="number" className="form-input" placeholder="0" value={filters.priceFrom} onChange={(e) => handleInputChange('priceFrom', e.target.value)} />
                        </div>

                        {/* Price To Filter */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('price_to')}</label>
                            <input type="number" className="form-input" placeholder="999999" value={filters.priceTo} onChange={(e) => handleInputChange('priceTo', e.target.value)} />
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

export default CarFilters;
