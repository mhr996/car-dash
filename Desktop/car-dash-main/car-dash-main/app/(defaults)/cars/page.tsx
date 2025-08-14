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
import { logActivity } from '@/utils/activity-logger';
import CarFilters, { CarFilters as CarFiltersType } from '@/components/car-filters/car-filters';

interface Car {
    id: string;
    created_at: string;
    title: string;
    year: number;
    status: string;
    market_price: number;
    buy_price: number;
    sale_price: number;
    kilometers: number;
    provider: number; // This is an ID reference to the provider
    brand: string;
    public: boolean;
    type: string; // "new" or "used"
    car_number?: string; // Car license plate number
    desc?: string;
    features?: Array<{ label: string; value: string }>;
    colors?: any;
    images: string | string[]; // Can be string "[]" or actual array
    show_in_sales?: boolean;
    show_in_featured?: boolean;
    show_in_new_car?: boolean;
    show_in_used_car?: boolean;
    show_in_luxery_car?: boolean;
    providers?: {
        id: number;
        name: string;
        address: string;
        phone: string;
    };
}

const CarsList = () => {
    const { t } = getTranslation();
    const [items, setItems] = useState<Car[]>([]);
    const [loading, setLoading] = useState(true);

    const [page, setPage] = useState(1);
    const PAGE_SIZES = [10, 20, 30, 50, 100];
    const [pageSize, setPageSize] = useState(PAGE_SIZES[0]);
    const [initialRecords, setInitialRecords] = useState<Car[]>([]);
    const [records, setRecords] = useState<Car[]>([]);
    const [selectedRecords, setSelectedRecords] = useState<Car[]>([]);

    const [search, setSearch] = useState('');
    const [filters, setFilters] = useState<CarFiltersType>({
        search: '',
        brand: '',
        provider: '',
        status: '',
        yearFrom: '',
        yearTo: '',
        priceFrom: '',
        priceTo: '',
        dateFrom: '',
        dateTo: '',
        publicStatus: '',
    });
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
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
    const [carToDelete, setCarToDelete] = useState<Car | null>(null);
    const [alert, setAlert] = useState<{ visible: boolean; message: string; type: 'success' | 'danger' }>({
        visible: false,
        message: '',
        type: 'success',
    });
    useEffect(() => {
        const fetchCars = async () => {
            try {
                const { data, error } = await supabase.from('cars').select('*, providers(id, name, address, phone)').order('created_at', { ascending: false });
                if (error) throw error;

                setItems(data as Car[]);
                console.log('Fetched cars:', data);
            } catch (error) {
                console.error('Error fetching cars:', error);
                setAlert({ visible: true, message: t('error_loading_data'), type: 'danger' });
            } finally {
                setLoading(false);
            }
        };
        fetchCars();
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
                // Search filter (now using filters.search instead of search)
                const searchTerm = filters.search.toLowerCase();
                const matchesSearch =
                    !searchTerm ||
                    item.title.toLowerCase().includes(searchTerm) ||
                    item.brand.toLowerCase().includes(searchTerm) ||
                    item.status.toLowerCase().includes(searchTerm) ||
                    item.providers?.name.toLowerCase().includes(searchTerm) ||
                    item.year.toString().includes(searchTerm) ||
                    (item.car_number && item.car_number.toLowerCase().includes(searchTerm));

                // Brand filter - exact match since brand is stored as exact string
                const matchesBrand = !filters.brand || item.brand.toLowerCase() === filters.brand.toLowerCase();

                // Provider filter - can search by provider name from the relation
                const matchesProvider = !filters.provider || (item.providers?.name && item.providers.name.toLowerCase().includes(filters.provider.toLowerCase()));

                // Status filter - exact match since status has specific values
                const matchesStatus = !filters.status || item.status.toLowerCase() === filters.status.toLowerCase();

                // Year range filter
                const matchesYearFrom = !filters.yearFrom || item.year >= parseInt(filters.yearFrom);
                const matchesYearTo = !filters.yearTo || item.year <= parseInt(filters.yearTo);

                // Price range filter - using market_price since that's the main display price
                const price = item.market_price || 0;
                const matchesPriceFrom = !filters.priceFrom || price >= parseFloat(filters.priceFrom);
                const matchesPriceTo = !filters.priceTo || price <= parseFloat(filters.priceTo);

                // Date range filter
                const itemDate = new Date(item.created_at);
                const matchesDateFrom = !filters.dateFrom || itemDate >= new Date(filters.dateFrom);
                const matchesDateTo = !filters.dateTo || itemDate <= new Date(filters.dateTo + 'T23:59:59');

                // Public status filter - boolean field
                const matchesPublicStatus = !filters.publicStatus || (filters.publicStatus === 'true' ? item.public === true : item.public === false);

                return (
                    matchesSearch &&
                    matchesBrand &&
                    matchesProvider &&
                    matchesStatus &&
                    matchesYearFrom &&
                    matchesYearTo &&
                    matchesPriceFrom &&
                    matchesPriceTo &&
                    matchesDateFrom &&
                    matchesDateTo &&
                    matchesPublicStatus
                );
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
            const car = items.find((c) => c.id === id);
            if (car) {
                setCarToDelete(car);
                setShowConfirmModal(true);
            }
        }
    };
    const confirmDeletion = async () => {
        if (!carToDelete) return;
        try {
            // Log the activity before deletion (to preserve car data)
            await logActivity({
                type: 'car_deleted',
                car: carToDelete,
            });

            // Delete images from storage first
            if (carToDelete.images?.length) {
                // Parse images if it's a string, otherwise use as array
                const imageList = typeof carToDelete.images === 'string' ? JSON.parse(carToDelete.images || '[]') : carToDelete.images || [];

                if (imageList.length > 0) {
                    const { error: storageError } = await supabase.storage.from('cars').remove(imageList);
                    if (storageError) {
                        console.error('Error deleting images:', storageError);
                        // Continue with car deletion even if image deletion fails
                    }
                }
            }

            // Delete car record
            const { error } = await supabase.from('cars').delete().eq('id', carToDelete.id);
            if (error) throw error;

            const updatedItems = items.filter((c) => c.id !== carToDelete.id);
            setItems(updatedItems);
            setAlert({ visible: true, message: t('car_deleted_successfully'), type: 'success' });
        } catch (error) {
            console.error('Deletion error:', error);
            setAlert({ visible: true, message: t('error_deleting_car'), type: 'danger' });
        } finally {
            setShowConfirmModal(false);
            setCarToDelete(null);
        }
    };
    const handleBulkDelete = () => {
        if (selectedRecords.length === 0) return;
        setShowBulkDeleteModal(true);
    };

    const confirmBulkDeletion = async () => {
        const ids = selectedRecords.map((c) => c.id);
        try {
            // First, delete all images for the selected cars
            for (const car of selectedRecords) {
                if (car.images) {
                    // Parse images if it's a string, otherwise use as array
                    const imageList = typeof car.images === 'string' ? JSON.parse(car.images || '[]') : car.images || [];

                    if (imageList.length > 0) {
                        const { error: storageError } = await supabase.storage.from('cars').remove(imageList);
                        if (storageError) {
                            console.error('Error deleting images for car:', car.id, storageError);
                            // Continue with deletion even if image deletion fails
                        }
                    }
                }
            }

            // Delete car records
            const { error } = await supabase.from('cars').delete().in('id', ids);
            if (error) throw error;

            setItems(items.filter((c) => !ids.includes(c.id)));
            setSelectedRecords([]);
            setAlert({ visible: true, message: t('cars_deleted_successfully'), type: 'success' });
        } catch (error) {
            console.error('Error deleting cars:', error);
            setAlert({ visible: true, message: t('error_deleting_car'), type: 'danger' });
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

    const formatNumber = (value: number) => {
        return new Intl.NumberFormat('en-US').format(value);
    };

    const togglePublicStatus = async (car: Car) => {
        try {
            const newPublicStatus = !car.public;
            const { error } = await supabase.from('cars').update({ public: newPublicStatus }).eq('id', car.id);

            if (error) throw error;

            // Update the local state
            setItems((prevItems) => prevItems.map((item) => (item.id === car.id ? { ...item, public: newPublicStatus } : item)));

            setAlert({
                visible: true,
                message: newPublicStatus ? t('car_made_public') : t('car_made_private'),
                type: 'success',
            });
        } catch (error) {
            console.error('Error updating car public status:', error);
            setAlert({
                visible: true,
                message: t('error_updating_car_visibility'),
                type: 'danger',
            });
        }
    };

    const handleFilterChange = (newFilters: CarFiltersType) => {
        setFilters(newFilters);
        // Update search state to keep compatibility with existing search input
        setSearch(newFilters.search);
    };

    const handleClearFilters = () => {
        const clearedFilters: CarFiltersType = {
            search: '',
            brand: '',
            provider: '',
            status: '',
            yearFrom: '',
            yearTo: '',
            priceFrom: '',
            priceTo: '',
            dateFrom: '',
            dateTo: '',
            publicStatus: '',
        };
        setFilters(clearedFilters);
        setSearch('');
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
                        <Link href="/cars/add" className="btn btn-primary gap-2">
                            <IconPlus />
                            {t('add_new')}
                        </Link>
                    </div>
                    <div className="flex-grow">
                        <CarFilters onFilterChange={handleFilterChange} onClearFilters={handleClearFilters} />
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
                                        <Link href={`/cars/preview/${id}`} className="flex hover:text-info" title={t('view')}>
                                            <IconEye className="h-4 w-4" />
                                        </Link>
                                    </div>
                                ),
                            },
                            {
                                accessor: 'title',
                                title: t('car_title'),
                                sortable: true,
                                render: ({ title, images }) => {
                                    let imageList = [];
                                    imageList = typeof images === 'string' ? JSON.parse(images || '[]') : images || [];

                                    // Convert relative path to full Supabase URL
                                    const getImageUrl = (imagePath: string) => {
                                        if (!imagePath) return `/assets/images/img-placeholder-fallback.webp`;
                                        const { data } = supabase.storage.from('cars').getPublicUrl(imagePath);
                                        return data.publicUrl;
                                    };

                                    return (
                                        <div className="flex items-center font-semibold">
                                            <div className="w-max rounded-full ltr:mr-2 rtl:ml-2">
                                                <img
                                                    className="h-8 w-8 rounded-md object-cover"
                                                    src={imageList[0] ? getImageUrl(imageList[0]) : `/assets/images/img-placeholder-fallback.webp`}
                                                    alt={title}
                                                />
                                            </div>
                                            <div>{title}</div>
                                        </div>
                                    );
                                },
                            },
                            {
                                accessor: 'brand',
                                title: t('brand'),
                                sortable: true,
                            },
                            {
                                accessor: 'year',
                                title: t('year'),
                                sortable: true,
                            },
                            {
                                accessor: 'status',
                                title: t('car_status'),
                                sortable: true,
                                render: ({ status }) => (
                                    <span
                                        className={`badge ${
                                            status === 'new'
                                                ? 'badge-outline-success'
                                                : status === 'used'
                                                  ? 'badge-outline-info'
                                                  : status === 'received_from_client'
                                                    ? 'badge-outline-warning'
                                                    : 'badge-outline-secondary'
                                        }`}
                                    >
                                        {t(status)}
                                    </span>
                                ),
                            },
                            {
                                accessor: 'provider',
                                title: t('provider'),
                                sortable: true,
                                render: ({ providers, provider }) => <span>{providers?.name || provider || '-'}</span>,
                            },
                            {
                                accessor: 'sale_price',
                                title: t('sale_price'),
                                sortable: true,
                                render: ({ market_price }) => <span>{formatCurrency(market_price)}</span>,
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
                                accessor: 'public',
                                title: t('public'),
                                sortable: true,
                                textAlignment: 'center',
                                render: (car) => (
                                    <div className="flex justify-center">
                                        <label className="w-12 h-6 relative">
                                            <input
                                                type="checkbox"
                                                className="custom_switch absolute w-full h-full opacity-0 z-10 cursor-pointer peer"
                                                checked={car.public || false}
                                                onChange={() => togglePublicStatus(car)}
                                            />
                                            <span className="bg-[#ebedf2] dark:bg-dark block h-full rounded-full before:absolute before:left-1 before:bg-white dark:before:bg-white-dark dark:peer-checked:before:bg-white before:bottom-1 before:w-4 before:h-4 before:rounded-full peer-checked:before:left-7 peer-checked:bg-primary before:transition-all before:duration-300"></span>
                                        </label>
                                    </div>
                                ),
                            },
                            {
                                accessor: 'action',
                                title: t('actions'),
                                sortable: false,
                                textAlignment: 'center',
                                render: ({ id }) => (
                                    <div className="mx-auto flex w-max items-center gap-4">
                                        <Link href={`/cars/edit/${id}`} className="flex hover:text-info">
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
                message={t('confirm_delete_car')}
                onCancel={() => {
                    setShowConfirmModal(false);
                    setCarToDelete(null);
                }}
                onConfirm={confirmDeletion}
                confirmLabel={t('delete')}
                cancelLabel={t('cancel')}
                size="sm"
            />
        </div>
    );
};

export default CarsList;
