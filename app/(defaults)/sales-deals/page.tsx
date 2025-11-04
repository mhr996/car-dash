'use client';
import IconEdit from '@/components/icon/icon-edit';
import IconEye from '@/components/icon/icon-eye';
import IconPlus from '@/components/icon/icon-plus';
import IconTrashLines from '@/components/icon/icon-trash-lines';
import { sortBy } from 'lodash';
import { DataTableSortStatus, DataTable } from 'mantine-datatable';
import Link from 'next/link';
import React, { useEffect, useState } from 'react';
import supabase from '@/lib/supabase';
import { Alert } from '@/components/elements/alerts/elements-alerts-default';
import ConfirmModal from '@/components/modals/confirm-modal';
import { getTranslation } from '@/i18n';
import { deleteFolder } from '@/utils/file-upload';
import { Deal } from '@/types';
import { logActivity } from '@/utils/activity-logger';
import DealFilters from '@/components/deal-filters/deal-filters';
import { handleDealDeleted, getCustomerIdFromDeal } from '@/utils/balance-manager';

type DealType = 'new_used_sale' | 'new_sale' | 'used_sale' | 'new_used_sale_tax_inclusive' | 'exchange' | 'intermediary' | 'financing_assistance_intermediary' | 'company_commission' | '';

type DealStatus = 'pending' | 'active' | 'completed' | 'cancelled' | '';

interface DealFilters {
    search: string;
    dealType: string;
    status: string;
    dateFrom: string;
    dateTo: string;
    sellerId: string;
    buyerId: string;
}

