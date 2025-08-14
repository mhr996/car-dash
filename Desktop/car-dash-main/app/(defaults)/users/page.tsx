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

const UsersList = () => {
    const { t } = getTranslation();
    const [items, setItems] = useState<
        Array<{
            id: string;
            full_name: string;
            email: string;
            avatar_url: string | null;
            created_at?: string;
            status?: string;
            uid?: string;
        }>
    >([]);
    const [loading, setLoading] = useState(true);

    const [page, setPage] = useState(1);
    const PAGE_SIZES = [10, 20, 30, 50, 100];
    const [pageSize, setPageSize] = useState(PAGE_SIZES[0]);
    const [initialRecords, setInitialRecords] = useState(sortBy(items, 'full_name'));
    const [records, setRecords] = useState(initialRecords);
    const [selectedRecords, setSelectedRecords] = useState<any>([]);

    const [search, setSearch] = useState('');
    const [sortStatus, setSortStatus] = useState<DataTableSortStatus>({
        columnAccessor: 'id',
        direction: 'desc',
    }); // New state for confirm modal and alert.

    // Always default sort by ID in descending order
    useEffect(() => {
        if (sortStatus.columnAccessor !== 'id') {
            setSortStatus({ columnAccessor: 'id', direction: 'desc' });
        }
    }, []);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
    const [userToDelete, setUserToDelete] = useState<any>(null);
    const [alert, setAlert] = useState<{ visible: boolean; message: string; type: 'success' | 'danger' }>({
        visible: false,
        message: '',
        type: 'success',
    });

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const { data, error } = await supabase.from('users').select('*');
                if (error) throw error;
                setItems(data);
            } catch (error) {
                console.error('Error:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchUsers();
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
        setInitialRecords(() => {
            return items.filter((item) => {
                return (
                    item.full_name?.toLowerCase().includes(search.toLowerCase()) ||
                    item.email?.toLowerCase().includes(search.toLowerCase()) ||
                    (item.created_at?.toString() || '').includes(search.toLowerCase())
                );
            });
        });
    }, [items, search]);

    useEffect(() => {
        const data2 = sortBy(initialRecords, sortStatus.columnAccessor);
        setRecords(sortStatus.direction === 'desc' ? data2.reverse() : data2);
        setPage(1);
    }, [sortStatus]);

    // Modified deletion function. It sets the user to delete and shows the confirm modal.
    const deleteRow = (id: string | null = null) => {
        if (id) {
            const user = items.find((user) => user.id === id);
            if (user) {
                setUserToDelete(user);
                setShowConfirmModal(true);
            }
        }
    };

    // Confirm deletion callback.
    const confirmDeletion = async () => {
        if (!userToDelete || !userToDelete.id) return;

        try {
            // Delete from users table first
            const { error: profileError } = await supabase.from('users').delete().eq('id', userToDelete.id);
            if (profileError) throw profileError;

            // Delete account from supabase auth using admin API
            const { data: sessionData } = await supabase.auth.getSession();
            const token = sessionData?.session?.access_token;

            if (token) {
                // Call admin delete endpoint (you might need to create this)
                const response = await fetch('/api/users/delete', {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({ userId: userToDelete.id }),
                });

                if (!response.ok) {
                    console.warn('Warning: Could not delete user from auth, but profile was deleted');
                }
            }

            // Remove the user from state arrays.
            const updatedItems = items.filter((user: any) => user.id !== userToDelete.id);
            setItems(updatedItems);
            setInitialRecords(
                updatedItems.filter((item: any) => {
                    return (
                        item.full_name?.toLowerCase().includes(search.toLowerCase()) ||
                        item.email?.toLowerCase().includes(search.toLowerCase()) ||
                        (item.created_at?.toString() || '').includes(search.toLowerCase())
                    );
                }),
            );
            setSelectedRecords([]);
            setAlert({ visible: true, message: t('user_deleted_successfully'), type: 'success' });
        } catch (error) {
            console.error('Deletion error:', error);
            setAlert({ visible: true, message: t('error_deleting_user'), type: 'danger' });
        } finally {
            setShowConfirmModal(false);
            setUserToDelete(null);
        }
    };
    const handleBulkDelete = () => {
        if (selectedRecords.length === 0) return;
        setShowBulkDeleteModal(true);
    };

    const confirmBulkDeletion = async () => {
        const ids = selectedRecords.map((u: any) => u.id);
        try {
            // Delete from users table (profiles)
            const { error: profileError } = await supabase.from('users').delete().in('id', ids);
            if (profileError) throw profileError;

            // Try to delete from auth (might not work for all users)
            const { data: sessionData } = await supabase.auth.getSession();
            const token = sessionData?.session?.access_token;

            if (token) {
                // Note: Bulk auth deletion would require multiple API calls
                // For now, we'll just warn the user about potential auth cleanup needed
                console.warn('Note: Auth cleanup may be needed for deleted users');
            }

            // Update state
            const updatedItems = items.filter((u: any) => !ids.includes(u.id));
            setItems(updatedItems);
            setInitialRecords(
                updatedItems.filter((item: any) => {
                    return (
                        item.full_name?.toLowerCase().includes(search.toLowerCase()) ||
                        item.email?.toLowerCase().includes(search.toLowerCase()) ||
                        (item.created_at?.toString() || '').includes(search.toLowerCase())
                    );
                }),
            );
            setSelectedRecords([]);
            setAlert({ visible: true, message: t('users_deleted_successfully'), type: 'success' });
        } catch (error) {
            console.error('Error deleting users:', error);
            setAlert({ visible: true, message: t('error_deleting_user'), type: 'danger' });
        } finally {
            setShowBulkDeleteModal(false);
        }
    };

    return (
        <div className="panel border-white-light px-0 dark:border-[#1b2e4b]">
            {/* Alert */}
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
                        <button type="button" className="btn btn-danger gap-2" disabled={selectedRecords.length === 0} onClick={handleBulkDelete}>
                            <IconTrashLines />
                            {t('delete')} {selectedRecords.length > 0 && `(${selectedRecords.length})`}
                        </button>
                        <Link href="/users/add" className="btn btn-primary gap-2">
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
                                        <strong className="text-info">#{id.toString().slice(0, 8)}</strong>
                                        <Link href={`/users/preview/${id}`} className="flex hover:text-info" title={t('view')}>
                                            <IconEye className="h-4 w-4" />
                                        </Link>
                                    </div>
                                ),
                            },
                            {
                                accessor: 'full_name',
                                title: t('full_name'),
                                sortable: true,
                                render: ({ full_name, avatar_url }) => (
                                    <div className="flex items-center font-semibold">
                                        <div className="w-max rounded-full ltr:mr-2 rtl:ml-2 flex items-center justify-center">
                                            <img className="h-8 w-8 rounded-full object-cover" src={avatar_url || `/assets/images/user-placeholder.webp`} alt="" />
                                        </div>
                                        <div>{full_name}</div>
                                    </div>
                                ),
                            },
                            {
                                accessor: 'email',
                                title: t('email'),
                                sortable: true,
                            },
                            {
                                accessor: 'created_at',
                                title: t('created_at'),
                                sortable: true,
                                render: ({ created_at }) => (
                                    <span>
                                        {new Date(created_at!).toLocaleDateString('en-GB', {
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
                                render: ({ status }) => <span className={`badge badge-outline-${status === 'Active' ? 'success' : 'danger'} `}>{status}</span>,
                            },
                            {
                                accessor: 'action',
                                title: t('actions'),
                                sortable: false,
                                textAlignment: 'center',
                                render: ({ id }) => (
                                    <div className="mx-auto flex w-max items-center gap-4">
                                        <Link href={`/users/edit/${id}`} className="flex hover:text-info">
                                            <IconEdit />
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
            {/* Confirm Deletion Modal */}
            <ConfirmModal
                isOpen={showConfirmModal}
                title={t('confirm_deletion')}
                message={t('confirm_delete_user')}
                onCancel={() => {
                    setShowConfirmModal(false);
                    setUserToDelete(null);
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
                message={`${t('confirm_delete_selected_users')}`}
                onCancel={() => setShowBulkDeleteModal(false)}
                onConfirm={confirmBulkDeletion}
                confirmLabel={t('delete')}
                cancelLabel={t('cancel')}
                size="sm"
            />
        </div>
    );
};

export default UsersList;
