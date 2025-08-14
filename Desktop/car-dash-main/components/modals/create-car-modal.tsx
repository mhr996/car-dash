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
import TypeSelect from '@/components/type-select/type-select';
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

interface CreateCarModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCarCreated: (car: Car) => void;
}

const CreateCarModal = ({ isOpen, onClose, onCarCreated }: CreateCarModalProps) => {
    const { t } = getTranslation();
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
        buy_price: '',
        sale_price: '',
        desc: '',
    });

    // Image states
    const [thumbnailImage, setThumbnailImage] = useState<File | null>(null);
    const [thumbnailPreview, setThumbnailPreview] = useState<string>('');
    const [galleryImages, setGalleryImages] = useState<File[]>([]);
    const [galleryPreviews, setGalleryPreviews] = useState<string[]>([]);
    const thumbnailInputRef = useRef<HTMLInputElement>(null);
    const galleryInputRef = useRef<HTMLInputElement>(null);

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

        if (!form.provider) {
            newErrors.provider = t('provider_required');
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
                provider: form.provider,
                kilometers: form.kilometers ? parseInt(form.kilometers) : 0,
                market_price: form.market_price ? parseFloat(form.market_price) : 0,
                buy_price: form.buy_price ? parseFloat(form.buy_price) : 0,
                sale_price: form.sale_price ? parseFloat(form.sale_price) : 0,
                images: uploadedImages,
                desc: form.desc || '',
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
            desc: '',
        });
        setThumbnailImage(null);
        setThumbnailPreview('');
        setGalleryImages([]);
        setGalleryPreviews([]);
        setColors([]);
        setFeatures([]);
        setErrors({});
        setActiveTab(1);
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
                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {errors.submit && (
                        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                            <p className="text-red-600 dark:text-red-400 text-sm">{errors.submit}</p>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Car Title */}
                        <div className="md:col-span-2">
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
                                value={form.year}
                                onChange={handleInputChange}
                                className={`form-input ${errors.year ? 'border-red-500' : ''}`}
                                placeholder={t('enter_year')}
                                min="1900"
                                max={new Date().getFullYear() + 1}
                            />
                            {errors.year && <p className="text-red-500 text-xs mt-1">{errors.year}</p>}
                        </div>
                        {/* Brand */}
                        <div>
                            <label className="block text-sm font-bold text-gray-700 dark:text-white mb-2">
                                {t('brand')} <span className="text-red-500">*</span>
                            </label>
                            <BrandSelect defaultValue={form.brand} onChange={handleBrandChange} className={`form-input ${errors.brand ? 'border-red-500' : ''}`} name="brand" />
                            {errors.brand && <p className="text-red-500 text-xs mt-1">{errors.brand}</p>}
                        </div>
                        {/* Status */}
                        <div>
                            <label className="block text-sm font-bold text-gray-700 dark:text-white mb-2">
                                {t('status')} <span className="text-red-500">*</span>
                            </label>
                            <StatusSelect defaultValue={form.status} onChange={handleStatusChange} className={`form-input ${errors.status ? 'border-red-500' : ''}`} name="status" />
                            {errors.status && <p className="text-red-500 text-xs mt-1">{errors.status}</p>}
                        </div>
                        {/* Provider */}
                        <div>
                            <label className="block text-sm font-bold text-gray-700 dark:text-white mb-2">
                                {t('provider')} <span className="text-red-500">*</span>
                            </label>
                            <ProviderSelect defaultValue={form.provider} onChange={handleProviderChange} className={`form-input ${errors.provider ? 'border-red-500' : ''}`} name="provider" />
                            {errors.provider && <p className="text-red-500 text-xs mt-1">{errors.provider}</p>}
                        </div>
                        {/* Type */}
                        <div>
                            <label className="block text-sm font-bold text-gray-700 dark:text-white mb-2">{t('car_type')}</label>
                            <TypeSelect defaultValue={form.type} onChange={handleTypeChange} className="form-input" name="type" />
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
                                value={form.kilometers}
                                onChange={handleInputChange}
                                className={`form-input ${errors.kilometers ? 'border-red-500' : ''}`}
                                placeholder={t('enter_kilometers')}
                                min="0"
                                max="1000000"
                            />
                            {errors.kilometers && <p className="text-red-500 text-xs mt-1">{errors.kilometers}</p>}
                        </div>
                        {/* Market Price */}
                        <div>
                            <label htmlFor="market_price" className="block text-sm font-bold text-gray-700 dark:text-white mb-2">
                                {t('market_price')}
                            </label>
                            <input
                                type="number"
                                id="market_price"
                                name="market_price"
                                value={form.market_price}
                                onChange={handleInputChange}
                                className={`form-input ${errors.market_price ? 'border-red-500' : ''}`}
                                placeholder={t('enter_market_price')}
                                min="0"
                                step="0.01"
                            />
                            {errors.market_price && <p className="text-red-500 text-xs mt-1">{errors.market_price}</p>}
                        </div>
                        {/* Buy Price */}
                        <div>
                            <label htmlFor="buy_price" className="block text-sm font-bold text-gray-700 dark:text-white mb-2">
                                {t('buy_price')}
                            </label>
                            <input
                                type="number"
                                id="buy_price"
                                name="buy_price"
                                value={form.buy_price}
                                onChange={handleInputChange}
                                className={`form-input ${errors.buy_price ? 'border-red-500' : ''}`}
                                placeholder={t('enter_buy_price')}
                                min="0"
                                step="0.01"
                            />
                            {errors.buy_price && <p className="text-red-500 text-xs mt-1">{errors.buy_price}</p>}
                        </div>
                        {/* Sale Price */}
                        <div>
                            <label htmlFor="sale_price" className="block text-sm font-bold text-gray-700 dark:text-white mb-2">
                                {t('sale_price')}
                            </label>
                            <input
                                type="number"
                                id="sale_price"
                                name="sale_price"
                                value={form.sale_price}
                                onChange={handleInputChange}
                                className={`form-input ${errors.sale_price ? 'border-red-500' : ''}`}
                                placeholder={t('enter_sale_price')}
                                min="0"
                                step="0.01"
                            />
                            {errors.sale_price && <p className="text-red-500 text-xs mt-1">{errors.sale_price}</p>}
                        </div>
                    </div>

                    {/* Car Description */}
                    <div>
                        <label htmlFor="desc" className="block text-sm font-bold text-gray-700 dark:text-white mb-2">
                            {t('description')}
                        </label>
                        <textarea
                            id="desc"
                            name="desc"
                            value={form.desc}
                            onChange={handleInputChange}
                            rows={3}
                            className={`form-input ${errors.desc ? 'border-red-500' : ''}`}
                            placeholder={t('enter_car_description')}
                        />
                        {errors.desc && <p className="text-red-500 text-xs mt-1">{errors.desc}</p>}
                    </div>

                    {/* Thumbnail Image */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 dark:text-white mb-2">{t('car_thumbnail')}</label>
                        <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4">
                            {thumbnailPreview ? (
                                <div className="relative">
                                    <img src={thumbnailPreview} alt="Thumbnail preview" className="w-32 h-24 object-cover rounded-lg mx-auto" />
                                    <button
                                        type="button"
                                        onClick={removeThumbnail}
                                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600"
                                    >
                                        <IconX className="w-3 h-3" />
                                    </button>
                                </div>
                            ) : (
                                <div onClick={handleThumbnailSelect} className="text-center cursor-pointer">
                                    <IconUpload className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                                    <button type="button" className="text-primary hover:underline">
                                        {t('upload_thumbnail')}
                                    </button>
                                    <p className="text-xs text-gray-500 mt-1">{t('thumbnail_formats')}</p>
                                </div>
                            )}
                            <input ref={thumbnailInputRef} type="file" accept="image/*" onChange={handleThumbnailChange} className="hidden" />
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                            <strong>{t('note')}:</strong> {t('images_can_be_added_later')}
                        </p>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-end gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <button type="button" onClick={handleClose} className="btn btn-outline-secondary" disabled={saving}>
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

export default CreateCarModal;
