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
import { LogsPDFGenerator } from '@/utils/logs-pdf-generator';
import IconDownload from '@/components/icon/icon-download';
import { PermissionGuard } from '@/components/auth/permission-guard';

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
    const [billsData, setBillsData] = useState<{ [dealId: string]: any[] }>({});

    const [page, setPage] = useState(1);
    const PAGE_SIZES = [10, 20, 30, 50, 100];
    const [pageSize, setPageSize] = useState(PAGE_SIZES[0]);
    const [initialRecords, setInitialRecords] = useState<Log[]>([]);
    const [records, setRecords] = useState<Log[]>([]);
    const [search, setSearch] = useState('');
    const [sortStatus, setSortStatus] = useState<DataTableSortStatus>({
        columnAccessor: 'created_at',
        direction: 'desc',
    });

    // Always default sort by car created_at in descending order (newer first)
    useEffect(() => {
        if (sortStatus.columnAccessor !== 'created_at' || sortStatus.direction !== 'desc') {
            setSortStatus({ columnAccessor: 'created_at', direction: 'desc' });
        }
    }, []);
    const [alertState, setAlertState] = useState<{ message: string; type: 'success' | 'danger' } | null>(null);
    const [isExporting, setIsExporting] = useState(false);

    // Auto-dismiss success alerts after 3 seconds
    useEffect(() => {
        if (alertState?.type === 'success') {
            const timer = setTimeout(() => {
                setAlertState(null);
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [alertState]);

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

            // Fetch bills for all deals in the logs
            await fetchBillsForDeals(data || []);
        } catch (error) {
            console.error('Error fetching logs:', error);
            setAlertState({ message: t('error_loading_data'), type: 'danger' });
        } finally {
            setLoading(false);
        }
    };

    const fetchBillsForDeals = async (logs: Log[]) => {
        try {
            // Get all unique deal IDs from logs
            const dealIds = logs
                .filter((log) => log.deal && log.deal.id)
                .map((log) => log.deal.id)
                .filter((id, index, arr) => arr.indexOf(id) === index); // Remove duplicates

            if (dealIds.length === 0) return;

            // Fetch all bills for these deals with their payments
            const { data: bills, error } = await supabase
                .from('bills')
                .select(
                    `
                    *,
                    bill_payments (*)
                `,
                )
                .in('deal_id', dealIds);

            if (error) {
                console.error('Error fetching bills:', error);
                return;
            }

            // Group bills by deal_id
            const billsByDeal: { [dealId: string]: any[] } = {};
            bills?.forEach((bill) => {
                if (!billsByDeal[bill.deal_id]) {
                    billsByDeal[bill.deal_id] = [];
                }
                billsByDeal[bill.deal_id].push(bill);
            });

            setBillsData(billsByDeal);
        } catch (error) {
            console.error('Error fetching bills for deals:', error);
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
                    (log.car?.car_number && log.car.car_number.toLowerCase().includes(searchLower));

                // Car number filter
                const matchesCarNumber = !activeFilters.carNumber || (log.car?.car_number && log.car.car_number.toLowerCase().includes(activeFilters.carNumber.toLowerCase()));

                // Client ID filter
                const matchesClientId = !activeFilters.clientId || (log.deal?.customer?.id_number && log.deal.customer.id_number.toLowerCase().includes(activeFilters.clientId.toLowerCase()));

                // Client name filter
                const matchesClientName = !activeFilters.clientName || (log.deal?.customer_name && log.deal.customer_name.toLowerCase().includes(activeFilters.clientName.toLowerCase()));

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
        const sortedByCarDate = [...initialRecords].sort((a, b) => {
            // Sort by car.created_at from newer to older
            const dateA = new Date(a.car?.created_at || 0);
            const dateB = new Date(b.car?.created_at || 0);
            return dateB.getTime() - dateA.getTime();
        });

        const from = (page - 1) * pageSize;
        const to = from + pageSize;
        setRecords(sortedByCarDate.slice(from, to));
    }, [page, pageSize, initialRecords]);

    useEffect(() => {
        let sorted = [...initialRecords];

        if (sortStatus.columnAccessor === 'created_at') {
            // Sort by car.created_at
            sorted = sorted.sort((a, b) => {
                const dateA = new Date(a.car?.created_at || 0);
                const dateB = new Date(b.car?.created_at || 0);
                return sortStatus.direction === 'desc' ? dateB.getTime() - dateA.getTime() : dateA.getTime() - dateB.getTime();
            });
        } else {
            // Sort by other columns using lodash sortBy
            sorted = sortBy(initialRecords, sortStatus.columnAccessor);
            if (sortStatus.direction === 'desc') {
                sorted = sorted.reverse();
            }
        }

        setRecords(sorted);
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
        const customer = car.customers || car.customer_details;

        // Determine source name based on source_type
        let sourceName = t('not_available');
        if (car.source_type === 'provider') {
            sourceName = provider?.name || car.provider || t('not_available');
        } else if (car.source_type === 'customer') {
            sourceName = customer?.name || t('not_available');
        }

        return (
            <div className="text-sm">
                <div className="font-medium">{formatDate(car.created_at) || t('not_available')}</div>
                <div className="text-gray-500 dark:text-gray-400">{sourceName}</div>
                <div className="text-gray-500 dark:text-gray-400">₪{car.buy_price?.toLocaleString() || '0'}</div>
            </div>
        );
    };

    const getSaleInfo = (log: Log) => {
        if (!log.deal) return t('not_available');

        const deal = log.deal;
        const customer = deal.customer || deal.customers;
        const seller = deal.seller || deal.sellers;
        const buyer = deal.buyer || deal.buyers;

        // For exchange and intermediary deals with buyer and seller
        if ((deal.deal_type === 'exchange' || deal.deal_type === 'intermediary' || deal.deal_type === 'financing_assistance_intermediary') && (seller || buyer)) {
            return (
                <div className="text-sm">
                    <div className="font-medium">{formatDate(deal.created_at) || t('not_available')}</div>
                    {seller && (
                        <div className="text-gray-500 dark:text-gray-400">
                            {t('seller')}: {seller.name}
                        </div>
                    )}
                    {buyer && (
                        <div className="text-gray-500 dark:text-gray-400">
                            {t('buyer')}: {buyer.name}
                        </div>
                    )}
                    <div className="text-gray-500 dark:text-gray-400">₪{deal.selling_price?.toLocaleString() || deal.amount?.toLocaleString() || '0'}</div>
                </div>
            );
        }

        // For regular deals with single customer
        return (
            <div className="text-sm">
                <div className="font-medium">{formatDate(deal.created_at) || t('not_available')}</div>
                <div className="text-gray-500 dark:text-gray-400">{customer?.name || deal.customer_name || t('not_available')}</div>
                <div className="text-gray-500 dark:text-gray-400">₪{deal.selling_price?.toLocaleString() || deal.amount?.toLocaleString() || '0'}</div>
            </div>
        );
    };

    const getPaymentReceiptInfo = (log: Log) => {
        if (!log.deal || !log.deal.id) return t('not_available');

        const dealBills = billsData[log.deal.id] || [];

        // Find receipt-type bills (receipt_only or tax_invoice_receipt)
        const receiptBills = dealBills.filter((bill) => bill.bill_type === 'receipt_only' || bill.bill_type === 'tax_invoice_receipt');

        if (receiptBills.length === 0) {
            return <span className="text-gray-400">{t('not_available')}</span>;
        }

        // For now, show the first receipt bill (you can modify this logic if needed)
        const bill = receiptBills[0];

        // Calculate total from bill_payments if available, otherwise use bill amounts
        let totalAmount = 0;

        if (bill.bill_payments && Array.isArray(bill.bill_payments)) {
            // Sum up all payments linked to this bill
            totalAmount = bill.bill_payments.reduce((sum: number, payment: any) => sum + (payment.amount || 0), 0);
        } else {
            // Fallback to bill's total amounts
            totalAmount = bill.total_with_tax || bill.total || bill.bill_amount || 0;
        }

        return (
            <div className="text-sm">
                <div className="font-medium">#{bill.tranzila_document_number || bill.id || t('not_available')}</div>
                <div className="text-gray-500 dark:text-gray-400">{getLocalizedBillType(bill.bill_type)}</div>
                <div className="text-gray-500 dark:text-gray-400">₪{totalAmount.toLocaleString()}</div>
                {receiptBills.length > 1 && <div className="text-xs text-gray-400">+{receiptBills.length - 1} more</div>}
            </div>
        );
    };

    const getInvoiceInfo = (log: Log) => {
        if (!log.deal || !log.deal.id) return t('not_available');

        const dealBills = billsData[log.deal.id] || [];

        // Find tax invoice bills (tax_invoice or tax_invoice_receipt)
        const invoiceBills = dealBills.filter((bill) => bill.bill_type === 'tax_invoice' || bill.bill_type === 'tax_invoice_receipt');

        if (invoiceBills.length === 0) {
            return <span className="text-gray-400">{t('not_available')}</span>;
        }

        // For now, show the first invoice bill (you can modify this logic if needed)
        const bill = invoiceBills[0];

        // For tax invoices, show ID and total_with_tax amount
        const displayAmount = bill.total_with_tax || 0;

        return (
            <div className="text-sm">
                <div className="font-medium">#{bill.tranzila_document_number || bill.id || t('not_available')}</div>
                <div className="text-gray-500 dark:text-gray-400">{getLocalizedBillType(bill.bill_type)}</div>
                <div className="text-gray-500 dark:text-gray-400">₪{displayAmount.toLocaleString()}</div>
                {invoiceBills.length > 1 && <div className="text-xs text-gray-400">+{invoiceBills.length - 1} more</div>}
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

    const getStatusBadgeClass = (status: string) => {
        switch (status) {
            case 'active':
                return 'badge-outline-success';
            case 'completed':
                return 'badge-outline-primary';
            case 'cancelled':
                return 'badge-outline-danger';
            default:
                return 'badge-outline-secondary';
        }
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
            const deal = log.deal;
            const seller = deal.seller || deal.sellers;
            const buyer = deal.buyer || deal.buyers;

            return (
                <div className="text-sm">
                    <div className="font-medium">{deal.title}</div>
                    <div className="text-gray-500 dark:text-gray-400">
                        {t('deal_type')}: {deal.deal_type ? getLocalizedDealType(deal.deal_type) : t('not_available')} | {t('amount')}: {deal.selling_price?.toLocaleString()}
                    </div>
                    {/* Show seller and buyer for exchange/intermediary deals */}
                    {(deal.deal_type === 'exchange' || deal.deal_type === 'intermediary' || deal.deal_type === 'financing_assistance_intermediary') && (seller || buyer) ? (
                        <>
                            {seller && (
                                <div className="text-gray-500 dark:text-gray-400">
                                    {t('seller')}: {seller.name}
                                </div>
                            )}
                            {buyer && (
                                <div className="text-gray-500 dark:text-gray-400">
                                    {t('buyer')}: {buyer.name}
                                </div>
                            )}
                        </>
                    ) : (
                        deal.customer_name && (
                            <div className="text-gray-500 dark:text-gray-400">
                                {t('customer')}: {deal.customer_name}
                            </div>
                        )
                    )}
                </div>
            );
        }

        return <div className="text-sm text-gray-500">{t('no_details_available')}</div>;
    };

    const getRelatedItemLink = (log: Log) => {
        if (log.car) return `/cars`;
        if (log.deal) return `/sales-deals`;
        return null;
    };

    const handleExportPDF = async () => {
        if (initialRecords.length === 0) {
            setAlertState({ message: t('no_data_to_export'), type: 'danger' });
            return;
        }

        setIsExporting(true);
        setAlertState(null);

        try {
            console.log('Starting PDF export with', initialRecords.length, 'records');

            // Export all filtered records
            await LogsPDFGenerator.generateFromLogs(initialRecords, billsData);

            setAlertState({ message: t('pdf_exported_successfully'), type: 'success' });
        } catch (error) {
            console.error('PDF export failed:', error);

            // More detailed error handling
            let errorMessage = t('pdf_export_failed');

            if (error instanceof Error) {
                // Check for specific error types
                if (error.message.includes('PDF generation failed')) {
                    errorMessage = t('pdf_generation_error') + ' - ' + t('please_try_again_later');
                } else if (error.message.includes('network') || error.message.includes('fetch')) {
                    errorMessage = t('network_error') + ' - ' + t('check_internet_connection');
                } else if (error.message.includes('timeout')) {
                    errorMessage = t('request_timeout') + ' - ' + t('try_with_fewer_records');
                } else {
                    errorMessage = error.message;
                }
            }

            setAlertState({
                message: errorMessage,
                type: 'danger',
            });
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <div>
            <div className="panel">
                <div className="mb-5 flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                    <h5 className="text-lg font-semibold dark:text-white-light">{t('activity_logs')}</h5>

                    <div className="flex items-center gap-3">
                        <button type="button" className="btn btn-primary gap-2" onClick={handleExportPDF} disabled={isExporting || initialRecords.length === 0}>
                            <IconDownload className="w-4 h-4" />
                            {isExporting ? t('generating_pdf') : `${t('export_pdf')} (${initialRecords.length})`}
                        </button>
                    </div>
                </div>

                {/* Fixed positioned alert */}
                {alertState && (
                    <div className="fixed top-4 right-4 z-50 max-w-md">
                        <Alert message={alertState.message} type={alertState.type} onClose={() => setAlertState(null)} />
                    </div>
                )}

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
                        className="table-hover whitespace-nowrap rtl-table-headers"
                        records={records}
                        columns={[
                            {
                                accessor: 'id',
                                title: t('id'),
                                sortable: false,
                                render: ({ id }, index) => <strong className="text-info">#{initialRecords.length - ((page - 1) * pageSize + index)}</strong>,
                            },
                            {
                                accessor: 'created_at',
                                title: t('log_date'),
                                sortable: true,
                                render: (log) => (
                                    <div className="flex items-center gap-2">
                                        <div className="text-sm">{formatDate(log.car.created_at) || t('not_available')}</div>
                                        {log.deal && log.deal.id && (
                                            <Link
                                                href={`/sales-deals/preview/${log.deal.id}`}
                                                className="inline-flex items-center justify-center w-6 h-6 hover:text-info rounded transition-all duration-200"
                                                title={t('view_related_item')}
                                            >
                                                <IconEye className="w-4 h-4" />
                                            </Link>
                                        )}
                                    </div>
                                ),
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
                                accessor: 'provider_type',
                                title: t('provider_type'),
                                render: (log) => {
                                    if (!log.car) return <span className="text-gray-400">{t('not_available')}</span>;

                                    const car = log.car;
                                    const sourceType = car.source_type;

                                    if (!sourceType) {
                                        return <span className="text-gray-400">{t('not_available')}</span>;
                                    }

                                    // Display badge based on source type
                                    const isProvider = sourceType === 'provider';
                                    return <span className={`badge ${isProvider ? 'badge-outline-primary' : 'badge-outline-success'}`}>{isProvider ? t('provider') : t('customer')}</span>;
                                },
                            },
                            {
                                accessor: 'sale_info',
                                title: t('sale_date') + ' / ' + t('buyer_name') + ' / ' + t('sale_price'),
                                render: (log) => getSaleInfo(log),
                            },
                            {
                                accessor: 'deal_amount',
                                title: t('commission'),
                                render: (log) => {
                                    if (!log.deal || !log.deal.amount) {
                                        return <span className="text-gray-400">{t('not_available')}</span>;
                                    }
                                    return <div className="text-sm font-medium">₪{log.deal.amount.toLocaleString()}</div>;
                                },
                            },
                            {
                                accessor: 'deal_type',
                                title: t('deal_type'),
                                render: (log) => {
                                    if (!log.deal || !log.deal.deal_type) {
                                        return <span className="text-gray-400">{t('not_available')}</span>;
                                    }
                                    return <div className="text-sm font-medium">{getLocalizedDealType(log.deal.deal_type)}</div>;
                                },
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
                                accessor: 'deal_status',
                                title: t('deal_status'),
                                render: (log) => {
                                    if (!log.deal || !log.deal.status) {
                                        return <span className="text-gray-400">{t('not_available')}</span>;
                                    }
                                    return <span className={`badge ${getStatusBadgeClass(log.deal.status)}`}>{t(`status_${log.deal.status}`)}</span>;
                                },
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
                        noRecordsText={t('no_records')}
                    />
                </div>
            </div>
        </div>
    );
};

const ProtectedLogsPage = () => (
    <PermissionGuard permission="view_logs">
        <LogsPage />
    </PermissionGuard>
);

export default ProtectedLogsPage;
