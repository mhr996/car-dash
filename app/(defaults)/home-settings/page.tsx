'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import supabase from '@/lib/supabase';
import { Alert } from '@/components/elements/alerts/elements-alerts-default';
import { getTranslation } from '@/i18n';
import CarSelect from '@/components/car-select/car-select';
import IconHome from '@/components/icon/icon-home';
import IconTrendingUp from '@/components/icon/icon-trending-up';
import IconStar from '@/components/icon/icon-star';
import IconCar from '@/components/icon/icon-car';
import IconDiamond from '@/components/icon/icon-diamond';
import IconTrash from '@/components/icon/icon-trash';
import IconPlus from '@/components/icon/icon-plus';
import IconSearch from '@/components/icon/icon-search';
import { PermissionGuard } from '@/components/auth/permission-guard';

interface Car {
    id: string;
    title: string;
    year: number;
    brand: string;
    status: string;
    type?: string;
    provider?: string | null;
    kilometers: number;
    market_price: number;
    buy_price: number;
    sale_price: number;
    images: string[] | string;
    show_in_sales?: boolean;
    show_in_featured?: boolean;
    show_in_new_car?: boolean;
    show_in_used_car?: boolean;
    show_in_luxery_car?: boolean;
}

type TabType = 'hot_sales' | 'featured' | 'new_cars' | 'used_cars' | 'luxury_cars';

