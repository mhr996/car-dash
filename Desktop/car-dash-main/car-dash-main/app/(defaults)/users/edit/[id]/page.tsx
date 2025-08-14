'use client';
import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import supabase from '@/lib/supabase';
import { Alert } from '@/components/elements/alerts/elements-alerts-default';
import CountrySelect from '@/components/country-select/country-select';
import { getTranslation } from '@/i18n';

const EditUserPage = () => {
    const router = useRouter();
    const params = useParams();
    const { t } = getTranslation();
    const userId = params?.id as string;

    if (!userId) {
        return (
            <div className="container mx-auto p-6">
                <div className="text-center">
                    <p className="text-red-500">{t('invalid_user_id')}</p>
                    <Link href="/users" className="btn btn-primary mt-4">
                        {t('back_to_users')}
                    </Link>
                </div>
            </div>
        );
    }

    const [form, setForm] = useState({
        full_name: '',
        email: '',
        country: '',
        address: '',
        phone: '',
    });

    const [alert, setAlert] = useState<{ visible: boolean; message: string; type: 'success' | 'danger' }>({
        visible: false,
        message: '',
        type: 'success',
    });

    const [loading, setLoading] = useState(false);
    const [fetchLoading, setFetchLoading] = useState(true);

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const { data, error } = await supabase.from('users').select('full_name, email, country, address, phone').eq('id', userId).single();

                if (error) throw error;

                if (data) {
                    setForm({
                        full_name: data.full_name || '',
                        email: data.email || '',
                        country: data.country || '',
                        address: data.address || '',
                        phone: data.phone || '',
                    });
                }
            } catch (error) {
                console.error('Error fetching user:', error);
                setAlert({
                    visible: true,
                    message: t('error_fetching_user'),
                    type: 'danger',
                });
            } finally {
                setFetchLoading(false);
            }
        };

        if (userId) {
            fetchUser();
        }
    }, [userId, t]);

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
            // Update user profile in database
            const { error: profileError } = await supabase
                .from('users')
                .update({
                    full_name: form.full_name,
                    email: form.email,
                    country: form.country,
                    address: form.address,
                    phone: form.phone,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', userId);

            if (profileError) throw profileError;

            // Update auth email if it changed
            const { data: authUser } = await supabase.auth.getUser();
            if (authUser.user && authUser.user.email !== form.email) {
                const { error: authError } = await supabase.auth.updateUser({
                    email: form.email,
                    data: { display_name: form.full_name },
                });

                if (authError) {
                    console.warn('Warning: Could not update auth email:', authError);
                }
            }

            setAlert({
                visible: true,
                message: t('user_updated_successfully'),
                type: 'success',
            });

            // Redirect back to users list after a delay
            setTimeout(() => {
                router.push('/users');
            }, 2000);
        } catch (error: any) {
            console.error(error);
            setAlert({
                visible: true,
                message: error.message || t('error_updating_user'),
                type: 'danger',
            });
        } finally {
            setLoading(false);
        }
    };

    if (fetchLoading) {
        return (
            <div className="container mx-auto p-6">
                <div className="flex items-center justify-center min-h-[400px]">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
                        <p className="mt-4 text-gray-600">{t('loading')}</p>
                    </div>
                </div>
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
                        <Link href="/users" className="text-primary hover:underline">
                            {t('users')}
                        </Link>
                    </li>
                    <li className="before:content-['/'] ltr:before:mr-2 rtl:before:ml-2">
                        <span>{t('edit_user')}</span>
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
                <h6 className="mb-5 text-lg font-bold">{t('edit_user')}</h6>

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
                    <div className="sm:col-span-2 flex gap-4">
                        <button type="button" onClick={() => router.back()} className="btn btn-outline-danger">
                            {t('cancel')}
                        </button>
                        <button type="submit" disabled={loading} className="btn btn-primary">
                            {loading ? t('saving') : t('save_changes')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditUserPage;
