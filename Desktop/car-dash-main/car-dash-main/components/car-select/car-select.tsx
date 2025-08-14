import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import IconCaretDown from '@/components/icon/icon-caret-down';
import IconMenuWidgets from '@/components/icon/menu/icon-menu-widgets';
import IconPlus from '@/components/icon/icon-plus';
import { getTranslation } from '@/i18n';
import supabase from '@/lib/supabase';

interface Car {
    id: string;
    title: string;
    year: number;
    brand: string;
    status: string;
    type?: string;
    provider: string;
    kilometers: number;
    market_price: number;
    buy_price: number;
    sale_price: number;
    car_number?: string; // Car number field
    images: string[] | string;
}

interface CarSelectProps {
    selectedCar?: Car | null;
    onCarSelect: (car: Car | null) => void;
    onCreateNew?: () => void;
    className?: string;
    availableCars?: Car[]; // Optional prop to pass pre-filtered cars
}

const CarSelect = ({ selectedCar, onCarSelect, onCreateNew, className = 'form-select', availableCars }: CarSelectProps) => {
    const { t } = getTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const [cars, setCars] = useState<Car[]>([]);
    const [filteredCars, setFilteredCars] = useState<Car[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (availableCars) {
            // Use provided cars instead of fetching
            setCars(availableCars);
            setFilteredCars(availableCars);
        } else if (isOpen && cars.length === 0) {
            fetchCars();
        }
    }, [isOpen, availableCars]);
    useEffect(() => {
        const carsToFilter = availableCars || cars;
        const filtered = carsToFilter.filter(
            (car) =>
                car.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                car.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
                car.provider.toLowerCase().includes(searchTerm.toLowerCase()),
        );
        setFilteredCars(filtered);
    }, [cars, searchTerm, availableCars]);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const fetchCars = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase.from('cars').select('*').order('title');

            if (error) throw error;
            setCars(data || []);
            setFilteredCars(data || []);
        } catch (error) {
            console.error('Error fetching cars:', error);
        } finally {
            setLoading(false);
        }
    };
    const handleCarSelect = (car: Car) => {
        onCarSelect(car);
        setIsOpen(false);
        setSearchTerm('');
    };

    const handleCreateNew = () => {
        if (onCreateNew) {
            onCreateNew();
            setIsOpen(false);
            setSearchTerm('');
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
    const formatImageUrl = (imagePath: string) => {
        if (!imagePath) return `/assets/images/product-placeholder.jpg`;
        const { data } = supabase.storage.from('cars').getPublicUrl(imagePath);
        return data.publicUrl;
    };

    const getCarImageList = (images: string[] | string) => {
        return typeof images === 'string' ? JSON.parse(images || '[]') : images || [];
    };

    return (
        <div ref={wrapperRef} className="relative">
            <div
                className={`${className} cursor-pointer dark:bg-black dark:text-white-dark dark:border-[#191e3a] flex items-center justify-between min-h-[42px] ${selectedCar ? 'text-black dark:text-white' : 'text-gray-500'}`}
                onClick={() => setIsOpen(!isOpen)}
            >
                {selectedCar ? (
                    <div className="flex items-center gap-3">
                        {(() => {
                            const imageList = getCarImageList(selectedCar.images);
                            return imageList.length > 0 ? (
                                <div className="w-10 h-8 rounded overflow-hidden flex-shrink-0">
                                    <Image src={formatImageUrl(imageList[0])} alt={selectedCar.title} width={40} height={32} className="w-full h-full object-cover" />
                                </div>
                            ) : (
                                <IconMenuWidgets className="w-4 h-4 text-primary" />
                            );
                        })()}
                        <div>
                            <div className="font-medium">{selectedCar.title}</div>
                            <div className="text-xs text-gray-500">
                                {selectedCar.brand} • {selectedCar.year} • {selectedCar.provider}
                            </div>
                        </div>
                    </div>
                ) : (
                    <span>{t('select_car')}</span>
                )}
                <IconCaretDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </div>

            {isOpen && (
                <div className="absolute z-50 mt-1 w-full rounded-md border border-gray-300 bg-white shadow-lg dark:bg-black dark:border-[#191e3a] max-h-80 overflow-hidden">
                    {/* Search */}
                    <div className="p-3 border-b border-gray-200 dark:border-[#191e3a]">
                        <input
                            type="text"
                            className="w-full rounded border border-gray-300 p-2 text-sm focus:border-primary focus:outline-none dark:bg-black dark:border-[#191e3a] dark:text-white-dark"
                            placeholder={t('search_cars')}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            autoFocus
                        />
                    </div>
                    {/* Create New Car Button */}
                    {onCreateNew && (
                        <div className="p-2 border-b border-gray-200 dark:border-[#191e3a]">
                            <button
                                onClick={handleCreateNew}
                                className="w-full flex items-center gap-3 px-3 py-2 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-600 dark:text-blue-400 transition-colors"
                            >
                                <IconPlus className="w-4 h-4" />
                                <span className="font-medium">{t('create_new_car')}</span>
                            </button>
                        </div>
                    )}
                    {/* Cars List */}
                    <div className="max-h-60 overflow-y-auto">
                        {loading ? (
                            <div className="p-4 text-center text-gray-500">
                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                                <p className="mt-2 text-sm">{t('loading')}</p>
                            </div>
                        ) : filteredCars.length === 0 ? (
                            <div className="p-4 text-center text-gray-500">
                                <p className="text-sm">{searchTerm ? t('no_cars_found') : t('no_cars_available')}</p>
                            </div>
                        ) : (
                            filteredCars.map((car) => (
                                <div
                                    key={car.id}
                                    className="cursor-pointer px-4 py-3 hover:bg-gray-100 dark:hover:bg-[#191e3a] border-b border-gray-100 dark:border-[#191e3a] last:border-b-0"
                                    onClick={() => handleCarSelect(car)}
                                >
                                    <div className="flex items-center gap-3">
                                        {(() => {
                                            const imageList = getCarImageList(car.images);
                                            return imageList.length > 0 ? (
                                                <div className="w-12 h-10 rounded overflow-hidden flex-shrink-0">
                                                    <Image src={formatImageUrl(imageList[0])} alt={car.title} width={48} height={40} className="w-full h-full object-cover" />
                                                </div>
                                            ) : (
                                                <IconMenuWidgets className="w-4 h-4 text-primary flex-shrink-0" />
                                            );
                                        })()}
                                        <div className="flex-1 min-w-0">
                                            <div className="font-medium text-black dark:text-white truncate">{car.title}</div>
                                            <div className="text-sm text-gray-500 dark:text-gray-400">
                                                {car.brand} • {car.year} • {car.provider}
                                            </div>
                                            <div className="text-xs text-gray-400 dark:text-gray-500 flex gap-4">
                                                <span>
                                                    {car.kilometers.toLocaleString()} {t('km')}
                                                </span>
                                                <span>{formatCurrency(car.sale_price)}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default CarSelect;
