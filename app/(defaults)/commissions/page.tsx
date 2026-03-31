'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import supabase from '@/lib/supabase';
import { getTranslation } from '@/i18n';
import { sortBy } from 'lodash';
import { DataTableSortStatus } from 'mantine-datatable';
import type { Commission, CommissionPayment } from '@/components/commissions/commissions-table';
import IconPlus from '@/components/icon/icon-plus';
import { Alert } from '@/components/elements/alerts/elements-alerts-default';
import CommissionFilters, { CommissionFilters as CommissionFiltersType } from '@/components/commission-filters/commission-filters';
import CommissionsTable from '@/components/commissions/commissions-table';
import { PermissionGuard } from '@/components/auth/permission-guard';
import { usePermissions } from '@/hooks/usePermissions';

const Commissions = () => {
    const { t } = getTranslation();
    const { hasPermission } = usePermissions();
    const [items, setItems] = useState<Commission[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const PAGE_SIZES = [10, 20, 30, 50, 100];
    const [pageSize, setPageSize] = useState(PAGE_SIZES[0]);
    const [initialRecords, setInitialRecords] = useState<Commission[]>([]);
    const [records, setRecords] = useState<Commission[]>([]);
    const [sortStatus, setSortStatus] = useState<DataTableSortStatus>({ columnAccessor: 'id', direction: 'desc' });
    const [alertState, setAlertState] = useState<{ message: string; type: 'success' | 'danger' } | null>(null);
    const [activeFilters, setActiveFilters] = useState<CommissionFiltersType>({
        search: '',
        commissionType: '',
        paymentType: '',
        providerId: '',
        amountFrom: '',
        amountTo: '',
        dateFrom: '',
        dateTo: '',
    });

    useEffect(() => {
        fetchCommissions();
    }, []);

    const fetchCommissions = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('commissions')
                .select(
                    `
                    *,
                    providers!commissions_provider_id_fkey(id, name, address, phone),
                    items:commission_items(id, item_description, unit_price, quantity, total),
                    payments:commission_payments(id, payment_type, amount, transfer_bank_name)
                `
                )
                .order('created_at', { ascending: false });

            if (error) throw error;
            setItems(data || []);
        } catch (error) {
            console.error('Error fetching commissions:', error);
            setAlertState({ message: t('error_loading_data'), type: 'danger' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        setInitialRecords(
            items.filter((comm) => {
                const searchLower = activeFilters.search.toLowerCase();
                const providerName = comm.providers?.name?.toLowerCase() || '';
                const docNum = String(comm.tranzila_document_number || '').toLowerCase();
                const matchesSearch =
                    !activeFilters.search ||
                    providerName.includes(searchLower) ||
                    comm.commission_type.toLowerCase().includes(searchLower) ||
                    String(comm.id).includes(searchLower) ||
                    docNum.includes(searchLower);

                const matchesType = !activeFilters.commissionType || comm.commission_type === activeFilters.commissionType;
                const matchesProvider = !activeFilters.providerId || String(comm.provider_id) === String(activeFilters.providerId);

                const matchesPaymentType =
                    !activeFilters.paymentType ||
                    (comm.payments && comm.payments.some((p: CommissionPayment) => p.payment_type === activeFilters.paymentType));

                const amount = comm.total_with_tax || 0;
                const matchesAmountFrom = !activeFilters.amountFrom || amount >= parseFloat(activeFilters.amountFrom);
                const matchesAmountTo = !activeFilters.amountTo || amount <= parseFloat(activeFilters.amountTo);

                const commDate = new Date(comm.date || comm.created_at);
                const matchesDateFrom = !activeFilters.dateFrom || commDate >= new Date(activeFilters.dateFrom);
                const matchesDateTo = !activeFilters.dateTo || commDate <= new Date(activeFilters.dateTo + 'T23:59:59');

                return matchesSearch && matchesType && matchesProvider && matchesPaymentType && matchesAmountFrom && matchesAmountTo && matchesDateFrom && matchesDateTo;
            }),
        );
    }, [items, activeFilters]);

    useEffect(() => {
        const from = (page - 1) * pageSize;
        const to = from + pageSize;
        setRecords(initialRecords.slice(from, to));
    }, [page, pageSize, initialRecords]);

    useEffect(() => {
        const sorted = sortBy(initialRecords, sortStatus.columnAccessor as keyof Commission);
        setRecords(sortStatus.direction === 'desc' ? sorted.reverse() : sorted);
        setPage(1);
    }, [sortStatus, initialRecords]);

    return (
        <PermissionGuard permission="view_commissions">
            <div className="panel border-white-light px-0 dark:border-[#1b2e4b]">
                {alertState && (
                    <div className="fixed top-4 right-4 z-50 min-w-80 max-w-md">
                        <Alert type={alertState.type} title={alertState.type === 'success' ? t('success') : t('error')} message={alertState.message} onClose={() => setAlertState(null)} />
                    </div>
                )}
                <div className="invoice-table">
                    <div className="mb-4.5 flex flex-col gap-5 px-5 md:flex-row md:items-center">
                        <div className="flex items-center gap-2">
                            {hasPermission('manage_commissions') && (
                                <Link href="/commissions/add" className="btn btn-primary gap-2">
                                    <IconPlus />
                                    {t('add_commission')}
                                </Link>
                            )}
                        </div>
                    </div>

                    <div className="px-5">
                        <CommissionFilters
                            onFilterChange={setActiveFilters}
                            onClearFilters={() =>
                                setActiveFilters({
                                    search: '',
                                    commissionType: '',
                                    paymentType: '',
                                    providerId: '',
                                    amountFrom: '',
                                    amountTo: '',
                                    dateFrom: '',
                                    dateTo: '',
                                })
                            }
                        />
                    </div>
                    <CommissionsTable
                        records={records}
                        initialRecords={initialRecords}
                        totalRecords={initialRecords.length}
                        page={page}
                        pageSize={pageSize}
                        pageSizes={PAGE_SIZES}
                        sortStatus={sortStatus}
                        loading={loading}
                        onPageChange={(p) => setPage(p)}
                        onRecordsPerPageChange={(size) => {
                            setPageSize(size);
                            setPage(1);
                        }}
                        onSortStatusChange={setSortStatus}
                        onAlert={(msg, type) => setAlertState({ message: msg, type })}
                    />
                </div>
            </div>
        </PermissionGuard>
    );
};

export default Commissions;
