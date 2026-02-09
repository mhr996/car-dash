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
import { usePermissions } from '@/hooks/usePermissions';
import { PermissionGuard } from '@/components/auth/permission-guard';
import ViewToggle from '@/components/view-toggle/view-toggle';
import { CarPurchaseContractPDFGenerator } from '@/utils/car-purchase-contract-pdf-generator';
import { CarContract } from '@/types/contract';
import { getCompanyInfo } from '@/lib/company-info';
import IconFile from '@/components/icon/icon-file';

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
    source_customer_id?: number | null;
    source_customer?: {
        id: number;
        name: string;
        phone?: string;
    };
    deals?: Array<{
        id: number;
        title: string;
        deal_type: string;
        status: string;
        customer_name: string;
        created_at: string;
    }>;
}

type TabType = 'available' | 'archived';

const CarsList = () => {
    const { t } = getTranslation();
    const { hasPermission } = usePermissions();
    const [items, setItems] = useState<Car[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<TabType>('available');
    const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

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

    // Load view preference from localStorage
    useEffect(() => {
        const savedView = localStorage.getItem('carsViewMode');
        if (savedView === 'grid' || savedView === 'list') {
            setViewMode(savedView);
        }
    }, []);

    // Save view preference when changed
    const handleViewChange = (view: 'list' | 'grid') => {
        setViewMode(view);
        localStorage.setItem('carsViewMode', view);
    };

    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
    const [carToDelete, setCarToDelete] = useState<Car | null>(null);
    const [generatingPdf, setGeneratingPdf] = useState<string | null>(null);
    const [alert, setAlert] = useState<{ visible: boolean; message: string; type: 'success' | 'danger' }>({
        visible: false,
        message: '',
        type: 'success',
    });
    useEffect(() => {
        const fetchCars = async () => {
            try {
                const { data, error } = await supabase
                    .from('cars')
                    .select(
                        `
                        *, 
                        providers(id, name, address, phone),
                        source_customer:customers!cars_source_customer_id_fkey(id, name, phone),
                        deals!deals_car_id_fkey(id, title, deal_type, status, customer_name, created_at)
                    `,
                    )
                    .order('created_at', { ascending: false });

                if (error) throw error;

                setItems(data as Car[]);
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
                // Tab-based filtering: Available cars (no deals) vs Archived cars (has deals)
                const hasDeals = item.deals && item.deals.length > 0;
                const matchesTab = activeTab === 'available' ? !hasDeals : hasDeals;

                if (!matchesTab) return false;

                // Search filter (now using filters.search instead of search)
                const searchTerm = filters.search.toLowerCase();
                const matchesSearch =
                    !searchTerm ||
                    item.title?.toLowerCase().includes(searchTerm) ||
                    item.brand?.toLowerCase().includes(searchTerm) ||
                    item.status?.toLowerCase().includes(searchTerm) ||
                    item.providers?.name?.toLowerCase().includes(searchTerm) ||
                    item.year?.toString().includes(searchTerm) ||
                    item.car_number?.toLowerCase().includes(searchTerm);

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
    }, [items, filters, activeTab]);

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

    const getCookie = (name: string) => {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop()?.split(';').shift();
        return null;
    };

    const handleGeneratePDF = async (car: Car) => {
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
                sellerName: car.providers?.name || '',
                sellerTaxNumber: '',
                sellerPhone: car.providers?.phone || '',
                sellerAddress: car.providers?.address || '',
                buyerName: companyInfo.name,
                buyerId: companyInfo.tax_number || '',
                buyerAddress: companyInfo.address || '',
                buyerPhone: companyInfo.phone || '',
                carType: car.type || '',
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
            setAlert({ visible: true, message: t('error_generating_pdf'), type: 'danger' });
        } finally {
            setGeneratingPdf(null);
        }
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

    // Helper function to get image URL
    const getImageUrl = (imagePath: string) => {
        if (!imagePath) return `/assets/images/img-placeholder-fallback.webp`;
        const { data } = supabase.storage.from('cars').getPublicUrl(imagePath);
        return data.publicUrl;
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

            {/* Tab Navigation */}
            <div className="mb-5 px-5">
                <div className="border-b border-[#ebedf2] dark:border-[#191e3a]">
                    <ul className="flex flex-wrap">
                        <li className="mx-2">
                            <button
                                type="button"
                                className={`flex items-center gap-2 p-4 text-sm font-medium ${
                                    activeTab === 'available' ? 'border-b-2 border-primary text-primary' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                                }`}
                                onClick={() => setActiveTab('available')}
                            >
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path
                                        fillRule="evenodd"
                                        d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm2 6a2 2 0 100-4 2 2 0 000 4zm6 4a2 2 0 100-4 2 2 0 000 4z"
                                        clipRule="evenodd"
                                    />
                                </svg>
                                {t('available_cars')}
                                <span className="badge bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300">{items.filter((car) => !car.deals || car.deals.length === 0).length}</span>
                            </button>
                        </li>
                        <li className="mx-2">
                            <button
                                type="button"
                                className={`flex items-center gap-2 p-4 text-sm font-medium ${
                                    activeTab === 'archived' ? 'border-b-2 border-primary text-primary' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                                }`}
                                onClick={() => setActiveTab('archived')}
                            >
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M4 3a2 2 0 100 4h12a2 2 0 100-4H4z" />
                                    <path fillRule="evenodd" d="M3 8h14v7a2 2 0 01-2 2H5a2 2 0 01-2-2V8zm5 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" clipRule="evenodd" />
                                </svg>
                                {t('archived_cars')}
                                <span className="badge bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300">{items.filter((car) => car.deals && car.deals.length > 0).length}</span>
                            </button>
                        </li>
                    </ul>
                </div>
            </div>
            <div className="invoice-table">
                <div className="mb-4.5 flex flex-wrap items-start justify-between gap-4 px-5">
                    <div className="flex items-center gap-2">
                        <ViewToggle view={viewMode} onViewChange={handleViewChange} />
                    </div>
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

                {viewMode === 'list' ? (
                    <div className="datatables pagination-padding relative">
                        <DataTable
                            className={`${loading ? 'filter blur-sm pointer-events-none' : 'table-hover whitespace-nowrap'} rtl-table-headers`}
                            records={records}
                            columns={[
                                {
                                    accessor: 'id',
                                    title: t('id'),
                                    sortable: false,
                                    render: ({ id }, index) => (
                                        <div className="flex items-center gap-2">
                                            <strong className="text-info">#{initialRecords.length - ((page - 1) * pageSize + index)}</strong>
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
                                    accessor: 'type',
                                    title: t('car_type'),
                                    sortable: true,
                                    render: ({ type }) => <span className="capitalize">{type || 'N/A'}</span>,
                                },
                                {
                                    accessor: 'kilometers',
                                    title: t('kilometers'),
                                    sortable: true,
                                    render: ({ kilometers }) => <span>{formatNumber(kilometers)}</span>,
                                },
                                {
                                    accessor: 'car_number',
                                    title: t('car_number'),
                                    sortable: true,
                                    render: ({ car_number }) => <span>{car_number || 'N/A'}</span>,
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
                                    render: ({ providers, source_customer, provider }) => <span>{providers?.name || source_customer?.name || provider || '-'}</span>,
                                },
                                {
                                    accessor: 'market_price',
                                    title: t('market_price'),
                                    sortable: true,
                                    render: ({ market_price }) => <span>{formatCurrency(market_price)}</span>,
                                },
                                ...(hasPermission('view_car_purchase_price')
                                    ? [
                                          {
                                              accessor: 'buy_price',
                                              title: t('buy_price'),
                                              sortable: true,
                                              render: (car: Car) => <span>{formatCurrency(car.buy_price)}</span>,
                                          },
                                      ]
                                    : []),
                                // Conditional column for archived cars - Deal information
                                ...(activeTab === 'archived'
                                    ? [
                                          {
                                              accessor: 'deals',
                                              title: t('deal_info'),
                                              sortable: false,
                                              render: (car: Car) => {
                                                  if (!car.deals || car.deals.length === 0) return <span className="text-gray-400">-</span>;
                                                  const deal = car.deals[0]; // Show the first deal
                                                  return (
                                                      <div className="text-sm">
                                                          <div className="font-medium">{deal.title}</div>
                                                          <div className="text-gray-500">{deal.customer_name}</div>
                                                          <div className="text-xs text-gray-400">{new Date(deal.created_at).toLocaleDateString()}</div>
                                                      </div>
                                                  );
                                              },
                                          },
                                      ]
                                    : []),
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
                                // Only show public toggle for available cars, not archived cars
                                ...(activeTab === 'available'
                                    ? [
                                          {
                                              accessor: 'public',
                                              title: t('public'),
                                              sortable: true,
                                              textAlignment: 'center' as const,
                                              render: (car: Car) => (
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
                                      ]
                                    : []),
                                {
                                    accessor: 'action',
                                    title: t('actions'),
                                    sortable: false,
                                    textAlignment: 'center' as const,
                                    render: (car: Car) => (
                                        <div className="mx-auto flex w-max items-center gap-4">
                                            {hasPermission('view_car_purchase_price') && (
                                                <button
                                                    type="button"
                                                    className="flex hover:text-primary"
                                                    onClick={() => handleGeneratePDF(car)}
                                                    disabled={generatingPdf === car.id}
                                                    title={t('generate_purchase_contract')}
                                                >
                                                    {generatingPdf === car.id ? (
                                                        <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-primary border-l-transparent"></span>
                                                    ) : (
                                                        <IconFile className="h-4.5 w-4.5" />
                                                    )}
                                                </button>
                                            )}
                                            <Link href={`/cars/edit/${car.id}`} className="flex hover:text-info">
                                                <IconEdit className="h-4.5 w-4.5" />
                                            </Link>
                                            <button type="button" className="flex hover:text-danger" onClick={() => deleteRow(car.id)}>
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
                                {records.map((car) => {
                                    let imageList = [];
                                    imageList = typeof car.images === 'string' ? JSON.parse(car.images || '[]') : car.images || [];

                                    return (
                                        <div key={car.id} className="panel p-0 overflow-hidden hover:shadow-lg transition-shadow border border-gray-200 dark:border-blue-400/30">
                                            <div className="relative h-48 overflow-hidden">
                                                <img
                                                    src={imageList[0] ? getImageUrl(imageList[0]) : `/assets/images/img-placeholder-fallback.webp`}
                                                    alt={car.title}
                                                    className="w-full h-full object-cover"
                                                />
                                                <div className="absolute top-2 right-2 flex gap-2">
                                                    <span
                                                        className={`badge ${
                                                            car.status === 'new'
                                                                ? 'badge-outline-success'
                                                                : car.status === 'used'
                                                                  ? 'badge-outline-info'
                                                                  : car.status === 'received_from_client'
                                                                    ? 'badge-outline-warning'
                                                                    : 'badge-outline-secondary'
                                                        } bg-white dark:bg-gray-800`}
                                                    >
                                                        {t(`car_status`)} {car.status}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="p-5">
                                                <div className="flex items-start justify-between mb-3">
                                                    <div className="flex-1 min-w-0">
                                                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1 truncate">{car.title}</h3>
                                                        <p className="text-sm text-gray-500 dark:text-gray-400">#{car.id}</p>
                                                    </div>
                                                    {activeTab === 'available' && (
                                                        <label className="w-12 h-6 relative flex-shrink-0 ml-2">
                                                            <input
                                                                type="checkbox"
                                                                className="custom_switch absolute w-full h-full opacity-0 z-10 cursor-pointer peer"
                                                                checked={car.public || false}
                                                                onChange={() => togglePublicStatus(car)}
                                                            />
                                                            <span className="bg-[#ebedf2] dark:bg-dark block h-full rounded-full before:absolute before:left-1 before:bg-white dark:before:bg-white-dark dark:peer-checked:before:bg-white before:bottom-1 before:w-4 before:h-4 before:rounded-full peer-checked:before:left-7 peer-checked:bg-primary before:transition-all before:duration-300"></span>
                                                        </label>
                                                    )}
                                                </div>
                                                <div className="grid grid-cols-2 gap-3 mb-4">
                                                    <div>
                                                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('brand')}</p>
                                                        <p className="font-semibold text-sm">{car.brand}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('year')}</p>
                                                        <p className="font-semibold text-sm">{car.year}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('car_type')}</p>
                                                        <p className="font-semibold text-sm capitalize">{car.type || 'N/A'}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('kilometers')}</p>
                                                        <p className="font-semibold text-sm">{formatNumber(car.kilometers)}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('car_number')}</p>
                                                        <p className="font-semibold text-sm truncate">{car.car_number || 'N/A'}</p>
                                                    </div>
                                                </div>
                                                <div className="border-t border-gray-200 dark:border-gray-700 pt-3 mb-4">
                                                    <div className={`grid ${hasPermission('view_car_purchase_price') ? 'grid-cols-2' : 'grid-cols-1'} gap-3`}>
                                                        <div>
                                                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('market_price')}</p>
                                                            <p className="font-bold text-success text-sm">{formatCurrency(car.market_price)}</p>
                                                        </div>
                                                        {hasPermission('view_car_purchase_price') && (
                                                            <div>
                                                                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('buy_price')}</p>
                                                                <p className="font-bold text-warning text-sm">{formatCurrency(car.buy_price)}</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex gap-2">
                                                    <Link href={`/cars/preview/${car.id}`} className="btn btn-primary btn-sm flex-1 justify-center">
                                                        <IconEye className="w-4 h-4 ltr:mr-1 rtl:ml-1" />
                                                        {t('view')}
                                                    </Link>
                                                    {hasPermission('view_car_purchase_price') && (
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
                                                    )}
                                                    <Link href={`/cars/edit/${car.id}`} className="btn btn-info btn-sm">
                                                        <IconEdit className="w-4 h-4" />
                                                    </Link>
                                                    <button type="button" className="btn btn-danger btn-sm" onClick={() => deleteRow(car.id)}>
                                                        <IconTrashLines className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
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

const CarsPage = () => (
    <PermissionGuard permission="view_cars">
        <CarsList />
    </PermissionGuard>
);

export default CarsPage;
