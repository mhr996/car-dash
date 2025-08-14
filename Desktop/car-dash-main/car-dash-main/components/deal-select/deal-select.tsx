import React, { useState, useEffect, useRef } from 'react';
import IconCaretDown from '@/components/icon/icon-caret-down';
import IconUser from '@/components/icon/icon-user';
import IconCar from '@/components/icon/icon-car';
import IconDollarSign from '@/components/icon/icon-dollar-sign';
import IconCalendar from '@/components/icon/icon-calendar';
import IconMenuWidgets from '@/components/icon/menu/icon-menu-widgets';
import { getTranslation } from '@/i18n';

interface Deal {
    id: number;
    title: string;
    deal_type: string;
    amount: number;
    status: string;
    created_at?: string;
    customer_id?: number;
    customer_name?: string;
    car_id?: number;
    customer?: {
        id: number;
        name: string;
        phone: string;
        email?: string;
        country?: string;
        age?: number;
    };
    car?: {
        id: number;
        title: string;
        brand: string;
        year: number;
        status: string;
        type?: string;
        provider: string;
        kilometers: number;
        market_price: number;
        buy_price: number;
        sale_price: number;
    };
}

interface DealSelectProps {
    id?: string;
    name?: string;
    deals: Deal[];
    selectedDeal?: Deal | null;
    className?: string;
    onChange?: (deal: Deal | null) => void;
    loading?: boolean;
}

