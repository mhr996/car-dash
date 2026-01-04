'use client';
import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import supabase from '@/lib/supabase';
import { Alert } from '@/components/elements/alerts/elements-alerts-default';
import CountrySelect from '@/components/country-select/country-select';
import RoleSelect from '@/components/role-select/role-select';
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
        role: 'Admin',
    });

    const [alert, setAlert] = useState<{ visible: boolean; message: string; type: 'success' | 'danger' }>({
        visible: false,
        message: '',
        type: 'success',
    });

    const [loading, setLoading] = useState(false);
    const [fetchLoading, setFetchLoading] = useState(true);
    const [permissions, setPermissions] = useState<string[]>([]);
    const [availablePermissions, setAvailablePermissions] = useState<Array<{ key: string; name: string; description: string; category: string }>>([]);

    useEffect(() => {
        const fetchUser = async () => {
            try {
                // Fetch user profile
                const { data, error } = await supabase.from('users').select('full_name, email, country, address, phone').eq('id', userId).single();

                if (error) throw error;

                // Fetch user role
                const { data: userRoleData } = await supabase.from('user_roles').select('role_id, roles(name)').eq('user_id', userId).single();

                // Fetch user permissions
                const { data: userPermsData } = await supabase.from('user_permissions').select('permissions(key)').eq('user_id', userId).eq('granted', true);

                // Set all form data at once to avoid multiple re-renders
                if (data) {
                    setForm({
                        full_name: data.full_name || '',
                        email: data.email || '',
                        country: data.country || '',
                        address: data.address || '',
                        phone: data.phone || '',
                        role: userRoleData?.roles?.[0]?.name || 'Admin',
                    });
                }

                if (userPermsData) {
                    const permKeys = userPermsData.map((p: any) => p.permissions.key).filter(Boolean);
                    setPermissions(permKeys);
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
    useEffect(() => {
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
                })
                .eq('id', userId);

            if (profileError) throw profileError;

            // Update user role
            const { data: roleData } = await supabase.from('roles').select('id').eq('name', form.role).single();

            if (roleData) {
                // Delete existing role assignment
                await supabase.from('user_roles').delete().eq('user_id', userId);

                // Insert new role
                await supabase.from('user_roles').insert({
                    user_id: userId,
                    role_id: roleData.id,
                });
            }

            // Update user permissions (for Sales users)
            if (form.role === 'Sales') {
                // Delete existing permissions
                await supabase.from('user_permissions').delete().eq('user_id', userId);

                // Insert new permissions
                if (permissions.length > 0) {
                    const { data: permissionData } = await supabase.from('permissions').select('id, key').in('key', permissions);

                    if (permissionData && permissionData.length > 0) {
                        const userPermissions = permissionData.map((perm) => ({
                            user_id: userId,
                            permission_id: perm.id,
                            granted: true,
                        }));

                        await supabase.from('user_permissions').insert(userPermissions);
                    }
                }
            } else {
                // If changed to Admin, clear custom permissions
                await supabase.from('user_permissions').delete().eq('user_id', userId);
            }

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
