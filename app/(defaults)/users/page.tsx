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
    const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

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

    // Load view preference from localStorage
    useEffect(() => {
        const savedView = localStorage.getItem('usersViewMode');
        if (savedView === 'grid' || savedView === 'list') {
            setViewMode(savedView);
        }
    }, []);

    // Save view preference when changed
    const handleViewChange = (view: 'list' | 'grid') => {
        setViewMode(view);
        localStorage.setItem('usersViewMode', view);
    };

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
            if (profileError) {
                console.error('Profile deletion error:', profileError);
                throw profileError;
            }

            // Delete account from supabase auth using admin API
            const { data: sessionData } = await supabase.auth.getSession();
            const token = sessionData?.session?.access_token;

            if (token) {
                // Call admin delete endpoint
                const response = await fetch('/api/users/delete', {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({ userId: userToDelete.id }),
                });

                const result = await response.json();

                if (!response.ok) {
                    console.warn('Auth deletion failed:', result.error);
                    // Don't throw error here, just warn as profile is already deleted
                } else {
                    console.log('User deleted from auth successfully');
                }
            } else {
                console.warn('No auth token available for deletion');
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
        } catch (error: any) {
            console.error('Deletion error:', error);
            setAlert({
                visible: true,
                message: error.message || t('error_deleting_user'),
                type: 'danger',
            });
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
            if (profileError) {
                console.error('Bulk profile deletion error:', profileError);
                throw profileError;
            }

            // Try to delete from auth (requires individual API calls)
            const { data: sessionData } = await supabase.auth.getSession();
            const token = sessionData?.session?.access_token;

            if (token) {
                // Delete each user from auth individually
                const authDeletionPromises = ids.map(async (userId: string) => {
                    try {
                        const response = await fetch('/api/users/delete', {
                            method: 'DELETE',
                            headers: {
                                'Content-Type': 'application/json',
                                Authorization: `Bearer ${token}`,
                            },
                            body: JSON.stringify({ userId }),
                        });

                        if (!response.ok) {
                            const error = await response.json();
                            console.warn(`Failed to delete user ${userId} from auth:`, error);
                        }
                    } catch (error) {
                        console.warn(`Error deleting user ${userId} from auth:`, error);
                    }
                });

                // Wait for all auth deletions to complete (don't fail if some fail)
                await Promise.allSettled(authDeletionPromises);
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
                        <ViewToggle view={viewMode} onViewChange={handleViewChange} />
                    </div>
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
                ) : (
                    <div className="px-5">
                        {loading ? (
                            <div className="flex items-center justify-center min-h-[300px]">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                                {records.map((user) => (
                                    <div key={user.id} className="panel p-0 overflow-hidden hover:shadow-lg transition-shadow border border-gray-200 dark:border-blue-400/30">
                                        <div className="p-5">
                                            <div className="flex items-center gap-3 mb-4">
                                                <div className="w-16 h-16 rounded-full overflow-hidden flex-shrink-0">
                                                    <img className="w-full h-full object-cover" src={user.avatar_url || `/assets/images/user-placeholder.webp`} alt={user.full_name} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1 truncate">{user.full_name}</h3>
                                                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate">#{user.id.toString().slice(0, 8)}</p>
                                                </div>
                                            </div>
                                            <div className="space-y-3 mb-4">
                                                <div>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('email')}</p>
                                                    <p className="font-semibold text-sm truncate">{user.email}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('status')}</p>
                                                    <span className={`badge badge-outline-${user.status === 'Active' ? 'success' : 'danger'}`}>{user.status}</span>
                                                </div>
                                            </div>
                                            <div className="border-t border-gray-200 dark:border-gray-700 pt-3 mb-4">
                                                <div>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('created_at')}</p>
                                                    <p className="text-sm">
                                                        {new Date(user.created_at!).toLocaleDateString('en-GB', {
                                                            year: 'numeric',
                                                            month: '2-digit',
                                                            day: '2-digit',
                                                        })}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <Link href={`/users/preview/${user.id}`} className="btn btn-primary btn-sm flex-1 justify-center">
                                                    <IconEye className="w-4 h-4 ltr:mr-1 rtl:ml-1" />
                                                    {t('view')}
                                                </Link>
                                                <Link href={`/users/edit/${user.id}`} className="btn btn-info btn-sm">
                                                    <IconEdit className="w-4 h-4" />
                                                </Link>
                                                <button type="button" className="btn btn-danger btn-sm" onClick={() => deleteRow(user.id)}>
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

const ProtectedUsersPage = () => (
    <PermissionGuard permission="view_users">
        <UsersList />
    </PermissionGuard>
);

export default ProtectedUsersPage;
