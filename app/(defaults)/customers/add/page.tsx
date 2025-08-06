'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import supabase from '@/lib/supabase';
import { Alert } from '@/components/elements/alerts/elements-alerts-default';
import { getTranslation } from '@/i18n';
import CustomerTypeSelect from '@/components/customer-type-select/customer-type-select';

const AddCustomer = () => {
    const { t } = getTranslation();
    const router = useRouter();
    const [saving, setSaving] = useState(false);

    const [form, setForm] = useState({
        name: '',
        phone: '',
        car_number: '',
        age: '',
        id_number: '',
        customer_type: '',
        balance: '0',
    });

    const [alert, setAlert] = useState<{ visible: boolean; message: string; type: 'success' | 'danger' }>({
        visible: false,
        message: '',
        type: 'success',
    });
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    const validateForm = () => {
        if (!form.name.trim()) {
            setAlert({ visible: true, message: t('customer_name_required'), type: 'danger' });
            return false;
        }
        if (!form.phone.trim()) {
            setAlert({ visible: true, message: t('phone_required'), type: 'danger' });
            return false;
        }
        if (!form.customer_type.trim()) {
            setAlert({ visible: true, message: t('customer_type_required'), type: 'danger' });
            return false;
        }
        if (form.age && (parseInt(form.age) < 0 || parseInt(form.age) > 120)) {
            setAlert({ visible: true, message: t('age_must_be_valid'), type: 'danger' });
            return false;
        }
        if (form.balance && parseFloat(form.balance) < 0) {
            setAlert({ visible: true, message: t('balance_cannot_be_negative'), type: 'danger' });
            return false;
        }
        return true;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) return;

        setSaving(true);
        try {
            const customerData = {
                name: form.name.trim(),
                phone: form.phone.trim(),
                car_number: form.car_number.trim() || null,
                age: form.age ? parseInt(form.age) : null,
                id_number: form.id_number.trim() || null,
                customer_type: form.customer_type,
                balance: form.balance ? parseFloat(form.balance) : 0,
            };

            const { error } = await supabase.from('customers').insert([customerData]);

            if (error) throw error;

            setAlert({ visible: true, message: t('customer_added_successfully'), type: 'success' });

            // Redirect to customers list after a short delay
            setTimeout(() => {
                router.push('/customers');
            }, 1000);
        } catch (error) {
            console.error(error);
            setAlert({
                visible: true,
                message: error instanceof Error ? error.message : t('error_adding_customer'),
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
                        <Link href="/customers" className="text-primary hover:underline">
                            {t('customers')}
                        </Link>
                    </li>
                    <li className="before:content-['/'] ltr:before:mr-2 rtl:before:ml-2">
                        <span>{t('add_new_customer')}</span>
                    </li>
                </ul>
            </div>

            <div className="mb-6">
                <h1 className="text-2xl font-bold">{t('add_new_customer')}</h1>
                <p className="text-gray-500">{t('create_customer_description')}</p>
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
                    <h5 className="text-lg font-semibold dark:text-white-light">{t('customer_information')}</h5>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {/* Customer Name */}
                        <div>
                            <label htmlFor="name" className="block text-sm font-bold text-gray-700 dark:text-white mb-2">
                                {t('customer_name')} <span className="text-red-500">*</span>
                            </label>
                            <input type="text" id="name" name="name" value={form.name} onChange={handleInputChange} className="form-input" placeholder={t('enter_customer_name')} required />
                        </div>
                        {/* Phone */}
                        <div>
                            <label htmlFor="phone" className="block text-sm font-bold text-gray-700 dark:text-white mb-2">
                                {t('phone')} <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="tel"
                                id="phone"
                                name="phone"
                                value={form.phone}
                                onChange={handleInputChange}
                                className="form-input text-right"
                                placeholder={t('enter_phone_number')}
                                required
                            />
                        </div>
                        {/* Car Number */}
                        <div>
                            <label htmlFor="car_number" className="block text-sm font-bold text-gray-700 dark:text-white mb-2">
                                {t('car_number')}
                            </label>
                            <input type="text" id="car_number" name="car_number" value={form.car_number} onChange={handleInputChange} className="form-input" placeholder={t('enter_car_number')} />
                        </div>
                        {/* Age */}
                        <div>
                            <label htmlFor="age" className="block text-sm font-bold text-gray-700 dark:text-white mb-2">
                                {t('age')}
                            </label>
                            <input type="number" id="age" name="age" min="1" max="120" value={form.age} onChange={handleInputChange} className="form-input" placeholder={t('enter_age')} />
                        </div>
                        {/* Customer Type */}
                        <div>
                            <label htmlFor="customer_type" className="block text-sm font-bold text-gray-700 dark:text-white mb-2">
                                {t('customer_type')} <span className="text-red-500">*</span>
                            </label>
                            <CustomerTypeSelect defaultValue={form.customer_type} className="form-input" name="customer_type" onChange={handleInputChange} />
                        </div>
                        {/* ID Number */}
                        <div>
                            <label htmlFor="id_number" className="block text-sm font-bold text-gray-700 dark:text-white mb-2">
                                {t('id_number')}
                            </label>
                            <input type="text" id="id_number" name="id_number" value={form.id_number} onChange={handleInputChange} className="form-input" placeholder={t('enter_id_number')} />
                        </div>
                        {/* Initial Balance */}
                        <div>
                            <label htmlFor="balance" className="block text-sm font-bold text-gray-700 dark:text-white mb-2">
                                {t('initial_balance')}
                            </label>
                            <div className="flex">
                                <span className="inline-flex items-center px-3 bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 border ltr:border-r-0 rtl:border-l-0 border-gray-300 dark:border-gray-600 ltr:rounded-l-md rtl:rounded-r-md">
                                    $
                                </span>
                                <input
                                    type="number"
                                    id="balance"
                                    name="balance"
                                    step="0.01"
                                    value={form.balance}
                                    onChange={handleInputChange}
                                    className="form-input ltr:rounded-l-none rtl:rounded-r-none"
                                    placeholder="0.00"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Submit Button */}
                    <div className="flex justify-end gap-4 mt-8">
                        <button type="button" onClick={() => router.back()} className="btn btn-outline-danger">
                            {t('cancel')}
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={saving}>
                            {saving ? t('creating') : t('create_customer')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddCustomer;
