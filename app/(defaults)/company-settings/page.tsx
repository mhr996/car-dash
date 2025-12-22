'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import IconBuilding from '@/components/icon/icon-building';
import IconEdit from '@/components/icon/icon-edit';
import IconSave from '@/components/icon/icon-save';
import IconPhone from '@/components/icon/icon-phone';
import IconMapPin from '@/components/icon/icon-map-pin';
import IconUser from '@/components/icon/icon-user';
import IconCreditCard from '@/components/icon/icon-credit-card';
import IconCamera from '@/components/icon/icon-camera';
import supabase from '@/lib/supabase';
import { getTranslation } from '@/i18n';
import Link from 'next/link';
import { Alert } from '@/components/elements/alerts/elements-alerts-default';
import SingleFileUpload from '@/components/file-upload/single-file-upload';
import { uploadFile, getPublicUrlFromPath } from '@/utils/file-upload';
import { FileItem } from '@/types';

interface CompanyInfo {
    id?: string;
    name: string;
    logo_url?: string;
    signature_url?: string;
    address?: string;
    phone?: string;
    tax_number?: string;
    created_at?: string;
    updated_at?: string;
}

const CompanySettings = () => {
    const { t } = getTranslation();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [companyInfo, setCompanyInfo] = useState<CompanyInfo>({
        name: '',
        logo_url: '',
        signature_url: '',
        address: '',
        phone: '',
        tax_number: '',
    });
    const [logoFile, setLogoFile] = useState<FileItem | null>(null);
    const [signatureFile, setSignatureFile] = useState<FileItem | null>(null);
    const [alert, setAlert] = useState<{ message: string; type: 'success' | 'danger' } | null>(null);

    useEffect(() => {
        fetchCompanyInfo();
    }, []);

    const fetchCompanyInfo = async () => {
        try {
            const { data, error } = await supabase.from('company_settings').select('*').limit(1).single();

            if (error && error.code !== 'PGRST116') {
                // PGRST116 is "no rows returned", which is fine for first time setup
                console.error('Error fetching company info:', error);
                return;
            }

            if (data) {
                setCompanyInfo(data);
            }
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setCompanyInfo((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleLogoChange = (file: FileItem | null) => {
        setLogoFile(file);
    };

    const handleSignatureChange = (file: FileItem | null) => {
        setSignatureFile(file);
    };

    const validateForm = () => {
        if (!companyInfo.name.trim()) {
            setAlert({ message: t('company_name_required'), type: 'danger' });
            return false;
        }
        return true;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) return;

        setSaving(true);
        try {
            let logoUrl = companyInfo.logo_url;
            let signatureUrl = companyInfo.signature_url;

            // Upload new logo if provided
            if (logoFile) {
                const uploadResult = await uploadFile(logoFile.file, 'company', 'logo', `logo.${logoFile.file.name.split('.').pop()}`);

                if (uploadResult.success && uploadResult.url) {
                    // Convert relative path to full Supabase public URL
                    logoUrl = getPublicUrlFromPath(uploadResult.url);
                } else {
                    throw new Error('Failed to upload logo');
                }
            }

            // Upload new signature if provided
            if (signatureFile) {
                const uploadResult = await uploadFile(signatureFile.file, 'company', 'signature', `signature.${signatureFile.file.name.split('.').pop()}`);

                if (uploadResult.success && uploadResult.url) {
                    // Convert relative path to full Supabase public URL
                    signatureUrl = getPublicUrlFromPath(uploadResult.url);
                } else {
                    throw new Error('Failed to upload signature');
                }
            }

            const companyData = {
                ...companyInfo,
                logo_url: logoUrl,
                signature_url: signatureUrl,
                updated_at: new Date().toISOString(),
            };

            // Check if company info exists
            const { data: existing } = await supabase.from('company_settings').select('id').limit(1).single();

            let result;
            if (existing) {
                // Update existing
                result = await supabase.from('company_settings').update(companyData).eq('id', existing.id).select().single();
            } else {
                // Insert new
                result = await supabase
                    .from('company_settings')
                    .insert([{ ...companyData, created_at: new Date().toISOString() }])
                    .select()
                    .single();
            }

            if (result.error) throw result.error;

            setCompanyInfo(result.data);
            setLogoFile(null);
            setSignatureFile(null);
            setAlert({ message: t('company_info_updated_successfully'), type: 'success' });

            // Trigger a page reload to update the dashboard with new company info
            setTimeout(() => {
                window.location.reload();
            }, 1500);
        } catch (error) {
            console.error('Error saving company info:', error);
            setAlert({
                message: error instanceof Error ? error.message : t('error_saving_company_info'),
                type: 'danger',
            });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-6">
            {/* Header */}
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
                        <span>{t('company_settings')}</span>
                    </li>
                </ul>
            </div>

            <div className="mb-6">
                <h1 className="text-3xl font-bold flex items-center gap-3">
                    <IconBuilding className="w-8 h-8 text-primary" />
                    {t('company_settings')}
                </h1>
                <p className="text-gray-500 mt-2">{t('company_settings_description')}</p>
            </div>

            {alert && (
                <div className="fixed top-4 right-4 z-50 min-w-80 max-w-md">
                    <Alert type={alert.type} title={alert.type === 'success' ? t('success') : t('error')} message={alert.message} onClose={() => setAlert(null)} />
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Company Logo Section */}
                <div className="lg:col-span-1">
                    <div className="panel h-fit">
                        <div className="mb-5">
                            <h3 className="text-lg font-semibold flex items-center gap-2">
                                <IconCamera className="w-5 h-5 text-primary" />
                                {t('company_logo')}
                            </h3>
                            <p className="text-gray-500 text-sm mt-2">{t('company_logo_description')}</p>
                        </div>

                        <div className="text-center">
                            {/* Current Logo Display */}
                            {companyInfo.logo_url && (
                                <div className="mb-6">
                                    <div className="w-32 h-32 mx-auto rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700">
                                        <img src={companyInfo.logo_url} alt="Company Logo" className="w-full h-full object-contain" />
                                    </div>
                                    <p className="text-sm text-gray-500 mt-2">{t('current_logo')}</p>
                                </div>
                            )}

                            {/* Logo Upload */}
                            <SingleFileUpload
                                file={logoFile}
                                onFileChange={handleLogoChange}
                                title={t('upload_new_logo')}
                                description={t('logo_upload_description')}
                                accept="image/*"
                                className="border-2 border-dashed border-primary/30 rounded-lg p-6 hover:border-primary/50 transition-colors"
                            />
                        </div>
                    </div>

                    {/* Company Signature Section */}
                    <div className="panel mt-6">
                        <div className="mb-5">
                            <h3 className="text-lg font-semibold flex items-center gap-2">
                                <IconEdit className="w-5 h-5 text-primary" />
                                {t('company_signature')}
                            </h3>
                            <p className="text-gray-500 text-sm mt-2">{t('company_signature_description')}</p>
                        </div>

                        <div className="text-center">
                            {/* Current Signature Display */}
                            {companyInfo.signature_url && (
                                <div className="mb-6">
                                    <div className="w-full max-w-xs mx-auto rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 p-4">
                                        <img src={companyInfo.signature_url} alt="Company Signature" className="w-full h-auto object-contain" />
                                    </div>
                                    <p className="text-sm text-gray-500 mt-2">{t('current_signature')}</p>
                                </div>
                            )}

                            {/* Signature Upload */}
                            <SingleFileUpload
                                file={signatureFile}
                                onFileChange={handleSignatureChange}
                                title={t('upload_new_signature')}
                                description={t('signature_upload_description')}
                                accept="image/*"
                                className="border-2 border-dashed border-primary/30 rounded-lg p-6 hover:border-primary/50 transition-colors"
                            />
                        </div>
                    </div>

                    {/* Quick Stats */}
                    <div className="panel mt-6">
                        <div className="mb-5">
                            <h3 className="text-lg font-semibold">{t('company_overview')}</h3>
                        </div>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                <span className="text-gray-600 dark:text-gray-400">{t('established')}</span>
                                <span className="font-medium">{companyInfo.created_at ? new Date(companyInfo.created_at).getFullYear() : new Date().getFullYear()}</span>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                <span className="text-gray-600 dark:text-gray-400">{t('last_updated')}</span>
                                <span className="font-medium">
                                    {companyInfo.updated_at
                                        ? new Date(companyInfo.updated_at).toLocaleDateString('en-GB', {
                                              year: 'numeric',
                                              month: '2-digit',
                                              day: '2-digit',
                                          })
                                        : t('never')}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Company Information Form */}
                <div className="lg:col-span-2">
                    <div className="panel">
                        <div className="mb-5">
                            <h3 className="text-lg font-semibold flex items-center gap-2">
                                <IconEdit className="w-5 h-5 text-primary" />
                                {t('company_information')}
                            </h3>
                            <p className="text-gray-500 text-sm mt-2">{t('company_information_description')}</p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Company Name */}
                            <div className="space-y-2">
                                <label htmlFor="name" className="block text-sm font-bold text-gray-700 dark:text-white flex items-center gap-2">
                                    <IconUser className="w-4 h-4 text-primary" />
                                    {t('company_name')} <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    id="name"
                                    name="name"
                                    value={companyInfo.name}
                                    onChange={handleInputChange}
                                    className="form-input bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-600 rounded-lg px-4 py-3 text-lg focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200"
                                    placeholder={t('enter_company_name')}
                                    required
                                />
                                <p className="text-xs text-gray-500">{t('company_name_affects_dashboard')}</p>
                            </div>

                            {/* Address */}
                            <div className="space-y-2">
                                <label htmlFor="address" className="block text-sm font-bold text-gray-700 dark:text-white flex items-center gap-2">
                                    <IconMapPin className="w-4 h-4 text-primary" />
                                    {t('company_address')}
                                </label>
                                <textarea
                                    id="address"
                                    name="address"
                                    value={companyInfo.address || ''}
                                    onChange={handleInputChange}
                                    className="form-textarea bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-600 rounded-lg px-4 py-3 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 min-h-[100px]"
                                    placeholder={t('enter_company_address')}
                                />
                            </div>

                            {/* Phone Number */}
                            <div className="space-y-2">
                                <label htmlFor="phone" className="block text-sm font-bold text-gray-700 dark:text-white flex items-center gap-2">
                                    <IconPhone className="w-4 h-4 text-primary" />
                                    {t('phone_number')}
                                </label>
                                <input
                                    type="tel"
                                    id="phone"
                                    name="phone"
                                    value={companyInfo.phone || ''}
                                    onChange={handleInputChange}
                                    className="form-input bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-600 rounded-lg px-4 py-3 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200"
                                    placeholder={t('enter_phone_number')}
                                />
                            </div>

                            {/* Tax Number */}
                            <div className="space-y-2">
                                <label htmlFor="tax_number" className="block text-sm font-bold text-gray-700 dark:text-white flex items-center gap-2">
                                    <IconCreditCard className="w-4 h-4 text-primary" />
                                    {t('tax_number')}
                                </label>
                                <input
                                    type="text"
                                    id="tax_number"
                                    name="tax_number"
                                    value={companyInfo.tax_number || ''}
                                    onChange={handleInputChange}
                                    className="form-input bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-600 rounded-lg px-4 py-3 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200"
                                    placeholder={t('enter_tax_number')}
                                />
                            </div>

                            {/* Save Button */}
                            <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="btn btn-primary btn-lg flex items-center gap-2 px-8 py-3 text-lg font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-200"
                                >
                                    {saving ? (
                                        <>
                                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                            {t('saving')}...
                                        </>
                                    ) : (
                                        <>
                                            <IconSave className="w-5 h-5" />
                                            {t('save_company_info')}
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CompanySettings;
