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
            <div className="invoice-table">
                <div className="mb-4.5 flex flex-wrap items-start justify-between gap-4 px-5">
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

                <div className="datatables pagination-padding relative">
                    <DataTable
                        className={`${loading ? 'filter blur-sm pointer-events-none' : 'table-hover whitespace-nowrap'}`}
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
