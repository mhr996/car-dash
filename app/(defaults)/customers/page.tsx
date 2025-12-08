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
import CustomerFilters from '@/components/customer-filters/customer-filters';
import ViewToggle from '@/components/view-toggle/view-toggle';

interface Customer {
    id: string;
    created_at: string;
    name: string;
    phone: string;
    car_number: string;
    age: number;
    id_number: string;
    customer_type: 'new' | 'existing';
    balance: number;
}

const CustomersList = () => {
    const { t } = getTranslation();
    const [items, setItems] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

    const [page, setPage] = useState(1);
    const PAGE_SIZES = [10, 20, 30, 50, 100];
    const [pageSize, setPageSize] = useState(PAGE_SIZES[0]);
    const [initialRecords, setInitialRecords] = useState<Customer[]>([]);
    const [records, setRecords] = useState<Customer[]>([]);
    const [selectedRecords, setSelectedRecords] = useState<Customer[]>([]);

    const [sortStatus, setSortStatus] = useState<DataTableSortStatus>({
        columnAccessor: 'id',
        direction: 'desc',
    }); // Modal and alert states

    // Load view preference from localStorage
    useEffect(() => {
        const savedView = localStorage.getItem('customersViewMode');
        if (savedView === 'grid' || savedView === 'list') {
            setViewMode(savedView);
        }
    }, []);

    // Save view preference when changed
    const handleViewChange = (view: 'list' | 'grid') => {
        setViewMode(view);
        localStorage.setItem('customersViewMode', view);
    };

    // Always default sort by ID in descending order
    useEffect(() => {
        if (sortStatus.columnAccessor !== 'id') {
            setSortStatus({ columnAccessor: 'id', direction: 'desc' });
        }
    }, []);

    const [filters, setFilters] = useState({
        search: '',
        customerType: '',
        balanceFrom: '',
        balanceTo: '',
        dateFrom: '',
        dateTo: '',
    });
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
    const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
    const [alert, setAlert] = useState<{ visible: boolean; message: string; type: 'success' | 'danger' }>({
        visible: false,
        message: '',
        type: 'success',
    });

    useEffect(() => {
        const fetchCustomers = async () => {
            try {
                const { data, error } = await supabase.from('customers').select('*').order('created_at', { ascending: false });
                if (error) throw error;

                setItems(data as Customer[]);
            } catch (error) {
                console.error('Error fetching customers:', error);
                setAlert({ visible: true, message: t('error_loading_data'), type: 'danger' });
            } finally {
                setLoading(false);
            }
        };
        fetchCustomers();
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
                const searchTerm = filters.search.toLowerCase();
                const matchesSearch =
                    !searchTerm ||
                    item.name.toLowerCase().includes(searchTerm) ||
                    item.phone.toLowerCase().includes(searchTerm) ||
                    item.car_number.toLowerCase().includes(searchTerm) ||
                    item.customer_type.toLowerCase().includes(searchTerm);

                // Country filter
                const matchesCountry = true;

                // Customer type filter
                const matchesCustomerType = !filters.customerType || item.customer_type === filters.customerType;

                // Age range filter
                const age = item.age || 0;

                // Balance range filter
                const balance = item.balance || 0;
                const matchesBalanceFrom = !filters.balanceFrom || balance >= parseFloat(filters.balanceFrom);
                const matchesBalanceTo = !filters.balanceTo || balance <= parseFloat(filters.balanceTo);

                // Date range filter
                const itemDate = new Date(item.created_at);
                const matchesDateFrom = !filters.dateFrom || itemDate >= new Date(filters.dateFrom);
                const matchesDateTo = !filters.dateTo || itemDate <= new Date(filters.dateTo + 'T23:59:59');

                return matchesSearch && matchesCountry && matchesCustomerType && matchesBalanceFrom && matchesBalanceTo && matchesDateFrom && matchesDateTo;
            }),
        );
    }, [items, filters]);

    useEffect(() => {
        const sorted = sortBy(initialRecords, sortStatus.columnAccessor);
        setRecords(sortStatus.direction === 'desc' ? sorted.reverse() : sorted);
        setPage(1);
    }, [sortStatus, initialRecords]);

    const deleteRow = (id: string | null = null) => {
        if (id) {
            const customer = items.find((c) => c.id === id);
            if (customer) {
                setCustomerToDelete(customer);
                setShowConfirmModal(true);
            }
        }
    };

    const confirmDeletion = async () => {
        if (!customerToDelete) return;
        try {
            const { error } = await supabase.from('customers').delete().eq('id', customerToDelete.id);
            if (error) throw error;

            const updatedItems = items.filter((c) => c.id !== customerToDelete.id);
            setItems(updatedItems);
            setAlert({ visible: true, message: t('customer_deleted_successfully'), type: 'success' });
        } catch (error) {
            console.error('Deletion error:', error);
            setAlert({ visible: true, message: t('error_deleting_customer'), type: 'danger' });
        } finally {
            setShowConfirmModal(false);
            setCustomerToDelete(null);
        }
    };
    const handleBulkDelete = () => {
        if (selectedRecords.length === 0) return;
        setShowBulkDeleteModal(true);
    };

    const confirmBulkDeletion = async () => {
        const ids = selectedRecords.map((c) => c.id);
        try {
            const { error } = await supabase.from('customers').delete().in('id', ids);
            if (error) throw error;
            setItems(items.filter((c) => !ids.includes(c.id)));
            setSelectedRecords([]);
            setAlert({ visible: true, message: t('customers_deleted_successfully'), type: 'success' });
        } catch (error) {
            console.error('Error deleting customers:', error);
            setAlert({ visible: true, message: t('error_deleting_customer'), type: 'danger' });
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

    const getCustomerTypeBadgeClass = (type: string) => {
        return type === 'new' ? 'badge-outline-success' : 'badge-outline-primary';
    };

    // Calculate total balance
    const totalBalance = items.reduce((sum, customer) => sum + (customer.balance || 0), 0);

    return (
        <div className="panel border-white-light px-0 dark:border-[#1b2e4b]">
            {alert.visible && (
                <div className="mb-4 ml-4 max-w-96">
                    <Alert
                        type={alert.type}
                        title={alert.type === 'success' ? t('success') : t('error')}
                        message={alert.message}
                        onClose={() => setAlert({ visible: false, message: '', type: 'success' })}
                    />
                </div>
            )}
            {/* Total Balance Display */}
            <div className="mb-4 px-5">
                <div className="text-lg font-semibold">
                    {t('total_balance')}:{' '}
                    <span className={totalBalance >= 0 ? 'text-success ml-2' : 'text-danger ml-2'}>
                        {totalBalance >= 0 ? formatCurrency(totalBalance) : `-${formatCurrency(Math.abs(totalBalance))}`}
                    </span>
                </div>
            </div>
            <div className="invoice-table">
                <div className="mb-4.5 flex flex-wrap items-start justify-between gap-4 px-5">
                    <div className="flex items-center gap-2">
                        <ViewToggle view={viewMode} onViewChange={handleViewChange} />
                    </div>
                    <div className="flex items-center gap-2 ml-auto">
                        <button type="button" className="btn btn-danger gap-2" disabled={selectedRecords.length === 0} onClick={handleBulkDelete}>
                            <IconTrashLines />
                            {t('delete')}
                        </button>
                        <Link href="/customers/add" className="btn btn-primary gap-2">
                            <IconPlus />
                            {t('add_new')}
                        </Link>
                    </div>
                    <div className="flex-grow">
                        <CustomerFilters
                            onFilterChange={setFilters}
                            onClearFilters={() =>
                                setFilters({
                                    search: '',
                                    customerType: '',
                                    balanceFrom: '',
                                    balanceTo: '',
                                    dateFrom: '',
                                    dateTo: '',
                                })
                            }
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
                                            <Link href={`/customers/preview/${id}`} className="flex hover:text-info" title={t('view')}>
                                                <IconEye className="h-4 w-4" />
                                            </Link>
                                        </div>
                                    ),
                                },
                                {
                                    accessor: 'name',
                                    title: t('customer_name'),
                                    sortable: true,
                                    render: ({ name }) => <div className="font-semibold">{name}</div>,
                                },
                                {
                                    accessor: 'phone',
                                    title: t('phone'),
                                    sortable: true,
                                },

                                {
                                    accessor: 'customer_type',
                                    title: t('customer_type'),
                                    sortable: true,
                                    render: ({ customer_type }) => <span className={`badge ${getCustomerTypeBadgeClass(customer_type)}`}>{t(`customer_type_${customer_type}`)}</span>,
                                },
                                {
                                    accessor: 'balance',
                                    title: t('balance'),
                                    sortable: true,
                                    render: ({ balance }) => <span className={balance >= 0 ? 'text-success' : 'text-danger'}>{formatCurrency(balance)}</span>,
                                },
                                {
                                    accessor: 'created_at',
                                    title: t('created_date'),
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
                                    accessor: 'action',
                                    title: t('actions'),
                                    sortable: false,
                                    textAlignment: 'center',
                                    render: ({ id }) => (
                                        <div className="mx-auto flex w-max items-center gap-4">
                                            <Link href={`/customers/edit/${id}`} className="flex hover:text-info">
                                                <IconEdit className="h-4.5 w-4.5" />
                                            </Link>
                                            <button type="button" className="flex hover:text-danger" onClick={() => deleteRow(id)}>
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
                ) : (
                    <div className="px-5">
                        {loading ? (
                            <div className="flex items-center justify-center min-h-[300px]">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                                {records.map((customer) => (
                                    <div key={customer.id} className="panel p-0 overflow-hidden hover:shadow-lg transition-shadow border border-gray-200 dark:border-blue-400/30">
                                        <div className="p-5">
                                            <div className="flex items-start justify-between mb-3">
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1 truncate">{customer.name}</h3>
                                                    <p className="text-sm text-gray-500 dark:text-gray-400">#{customer.id}</p>
                                                </div>
                                                <span className={`badge ${getCustomerTypeBadgeClass(customer.customer_type)} flex-shrink-0 ml-2`}>{t(`customer_type_${customer.customer_type}`)}</span>
                                            </div>
                                            <div className="space-y-3 mb-4">
                                                <div>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('phone')}</p>
                                                    <p className="font-semibold text-sm">{customer.phone}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('car_number')}</p>
                                                    <p className="font-semibold text-sm">{customer.car_number || 'N/A'}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('age')}</p>
                                                    <p className="font-semibold text-sm">{customer.age || 'N/A'}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('id_number')}</p>
                                                    <p className="font-semibold text-sm">{customer.id_number || 'N/A'}</p>
                                                </div>
                                            </div>
                                            <div className="border-t border-gray-200 dark:border-gray-700 pt-3 mb-4">
                                                <div>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('balance')}</p>
                                                    <p className={`font-bold text-lg ${customer.balance >= 0 ? 'text-success' : 'text-danger'}`}>{formatCurrency(customer.balance)}</p>
                                                </div>
                                                <div className="mt-2">
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('created_date')}</p>
                                                    <p className="text-sm">
                                                        {new Date(customer.created_at).toLocaleDateString('en-GB', {
                                                            year: 'numeric',
                                                            month: '2-digit',
                                                            day: '2-digit',
                                                        })}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <Link href={`/customers/preview/${customer.id}`} className="btn btn-primary btn-sm flex-1 justify-center">
                                                    <IconEye className="w-4 h-4 ltr:mr-1 rtl:ml-1" />
                                                    {t('view')}
                                                </Link>
                                                <Link href={`/customers/edit/${customer.id}`} className="btn btn-info btn-sm">
                                                    <IconEdit className="w-4 h-4" />
                                                </Link>
                                                <button type="button" className="btn btn-danger btn-sm" onClick={() => deleteRow(customer.id)}>
                                                    <IconTrashLines className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
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
                message={t('confirm_delete_customer')}
                onCancel={() => {
                    setShowConfirmModal(false);
                    setCustomerToDelete(null);
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
                message={`${t('confirm_delete_selected_customers')}`}
                onCancel={() => setShowBulkDeleteModal(false)}
                onConfirm={confirmBulkDeletion}
                confirmLabel={t('delete')}
                cancelLabel={t('cancel')}
                size="sm"
            />
        </div>
    );
};

export default CustomersList;
