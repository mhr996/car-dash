'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import supabase from '@/lib/supabase';
import { Alert } from '@/components/elements/alerts/elements-alerts-default';
import CountrySelect from '@/components/country-select/country-select';
import { getTranslation } from '@/i18n';

const AddUserPage = () => {
    const router = useRouter();
    const { t } = getTranslation();
    const [form, setForm] = useState({
        full_name: '',
        email: '',
        country: '',
        address: '',
        phone: '',
        status: 'Active',
    });
    const [alert, setAlert] = useState<{ visible: boolean; message: string; type: 'success' | 'danger' }>({
        visible: false,
        message: '',
        type: 'success',
    });
    const [loading, setLoading] = useState(false);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setForm((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        // Basic validation: full name and email are required
        if (!form.full_name || !form.email) {
            setAlert({ visible: true, message: t('full_name_email_required'), type: 'danger' });
            setLoading(false);
            return;
        }

        try {
            // Get the user's session for authentication
            const { data: sessionData } = await supabase.auth.getSession();
            const token = sessionData?.session?.access_token;

            if (!token) {
                throw new Error(t('not_authenticated'));
            }

            // Call our secure API endpoint to invite the user
            const response = await fetch('/api/users/invite', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    email: form.email,
                    userData: {
                        display_name: form.full_name,
                    },
                    profileData: {
                        full_name: form.full_name,
                        country: form.country,
                        address: form.address,
                        phone: form.phone,
                        status: form.status,
                    },
                }),
            });
            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || t('failed_to_invite_user'));
            }

            setAlert({
                visible: true,
                message: t('user_added_invitation_sent'),
                type: 'success',
            });

            // Redirect back to the users list page after successful insertion
            setTimeout(() => {
                router.push('/users');
            }, 2000);
        } catch (error: any) {
            console.error(error);
            setAlert({ visible: true, message: error.message || t('error_adding_user'), type: 'danger' });
        } finally {
            setLoading(false);
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
                        <Link href="/users" className="text-primary hover:underline">
                            {t('users')}
                        </Link>
                    </li>
                    <li className="before:content-['/'] ltr:before:mr-2 rtl:before:ml-2">
                        <span>{t('add_new_user')}</span>
                    </li>
                </ul>
            </div>
            {alert.visible && (
                <div className="mb-4">
                    <Alert type={alert.type} title={alert.type === 'success' ? t('success') : t('error')} message={alert.message} onClose={() => setAlert({ ...alert, visible: false })} />
                </div>
            )}
            {/* Form Container */}
            <div className="rounded-md border border-[#ebedf2] bg-white p-4 dark:border-[#191e3a] dark:bg-black">
                <h6 className="mb-5 text-lg font-bold">{t('add_new_user')}</h6>
                <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <div>
                        <label htmlFor="full_name" className="block text-sm font-bold text-gray-700 dark:text-white">
                            {t('full_name')} *
                        </label>
                        <input type="text" id="full_name" name="full_name" value={form.full_name} onChange={handleInputChange} className="form-input" placeholder={t('enter_full_name')} required />
                    </div>
                    <div>
                        <label htmlFor="email" className="block text-sm font-bold text-gray-700 dark:text-white">
                            {t('email')} *
                        </label>
                        <input type="email" id="email" name="email" value={form.email} onChange={handleInputChange} className="form-input" placeholder={t('enter_email')} required />
                    </div>
                    <div>
                        <label htmlFor="country" className="block text-sm font-bold text-gray-700 dark:text-white">
                            {t('country')}
                        </label>
                        <CountrySelect
                            id="country"
                            name="country"
                            defaultValue={form.country}
                            className="form-select text-white-dark"
                            onChange={(e) => {
                                setForm((prev) => ({
                                    ...prev,
                                    country: e.target.value,
                                }));
                            }}
                        />
                    </div>
                    <div>
                        <label htmlFor="address" className="block text-sm font-bold text-gray-700 dark:text-white">
                            {t('address')}
                        </label>
                        <input type="text" id="address" name="address" value={form.address} onChange={handleInputChange} className="form-input" placeholder={t('enter_address')} />
                    </div>
                    <div className="sm:col-span-2">
                        <label htmlFor="phone" className="block text-sm font-bold text-gray-700 dark:text-white">
                            {t('phone')}
                        </label>
                        <input type="text" id="phone" name="phone" value={form.phone} onChange={handleInputChange} className="form-input lg:max-w-[49%]" placeholder={t('enter_phone')} />
                    </div>
                    <div className="sm:col-span-2">
                        <button type="submit" disabled={loading} className="btn btn-primary">
                            {loading ? t('sending_invitation') : t('add_user_send_invitation')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddUserPage;
