'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { DataTable, DataTableColumn, DataTableSortStatus } from 'mantine-datatable';
import supabase from '@/lib/supabase';
import Link from 'next/link';
import IconEye from '@/components/icon/icon-eye';
import IconCar from '@/components/icon/icon-car';
import { getTranslation } from '@/i18n';
import CarDealFilters, { CarDealFilters as CarDealFiltersType } from '@/components/car-deal-filters/car-deal-filters';

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
                    <Link href={`/car-deals/preview/${id}`} className="flex hover:text-info" title={t('view')}>
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
            title: t('source'),
            sortable: true,
            render: (car) => (
                <div className="flex flex-col">
                    <span className={`badge ${car.source_type === 'provider' ? 'badge-outline-primary' : 'badge-outline-success'}`}>{t(`source_type_${car.source_type}`)}</span>
                    <span className="text-xs text-gray-500 mt-1">{car.source_type === 'provider' ? car.provider?.name : car.source_customer?.name}</span>
                </div>
            ),
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
                if (status === 'sold') color = 'success';
                if (status === 'reserved') color = 'warning';
                return <span className={`badge badge-outline-${color}`}>{t(`car_status_${status}`)}</span>;
            },
        },
        {
            accessor: 'created_at',
            title: t('purchase_date'),
            sortable: true,
            render: ({ created_at }) => new Date(created_at).toLocaleDateString('he-IL'),
        },
    ];

    return (
        <div>
            <div className="mb-6 flex items-center justify-between">
                <h1 className="text-2xl font-bold">{t('car_deals')}</h1>
            </div>

            <div className="panel">
                <CarDealFilters onFilterChange={handleFilterChange} onClearFilters={handleClearFilters} />

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
            </div>
        </div>
    );
};

export default CarDealsPage;