const DealSelect = ({ deals = [], selectedDeal = null, className = 'form-select text-white-dark', onChange, name = 'deal', id, loading = false }: DealSelectProps) => {
    const { t } = getTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleDealSelect = (deal: Deal) => {
        setIsOpen(false);
        if (onChange) {
            onChange(deal);
        }
    };

    const formatDate = (dateString?: string) => {
        if (!dateString) return '';
        try {
            return new Date(dateString).toLocaleDateString('en-GB', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
            });
        } catch {
            return '';
        }
    };

    const getDealTypeColor = (dealType: string) => {
        switch (dealType) {
            case 'buy':
                return 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800';
            case 'sell':
                return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800';
            case 'commission':
                return 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800';
            case 'company_commission':
                return 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800';
            default:
                return 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-800';
        }
    };

    const getSelectedLabel = () => {
        if (selectedDeal) {
            const dealTypeColor = getDealTypeColor(selectedDeal.deal_type);
            return (
                <div className="flex items-center gap-3 px-3 py-3">
                    <div className="p-2 rounded-full bg-primary/10">
                        <IconMenuWidgets className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-gray-900 dark:text-white truncate">{selectedDeal.title}</span>
                            <span className={`px-2 py-1 text-xs font-medium rounded-full border ${dealTypeColor}`}>{t(`deal_type_${selectedDeal.deal_type}`)}</span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                            <div className="flex items-center gap-1">
                                <IconUser className="w-3 h-3" />
                                <span className="truncate">{selectedDeal.customer?.name || t('no_customer')}</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <IconDollarSign className="w-3 h-3" />
                                <span>{'₪' + selectedDeal.amount}</span>
                            </div>
                            {selectedDeal.created_at && (
                                <div className="flex items-center gap-1">
                                    <IconCalendar className="w-3 h-3" />
                                    <span>{formatDate(selectedDeal.created_at)}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            );
        }
        return (
            <div className="flex items-center gap-3 px-3 py-3 text-gray-500 dark:text-gray-400">
                <div className="p-2 rounded-full bg-gray-100 dark:bg-gray-800">
                    <IconMenuWidgets className="w-5 h-5" />
                </div>
                <span>{loading ? t('loading_deals') || 'Loading deals...' : t('select_deal')}</span>
            </div>
        );
    };

    return (
        <div ref={wrapperRef} className="relative">
            <div
                className={`${className} cursor-pointer rounded-lg border border-gray-300 dark:border-[#191e3a] bg-white dark:bg-black hover:border-primary dark:hover:border-primary transition-all duration-200 min-h-[70px] flex items-center justify-between px-4`}
                onClick={() => !loading && setIsOpen(!isOpen)}
            >
                {getSelectedLabel()}
                <IconCaretDown className={`w-4 h-4 transition-transform duration-200 text-gray-500 dark:text-gray-400 ${isOpen ? 'rotate-180' : ''}`} />
            </div>
            {isOpen && !loading && deals.length > 0 && (
                <div className="absolute z-50 mt-2 w-full rounded-lg border border-gray-200 dark:border-[#191e3a] bg-white dark:bg-black shadow-lg shadow-black/10 dark:shadow-black/50">
                    <div className="max-h-80 overflow-y-auto p-2">
                        {deals.map((deal) => {
                            const dealTypeColor = getDealTypeColor(deal.deal_type);
                            const isSelected = selectedDeal?.id === deal.id;
                            return (
                                <div
                                    key={deal.id}
                                    className={`cursor-pointer rounded-lg p-4 mb-2 last:mb-0 hover:bg-gray-50 dark:hover:bg-[#1a2238] transition-all duration-200 ${
                                        isSelected ? 'bg-primary/5 border-primary/20 border' : 'border border-transparent'
                                    }`}
                                    onClick={() => handleDealSelect(deal)}
                                >
                                    <div className="space-y-3">
                                        {/* Deal Header */}
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className="p-2 rounded-full bg-primary/10">
                                                    <IconMenuWidgets className="w-4 h-4 text-primary" />
                                                </div>
                                                <div>
                                                    <h4 className={`font-semibold text-gray-900 dark:text-white ${isSelected ? 'text-primary' : ''}`}>{deal.title}</h4>
                                                    <span className={`px-2 py-1 text-xs font-medium rounded-full border ${dealTypeColor}`}>{t(`deal_type_${deal.deal_type}`)}</span>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="flex items-center gap-1 text-lg font-bold text-green-600 dark:text-green-400">
                                                    <span>{'₪' + deal.amount}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Deal Details */}
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                                            {/* Customer Info */}
                                            <div className="flex items-center gap-2">
                                                <div className="p-1 rounded bg-blue-50 dark:bg-blue-900/20">
                                                    <IconUser className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                                                </div>
                                                <div>
                                                    <span className="text-gray-500 dark:text-gray-400">{t('customer')}: </span>
                                                    <span className="text-gray-900 dark:text-white font-medium">{deal.customer?.name || t('no_customer')}</span>
                                                </div>
                                            </div>

                                            {/* Car Info */}
                                            <div className="flex items-center gap-2">
                                                <div className="p-1 rounded bg-purple-50 dark:bg-purple-900/20">
                                                    <IconCar className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                                                </div>
                                                <div>
                                                    <span className="text-gray-500 dark:text-gray-400">{t('car')}: </span>
                                                    <span className="text-gray-900 dark:text-white font-medium">{deal.car ? `${deal.car.brand} ${deal.car.title}` : t('no_car')}</span>
                                                </div>
                                            </div>

                                            {/* Date Info */}
                                            {deal.created_at && (
                                                <div className="flex items-center gap-2">
                                                    <div className="p-1 rounded bg-green-50 dark:bg-green-900/20">
                                                        <IconCalendar className="w-3 h-3 text-green-600 dark:text-green-400" />
                                                    </div>
                                                    <div>
                                                        <span className="text-gray-900 dark:text-white font-medium">{formatDate(deal.created_at)}</span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
            {isOpen && !loading && deals.length === 0 && (
                <div className="absolute z-50 mt-2 w-full rounded-lg border border-gray-200 dark:border-[#191e3a] bg-white dark:bg-black shadow-lg shadow-black/10 dark:shadow-black/50">
                    <div className="p-4 text-center text-gray-500 dark:text-gray-400">{t('no_deals_available') || 'No deals available'}</div>
                </div>
            )}
        </div>
    );
};

export default DealSelect;
