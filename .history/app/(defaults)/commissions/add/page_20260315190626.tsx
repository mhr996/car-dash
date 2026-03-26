'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import supabase from '@/lib/supabase';
import { Alert } from '@/components/elements/alerts/elements-alerts-default';
import { getTranslation } from '@/i18n';
import { PermissionGuard } from '@/components/auth/permission-guard';
import IconPlus from '@/components/icon/icon-plus';
import IconTrash from '@/components/icon/icon-trash';
import IconDollarSign from '@/components/icon/icon-dollar-sign';
import IconUser from '@/components/icon/icon-user';
import IconCalendar from '@/components/icon/icon-calendar';
import ProviderSelect from '@/components/provider-select/provider-select';
import CommissionTypeSelect from '@/components/commission-type-select/commission-type-select';
import { MultiplePaymentForm } from '@/components/forms/multiple-payment-form';
import { BillPayment } from '@/types/payment';

interface CommissionItem {
    id: string;
    item_description: string;
    unit_price: number;
    quantity: number;
}

interface ProviderInfo {
    id: number;
    name: string;
    address?: string;
    phone?: string;
}

const AddCommission = () => {
    const { t } = getTranslation();
    const router = useRouter();
    const [saving, setSaving] = useState(false);
    const [alert, setAlert] = useState<{ message: string; type: 'success' | 'danger' } | null>(null);

    const [providerId, setProviderId] = useState('');
    const [selectedProvider, setSelectedProvider] = useState<ProviderInfo | null>(null);
    const [commissionType, setCommissionType] = useState('');
    const [commissionDate, setCommissionDate] = useState(new Date().toISOString().split('T')[0]);
    const [status, setStatus] = useState('pending');
    const [freeText, setFreeText] = useState('');

    // الفاتورة الضريبية - بنود يدوية
    const [items, setItems] = useState<CommissionItem[]>([
        { id: '1', item_description: '', unit_price: 0, quantity: 1 },
    ]);

    // سند القبض - مدفوعات
    const [payments, setPayments] = useState<BillPayment[]>([{ payment_type: 'cash', amount: 0 }]);

    // للم receipt_only - المبلغ يدوي
    const [receiptAmount, setReceiptAmount] = useState('');

    useEffect(() => {
        if (!providerId) {
            setSelectedProvider(null);
            return;
        }
        const fetchProvider = async () => {
            const { data } = await supabase.from('providers').select('id, name, address, phone').eq('id', parseInt(providerId, 10) || providerId).single();
            setSelectedProvider(data || null);
        };
        fetchProvider();
    }, [providerId]);

    const addItem = () => {
        setItems((prev) => [...prev, { id: Date.now().toString(), item_description: '', unit_price: 0, quantity: 1 }]);
    };

    const removeItem = (id: string) => {
        if (items.length > 1) {
            setItems((prev) => prev.filter((i) => i.id !== id));
        }
    };

    const updateItem = (id: string, field: keyof CommissionItem, value: string | number) => {
        setItems((prev) =>
            prev.map((i) =>
                i.id === id ? { ...i, [field]: field === 'item_description' ? value : typeof value === 'string' ? parseFloat(value) || 0 : value } : i
            )
        );
    };

    // المجموع من البنود = الإجمالي (شامل الضريبة) → الإجمالي قبل الضريبة = الإجمالي / 1.18
    const itemsTotal = items.reduce((sum, i) => sum + (i.unit_price || 0) * (i.quantity || 1), 0);
    const totalWithTax = itemsTotal;
    const itemsTotalBeforeTax = itemsTotal * 1.18;
    const taxAmount = itemsTotal - itemsTotalBeforeTax;

    const receiptTotalAmount = parseFloat(receiptAmount) || 0;
    const totalAmountForPaymentForm =
        commissionType === 'receipt_only' ? receiptTotalAmount : commissionType === 'tax_invoice_receipt' ? totalWithTax : 0;

    const validateForm = () => {
        if (!providerId) {
            setAlert({ message: t('provider_required'), type: 'danger' });
            return false;
        }
        if (!commissionType) {
            setAlert({ message: t('commission_type_required'), type: 'danger' });
            return false;
        }

        if (commissionType === 'tax_invoice' || commissionType === 'tax_invoice_receipt') {
            const hasValidItem = items.some((i) => (i.item_description || '').trim() && (i.unit_price || 0) > 0);
            if (!hasValidItem) {
                setAlert({ message: t('commission_items_required'), type: 'danger' });
                return false;
            }
        }

        if (commissionType === 'receipt_only') {
            if (receiptTotalAmount <= 0) {
                setAlert({ message: t('amount_required'), type: 'danger' });
                return false;
            }
        }

        if (commissionType === 'receipt_only' || commissionType === 'tax_invoice_receipt') {
            const totalPaid = payments.reduce((s, p) => s + (p.amount || 0), 0);
            if (totalPaid <= 0) {
                setAlert({ message: t('payment_amount_required'), type: 'danger' });
                return false;
            }
        }
        return true;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateForm()) return;

        setSaving(true);
        try {
            let total = 0;
            let tax_amount = 0;
            let total_with_tax = 0;

            if (commissionType === 'tax_invoice' || commissionType === 'tax_invoice_receipt') {
                total = itemsTotalBeforeTax;
                tax_amount = taxAmount;
                total_with_tax = totalWithTax;
            } else {
                total_with_tax = receiptTotalAmount;
                total = receiptTotalAmount / 1.18;
                tax_amount = receiptTotalAmount - total;
            }

            const providerIdNum = typeof providerId === 'string' && providerId ? parseInt(providerId, 10) : providerId;

            const { data: commissionResult, error } = await supabase
                .from('commissions')
                .insert({
                    provider_id: providerIdNum,
                    commission_type: commissionType,
                    status,
                    date: commissionDate,
                    total,
                    tax_amount,
                    total_with_tax,
                    free_text: freeText || null,
                })
                .select('id')
                .single();

            if (error) throw error;
            const commissionId = commissionResult.id;

            if (commissionType === 'tax_invoice' || commissionType === 'tax_invoice_receipt') {
                const validItems = items.filter((i) => (i.item_description || '').trim() && (i.unit_price || 0) > 0);
                if (validItems.length > 0) {
                    const itemInserts = validItems.map((item, idx) => ({
                        commission_id: commissionId,
                        item_description: item.item_description.trim(),
                        unit_price: item.unit_price,
                        quantity: item.quantity,
                        sort_order: idx,
                    }));
                    const { error: itemsError } = await supabase.from('commission_items').insert(itemInserts);
                    if (itemsError) throw itemsError;
                }
            }

            if (commissionType === 'receipt_only' || commissionType === 'tax_invoice_receipt') {
                const paymentInserts = payments
                    .filter((p) => (p.amount || 0) > 0)
                    .map((p) => ({
                        commission_id: commissionId,
                        payment_type: p.payment_type,
                        amount: p.amount,
                        visa_installments: p.visa_installments || null,
                        visa_card_type: p.visa_card_type || null,
                        visa_last_four: p.visa_last_four || null,
                        approval_number: p.approval_number || null,
                        bank_name: p.bank_name || null,
                        bank_branch: p.bank_branch || null,
                        transfer_bank_name: p.transfer_bank_name || null,
                        transfer_branch: p.transfer_branch || null,
                        transfer_account_number: p.transfer_account_number || null,
                        transfer_number: p.transfer_number || null,
                        transfer_holder_name: p.transfer_holder_name || null,
                        check_bank_name: p.check_bank_name || null,
                        check_number: p.check_number || null,
                        check_holder_name: p.check_holder_name || null,
                        check_branch: p.check_branch || null,
                        check_account_number: p.check_account_number || null,
                    }));
                if (paymentInserts.length > 0) {
                    const { error: paymentsError } = await supabase.from('commission_payments').insert(paymentInserts);
                    if (paymentsError) throw paymentsError;
                }
            }

            setAlert({ message: t('commission_created_successfully'), type: 'success' });
            setTimeout(() => router.push('/commissions'), 1500);
        } catch (err) {
            console.error(err);
            setAlert({ message: err instanceof Error ? err.message : t('error_creating_commission'), type: 'danger' });
        } finally {
            setSaving(false);
        }
    };

    return (
        <PermissionGuard permission="manage_commissions">
            <div className="container mx-auto p-6 pb-24">
                <div className="flex items-center gap-5 mb-6">
                    <div onClick={() => router.back()}>
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-7 w-7 mb-4 cursor-pointer text-primary rtl:rotate-180"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                    </div>
                    <ul className="flex space-x-2 rtl:space-x-reverse mb-4">
                        <li>
                            <Link href="/" className="text-primary hover:underline">
                                {t('home')}
                            </Link>
                        </li>
                        <li className="before:content-['/'] ltr:before:mr-2 rtl:before:ml-2">
                            <Link href="/commissions" className="text-primary hover:underline">
                                {t('commissions')}
                            </Link>
                        </li>
                        <li className="before:content-['/'] ltr:before:mr-2 rtl:before:ml-2">
                            <span>{t('add_commission')}</span>
                        </li>
                    </ul>
                </div>

                <div className="mb-6">
                    <h1 className="text-2xl font-bold">{t('add_commission')}</h1>
                    <p className="text-gray-500">{t('add_commission_description')}</p>
                </div>

                {alert && (
                    <div className="fixed top-4 right-4 z-50 min-w-80 max-w-md">
                        <Alert type={alert.type} title={alert.type === 'success' ? t('success') : t('error')} message={alert.message} onClose={() => setAlert(null)} />
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Provider Selection */}
                    <div className="panel bg-gradient-to-r from-primary/10 to-secondary/10 border-2 border-primary/20">
                        <div className="mb-5 flex items-center gap-3">
                            <IconUser className="w-5 h-5 text-primary" />
                            <h5 className="text-xl font-bold text-primary dark:text-white-light">{t('select_provider')}</h5>
                        </div>
                        <div className="space-y-4">
                            <ProviderSelect defaultValue={providerId} onChange={(e) => setProviderId(e.target.value)} className="form-select text-white-dark w-full" />
                            {selectedProvider && (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 bg-white dark:bg-gray-800 rounded-lg border">
                                    <div>
                                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('provider')}</label>
                                        <p className="text-sm text-gray-900 dark:text-white">{selectedProvider.name}</p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('address')}</label>
                                        <p className="text-sm text-gray-900 dark:text-white">{selectedProvider.address || '-'}</p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('phone')}</label>
                                        <p className="text-sm text-gray-900 dark:text-white">{selectedProvider.phone || '-'}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Commission Type Selection */}
                    {providerId && (
                        <div className="panel">
                            <div className="mb-5 flex items-center gap-3">
                                <IconDollarSign className="w-5 h-5 text-primary" />
                                <h5 className="text-lg font-semibold dark:text-white-light">{t('commission_type')}</h5>
                            </div>
                            <div className="space-y-4">
                                <CommissionTypeSelect defaultValue={commissionType} onChange={setCommissionType} />
                            </div>
                        </div>
                    )}

                    {/* Date Selector */}
                    {providerId && commissionType && (
                        <div className="panel">
                            <div className="mb-5 flex items-center gap-3">
                                <IconCalendar className="w-5 h-5 text-primary" />
                                <div>
                                    <h5 className="text-lg font-semibold dark:text-white-light">{t('bill_date')}</h5>
                                    <p className="text-gray-600 dark:text-gray-400 mt-1">{t('select_bill_date_desc')}</p>
                                </div>
                            </div>
                            <div className="relative">
                                <input
                                    type="date"
                                    value={commissionDate}
                                    onChange={(e) => setCommissionDate(e.target.value)}
                                    className="form-input bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-600 rounded-lg px-4 py-3 text-lg focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-3 [&::-webkit-calendar-picker-indicator]:w-5 [&::-webkit-calendar-picker-indicator]:h-5 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                                    style={{ colorScheme: 'light' }}
                                />
                                <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                                    <IconCalendar className="w-5 h-5 text-gray-400" />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Provider Information + Tax Invoice Section (مثل Customer Information + Tax Invoice في الفواتير) */}
                    {(commissionType === 'tax_invoice' || commissionType === 'tax_invoice_receipt') && selectedProvider && (
                        <>
                            {/* Provider Information Display - أسفل التاريخ مثل معلومات العميل */}
                            <div className="panel">
                                <div className="mb-5 flex items-center gap-3">
                                    <IconUser className="w-5 h-5 text-primary" />
                                    <h5 className="text-lg font-semibold dark:text-white-light">{t('provider_information')}</h5>
                                </div>
                                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                                    <h6 className="font-semibold text-blue-800 dark:text-blue-200 mb-3">{t('provider_details')}</h6>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                                        <div>
                                            <span className="text-blue-600 dark:text-blue-300 font-medium">{t('provider')}:</span>
                                            <p className="text-blue-800 dark:text-blue-100">{selectedProvider.name}</p>
                                        </div>
                                        <div>
                                            <span className="text-blue-600 dark:text-blue-300 font-medium">{t('phone')}:</span>
                                            <p className="text-blue-800 dark:text-blue-100">{selectedProvider.phone || '-'}</p>
                                        </div>
                                        <div>
                                            <span className="text-blue-600 dark:text-blue-300 font-medium">{t('address')}:</span>
                                            <p className="text-blue-800 dark:text-blue-100">{selectedProvider.address || '-'}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Tax Invoice Details Table */}
                            <div className="panel">
                            <div className="mb-5 flex items-center gap-3">
                                <IconDollarSign className="w-5 h-5 text-primary" />
                                <h5 className="text-lg font-semibold dark:text-white-light">{t('commission_type_tax_invoice')}</h5>
                            </div>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{t('commission_tax_invoice_items_hint')}</p>
                            <div className="bg-transparent rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                                <div className="grid grid-cols-4 gap-4 mb-4 pb-2 border-b border-gray-300 dark:border-gray-600">
                                    <div className="text-sm font-bold text-gray-700 dark:text-white text-right">{t('item_description')}</div>
                                    <div className="text-sm font-bold text-gray-700 dark:text-white text-center">{t('price')}</div>
                                    <div className="text-sm font-bold text-gray-700 dark:text-white text-center">{t('quantity')}</div>
                                    <div className="text-sm font-bold text-gray-700 dark:text-white text-center">{t('total')}</div>
                                </div>
                                {items.map((item) => (
                                    <div key={item.id} className="grid grid-cols-4 gap-4 mb-3 py-2 items-center">
                                        <div className="text-right">
                                            <input
                                                type="text"
                                                className="form-input text-sm"
                                                value={item.item_description}
                                                onChange={(e) => updateItem(item.id, 'item_description', e.target.value)}
                                                placeholder={t('enter_item_description')}
                                            />
                                        </div>
                                        <div className="text-center">
                                            <input
                                                type="number"
                                                step="0.01"
                                                className="form-input text-sm text-center"
                                                value={item.unit_price || ''}
                                                onChange={(e) => updateItem(item.id, 'unit_price', e.target.value)}
                                            />
                                        </div>
                                        <div className="text-center flex items-center justify-center gap-2">
                                            <input
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                className="form-input text-sm text-center w-20"
                                                value={item.quantity || ''}
                                                onChange={(e) => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => removeItem(item.id)}
                                                className="btn btn-outline-danger btn-sm p-1"
                                                disabled={items.length <= 1}
                                                title={t('delete')}
                                            >
                                                <IconTrash className="w-4 h-4" />
                                            </button>
                                        </div>
                                        <div className="text-center">
                                            <span className="text-sm text-gray-700 dark:text-gray-300">₪{((item.unit_price || 0) * (item.quantity || 1)).toFixed(2)}</span>
                                        </div>
                                    </div>
                                ))}
                                <button type="button" onClick={addItem} className="btn btn-outline-primary btn-sm gap-2 mt-2">
                                    <IconPlus className="w-4 h-4" />
                                    {t('add_item')}
                                </button>
                            </div>
                            <div className="border-t border-gray-300 dark:border-gray-600 mt-6 pt-4 space-y-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('total_before_tax')}</span>
                                    <span className="text-sm text-gray-700 dark:text-gray-300">₪{itemsTotalBeforeTax.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('tax_18_percent')}</span>
                                    <span className="text-sm text-gray-700 dark:text-gray-300">₪{taxAmount.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between items-center pt-2 border-t border-gray-300 dark:border-gray-600">
                                    <span className="text-lg font-bold text-gray-700 dark:text-gray-300">{t('total_with_tax')}</span>
                                    <span className="text-lg font-bold text-primary">₪{totalWithTax.toFixed(2)}</span>
                                </div>
                            </div>
                        </div>
                    </>
                    )}

                    {/* Receipt Only - Amount */}
                    {commissionType === 'receipt_only' && (
                        <div className="panel">
                            <div className="mb-5 flex items-center gap-3">
                                <IconDollarSign className="w-5 h-5 text-primary" />
                                <h5 className="text-lg font-semibold dark:text-white-light">{t('commission_type_receipt')}</h5>
                            </div>
                            <div>
                                <label htmlFor="receipt_amount" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    {t('total_with_tax')} <span className="text-red-500">*</span>
                                </label>
                                <div className="flex">
                                    <span className="inline-flex items-center px-3 bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 border border-r-0 border-gray-300 dark:border-gray-600 ltr:rounded-l-md rtl:rounded-r-md">
                                        ₪
                                    </span>
                                    <input
                                        type="number"
                                        id="receipt_amount"
                                        step="0.01"
                                        min="0"
                                        value={receiptAmount}
                                        onChange={(e) => setReceiptAmount(e.target.value)}
                                        className="form-input ltr:rounded-l-none rtl:rounded-r-none"
                                        placeholder="0.00"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Receipt Section - مثل الفواتير */}
                    {(commissionType === 'receipt_only' || commissionType === 'tax_invoice_receipt') && (
                        <div className="panel">
                            <div className="mb-5 flex items-center gap-3">
                                <IconDollarSign className="w-5 h-5 text-primary" />
                                <h5 className="text-lg font-semibold dark:text-white-light">{t('receipt_details')}</h5>
                            </div>
                            <MultiplePaymentForm
                                payments={payments}
                                onPaymentsChange={setPayments}
                                totalAmount={commissionType === 'receipt_only' ? receiptTotalAmount : totalAmountForPaymentForm}
                            />
                        </div>
                    )}

                    {/* Notes - في النهاية لكل أنواع العمولة */}
                    {providerId && commissionType && (
                        <div className="panel">
                            <div className="mb-5 flex items-center gap-3">
                                <IconDollarSign className="w-5 h-5 text-primary" />
                                <h5 className="text-lg font-semibold dark:text-white-light">{t('notes')}</h5>
                            </div>
                            <textarea
                                id="free_text"
                                name="free_text"
                                rows={3}
                                value={freeText}
                                onChange={(e) => setFreeText(e.target.value)}
                                className="form-textarea"
                                placeholder={t('enter_bill_notes')}
                            />
                        </div>
                    )}

                    {/* Submit Button */}
                    {providerId && commissionType && (
                        <div className="flex justify-end gap-4">
                            <button type="button" onClick={() => router.back()} className="btn btn-outline-danger">
                                {t('cancel')}
                            </button>
                            <button type="submit" className="btn btn-primary px-8" disabled={saving}>
                                {saving ? t('creating') : t('create_commission')}
                            </button>
                        </div>
                    )}
                </form>
            </div>
        </PermissionGuard>
    );
};

export default AddCommission;
