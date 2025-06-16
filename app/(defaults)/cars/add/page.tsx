'use client';
import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import supabase from '@/lib/supabase';
import { Alert } from '@/components/elements/alerts/elements-alerts-default';
import { getTranslation } from '@/i18n';
import IconX from '@/components/icon/icon-x';
import IconUpload from '@/components/icon/icon-camera';
import IconPlus from '@/components/icon/icon-plus';
import IconGallery from '@/components/icon/icon-gallery';
import BrandSelect from '@/components/brand-select/brand-select';
import StatusSelect from '@/components/status-select/status-select';
import ProviderSelect from '@/components/provider-select/provider-select';
import TypeSelect from '@/components/type-select/type-select';

interface ColorVariant {
    id: string;
    color: string;
    images: File[];
    previews: string[];
}

const AddCar = () => {
    const { t } = getTranslation();
    const router = useRouter();
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState(1);
    const [form, setForm] = useState({
        title: '',
        year: '',
        brand: '',
        status: '',
        type: '',
        provider: '',
        kilometers: '',
        market_price: '',
        value_price: '',
        sale_price: '',
        desc: '', // New description field
    });

    // Separate states for thumbnail and gallery images
    const [thumbnailImage, setThumbnailImage] = useState<File | null>(null);
    const [thumbnailPreview, setThumbnailPreview] = useState<string>('');
    const [galleryImages, setGalleryImages] = useState<File[]>([]);
    const [galleryPreviews, setGalleryPreviews] = useState<string[]>([]);
    const thumbnailInputRef = useRef<HTMLInputElement>(null);
    const galleryInputRef = useRef<HTMLInputElement>(null); // Colors state
    const [colors, setColors] = useState<ColorVariant[]>([]);

    // Features state
    interface Feature {
        id: string;
        label: string;
        value: string;
    }
    const [features, setFeatures] = useState<Feature[]>([]);

    const [alert, setAlert] = useState<{ visible: boolean; message: string; type: 'success' | 'danger' }>({
        visible: false,
        message: '',
        type: 'success',
    });
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
        if (form.kilometers && parseFloat(form.kilometers) < 0) {
            setAlert({ visible: true, message: t('kilometers_must_be_positive'), type: 'danger' });
            return false;
        }
        if (form.market_price && parseFloat(form.market_price) < 0) {
            setAlert({ visible: true, message: t('price_must_be_positive'), type: 'danger' });
            return false;
        }
        if (form.value_price && parseFloat(form.value_price) < 0) {
            setAlert({ visible: true, message: t('price_must_be_positive'), type: 'danger' });
            return false;
        }
        if (form.sale_price && parseFloat(form.sale_price) < 0) {
            setAlert({ visible: true, message: t('price_must_be_positive'), type: 'danger' });
            return false;
        }
        return true;
    };
    const uploadImages = async (carId: string) => {
        const imageUrls: string[] = [];
        const colorData: Array<{ color: string; images: string[] }> = [];

        // Upload thumbnail first (it will be at index 0)
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

        // Upload gallery images
        for (let i = 0; i < galleryImages.length; i++) {
            const file = galleryImages[i];
            const fileExt = file.name.split('.').pop();
            const fileName = `${carId}/gallery_${i + 1}.${fileExt}`;

            const { data, error } = await supabase.storage.from('cars').upload(fileName, file);

            if (error) {
                console.error('Error uploading gallery image:', error);
                throw error;
            }

            imageUrls.push(fileName);
        }

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

        return { imageUrls, colorData };
    };
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) return;

        setSaving(true);
        try {
            // First, create the car record without images to get the car ID
            const carData = {
                title: form.title.trim(),
                year: parseInt(form.year),
                brand: form.brand.trim(),
                status: form.status,
                type: form.type || null,
                provider: form.provider || null,
                kilometers: form.kilometers ? parseFloat(form.kilometers) : 0,
                market_price: form.market_price ? parseFloat(form.market_price) : 0,
                value_price: form.value_price ? parseFloat(form.value_price) : 0,
                sale_price: form.sale_price ? parseFloat(form.sale_price) : 0,
                desc: form.desc.trim() || null, // New description field
                features: features.filter((f) => f.label.trim() && f.value.trim()).map((f) => ({ label: f.label.trim(), value: f.value.trim() })), // New features field
                images: [], // Initially empty
                colors: [], // Initially empty, will be updated after upload
            };

            const { data, error } = await supabase.from('cars').insert([carData]).select();

            if (error) throw error;

            if (!data || data.length === 0) {
                throw new Error('Failed to create car record');
            }
            const newCarId = data[0].id;

            // Now upload images using the car ID as folder name
            const { imageUrls, colorData } = await uploadImages(newCarId);

            // Update the car record with image paths and color data
            const updateData: any = {};
            if (imageUrls.length > 0) {
                updateData.images = imageUrls;
            }
            if (colorData.length > 0) {
                updateData.colors = colorData;
            }

            if (Object.keys(updateData).length > 0) {
                const { error: updateError } = await supabase.from('cars').update(updateData).eq('id', newCarId);

                if (updateError) throw updateError;
            }

            setAlert({ visible: true, message: t('car_added_successfully'), type: 'success' });

            // Redirect to cars list after a short delay
            setTimeout(() => {
                router.push('/cars');
            }, 1500);
        } catch (error) {
            console.error(error);
            setAlert({
                visible: true,
                message: error instanceof Error ? error.message : t('error_adding_car'),
                type: 'danger',
            });
        } finally {
            setSaving(false);
        }
    };

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
                        <span>{t('add_new_car')}</span>
                    </li>
                </ul>
            </div>
            <div className="mb-6">
                <h1 className="text-2xl font-bold">{t('add_new_car')}</h1>
                <p className="text-gray-500">{t('create_car_listing')}</p>
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
                                        className="form-input"
                                        placeholder={t('enter_year')}
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
                                {/* Provider */}
                                <div>
                                    <label htmlFor="provider" className="block text-sm font-bold text-gray-700 dark:text-white mb-2">
                                        {t('provider')}
                                    </label>
                                    <ProviderSelect defaultValue={form.provider} className="form-input" name="provider" onChange={handleInputChange} />
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
                                        <span className="inline-flex items-center px-3 bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 border border-r-0 border-gray-300 dark:border-gray-600 ltr:rounded-l-md rtl:rounded-r-md ltr:border-r-0 rtl:border-l-0">
                                            $
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
                                <div>
                                    <label htmlFor="value_price" className="block text-sm font-bold text-gray-700 dark:text-white mb-2">
                                        {t('value_price')}
                                    </label>
                                    <div className="flex">
                                        <span className="inline-flex items-center px-3 bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 border border-r-0 border-gray-300 dark:border-gray-600 ltr:rounded-l-md rtl:rounded-r-md ltr:border-r-0 rtl:border-l-0">
                                            $
                                        </span>
                                        <input
                                            type="number"
                                            id="value_price"
                                            name="value_price"
                                            step="0.01"
                                            min="0"
                                            value={form.value_price}
                                            onChange={handleInputChange}
                                            className="form-input ltr:rounded-l-none rtl:rounded-r-none"
                                            placeholder="0.00"
                                        />
                                    </div>
                                </div>
                                {/* Sale Price */}
                                <div>
                                    <label htmlFor="sale_price" className="block text-sm font-bold text-gray-700 dark:text-white mb-2">
                                        {t('sale_price')}
                                    </label>
                                    <div className="flex">
                                        <span className="inline-flex items-center px-3 bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 border border-r-0 border-gray-300 dark:border-gray-600 ltr:rounded-l-md rtl:rounded-r-md ltr:border-r-0 rtl:border-l-0">
                                            $
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
                            </div>

                            {/* Car Description */}
                            <div className="mt-5">
                                <label htmlFor="desc" className="block text-sm font-bold text-gray-700 dark:text-white mb-2">
                                    {t('car_description')}
                                </label>
                                <textarea id="desc" name="desc" value={form.desc} onChange={handleInputChange} className="form-input" placeholder={t('enter_car_description')} rows={4} />
                            </div>

                            {/* Car Images */}
                            <div className="space-y-6">
                                {/* Thumbnail Section */}
                                <div>
                                    <label className="mb-3 block text-sm font-bold text-gray-700 dark:text-white">{t('car_thumbnail')}</label>
                                    <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">{t('thumbnail_description')}</p>

                                    <div className="flex items-center gap-4">
                                        {/* Thumbnail Preview */}
                                        {thumbnailPreview ? (
                                            <div className="group relative h-32 w-32">
                                                <img src={thumbnailPreview} alt="Thumbnail preview" className="h-full w-full rounded-lg object-cover" />
                                                <button
                                                    type="button"
                                                    className="absolute right-0 top-0 hidden rounded-full bg-red-500 p-1 text-white hover:bg-red-600 group-hover:block"
                                                    onClick={removeThumbnail}
                                                >
                                                    <IconX className="h-4 w-4" />
                                                </button>
                                            </div>
                                        ) : (
                                            <div
                                                onClick={handleThumbnailSelect}
                                                className="flex h-32 w-32 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 hover:border-primary hover:bg-gray-100 dark:border-[#1b2e4b] dark:bg-black dark:hover:border-primary dark:hover:bg-[#1b2e4b]"
                                            >
                                                <IconUpload className="mb-2 h-6 w-6" />
                                                <p className="text-xs text-gray-600 dark:text-gray-400">{t('upload_thumbnail')}</p>
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
                    )}

                    {/* Tab 2: Colors */}
                    {activeTab === 2 && (
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
                                <div className="text-center py-12">
                                    <div className="text-gray-400 mb-4">
                                        <IconGallery className="w-16 h-16 mx-auto" />
                                    </div>
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
                                                    <div className="flex items-center gap-3">
                                                        <input
                                                            type="color"
                                                            value={color.color}
                                                            onChange={(e) => updateColorValue(color.id, e.target.value)}
                                                            className="w-12 h-12 rounded border border-gray-300 dark:border-gray-600 cursor-pointer"
                                                        />
                                                        <input
                                                            type="text"
                                                            value={color.color}
                                                            onChange={(e) => updateColorValue(color.id, e.target.value)}
                                                            className="form-input flex-1"
                                                            placeholder="#000000"
                                                        />
                                                    </div>
                                                </div>

                                                {/* Color Images */}
                                                <div>
                                                    <label className="block text-sm font-bold text-gray-700 dark:text-white mb-2">{t('color_images')}</label>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">{t('max_color_images')}</p>

                                                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                                                        {/* Add Images Button */}
                                                        {color.images.length < 10 && (
                                                            <div
                                                                onClick={() => {
                                                                    const input = document.createElement('input');
                                                                    input.type = 'file';
                                                                    input.accept = 'image/*';
                                                                    input.multiple = true;
                                                                    input.onchange = (e) => handleColorImageChange(color.id, e as any);
                                                                    input.click();
                                                                }}
                                                                className="flex aspect-square cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 hover:border-primary hover:bg-gray-100 dark:border-[#1b2e4b] dark:bg-black dark:hover:border-primary dark:hover:bg-[#1b2e4b]"
                                                            >
                                                                <IconUpload className="mb-1 h-4 w-4" />
                                                                <p className="text-xs text-gray-600 dark:text-gray-400">{t('upload_color_images')}</p>
                                                            </div>
                                                        )}
                                                        {/* Color Image Previews */}
                                                        {color.previews.map((url, imgIndex) => (
                                                            <div key={imgIndex} className="group relative aspect-square">
                                                                <img src={url} alt={`Color ${index + 1} - ${imgIndex + 1}`} className="h-full w-full rounded-lg object-cover" />
                                                                <button
                                                                    type="button"
                                                                    className="absolute right-0 top-0 hidden rounded-full bg-red-500 p-1 text-white hover:bg-red-600 group-hover:block"
                                                                    onClick={() => removeColorImage(color.id, imgIndex)}
                                                                >
                                                                    <IconX className="h-3 w-3" />
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
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
                            {saving ? t('creating') : t('create_car')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddCar;
