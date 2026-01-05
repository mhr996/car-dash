'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import supabase from '@/lib/supabase';
import { getTranslation } from '@/i18n';
import Cookies from 'universal-cookie';
import { sortBy } from 'lodash';
import { DataTable, DataTableSortStatus, DataTableColumn } from 'mantine-datatable';
import IconPlus from '@/components/icon/icon-plus';
import IconEye from '@/components/icon/icon-eye';
import IconPdf from '@/components/icon/icon-pdf';
import IconEdit from '@/components/icon/icon-edit';
import { Alert } from '@/components/elements/alerts/elements-alerts-default';
import { generateBillPDF, BillData } from '@/utils/pdf-generator';
import { BillWithPayments } from '@/types/payment';
import BillFilters from '@/components/bill-filters/bill-filters';
import { PermissionGuard } from '@/components/auth/permission-guard';

interface BillFiltersInterface {
    search: string;
    billType: string;
    paymentType: string;
    customerName: string;
    amountFrom: string;
    amountTo: string;
    dateFrom: string;
    dateTo: string;
}

interface Bill extends BillWithPayments {
    amount: number;
    total_amount: number;
    bill_direction?: string;
    // Legacy payment fields for backward compatibility
    payment_type?: string;
    visa_amount?: number;
    bank_amount?: number;
    transfer_amount?: number;
    check_amount?: number;
    cash_amount?: number;
    bill_amount?: number;
}

// Helper function to convert Bill to BillData format
const convertBillToBillData = (bill: Bill): BillData => {
    return {
        id: bill.id,
        bill_type: bill.bill_type,
        customer_name: bill.customer_name,
        customer_phone: bill.phone,
        created_at: bill.date,

        // Map the bill fields to BillData format
        bill_amount: bill.bill_amount || bill.total,
        bill_description: bill.car_details || '',

        // Tax invoice fields
        total: bill.total,
        tax_amount: bill.tax_amount,
        total_with_tax: bill.total_with_tax,
        commission: bill.commission,
        car_details: bill.car_details,

        // Payment fields
        payment_type: bill.payment_type,
        cash_amount: bill.cash_amount,
        visa_amount: bill.visa_amount,
        bank_amount: bill.bank_amount || bill.transfer_amount,
        check_amount: bill.check_amount,

        // Deal information (if available)
        deal: bill.deal
            ? {
                  id: bill.deal_id,
                  deal_title: bill.deal?.title,
                  deal_type: bill.deal?.deal_type,
                  loss_amount: bill.deal?.loss_amount,
                  car: bill.deal?.car
                      ? {
                            buy_price: bill.deal.car.buy_price,
                            sale_price: bill.deal.car.sale_price,
                            make: bill.deal.car.brand,
                            model: bill.deal.car.title,
                            year: bill.deal.car.year,
                            license_plate: bill.deal.car.car_number,
                        }
                      : undefined,
                  customer: bill.deal?.customer
                      ? {
                            name: bill.deal.customer.name,
                            id_number: bill.deal.customer.id_number,
                        }
                      : undefined,
                  seller: bill.deal?.seller
                      ? {
                            name: bill.deal.seller.name,
                            id_number: bill.deal.seller.id_number,
                        }
                      : undefined,
                  buyer: bill.deal?.buyer
                      ? {
                            name: bill.deal.buyer.name,
                            id_number: bill.deal.buyer.id_number,
                        }
                      : undefined,
              }
            : undefined,
    };
};

