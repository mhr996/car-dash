'use client';
import IconEdit from '@/components/icon/icon-edit';
import IconEye from '@/components/icon/icon-eye';
import IconPlus from '@/components/icon/icon-plus';
import IconTrashLines from '@/components/icon/icon-trash-lines';
import { sortBy } from 'lodash';
import { DataTableSortStatus, DataTable } from 'mantine-datatable';
import Link from 'next/link';
import React, { useEffect, useState, useRef } from 'react';
import supabase from '@/lib/supabase';
import { Alert } from '@/components/elements/alerts/elements-alerts-default';
import ConfirmModal from '@/components/modals/confirm-modal';
import { getTranslation } from '@/i18n';
import { deleteFolder } from '@/utils/file-upload';
import { Deal } from '@/types';
import { logActivity } from '@/utils/activity-logger';
import DealFilters from '@/components/deal-filters/deal-filters';
import { handleDealDeleted, getCustomerIdFromDeal } from '@/utils/balance-manager';
import ViewToggle from '@/components/view-toggle/view-toggle';
import { ContractPDFGenerator } from '@/utils/contract-pdf-generator-new';
import { CarContract } from '@/types/contract';
import { getCompanyInfo, CompanyInfo } from '@/lib/company-info';
import IconDocument from '@/components/icon/icon-document';
import IconPdf from '@/components/icon/icon-pdf';
import IconCaretDown from '@/components/icon/icon-caret-down';

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
    const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

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

    // Load view preference from localStorage
    useEffect(() => {
        const savedView = localStorage.getItem('salesDealsViewMode');
        if (savedView === 'grid' || savedView === 'list') {
            setViewMode(savedView);
        }
    }, []);

    // Save view preference when changed
    const handleViewChange = (view: 'list' | 'grid') => {
        setViewMode(view);
        localStorage.setItem('salesDealsViewMode', view);
    };

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
    const [generatingContractPDF, setGeneratingContractPDF] = useState<string | null>(null);
    const [downloadingBillPDF, setDownloadingBillPDF] = useState<string | null>(null);
    const [openBillDropdown, setOpenBillDropdown] = useState<string | null>(null);
    const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

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

    // Fetch company info on mount
    useEffect(() => {
        const fetchCompanyInfo = async () => {
            try {
                const info = await getCompanyInfo();
                setCompanyInfo(info);
            } catch (error) {
                console.error('Error fetching company info:', error);
            }
        };
        fetchCompanyInfo();
    }, []);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setOpenBillDropdown(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Handle contract PDF generation
    const handleGenerateContractPDF = async (deal: any) => {
        setGeneratingContractPDF(deal.id);
        try {
            // Get language from cookie
            const getCookie = (name: string) => {
                const value = `; ${document.cookie}`;
                const parts = value.split(`; ${name}=`);
                if (parts.length === 2) {
                    const part = parts.pop();
                    if (part) {
                        return part.split(';').shift();
                    }
                }
                return null;
            };

            const lang = getCookie('i18nextLng') || 'he';
            const normalizedLang = lang.toLowerCase().split('-')[0] as 'en' | 'ar' | 'he';

            // Create contract data
            const contractData: CarContract = {
                dealId: deal.id,
                dealType: deal.deal_type || 'normal',
                contractDate: new Date(deal.created_at).toLocaleDateString('he-IL'),

                // Seller info
                sellerName: companyInfo?.name || '',
                sellerIdNumber: companyInfo?.registration_number || '',
                sellerAddress: companyInfo?.address || '',
                sellerPhone: companyInfo?.phone || '',
                sellerEmail: companyInfo?.email || '',

                // Buyer info
                buyerName: deal.customers?.name || '',
                buyerIdNumber: deal.customers?.id_number || '',
                buyerAddress: deal.customers?.address || '',
                buyerPhone: deal.customers?.phone || '',

                // Car info
                carMake: deal.cars?.brand || '',
                carModel: deal.cars?.title || '',
                carYear: deal.cars?.year || '',
                carPlateNumber: deal.cars?.car_number || '',
                carColor: deal.cars?.color || '',

                // Payment info
                totalAmount: deal.selling_price || deal.amount || 0,
                paymentMethod: 'Various',

                companySignatureUrl: companyInfo?.signature_url || null,
                customerSignatureUrl: null,
            };

            const filename = `contract-${deal.id}-${new Date().toISOString().split('T')[0]}.pdf`;

            await ContractPDFGenerator.generateFromContract(contractData, {
                filename,
                language: normalizedLang,
                format: 'A4',
                orientation: 'portrait',
            });

            setAlert({ message: t('contract_generated_successfully'), type: 'success' });
        } catch (error) {
            console.error('Error generating contract PDF:', error);
            setAlert({ message: t('error_generating_pdf'), type: 'danger' });
        } finally {
            setGeneratingContractPDF(null);
        }
    };

    // Handle bill PDF download
    const handleDownloadBillPDF = async (bill: any) => {
        setDownloadingBillPDF(bill.id);
        setOpenBillDropdown(null);
        try {
            const tranzilaRetrievalKey = bill.tranzila_retrieval_key;

            if (!tranzilaRetrievalKey) {
                setAlert({ message: t('bill_not_created_with_tranzila'), type: 'danger' });
                return;
            }

            // Open Tranzila PDF in new tab via proxy API
            const proxyUrl = `/api/tranzila/download-pdf?key=${encodeURIComponent(tranzilaRetrievalKey)}`;
            window.open(proxyUrl, '_blank');
        } catch (error) {
            console.error('Error downloading PDF:', error);
            setAlert({ message: t('error_downloading_pdf'), type: 'danger' });
        } finally {
            setDownloadingBillPDF(null);
        }
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
                    <div className="flex items-center gap-2">
                        <ViewToggle view={viewMode} onViewChange={handleViewChange} />
                    </div>
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

                {viewMode === 'list' ? (
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
                                    render: (deal: any) => {
                                        const { id, status, bills } = deal;
                                        const hasBills = bills && bills.length > 0;

                                        return (
                                            <div className="mx-auto flex w-max items-center gap-2">
                                                {/* Generate Contract PDF Button */}
                                                <button
                                                    type="button"
                                                    className="flex hover:text-success"
                                                    onClick={() => handleGenerateContractPDF(deal)}
                                                    disabled={generatingContractPDF === id}
                                                    title={t('generate_contract')}
                                                >
                                                    {generatingContractPDF === id ? (
                                                        <div className="animate-spin rounded-full h-4.5 w-4.5 border-2 border-success border-l-transparent"></div>
                                                    ) : (
                                                        <IconDocument className="h-4.5 w-4.5" />
                                                    )}
                                                </button>

                                                {/* Bill PDFs Dropdown - Only show if deal has bills */}
                                                {hasBills && (
                                                    <div className="relative" ref={openBillDropdown === id ? dropdownRef : null}>
                                                        <button
                                                            type="button"
                                                            className="flex items-center gap-1 hover:text-primary"
                                                            onClick={() => setOpenBillDropdown(openBillDropdown === id ? null : id)}
                                                            title={t('download_bills')}
                                                        >
                                                            <IconPdf className="h-4.5 w-4.5" />
                                                            <IconCaretDown className="h-3 w-3" />
                                                        </button>

                                                        {openBillDropdown === id && (
                                                            <div className="absolute right-0 z-50 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700">
                                                                <div className="py-1">
                                                                    <div className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                                                                        {t('select_bill')}
                                                                    </div>
                                                                    {bills.map((bill: any, index: number) => (
                                                                        <button
                                                                            key={bill.id}
                                                                            type="button"
                                                                            className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                                                                            onClick={() => handleDownloadBillPDF(bill)}
                                                                            disabled={downloadingBillPDF === bill.id}
                                                                        >
                                                                            {downloadingBillPDF === bill.id ? (
                                                                                <div className="animate-spin rounded-full h-3 w-3 border-2 border-primary border-l-transparent"></div>
                                                                            ) : (
                                                                                <IconPdf className="h-3 w-3" />
                                                                            )}
                                                                            <span className="truncate">
                                                                                {t(`bill_type_${bill.bill_type}`)} #{bill.id}
                                                                            </span>
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {/* View Button */}
                                                <Link href={`/sales-deals/preview/${id}`} className="flex hover:text-info" title={t('view')}>
                                                    <IconEye className="h-4.5 w-4.5" />
                                                </Link>

                                                {/* Edit Button */}
                                                <Link
                                                    href={`/sales-deals/edit/${id}`}
                                                    className={`flex hover:text-info ${status === 'cancelled' ? 'opacity-50 pointer-events-none' : ''}`}
                                                    title={status === 'cancelled' ? t('deal_cancelled_no_edit') : t('edit')}
                                                >
                                                    <IconEdit className="h-4.5 w-4.5" />
                                                </Link>

                                                {/* Delete Button */}
                                                <button
                                                    type="button"
                                                    className={`flex hover:text-danger ${status === 'completed' || status === 'cancelled' ? 'opacity-50 pointer-events-none' : ''}`}
                                                    onClick={() => status !== 'completed' && status !== 'cancelled' && deleteRow(id)}
                                                    title={status === 'completed' ? t('deal_completed_no_delete') : status === 'cancelled' ? t('deal_cancelled_no_delete') : t('delete')}
                                                >
                                                    <IconTrashLines />
                                                </button>
                                            </div>
                                        );
                                    },
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
                ) : (
                    <div className="px-5">
                        {loading ? (
                            <div className="flex items-center justify-center min-h-[300px]">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                                {records.map((deal: any) => {
                                    const balance = calculateDealBalance(deal, deal.bills || []);
                                    const hasBills = deal.bills && deal.bills.length > 0;
                                    return (
                                        <div key={deal.id} className="panel p-0 hover:shadow-lg transition-shadow border border-gray-200 dark:border-blue-400/30 relative">
                                            <div className="p-5">
                                                <div className="mb-3">
                                                    <div className="flex items-start justify-between mb-2">
                                                        <div className="flex-1 min-w-0">
                                                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">{deal.title}</h3>
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-col items-start justify-center  gap-1">
                                                        <span className={`badge ${getDealTypeBadgeClass(deal.deal_type)}`}>{t(`deal_type_${deal.deal_type}`)}</span>
                                                        <p className="text-sm text-gray-500 dark:text-gray-400">#{deal.id}</p>
                                                    </div>
                                                </div>
                                                <div className="space-y-3 mb-4">
                                                    <div>
                                                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('customer')}</p>
                                                        {deal.deal_type === 'intermediary' ? (
                                                            <div>
                                                                <p className="font-semibold text-sm text-blue-600">
                                                                    {t('seller')}: {deal.seller?.name || t('no_seller')}
                                                                </p>
                                                                <p className="font-semibold text-sm text-green-600">
                                                                    {t('buyer')}: {deal.buyer?.name || t('no_buyer')}
                                                                </p>
                                                            </div>
                                                        ) : (
                                                            <p className="font-semibold text-sm">{deal.customers?.name || t('no_customer')}</p>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('car_info')}</p>
                                                        {deal.cars ? (
                                                            <div>
                                                                <p className="font-semibold text-sm">
                                                                    {deal.cars.brand} {deal.cars.title}
                                                                </p>
                                                                <p className="text-xs text-gray-500">
                                                                    {deal.cars.car_number} - {deal.cars.year}
                                                                </p>
                                                            </div>
                                                        ) : (
                                                            <p className="text-sm text-gray-400">{t('no_car_assigned')}</p>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="border-t border-gray-200 dark:border-gray-700 pt-3 mb-4">
                                                    <div className="grid grid-cols-2 gap-3 mb-2">
                                                        <div>
                                                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('amount')}</p>
                                                            <p className="font-bold text-success text-sm">{formatCurrency(deal.selling_price)}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('deal_balance')}</p>
                                                            <p className={`font-bold text-sm ${balance >= 0 ? 'text-info' : 'text-danger'}`}>{formatCurrency(balance)}</p>
                                                        </div>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div>
                                                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('status')}</p>
                                                            <span className={`badge ${getStatusBadgeClass(deal.status)}`}>{t(`status_${deal.status}`)}</span>
                                                        </div>
                                                        <div>
                                                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('bill_status')}</p>
                                                            <span className={`badge ${hasBills ? 'badge-outline-success' : 'badge-outline-warning'}`}>
                                                                {hasBills ? t('bill_created') : t('no_bill_created')}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="mt-2">
                                                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('deal_created_date')}</p>
                                                        <p className="text-sm">
                                                            {new Date(deal.created_at).toLocaleDateString('en-GB', {
                                                                year: 'numeric',
                                                                month: '2-digit',
                                                                day: '2-digit',
                                                            })}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex gap-2 flex-wrap">
                                                    {/* Generate Contract PDF Button */}
                                                    <button
                                                        type="button"
                                                        className="btn btn-outline-success btn-sm"
                                                        onClick={() => handleGenerateContractPDF(deal)}
                                                        disabled={generatingContractPDF === deal.id}
                                                        title={t('generate_contract')}
                                                    >
                                                        {generatingContractPDF === deal.id ? (
                                                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-success border-l-transparent"></div>
                                                        ) : (
                                                            <IconDocument className="w-4 h-4" />
                                                        )}
                                                    </button>

                                                    {/* Bill PDFs Dropdown - Only show if deal has bills */}
                                                    {hasBills && (
                                                        <div className="relative" ref={openBillDropdown === deal.id ? dropdownRef : null}>
                                                            <button
                                                                type="button"
                                                                className="btn btn-outline-primary btn-sm flex items-center gap-1"
                                                                onClick={() => setOpenBillDropdown(openBillDropdown === deal.id ? null : deal.id)}
                                                                title={t('download_bills')}
                                                            >
                                                                <IconPdf className="w-4 h-4" />
                                                                <IconCaretDown className="w-3 h-3" />
                                                            </button>

                                                            {openBillDropdown === deal.id && (
                                                                <div className="absolute left-0 bottom-full mb-2 z-50 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700">
                                                                    <div className="py-1">
                                                                        <div className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                                                                            {t('select_bill')}
                                                                        </div>
                                                                        {deal.bills.map((bill: any) => (
                                                                            <button
                                                                                key={bill.id}
                                                                                type="button"
                                                                                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                                                                                onClick={() => handleDownloadBillPDF(bill)}
                                                                                disabled={downloadingBillPDF === bill.id}
                                                                            >
                                                                                {downloadingBillPDF === bill.id ? (
                                                                                    <div className="animate-spin rounded-full h-3 w-3 border-2 border-primary border-l-transparent"></div>
                                                                                ) : (
                                                                                    <IconPdf className="h-3 w-3" />
                                                                                )}
                                                                                <span className="truncate">
                                                                                    {t(`bill_type_${bill.bill_type}`)} #{bill.id}
                                                                                </span>
                                                                            </button>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}

                                                    {/* View Button */}
                                                    <Link href={`/sales-deals/preview/${deal.id}`} className="btn btn-primary btn-sm flex-1 justify-center">
                                                        <IconEye className="w-4 h-4 ltr:mr-1 rtl:ml-1" />
                                                        {t('view')}
                                                    </Link>

                                                    {/* Edit Button */}
                                                    <Link
                                                        href={`/sales-deals/edit/${deal.id}`}
                                                        className={`btn btn-info btn-sm ${deal.status === 'cancelled' ? 'opacity-50 pointer-events-none' : ''}`}
                                                        title={deal.status === 'cancelled' ? t('deal_cancelled_no_edit') : t('edit')}
                                                    >
                                                        <IconEdit className="w-4 h-4" />
                                                    </Link>
                                                    <button
                                                        type="button"
                                                        className={`btn btn-danger btn-sm ${deal.status === 'completed' || deal.status === 'cancelled' ? 'opacity-50 pointer-events-none' : ''}`}
                                                        onClick={() => deal.status !== 'completed' && deal.status !== 'cancelled' && deleteRow(deal.id)}
                                                        title={deal.status === 'completed' ? t('deal_completed_no_delete') : deal.status === 'cancelled' ? t('deal_cancelled_no_delete') : t('delete')}
                                                    >
                                                        <IconTrashLines className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                        {!loading && records.length === 0 && (
                            <div className="flex items-center justify-center min-h-[300px] text-gray-500 dark:text-gray-400">
                                <div className="text-center">
                                    <p className="text-lg font-semibold mb-2">{t('no_results_found')}</p>
                                    <p className="text-sm">{t('try_adjusting_filters')}</p>
                                </div>
                            </div>
                        )}
                        {!loading && records.length > 0 && (
                            <div className="flex justify-between items-center mt-6 flex-wrap gap-4">
                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                    {t('showing')} {(page - 1) * pageSize + 1} {t('to')} {Math.min(page * pageSize, initialRecords.length)} {t('of')} {initialRecords.length} {t('entries')}
                                </div>
                                <div className="flex gap-2 flex-wrap">
                                    {Array.from({ length: Math.ceil(initialRecords.length / pageSize) }, (_, i) => i + 1).map((pageNum) => (
                                        <button
                                            key={pageNum}
                                            onClick={() => setPage(pageNum)}
                                            className={`px-3 py-1 rounded transition-colors ${
                                                page === pageNum ? 'bg-primary text-white' : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'
                                            }`}
                                        >
                                            {pageNum}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
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
