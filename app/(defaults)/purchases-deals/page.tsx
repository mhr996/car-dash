'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { DataTable, DataTableColumn, DataTableSortStatus } from 'mantine-datatable';
import supabase from '@/lib/supabase';
import Link from 'next/link';
import IconEye from '@/components/icon/icon-eye';
import IconCar from '@/components/icon/icon-car';
import IconFile from '@/components/icon/icon-file';
import { getTranslation } from '@/i18n';
import CarDealFilters, { CarDealFilters as CarDealFiltersType } from '@/components/car-deal-filters/car-deal-filters';
import { CarPurchaseContractPDFGenerator } from '@/utils/car-purchase-contract-pdf-generator';
import { CarContract } from '@/types/contract';
import { getCompanyInfo } from '@/lib/company-info';
import ViewToggle from '@/components/view-toggle/view-toggle';
import { PermissionGuard } from '@/components/auth/permission-guard';

interface Provider {
    id: number;
    name: string;
    phone?: string;
    address?: string;
}

interface Customer {
    id: number;
    name: string;
    phone?: string;
}

interface CarDeal {
    id: number;
    title: string;
    brand: string;
    year: number;
    buy_price: number;
    sale_price: number;
    kilometers: number;
    car_number?: string;
    status: string;
    source_type: string;
    created_at: string;
    provider?: Provider;
    source_customer?: Customer;
    contract_image?: string;
}