const DealsList = () => {
    const { t } = getTranslation();
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [page, setPage] = useState(1);
    const PAGE_SIZES = [10, 20, 30, 50, 100];
    const [pageSize, setPageSize] = useState(PAGE_SIZES[0]);
    const [initialRecords, setInitialRecords] = useState<Deal[]>([]);
    const [records, setRecords] = useState<Deal[]>([]);
    const [selectedRecords, setSelectedRecords] = useState<Deal[]>([]);

    const [search, setSearch] = useState('');
    const [sortStatus, setSortStatus] = useState<DataTableSortStatus>({
        columnAccessor: 'id',
        direction: 'desc',
    });
    const [activeFilters, setActiveFilters] = useState<DealFilters>({
        search: '',
        dealType: '',
        status: '',
        dateFrom: '',
        dateTo: '',
        sellerId: '',
        buyerId: '',
    }); // Modal and alert states

    // Always default sort by ID in descending order
    useEffect(() => {
        if (sortStatus.columnAccessor !== 'id') {
            setSortStatus({ columnAccessor: 'id', direction: 'desc' });
        }
    }, []);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
    const [dealToDelete, setDealToDelete] = useState<Deal | null>(null);
    const [alert, setAlert] = useState<{ message: string; type: 'success' | 'danger' } | null>(null);

    useEffect(() => {
        const fetchDeals = async () => {
            try {
                const { data, error } = await supabase
                    .from('deals')
                    .select(
                        `
                        *,
                        customers!deals_customer_id_fkey (
                            name,
                            id_number
                        ),
                        seller:customers!deals_seller_id_fkey (
                            name,
                            id_number
                        ),
                        buyer:customers!deals_buyer_id_fkey (
                            name,
                            id_number
                        ),
                        cars!deals_car_id_fkey (
                            id,
                            title,
                            brand,
                            car_number,
                            year
                        ),
                        bills (
                            id,
                            bill_type,
                            bill_direction,
                            visa_amount,
                            transfer_amount,
                            check_amount,
                            cash_amount,
                            bank_amount,
                            bill_amount,
                            bill_payments (
                                amount,
                                payment_type
                            )
                        )
                    `,
                    )
                    .order('created_at', { ascending: false });
                if (error) throw error;

                setItems(data as any[]);
            } catch (error) {
                console.error('Error fetching deals:', error);
                setAlert({ message: t('error_loading_data'), type: 'danger' });
            } finally {
                setLoading(false);
            }
        };
        fetchDeals();
    }, []);

    useEffect(() => {
        setPage(1);
    }, [pageSize]);

    useEffect(() => {
        const from = (page - 1) * pageSize;
        const to = from + pageSize;
        setRecords([...initialRecords.slice(from, to)]);
    }, [page, pageSize, initialRecords]);

    useEffect(() => {
        setInitialRecords(
            items.filter((item) => {
                // Search filter
                const matchesSearch = search.toLowerCase();
                const searchMatch =
                    !search ||
                    item.title?.toLowerCase().includes(matchesSearch) ||
                    item.description?.toLowerCase().includes(matchesSearch) ||
                    item.deal_type?.toLowerCase().includes(matchesSearch) ||
                    item.status?.toLowerCase().includes(matchesSearch) ||
                    item.customers?.name?.toLowerCase().includes(matchesSearch) ||
                    item.customers?.id_number?.toLowerCase().includes(matchesSearch) ||
                    item.seller?.name?.toLowerCase().includes(matchesSearch) ||
                    item.seller?.id_number?.toLowerCase().includes(matchesSearch) ||
                    item.buyer?.name?.toLowerCase().includes(matchesSearch) ||
                    item.buyer?.id_number?.toLowerCase().includes(matchesSearch);

                // Deal filters
                const dealTypeMatch = !activeFilters.dealType || item.deal_type === activeFilters.dealType;
                const statusMatch = !activeFilters.status || item.status === activeFilters.status;
                const sellerMatch = !activeFilters.sellerId || item.seller?.id === activeFilters.sellerId;
                const buyerMatch = !activeFilters.buyerId || item.buyer?.id === activeFilters.buyerId;

                // Date range
                const dateFrom = activeFilters.dateFrom ? new Date(activeFilters.dateFrom) : null;
                const dateTo = activeFilters.dateTo ? new Date(activeFilters.dateTo) : null;
                const itemDate = new Date(item.created_at);
                const dateMatch = (!dateFrom || itemDate >= dateFrom) && (!dateTo || itemDate <= dateTo);

                return searchMatch && dealTypeMatch && statusMatch && sellerMatch && buyerMatch && dateMatch;
            }),
        );
    }, [items, search, activeFilters]);

    useEffect(() => {
        const sorted = sortBy(initialRecords, sortStatus.columnAccessor);
        setRecords(sortStatus.direction === 'desc' ? sorted.reverse() : sorted);
        setPage(1);
    }, [sortStatus, initialRecords]);

    const deleteRow = (id: string | null = null) => {
        if (id) {
            const deal = items.find((d) => d.id === id);
            if (deal) {
                setDealToDelete(deal);
                setShowConfirmModal(true);
            }
        }
    };
    const confirmDeletion = async () => {
        if (!dealToDelete) return;
        try {
            // Log the activity before deletion (to preserve deal data)
            await logActivity({
                type: 'deal_deleted',
                deal: dealToDelete,
            });

            // Update customer balance before deleting the deal
            const customerId = getCustomerIdFromDeal(dealToDelete);
            if (customerId && dealToDelete.amount) {
                const balanceUpdateSuccess = await handleDealDeleted(dealToDelete.id, customerId, dealToDelete.amount, dealToDelete.title || 'Deal');

                if (!balanceUpdateSuccess) {
                    console.warn('Failed to update customer balance for deleted deal:', dealToDelete.id);
                    // Don't fail the deletion, just log the warning
                }
            }

            // Delete the deal from database
            const { error } = await supabase.from('deals').delete().eq('id', dealToDelete.id);
            if (error) throw error;

            // Delete associated files from storage
            try {
                await deleteFolder('deals', dealToDelete.id);
            } catch (fileError) {
                console.warn('Warning: Could not delete deal files:', fileError);
                // Don't fail the deletion if file cleanup fails
            }

            const updatedItems = items.filter((d) => d.id !== dealToDelete.id);
            setItems(updatedItems);
            setAlert({ message: t('deal_deleted_successfully'), type: 'success' });
        } catch (error) {
            console.error('Deletion error:', error);
            setAlert({ message: t('error_deleting_deal'), type: 'danger' });
        } finally {
            setShowConfirmModal(false);
            setDealToDelete(null);
        }
    };
    const handleBulkDelete = () => {
        if (selectedRecords.length === 0) return;
        setShowBulkDeleteModal(true);
    };
    const confirmBulkDeletion = async () => {
        const ids = selectedRecords.map((d) => d.id);
        try {
            // Update customer balances for each deal before deletion
            for (const deal of selectedRecords) {
                const customerId = getCustomerIdFromDeal(deal);
                if (customerId && deal.amount) {
                    const balanceUpdateSuccess = await handleDealDeleted(deal.id, customerId, deal.amount, deal.title || 'Deal');

                    if (!balanceUpdateSuccess) {
                        console.warn('Failed to update customer balance for deleted deal:', deal.id);
                        // Don't fail the deletion, just log the warning
                    }
                }
            }

            // Delete deals from database
            const { error } = await supabase.from('deals').delete().in('id', ids);
            if (error) throw error;

            // Delete associated files from storage for each deal
            for (const dealId of ids) {
                try {
                    await deleteFolder('deals', dealId);
                } catch (fileError) {
                    console.warn(`Warning: Could not delete files for deal ${dealId}:`, fileError);
                    // Don't fail the deletion if file cleanup fails
                }
            }

            setItems(items.filter((d) => !ids.includes(d.id)));
            setSelectedRecords([]);
            setAlert({ message: t('deals_deleted_successfully'), type: 'success' });
        } catch (error) {
            console.error('Error deleting deals:', error);
            setAlert({ message: t('error_deleting_deal'), type: 'danger' });
        } finally {
            setShowBulkDeleteModal(false);
        }
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('he-IL', {
            style: 'currency',
            currency: 'ILS',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(value);
    };

    /**
     * Calculates the deal balance following the business logic:
     * 1. Start with negative selling price (debt amount)
     * 2. For exchange deals, add customer car evaluation value as credit
     * 3. Add receipt payments to move towards 0
     * 4. Allow balance to exceed 0 (customer overpayment)
     *
     * Example: Deal selling price = 350k, Customer car value = 100k
     * - Initial balance for exchange: -350k + 100k = -250k
     * - After 200k payment: -50k
     * - After another 300k payment: +250k (overpayment)
     */
    const calculateDealBalance = (deal: any, bills: any[]): number => {
        // Start with negative selling price (or amount if selling_price is not available)
        const dealSellingPrice = deal?.selling_price || deal?.amount || 0;
        let totalBalance = -Math.abs(dealSellingPrice);

        // For exchange deals, add customer car evaluation value as credit
        if (deal?.deal_type === 'exchange' && deal?.customer_car_eval_value) {
            const carEvaluationAmount = parseFloat(deal.customer_car_eval_value) || 0;
            totalBalance += carEvaluationAmount; // Add as credit (positive impact)
        }

        if (!bills || bills.length === 0) return totalBalance;

        bills.forEach((bill) => {
            // Only count receipts that affect the deal balance (payments received towards the deal)
            if (bill.bill_type === 'receipt_only' || bill.bill_type === 'tax_invoice_receipt') {
                let billAmount = 0;

                // If bill has bill_payments (new structure), use those
                if (bill.bill_payments && bill.bill_payments.length > 0) {
                    billAmount = bill.bill_payments.reduce((sum: number, payment: any) => sum + (payment.amount || 0), 0);
                } else {
                    // Use legacy payment fields
                    const visaAmount = parseFloat(bill.visa_amount || '0') || 0;
                    const transferAmount = parseFloat(bill.transfer_amount || '0') || 0;
                    const checkAmount = parseFloat(bill.check_amount || '0') || 0;
                    const cashAmount = parseFloat(bill.cash_amount || '0') || 0;
                    const bankAmount = parseFloat(bill.bank_amount || '0') || 0;

                    billAmount = visaAmount + transferAmount + checkAmount + cashAmount + bankAmount;
                }

                // Receipt payments always increase the balance (moving towards 0 and potentially beyond)
                // For tax_invoice_receipt bills, the receipt portion should always be treated as payment
                // regardless of bill direction (bill direction is for tax/accounting purposes)
                if (bill.bill_type === 'tax_invoice_receipt') {
                    // Tax invoice with receipt: receipt portion is always a payment towards the deal
                    totalBalance += Math.abs(billAmount);
                } else {
                    // For receipt_only bills, apply bill direction
                    if (bill.bill_direction === 'negative') {
                        totalBalance -= Math.abs(billAmount);
                    } else {
                        totalBalance += Math.abs(billAmount);
                    }
                }
            }
        });

        return totalBalance;
    };

    const getDealTypeBadgeClass = (type: string) => {
        switch (type) {
            case 'new_used_sale':
            case 'new_sale':
            case 'used_sale':
                return 'badge-outline-success';
            case 'exchange':
                return 'badge-outline-primary';
            case 'intermediary':
                return 'badge-outline-warning';
            case 'company_commission':
                return 'badge-outline-info';
            default:
                return 'badge-outline-secondary';
        }
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

    return (
        <div className="panel border-white-light px-0 dark:border-[#1b2e4b]">
            {alert && (
                <div className="fixed top-4 right-4 z-50 min-w-80 max-w-md">
                    <Alert type={alert.type} title={alert.type === 'success' ? t('success') : t('error')} message={alert.message} onClose={() => setAlert(null)} />
                </div>
            )}
            <div className="invoice-table">
                <div className="mb-4.5 flex flex-wrap items-start justify-between gap-4 px-5">
                    <div className="flex items-center gap-2 ml-auto">
                        <button type="button" className="btn btn-danger gap-2" onClick={handleBulkDelete} disabled={selectedRecords.length === 0}>
                            <IconTrashLines />
                            {t('delete')}
                        </button>
                        <Link href="/sales-deals/add" className="btn btn-primary gap-2">
                            <IconPlus />
                            {t('add_new')}
                        </Link>
                    </div>
                    <div className="flex-grow">
                        <DealFilters
                            onFilterChange={(newFilters) => {
                                setActiveFilters(newFilters);
                                // Also update the search state to keep it in sync
                                setSearch(newFilters.search);
                            }}
                            onClearFilters={() => {
                                setActiveFilters({
                                    search: '',
                                    dealType: '',
                                    status: '',
                                    dateFrom: '',
                                    dateTo: '',
                                    sellerId: '',
                                    buyerId: '',
                                });
                                setSearch('');
                            }}
                        />
                    </div>
                </div>

                <div className="datatables pagination-padding relative">
                    <DataTable
                        className={`${loading ? 'filter blur-sm pointer-events-none' : 'table-hover whitespace-nowrap'} rtl-table-headers`}
                        records={records}
                        columns={[
                            {
                                accessor: 'id',
                                title: t('id'),
                                sortable: true,
                                render: ({ id }) => (
                                    <div className="flex items-center gap-2">
                                        <strong className="text-info">#{id}</strong>
                                        <Link href={`/sales-deals/preview/${id}`} className="flex hover:text-info" title={t('view')}>
                                            <IconEye className="h-4.5 w-4.5" />
                                        </Link>
                                    </div>
                                ),
                            },
                            {
                                accessor: 'created_at',
                                title: t('deal_created_date'),
                                sortable: true,
                                render: ({ created_at }) => (
                                    <span>
                                        {new Date(created_at).toLocaleDateString('en-GB', {
                                            year: 'numeric',
                                            month: '2-digit',
                                            day: '2-digit',
                                        })}
                                    </span>
                                ),
                            },
                            {
                                accessor: 'customer_name',
                                title: t('customer'),
                                sortable: true,
                                render: ({ customers, seller, buyer, deal_type, title }) => (
                                    <div>
                                        {deal_type === 'intermediary' ? (
                                            <div>
                                                <div className="font-semibold text-sm">
                                                    <span className="text-blue-600">{t('seller')}: </span>
                                                    {seller?.name || t('no_seller')}
                                                </div>
                                                <div className="font-semibold text-sm mt-1">
                                                    <span className="text-green-600">{t('buyer')}: </span>
                                                    {buyer?.name || t('no_buyer')}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="font-semibold">{customers?.name || t('no_customer')}</div>
                                        )}
                                        <div className="text-xs text-gray-500 mt-1">{title}</div>
                                    </div>
                                ),
                            },
                            {
                                accessor: 'customer_identity',
                                title: t('id_number'),
                                sortable: true,
                                render: ({ customers, seller, buyer, deal_type }) => (
                                    <div className="text-sm">
                                        {deal_type === 'intermediary' ? (
                                            <div>
                                                <div className="text-blue-600">{seller?.id_number || '-'}</div>
                                                <div className="text-green-600 mt-1">{buyer?.id_number || '-'}</div>
                                            </div>
                                        ) : (
                                            customers?.id_number || '-'
                                        )}
                                    </div>
                                ),
                            },
                            {
                                accessor: 'car_info',
                                title: t('car_info'),
                                sortable: true,
                                render: (deal: any) => (
                                    <div className="text-sm">
                                        {deal.cars ? (
                                            <div>
                                                <div className="font-semibold">
                                                    {deal.cars.brand} {deal.cars.title}
                                                </div>
                                                <div className="text-xs text-gray-500 mt-1">
                                                    {deal.cars.car_number && <span className="text-blue-600">{deal.cars.car_number}</span>}
                                                    {deal.cars.year && <span className="ml-2">{deal.cars.year}</span>}
                                                </div>
                                            </div>
                                        ) : (
                                            <span className="text-gray-400">{t('no_car_assigned')}</span>
                                        )}
                                    </div>
                                ),
                            },
                            {
                                accessor: 'deal_type',
                                title: t('deal_type'),
                                sortable: true,
                                render: ({ deal_type }) => <span className={`badge max-w-20 ${getDealTypeBadgeClass(deal_type)}`}>{t(`deal_type_${deal_type}`)}</span>,
                            },
                            {
                                accessor: 'amount',
                                title: t('amount'),
                                sortable: true,
                                render: ({ selling_price }) => <span className="text-success">{formatCurrency(selling_price)}</span>,
                            },
                            {
                                accessor: 'deal_balance',
                                title: t('deal_balance'),
                                sortable: true,
                                render: (deal) => {
                                    const balance = calculateDealBalance(deal, deal.bills || []);
                                    return <span className={balance >= 0 ? 'text-info' : 'text-danger'}>{formatCurrency(balance)}</span>;
                                },
                            },
                            {
                                accessor: 'status',
                                title: t('status'),
                                sortable: true,
                                render: ({ status }) => <span className={`badge ${getStatusBadgeClass(status)}`}>{t(`status_${status}`)}</span>,
                            },
                            {
                                accessor: 'bill_status',
                                title: t('bill_status'),
                                sortable: true,
                                render: ({ bills }) => {
                                    const hasBills = bills && bills.length > 0;
                                    return <span className={`badge ${hasBills ? 'badge-outline-success' : 'badge-outline-warning'}`}>{hasBills ? t('bill_created') : t('no_bill_created')}</span>;
                                },
                            },

                            {
                                accessor: 'action',
                                title: t('actions'),
                                sortable: false,
                                textAlignment: 'center',
                                render: ({ id, status }) => (
                                    <div className="mx-auto flex w-max items-center gap-4">
                                        <Link
                                            href={`/sales-deals/edit/${id}`}
                                            className={`flex hover:text-info ${status === 'cancelled' ? 'opacity-50 pointer-events-none' : ''}`}
                                            title={status === 'cancelled' ? t('deal_cancelled_no_edit') : t('edit')}
                                        >
                                            <IconEdit className="h-4.5 w-4.5" />
                                        </Link>
                                        <button
                                            type="button"
                                            className={`flex hover:text-danger ${status === 'completed' || status === 'cancelled' ? 'opacity-50 pointer-events-none' : ''}`}
                                            onClick={() => status !== 'completed' && status !== 'cancelled' && deleteRow(id)}
                                            title={status === 'completed' ? t('deal_completed_no_delete') : status === 'cancelled' ? t('deal_cancelled_no_delete') : t('delete')}
                                        >
                                            <IconTrashLines />
                                        </button>
                                    </div>
                                ),
                            },
                        ]}
                        highlightOnHover
                        totalRecords={initialRecords.length}
                        recordsPerPage={pageSize}
                        page={page}
                        onPageChange={(p) => setPage(p)}
                        recordsPerPageOptions={PAGE_SIZES}
                        onRecordsPerPageChange={setPageSize}
                        sortStatus={sortStatus}
                        onSortStatusChange={setSortStatus}
                        selectedRecords={selectedRecords}
                        onSelectedRecordsChange={setSelectedRecords}
                        paginationText={({ from, to, totalRecords }) => `${t('showing')} ${from} ${t('to')} ${to} ${t('of')} ${totalRecords} ${t('entries')}`}
                        minHeight={300}
                    />

                    {loading && <div className="absolute inset-0 z-10 flex items-center justify-center bg-white dark:bg-black-dark-light bg-opacity-60 backdrop-blur-sm" />}
                </div>
            </div>{' '}
            <ConfirmModal
                isOpen={showConfirmModal}
                title={t('confirm_deletion')}
                message={t('confirm_delete_deal')}
                onCancel={() => {
                    setShowConfirmModal(false);
                    setDealToDelete(null);
                }}
                onConfirm={confirmDeletion}
                confirmLabel={t('delete')}
                cancelLabel={t('cancel')}
                size="sm"
            />
            {/* Bulk Delete Confirmation Modal */}
            <ConfirmModal
                isOpen={showBulkDeleteModal}
                title={t('confirm_bulk_deletion')}
                message={`${t('confirm_delete_selected_deals')}`}
                onCancel={() => setShowBulkDeleteModal(false)}
                onConfirm={confirmBulkDeletion}
                confirmLabel={t('delete')}
                cancelLabel={t('cancel')}
                size="sm"
            />
        </div>
    );
};

export default DealsList;
