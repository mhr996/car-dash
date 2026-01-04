'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import supabase from '@/lib/supabase';
import { Alert } from '@/components/elements/alerts/elements-alerts-default';
import CountrySelect from '@/components/country-select/country-select';
import RoleSelect from '@/components/role-select/role-select';
import { getTranslation } from '@/i18n';
import IconEye from '@/components/icon/icon-eye';

const AddUserPage = () => {
    const router = useRouter();
    const { t } = getTranslation();
    const [form, setForm] = useState({
        full_name: '',
        email: '',
        password: '',
        country: '',
        address: '',
        phone: '',
        status: 'Active',
        role: 'Admin',
    });
    const [showPassword, setShowPassword] = useState(false);
    const [alert, setAlert] = useState<{ visible: boolean; message: string; type: 'success' | 'danger' }>({
        visible: false,
        message: '',
        type: 'success',
    });
    const [loading, setLoading] = useState(false);
    const [permissions, setPermissions] = useState<string[]>([]);
    const [availablePermissions, setAvailablePermissions] = useState<Array<{ key: string; name: string; description: string; category: string }>>([]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setForm((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handlePermissionToggle = (permissionKey: string) => {
        setPermissions((prev) => {
            if (prev.includes(permissionKey)) {
                return prev.filter((key) => key !== permissionKey);
            } else {
                return [...prev, permissionKey];
            }
        });
    };

    // Fetch available permissions on component mount
    React.useEffect(() => {
        const fetchPermissions = async () => {
            try {
                const { data, error } = await supabase.from('permissions').select('*').order('category', { ascending: true });
                if (data && !error) {
                    setAvailablePermissions(data);
                }
            } catch (error) {
                console.error('Error fetching permissions:', error);
            }
        };
        fetchPermissions();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        // Basic validation: full name, email and password are required
        if (!form.full_name || !form.email) {
            setAlert({ visible: true, message: t('full_name_email_required'), type: 'danger' });
            setLoading(false);
            return;
        }

        // Password validation
        if (!form.password || form.password.length < 6) {
            setAlert({ visible: true, message: t('password_required_min_6'), type: 'danger' });
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

            // Call our secure API endpoint to create the user directly with password
            const response = await fetch('/api/users/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    email: form.email,
                    password: form.password,
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
                    role: form.role,
                    permissions: form.role === 'Sales' ? permissions : [],
                }),
            });
            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || t('failed_to_create_user'));
            }

            setAlert({
                visible: true,
                message: t('user_created_successfully'),
                type: 'success',
            });

            // Redirect back to the users list page after successful creation
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
                        <label htmlFor="password" className="block text-sm font-bold text-gray-700 dark:text-white">
                            {t('password')} *
                        </label>
                        <div className="relative">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                id="password"
                                name="password"
                                value={form.password}
                                onChange={handleInputChange}
                                className="form-input pr-12"
                                placeholder={t('enter_password')}
                                minLength={6}
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors"
                            >
                                {showPassword ? (
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M2 2L22 22" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                        <path
                                            d="M6.71 6.71C4.33 8.26 2.67 10.94 2 12C2.67 13.06 4.33 15.74 6.71 17.29"
                                            stroke="currentColor"
                                            strokeWidth="1.5"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        />
                                        <path
                                            d="M10.59 10.59C10.21 11.37 10.21 12.63 10.59 13.41C10.97 14.19 11.81 14.81 12.59 14.59"
                                            stroke="currentColor"
                                            strokeWidth="1.5"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        />
                                        <path
                                            d="M17.29 17.29C19.67 15.74 21.33 13.06 22 12C21.33 10.94 19.67 8.26 17.29 6.71"
                                            stroke="currentColor"
                                            strokeWidth="1.5"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        />
                                    </svg>
                                ) : (
                                    <IconEye className="w-5 h-5" />
                                )}
                            </button>
                        </div>
                        <p className="mt-2 text-xs text-gray-500 dark:text-gray-500">{t('password_min_6_chars')}</p>
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
                    <div className="w-full">
                        <label htmlFor="phone" className="block text-sm font-bold text-gray-700 dark:text-white">
                            {t('phone')}
                        </label>
                        <input type="text" id="phone" name="phone" value={form.phone} onChange={handleInputChange} className="form-input lg:max-w-[49%]" placeholder={t('enter_phone')} />
                    </div>
                    <div className="sm:col-span-2">
                        <label htmlFor="role" className="block text-sm font-bold text-gray-700 dark:text-white">
                            {t('user_role')} *
                        </label>
                        <RoleSelect
                            id="role"
                            name="role"
                            defaultValue={form.role}
                            className="form-select text-white-dark lg:max-w-[49%]"
                            onChange={(e) => {
                                setForm((prev) => ({
                                    ...prev,
                                    role: e.target.value,
                                }));
                            }}
                        />
                        <p className="mt-2 text-xs text-gray-500 dark:text-gray-500">{t('select_user_role_description')}</p>
                    </div>

                    {/* Permissions Section - Only visible for Sales role */}
                    {form.role === 'Sales' && (
                        <div className="sm:col-span-2">
                            <label className="block text-sm font-bold text-gray-700 dark:text-white mb-3">{t('page_access_permissions')}</label>
                            <div className="rounded-md border border-[#ebedf2] bg-gray-50 p-4 dark:border-[#191e3a] dark:bg-[#0e1726]">
                                <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">{t('select_pages_sales_user_can_access')}</p>

                                {/* Group permissions by category */}
                                {['main', 'users', 'accounting', 'settings'].map((category) => {
                                    const categoryPerms = availablePermissions.filter((p) => p.category === category);
                                    if (categoryPerms.length === 0) return null;

                                    return (
                                        <div key={category} className="mb-4">
                                            <h3 className="mb-2 text-sm font-semibold text-gray-700 dark:text-white capitalize">
                                                {category === 'main' ? t('main') : category === 'users' ? t('user_and_pages') : category === 'accounting' ? t('accounting') : t('general_settings')}
                                            </h3>
                                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                                                {categoryPerms.map((permission) => (
                                                    <label key={permission.key} className="flex items-start cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={permissions.includes(permission.key)}
                                                            onChange={() => handlePermissionToggle(permission.key)}
                                                            className="form-checkbox mt-1 h-4 w-4 text-primary"
                                                        />
                                                        <span className="ltr:ml-2 rtl:mr-2">
                                                            <span className="block text-sm font-medium text-gray-700 dark:text-white">{t(`permission_${permission.key}`)}</span>
                                                            {permission.description && <span className="block text-xs text-gray-500 dark:text-gray-400">{t(`permission_${permission.key}_desc`)}</span>}
                                                        </span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    <div className="sm:col-span-2">
                        <button type="submit" disabled={loading} className="btn btn-primary">
                            {loading ? t('creating_user') : t('create_active_user')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddUserPage;
