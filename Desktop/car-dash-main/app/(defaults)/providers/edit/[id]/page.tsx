'use client';
import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import supabase from '@/lib/supabase';
import { Alert } from '@/components/elements/alerts/elements-alerts-default';
import { getTranslation } from '@/i18n';

interface Provider {
    id: string;
    name: string;
    address: string;
    phone: string;
}

const EditProvider = () => {
    const { t } = getTranslation();
    const router = useRouter();
    const params = useParams();
    const providerId = params?.id as string;

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [provider, setProvider] = useState<Provider | null>(null);

    const [form, setForm] = useState({
        name: '',
        address: '',
        phone: '',
    });

    const [alert, setAlert] = useState<{ visible: boolean; message: string; type: 'success' | 'danger' }>({
        visible: false,
        message: '',
        type: 'success',
    });

    useEffect(() => {
        const fetchProvider = async () => {
            try {
                const { data, error } = await supabase.from('providers').select('*').eq('id', providerId).single();

                if (error) throw error;

                if (data) {
                    setProvider(data);
                    setForm({
                        name: data.name || '',
                        address: data.address || '',
                        phone: data.phone || '',
                    });
                }
            } catch (error) {
                console.error('Error fetching provider:', error);
                setAlert({ visible: true, message: t('error_loading_data'), type: 'danger' });
            } finally {
                setLoading(false);
            }
        };

        if (providerId) {
            fetchProvider();
        }
    }, [providerId]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    const validateForm = () => {
        if (!form.name.trim()) {
            setAlert({ visible: true, message: t('provider_name_required'), type: 'danger' });
            return false;
        }
        if (!form.address.trim()) {
            setAlert({ visible: true, message: t('address_required'), type: 'danger' });
            return false;
        }
        if (!form.phone.trim()) {
            setAlert({ visible: true, message: t('phone_required'), type: 'danger' });
            return false;
        }
        return true;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) return;

        setSaving(true);
        try {
            // Prepare provider data
            const providerData = {
                name: form.name.trim(),
                address: form.address.trim(),
                phone: form.phone.trim(),
            };

            const { error } = await supabase.from('providers').update(providerData).eq('id', providerId);

            if (error) throw error;

            setAlert({ visible: true, message: t('provider_updated_successfully'), type: 'success' });

            // Redirect to providers list after a short delay
            setTimeout(() => {
                router.push('/providers');
            }, 1500);
        } catch (error) {
            console.error(error);
            setAlert({
                visible: true,
                message: error instanceof Error ? error.message : t('error_updating_provider'),
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

    if (!provider) {
        return (
            <div className="flex flex-col items-center justify-center h-80">
                <p className="text-xl font-bold mb-2">{t('provider_not_found')}</p>
                <button onClick={() => router.push('/providers')} className="btn btn-primary mt-4">
                    {t('back_to_providers')}
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
                        <Link href="/providers" className="text-primary hover:underline">
                            {t('providers')}
                        </Link>
                    </li>
                    <li className="before:content-['/'] ltr:before:mr-2 rtl:before:ml-2">
                        <span>{t('edit_provider')}</span>
                    </li>
                </ul>
            </div>

            <div className="mb-6">
                <h1 className="text-2xl font-bold">{t('edit_provider')}</h1>
                <p className="text-gray-500">{t('update_provider_information')}</p>
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
                <div className="mb-5">
                    <h5 className="text-lg font-semibold dark:text-white-light">{t('provider_information')}</h5>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {/* Provider Name */}
                        <div>
                            <label htmlFor="name" className="block text-sm font-bold text-gray-700 dark:text-white mb-2">
                                {t('provider_name')} <span className="text-red-500">*</span>
                            </label>
                            <input type="text" id="name" name="name" value={form.name} onChange={handleInputChange} className="form-input" placeholder={t('enter_provider_name')} required />
                        </div>

                        {/* Phone */}
                        <div>
                            <label htmlFor="phone" className="block text-sm font-bold text-gray-700 dark:text-white mb-2">
                                {t('provider_phone')} <span className="text-red-500">*</span>
                            </label>
                            <input type="tel" id="phone" name="phone" value={form.phone} onChange={handleInputChange} className="form-input" placeholder={t('enter_provider_phone')} required />
                        </div>
                    </div>

                    {/* Address */}
                    <div>
                        <label htmlFor="address" className="block text-sm font-bold text-gray-700 dark:text-white mb-2">
                            {t('provider_address')} <span className="text-red-500">*</span>
                        </label>
                        <textarea id="address" name="address" value={form.address} onChange={handleInputChange} className="form-textarea" placeholder={t('enter_provider_address')} rows={4} required />
                    </div>

                    {/* Submit Button */}
                    <div className="flex justify-end gap-4 mt-8">
                        <button type="button" onClick={() => router.back()} className="btn btn-outline-danger">
                            {t('cancel')}
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={saving}>
                            {saving ? t('updating') : t('update_provider')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditProvider;
