'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import IconArrowLeft from '@/components/icon/icon-arrow-left';
import IconEdit from '@/components/icon/icon-edit';
import IconUser from '@/components/icon/icon-user';
import IconMapPin from '@/components/icon/icon-map-pin';
import IconPhone from '@/components/icon/icon-phone';
import IconCalendar from '@/components/icon/icon-calendar';
import supabase from '@/lib/supabase';
import { getTranslation } from '@/i18n';
import Link from 'next/link';

interface Provider {
    id: string;
    created_at: string;
    name: string;
    address: string;
    phone: string;
}

const ProviderPreview = () => {
    const { t } = getTranslation();
    const params = useParams();
    const router = useRouter();
    const [provider, setProvider] = useState<Provider | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchProvider = async () => {
            try {
                const { data, error } = await supabase.from('providers').select('*').eq('id', params?.id).single();

                if (error) throw error;

                setProvider(data);
            } catch (error) {
                console.error('Error fetching provider:', error);
            } finally {
                setLoading(false);
            }
        };

        if (params?.id) {
            fetchProvider();
        }
    }, [params?.id]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen gap-4">
                <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
                <p className="text-lg font-semibold text-gray-700 dark:text-gray-300">{t('loading')}</p>
            </div>
        );
    }

    if (!provider) {
        return (
            <div className="panel">
                <div className="text-center py-10">
                    <h3 className="text-lg font-semibold text-danger">{t('provider_not_found')}</h3>
                    <Link href="/providers" className="btn btn-primary mt-4">
                        <IconArrowLeft className="ltr:mr-2 rtl:ml-2" />
                        {t('back_to_providers')}
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div>
            {/* Header */}
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
                            <span>{t('provider_details')}</span>
                        </li>
                    </ul>
                </div>

                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">{t('provider_details')}</h1>
                        <p className="text-gray-500">{provider ? provider.name : t('loading')}</p>
                    </div>
                    {provider && (
                        <Link href={`/providers/edit/${provider.id}`} className="btn btn-primary">
                            <IconEdit className="ltr:mr-2 rtl:ml-2" />
                            {t('edit_provider')}
                        </Link>
                    )}
                </div>
            </div>

            <div className="container mx-auto p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Provider Information */}
                    <div className="space-y-6">
                        {/* Basic Info */}
                        <div className="panel">
                            <div className="mb-5">
                                <h3 className="text-lg font-semibold">{t('basic_information')}</h3>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <h2 className="text-2xl font-bold text-primary mb-2">{provider.name}</h2>
                                </div>
                                <div className="space-y-3">
                                    <div className="flex items-center">
                                        <IconUser className="w-5 h-5 text-gray-400 ltr:mr-3 rtl:ml-3" />
                                        <span className="text-sm text-gray-600 ltr:mr-2 rtl:ml-2">{t('provider_name')}:</span>
                                        <span className="font-medium">{provider.name}</span>
                                    </div>

                                    <div className="flex items-center">
                                        <IconMapPin className="w-5 h-5 text-gray-400 ltr:mr-3 rtl:ml-3" />
                                        <span className="text-sm text-gray-600 ltr:mr-2 rtl:ml-2">{t('provider_address')}:</span>
                                        <span className="font-medium">{provider.address}</span>
                                    </div>

                                    <div className="flex items-center">
                                        <IconPhone className="w-5 h-5 text-gray-400 ltr:mr-3 rtl:ml-3" />
                                        <span className="text-sm text-gray-600 ltr:mr-2 rtl:ml-2">{t('provider_phone')}:</span>
                                        <span className="font-medium">
                                            <a href={`tel:${provider.phone}`} className="text-primary hover:underline">
                                                {provider.phone}
                                            </a>
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Contact Information */}
                        <div className="panel">
                            <div className="mb-5">
                                <h3 className="text-lg font-semibold">{t('contact_information')}</h3>
                            </div>

                            <div className="space-y-4">
                                <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                    <div className="flex items-center">
                                        <IconPhone className="w-5 h-5 text-gray-400 ltr:mr-2 rtl:ml-2" />
                                        <span className="text-sm text-gray-600">{t('provider_phone')}:</span>
                                    </div>
                                    <a href={`tel:${provider.phone}`} className="font-semibold text-primary hover:underline">
                                        {provider.phone}
                                    </a>
                                </div>

                                <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                    <div className="flex items-center">
                                        <IconMapPin className="w-5 h-5 text-gray-400 ltr:mr-2 rtl:ml-2" />
                                        <span className="text-sm text-gray-600">{t('provider_address')}:</span>
                                    </div>
                                    <span className="font-semibold text-gray-700 dark:text-gray-300">{provider.address}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Additional Information */}
                    <div className="space-y-6">
                        <div className="panel">
                            <div className="mb-5">
                                <h3 className="text-lg font-semibold">{t('additional_information')}</h3>
                            </div>

                            <div className="space-y-3 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-600">{t('provider_id')}:</span>
                                    <span className="font-medium font-mono">{provider.id}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">{t('created_at')}:</span>
                                    <span className="font-medium">
                                        {new Date(provider.created_at).toLocaleDateString('en-GB', {
                                            year: 'numeric',
                                            month: '2-digit',
                                            day: '2-digit',
                                        })}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Provider Summary */}
                        <div className="panel">
                            <div className="mb-5">
                                <h3 className="text-lg font-semibold">{t('provider_summary')}</h3>
                            </div>

                            <div className="space-y-3 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-600">{t('provider_name')}:</span>
                                    <span className="font-medium">{provider.name}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">{t('contact')}:</span>
                                    <span className="font-medium">{provider.phone}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">{t('location')}:</span>
                                    <span className="font-medium">{provider.address}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProviderPreview;