const HomePageSettings = () => {
    const { t } = getTranslation();
    const router = useRouter();

    const [activeTab, setActiveTab] = useState<TabType>('hot_sales');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Cars data for each tab
    const [hotSalesCars, setHotSalesCars] = useState<Car[]>([]);
    const [featuredCars, setFeaturedCars] = useState<Car[]>([]);
    const [newCars, setNewCars] = useState<Car[]>([]);
    const [usedCars, setUsedCars] = useState<Car[]>([]);
    const [luxuryCars, setLuxuryCars] = useState<Car[]>([]);

    // Available cars for selection
    const [availableCars, setAvailableCars] = useState<Car[]>([]);

    // Selected car for adding
    const [selectedCarToAdd, setSelectedCarToAdd] = useState<Car | null>(null);

    const [alert, setAlert] = useState<{ visible: boolean; message: string; type: 'success' | 'danger' }>({
        visible: false,
        message: '',
        type: 'success',
    });

    // Tab configuration
    const tabs = [
        {
            id: 'hot_sales' as TabType,
            label: t('hot_sales'),
            icon: IconTrendingUp,
            color: 'text-red-500',
            bgColor: 'bg-red-50 dark:bg-red-900/20',
            borderColor: 'border-red-200 dark:border-red-800',
            dbField: 'show_in_sales',
            cars: hotSalesCars,
            setCars: setHotSalesCars,
        },
        {
            id: 'featured' as TabType,
            label: t('featured'),
            icon: IconStar,
            color: 'text-yellow-500',
            bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
            borderColor: 'border-yellow-200 dark:border-yellow-800',
            dbField: 'show_in_featured',
            cars: featuredCars,
            setCars: setFeaturedCars,
        },
        {
            id: 'new_cars' as TabType,
            label: t('new_cars'),
            icon: IconCar,
            color: 'text-green-500',
            bgColor: 'bg-green-50 dark:bg-green-900/20',
            borderColor: 'border-green-200 dark:border-green-800',
            dbField: 'show_in_new_car',
            cars: newCars,
            setCars: setNewCars,
        },
        {
            id: 'used_cars' as TabType,
            label: t('used_cars'),
            icon: IconCar,
            color: 'text-blue-500',
            bgColor: 'bg-blue-50 dark:bg-blue-900/20',
            borderColor: 'border-blue-200 dark:border-blue-800',
            dbField: 'show_in_used_car',
            cars: usedCars,
            setCars: setUsedCars,
        },
        {
            id: 'luxury_cars' as TabType,
            label: t('luxury_cars'),
            icon: IconDiamond,
            color: 'text-purple-500',
            bgColor: 'bg-purple-50 dark:bg-purple-900/20',
            borderColor: 'border-purple-200 dark:border-purple-800',
            dbField: 'show_in_luxery_car',
            cars: luxuryCars,
            setCars: setLuxuryCars,
        },
    ];

    const currentTab = tabs.find((tab) => tab.id === activeTab);

    useEffect(() => {
        loadCars();
    }, []);

    const loadCars = async () => {
        try {
            setLoading(true);

            // Load all cars
            const { data: allCars, error: allCarsError } = await supabase.from('cars').select('*').order('created_at', { ascending: false });

            if (allCarsError) throw allCarsError;

            console.log('All Cars:', allCars);

            setAvailableCars(allCars || []);

            // Separate cars into their respective categories
            const hotSales = (allCars || []).filter((car) => car.show_in_sales);
            const featured = (allCars || []).filter((car) => car.show_in_featured);
            const newCarsData = (allCars || []).filter((car) => car.show_in_new_car);
            const usedCarsData = (allCars || []).filter((car) => car.show_in_used_car);
            const luxuryData = (allCars || []).filter((car) => car.show_in_luxery_car);

            setHotSalesCars(hotSales);
            setFeaturedCars(featured);
            setNewCars(newCarsData);
            setUsedCars(usedCarsData);
            setLuxuryCars(luxuryData);
        } catch (error) {
            console.error('Error loading cars:', error);
            setAlert({
                visible: true,
                message: error instanceof Error ? error.message : t('error_loading_cars'),
                type: 'danger',
            });
        } finally {
            setLoading(false);
        }
    };

    const addCarToTab = async (car: Car) => {
        if (!currentTab) return;

        try {
            setSaving(true);

            // Update the car in the database
            const updateData = { [currentTab.dbField]: true };
            const { error } = await supabase.from('cars').update(updateData).eq('id', car.id);

            if (error) throw error;

            // Update local state
            const updatedCar = { ...car, [currentTab.dbField]: true };
            currentTab.setCars((prev) => [...prev, updatedCar]);

            // Update available cars list
            setAvailableCars((prev) => prev.map((c) => (c.id === car.id ? updatedCar : c)));

            setSelectedCarToAdd(null);
            setAlert({
                visible: true,
                message: t('car_added_successfully'),
                type: 'success',
            });
        } catch (error) {
            console.error('Error adding car:', error);
            setAlert({
                visible: true,
                message: error instanceof Error ? error.message : t('error_adding_car'),
                type: 'danger',
            });
        } finally {
            setSaving(false);
        }
    };

    const removeCarFromTab = async (carId: string) => {
        if (!currentTab) return;

        try {
            setSaving(true);

            // Update the car in the database
            const updateData = { [currentTab.dbField]: false };
            const { error } = await supabase.from('cars').update(updateData).eq('id', carId);

            if (error) throw error;

            // Update local state
            currentTab.setCars((prev) => prev.filter((car) => car.id !== carId));

            // Update available cars list
            setAvailableCars((prev) => prev.map((c) => (c.id === carId ? { ...c, [currentTab.dbField]: false } : c)));

            setAlert({
                visible: true,
                message: t('car_removed_successfully'),
                type: 'success',
            });
        } catch (error) {
            console.error('Error removing car:', error);
            setAlert({
                visible: true,
                message: error instanceof Error ? error.message : t('error_removing_car'),
                type: 'danger',
            });
        } finally {
            setSaving(false);
        }
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'ILS',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(value);
    };
    const getCarImage = (car: Car) => {
        // Parse images array properly
        let imagesList: string[] = [];
        if (Array.isArray(car.images)) {
            imagesList = car.images;
        } else if (typeof car.images === 'string' && car.images) {
            try {
                imagesList = JSON.parse(car.images);
            } catch {
                imagesList = [];
            }
        }

        // Get the first image (thumbnail) if available
        if (imagesList.length > 0 && imagesList[0]) {
            const { data } = supabase.storage.from('cars').getPublicUrl(imagesList[0]);
            return data.publicUrl;
        }

        // Return null if no image - we'll handle this in the component
        return null;
    };

    if (loading) {
        return (
            <div className="container mx-auto p-6">
                <div className="flex items-center justify-center min-h-[400px]">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-6">
            {/* Header */}
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
                        <span>{t('home_page_settings')}</span>
                    </li>
                </ul>
            </div>

            <div className="mb-6">
                <div className="flex items-center gap-3 mb-2">
                    <IconHome className="w-8 h-8 text-primary" />
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('home_page_settings')}</h1>
                </div>
                <p className="text-gray-600 dark:text-gray-400">{t('home_page_settings_description')}</p>
            </div>

            {alert.visible && (
                <div className="mb-6">
                    <Alert
                        type={alert.type}
                        title={alert.type === 'success' ? t('success') : t('error')}
                        message={alert.message}
                        onClose={() => setAlert({ visible: false, message: '', type: 'success' })}
                    />
                </div>
            )}

            {/* Tabs */}
            <div className="mb-6">
                <div className="border-b border-gray-200 dark:border-gray-700">
                    <nav className="-mb-px flex space-x-8 rtl:space-x-reverse overflow-x-auto">
                        {tabs.map((tab) => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`
                                        flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap
                                        ${
                                            isActive
                                                ? `border-primary text-primary ${tab.color}`
                                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                                        }
                                    `}
                                >
                                    <Icon className={`w-5 h-5 ${isActive ? tab.color : ''}`} />
                                    {tab.label}
                                    <span
                                        className={`
                                        inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none rounded-full
                                        ${isActive ? 'bg-primary text-white' : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300'}
                                    `}
                                    >
                                        {tab.cars.length}
                                    </span>
                                </button>
                            );
                        })}
                    </nav>
                </div>
            </div>

            {/* Tab Content */}
            {currentTab && (
                <div className="space-y-6">
                    {/* Add Car Section */}
                    <div className={`panel ${currentTab.bgColor} ${currentTab.borderColor} border-2`}>
                        <div className="mb-5 flex items-center gap-3">
                            <IconPlus className={`w-6 h-6 ${currentTab.color}`} />
                            <h5 className="text-xl font-bold text-gray-900 dark:text-white">
                                {t('add_car_to')} {currentTab.label}
                            </h5>
                        </div>
                        <div className="flex flex-col md:flex-row gap-4 items-end">
                            <div className="flex-1">
                                <label className="block text-sm font-bold text-gray-700 dark:text-white mb-2">{t('select_car')}</label>
                                <CarSelect
                                    selectedCar={selectedCarToAdd}
                                    onCarSelect={setSelectedCarToAdd}
                                    className="form-input"
                                    availableCars={availableCars.filter((car) => !car[currentTab.dbField as keyof Car])}
                                />
                            </div>
                            <button
                                onClick={() => selectedCarToAdd && addCarToTab(selectedCarToAdd)}
                                disabled={!selectedCarToAdd || saving}
                                className={`btn text-white px-6 py-3 ${currentTab.color.replace('text-', 'bg-')} hover:opacity-90 disabled:opacity-50`}
                            >
                                {saving ? t('adding') : t('add_car')}
                            </button>
                        </div>
                    </div>

                    {/* Cars Grid */}
                    <div className="panel">
                        <div className="mb-5 flex items-center gap-3">
                            <currentTab.icon className={`w-6 h-6 ${currentTab.color}`} />
                            <h5 className="text-xl font-bold text-gray-900 dark:text-white">
                                {currentTab.label} ({currentTab.cars.length})
                            </h5>
                        </div>

                        {currentTab.cars.length === 0 ? (
                            <div className="text-center py-12">
                                <currentTab.icon className={`w-16 h-16 mx-auto mb-4 ${currentTab.color} opacity-50`} />
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{t('no_cars_in_category')}</h3>
                                <p className="text-gray-600 dark:text-gray-400 mb-4">{t('add_cars_to_category_description')}</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {currentTab.cars.map((car) => (
                                    <div
                                        key={car.id}
                                        className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-shadow"
                                    >
                                        {/* Car Image */}
                                        <div className="relative h-48">
                                            <img
                                                src={getCarImage(car) || '/assets/images/img-placeholder-fallback.webp'}
                                                alt={car.title}
                                                className="w-full h-full object-contain"
                                                onError={(e) => {
                                                    e.currentTarget.src = '/assets/images/img-placeholder-fallback.webp';
                                                }}
                                            />
                                            <button
                                                onClick={() => removeCarFromTab(car.id)}
                                                disabled={saving}
                                                className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition-colors disabled:opacity-50"
                                                title={t('remove_car')}
                                            >
                                                <IconTrash className="w-4 h-4" />
                                            </button>
                                        </div>
                                        {/* Car Details */}
                                        <div className="p-4">
                                            <h6 className="font-bold text-gray-900 dark:text-white mb-2 line-clamp-2">{car.title}</h6>
                                            <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                                                <div className="flex justify-between">
                                                    <span>{t('brand')}:</span>
                                                    <span className="font-medium">{car.brand}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span>{t('year')}:</span>
                                                    <span className="font-medium">{car.year}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span>{t('kilometers')}:</span>
                                                    <span className="font-medium">{car.kilometers.toLocaleString()}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span>{t('price')}:</span>
                                                    <span className="font-bold text-primary">{formatCurrency(car.sale_price)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

const ProtectedHomeSettingsPage = () => (
    <PermissionGuard permission="view_home_settings">
        <HomePageSettings />
    </PermissionGuard>
);

export default ProtectedHomeSettingsPage;
