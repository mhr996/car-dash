'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import supabase from '@/lib/supabase';
import { Alert } from '@/components/elements/alerts/elements-alerts-default';
import { getTranslation } from '@/i18n';
import IconX from '@/components/icon/icon-x';
import IconUpload from '@/components/icon/icon-camera';
import IconPlus from '@/components/icon/icon-plus';
import BrandSelect from '@/components/brand-select/brand-select';
import StatusSelect from '@/components/status-select/status-select';
import ProviderSelect from '@/components/provider-select/provider-select';
import TypeSelect from '@/components/type-select/type-select';
import CustomerSelect from '@/components/customer-select/customer-select';
import CreateCustomerModal from '@/components/modals/create-customer-modal';
import { usePermissions } from '@/hooks/usePermissions';

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
    name: string;
    phone: string;
    age: number;
    id_number?: string;
}

interface Car {
    id: string;
    title: string;
    year: number;
    brand: string;
    status: string;
    type?: string;
    provider: string;
    source_type?: 'provider' | 'customer';
    source_customer_id?: string;
    kilometers: number;
    market_price: number;
    buy_price: number;
    sale_price: number;
    car_number?: string; // Car number field
    desc?: string; // New description field
    public: boolean; // Public visibility field
    features?: Feature[]; // New features field
    images: string[];
    contract_image?: string; // Contract image field
    colors?: Array<{
        color: string;
        images: string[];
    }>;
    providers?: {
        id: string;
        name: string;
        address: string;
        phone: string;
    };
    customers?: {
        id: string;
        name: string;
        phone: string;
        age: number;
        id_number?: string;
    };
}

