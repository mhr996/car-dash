import React, { useState, useEffect, useRef } from 'react';
import IconSearch from '@/components/icon/icon-search';
import IconFilter from '@/components/icon/icon-filter';
import IconX from '@/components/icon/icon-x';
import IconCaretDown from '@/components/icon/icon-caret-down';
import { getTranslation } from '@/i18n';

interface FilterProps {
    onFilterChange: (filters: DealFilters) => void;
    onClearFilters: () => void;
}

export interface DealFilters {
    search: string;
    dealType: string;
    status: string;
    amountFrom: string;
    amountTo: string;
    sellingPriceFrom: string;
    sellingPriceTo: string;
    dateFrom: string;
    dateTo: string;
    sellerId: string;
    buyerId: string;
}

// Custom Select Component styled like other selects
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

const DealFilters: React.FC<FilterProps> = ({ onFilterChange, onClearFilters }) => {
    const { t } = getTranslation();
    const [isExpanded, setIsExpanded] = useState(false);
    const [filters, setFilters] = useState<DealFilters>({
        search: '',
        dealType: '',
        status: '',
        amountFrom: '',
        amountTo: '',
        sellingPriceFrom: '',
        sellingPriceTo: '',
        dateFrom: '',
        dateTo: '',
        sellerId: '',
        buyerId: '',
    });

    const dealTypeOptions = [
        { value: '', label: t('all') },
        { value: 'new_used_sale', label: t('deal_type_new_used_sale') },
        { value: 'new_sale', label: t('deal_type_new_sale') },
        { value: 'used_sale', label: t('deal_type_used_sale') },
        { value: 'new_used_sale_tax_inclusive', label: t('deal_type_new_used_sale_tax_inclusive') },
        { value: 'exchange', label: t('deal_type_exchange') },
        { value: 'intermediary', label: t('deal_type_intermediary') },
        { value: 'financing_assistance_intermediary', label: t('deal_type_financing_assistance_intermediary') },
        { value: 'company_commission', label: t('deal_type_company_commission') },
    ];

    const statusOptions = [
        { value: '', label: t('all') },
        { value: 'pending', label: t('deal_status_pending') },
        { value: 'active', label: t('deal_status_active') },
        { value: 'completed', label: t('deal_status_completed') },
        { value: 'cancelled', label: t('deal_status_cancelled') },
    ];

    useEffect(() => {
        onFilterChange(filters);
    }, [filters, onFilterChange]);

    const handleInputChange = (field: keyof DealFilters, value: string) => {
        setFilters((prev) => ({
            ...prev,
            [field]: value,
        }));
    };

    const handleClearFilters = () => {
        setFilters({
            search: '',
            dealType: '',
            status: '',
            amountFrom: '',
            amountTo: '',
            sellingPriceFrom: '',
            sellingPriceTo: '',
            dateFrom: '',
            dateTo: '',
            sellerId: '',
            buyerId: '',
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
                        {/* Deal Type Filter */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('deal_type')}</label>
                            <CustomSelect
                                options={dealTypeOptions}
                                value={filters.dealType}
                                onChange={(value) => handleInputChange('dealType', value)}
                                placeholder={t('all')}
                                className="form-select"
                            />
                        </div>

                        {/* Status Filter */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('status')}</label>
                            <CustomSelect options={statusOptions} value={filters.status} onChange={(value) => handleInputChange('status', value)} placeholder={t('all')} className="form-select" />
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

                        {/* Seller Filter */}
                        {/* <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('seller')}</label>
                            <CustomerSelect defaultValue={filters.sellerId} onChange={(e) => handleInputChange('sellerId', e.target.value)} className="form-select" />
                        </div> */}

                        {/* Buyer Filter */}
                        {/* <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('buyer')}</label>
                            <CustomerSelect defaultValue={filters.buyerId} onChange={(e) => handleInputChange('buyerId', e.target.value)} className="form-select" />
                        </div> */}
                    </div>
                </div>
            )}
        </div>
    );
};

export default DealFilters;