const Bills = () => {
    const { t } = getTranslation();
    const [items, setItems] = useState<Bill[]>([]);
    const [loading, setLoading] = useState(true);

    const [page, setPage] = useState(1);
    const PAGE_SIZES = [10, 20, 30, 50, 100];
    const [pageSize, setPageSize] = useState(PAGE_SIZES[0]);
    const [initialRecords, setInitialRecords] = useState<Bill[]>([]);
    const [records, setRecords] = useState<Bill[]>([]);
    const [search, setSearch] = useState('');
    const [sortStatus, setSortStatus] = useState<DataTableSortStatus>({ columnAccessor: 'id', direction: 'desc' });
    const [selectedRecords, setSelectedRecords] = useState<Bill[]>([]);
    const [downloadingPDF, setDownloadingPDF] = useState<string | null>(null);
    const [alertState, setAlertState] = useState<{ message: string; type: 'success' | 'danger' } | null>(null);

    // Active filters state
    const [activeFilters, setActiveFilters] = useState<BillFiltersInterface>({
        search: '',
        billType: '',
        paymentType: '',
        customerName: '',
        amountFrom: '',
        amountTo: '',
        dateFrom: '',
        dateTo: '',
    });

    useEffect(() => {
        fetchBills();
    }, []);

    const fetchBills = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('bills')
                .select(
                    `
                    *, 
                    deal:deals(
                        title, 
                        deal_type,
                        amount,
                        loss_amount,
                        customer:customers!deals_customer_id_fkey(id, name, id_number),
                        seller:customers!deals_seller_id_fkey(id, name, id_number),
                        buyer:customers!deals_buyer_id_fkey(id, name, id_number),
                        car:cars!deals_car_id_fkey(id, title, brand, year, buy_price, sale_price)
                    ),
                    payments:bill_payments(*)
                `,
                )
                .order('created_at', { ascending: false });
            if (error) throw error;
            setItems(data || []);
        } catch (error) {
            console.error('Error fetching bills:', error);
            setAlertState({ message: t('error_loading_data'), type: 'danger' });
        } finally {
            setLoading(false);
        }
    };

    // Filter by search term and filters
    useEffect(() => {
        setInitialRecords(
            items.filter((bill) => {
                const searchLower = activeFilters.search.toLowerCase();

                // Basic search filter
                const matchesSearch =
                    !activeFilters.search ||
                    bill.customer_name.toLowerCase().includes(searchLower) ||
                    (bill.deal?.title && bill.deal.title.toLowerCase().includes(searchLower)) ||
                    bill.bill_type.toLowerCase().includes(searchLower) ||
                    (bill.payment_type && bill.payment_type.toLowerCase().includes(searchLower)) ||
                    (bill.payments && bill.payments.some((payment) => payment.payment_type.toLowerCase().includes(searchLower))) ||
                    (bill.deal?.customer?.id_number && bill.deal.customer.id_number.toLowerCase().includes(searchLower)) ||
                    (bill.deal?.seller?.name && bill.deal.seller.name.toLowerCase().includes(searchLower)) ||
                    (bill.deal?.seller?.id_number && bill.deal.seller.id_number.toLowerCase().includes(searchLower)) ||
                    (bill.deal?.buyer?.name && bill.deal.buyer.name.toLowerCase().includes(searchLower)) ||
                    (bill.deal?.buyer?.id_number && bill.deal.buyer.id_number.toLowerCase().includes(searchLower));

                // Bill type filter
                const matchesBillType = !activeFilters.billType || bill.bill_type === activeFilters.billType;

                // Payment type filter
                const matchesPaymentType =
                    !activeFilters.paymentType ||
                    bill.payment_type === activeFilters.paymentType ||
                    (bill.payments && bill.payments.some((payment) => payment.payment_type === activeFilters.paymentType));

                // Customer name filter
                const matchesCustomerName = !activeFilters.customerName || bill.customer_name.toLowerCase().includes(activeFilters.customerName.toLowerCase());

                // Amount range filter
                const billAmount = getBillAmount(bill);
                const matchesAmountFrom = !activeFilters.amountFrom || billAmount >= parseFloat(activeFilters.amountFrom);
                const matchesAmountTo = !activeFilters.amountTo || billAmount <= parseFloat(activeFilters.amountTo);

                // Date range filter
                const billDate = new Date(bill.created_at || bill.date);
                const matchesDateFrom = !activeFilters.dateFrom || billDate >= new Date(activeFilters.dateFrom);
                const matchesDateTo = !activeFilters.dateTo || billDate <= new Date(activeFilters.dateTo + 'T23:59:59');

                return matchesSearch && matchesBillType && matchesPaymentType && matchesCustomerName && matchesAmountFrom && matchesAmountTo && matchesDateFrom && matchesDateTo;
            }),
        );
    }, [items, activeFilters]);

    // Reset page on pageSize change
    useEffect(() => {
        setPage(1);
    }, [pageSize]);

    // Pagination
    useEffect(() => {
        const from = (page - 1) * pageSize;
        const to = from + pageSize;
        setRecords(initialRecords.slice(from, to));
    }, [page, pageSize, initialRecords]);

    // Sorting
    useEffect(() => {
        const sorted = sortBy(initialRecords, sortStatus.columnAccessor as keyof Bill);
        setRecords(sortStatus.direction === 'desc' ? sorted.reverse() : sorted);
        setPage(1);
    }, [sortStatus, initialRecords]);

    const getBillTypeLabel = (type: string) => {
        switch (type) {
            case 'tax_invoice':
                return t('tax_invoice_only');
            case 'receipt_only':
                return t('receipt_only');
            case 'tax_invoice_receipt':
                return t('tax_invoice_and_receipt');
            case 'general':
                return t('general_bill');
            default:
                return type;
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'paid':
                return 'badge-outline-success';
            case 'pending':
                return 'badge-outline-warning';
            case 'overdue':
                return 'badge-outline-danger';
            default:
                return 'badge-outline-info';
        }
    };

    const getPaymentTypeLabel = (bill: Bill) => {
        // For tax invoices without payment, return '-'
        if (bill.bill_type === 'tax_invoice') {
            return t('not_applicable');
        }

        // Check if using new multiple payments structure
        if (bill.payments && bill.payments.length > 0) {
            if (bill.payments.length === 1) {
                const payment = bill.payments[0];
                switch (payment.payment_type) {
                    case 'visa':
                        return t('visa');
                    case 'cash':
                        return t('cash');
                    case 'bank_transfer':
                        return t('bank_transfer');
                    case 'check':
                        return t('check');
                    default:
                        return payment.payment_type;
                }
            } else {
                return t('multiple_payments');
            }
        }

        // Fallback to legacy payment_type
        if (!bill.payment_type) {
            return t('not_applicable');
        }

        switch (bill.payment_type) {
            case 'visa':
                return t('visa');
            case 'cash':
                return t('cash');
            case 'bank_transfer':
                return t('bank_transfer');
            case 'transfer':
                return t('transfer');
            case 'check':
                return t('check');
            default:
                return bill.payment_type;
        }
    };

    const getPaymentAmount = (bill: Bill) => {
        // For tax invoices without payment, return '-'
        if (bill.bill_type === 'tax_invoice') {
            return t('not_applicable');
        }

        // Check if using new multiple payments structure
        if (bill.payments && bill.payments.length > 0) {
            const totalAmount = bill.payments.reduce((sum, payment) => sum + (payment.amount || 0), 0);
            if (bill.payments.length === 1) {
                return `₪${totalAmount.toFixed(0)}`;
            } else {
                return `₪${totalAmount.toFixed(0)} (${bill.payments.length} ${t('payments')})`;
            }
        }

        // Fallback to legacy payment amounts
        if (!bill.payment_type || (!bill.visa_amount && !bill.cash_amount && !bill.bank_amount && !bill.transfer_amount && !bill.check_amount)) {
            return t('no_payment_yet');
        }

        let amount = 0;
        let paymentType = '';
        switch (bill.payment_type) {
            case 'visa':
                amount = bill.visa_amount || 0;
                paymentType = t('visa');
                break;
            case 'cash':
                amount = bill.cash_amount || 0;
                paymentType = t('cash');
                break;
            case 'bank_transfer':
                amount = bill.bank_amount || 0;
                paymentType = t('bank_transfer');
                break;
            case 'transfer':
                amount = bill.transfer_amount || 0;
                paymentType = t('transfer');
                break;
            case 'check':
                amount = bill.check_amount || 0;
                paymentType = t('check');
                break;
            default:
                return t('no_payment_yet');
        }

        return amount > 0 ? `₪${amount.toFixed(0)} (${paymentType})` : t('no_payment_yet');
    };

    // Helper function to get bill amount based on bill type and payment method
    const getBillAmount = (bill: Bill) => {
        if (bill.bill_type === 'general') {
            return parseFloat(String(bill.bill_amount || '0'));
        }

        if (bill.bill_type === 'tax_invoice') {
            return parseFloat(String(bill.total_with_tax || '0'));
        }

        // For receipt types, return the payment amount
        if (bill.bill_type === 'receipt_only' || bill.bill_type === 'tax_invoice_receipt') {
            // Check if using new multiple payments structure
            if (bill.payments && bill.payments.length > 0) {
                return bill.payments.reduce((sum, payment) => sum + (payment.amount || 0), 0);
            }

            // Fallback to legacy payment amounts
            switch (bill.payment_type?.toLowerCase()) {
                case 'bank_transfer':
                    return parseFloat(String(bill.bank_amount || bill.transfer_amount || '0'));
                case 'check':
                    return parseFloat(String(bill.check_amount || '0'));
                case 'visa':
                    return parseFloat(String(bill.visa_amount || '0'));
                case 'cash':
                    return parseFloat(String(bill.cash_amount || '0'));
                default:
                    return parseFloat(String(bill.total_with_tax || '0'));
            }
        }

        return 0;
    };

    const handleDownloadPDF = async (bill: Bill) => {
        setDownloadingPDF(bill.id);
        try {
            // Check if bill has Tranzila retrieval key
            const tranzilaRetrievalKey = (bill as any).tranzila_retrieval_key;

            if (!tranzilaRetrievalKey) {
                setAlertState({ message: t('bill_not_created_with_tranzila'), type: 'danger' });
                return;
            }

            // Open Tranzila PDF in new tab via our proxy API
            const proxyUrl = `/api/tranzila/download-pdf?key=${encodeURIComponent(tranzilaRetrievalKey)}`;
            window.open(proxyUrl, '_blank');
        } catch (error) {
            console.error('Error downloading PDF:', error);
            setAlertState({ message: t('error_downloading_pdf'), type: 'danger' });
        } finally {
            setDownloadingPDF(null);
        }
    };

    const columns: DataTableColumn<Bill>[] = [
        {
            accessor: 'id',
            title: t('id'),
            sortable: true,
            render: ({ id }) => (
                <div className="flex items-center gap-2">
                    <strong className="text-info">#{id}</strong>
                    <Link href={`/bills/preview/${id}`} className="flex hover:text-info" title={t('view')}>
                        <IconEye className="h-4 w-4" />
                    </Link>
                </div>
            ),
        },
        {
            accessor: 'bill_number',
            title: t('bill_number'),
            sortable: true,
            render: (bill: Bill) => (
                <div className="text-sm font-mono">
                    <span className="font-medium">{(bill as any).tranzila_document_number || String(bill.id).padStart(6, '0')}</span>
                </div>
            ),
        },
        {
            accessor: 'customer_name',
            title: t('customer_name'),
            sortable: true,
            render: (bill: Bill) => (
                <div className="flex flex-col">
                    <span className="font-medium">{bill.customer_name}</span>
                    {(() => {
                        // Show ID number based on deal type
                        let idNumber = null;
                        if (bill.deal?.deal_type === 'intermediary') {
                            // For intermediary deals, prefer seller, then buyer
                            idNumber = bill.deal?.seller?.id_number || bill.deal?.buyer?.id_number;
                        } else {
                            // For regular deals, use customer
                            idNumber = bill.deal?.customer?.id_number;
                        }
                        return idNumber ? <span className="text-xs text-gray-500">{idNumber}</span> : null;
                    })()}
                </div>
            ),
        },
        {
            accessor: 'deal',
            title: t('deal'),
            sortable: true,
            render: (bill: Bill) => (
                <div className="flex flex-col">
                    <span className="font-medium">{bill.deal?.title}</span>
                    <span className="text-xs text-gray-500">{t(`deal_type_${bill.deal?.deal_type}`)}</span>
                </div>
            ),
        },
        {
            accessor: 'bill_type',
            title: t('bill_type'),
            sortable: true,
            render: (bill: Bill) => <span className="badge badge-outline-info">{getBillTypeLabel(bill.bill_type)}</span>,
        },
        {
            accessor: 'total_with_tax',
            title: t('total_amount'),
            sortable: true,
            render: (bill: Bill) => <span className={`font-bold ${bill.bill_direction === 'negative' ? 'text-red-500' : ''}`}>₪{getBillAmount(bill).toFixed(0)}</span>,
        },
        {
            accessor: 'payment_type',
            title: t('payment_method'),
            sortable: true,
            render: (bill: Bill) => <span className="badge badge-outline-secondary">{getPaymentTypeLabel(bill)}</span>,
        },
        {
            accessor: 'payment_amount',
            title: t('payment_amount'),
            sortable: true,
            render: (bill: Bill) => (
                <span className={`font-medium ${bill.bill_direction === 'negative' ? 'text-red-500' : ''}`}>
                    {bill.bill_type === 'general' ? '₪' + getBillAmount(bill).toFixed(0) : getPaymentAmount(bill)}
                </span>
            ),
        },
        {
            accessor: 'created_at',
            title: t('created_at'),
            sortable: true,
            render: (bill: Bill) => (
                <span>
                    {new Date(bill.created_at).toLocaleDateString('en-GB', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                    })}
                </span>
            ),
        },
        {
            accessor: 'actions',
            title: t('actions'),
            sortable: false,
            textAlignment: 'center',
            render: (bill: Bill) => (
                <div className="mx-auto flex w-max items-center gap-4">
                    {/* Edit payments button for receipts */}
                    {(bill.bill_type === 'receipt_only' || bill.bill_type === 'tax_invoice_receipt') && (
                        <Link href={`/bills/edit/${bill.id}`} className="flex hover:text-primary" title={t('edit_payments')}>
                            <IconEdit className="h-4.5 w-4.5" />
                        </Link>
                    )}
                    <button type="button" className="flex hover:text-success" onClick={() => handleDownloadPDF(bill)} title={t('download_pdf')} disabled={downloadingPDF === bill.id}>
                        {downloadingPDF === bill.id ? <div className="animate-spin rounded-full h-4.5 w-4.5 border-b-2 border-success"></div> : <IconPdf className="h-4.5 w-4.5" />}
                    </button>
                </div>
            ),
        },
    ];

    return (
        <div className="panel border-white-light px-0 dark:border-[#1b2e4b]">
            {alertState && (
                <div className="fixed top-4 right-4 z-50 min-w-80 max-w-md">
                    <Alert type={alertState.type} title={alertState.type === 'success' ? t('success') : t('error')} message={alertState.message} onClose={() => setAlertState(null)} />
                </div>
            )}
            <div className="invoice-table">
                <div className="mb-4.5 flex flex-col gap-5 px-5 md:flex-row md:items-center">
                    <div className="flex items-center gap-2">
                        <Link href="/bills/add" className="btn btn-primary gap-2">
                            <IconPlus />
                            {t('add_new_bill')}
                        </Link>
                    </div>
                </div>

                <div className="px-5">
                    <BillFilters
                        onFilterChange={(newFilters) => {
                            setActiveFilters(newFilters);
                            // Also update the search state to keep it in sync
                            setSearch(newFilters.search);
                        }}
                        onClearFilters={() => {
                            setActiveFilters({
                                search: '',
                                billType: '',
                                paymentType: '',
                                customerName: '',
                                amountFrom: '',
                                amountTo: '',
                                dateFrom: '',
                                dateTo: '',
                            });
                            setSearch('');
                        }}
                    />
                </div>
                <div className="datatables pagination-padding relative">
                    <DataTable
                        records={records}
                        columns={columns}
                        totalRecords={initialRecords.length}
                        page={page}
                        onPageChange={setPage}
                        recordsPerPage={pageSize}
                        recordsPerPageOptions={PAGE_SIZES}
                        onRecordsPerPageChange={setPageSize}
                        sortStatus={sortStatus}
                        onSortStatusChange={setSortStatus}
                        className={`${loading ? 'filter blur-sm pointer-events-none' : 'table-hover whitespace-nowrap'} rtl-table-headers`}
                        highlightOnHover
                        minHeight={300}
                        noRecordsText={t('no_records')}
                    />
                </div>
            </div>
        </div>
    );
};

const ProtectedBillsPage = () => (
    <PermissionGuard permission="view_bills">
        <Bills />
    </PermissionGuard>
);

export default ProtectedBillsPage;
