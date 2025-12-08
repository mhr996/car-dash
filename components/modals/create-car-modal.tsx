import React, { useState, useRef } from 'react';
import IconX from '@/components/icon/icon-x';
import IconCar from '@/components/icon/icon-car';
import IconUpload from '@/components/icon/icon-camera';
import IconPlus from '@/components/icon/icon-plus';
import IconGallery from '@/components/icon/icon-gallery';
import { getTranslation } from '@/i18n';
import BrandSelect from '@/components/brand-select/brand-select';
import StatusSelect from '@/components/status-select/status-select';
import ProviderSelect from '@/components/provider-select/provider-select';
import CustomerSelect from '@/components/customer-select/customer-select';
import TypeSelect from '@/components/type-select/type-select';
import CreateCustomerModal from '@/components/modals/create-customer-modal';
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
    images: string[] | string;
}

interface ColorVariant {
    id: string;
    color: string;
    images: File[];
    previews: string[];
}

interface Feature {
    id: string;
    label: string;
    value: string;
}

interface Customer {
    id: string;
    id_number?: string;
    name: string;
    phone: string;
    age: number;
}

interface CreateCarModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCarCreated: (car: Car) => void;
}

const CreateCarModal = ({ isOpen, onClose, onCarCreated }: CreateCarModalProps) => {
    const { t } = getTranslation();
    const [saving, setSaving] = useState(false);

    // Car source state (provider or customer)
    const [carSource, setCarSource] = useState<'provider' | 'customer'>('provider');
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [isCreateCustomerModalOpen, setIsCreateCustomerModalOpen] = useState(false);

    const [form, setForm] = useState({
        title: '',
        year: '',
        brand: '',
        status: '',
        type: '',
        provider: '',
        kilometers: '',
        market_price: '',
        buy_price: '',
        sale_price: '',
        car_number: '',
        desc: '',
        public: false,
    });

    // Image states
    const [thumbnailImage, setThumbnailImage] = useState<File | null>(null);
    const [thumbnailPreview, setThumbnailPreview] = useState<string>('');
    const [galleryImages, setGalleryImages] = useState<File[]>([]);
    const [galleryPreviews, setGalleryPreviews] = useState<string[]>([]);
    const thumbnailInputRef = useRef<HTMLInputElement>(null);
    const galleryInputRef = useRef<HTMLInputElement>(null);

    // Contract image state
    const [contractImage, setContractImage] = useState<File | null>(null);
    const [contractPreview, setContractPreview] = useState<string>('');
    const contractInputRef = useRef<HTMLInputElement>(null);

    // Colors state
    const [colors, setColors] = useState<ColorVariant[]>([]);

    // Features state
    const [features, setFeatures] = useState<Feature[]>([]);

    const [errors, setErrors] = useState<Record<string, string>>({});
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));

        // Clear error when user starts typing
        if (errors[name]) {
            setErrors((prev) => ({ ...prev, [name]: '' }));
        }
    };

    // Image handling functions
    const handleThumbnailSelect = () => {
        thumbnailInputRef.current?.click();
    };

    const handleGallerySelect = () => {
        galleryInputRef.current?.click();
    };

    const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setThumbnailImage(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setThumbnailPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleGalleryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length + galleryPreviews.length > 9) {
            setErrors({ images: t('max_gallery_images') });
            return;
        }
        setGalleryImages((prev) => [...prev, ...files]);

        // Generate preview URLs
        files.forEach((file) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                setGalleryPreviews((prev) => [...prev, reader.result as string]);
            };
            reader.readAsDataURL(file);
        });
    };

    const removeThumbnail = () => {
        setThumbnailImage(null);
        setThumbnailPreview('');
    };

    const removeGalleryImage = (index: number) => {
        setGalleryImages((prev) => prev.filter((_, i) => i !== index));
        setGalleryPreviews((prev) => prev.filter((_, i) => i !== index));
    };

    // Contract image handlers
    const handleContractSelect = () => {
        contractInputRef.current?.click();
    };

    const handleContractChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setContractImage(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setContractPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const removeContract = () => {
        setContractImage(null);
        setContractPreview('');
    };

    // Car source handlers
    const handleCarSourceChange = (source: 'provider' | 'customer') => {
        setCarSource(source);
        // Reset the other selection when switching
        if (source === 'provider') {
            setSelectedCustomer(null);
        } else {
            setForm((prev) => ({ ...prev, provider: '' }));
        }
    };

    const handleCustomerSelect = (customer: Customer | null) => {
        setSelectedCustomer(customer);
    };

    const handleCreateNewCustomer = () => {
        setIsCreateCustomerModalOpen(true);
    };

    const handleCustomerCreated = (newCustomer: Customer) => {
        setSelectedCustomer(newCustomer);
        setIsCreateCustomerModalOpen(false);
    };

    // Color management functions
    const addColor = () => {
        const newColor: ColorVariant = {
            id: Date.now().toString(),
            color: '#000000',
            images: [],
            previews: [],
        };
        setColors((prev) => [...prev, newColor]);
    };

    const removeColor = (colorId: string) => {
        setColors((prev) => prev.filter((color) => color.id !== colorId));
    };

    const updateColorValue = (colorId: string, value: string) => {
        setColors((prev) => prev.map((color) => (color.id === colorId ? { ...color, color: value } : color)));
    };

    const handleColorImageChange = (colorId: string, e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        const color = colors.find((c) => c.id === colorId);
        if (!color) return;

        if (files.length + color.images.length > 10) {
            setErrors({ colors: t('max_color_images') });
            return;
        }

        // Generate preview URLs
        const newPreviews: string[] = [];
        files.forEach((file, index) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                newPreviews.push(reader.result as string);
                if (newPreviews.length === files.length) {
                    setColors((prev) =>
                        prev.map((c) =>
                            c.id === colorId
                                ? {
                                      ...c,
                                      images: [...c.images, ...files],
                                      previews: [...c.previews, ...newPreviews],
                                  }
                                : c,
                        ),
                    );
                }
            };
            reader.readAsDataURL(file);
        });
    };

    const removeColorImage = (colorId: string, imageIndex: number) => {
        setColors((prev) =>
            prev.map((color) =>
                color.id === colorId
                    ? {
                          ...color,
                          images: color.images.filter((_, i) => i !== imageIndex),
                          previews: color.previews.filter((_, i) => i !== imageIndex),
                      }
                    : color,
            ),
        );
    };

    // Feature management functions
    const addFeature = () => {
        const newFeature: Feature = {
            id: Date.now().toString(),
            label: '',
            value: '',
        };
        setFeatures((prev) => [...prev, newFeature]);
    };

    const removeFeature = (featureId: string) => {
        setFeatures((prev) => prev.filter((feature) => feature.id !== featureId));
    };

    const updateFeature = (featureId: string, field: 'label' | 'value', value: string) => {
        setFeatures((prev) => prev.map((feature) => (feature.id === featureId ? { ...feature, [field]: value } : feature)));
    };
    const handleBrandChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const { value } = e.target;
        setForm((prev) => ({ ...prev, brand: value }));
        if (errors.brand) {
            setErrors((prev) => ({ ...prev, brand: '' }));
        }
    };

    const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const { value } = e.target;
        setForm((prev) => ({ ...prev, status: value }));
        if (errors.status) {
            setErrors((prev) => ({ ...prev, status: '' }));
        }
    };

    const handleProviderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const { value } = e.target;
        setForm((prev) => ({ ...prev, provider: value }));
        if (errors.provider) {
            setErrors((prev) => ({ ...prev, provider: '' }));
        }
    };

    const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const { value } = e.target;
        setForm((prev) => ({ ...prev, type: value }));
        if (errors.type) {
            setErrors((prev) => ({ ...prev, type: '' }));
        }
    };

    const validateForm = () => {
        const newErrors: Record<string, string> = {};

        if (!form.title.trim()) {
            newErrors.title = t('car_title_required');
        }

        if (!form.year || parseInt(form.year) < 1900 || parseInt(form.year) > new Date().getFullYear() + 1) {
            newErrors.year = t('valid_year_required');
        }

        if (!form.brand) {
            newErrors.brand = t('brand_required');
        }

        if (!form.status) {
            newErrors.status = t('car_status_required');
        }

        if (!form.car_number.trim()) {
            newErrors.car_number = t('car_number_required');
        }

        // Validate car source selection
        if (carSource === 'provider' && !form.provider) {
            newErrors.provider = t('provider_required');
        }

        if (carSource === 'customer' && !selectedCustomer) {
            newErrors.customer = t('customer_required');
        }

        if (form.kilometers && (parseInt(form.kilometers) < 0 || parseInt(form.kilometers) > 1000000)) {
            newErrors.kilometers = t('valid_kilometers_required');
        }

        if (form.market_price && parseFloat(form.market_price) < 0) {
            newErrors.market_price = t('valid_price_required');
        }
        if (form.buy_price && parseFloat(form.buy_price) < 0) {
            newErrors.buy_price = t('valid_price_required');
        }

        if (form.sale_price && parseFloat(form.sale_price) < 0) {
            newErrors.sale_price = t('valid_price_required');
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) return;

        setSaving(true);
        try {
            let uploadedImages: string[] = [];

            // Upload thumbnail image if provided
            if (thumbnailImage) {
                const fileExt = thumbnailImage.name.split('.').pop();
                const fileName = `${Date.now()}.${fileExt}`;
                const { data: uploadData, error: uploadError } = await supabase.storage.from('cars').upload(fileName, thumbnailImage);

                if (uploadError) {
                    console.error('Error uploading thumbnail:', uploadError);
                } else {
                    uploadedImages.push(fileName);
                }
            }
            const carData = {
                title: form.title.trim(),
                year: parseInt(form.year),
                brand: form.brand,
                status: form.status,
                type: form.type || null,
                // Handle provider/customer based on source selection
                provider: carSource === 'provider' ? form.provider : null,
                source_customer_id: carSource === 'customer' ? selectedCustomer?.id : null,
                source_type: carSource,
                kilometers: form.kilometers ? parseInt(form.kilometers) : 0,
                market_price: form.market_price ? parseFloat(form.market_price) : 0,
                buy_price: form.buy_price ? parseFloat(form.buy_price) : 0,
                sale_price: form.sale_price ? parseFloat(form.sale_price) : 0,
                car_number: form.car_number.trim() || null,
                desc: form.desc || '',
                public: form.public,
                features: features.filter((f) => f.label.trim() && f.value.trim()).map((f) => ({ label: f.label.trim(), value: f.value.trim() })),
                images: uploadedImages,
            };

            const { data, error } = await supabase.from('cars').insert([carData]).select().single();

            if (error) throw error;

            onCarCreated(data);
            handleClose();
        } catch (error) {
            console.error('Error creating car:', error);
            setErrors({ submit: t('error_creating_car') });
        } finally {
            setSaving(false);
        }
    };
    const handleClose = () => {
        setForm({
            title: '',
            year: '',
            brand: '',
            status: '',
            type: '',
            provider: '',
            kilometers: '',
            market_price: '',
            buy_price: '',
            sale_price: '',
            car_number: '',
            desc: '',
            public: false,
        });
        setThumbnailImage(null);
        setThumbnailPreview('');
        setGalleryImages([]);
        setGalleryPreviews([]);
        setContractImage(null);
        setContractPreview('');
        setColors([]);
        setFeatures([]);
        setCarSource('provider');
        setSelectedCustomer(null);
        setErrors({});
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
            <div className="bg-white dark:bg-black rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                        <IconCar className="w-6 h-6 text-primary" />
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">{t('create_new_car')}</h3>
                    </div>
                    <button onClick={handleClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
                        <IconX className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {errors.submit && (
                            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                                <p className="text-red-600 dark:text-red-400 text-sm">{errors.submit}</p>
                            </div>
                        )}

                        {/* Car Details */}
                        <div className="space-y-5">
                            <div className="mb-5">
                                <h5 className="text-lg font-semibold dark:text-white-light">{t('car_information')}</h5>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                {/* Car Title */}
                                <div>
                                    <label htmlFor="title" className="block text-sm font-bold text-gray-700 dark:text-white mb-2">
                                        {t('car_title')} <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        id="title"
                                        name="title"
                                        value={form.title}
                                        onChange={handleInputChange}
                                        className={`form-input ${errors.title ? 'border-red-500' : ''}`}
                                        placeholder={t('enter_car_title')}
                                        required
                                    />
                                    {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title}</p>}
                                </div>
                                {/* Year */}
                                <div>
                                    <label htmlFor="year" className="block text-sm font-bold text-gray-700 dark:text-white mb-2">
                                        {t('year')} <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="number"
                                        id="year"
                                        name="year"
                                        min="1900"
                                        max={new Date().getFullYear() + 1}
                                        value={form.year}
                                        onChange={handleInputChange}
                                        className={`form-input ${errors.year ? 'border-red-500' : ''}`}
                                        placeholder={t('enter_year')}
                                        required
                                    />
                                    {errors.year && <p className="text-red-500 text-xs mt-1">{errors.year}</p>}
                                </div>
                                {/* Car Number */}
                                <div>
                                    <label htmlFor="car_number" className="block text-sm font-bold text-gray-700 dark:text-white mb-2">
                                        {t('car_number')} <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        id="car_number"
                                        name="car_number"
                                        value={form.car_number}
                                        onChange={handleInputChange}
                                        className={`form-input ${errors.car_number ? 'border-red-500' : ''}`}
                                        placeholder={t('enter_car_number')}
                                        required
                                    />
                                    {errors.car_number && <p className="text-red-500 text-xs mt-1">{errors.car_number}</p>}
                                </div>
                                {/* Brand */}
                                <div>
                                    <label htmlFor="brand" className="block text-sm font-bold text-gray-700 dark:text-white mb-2">
                                        {t('brand')} <span className="text-red-500">*</span>
                                    </label>
                                    <BrandSelect defaultValue={form.brand} className={`form-input ${errors.brand ? 'border-red-500' : ''}`} name="brand" onChange={handleBrandChange} />
                                    {errors.brand && <p className="text-red-500 text-xs mt-1">{errors.brand}</p>}
                                </div>
                                {/* Status */}
                                <div>
                                    <label htmlFor="status" className="block text-sm font-bold text-gray-700 dark:text-white mb-2">
                                        {t('car_status')} <span className="text-red-500">*</span>
                                    </label>
                                    <StatusSelect defaultValue={form.status} className={`form-input ${errors.status ? 'border-red-500' : ''}`} name="status" onChange={handleStatusChange} />
                                    {errors.status && <p className="text-red-500 text-xs mt-1">{errors.status}</p>}
                                </div>
                                {/* Type */}
                                <div>
                                    <label htmlFor="type" className="block text-sm font-bold text-gray-700 dark:text-white mb-2">
                                        {t('car_type')}
                                    </label>
                                    <TypeSelect defaultValue={form.type} className="form-input" name="type" onChange={handleTypeChange} />
                                </div>
                                {/* Kilometers */}
                                <div>
                                    <label htmlFor="kilometers" className="block text-sm font-bold text-gray-700 dark:text-white mb-2">
                                        {t('kilometers')}
                                    </label>
                                    <input
                                        type="number"
                                        id="kilometers"
                                        name="kilometers"
                                        min="0"
                                        value={form.kilometers}
                                        onChange={handleInputChange}
                                        className={`form-input ${errors.kilometers ? 'border-red-500' : ''}`}
                                        placeholder={t('enter_kilometers')}
                                    />
                                    {errors.kilometers && <p className="text-red-500 text-xs mt-1">{errors.kilometers}</p>}
                                </div>
                                {/* Market Price */}
                                <div>
                                    <label htmlFor="market_price" className="block text-sm font-bold text-gray-700 dark:text-white mb-2">
                                        {t('market_price')}
                                    </label>
                                    <div className="flex">
                                        <span className="inline-flex items-center px-3 bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 border border-r-0 border-gray-300 dark:border-gray-600 ltr:rounded-l-md rtl:rounded-r-md ltr:border-r-0 rtl:border-l-0">
                                            ₪
                                        </span>
                                        <input
                                            type="number"
                                            id="market_price"
                                            name="market_price"
                                            step="0.01"
                                            min="0"
                                            value={form.market_price}
                                            onChange={handleInputChange}
                                            className={`form-input ltr:rounded-l-none rtl:rounded-r-none ${errors.market_price ? 'border-red-500' : ''}`}
                                            placeholder="0.00"
                                        />
                                    </div>
                                    {errors.market_price && <p className="text-red-500 text-xs mt-1">{errors.market_price}</p>}
                                </div>
                                {/* Value Price */}
                                <div>
                                    <label htmlFor="buy_price" className="block text-sm font-bold text-gray-700 dark:text-white mb-2">
                                        {t('buy_price')}
                                    </label>
                                    <div className="flex">
                                        <span className="inline-flex items-center px-3 bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 border border-r-0 border-gray-300 dark:border-gray-600 ltr:rounded-l-md rtl:rounded-r-md ltr:border-r-0 rtl:border-l-0">
                                            ₪
                                        </span>
                                        <input
                                            type="number"
                                            id="buy_price"
                                            name="buy_price"
                                            step="0.01"
                                            min="0"
                                            value={form.buy_price}
                                            onChange={handleInputChange}
                                            className={`form-input ltr:rounded-l-none rtl:rounded-r-none ${errors.buy_price ? 'border-red-500' : ''}`}
                                            placeholder="0.00"
                                        />
                                    </div>
                                    {errors.buy_price && <p className="text-red-500 text-xs mt-1">{errors.buy_price}</p>}
                                </div>
                                {/* Sale Price */}
                                <div>
                                    <label htmlFor="sale_price" className="block text-sm font-bold text-gray-700 dark:text-white mb-2">
                                        {t('sale_price')}
                                    </label>
                                    <div className="flex">
                                        <span className="inline-flex items-center px-3 bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 border border-r-0 border-gray-300 dark:border-gray-600 ltr:rounded-l-md rtl:rounded-r-md ltr:border-r-0 rtl:border-l-0">
                                            ₪
                                        </span>
                                        <input
                                            type="number"
                                            id="sale_price"
                                            name="sale_price"
                                            step="0.01"
                                            min="0"
                                            value={form.sale_price}
                                            onChange={handleInputChange}
                                            className={`form-input ltr:rounded-l-none rtl:rounded-r-none ${errors.sale_price ? 'border-red-500' : ''}`}
                                            placeholder="0.00"
                                        />
                                    </div>
                                    {errors.sale_price && <p className="text-red-500 text-xs mt-1">{errors.sale_price}</p>}
                                </div>
                                {/* Car Source Selection */}
                                <div className="">
                                    <label className="block text-sm font-bold text-gray-700 dark:text-white mb-3">
                                        {t('car_source')} <span className="text-red-500">*</span>
                                    </label>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">{t('car_source_description')}</p>

                                    {/* Toggle Buttons */}
                                    <div className="flex gap-3 mb-4">
                                        <button
                                            type="button"
                                            onClick={() => handleCarSourceChange('provider')}
                                            className={`flex-1 px-4 py-3 rounded-lg border-2 transition-colors ${
                                                carSource === 'provider'
                                                    ? 'border-primary bg-primary text-white'
                                                    : 'border-gray-300 bg-white text-gray-700 hover:border-primary hover:bg-primary hover:text-white dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300'
                                            }`}
                                        >
                                            <div className="text-center">
                                                <div className="font-medium">{t('from_provider')}</div>
                                            </div>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleCarSourceChange('customer')}
                                            className={`flex-1 px-4 py-3 rounded-lg border-2 transition-colors ${
                                                carSource === 'customer'
                                                    ? 'border-primary bg-primary text-white'
                                                    : 'border-gray-300 bg-white text-gray-700 hover:border-primary hover:bg-primary hover:text-white dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300'
                                            }`}
                                        >
                                            <div className="text-center">
                                                <div className="font-medium">{t('from_customer')}</div>
                                            </div>
                                        </button>
                                    </div>

                                    {/* Conditional Selectors */}
                                    {carSource === 'provider' ? (
                                        <div>
                                            <label htmlFor="provider" className="block text-sm font-medium text-gray-700 dark:text-white mb-2">
                                                {t('select_provider')} <span className="text-red-500">*</span>
                                            </label>
                                            <ProviderSelect
                                                defaultValue={form.provider}
                                                className={`form-input ${errors.provider ? 'border-red-500' : ''}`}
                                                name="provider"
                                                onChange={handleProviderChange}
                                            />
                                            {errors.provider && <p className="text-red-500 text-xs mt-1">{errors.provider}</p>}
                                        </div>
                                    ) : (
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-white mb-2">
                                                {t('select_customer')} <span className="text-red-500">*</span>
                                            </label>
                                            <CustomerSelect selectedCustomer={selectedCustomer} onCustomerSelect={handleCustomerSelect} onCreateNew={handleCreateNewCustomer} className="form-input" />
                                            {errors.customer && <p className="text-red-500 text-xs mt-1">{errors.customer}</p>}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Car Description */}
                            <div className="mt-5">
                                <label htmlFor="desc" className="block text-sm font-bold text-gray-700 dark:text-white mb-2">
                                    {t('car_description')}
                                </label>
                                <textarea id="desc" name="desc" value={form.desc} onChange={handleInputChange} className="form-input" placeholder={t('enter_car_description')} rows={4} />
                            </div>

                            {/* Public Visibility Toggle */}
                            <div className="mt-5">
                                <label className="block text-sm font-bold text-gray-700 dark:text-white mb-2">{t('public_visibility')}</label>
                                <div className="flex items-center">
                                    <label className="w-12 h-6 relative">
                                        <input
                                            type="checkbox"
                                            className="custom_switch absolute w-full h-full opacity-0 z-10 cursor-pointer peer"
                                            checked={form.public}
                                            onChange={(e) => setForm((prev) => ({ ...prev, public: e.target.checked }))}
                                        />
                                        <span className="bg-[#ebedf2] dark:bg-dark block h-full rounded-full before:absolute before:left-1 before:bg-white dark:before:bg-white-dark dark:peer-checked:before:bg-white before:bottom-1 before:w-4 before:h-4 before:rounded-full peer-checked:before:left-7 peer-checked:bg-primary before:transition-all before:duration-300"></span>
                                    </label>
                                    <span className="ltr:ml-3 rtl:mr-3 text-sm text-gray-600 dark:text-gray-400">{form.public ? t('car_is_public') : t('car_is_private')}</span>
                                </div>
                                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{t('public_visibility_description')}</p>
                            </div>

                            {/* Car Images */}
                            <div className="space-y-8">
                                {/* Thumbnail and Gallery Section */}
                                <div>
                                    <label className="mb-3 block text-sm font-bold text-gray-700 dark:text-white">{t('car_thumbnail')}</label>
                                    <p className="mb-4 text-xs text-gray-500 dark:text-gray-400">{t('thumbnail_description')}</p>

                                    <div className="flex flex-col items-start gap-4">
                                        {/* Thumbnail Preview */}
                                        {thumbnailPreview ? (
                                            <div className="group relative aspect-square w-full max-w-sm">
                                                <img src={thumbnailPreview} alt="Thumbnail preview" className="h-full w-full rounded-lg object-cover border-2 border-gray-200 dark:border-gray-600" />
                                                <button
                                                    type="button"
                                                    className="absolute -right-2 -top-2 rounded-full bg-red-500 p-2 text-white hover:bg-red-600 transition-colors shadow-lg"
                                                    onClick={removeThumbnail}
                                                >
                                                    <IconX className="h-4 w-4" />
                                                </button>
                                            </div>
                                        ) : (
                                            <div
                                                onClick={handleThumbnailSelect}
                                                className="flex aspect-square w-full max-w-sm cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 hover:border-primary hover:bg-gray-100 dark:border-[#1b2e4b] dark:bg-black dark:hover:border-primary dark:hover:bg-[#1b2e4b] transition-colors"
                                            >
                                                <IconUpload className="mb-3 h-8 w-8 text-gray-400" />
                                                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('upload_thumbnail')}</p>
                                                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">Recommended: 400x300px</p>
                                            </div>
                                        )}
                                    </div>
                                    <input ref={thumbnailInputRef} type="file" className="hidden" accept="image/*" onChange={handleThumbnailChange} />
                                </div>

                                {/* Gallery Section */}
                                <div>
                                    <label className="mb-3 block text-sm font-bold text-gray-700 dark:text-white">{t('car_gallery')}</label>
                                    <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">{t('gallery_description')}</p>

                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                                        {/* Add Gallery Images Button */}
                                        {galleryPreviews.length < 9 && (
                                            <div
                                                onClick={handleGallerySelect}
                                                className="flex aspect-square cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 hover:border-primary hover:bg-gray-100 dark:border-[#1b2e4b] dark:bg-black dark:hover:border-primary dark:hover:bg-[#1b2e4b]"
                                            >
                                                <IconUpload className="mb-2 h-6 w-6" />
                                                <p className="text-sm text-gray-600 dark:text-gray-400">{t('upload_gallery_images')}</p>
                                                <p className="text-[10px] text-gray-500 dark:text-gray-500">{t('image_formats')}</p>
                                            </div>
                                        )}
                                        {/* Gallery Image Previews */}
                                        {galleryPreviews.map((url, index) => (
                                            <div key={index} className="group relative aspect-square">
                                                <img src={url} alt={`Gallery ${index + 1}`} className="h-full w-full rounded-lg object-cover" />
                                                <button
                                                    type="button"
                                                    className="absolute right-0 top-0 hidden rounded-full bg-red-500 p-1 text-white hover:bg-red-600 group-hover:block"
                                                    onClick={() => removeGalleryImage(index)}
                                                >
                                                    <IconX className="h-4 w-4" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                    <input ref={galleryInputRef} type="file" className="hidden" accept="image/*" multiple onChange={handleGalleryChange} />
                                </div>
                            </div>
                        </div>

                        {/* Submit Button */}
                        <div className="flex justify-end gap-4 mt-8">
                            <button type="button" onClick={handleClose} className="btn btn-outline-danger" disabled={saving}>
                                {t('cancel')}
                            </button>
                            <button type="submit" className="btn btn-primary" disabled={saving}>
                                {saving ? t('creating') : t('create_car')}
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            {/* Customer Creation Modal */}
            <CreateCustomerModal isOpen={isCreateCustomerModalOpen} onClose={() => setIsCreateCustomerModalOpen(false)} onCustomerCreated={handleCustomerCreated} />
        </div>
    );
};

export default CreateCarModal;
