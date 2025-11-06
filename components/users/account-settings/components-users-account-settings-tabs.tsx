'use client';
import CountrySelect from '@/components/country-select/country-select';
import IconDollarSignCircle from '@/components/icon/icon-dollar-sign-circle';
import IconFacebook from '@/components/icon/icon-facebook';
import IconGithub from '@/components/icon/icon-github';
import IconHome from '@/components/icon/icon-home';
import IconInfoCircle from '@/components/icon/icon-info-circle';
import IconLinkedin from '@/components/icon/icon-linkedin';
import IconPhone from '@/components/icon/icon-phone';
import IconTwitter from '@/components/icon/icon-twitter';
import IconUser from '@/components/icon/icon-user';
import React, { useState, useEffect } from 'react';
import supabase from '@/lib/supabase';
import { Alert } from '@/components/elements/alerts/elements-alerts-default';
import ImageUpload from '@/components/image-upload/image-upload';
import ConfirmModal from '@/components/modals/confirm-modal';
import { getTranslation } from '@/i18n';

const ComponentsUsersAccountSettingsTabs = () => {
    const { t } = getTranslation();
    const [loading, setLoading] = useState(false);
    const [profileData, setProfileData] = useState({
        full_name: '',
        profession: '',
        country: '',
        address: '',
        location: '',
        phone: '',
        email: '',
        website: '',
        avatar_url: null as string | null,
        is_default_address: false,
        linkedin_username: '',
        twitter_username: '',
        facebook_username: '',
        github_username: '',
    });

    const [alertMessage, setAlertMessage] = useState<{ type: 'success' | 'danger'; message: string } | null>(null);
    const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

    // Update the component to include email from auth
    useEffect(() => {
        const fetchProfile = async () => {
            const {
                data: { user },
            } = await supabase.auth.getUser();
            if (user) {
                const { data, error } = await supabase.from('users').select('*').eq('id', user.id).single();

                if (data && !error) {
                    setProfileData({
                        ...data,
                        email: user.email || '',
                        full_name: user.user_metadata?.display_name || data.full_name || '',
                    });
                }
            } else {
                console.log('no user found');
            }
        };

        fetchProfile();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setAlertMessage(null); // Clear any existing alerts

        try {
            const {
                data: { user },
            } = await supabase.auth.getUser();
            if (!user) throw new Error('No user');

            // Validate required fields
            const requiredFields: (keyof typeof profileData)[] = ['full_name', 'email'];
            const missingFields = requiredFields.filter((field) => !profileData[field]);
            if (missingFields.length > 0) {
                throw new Error(`Please fill in all required fields: ${missingFields.join(', ')}`);
            }

            // Update both email and full name in auth if they've changed
            if (profileData.email !== user.email || user.user_metadata?.display_name !== profileData.full_name) {
                const { error: authError } = await supabase.auth.updateUser({
                    email: profileData.email,
                    data: { display_name: profileData.full_name },
                });
                if (authError) throw authError;
            }

            // Update all profile data including email and country
            const { error: profileError } = await supabase.from('users').upsert({
                id: user.id,
                ...profileData, // Include all profile data
            });

            if (profileError) throw profileError;

            // Show success message
            setAlertMessage({
                type: 'success',
                message: t('profile_updated_successfully'),
            });
        } catch (error) {
            console.error('Error updating profile:', error);
            // Show error message
            setAlertMessage({
                type: 'danger',
                message: error instanceof Error ? error.message : t('error_updating_profile'),
            });
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type, checked } = e.target;
        setProfileData((prev) => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value,
        }));
    };

    const handleAvatarUpload = async (url: string) => {
        try {
            const {
                data: { user },
            } = await supabase.auth.getUser();
            if (!user) throw new Error('No user');

            const { error } = await supabase.from('users').upsert({
                id: user.id,
                avatar_url: url,
            });

            if (error) throw error;

            setProfileData((prev) => ({
                ...prev,
                avatar_url: url,
            }));

            setAlertMessage({
                type: 'success',
                message: t('profile_image_updated_successfully'),
            });
        } catch (error) {
            console.error('Error updating avatar:', error);
            setAlertMessage({
                type: 'danger',
                message: t('error_updating_profile_image'),
            });
        }
    };

    const handlePurgeCache = async () => {
        try {
            setLoading(true);
            // Clear localStorage
            localStorage.clear();
            // Clear sessionStorage
            sessionStorage.clear();
            // Clear browser cache and hard reload
            window.location.reload();

            setAlertMessage({
                type: 'success',
                message: t('cache_cleared_successfully'),
            });
        } catch (error) {
            console.error('Error purging cache:', error);
            setAlertMessage({
                type: 'danger',
                message: t('error_clearing_cache'),
            });
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteAccount = async () => {
        // Close the confirm modal immediately so the UI updates
        setConfirmDeleteOpen(false);
        try {
            setLoading(true);
            const {
                data: { user },
            } = await supabase.auth.getUser();
            if (!user) throw new Error('No user found');

            // Delete profile first (due to foreign key constraint)
            const { error: profileError } = await supabase.from('users').delete().eq('id', user.id);

            if (profileError) throw profileError;

            // Delete the user from auth
            const { error: authError } = await supabase.auth.admin.deleteUser(user.id);

            if (authError) throw authError;

            // Sign out the user
            await supabase.auth.signOut();

            // Redirect to login page
            window.location.href = '/auth/signin';
        } catch (error) {
            console.error('Error deleting account:', error);
            setAlertMessage({
                type: 'danger',
                message: error instanceof Error ? error.message : t('error_deleting_account'),
            });
        } finally {
            setLoading(false);
        }
    };

    const [tabs, setTabs] = useState<string>('home');
    const toggleTabs = (name: string) => {
        setTabs(name);
        setAlertMessage(null);
    };

    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        const getUser = async () => {
            const {
                data: { user },
            } = await supabase.auth.getUser();
            setUser(user);
        };
        getUser();
    }, []);

    return (
        <div className="pt-5">
            <div className="mb-5 flex items-center justify-between">
                <h5 className="text-lg font-semibold dark:text-white-light">{t('settings')}</h5>
            </div>
            <div>
                <ul className="mb-5 overflow-y-auto whitespace-nowrap border-b border-[#ebedf2] font-semibold dark:border-[#191e3a] sm:flex">
                    <li className="inline-block">
                        <button
                            onClick={() => toggleTabs('home')}
                            className={`flex gap-2 border-b border-transparent p-4 hover:border-primary hover:text-primary ${tabs === 'home' ? '!border-primary text-primary' : ''}`}
                        >
                            <IconUser />
                            {t('profile')}
                        </button>
                    </li>

                    <li className="inline-block">
                        <button
                            onClick={() => toggleTabs('danger-zone')}
                            className={`flex gap-2 border-b border-transparent p-4 hover:border-primary hover:text-primary ${tabs === 'danger-zone' ? '!border-primary text-primary' : ''}`}
                        >
                            <IconInfoCircle />
                            {t('danger_zone')}
                        </button>
                    </li>
                </ul>
            </div>
            {tabs === 'home' ? (
                <div>
                    {alertMessage && (
                        <div className="mb-4">
                            <Alert type={alertMessage.type} message={alertMessage.message} onClose={() => setAlertMessage(null)} />
                        </div>
                    )}
                    <form onSubmit={handleSubmit} className="mb-5 rounded-md border border-[#ebedf2] bg-white p-4 dark:border-[#191e3a] dark:bg-black">
                        <h6 className="mb-5 text-lg font-bold">{t('general_information')}</h6>
                        <div className="flex flex-col sm:flex-row">
                            <div className="mb-5 w-full sm:w-2/12 ltr:sm:mr-4 rtl:sm:ml-4">
                                <ImageUpload
                                    bucket="avatars"
                                    userId={user?.id}
                                    url={profileData.avatar_url}
                                    placeholderImage="/assets/images/user-placeholder.webp"
                                    onUploadComplete={handleAvatarUpload}
                                    onError={(error) => {
                                        setAlertMessage({
                                            type: 'danger',
                                            message: error,
                                        });
                                    }}
                                />
                            </div>
                            <div className="grid flex-1 grid-cols-1 gap-5 sm:grid-cols-2">
                                <div>
                                    <label htmlFor="name">{t('full_name')}</label>
                                    <input id="name" name="full_name" type="text" value={profileData.full_name} onChange={handleInputChange} className="form-input" />
                                </div>
                                <div>
                                    <label htmlFor="profession">{t('profession')}</label>
                                    <input id="profession" name="profession" type="text" value={profileData.profession} onChange={handleInputChange} className="form-input" />
                                </div>
                                <div>
                                    <label htmlFor="country">{t('country')}</label>

                                    <CountrySelect
                                        id="country"
                                        className="form-select text-white-dark"
                                        name="country"
                                        defaultValue={profileData.country}
                                        onChange={(e) => {
                                            setProfileData((prev) => ({
                                                ...prev,
                                                country: e.target.value,
                                            }));
                                        }}
                                    />
                                </div>
                                <div>
                                    <label htmlFor="address">{t('address')}</label>
                                    <input id="address" name="address" type="text" value={profileData.address} onChange={handleInputChange} className="form-input" />
                                </div>
                                <div>
                                    <label htmlFor="location">{t('location')}</label>
                                    <input id="location" name="location" type="text" value={profileData.location} onChange={handleInputChange} className="form-input" />
                                </div>
                                <div>
                                    <label htmlFor="phone">{t('phone')}</label>
                                    <input id="phone" name="phone" type="text" value={profileData.phone} onChange={handleInputChange} className="form-input" />
                                </div>
                                <div>
                                    <label htmlFor="email">{t('email')}</label>
                                    <div className="relative">
                                        <input
                                            id="email"
                                            name="email"
                                            type="email"
                                            value={profileData.email}
                                            onChange={handleInputChange}
                                            className="form-input"
                                            required
                                            pattern="[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$"
                                            title="Please enter a valid email address"
                                        />
                                        {profileData.email && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">{/* You can add an icon or verification status here */}</span>}
                                    </div>
                                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{t('email_change_verification_notice')}</p>
                                </div>
                                <div>
                                    <label htmlFor="web">{t('website')}</label>
                                    <input id="web" name="website" type="text" value={profileData.website} onChange={handleInputChange} className="form-input" />
                                </div>
                                <div>
                                    <label className="inline-flex cursor-pointer">
                                        <input type="checkbox" name="is_default_address" checked={profileData.is_default_address} onChange={handleInputChange} className="form-checkbox" />
                                        <span className="relative text-white-dark checked:bg-none">{t('make_default_address')}</span>
                                    </label>
                                </div>
                                <div className="mt-3 sm:col-span-2">
                                    <button type="submit" className="btn btn-primary" disabled={loading}>
                                        {loading ? t('saving') : t('save')}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </form>
                    <form className="rounded-md border border-[#ebedf2] bg-white p-4 dark:border-[#191e3a] dark:bg-black">
                        <h6 className="mb-5 text-lg font-bold">{t('social')}</h6>
                        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                            <div className="flex">
                                <div className="flex items-center justify-center rounded bg-[#eee] px-3 font-semibold ltr:mr-2 rtl:ml-2 dark:bg-[#1b2e4b]">
                                    <IconLinkedin className="h-5 w-5" />
                                </div>
                                <input type="text" name="linkedin_username" value={profileData.linkedin_username} onChange={handleInputChange} className="form-input" />
                            </div>
                            <div className="flex">
                                <div className="flex items-center justify-center rounded bg-[#eee] px-3 font-semibold ltr:mr-2 rtl:ml-2 dark:bg-[#1b2e4b]">
                                    <IconTwitter className="h-5 w-5" />
                                </div>
                                <input type="text" name="twitter_username" value={profileData.twitter_username} onChange={handleInputChange} className="form-input" />
                            </div>
                            <div className="flex">
                                <div className="flex items-center justify-center rounded bg-[#eee] px-3 font-semibold ltr:mr-2 rtl:ml-2 dark:bg-[#1b2e4b]">
                                    <IconFacebook className="h-5 w-5" />
                                </div>
                                <input type="text" name="facebook_username" value={profileData.facebook_username} onChange={handleInputChange} className="form-input" />
                            </div>
                            <div className="flex">
                                <div className="flex items-center justify-center rounded bg-[#eee] px-3 font-semibold ltr:mr-2 rtl:ml-2 dark:bg-[#1b2e4b]">
                                    <IconGithub />
                                </div>
                                <input type="text" name="github_username" value={profileData.github_username} onChange={handleInputChange} className="form-input" />
                            </div>
                        </div>
                    </form>
                </div>
            ) : (
                ''
            )}

            {tabs === 'danger-zone' ? (
                <div className="switch">
                    <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                        <div className="panel space-y-5">
                            <h5 className="mb-4 text-lg font-semibold">{t('purge_cache')}</h5>
                            <p>{t('purge_cache_description')}</p>
                            <p>{t('purge_cache_warning')}</p>
                            <button className="btn btn-secondary" onClick={handlePurgeCache} disabled={loading}>
                                {loading ? t('clearing') : t('clear')}
                            </button>
                        </div>

                        <div className="panel space-y-5">
                            <h5 className="mb-4 text-lg font-semibold">{t('delete_account')}</h5>
                            <p>{t('delete_account_warning')}</p>
                            <button className="btn btn-danger btn-delete-account" onClick={() => setConfirmDeleteOpen(true)} disabled={loading}>
                                {loading ? t('deleting') : t('delete_my_account')}
                            </button>
                        </div>
                    </div>

                    {alertMessage && (
                        <div className="mt-4">
                            <Alert type={alertMessage.type} message={alertMessage.message} onClose={() => setAlertMessage(null)} />
                        </div>
                    )}
                </div>
            ) : null}

            {/* Confirm deletion modal */}
            <ConfirmModal
                isOpen={confirmDeleteOpen}
                title={t('delete_account')}
                message={t('delete_account_confirmation')}
                onCancel={() => setConfirmDeleteOpen(false)}
                onConfirm={handleDeleteAccount}
                size="sm"
                confirmLabel={t('delete')}
                cancelLabel={t('cancel')}
            />
        </div>
    );
};

export default ComponentsUsersAccountSettingsTabs;
