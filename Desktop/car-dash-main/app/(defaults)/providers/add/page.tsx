'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import supabase from '@/lib/supabase';
import { Alert } from '@/components/elements/alerts/elements-alerts-default';
import { getTranslation } from '@/i18n';

const AddProvider = () => {
    const { t } = getTranslation();
    const router = useRouter();
    const [saving, setSaving] = useState(false);

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

            const { data, error } = await supabase.from('providers').insert([providerData]).select();

            if (error) throw error;

            setAlert({ visible: true, message: t('provider_added_successfully'), type: 'success' });

            // Redirect to providers list after a short delay
            setTimeout(() => {
                router.push('/providers');
            }, 1500);
        } catch (error) {
            console.error(error);
            setAlert({
                visible: true,
                message: error instanceof Error ? error.message : t('error_adding_provider'),
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
                        <Link href="/providers" className="text-primary hover:underline">
                            {t('providers')}
                        </Link>
                    </li>
                    <li className="before:content-['/'] ltr:before:mr-2 rtl:before:ml-2">
                        <span>{t('add_new_provider')}</span>
                    </li>
                </ul>
            </div>

            <div className="mb-6">
                <h1 className="text-2xl font-bold">{t('add_new_provider')}</h1>
                <p className="text-gray-500">{t('create_provider_description')}</p>
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
                            {saving ? t('creating') : t('create_provider')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddProvider;
