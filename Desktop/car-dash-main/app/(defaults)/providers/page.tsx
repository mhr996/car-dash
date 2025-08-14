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
                return item.name.toLowerCase().includes(search.toLowerCase()) || item.address.toLowerCase().includes(search.toLowerCase()) || item.phone.toLowerCase().includes(search.toLowerCase());
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
                    />

                    {loading && <div className="absolute inset-0 z-10 flex items-center justify-center bg-white dark:bg-black-dark-light bg-opacity-60 backdrop-blur-sm" />}
                </div>
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

export default ProvidersList;