const CarDealsPage = () => {
    const { t } = getTranslation();
    const [page, setPage] = useState(1);
    const PAGE_SIZES = [10, 20, 30, 50, 100];
    const [pageSize, setPageSize] = useState(PAGE_SIZES[0]);
    const [initialRecords, setInitialRecords] = useState<CarDeal[]>([]);
    const [recordsData, setRecordsData] = useState<CarDeal[]>([]);
    const [filteredRecords, setFilteredRecords] = useState<CarDeal[]>([]);
    const [sortStatus, setSortStatus] = useState<DataTableSortStatus>({
        columnAccessor: 'created_at',
        direction: 'desc',
    });
    const [loading, setLoading] = useState(true);
    const [generatingPdf, setGeneratingPdf] = useState<number | null>(null);
    const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

    // Load view preference from localStorage
    useEffect(() => {
        const savedView = localStorage.getItem('purchasesDealsViewMode');
        if (savedView === 'grid' || savedView === 'list') {
            setViewMode(savedView);
        }
    }, []);

    // Save view preference when changed
    const handleViewChange = (view: 'list' | 'grid') => {
        setViewMode(view);
        localStorage.setItem('purchasesDealsViewMode', view);
    };

    const getCookie = (name: string) => {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop()?.split(';').shift();
        return null;
    };

    const handleGeneratePDF = async (car: CarDeal) => {
        try {
            setGeneratingPdf(car.id);
            const companyInfo = await getCompanyInfo();

            const contract: CarContract = {
                dealType: 'normal',
                dealDate: new Date(car.created_at).toLocaleDateString('he-IL'),
                companyName: companyInfo.name,
                companyTaxNumber: companyInfo.tax_number || '',
                companyAddress: companyInfo.address || '',
                companyPhone: companyInfo.phone || '',
                sellerName: car.source_type === 'provider' ? car.provider?.name || '' : car.source_customer?.name || '',
                sellerTaxNumber: '',
                sellerPhone: car.source_type === 'provider' ? car.provider?.phone || '' : car.source_customer?.phone || '',
                sellerAddress: car.source_type === 'provider' ? car.provider?.address || '' : '',
                buyerName: companyInfo.name,
                buyerId: companyInfo.tax_number || '',
                buyerAddress: companyInfo.address || '',
                buyerPhone: companyInfo.phone || '',
                carType: '',
                carMake: car.brand,
                carModel: car.title,
                carYear: car.year,
                carPlateNumber: car.car_number || '',
                carVin: '',
                carEngineNumber: '',
                carKilometers: car.kilometers,
                carBuyPrice: car.buy_price,
                dealAmount: car.buy_price,
                ownershipTransferDays: 30,
            };

            const lang = getCookie('i18nextLng') || 'he';
            const normalizedLang = lang.toLowerCase().split('-')[0] as 'en' | 'ar' | 'he';

            const carIdentifier = car.car_number || `CAR-${car.id}`;
            const filename = `car-purchase-contract-${carIdentifier}-${new Date().toISOString().split('T')[0]}.pdf`;

            await CarPurchaseContractPDFGenerator.generateFromContract(contract, {
                filename,
                language: normalizedLang,
                format: 'A4',
                orientation: 'portrait',
            });
        } catch (error) {
            console.error('Error generating PDF:', error);
            alert(t('error_generating_pdf'));
        } finally {
            setGeneratingPdf(null);
        }
    };

    useEffect(() => {
        fetchCarDeals();
    }, []);

    const fetchCarDeals = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('cars')
                .select(
                    `
                    id,
                    title,
                    brand,
                    year,
                    buy_price,
                    sale_price,
                    kilometers,
                    car_number,
                    status,
                    source_type,
                    created_at,
                    contract_image,
                    provider:providers(id, name, phone, address),
                    source_customer:customers!cars_source_customer_id_fkey(id, name, phone)
                `,
                )
                .order('created_at', { ascending: false });

            if (error) throw error;

            const processedData = (data || []).map((car: any) => ({
                ...car,
                provider: car.provider || null,
                source_customer: car.source_customer || null,
            }));

            setInitialRecords(processedData);
            setFilteredRecords(processedData);
        } catch (error) {
            console.error('Error fetching car deals:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        setPage(1);
    }, [pageSize]);

    // Memoize sorted data to prevent infinite loops
    const sortedRecords = useMemo(() => {
        const sorted = [...filteredRecords].sort((a, b) => {
            const accessor = sortStatus.columnAccessor as keyof CarDeal;
            const aValue = a[accessor];
            const bValue = b[accessor];

            if (aValue === null || aValue === undefined) return 1;
            if (bValue === null || bValue === undefined) return -1;

            if (typeof aValue === 'string' && typeof bValue === 'string') {
                return sortStatus.direction === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
            }

            if (typeof aValue === 'number' && typeof bValue === 'number') {
                return sortStatus.direction === 'asc' ? aValue - bValue : bValue - aValue;
            }

            return 0;
        });
        return sorted;
    }, [filteredRecords, sortStatus]);

    // Update displayed records based on pagination
    useEffect(() => {
        const from = (page - 1) * pageSize;
        const to = from + pageSize;
        setRecordsData(sortedRecords.slice(from, to));
    }, [page, pageSize, sortedRecords]);

    const sortData = (data: CarDeal[]) => {
        const sorted = [...data].sort((a, b) => {
            const accessor = sortStatus.columnAccessor as keyof CarDeal;
            const aValue = a[accessor];
            const bValue = b[accessor];

            if (aValue === null || aValue === undefined) return 1;
            if (bValue === null || bValue === undefined) return -1;

            if (typeof aValue === 'string' && typeof bValue === 'string') {
                return sortStatus.direction === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
            }

            if (typeof aValue === 'number' && typeof bValue === 'number') {
                return sortStatus.direction === 'asc' ? aValue - bValue : bValue - aValue;
            }

            return 0;
        });
        return sorted;
    };

    const handleFilterChange = useCallback(
        (filters: CarDealFiltersType) => {
            let filtered = [...initialRecords];

            // Search filter
            if (filters.search) {
                filtered = filtered.filter((car) => {
                    const searchLower = filters.search.toLowerCase();
                    return (
                        car.title?.toLowerCase().includes(searchLower) ||
                        car.brand?.toLowerCase().includes(searchLower) ||
                        car.car_number?.toLowerCase().includes(searchLower) ||
                        car.provider?.name?.toLowerCase().includes(searchLower) ||
                        car.source_customer?.name?.toLowerCase().includes(searchLower)
                    );
                });
            }

            // Source type filter
            if (filters.sourceType) {
                filtered = filtered.filter((car) => car.source_type === filters.sourceType);
            }

            // Status filter
            if (filters.status) {
                filtered = filtered.filter((car) => car.status === filters.status);
            }

            // Brand filter
            if (filters.brand) {
                filtered = filtered.filter((car) => car.brand === filters.brand);
            }

            // Year filter
            if (filters.yearFrom) {
                filtered = filtered.filter((car) => car.year >= parseInt(filters.yearFrom));
            }
            if (filters.yearTo) {
                filtered = filtered.filter((car) => car.year <= parseInt(filters.yearTo));
            }

            // Buy price filter
            if (filters.buyPriceFrom) {
                filtered = filtered.filter((car) => car.buy_price >= parseFloat(filters.buyPriceFrom));
            }
            if (filters.buyPriceTo) {
                filtered = filtered.filter((car) => car.buy_price <= parseFloat(filters.buyPriceTo));
            }

            // Date filter
            if (filters.dateFrom) {
                filtered = filtered.filter((car) => new Date(car.created_at) >= new Date(filters.dateFrom));
            }
            if (filters.dateTo) {
                filtered = filtered.filter((car) => new Date(car.created_at) <= new Date(filters.dateTo));
            }

            setFilteredRecords(filtered);
            setPage(1);
        },
        [initialRecords],
    );

    const handleClearFilters = useCallback(() => {
        setFilteredRecords(initialRecords);
        setPage(1);
    }, [initialRecords]);

    const columns: DataTableColumn<CarDeal>[] = [
        {
            accessor: 'id',
            title: t('id'),
            sortable: true,
            render: ({ id }) => (
                <div className="flex items-center gap-2">
                    <strong className="text-info">#{id}</strong>
                    <Link href={`/purchases-deals/preview/${id}`} className="flex hover:text-info" title={t('view')}>
                        <IconEye className="h-4 w-4" />
                    </Link>
                </div>
            ),
        },
        {
            accessor: 'brand',
            title: t('brand'),
            sortable: true,
            render: (car) => (
                <div className="flex items-center gap-2">
                    <IconCar className="h-4 w-4 text-primary" />
                    <div className="flex flex-col">
                        <span className="font-medium">{car.brand}</span>
                        <span className="text-xs text-gray-500">{car.title}</span>
                    </div>
                </div>
            ),
        },
        {
            accessor: 'year',
            title: t('year'),
            sortable: true,
        },
        {
            accessor: 'car_number',
            title: t('car_number'),
            sortable: true,
            render: ({ car_number }) => car_number || '-',
        },
        {
            accessor: 'source_type',
            title: t('source_type'),
            sortable: true,
            render: (car) => <span className={`badge ${car.source_type === 'provider' ? 'badge-outline-primary' : 'badge-outline-success'}`}>{t(`source_type_${car.source_type}`)}</span>,
        },
        {
            accessor: 'source_name',
            title: t('source_name'),
            sortable: true,
            render: (car) => <span className="text-sm">{car.source_type === 'provider' ? car.provider?.name : car.source_customer?.name}</span>,
        },
        {
            accessor: 'buy_price',
            title: t('buy_price'),
            sortable: true,
            render: ({ buy_price }) => <span className="font-medium">₪{buy_price?.toLocaleString() || '0'}</span>,
        },
        {
            accessor: 'sale_price',
            title: t('sale_price'),
            sortable: true,
            render: ({ sale_price }) => <span className="font-medium">₪{sale_price?.toLocaleString() || '0'}</span>,
        },
        {
            accessor: 'kilometers',
            title: t('kilometers'),
            sortable: true,
            render: ({ kilometers }) => `${kilometers?.toLocaleString() || '0'} ${t('km')}`,
        },
        {
            accessor: 'status',
            title: t('status'),
            sortable: true,
            render: ({ status }) => {
                let color = 'primary';
                if (status === 'new') color = 'success';
                if (status === 'used') color = 'info';
                return <span className={`badge badge-outline-${color}`}>{t(status)}</span>;
            },
        },
        {
            accessor: 'created_at',
            title: t('purchase_date'),
            sortable: true,
            render: ({ created_at }) => new Date(created_at).toLocaleDateString('he-IL'),
        },
        {
            accessor: 'actions',
            title: t('actions'),
            render: (car) => (
                <div className="flex items-center gap-2">
                    <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => handleGeneratePDF(car)} disabled={generatingPdf === car.id} title={t('generate_purchase_contract')}>
                        {generatingPdf === car.id ? (
                            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-primary border-l-transparent"></span>
                        ) : (
                            <IconFile className="h-4 w-4" />
                        )}
                    </button>
                </div>
            ),
        },
    ];

    return (
        <div>
            <div className="mb-6 flex items-center justify-between">
                <h1 className="text-2xl font-bold">{t('purchases_deals')}</h1>
                <ViewToggle view={viewMode} onViewChange={handleViewChange} />
            </div>

            <div className="panel">
                <CarDealFilters onFilterChange={handleFilterChange} onClearFilters={handleClearFilters} />

                {viewMode === 'list' ? (
                    <div className="datatables mt-6">
                        <DataTable
                            highlightOnHover
                            className="table-hover whitespace-nowrap"
                            records={recordsData}
                            columns={columns}
                            totalRecords={sortedRecords.length}
                            recordsPerPage={pageSize}
                            page={page}
                            onPageChange={(p) => setPage(p)}
                            recordsPerPageOptions={PAGE_SIZES}
                            onRecordsPerPageChange={setPageSize}
                            sortStatus={sortStatus}
                            onSortStatusChange={setSortStatus}
                            minHeight={200}
                            paginationText={({ from, to, totalRecords }) => `${t('showing')} ${from} ${t('to')} ${to} ${t('of')} ${totalRecords} ${t('entries')}`}
                            fetching={loading}
                        />
                    </div>
                ) : (
                    <div className="px-5 mt-6">
                        {loading ? (
                            <div className="flex items-center justify-center min-h-[300px]">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                                {recordsData.map((car) => (
                                    <div key={car.id} className="panel p-0 overflow-hidden hover:shadow-lg transition-shadow border border-gray-200 dark:border-blue-400/30">
                                        <div className="p-5">
                                            <div className="flex items-start justify-between mb-3">
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1 truncate">
                                                        {car.brand} {car.title}
                                                    </h3>
                                                    <p className="text-sm text-gray-500 dark:text-gray-400">#{car.id}</p>
                                                </div>
                                                <span
                                                    className={`badge ${car.status === 'new' ? 'badge-outline-success' : car.status === 'used' ? 'badge-outline-info' : 'badge-outline-primary'} flex-shrink-0 ml-2`}
                                                >
                                                    {t(car.status)}
                                                </span>
                                            </div>
                                            <div className="grid grid-cols-2 gap-3 mb-4">
                                                <div>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('year')}</p>
                                                    <p className="font-semibold text-sm">{car.year}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('car_number')}</p>
                                                    <p className="font-semibold text-sm truncate">{car.car_number || 'N/A'}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('kilometers')}</p>
                                                    <p className="font-semibold text-sm">
                                                        {car.kilometers?.toLocaleString() || '0'} {t('km')}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('source_type')}</p>
                                                    <span className={`badge ${car.source_type === 'provider' ? 'badge-outline-primary' : 'badge-outline-success'} text-xs`}>
                                                        {t(`source_type_${car.source_type}`)}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="border-t border-gray-200 dark:border-gray-700 pt-3 mb-4">
                                                <div className="mb-2">
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('source_name')}</p>
                                                    <p className="font-semibold text-sm truncate">{car.source_type === 'provider' ? car.provider?.name : car.source_customer?.name}</p>
                                                </div>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div>
                                                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('buy_price')}</p>
                                                        <p className="font-bold text-warning text-sm">₪{car.buy_price?.toLocaleString() || '0'}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('sale_price')}</p>
                                                        <p className="font-bold text-success text-sm">₪{car.sale_price?.toLocaleString() || '0'}</p>
                                                    </div>
                                                </div>
                                                <div className="mt-2">
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('purchase_date')}</p>
                                                    <p className="text-sm">{new Date(car.created_at).toLocaleDateString('he-IL')}</p>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <Link href={`/purchases-deals/preview/${car.id}`} className="btn btn-primary btn-sm flex-1 justify-center">
                                                    <IconEye className="w-4 h-4 ltr:mr-1 rtl:ml-1" />
                                                    {t('view')}
                                                </Link>
                                                <button
                                                    type="button"
                                                    className="btn btn-outline-primary btn-sm"
                                                    onClick={() => handleGeneratePDF(car)}
                                                    disabled={generatingPdf === car.id}
                                                    title={t('generate_purchase_contract')}
                                                >
                                                    {generatingPdf === car.id ? (
                                                        <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-primary border-l-transparent"></span>
                                                    ) : (
                                                        <IconFile className="w-4 h-4" />
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                        {!loading && recordsData.length === 0 && (
                            <div className="flex items-center justify-center min-h-[300px] text-gray-500 dark:text-gray-400">
                                <div className="text-center">
                                    <p className="text-lg font-semibold mb-2">{t('no_results_found')}</p>
                                    <p className="text-sm">{t('try_adjusting_filters')}</p>
                                </div>
                            </div>
                        )}
                        {!loading && recordsData.length > 0 && (
                            <div className="flex justify-between items-center mt-6 flex-wrap gap-4">
                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                    {t('showing')} {(page - 1) * pageSize + 1} {t('to')} {Math.min(page * pageSize, sortedRecords.length)} {t('of')} {sortedRecords.length} {t('entries')}
                                </div>
                                <div className="flex gap-2 flex-wrap">
                                    {Array.from({ length: Math.ceil(sortedRecords.length / pageSize) }, (_, i) => i + 1).map((pageNum) => (
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
        </div>
    );
};

const ProtectedPurchaseDealsPage = () => (
    <PermissionGuard permission="view_purchases_deals">
        <CarDealsPage />
    </PermissionGuard>
);

export default ProtectedPurchaseDealsPage;
