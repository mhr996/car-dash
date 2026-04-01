'use client';
import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import IconArrowLeft from '@/components/icon/icon-arrow-left';
import IconEdit from '@/components/icon/icon-edit';
import IconUser from '@/components/icon/icon-user';
import IconMapPin from '@/components/icon/icon-map-pin';
import IconPhone from '@/components/icon/icon-phone';
import IconCalendar from '@/components/icon/icon-calendar';
import supabase from '@/lib/supabase';
import { getTranslation } from '@/i18n';
import Link from 'next/link';
import { DataTable, DataTableColumn } from 'mantine-datatable';
import IconPdf from '@/components/icon/icon-pdf';

interface Provider {
    id: string;
    created_at: string;
    name: string;
    address: string;
    phone: string;
    id_number?: string;
}

type ProviderBillRow = {
    id: number;
    created_at: string;
    date?: string | null;
    bill_type: string;
    total_with_tax?: number | null;
    total?: number | null;
    customer_name: string;
    tranzila_document_number?: string | null;
    tranzila_retrieval_key?: string | null;
    deal?: {
        id?: string | number;
        title?: string;
        car?: {
            provider?: number | string | null;
            providers?: { id: number | string; name: string } | null;
        } | null;
    } | null;
};

type ProviderCommissionRow = {
    id: number;
    created_at: string;
    date: string;
    commission_type: string;
    status: string;
    total_with_tax: number;
    tranzila_document_number?: string | null;
    tranzila_retrieval_key?: string | null;
};

type ProviderDocRow =
    | {
          row_type: 'bill';
          id: number;
          created_at: string;
          date?: string | null;
          doc_type: string;
          status?: string | null;
          total_with_tax?: number | null;
          total?: number | null;
          customer_name?: string | null;
          tranzila_document_number?: string | null;
          tranzila_retrieval_key?: string | null;
          deal_title?: string | null;
      }
    | {
          row_type: 'commission';
          id: number;
          created_at: string;
          date?: string | null;
          doc_type: string;
          status?: string | null;
          total_with_tax?: number | null;
          total?: number | null;
          customer_name?: string | null;
          tranzila_document_number?: string | null;
          tranzila_retrieval_key?: string | null;
          deal_title?: string | null;
      };

