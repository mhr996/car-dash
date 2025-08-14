'use client';
import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import supabase from '@/lib/supabase';
import { Alert } from '@/components/elements/alerts/elements-alerts-default';
import IconLinkedin from '@/components/icon/icon-linkedin';
import IconTwitter from '@/components/icon/icon-twitter';
import IconFacebook from '@/components/icon/icon-facebook';
import IconGithub from '@/components/icon/icon-github';
import { getTranslation } from '@/i18n';

interface User {
    id: number;
    full_name: string;
    email: string;
    avatar_url: string | null;
    registration_date?: string;
    status?: string;
    uid?: string;
    profession?: string;
    country?: string;
    address?: string;
    location?: string;
    phone?: string;
    website?: string;
    is_default_address?: boolean;
    linkedin_username?: string;
    twitter_username?: string;
    facebook_username?: string;
    github_username?: string;
}

const UserPreview = () => {
    // Fix: Type assertion to access id from params
    const params = useParams();
    const id = params?.id as string;

    const router = useRouter();
    const { t } = getTranslation();
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [alert, setAlert] = useState<{ visible: boolean; message: string; type: 'success' | 'danger' }>({
        visible: false,
        message: '',
        type: 'danger',
    });

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const { data, error } = await supabase.from('users').select('*').eq('id', id).single();
                if (error) throw error;
                setUser(data);
            } catch (error) {
                console.error(error);
                setAlert({ visible: true, message: 'Error fetching user details', type: 'danger' });
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            fetchUser();
        }
    }, [id]);
    if (loading) {
        return <div className="flex items-center justify-center h-screen">{t('loading')}</div>;
    }

    if (!user) {
        return <div className="text-center p-6">{t('user_not_found')}</div>;
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
                        <span>{t('preview')}</span>
                    </li>
                </ul>
            </div>
            {alert.visible && (
                <div className="mb-4">
                    <Alert type={alert.type} title={alert.type === 'success' ? t('success') : t('error')} message={alert.message} onClose={() => setAlert({ ...alert, visible: false })} />
                </div>
            )}
            {/* General Information */}
            <div className="mb-6 rounded-md border border-[#ebedf2] bg-white p-4 dark:border-[#191e3a] dark:bg-black">
                <h6 className="mb-5 text-lg font-bold">{t('general_information')}</h6>
                <div className="flex flex-col sm:flex-row">
                    <div className="mb-5 w-full  sm:w-2/12 ltr:sm:mr-4 rtl:sm:ml-4">
                        <img src={user.avatar_url || '/assets/images/user-placeholder.webp'} alt={user.full_name} className="rounded-full object-cover w-full aspect-square" />
                    </div>
                    <div className="grid flex-1 grid-cols-1 gap-5 sm:grid-cols-2">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 dark:text-white">{t('full_name')}</label>
                            <p className="mt-1 text-base text-gray-800 dark:text-gray-400">{user.full_name || t('not_available')}</p>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 dark:text-white">{t('profession')}</label>
                            <p className="mt-1 text-base text-gray-800 dark:text-gray-400">{user.profession || t('not_available')}</p>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 dark:text-white">{t('country')}</label>
                            <p className="mt-1 text-base text-gray-800 dark:text-gray-400">{user.country || t('not_available')}</p>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 dark:text-white">{t('address')}</label>
                            <p className="mt-1 text-base text-gray-800 dark:text-gray-400">{user.address || t('not_available')}</p>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 dark:text-white">{t('location')}</label>
                            <p className="mt-1 text-base text-gray-800 dark:text-gray-400">{user.location || t('not_available')}</p>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 dark:text-white">{t('phone')}</label>
                            <p className="mt-1 text-base text-gray-800 dark:text-gray-400">{user.phone || t('not_available')}</p>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 dark:text-white">{t('email')}</label>
                            <p className="mt-1 text-base text-gray-800 dark:text-gray-400">{user.email || t('not_available')}</p>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 dark:text-white">{t('website')}</label>
                            <p className="mt-1 text-base text-gray-800 dark:text-gray-400">{user.website || t('not_available')}</p>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 dark:text-white">{t('registration_date')}</label>
                            <p className="mt-1 text-base text-gray-800 dark:text-gray-400">{user.registration_date || t('not_available')}</p>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 dark:text-white">{t('status')}</label>
                            <p className="mt-1 text-base text-gray-800 dark:text-gray-400">{user.status || t('not_available')}</p>
                        </div>
                    </div>
                </div>
            </div>
            {/* Social Information */}
            <div className="rounded-md border border-[#ebedf2] bg-white p-4 dark:border-[#191e3a] dark:bg-black">
                <h6 className="mb-5 text-lg font-bold">{t('social')}</h6>
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <div className="flex items-center">
                        <div className="flex items-center justify-center rounded bg-[#eee] px-4 py-3 mr-3 dark:bg-[#1b2e4b]">
                            <IconLinkedin className="h-5 w-5" />
                        </div>
                        <p className="text-base text-gray-800 dark:text-gray-200">{user.linkedin_username || 'N/A'}</p>
                    </div>
                    <div className="flex items-center">
                        <div className="flex items-center justify-center rounded bg-[#eee] px-4 py-3 mr-3 dark:bg-[#1b2e4b]">
                            <IconTwitter className="h-5 w-5" />
                        </div>
                        <p className="text-base text-gray-800 dark:text-gray-200">{user.twitter_username || 'N/A'}</p>
                    </div>
                    <div className="flex items-center">
                        <div className="flex items-center justify-center rounded bg-[#eee] px-4 py-3 mr-3 dark:bg-[#1b2e4b]">
                            <IconFacebook className="h-5 w-5" />
                        </div>
                        <p className="text-base text-gray-800 dark:text-gray-200">{user.facebook_username || 'N/A'}</p>
                    </div>
                    <div className="flex items-center">
                        <div className="flex items-center justify-center rounded bg-[#eee] px-4 py-3 mr-3 dark:bg-[#1b2e4b]">
                            <IconGithub className="h-5 w-5" />
                        </div>
                        <p className="text-base text-gray-800 dark:text-gray-200">{user.github_username || 'N/A'}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UserPreview;
