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
import ViewToggle from '@/components/view-toggle/view-toggle';
import { PermissionGuard } from '@/components/auth/permission-guard';

interface Provider {
    id: string;
    created_at: string;
    name: string;
    address: string;
    phone: string;
}

const ProvidersList = () => {
    const { t } = getTranslation();
    const [items, setItems] = useState<Provider[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

    const [page, setPage] = useState(1);
    const PAGE_SIZES = [10, 20, 30, 50, 100];
    const [pageSize, setPageSize] = useState(PAGE_SIZES[0]);
    const [initialRecords, setInitialRecords] = useState<Provider[]>([]);
    const [records, setRecords] = useState<Provider[]>([]);
    const [selectedRecords, setSelectedRecords] = useState<Provider[]>([]);

    const [search, setSearch] = useState('');
    const [sortStatus, setSortStatus] = useState<DataTableSortStatus>({
        columnAccessor: 'id',
        direction: 'desc',
    });

    // Load view preference from localStorage
    useEffect(() => {
        const savedView = localStorage.getItem('providersViewMode');
        if (savedView === 'grid' || savedView === 'list') {
            setViewMode(savedView);
        }
    }, []);

    // Save view preference when changed
    const handleViewChange = (view: 'list' | 'grid') => {
        setViewMode(view);
        localStorage.setItem('providersViewMode', view);
    };

    // Always default sort by ID in descending order
    useEffect(() => {
        if (sortStatus.columnAccessor !== 'id') {
            setSortStatus({ columnAccessor: 'id', direction: 'desc' });
        }
    }, []);

    // Modal and alert states
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [providerToDelete, setProviderToDelete] = useState<Provider | null>(null);
    const [alert, setAlert] = useState<{ visible: boolean; message: string; type: 'success' | 'danger' }>({
        visible: false,
        message: '',
        type: 'success',
    });

    useEffect(() => {
        const fetchProviders = async () => {
            try {
                const { data, error } = await supabase.from('providers').select('*').order('created_at', { ascending: false });
                if (error) throw error;

                setItems(data as Provider[]);
            } catch (error) {
                console.error('Error fetching providers:', error);
                setAlert({ visible: true, message: t('error_loading_data'), type: 'danger' });
            } finally {
                setLoading(false);
            }
        };
        fetchProviders();
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
                return (
                    item.name?.toLowerCase().includes(search.toLowerCase()) || item.address?.toLowerCase().includes(search.toLowerCase()) || item.phone?.toLowerCase().includes(search.toLowerCase())
                );
            }),
        );
    }, [items, search]);

    useEffect(() => {
        const sorted = sortBy(initialRecords, sortStatus.columnAccessor);
        setRecords(sortStatus.direction === 'desc' ? sorted.reverse() : sorted);
        setPage(1);
    }, [sortStatus, initialRecords]);

    const deleteRow = (id: string | null = null) => {
        if (id) {
            const provider = items.find((p) => p.id === id);
            if (provider) {
                setProviderToDelete(provider);
                setShowConfirmModal(true);
            }
        }
    };

    const confirmDeletion = async () => {
        if (!providerToDelete) return;
        try {
            const { error } = await supabase.from('providers').delete().eq('id', providerToDelete.id);
            if (error) throw error;

            const updatedItems = items.filter((p) => p.id !== providerToDelete.id);
            setItems(updatedItems);
            setAlert({ visible: true, message: t('provider_deleted_successfully'), type: 'success' });
        } catch (error) {
            console.error('Deletion error:', error);
            setAlert({ visible: true, message: t('error_deleting_provider'), type: 'danger' });
        } finally {
            setShowConfirmModal(false);
            setProviderToDelete(null);
        }
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
                <div className="mb-4.5 flex flex-col gap-5 px-5 md:flex-row md:items-center">
                    <div className="flex items-center gap-2">
                        <ViewToggle view={viewMode} onViewChange={handleViewChange} />
                    </div>
                    <div className="flex items-center gap-2">
                        <button type="button" className="btn btn-danger gap-2" disabled={selectedRecords.length === 0}>
                            <IconTrashLines />
                            {t('delete')}
                        </button>
                        <Link href="/providers/add" className="btn btn-primary gap-2">
                            <IconPlus />
                            {t('add_new')}
                        </Link>
                    </div>
                    <div className="ltr:ml-auto rtl:mr-auto">
                        <input type="text" className="form-input w-auto" placeholder={t('search')} value={search} onChange={(e) => setSearch(e.target.value)} />
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
                                            <Link href={`/providers/preview/${id}`} className="flex hover:text-info" title={t('view')}>
                                                <IconEye className="h-4 w-4" />
                                            </Link>
                                        </div>
                                    ),
                                },
                                {
                                    accessor: 'name',
                                    title: t('provider_name'),
                                    sortable: true,
                                    render: ({ name }) => (
                                        <div className="flex items-center font-semibold">
                                            {/* <div className="w-max rounded-full ltr:mr-2 rtl:ml-2">
                                            <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center">
                                                <span className="text-primary font-semibold text-sm">{name.charAt(0).toUpperCase()}</span>
                                            </div>
                                        </div> */}
                                            <div>{name}</div>
                                        </div>
                                    ),
                                },
                                {
                                    accessor: 'address',
                                    title: t('provider_address'),
                                    sortable: true,
                                },
                                {
                                    accessor: 'phone',
                                    title: t('provider_phone'),
                                    sortable: true,
                                },
                                {
                                    accessor: 'created_at',
                                    title: t('created_at'),
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
                                            <Link href={`/providers/edit/${id}`} className="flex hover:text-info">
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
                            noRecordsText={t('no_records')}
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
                                {records.map((provider) => (
                                    <div key={provider.id} className="panel p-0 overflow-hidden hover:shadow-lg transition-shadow border border-gray-200 dark:border-blue-400/30">
                                        <div className="p-5">
                                            <div className="flex items-start justify-between mb-3">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                                            <span className="text-primary font-semibold text-lg">{provider.name.charAt(0).toUpperCase()}</span>
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <h3 className="text-lg font-bold text-gray-900 dark:text-white truncate">{provider.name}</h3>
                                                        </div>
                                                    </div>
                                                    <p className="text-sm text-gray-500 dark:text-gray-400">#{provider.id}</p>
                                                </div>
                                            </div>
                                            <div className="space-y-3 mb-4">
                                                <div>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('provider_address')}</p>
                                                    <p className="font-semibold text-sm">{provider.address}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('provider_phone')}</p>
                                                    <p className="font-semibold text-sm">{provider.phone}</p>
                                                </div>
                                            </div>
                                            <div className="border-t border-gray-200 dark:border-gray-700 pt-3 mb-4">
                                                <div>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('created_at')}</p>
                                                    <p className="text-sm">
                                                        {new Date(provider.created_at).toLocaleDateString('en-GB', {
                                                            year: 'numeric',
                                                            month: '2-digit',
                                                            day: '2-digit',
                                                        })}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <Link href={`/providers/preview/${provider.id}`} className="btn btn-primary btn-sm flex-1 justify-center">
                                                    <IconEye className="w-4 h-4 ltr:mr-1 rtl:ml-1" />
                                                    {t('view')}
                                                </Link>
                                                <Link href={`/providers/edit/${provider.id}`} className="btn btn-info btn-sm">
                                                    <IconEdit className="w-4 h-4" />
                                                </Link>
                                                <button type="button" className="btn btn-danger btn-sm" onClick={() => deleteRow(provider.id)}>
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
            </div>

            <ConfirmModal
                isOpen={showConfirmModal}
                title={t('confirm_deletion')}
                message={t('confirm_delete_provider')}
                onCancel={() => {
                    setShowConfirmModal(false);
                    setProviderToDelete(null);
                }}
                onConfirm={confirmDeletion}
                confirmLabel={t('delete')}
                cancelLabel={t('cancel')}
                size="sm"
            />
        </div>
    );
};

const ProtectedProvidersPage = () => (
    <PermissionGuard permission="view_providers">
        <ProvidersList />
    </PermissionGuard>
);

export default ProtectedProvidersPage;
