'use client';
import React, { useState, useEffect } from 'react';
import supabase from '@/lib/supabase';
import { getTranslation } from '@/i18n';
import { sortBy } from 'lodash';
import { DataTable, DataTableSortStatus } from 'mantine-datatable';
import { Alert } from '@/components/elements/alerts/elements-alerts-default';
import { Log } from '@/types';
import IconEye from '@/components/icon/icon-eye';
import IconCar from '@/components/icon/icon-car';
import IconMenuInvoice from '@/components/icon/menu/icon-menu-invoice';
import IconUser from '@/components/icon/icon-user';
import IconListCheck from '@/components/icon/icon-list-check';
import Link from 'next/link';
import LogFilters from '@/components/log-filters/log-filters';
import { formatDate } from '@/utils/date-formatter';

interface LogFilters {
    search: string;
    carNumber: string;
    clientId: string;
    clientName: string;
    dateFrom: string;
    dateTo: string;
}

const LogsPage = () => {
    const { t } = getTranslation();
    const [items, setItems] = useState<Log[]>([]);
    const [loading, setLoading] = useState(true);

    const [page, setPage] = useState(1);
    const PAGE_SIZES = [10, 20, 30, 50, 100];
    const [pageSize, setPageSize] = useState(PAGE_SIZES[0]);
    const [initialRecords, setInitialRecords] = useState<Log[]>([]);
    const [records, setRecords] = useState<Log[]>([]);
    const [search, setSearch] = useState('');
    const [sortStatus, setSortStatus] = useState<DataTableSortStatus>({
        columnAccessor: 'id',
        direction: 'desc',
    });

    // Always default sort by ID in descending order
    useEffect(() => {
        if (sortStatus.columnAccessor !== 'id') {
            setSortStatus({ columnAccessor: 'id', direction: 'desc' });
        }
    }, []);
    const [alertState, setAlertState] = useState<{ message: string; type: 'success' | 'danger' } | null>(null);

    // Active filters state
    const [activeFilters, setActiveFilters] = useState<LogFilters>({
        search: '',
        carNumber: '',
        clientId: '',
        clientName: '',
        dateFrom: '',
        dateTo: '',
    });

    useEffect(() => {
        fetchLogs();
    }, []);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase.from('logs').select('*').order('created_at', { ascending: false });

            if (error) throw error;
            setItems(data || []);
        } catch (error) {
            console.error('Error fetching logs:', error);
            setAlertState({ message: t('error_loading_data'), type: 'danger' });
        } finally {
            setLoading(false);
        }
    };

    // Filter by search term and filters
    useEffect(() => {
        setInitialRecords(
            items.filter((log) => {
                const searchLower = activeFilters.search.toLowerCase();

                // Basic search filter
                const matchesSearch =
                    !activeFilters.search ||
                    log.type.toLowerCase().includes(searchLower) ||
                    (log.deal?.title && log.deal.title.toLowerCase().includes(searchLower)) ||
                    (log.deal?.customer_name && log.deal.customer_name.toLowerCase().includes(searchLower)) ||
                    (log.car?.title && log.car.title.toLowerCase().includes(searchLower)) ||
                    (log.car?.brand && log.car.brand.toLowerCase().includes(searchLower)) ||
                    (log.car?.car_number && log.car.car_number.toLowerCase().includes(searchLower)) ||
                    (log.bill?.customer_name && log.bill.customer_name.toLowerCase().includes(searchLower)) ||
                    (log.bill?.bill_type && log.bill.bill_type.toLowerCase().includes(searchLower));

                // Car number filter
                const matchesCarNumber = !activeFilters.carNumber || (log.car?.car_number && log.car.car_number.toLowerCase().includes(activeFilters.carNumber.toLowerCase()));

                // Client ID filter
                const matchesClientId =
                    !activeFilters.clientId ||
                    (log.deal?.customer?.id_number && log.deal.customer.id_number.toLowerCase().includes(activeFilters.clientId.toLowerCase())) ||
                    (log.bill?.customer_id_number && log.bill.customer_id_number.toLowerCase().includes(activeFilters.clientId.toLowerCase()));

                // Client name filter
                const matchesClientName =
                    !activeFilters.clientName ||
                    (log.deal?.customer_name && log.deal.customer_name.toLowerCase().includes(activeFilters.clientName.toLowerCase())) ||
                    (log.bill?.customer_name && log.bill.customer_name.toLowerCase().includes(activeFilters.clientName.toLowerCase()));

                // Date range filter
                const logDate = new Date(log.created_at);
                const matchesDateFrom = !activeFilters.dateFrom || logDate >= new Date(activeFilters.dateFrom);
                const matchesDateTo = !activeFilters.dateTo || logDate <= new Date(activeFilters.dateTo + 'T23:59:59');

                return matchesSearch && matchesCarNumber && matchesClientId && matchesClientName && matchesDateFrom && matchesDateTo;
            }),
        );
    }, [items, activeFilters]);

    useEffect(() => {
        setPage(1);
    }, [pageSize]);

    useEffect(() => {
        const from = (page - 1) * pageSize;
        const to = from + pageSize;
        setRecords([...initialRecords.slice(from, to)]);
    }, [page, pageSize, initialRecords]);

    useEffect(() => {
        const sorted = sortBy(initialRecords, sortStatus.columnAccessor);
        setRecords(sortStatus.direction === 'desc' ? sorted.reverse() : sorted);
        setPage(1);
    }, [sortStatus, initialRecords]);

    const getCarModelDetails = (log: Log) => {
        if (!log.car) return t('not_available');

        const car = log.car;
        return (
            <div className="text-sm">
                <div className="font-medium">
                    {car.brand} {car.title}
                </div>
                <div className="text-gray-500 dark:text-gray-400">
                    {car.year} - {car.car_number || t('no_car_number')}
                </div>
            </div>
        );
    };

    const getPurchaseInfo = (log: Log) => {
        if (!log.car) return t('not_available');

        const car = log.car;
        const provider = car.providers || car.provider_details;

        return (
            <div className="text-sm">
                <div className="font-medium">{formatDate(car.created_at) || t('not_available')}</div>
                <div className="text-gray-500 dark:text-gray-400">{provider?.name || car.provider || t('not_available')}</div>
                <div className="text-gray-500 dark:text-gray-400">₪{car.buy_price?.toLocaleString() || '0'}</div>
            </div>
        );
    };

    const getSaleInfo = (log: Log) => {
        if (!log.deal) return t('not_available');

        const deal = log.deal;
        const customer = deal.customer || deal.customers;

        return (
            <div className="text-sm">
                <div className="font-medium">{formatDate(deal.created_at) || t('not_available')}</div>
                <div className="text-gray-500 dark:text-gray-400">{customer?.name || deal.customer_name || t('not_available')}</div>
                <div className="text-gray-500 dark:text-gray-400">₪{deal.selling_price?.toLocaleString() || deal.amount?.toLocaleString() || '0'}</div>
            </div>
        );
    };

    const getPaymentReceiptInfo = (log: Log) => {
        if (!log.bill) return t('not_available');

        const bill = log.bill;

        return (
            <div className="text-sm">
                <div className="font-medium">{bill.payment_type ? getLocalizedPaymentType(bill.payment_type) : t('not_available')}</div>
                <div className="text-gray-500 dark:text-gray-400">₪{bill.total_with_tax?.toLocaleString() || '0'}</div>
            </div>
        );
    };

    const getInvoiceInfo = (log: Log) => {
        if (!log.bill) return t('not_available');

        const bill = log.bill;

        return (
            <div className="text-sm">
                <div className="font-medium">#{bill.id || t('not_available')}</div>
                <div className="text-gray-500 dark:text-gray-400">{bill.bill_type ? getLocalizedBillType(bill.bill_type) : t('not_available')}</div>
                <div className="text-gray-500 dark:text-gray-400">₪{bill.total_with_tax?.toLocaleString() || '0'}</div>
            </div>
        );
    };

    const getActivityTypeLabel = (type: string) => {
        return t(type) || type.replace('_', ' ');
    };

    const getLocalizedDealType = (dealType: string) => {
        return t(`deal_type_${dealType}`) || dealType.replace('_', ' ');
    };

    const getLocalizedBillType = (billType: string) => {
        return t(`bill_type_${billType}`) || billType.replace('_', ' ');
    };

    const getLocalizedPaymentType = (paymentType: string) => {
        // Common payment types - use the exact translation keys
        const paymentTypeMap: { [key: string]: string } = {
            cash: 'cash',
            visa: 'visa',
            bank_transfer: 'bank_transfer',
            transfer: 'transfer_description',
            check: 'check',
        };

        const translationKey = paymentTypeMap[paymentType];
        return translationKey ? t(translationKey) : t(paymentType) || paymentType.replace('_', ' ');
    };

    const getActivityIcon = (type: string) => {
        if (type.includes('car')) return <IconCar className="w-4 h-4" />;
        if (type.includes('deal')) return <IconMenuInvoice className="w-4 h-4" />;
        if (type.includes('bill')) return <IconMenuInvoice className="w-4 h-4" />;
        if (type.includes('customer') || type.includes('provider')) return <IconUser className="w-4 h-4" />;
        return <IconEye className="w-4 h-4" />;
    };

    const getActivityDetails = (log: Log) => {
        if (log.car) {
            return (
                <div className="text-sm">
                    <div className="font-medium">{log.car.title}</div>
                    <div className="text-gray-500 dark:text-gray-400">
                        {log.car.brand} - {log.car.year}
                        {log.car.car_number && ` | ${t('car_number')}: ${log.car.car_number}`}
                    </div>
                    <div className="text-gray-500 dark:text-gray-400">
                        {t('purchase_price')}: {log.car.buy_price?.toLocaleString()} | {t('sale_price')}: {log.car.sale_price?.toLocaleString()}
                    </div>
                </div>
            );
        }

        if (log.deal) {
            return (
                <div className="text-sm">
                    <div className="font-medium">{log.deal.title}</div>
                    <div className="text-gray-500 dark:text-gray-400">
                        {t('deal_type')}: {log.deal.deal_type ? getLocalizedDealType(log.deal.deal_type) : t('not_available')} | {t('amount')}: {log.deal.selling_price?.toLocaleString()}
                    </div>
                    {log.deal.customer_name && (
                        <div className="text-gray-500 dark:text-gray-400">
                            {t('customer')}: {log.deal.customer_name}
                        </div>
                    )}
                </div>
            );
        }

        if (log.bill) {
            return (
                <div className="text-sm">
                    <div className="font-medium">{log.bill.bill_type ? getLocalizedBillType(log.bill.bill_type) : t('not_available')}</div>
                    <div className="text-gray-500 dark:text-gray-400">
                        {t('customer')}: {log.bill.customer_name}
                    </div>
                    <div className="text-gray-500 dark:text-gray-400">
                        {t('amount')}: {log.bill.total_with_tax?.toLocaleString()}
                        {log.bill.payment_type && ` | ${t('payment_type')}: ${getLocalizedPaymentType(log.bill.payment_type)}`}
                    </div>
                </div>
            );
        }

        return <div className="text-sm text-gray-500">{t('no_details_available')}</div>;
    };

    const getRelatedItemLink = (log: Log) => {
        if (log.car) return `/cars`;
        if (log.deal) return `/deals`;
        if (log.bill) return `/bills`;
        return null;
    };

    return (
        <div>
            <div className="panel">
                <div className="mb-5 flex flex-col gap-5 md:flex-row md:items-center">
                    <h5 className="text-lg font-semibold dark:text-white-light">{t('activity_logs')}</h5>
                </div>

                {alertState && <Alert message={alertState.message} type={alertState.type} onClose={() => setAlertState(null)} />}

                <LogFilters
                    onFilterChange={(newFilters) => {
                        setActiveFilters(newFilters);
                        // Also update the search state to keep it in sync
                        setSearch(newFilters.search);
                    }}
                    onClearFilters={() => {
                        setActiveFilters({
                            search: '',
                            carNumber: '',
                            clientId: '',
                            clientName: '',
                            dateFrom: '',
                            dateTo: '',
                        });
                        setSearch('');
                    }}
                />

                <div className="datatables">
                    <DataTable
                        highlightOnHover
                        className="table-hover whitespace-nowrap"
                        records={records}
                        columns={[
                            {
                                accessor: 'created_at',
                                title: t('log_date'),
                                sortable: true,
                                render: ({ created_at }) => <div className="text-sm">{formatDate(created_at) || t('not_available')}</div>,
                            },
                            {
                                accessor: 'car_details',
                                title: t('car_model_details'),
                                render: (log) => getCarModelDetails(log),
                            },
                            {
                                accessor: 'purchase_info',
                                title: t('purchase_date') + ' / ' + t('provider_name') + ' / ' + t('purchase_price'),
                                render: (log) => getPurchaseInfo(log),
                            },
                            {
                                accessor: 'sale_info',
                                title: t('sale_date') + ' / ' + t('buyer_name') + ' / ' + t('sale_price'),
                                render: (log) => getSaleInfo(log),
                            },
                            {
                                accessor: 'payment_info',
                                title: t('payment_receipt_type') + ' / ' + t('amount'),
                                render: (log) => getPaymentReceiptInfo(log),
                            },
                            {
                                accessor: 'invoice_info',
                                title: t('invoice_number') + ' / ' + t('amount'),
                                render: (log) => getInvoiceInfo(log),
                            },
                            {
                                accessor: 'type',
                                title: t('activity_type'),
                                sortable: true,
                                render: ({ type }) => (
                                    <div className="flex items-center gap-2">
                                        {getActivityIcon(type)}
                                        <span className="font-medium text-xs">{getActivityTypeLabel(type)}</span>
                                    </div>
                                ),
                            },
                        ]}
                        totalRecords={initialRecords.length}
                        recordsPerPage={pageSize}
                        page={page}
                        onPageChange={(p) => setPage(p)}
                        recordsPerPageOptions={PAGE_SIZES}
                        onRecordsPerPageChange={setPageSize}
                        sortStatus={sortStatus}
                        onSortStatusChange={setSortStatus}
                        minHeight={200}
                        paginationText={({ from, to, totalRecords }) => `${t('showing')} ${from} ${t('to')} ${to} ${t('of')} ${totalRecords} ${t('entries')}`}
                        fetching={loading}
                    />
                </div>
            </div>
        </div>
    );
};

export default LogsPage;