const EditCar = () => {
    const { t } = getTranslation();
    const router = useRouter();
    const params = useParams();
    const { hasPermission } = usePermissions();
    const carId = params?.id as string;
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState(1);
    const [car, setCar] = useState<Car | null>(null);

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
        car_number: '', // Car number field
        desc: '', // New description field
        public: false, // Public visibility field
    });

    // Separate states for thumbnail and gallery images
    const [thumbnailImage, setThumbnailImage] = useState<File | null>(null);
    const [thumbnailPreview, setThumbnailPreview] = useState<string>('');
    const [galleryImages, setGalleryImages] = useState<File[]>([]);
    const [galleryPreviews, setGalleryPreviews] = useState<string[]>([]);
    const [existingImages, setExistingImages] = useState<string[]>([]); // Display URLs for existing images
    const [existingImagePaths, setExistingImagePaths] = useState<string[]>([]); // Original relative paths
    const thumbnailInputRef = useRef<HTMLInputElement>(null);
    const galleryInputRef = useRef<HTMLInputElement>(null);

    // Contract image state
    const [contractImage, setContractImage] = useState<File | null>(null);
    const [contractPreview, setContractPreview] = useState<string>('');
    const [existingContractImage, setExistingContractImage] = useState<string>('');
    const [existingContractImagePath, setExistingContractImagePath] = useState<string>('');
    const contractInputRef = useRef<HTMLInputElement>(null);

    // Colors state
    const [colors, setColors] = useState<ColorVariant[]>([]);

    // Features state
    const [features, setFeatures] = useState<Feature[]>([]);

    const [alert, setAlert] = useState<{ visible: boolean; message: string; type: 'success' | 'danger' }>({
        visible: false,
        message: '',
        type: 'success',
    });
    useEffect(() => {
        const fetchCar = async () => {
            try {
                const { data, error } = await supabase.from('cars').select('*, providers(id, name, address, phone), customers(id, name, phone, age, id_number)').eq('id', carId).single();

                if (error) throw error;

                if (data) {
                    setCar(data);

                    // Set car source based on existing data
                    if (data.source_type) {
                        setCarSource(data.source_type);
                    } else {
                        // Fallback: if source_type is not set, check if there's a provider or customer
                        setCarSource(data.provider ? 'provider' : 'customer');
                    }

                    // Set selected customer if this car is from a customer
                    if (data.customers) {
                        setSelectedCustomer(data.customers);
                    }

                    setForm({
                        title: data.title || '',
                        year: data.year?.toString() || '',
                        brand: data.brand || '',
                        status: data.status || '',
                        type: data.type || '',
                        provider: data.providers?.id || data.provider || '',
                        kilometers: data.kilometers?.toString() || '',
                        market_price: data.market_price?.toString() || '',
                        buy_price: data.buy_price?.toString() || '',
                        sale_price: data.sale_price?.toString() || '',
                        car_number: data.car_number || '', // Car number field
                        desc: data.desc || '', // New description field
                        public: data.public || false, // Public visibility field
                    }); // Convert relative paths to full URLs for display and keep original paths

                    // Parse images if they're a string
                    const images = typeof data.images === 'string' ? JSON.parse(data.images || '[]') : data.images || [];

                    if (images && images.length > 0) {
                        setExistingImagePaths(images); // Store original relative paths
                        const imageUrls = images.map((imagePath: string) => {
                            const { data: urlData } = supabase.storage.from('cars').getPublicUrl(imagePath);
                            return urlData.publicUrl;
                        });

                        // Set thumbnail (first image) only
                        if (imageUrls.length > 0) {
                            setThumbnailPreview(imageUrls[0]);
                        }
                        setExistingImages(imageUrls); // Store full URLs for display
                    }

                    // Load existing contract image
                    if (data.contract_image) {
                        setExistingContractImagePath(data.contract_image); // Store original relative path
                        const { data: urlData } = supabase.storage.from('cars').getPublicUrl(data.contract_image);
                        setExistingContractImage(urlData.publicUrl);
                    }

                    // Load existing colors
                    const colors = typeof data.colors === 'string' ? JSON.parse(data.colors || '[]') : data.colors || [];
                    if (colors && colors.length > 0) {
                        const existingColors: ColorVariant[] = await Promise.all(
                            colors.map(async (colorData: any, index: number) => {
                                const colorPreviews: string[] = [];

                                if (colorData.images && colorData.images.length > 0) {
                                    // Convert color image paths to URLs
                                    colorData.images.forEach((imagePath: string) => {
                                        const { data: urlData } = supabase.storage.from('cars').getPublicUrl(imagePath);
                                        colorPreviews.push(urlData.publicUrl);
                                    });
                                }

                                return {
                                    id: `existing-${index}`,
                                    color: colorData.color,
                                    images: [], // Empty for existing colors (we only show previews)
                                    previews: colorPreviews,
                                };
                            }),
                        );
                        setColors(existingColors);
                    }

                    // Initialize features if they exist
                    const features = typeof data.features === 'string' ? JSON.parse(data.features || '[]') : data.features || [];
                    if (features && Array.isArray(features)) {
                        const existingFeatures = features.map((feature: any, index: number) => ({
                            id: `existing-${index}`,
                            label: feature.label || '',
                            value: feature.value || '',
                        }));
                        setFeatures(existingFeatures);
                    }
                }
            } catch (error) {
                console.error('Error fetching car:', error);
                setAlert({ visible: true, message: t('error_loading_data'), type: 'danger' });
            } finally {
                setLoading(false);
            }
        };

        if (carId) {
            fetchCar();
        }
    }, [carId]);
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    };

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
            setAlert({ visible: true, message: 'Maximum 9 gallery images allowed', type: 'danger' });
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

    const removeExistingImage = (index: number) => {
        setExistingImages((prev) => prev.filter((_, i) => i !== index));
        setExistingImagePaths((prev) => prev.filter((_, i) => i !== index));
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

    const removeExistingContract = () => {
        setExistingContractImage('');
        setExistingContractImagePath('');
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
        setAlert({ visible: true, message: t('customer_added_successfully'), type: 'success' });
    };

    const validateForm = () => {
        if (!form.title.trim()) {
            setAlert({ visible: true, message: t('car_title_required'), type: 'danger' });
            return false;
        }
        if (!form.year.trim()) {
            setAlert({ visible: true, message: t('year_required'), type: 'danger' });
            return false;
        }
        if (!form.brand.trim()) {
            setAlert({ visible: true, message: t('brand_required'), type: 'danger' });
            return false;
        }
        if (!form.status.trim()) {
            setAlert({ visible: true, message: t('car_status_required'), type: 'danger' });
            return false;
        }
        if (!form.car_number.trim()) {
            setAlert({ visible: true, message: t('car_number_required'), type: 'danger' });
            return false;
        }
        // Validate car source selection
        if (carSource === 'provider' && !form.provider) {
            setAlert({ visible: true, message: t('provider_required'), type: 'danger' });
            return false;
        }
        if (carSource === 'customer' && !selectedCustomer) {
            setAlert({ visible: true, message: t('customer_required'), type: 'danger' });
            return false;
        }
        if (form.kilometers && parseFloat(form.kilometers) < 0) {
            setAlert({ visible: true, message: t('kilometers_must_be_positive'), type: 'danger' });
            return false;
        }
        if (form.market_price && parseFloat(form.market_price) < 0) {
            setAlert({ visible: true, message: t('price_must_be_positive'), type: 'danger' });
            return false;
        }
        if (form.buy_price && parseFloat(form.buy_price) < 0) {
            setAlert({ visible: true, message: t('price_must_be_positive'), type: 'danger' });
            return false;
        }
        if (form.sale_price && parseFloat(form.sale_price) < 0) {
            setAlert({ visible: true, message: t('price_must_be_positive'), type: 'danger' });
            return false;
        }
        return true;
    };
    const uploadNewImages = async (carId: string) => {
        const imageUrls: string[] = [];
        let contractImageUrl: string | null = null;

        // Upload new contract image if provided
        if (contractImage) {
            const fileExt = contractImage.name.split('.').pop();
            const fileName = `${carId}/contract.${fileExt}`;

            const { data, error } = await supabase.storage.from('cars').upload(fileName, contractImage);

            if (error) {
                console.error('Error uploading contract image:', error);
                throw error;
            }

            contractImageUrl = fileName;
        }

        // Upload new thumbnail if provided
        if (thumbnailImage) {
            const fileExt = thumbnailImage.name.split('.').pop();
            const fileName = `${carId}/thumbnail.${fileExt}`;

            const { data, error } = await supabase.storage.from('cars').upload(fileName, thumbnailImage);

            if (error) {
                console.error('Error uploading thumbnail:', error);
                throw error;
            }

            imageUrls.push(fileName);
        }

        // Upload new gallery images
        for (let i = 0; i < galleryImages.length; i++) {
            const file = galleryImages[i];
            const fileExt = file.name.split('.').pop();
            const fileName = `${carId}/gallery_${Date.now()}_${i + 1}.${fileExt}`;

            const { data, error } = await supabase.storage.from('cars').upload(fileName, file);

            if (error) {
                console.error('Error uploading gallery image:', error);
                throw error;
            }

            imageUrls.push(fileName);
        }

        return { imageUrls, contractImageUrl };
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
            setAlert({ visible: true, message: 'Maximum 10 images per color allowed', type: 'danger' });
            return;
        }

        // Generate preview URLs
        const newPreviews: string[] = [];
        files.forEach((file) => {
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

    const uploadColorImages = async (carId: string) => {
        const colorData: Array<{ color: string; images: string[] }> = [];

        // Upload color images - each color gets its own subfolder
        for (const color of colors) {
            const colorHex = color.color.replace('#', '');
            const colorImages: string[] = [];

            for (let i = 0; i < color.images.length; i++) {
                const file = color.images[i];
                const fileExt = file.name.split('.').pop();
                const fileName = `${carId}/colors/${colorHex}/image_${i + 1}.${fileExt}`;

                const { data, error } = await supabase.storage.from('cars').upload(fileName, file);

                if (error) {
                    console.error('Error uploading color image:', error);
                    throw error;
                }

                colorImages.push(fileName);
            }

            // Store color data with image paths
            if (colorImages.length > 0) {
                colorData.push({
                    color: color.color,
                    images: colorImages,
                });
            }
        }
        return colorData;
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) return;
        setSaving(true);
        try {
            // Upload new images if any
            const { imageUrls: newImageUrls, contractImageUrl: newContractImageUrl } = await uploadNewImages(carId);

            // Upload color images if any
            const colorData = await uploadColorImages(carId);

            // Combine existing image paths and new images
            const allImageUrls = [...existingImagePaths, ...newImageUrls];

            // Handle contract image - use new one if uploaded, otherwise keep existing
            const finalContractImageUrl = newContractImageUrl || existingContractImagePath;

            // Prepare car data
            const carData: any = {
                title: form.title.trim(),
                year: parseInt(form.year),
                brand: form.brand.trim(),
                status: form.status,
                type: form.type || null,
                // Handle provider/customer based on source selection
                provider: carSource === 'provider' ? form.provider : null,
                source_customer_id: carSource === 'customer' ? selectedCustomer?.id : null,
                source_type: carSource, // 'provider' or 'customer'
                kilometers: form.kilometers ? parseFloat(form.kilometers) : 0,
                market_price: form.market_price ? parseFloat(form.market_price) : 0,
                buy_price: form.buy_price ? parseFloat(form.buy_price) : 0,
                sale_price: form.sale_price ? parseFloat(form.sale_price) : 0,
                car_number: form.car_number.trim() || null, // Car number field
                desc: form.desc.trim() || null, // New description field
                public: form.public, // Public visibility field
                features: features.filter((f) => f.label.trim() && f.value.trim()).map((f) => ({ label: f.label.trim(), value: f.value.trim() })), // New features field
                images: allImageUrls,
            };

            // Add contract image if exists
            if (finalContractImageUrl) {
                carData.contract_image = finalContractImageUrl;
            }

            // Add colors data if there are any
            if (colorData.length > 0) {
                carData.colors = colorData;
            }

            const { error } = await supabase.from('cars').update(carData).eq('id', carId);

            if (error) throw error;

            setAlert({ visible: true, message: t('car_updated_successfully'), type: 'success' });

            // Redirect to cars list after a short delay
            setTimeout(() => {
                router.push('/cars');
            }, 1500);
        } catch (error) {
            console.error(error);
            setAlert({
                visible: true,
                message: error instanceof Error ? error.message : t('error_updating_car'),
                type: 'danger',
            });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-80">
                <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-500"></div>
                <span className="ml-3">{t('loading')}</span>
            </div>
        );
    }

    if (!car) {
        return (
            <div className="flex flex-col items-center justify-center h-80">
                <p className="text-xl font-bold mb-2">{t('car_not_found')}</p>
                <button onClick={() => router.push('/cars')} className="btn btn-primary mt-4">
                    {t('back_to_cars')}
                </button>
            </div>
        );
    }

    return (
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
                        <Link href="/cars" className="text-primary hover:underline">
                            {t('cars')}
                        </Link>
                    </li>
                    <li className="before:content-['/'] ltr:before:mr-2 rtl:before:ml-2">
                        <span>{t('edit_car')}</span>
                    </li>
                </ul>
            </div>
            <div className="mb-6">
                <h1 className="text-2xl font-bold">{t('edit_car')}</h1>
                <p className="text-gray-500">{t('update_car_information')}</p>
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
            <div className="panel">
                {/* Tabs Navigation */}
                <div className="mb-5">
                    <div className="flex border-b border-gray-200 dark:border-gray-700">
                        <button
                            type="button"
                            className={`px-6 py-3 border-b-2 font-medium text-sm ${
                                activeTab === 1 ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                            onClick={() => setActiveTab(1)}
                        >
                            {t('car_details')}
                        </button>
                        <button
                            type="button"
                            className={`px-6 py-3 border-b-2 font-medium text-sm ${
                                activeTab === 2 ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                            onClick={() => setActiveTab(2)}
                        >
                            {t('colors')}
                        </button>
                        <button
                            type="button"
                            className={`px-6 py-3 border-b-2 font-medium text-sm ${
                                activeTab === 3 ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                            onClick={() => setActiveTab(3)}
                        >
                            {t('features_tab')}
                        </button>
                    </div>
                </div>
                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Tab 1: Car Details */}
                    {activeTab === 1 && (
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
                                    <input type="text" id="title" name="title" value={form.title} onChange={handleInputChange} className="form-input" placeholder={t('enter_car_title')} required />
                                </div>{' '}
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
                                        className="form-input"
                                        placeholder={t('enter_year')}
                                        required
                                    />
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
                                        className="form-input"
                                        placeholder={t('enter_car_number')}
                                        required
                                    />
                                </div>
                                {/* Brand */}
                                <div>
                                    <label htmlFor="brand" className="block text-sm font-bold text-gray-700 dark:text-white mb-2">
                                        {t('brand')} <span className="text-red-500">*</span>
                                    </label>
                                    <BrandSelect defaultValue={form.brand} className="form-input" name="brand" onChange={handleInputChange} />
                                </div>
                                {/* Status */}
                                <div>
                                    <label htmlFor="status" className="block text-sm font-bold text-gray-700 dark:text-white mb-2">
                                        {t('car_status')} <span className="text-red-500">*</span>
                                    </label>
                                    <StatusSelect defaultValue={form.status} className="form-input" name="status" onChange={handleInputChange} />
                                </div>
                                {/* Type */}
                                <div>
                                    <label htmlFor="type" className="block text-sm font-bold text-gray-700 dark:text-white mb-2">
                                        {t('car_type')}
                                    </label>
                                    <TypeSelect defaultValue={form.type} className="form-input" name="type" onChange={handleInputChange} />
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
                                        className="form-input"
                                        placeholder={t('enter_kilometers')}
                                    />
                                </div>
                                {/* Market Price */}
                                <div>
                                    <label htmlFor="market_price" className="block text-sm font-bold text-gray-700 dark:text-white mb-2">
                                        {t('market_price')}
                                    </label>
                                    <div className="flex">
                                        <span className="inline-flex items-center px-3 bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 border ltr:border-r-0 rtl:border-l-0 border-gray-300 dark:border-gray-600 ltr:rounded-l-md rtl:rounded-r-md">
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
                                            className="form-input ltr:rounded-l-none rtl:rounded-r-none"
                                            placeholder="0.00"
                                        />
                                    </div>
                                </div>
                                {/* Value Price */}
                                {hasPermission('view_car_purchase_price') && (
                                    <div>
                                        <label htmlFor="buy_price" className="block text-sm font-bold text-gray-700 dark:text-white mb-2">
                                            {t('buy_price')}
                                        </label>
                                        <div className="flex">
                                            <span className="inline-flex items-center px-3 bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 border ltr:border-r-0 rtl:border-l-0 border-gray-300 dark:border-gray-600 ltr:rounded-l-md rtl:rounded-r-md">
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
                                                className="form-input ltr:rounded-l-none rtl:rounded-r-none"
                                                placeholder="0.00"
                                            />
                                        </div>
                                    </div>
                                )}
                                {/* Sale Price */}
                                <div>
                                    <label htmlFor="sale_price" className="block text-sm font-bold text-gray-700 dark:text-white mb-2">
                                        {t('sale_price')}
                                    </label>
                                    <div className="flex">
                                        <span className="inline-flex items-center px-3 bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 border ltr:border-r-0 rtl:border-l-0 border-gray-300 dark:border-gray-600 ltr:rounded-l-md rtl:rounded-r-md">
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
                                            className="form-input ltr:rounded-l-none rtl:rounded-r-none"
                                            placeholder="0.00"
                                        />
                                    </div>
                                </div>
                                {/* Car Source Selection */}
                                <div>
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
                                            <ProviderSelect defaultValue={form.provider} className="form-input" name="provider" onChange={handleInputChange} />
                                        </div>
                                    ) : (
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-white mb-2">
                                                {t('select_customer')} <span className="text-red-500">*</span>
                                            </label>
                                            <CustomerSelect selectedCustomer={selectedCustomer} onCustomerSelect={handleCustomerSelect} onCreateNew={handleCreateNewCustomer} className="form-input" />
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
                            <div className="space-y-6">
                                <label className="block text-sm font-bold text-gray-700 dark:text-white mb-3">{t('car_images')}</label>

                                {/* Thumbnail Section */}
                                <div>
                                    <h6 className="text-sm font-medium text-gray-700 dark:text-white mb-3">{t('thumbnail_image')}</h6>
                                    <div className="flex items-center gap-4">
                                        {/* Thumbnail Preview or Upload Button */}
                                        {thumbnailPreview ? (
                                            <div className="relative group">
                                                <img src={thumbnailPreview} alt="Thumbnail preview" className="w-24 h-24 object-cover rounded-lg border-2 border-gray-200" />
                                                <button
                                                    type="button"
                                                    onClick={removeThumbnail}
                                                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <IconX className="w-3 h-3" />
                                                </button>
                                            </div>
                                        ) : (
                                            <div
                                                onClick={handleThumbnailSelect}
                                                className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center cursor-pointer hover:border-primary hover:bg-gray-50 dark:border-gray-600 dark:hover:border-primary dark:hover:bg-gray-800 transition-colors"
                                            >
                                                <IconUpload className="w-6 h-6 text-gray-400" />
                                            </div>
                                        )}
                                        <div className="flex-1">
                                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{t('upload_thumbnail')}</p>
                                            <p className="text-xs text-gray-500">{t('recommended_size')}: 400x300px</p>
                                            <button type="button" onClick={handleThumbnailSelect} className="btn btn-outline-primary btn-sm mt-2">
                                                {thumbnailPreview ? t('change_thumbnail') : t('select_thumbnail')}
                                            </button>
                                        </div>
                                    </div>
                                    <input ref={thumbnailInputRef} type="file" accept="image/*" onChange={handleThumbnailChange} className="hidden" />
                                </div>

                                {/* Contract Image Section */}
                                {/* <div>
                                    <h6 className="text-sm font-medium text-gray-700 dark:text-white mb-3">
                                        {t('contract_image')} <span className="text-xs text-gray-500">({t('optional')})</span>
                                    </h6>
                                    <div className="flex items-center gap-4">
                                       
                                        {contractPreview || existingContractImage ? (
                                            <div className="relative group">
                                                <img src={contractPreview || existingContractImage} alt="Contract preview" className="w-24 h-24 object-cover rounded-lg border-2 border-gray-200" />
                                                <button
                                                    type="button"
                                                    onClick={contractPreview ? removeContract : removeExistingContract}
                                                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <IconX className="w-3 h-3" />
                                                </button>
                                            </div>
                                        ) : (
                                            <div
                                                onClick={handleContractSelect}
                                                className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center cursor-pointer hover:border-primary hover:bg-gray-50 dark:border-gray-600 dark:hover:border-primary dark:hover:bg-gray-800 transition-colors"
                                            >
                                                <IconUpload className="w-6 h-6 text-gray-400" />
                                            </div>
                                        )}
                                        <div className="flex-1">
                                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{t('upload_contract_image')}</p>
                                            <p className="text-xs text-gray-500">{t('contract_image_description')}</p>
                                            <button type="button" onClick={handleContractSelect} className="btn btn-outline-primary btn-sm mt-2">
                                                {contractPreview || existingContractImage ? t('change_contract_image') : t('select_contract_image')}
                                            </button>
                                        </div>
                                    </div>
                                    <input ref={contractInputRef} type="file" accept="image/*" onChange={handleContractChange} className="hidden" />
                                </div> */}

                                {/* Gallery Section */}
                                <div>
                                    <h6 className="text-sm font-medium text-gray-700 dark:text-white mb-3">
                                        {t('gallery_images')} <span className="text-xs text-gray-500">({t('optional')})</span>
                                    </h6>
                                    {/* Gallery Grid */}
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 mb-4">
                                        {/* Existing Gallery Images (excluding first image which is thumbnail) */}
                                        {existingImages.slice(1).map((imageUrl, index) => (
                                            <div key={`existing-gallery-${index}`} className="relative group aspect-square">
                                                <img src={imageUrl} alt={`Gallery image ${index + 1}`} className="w-full h-full object-cover rounded-lg border" />
                                                <button
                                                    type="button"
                                                    onClick={() => removeExistingImage(index + 1)} // +1 because we're excluding thumbnail
                                                    className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <IconX className="w-3 h-3" />
                                                </button>
                                            </div>
                                        ))}
                                        {/* New Gallery Images */}
                                        {galleryPreviews.map((preview, index) => (
                                            <div key={`gallery-preview-${index}`} className="relative group aspect-square">
                                                <img src={preview} alt={`Gallery preview ${index + 1}`} className="w-full h-full object-cover rounded-lg border" />
                                                <button
                                                    type="button"
                                                    onClick={() => removeGalleryImage(index)}
                                                    className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <IconX className="w-3 h-3" />
                                                </button>
                                            </div>
                                        ))}
                                        {/* Add More Gallery Images Button */}
                                        {existingImages.length - 1 + galleryPreviews.length < 9 && (
                                            <div
                                                onClick={handleGallerySelect}
                                                className="w-full aspect-square border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center cursor-pointer hover:border-primary hover:bg-gray-50 dark:border-gray-600 dark:hover:border-primary dark:hover:bg-gray-800 transition-colors"
                                            >
                                                <IconUpload className="w-5 h-5 text-gray-400" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <button type="button" onClick={handleGallerySelect} className="btn btn-outline-secondary btn-sm">
                                            {t('add_gallery_images')}
                                        </button>
                                        <p className="text-xs text-gray-500">
                                            {existingImages.length - 1 + galleryPreviews.length}/9 {t('images')}
                                        </p>
                                    </div>
                                    <input ref={galleryInputRef} type="file" accept="image/*" multiple onChange={handleGalleryChange} className="hidden" />
                                    <p className="text-xs text-gray-500 mt-2">{t('gallery_description')}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Tab 2: Colors */}
                    {activeTab === 2 && (
                        <div className="space-y-5">
                            {/* Colors Section */}
                            <div className="space-y-5">
                                <div className="mb-5">
                                    <h5 className="text-lg font-semibold dark:text-white-light">{t('color_variants')}</h5>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">{t('add_first_color')}</p>
                                </div>
                                {/* Add Color Button */}
                                <div className="flex justify-between items-center">
                                    <button type="button" onClick={addColor} className="btn btn-primary">
                                        <IconPlus className="w-4 h-4 mr-2" />
                                        {t('add_color')}
                                    </button>
                                </div>
                                {/* Colors List */}
                                {colors.length === 0 ? (
                                    <div className="text-center py-8">
                                        <p className="text-gray-500 dark:text-gray-400">{t('no_colors_added')}</p>
                                    </div>
                                ) : (
                                    <div className="space-y-6">
                                        {colors.map((color, index) => (
                                            <div key={color.id} className="border border-gray-200 dark:border-gray-600 rounded-lg p-6">
                                                <div className="flex items-center justify-between mb-4">
                                                    <h6 className="text-lg font-medium">
                                                        {t('color_name')} #{index + 1}
                                                    </h6>
                                                    <button type="button" onClick={() => removeColor(color.id)} className="btn btn-outline-danger">
                                                        {t('remove_color')}
                                                    </button>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                    {/* Color Picker */}
                                                    <div>
                                                        <label className="block text-sm font-bold text-gray-700 dark:text-white mb-2">{t('color_value')}</label>
                                                        <div className="w-12 h-12 overflow-hidden flex justify-center items-center rounded-full border border-gray-300 dark:border-gray-600 cursor-pointer">
                                                            <input
                                                                type="color"
                                                                value={color.color}
                                                                onChange={(e) => updateColorValue(color.id, e.target.value)}
                                                                className="w-14 h-14 scale-150 cursor-pointer"
                                                            />
                                                        </div>
                                                        <p className="text-xs text-gray-500 mt-1">{color.color.toUpperCase()}</p>
                                                    </div>

                                                    {/* Color Images */}
                                                    <div>
                                                        <label className="block text-sm font-bold text-gray-700 dark:text-white mb-2">{t('color_images')}</label>
                                                        <div className="grid grid-cols-3 gap-3">
                                                            {/* Color Image Previews */}
                                                            {color.previews.map((preview, imgIndex) => (
                                                                <div key={imgIndex} className="relative group aspect-square">
                                                                    <img
                                                                        src={preview}
                                                                        alt={`Color ${color.color} image ${imgIndex + 1}`}
                                                                        className="w-full h-full object-cover rounded-lg border border-gray-200 dark:border-gray-600"
                                                                    />
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => removeColorImage(color.id, imgIndex)}
                                                                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                                                    >
                                                                        <IconX className="w-3 h-3" />
                                                                    </button>
                                                                </div>
                                                            ))}
                                                            {/* Upload Button */}
                                                            {color.previews.length < 10 && (
                                                                <label className="cursor-pointer aspect-square">
                                                                    <div className="w-full h-full border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg flex items-center justify-center hover:border-primary hover:bg-gray-50 dark:hover:border-primary dark:hover:bg-gray-800 transition-colors">
                                                                        <IconUpload className="w-6 h-6 text-gray-400" />
                                                                    </div>
                                                                    <input type="file" accept="image/*" multiple onChange={(e) => handleColorImageChange(color.id, e)} className="hidden" />
                                                                </label>
                                                            )}
                                                        </div>
                                                        <p className="text-xs text-gray-500 mt-2">
                                                            {color.previews.length}/10 {t('images')} • {t('max_color_images')}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Tab 3: Features */}
                    {activeTab === 3 && (
                        <div className="space-y-5">
                            <div className="mb-5">
                                <h5 className="text-lg font-semibold dark:text-white-light">{t('car_features')}</h5>
                                <p className="text-sm text-gray-500 dark:text-gray-400">{t('add_car_features_description')}</p>
                            </div>
                            {/* Add Feature Button */}
                            <div className="flex justify-between items-center">
                                <button type="button" onClick={addFeature} className="btn btn-primary">
                                    <IconPlus className="w-4 h-4 mr-2" />
                                    {t('add_feature')}
                                </button>
                            </div>
                            {/* Features List */}
                            {features.length === 0 ? (
                                <div className="text-center py-12">
                                    <div className="text-gray-400 mb-4">
                                        <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={1}
                                                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                            />
                                        </svg>
                                    </div>
                                    <p className="text-gray-500 dark:text-gray-400">{t('no_features_added')}</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {features.map((feature, index) => (
                                        <div key={feature.id} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                                            <div className="flex items-center justify-between mb-3">
                                                <h6 className="text-base font-medium">
                                                    {t('feature')} #{index + 1}
                                                </h6>
                                                <button type="button" onClick={() => removeFeature(feature.id)} className="btn btn-outline-danger btn-sm">
                                                    {t('remove')}
                                                </button>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {/* Feature Label */}
                                                <div>
                                                    <label className="block text-sm font-bold text-gray-700 dark:text-white mb-2">{t('feature_label')}</label>
                                                    <input
                                                        type="text"
                                                        value={feature.label}
                                                        onChange={(e) => updateFeature(feature.id, 'label', e.target.value)}
                                                        className="form-input"
                                                        placeholder={t('enter_feature_label')}
                                                    />
                                                </div>

                                                {/* Feature Value */}
                                                <div>
                                                    <label className="block text-sm font-bold text-gray-700 dark:text-white mb-2">{t('feature_value')}</label>
                                                    <input
                                                        type="text"
                                                        value={feature.value}
                                                        onChange={(e) => updateFeature(feature.id, 'value', e.target.value)}
                                                        className="form-input"
                                                        placeholder={t('enter_feature_value')}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Submit Button */}
                    <div className="flex justify-end gap-4 mt-8">
                        <button type="button" onClick={() => router.back()} className="btn btn-outline-danger">
                            {t('cancel')}
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={saving}>
                            {saving ? t('updating') : t('update_car')}
                        </button>
                    </div>
                </form>
            </div>

            {/* Create Customer Modal */}
            <CreateCustomerModal isOpen={isCreateCustomerModalOpen} onClose={() => setIsCreateCustomerModalOpen(false)} onCustomerCreated={handleCustomerCreated} />
        </div>
    );
};

export default EditCar;
