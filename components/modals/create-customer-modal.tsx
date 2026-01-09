import React, { useState } from 'react';
import IconX from '@/components/icon/icon-x';
import IconUser from '@/components/icon/icon-user';
import { getTranslation } from '@/i18n';
import CustomerTypeSelect from '@/components/customer-type-select/customer-type-select';
import supabase from '@/lib/supabase';

interface Customer {
    id: string;
    name: string;
    phone: string;
    age: number;
    customer_type: string;
    id_number?: string;
    birth_date?: string;
}

interface CreateCustomerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCustomerCreated: (customer: Customer) => void;
}

const CreateCustomerModal = ({ isOpen, onClose, onCustomerCreated }: CreateCustomerModalProps) => {
    const { t } = getTranslation();
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({
        name: '',
        phone: '',
        id_number: '',
        birth_date: '',
        customer_type: '',
        address: '',
    });

    const [errors, setErrors] = useState<Record<string, string>>({});

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));

        // Clear error when user starts typing
        if (errors[name]) {
            setErrors((prev) => ({ ...prev, [name]: '' }));
        }
    };

    const handleCustomerTypeChange = (type: string) => {
        setForm((prev) => ({ ...prev, customer_type: type }));
        if (errors.customer_type) {
            setErrors((prev) => ({ ...prev, customer_type: '' }));
        }
    };

    const calculateAge = (birthDate: string) => {
        if (!birthDate) return 0;
        const today = new Date();
        const birth = new Date(birthDate);
        let age = today.getFullYear() - birth.getFullYear();
        const monthDiff = today.getMonth() - birth.getMonth();

        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
            age--;
        }

        return age;
    };

    const validateForm = () => {
        const newErrors: Record<string, string> = {};

        if (!form.name.trim()) {
            newErrors.name = t('customer_name_required');
        }

        if (!form.phone.trim()) {
            newErrors.phone = t('phone_required');
        }

        if (!form.customer_type) {
            newErrors.customer_type = t('customer_type_required');
        }

        if (form.birth_date) {
            const age = calculateAge(form.birth_date);
            if (age < 0 || age > 120) {
                newErrors.birth_date = t('invalid_birth_date');
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) return;

        setSaving(true);
        try {
            const age = form.birth_date ? calculateAge(form.birth_date) : null;

            const customerData = {
                name: form.name.trim(),
                phone: form.phone.trim(),
                id_number: form.id_number.trim() || null,
                birth_date: form.birth_date || null,
                age: age,
                customer_type: form.customer_type,
                address: form.address.trim() || null,
            };

            const { data, error } = await supabase.from('customers').insert([customerData]).select().single();

            if (error) throw error;

            onCustomerCreated(data);
            handleClose();
        } catch (error) {
            console.error('Error creating customer:', error);
            setErrors({ submit: t('error_creating_customer') });
        } finally {
            setSaving(false);
        }
    };

    const handleClose = () => {
        setForm({
            name: '',
            phone: '',
            id_number: '',
            birth_date: '',
            customer_type: '',
            address: '',
        });
        setErrors({});
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
            <div className="bg-white dark:bg-black rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                        <IconUser className="w-6 h-6 text-primary" />
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">{t('create_new_customer')}</h3>
                    </div>
                    <button onClick={handleClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
                        <IconX className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {errors.submit && (
                        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                            <p className="text-red-600 dark:text-red-400 text-sm">{errors.submit}</p>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Customer Name */}
                        <div className="md:col-span-2">
                            <label htmlFor="name" className="block text-sm font-bold text-gray-700 dark:text-white mb-2">
                                {t('customer_name')} <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                id="name"
                                name="name"
                                value={form.name}
                                onChange={handleInputChange}
                                className={`form-input ${errors.name ? 'border-red-500' : ''}`}
                                placeholder={t('enter_customer_name')}
                            />
                            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
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
                                className={`form-input ${errors.phone ? 'border-red-500' : ''}`}
                                placeholder={t('enter_phone_number')}
                            />
                            {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
                        </div>

                        {/* Identity Number */}
                        <div>
                            <label htmlFor="id_number" className="block text-sm font-bold text-gray-700 dark:text-white mb-2">
                                {t('id_number')}
                            </label>
                            <input type="text" id="id_number" name="id_number" value={form.id_number} onChange={handleInputChange} className="form-input" placeholder={t('enter_id_number')} />
                        </div>

                        {/* Birth Date */}
                        <div>
                            <label htmlFor="birth_date" className="block text-sm font-bold text-gray-700 dark:text-white mb-2">
                                {t('birth_date')}
                            </label>
                            <input
                                type="date"
                                id="birth_date"
                                name="birth_date"
                                value={form.birth_date}
                                onChange={handleInputChange}
                                className={`form-input ${errors.birth_date ? 'border-red-500' : ''}`}
                            />
                            {errors.birth_date && <p className="text-red-500 text-xs mt-1">{errors.birth_date}</p>}
                        </div>
                        {/*Address */}
                        <div className="md:col-span-2">
                            <label htmlFor="address" className="block text-sm font-bold text-gray-700 dark:text-white mb-2">
                                {t('address')}
                            </label>
                            <input type="text" id="address" name="address" value={form.address} onChange={handleInputChange} className="form-input" placeholder={t('enter_address')} />
                        </div>

                        {/* 
                        {/* Customer Type */}
                        <div>
                            <label className="block text-sm font-bold text-gray-700 dark:text-white mb-2">
                                {t('customer_type')} <span className="text-red-500">*</span>
                            </label>
                            <CustomerTypeSelect
                                defaultValue={form.customer_type}
                                className={`form-input ${errors.customer_type ? 'border-red-500' : ''}`}
                                name="customer_type"
                                onChange={(e) => handleCustomerTypeChange(e.target.value)}
                            />
                            {errors.customer_type && <p className="text-red-500 text-xs mt-1">{errors.customer_type}</p>}
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <button type="button" onClick={handleClose} className="btn btn-outline-secondary" disabled={saving}>
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

export default CreateCustomerModal;
