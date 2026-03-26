'use client';
import React, { useState } from 'react';
import { getTranslation } from '@/i18n';
import { DataTable, DataTableSortStatus, DataTableColumn } from 'mantine-datatable';
import IconPdf from '@/components/icon/icon-pdf';

export interface CommissionProvider {
    id: number | string;
    name: string;
    address?: string;
    phone?: string;
}

export interface CommissionPayment {
    id: number;
    payment_type: string;
    amount: number;
    transfer_bank_name?: string;
}

export interface Commission {
    id: number;
    provider_id: number | string;
    commission_type: string;
    status: string;
    date: string;
    total: number;
    tax_amount: number;
    total_with_tax: number;
    free_text?: string;
    created_at: string;
    tranzila_document_number?: string;
    tranzila_retrieval_key?: string;
    providers?: CommissionProvider;
    items?: Array<{ id: number; item_description: string; unit_price: number; quantity: number; total: number }>;
    payments?: CommissionPayment[];
}

interface CommissionsTableProps {
    records: Commission[];
    initialRecords: Commission[];
    totalRecords: number;
    page: number;
    pageSize: number;
    pageSizes: number[];
    sortStatus: DataTableSortStatus;
    loading: boolean;
    onPageChange: (page: number) => void;
    onRecordsPerPageChange: (size: number) => void;
    onSortStatusChange: (status: DataTableSortStatus) => void;
    onAlert?: (message: string, type: 'success' | 'danger') => void;
}