const ProviderPreview = () => {
    const { t } = getTranslation();
    const params = useParams();
    const router = useRouter();
    const [provider, setProvider] = useState<Provider | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadingRelations, setLoadingRelations] = useState(false);
    const [providerDocs, setProviderDocs] = useState<ProviderDocRow[]>([]);
    const [downloadingPdf, setDownloadingPdf] = useState<string | number | null>(null);
    const isRtl = typeof document !== 'undefined' && document.documentElement?.dir === 'rtl';
    const [isCompact, setIsCompact] = useState(false);

    useEffect(() => {
        const update = () => {
            // "stack columns" on small screens
            setIsCompact(window.innerWidth < 1024);
        };
        update();
        window.addEventListener('resize', update);
        return () => window.removeEventListener('resize', update);
    }, []);

    useEffect(() => {
        const fetchProvider = async () => {
            try {
                const { data, error } = await supabase.from('providers').select('*').eq('id', params?.id).single();

                if (error) throw error;

                setProvider(data);
            } catch (error) {
                console.error('Error fetching provider:', error);
            } finally {
                setLoading(false);
            }
        };

        if (params?.id) {
            fetchProvider();
        }
    }, [params?.id]);

    useEffect(() => {
        const fetchRelations = async (providerId: string) => {
            setLoadingRelations(true);
            try {
                const [commRes, billsRes] = await Promise.all([
                    supabase
                        .from('commissions')
                        .select('id, created_at, date, commission_type, status, total_with_tax, tranzila_document_number, tranzila_retrieval_key')
                        .eq('provider_id', providerId)
                        .order('created_at', { ascending: false })
                        .limit(200),
                    supabase
                        .from('bills')
                        .select(
                            `
                            id,
                            created_at,
                            date,
                            bill_type,
                            total_with_tax,
                            total,
                            customer_name,
                            tranzila_document_number,
                            tranzila_retrieval_key,
                            deal:deals(
                                id,
                                title,
                                car:cars!deals_car_id_fkey(
                                    provider,
                                    providers!cars_provider_fkey(id, name)
                                )
                            )
                        `,
                        )
                        .order('created_at', { ascending: false })
                        .limit(400),
                ]);

                if (commRes.error) throw commRes.error;
                if (billsRes.error) throw billsRes.error;

                const commissions = (commRes.data || []) as ProviderCommissionRow[];
                const filteredBills = ((billsRes.data || []) as ProviderBillRow[]).filter((b) => {
                    const car = b.deal?.car;
                    const pid = car?.providers?.id ?? car?.provider;
                    return pid != null && String(pid) === String(providerId);
                });

                const billDocs: ProviderDocRow[] = filteredBills.map((b) => ({
                    row_type: 'bill',
                    id: b.id,
                    created_at: b.created_at,
                    date: b.date,
                    doc_type: b.bill_type,
                    status: null,
                    total_with_tax: b.total_with_tax ?? null,
                    total: b.total ?? null,
                    customer_name: b.customer_name ?? null,
                    tranzila_document_number: b.tranzila_document_number ?? null,
                    tranzila_retrieval_key: b.tranzila_retrieval_key ?? null,
                    deal_title: b.deal?.title ?? null,
                }));

                const commDocs: ProviderDocRow[] = commissions.map((c) => ({
                    row_type: 'commission',
                    id: c.id,
                    created_at: c.created_at,
                    date: c.date,
                    doc_type: c.commission_type,
                    status: c.status ?? null,
                    total_with_tax: c.total_with_tax ?? null,
                    total: null,
                    customer_name: null,
                    tranzila_document_number: c.tranzila_document_number ?? null,
                    tranzila_retrieval_key: c.tranzila_retrieval_key ?? null,
                    deal_title: null,
                }));

                const combined = [...billDocs, ...commDocs].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
                setProviderDocs(combined);
            } catch (e) {
                console.error('Error fetching provider relations:', e);
            } finally {
                setLoadingRelations(false);
            }
        };

        if (provider?.id) fetchRelations(provider.id);
    }, [provider?.id]);

    const handleViewTranzilaPdf = async (row: ProviderDocRow) => {
        const key = row.tranzila_retrieval_key;
        if (!key) return;
        setDownloadingPdf(row.id);
        try {
            const proxyUrl = `/api/tranzila/download-pdf?key=${encodeURIComponent(key)}`;
            window.open(proxyUrl, '_blank');
        } finally {
            setDownloadingPdf(null);
        }
    };

    const columns = useMemo((): DataTableColumn<ProviderDocRow>[] => {
        const pdfButton = (r: ProviderDocRow) =>
            r.tranzila_retrieval_key ? (
                <button
                    type="button"
                    className="flex hover:text-success"
                    onClick={() => handleViewTranzilaPdf(r)}
                    title={t('download_pdf')}
                    disabled={downloadingPdf === r.id}
                >
                    {downloadingPdf === r.id ? <div className="animate-spin rounded-full h-4.5 w-4.5 border-b-2 border-success"></div> : <IconPdf className="h-4.5 w-4.5" />}
                </button>
            ) : (
                <span className="text-gray-400">—</span>
            );

        const docTypeBadge = (r: ProviderDocRow) => {
            if (r.row_type === 'bill') return <span className="badge badge-outline-info">{t(`bill_type_${r.doc_type}`)}</span>;
            const mapped = r.doc_type === 'tax_invoice_receipt' ? 'both' : r.doc_type === 'receipt_only' ? 'receipt' : r.doc_type === 'tax_invoice' ? 'tax_invoice' : r.doc_type;
            return <span className="badge badge-outline-info">{t(`commission_type_${mapped}`)}</span>;
        };

        if (isCompact) {
            return [
                {
                    accessor: 'stacked',
                    title: t('bills'),
                    sortable: false,
                    render: (r) => (
                        <div className={`flex items-start justify-between gap-4 py-1 ${isRtl ? 'flex-row-reverse' : ''}`}>
                            <div className={`min-w-0 ${isRtl ? 'text-right' : 'text-left'}`}>
                                <div className="flex items-center gap-2">
                                    <span className="font-mono font-semibold">{r.tranzila_document_number || r.id}</span>
                                    {docTypeBadge(r)}
                                </div>
                                <div className="mt-1 space-y-0.5 text-sm text-gray-600 dark:text-white-dark">
                                    <div className="truncate">
                                        <span className="text-xs text-gray-500 dark:text-[#888ea8]">{t('customer_name')}: </span>
                                        {r.customer_name || '-'}
                                    </div>
                                    <div className="truncate">
                                        <span className="text-xs text-gray-500 dark:text-[#888ea8]">{t('deal')}: </span>
                                        {r.deal_title || '-'}
                                    </div>
                                    <div>
                                        <span className="text-xs text-gray-500 dark:text-[#888ea8]">{t('total_amount')}: </span>
                                        <span className="font-medium text-black dark:text-white-dark">₪{Number(r.total_with_tax ?? r.total ?? 0).toFixed(0)}</span>
                                    </div>
                                    <div>
                                        <span className="text-xs text-gray-500 dark:text-[#888ea8]">{t('date')}: </span>
                                        {new Date(r.date || r.created_at).toLocaleDateString('en-GB', { year: 'numeric', month: '2-digit', day: '2-digit' })}
                                    </div>
                                </div>
                            </div>
                            <div className="shrink-0">{pdfButton(r)}</div>
                        </div>
                    ),
                },
            ];
        }

        const textAlignStart = isRtl ? ('right' as const) : ('left' as const);
        const textAlignEnd = isRtl ? ('left' as const) : ('right' as const);

        return [
            {
                accessor: 'tranzila_document_number',
                title: t('invoice_number'),
                width: 150,
                textAlignment: textAlignStart,
                render: (r) => <span className="font-mono whitespace-nowrap">{r.tranzila_document_number || r.id}</span>,
            },
            {
                accessor: 'doc_type',
                title: t('commission_document_type'),
                width: 170,
                textAlignment: textAlignStart,
                render: (r) => <div className="whitespace-nowrap">{docTypeBadge(r)}</div>,
            },
            {
                accessor: 'customer_name',
                title: t('customer_name'),
                width: 220,
                textAlignment: textAlignStart,
                render: (r) => <div className="truncate">{r.customer_name || '-'}</div>,
            },
            {
                accessor: 'deal_title',
                title: t('deal'),
                width: 260,
                textAlignment: textAlignStart,
                render: (r) => <div className="truncate">{r.deal_title || '-'}</div>,
            },
            {
                accessor: 'total_with_tax',
                title: t('total_amount'),
                width: 140,
                textAlignment: textAlignEnd,
                render: (r) => <span className="font-medium whitespace-nowrap">₪{Number(r.total_with_tax ?? r.total ?? 0).toFixed(0)}</span>,
            },
            {
                accessor: 'date',
                title: t('date'),
                width: 140,
                textAlignment: textAlignStart,
                render: (r) =>
                    (
                        <span className="whitespace-nowrap">
                            {new Date(r.date || r.created_at).toLocaleDateString('en-GB', {
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
                width: 80,
                render: (r) => pdfButton(r),
            },
        ];
    }, [t, downloadingPdf, isCompact, isRtl]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen gap-4">
                <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
                <p className="text-lg font-semibold text-gray-700 dark:text-gray-300">{t('loading')}</p>
            </div>
        );
    }

    if (!provider) {
        return (
            <div className="panel">
                <div className="text-center py-10">
                    <h3 className="text-lg font-semibold text-danger">{t('provider_not_found')}</h3>
                    <Link href="/providers" className="btn btn-primary mt-4">
                        <IconArrowLeft className="ltr:mr-2 rtl:ml-2" />
                        {t('back_to_providers')}
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div>
            {/* Header */}
            <div className="container mx-auto p-6">
                <div className="flex items-center gap-5 mb-6">
                    <div onClick={() => router.back()}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 mb-4 cursor-pointer text-primary rtl:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                    </div>
                    {/* Breadcrumb Navigation */}
                    <ul className="flex space-x-2 rtl:space-x-reverse mb-4">
                        <li>
                            <Link href="/" className="text-primary hover:underline">
                                {t('home')}
                            </Link>
                        </li>
                        <li className="before:content-['/'] ltr:before:mr-2 rtl:before:ml-2">
                            <Link href="/providers" className="text-primary hover:underline">
                                {t('providers')}
                            </Link>
                        </li>
                        <li className="before:content-['/'] ltr:before:mr-2 rtl:before:ml-2">
                            <span>{t('provider_details')}</span>
                        </li>
                    </ul>
                </div>

                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">{t('provider_details')}</h1>
                        <p className="text-gray-500">{provider ? provider.name : t('loading')}</p>
                    </div>
                    {provider && (
                        <Link href={`/providers/edit/${provider.id}`} className="btn btn-primary">
                            <IconEdit className="ltr:mr-2 rtl:ml-2" />
                            {t('edit_provider')}
                        </Link>
                    )}
                </div>
            </div>

            <div className="container mx-auto p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Provider Information */}
                    <div className="space-y-6">
                        {/* Basic Info */}
                        <div className="panel">
                            <div className="mb-5">
                                <h3 className="text-lg font-semibold">{t('basic_information')}</h3>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <h2 className="text-2xl font-bold text-primary mb-2">{provider.name}</h2>
                                </div>
                                <div className="space-y-3">
                                    <div className="flex items-center">
                                        <IconUser className="w-5 h-5 text-gray-400 ltr:mr-3 rtl:ml-3" />
                                        <span className="text-sm text-gray-600 ltr:mr-2 rtl:ml-2">{t('provider_name')}:</span>
                                        <span className="font-medium">{provider.name}</span>
                                    </div>

                                    <div className="flex items-center">
                                        <IconMapPin className="w-5 h-5 text-gray-400 ltr:mr-3 rtl:ml-3" />
                                        <span className="text-sm text-gray-600 ltr:mr-2 rtl:ml-2">{t('provider_address')}:</span>
                                        <span className="font-medium">{provider.address}</span>
                                    </div>

                                    <div className="flex items-center">
                                        <IconPhone className="w-5 h-5 text-gray-400 ltr:mr-3 rtl:ml-3" />
                                        <span className="text-sm text-gray-600 ltr:mr-2 rtl:ml-2">{t('provider_phone')}:</span>
                                        <span className="font-medium">
                                            <a href={`tel:${provider.phone}`} className="text-primary hover:underline">
                                                {provider.phone}
                                            </a>
                                        </span>
                                    </div>

                                    <div className="flex items-center">
                                        <IconUser className="w-5 h-5 text-gray-400 ltr:mr-3 rtl:ml-3" />
                                        <span className="text-sm text-gray-600 ltr:mr-2 rtl:ml-2">{t('provider_id_number')}:</span>
                                        <span className="font-medium">{provider.id_number || '-'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Contact Information */}
                        <div className="panel">
                            <div className="mb-5">
                                <h3 className="text-lg font-semibold">{t('contact_information')}</h3>
                            </div>

                            <div className="space-y-4">
                                <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                    <div className="flex items-center">
                                        <IconPhone className="w-5 h-5 text-gray-400 ltr:mr-2 rtl:ml-2" />
                                        <span className="text-sm text-gray-600">{t('provider_phone')}:</span>
                                    </div>
                                    <a href={`tel:${provider.phone}`} className="font-semibold text-primary hover:underline">
                                        {provider.phone}
                                    </a>
                                </div>

                                <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                    <div className="flex items-center">
                                        <IconMapPin className="w-5 h-5 text-gray-400 ltr:mr-2 rtl:ml-2" />
                                        <span className="text-sm text-gray-600">{t('provider_address')}:</span>
                                    </div>
                                    <span className="font-semibold text-gray-700 dark:text-gray-300">{provider.address}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Additional Information */}
                    <div className="space-y-6">
                        <div className="panel">
                            <div className="mb-5">
                                <h3 className="text-lg font-semibold">{t('additional_information')}</h3>
                            </div>

                            <div className="space-y-3 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-600">{t('provider_id')}:</span>
                                    <span className="font-medium font-mono">{provider.id}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">{t('provider_id_number')}:</span>
                                    <span className="font-medium">{provider.id_number || '-'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">{t('created_at')}:</span>
                                    <span className="font-medium">
                                        {new Date(provider.created_at).toLocaleDateString('en-GB', {
                                            year: 'numeric',
                                            month: '2-digit',
                                            day: '2-digit',
                                        })}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Provider Summary */}
                        <div className="panel">
                            <div className="mb-5">
                                <h3 className="text-lg font-semibold">{t('provider_summary')}</h3>
                            </div>

                            <div className="space-y-3 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-600">{t('provider_name')}:</span>
                                    <span className="font-medium">{provider.name}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">{t('contact')}:</span>
                                    <span className="font-medium">{provider.phone}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">{t('provider_id_number')}:</span>
                                    <span className="font-medium">{provider.id_number || '-'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">{t('location')}:</span>
                                    <span className="font-medium">{provider.address}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-6">
                    <div className="panel border-white-light px-0 dark:border-[#1b2e4b]">
                        <div className="mb-4.5 flex flex-col gap-5 px-5 md:flex-row md:items-center">
                            <div className="flex items-center gap-2">
                                <h3 className="text-lg font-semibold">{t('bills')}</h3>
                            </div>
                        </div>

                        <div className="invoice-table" dir={isRtl ? 'rtl' : 'ltr'}>
                            <div className="datatables pagination-padding relative px-5 pb-5">
                                <DataTable
                                    records={providerDocs}
                                    columns={columns}
                                    highlightOnHover
                                    striped
                                    fetching={loadingRelations}
                                    minHeight={420}
                                    noRecordsText={t('no_records')}
                                />

                                {loadingRelations && <div className="absolute inset-0 z-10 flex items-center justify-center bg-white dark:bg-black-dark-light bg-opacity-60 backdrop-blur-sm" />}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProviderPreview;