const CommissionsTable: React.FC<CommissionsTableProps> = ({
    records,
    initialRecords,
    totalRecords,
    page,
    pageSize,
    pageSizes,
    sortStatus,
    loading,
    onPageChange,
    onRecordsPerPageChange,
    onSortStatusChange,
    onAlert,
}) => {
    const { t } = getTranslation();
    const [downloadingPDF, setDownloadingPDF] = useState<string | number | null>(null);

    const getCommissionTypeLabel = (type: string) => {
        switch (type) {
            case 'tax_invoice':
                return t('commission_type_tax_invoice');
            case 'receipt_only':
                return t('commission_type_receipt');
            case 'tax_invoice_receipt':
                return t('commission_type_both');
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

    const getPaymentTypeLabel = (comm: Commission) => {
        if (comm.commission_type === 'tax_invoice') return t('not_applicable');
        if (comm.payments && comm.payments.length > 0) {
            if (comm.payments.length === 1) {
                const p = comm.payments[0];
                switch (p.payment_type) {
                    case 'visa':
                        return t('visa');
                    case 'cash':
                        return t('cash');
                    case 'bank_transfer':
                        return t('bank_transfer');
                    case 'check':
                        return t('check');
                    default:
                        return p.payment_type;
                }
            }
            return t('multiple_payments');
        }
        return t('no_payment_yet');
    };

    const getPaymentAmount = (comm: Commission) => {
        if (comm.commission_type === 'tax_invoice') return t('not_applicable');
        if (comm.payments && comm.payments.length > 0) {
            const total = comm.payments.reduce((s, p) => s + (p.amount || 0), 0);
            if (comm.payments.length === 1) {
                return `₪${total.toFixed(0)}`;
            }
            return `₪${total.toFixed(0)} (${comm.payments.length} ${t('payments')})`;
        }
        return t('no_payment_yet');
    };

    const handleDownloadPDF = async (comm: Commission) => {
        setDownloadingPDF(comm.id);
        try {
            const tranzilaRetrievalKey = comm.tranzila_retrieval_key;
            if (!tranzilaRetrievalKey) {
                onAlert?.(t('bill_not_created_with_tranzila'), 'danger');
                return;
            }
            const proxyUrl = `/api/tranzila/download-pdf?key=${encodeURIComponent(tranzilaRetrievalKey)}`;
            window.open(proxyUrl, '_blank');
        } catch (error) {
            console.error('Error downloading PDF:', error);
            onAlert?.(t('error_downloading_pdf'), 'danger');
        } finally {
            setDownloadingPDF(null);
        }
    };

    const columns: DataTableColumn<Commission>[] = [
        {
            accessor: 'id',
            title: t('commission_number'),
            sortable: true,
            render: (c: Commission) => (
                <div className="text-sm font-mono">
                    <span className="font-medium">{c.tranzila_document_number || String(c.id).padStart(6, '0')}</span>
                </div>
            ),
        },
        {
            accessor: 'provider_name',
            title: t('provider'),
            sortable: true,
            render: (c: Commission) => (
                <div className="flex flex-col">
                    <span className="font-medium">{c.providers?.name || '-'}</span>
                    {c.providers?.phone && <span className="text-xs text-gray-500">{c.providers.phone}</span>}
                </div>
            ),
        },
        {
            accessor: 'commission_type',
            title: t('commission_type'),
            sortable: true,
            render: (c: Commission) => <span className="badge badge-outline-info">{getCommissionTypeLabel(c.commission_type)}</span>,
        },
        {
            accessor: 'total_with_tax',
            title: t('total_amount'),
            sortable: true,
            render: (c: Commission) => <span className="font-bold">₪{(c.total_with_tax || 0).toFixed(0)}</span>,
        },
        {
            accessor: 'payment_type',
            title: t('payment_method'),
            sortable: true,
            render: (c: Commission) => <span className="badge badge-outline-secondary">{getPaymentTypeLabel(c)}</span>,
        },
        {
            accessor: 'payment_amount',
            title: t('payment_amount'),
            sortable: true,
            render: (c: Commission) => (
                <span className="font-medium">
                    {c.commission_type === 'tax_invoice' ? t('not_applicable') : getPaymentAmount(c)}
                </span>
            ),
        },
        {
            accessor: 'bank_transfer_details',
            title: t('bank_transfer_details'),
            sortable: true,
            render: (c: Commission) => (
                <span className="text-sm">
                    {(c.commission_type === 'receipt_only' || c.commission_type === 'tax_invoice_receipt') && c.payments
                        ? c.payments.find((p) => p.payment_type === 'bank_transfer')?.transfer_bank_name || '-'
                        : '-'}
                </span>
            ),
        },
        {
            accessor: 'created_at',
            title: t('created_at'),
            sortable: true,
            render: (c: Commission) => (
                <span>
                    {new Date(c.date || c.created_at).toLocaleDateString('en-GB', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                    })}
                </span>
            ),
        },
        {
            accessor: 'status',
            title: t('status'),
            sortable: true,
            render: (c: Commission) => <span className={`badge ${getStatusColor(c.status)}`}>{t(c.status)}</span>,
        },
        {
            accessor: 'actions',
            title: t('actions'),
            sortable: false,
            textAlignment: 'center',
            render: (c: Commission) => (
                <div className="mx-auto flex w-max items-center gap-4">
                    {c.tranzila_retrieval_key && (
                        <button
                            type="button"
                            className="flex hover:text-success"
                            onClick={() => handleDownloadPDF(c)}
                            title={t('download_pdf')}
                            disabled={downloadingPDF === c.id}
                        >
                            {downloadingPDF === c.id ? (
                                <div className="animate-spin rounded-full h-4.5 w-4.5 border-b-2 border-success"></div>
                            ) : (
                                <IconPdf className="h-4.5 w-4.5" />
                            )}
                        </button>
                    )}
                </div>
            ),
        },
    ];

    return (
        <div className="datatables pagination-padding relative">
            <DataTable
                records={records}
                columns={columns}
                totalRecords={totalRecords}
                page={page}
                onPageChange={onPageChange}
                recordsPerPage={pageSize}
                recordsPerPageOptions={pageSizes}
                onRecordsPerPageChange={onRecordsPerPageChange}
                sortStatus={sortStatus}
                onSortStatusChange={onSortStatusChange}
                className={`${loading ? 'filter blur-sm pointer-events-none' : 'table-hover whitespace-nowrap'} rtl-table-headers`}
                highlightOnHover
                minHeight={300}
                noRecordsText={t('no_commissions_found')}
            />
        </div>
    );
};

export default CommissionsTable;
