'use client';
import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import supabase from '@/lib/supabase';
import { getTranslation } from '@/i18n';
import IconArrowLeft from '@/components/icon/icon-arrow-left';
import IconDollarSign from '@/components/icon/icon-dollar-sign';
import { BillWithPayments, BillPayment } from '@/types/payment';
import { MultiplePaymentForm } from '@/components/forms/multiple-payment-form';
import { Alert } from '@/components/elements/alerts/elements-alerts-default';

const EditBill = () => {
    const { t } = getTranslation();
    const router = useRouter();
    const params = useParams();
    const billId = params?.id as string;

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [bill, setBill] = useState<BillWithPayments | null>(null);
    const [payments, setPayments] = useState<BillPayment[]>([]);
    const [alert, setAlert] = useState<{ message: string; type: 'success' | 'danger' } | null>(null);

    useEffect(() => {
        fetchBill();
    }, [billId]);

    useEffect(() => {
        if (bill?.payments) {
            setPayments(bill.payments);
        }
    }, [bill]);

    const fetchBill = async () => {
        try {
            const { data, error } = await supabase
                .from('bills')
                .select(
                    `
                    *,
                    deal:deals(
                        *,
                        customer:customers!deals_customer_id_fkey(*),
                        seller:customers!deals_seller_id_fkey(*),
                        buyer:customers!deals_buyer_id_fkey(*),
                        car:cars!deals_car_id_fkey(*)
                    ),
                    payments:bill_payments(*)
                `,
                )
                .eq('id', billId)
                .single();

            if (error) throw error;
            setBill(data);
        } catch (error) {
            console.error('Error fetching bill:', error);
            setAlert({ message: t('error_loading_data'), type: 'danger' });
        } finally {
            setLoading(false);
        }
    };

    const handleSavePayments = async () => {
        if (!bill) return;

        // Validation - ensure total doesn't exceed bill amount
        const totalPaid = payments.reduce((sum, payment) => sum + (payment.amount || 0), 0);
        const billTotal = bill.total_with_tax || 0;

        if (totalPaid > billTotal + 0.01) {
            setAlert({
                message: `${t('payment_exceeds_total')}`,
                type: 'danger',
            });
            return;
        }

        setSaving(true);
        try {
            // Delete all existing payments for this bill
            const { error: deleteError } = await supabase.from('bill_payments').delete().eq('bill_id', bill.id);

            if (deleteError) throw deleteError;

            // Insert new payments
            if (payments.length > 0) {
                const paymentInserts = payments.map((payment) => ({
                    bill_id: bill.id,
                    payment_type: payment.payment_type,
                    amount: payment.amount,
                    visa_installments: payment.visa_installments || null,
                    visa_card_type: payment.visa_card_type || null,
                    visa_last_four: payment.visa_last_four || null,
                    approval_number: payment.approval_number || null,
                    bank_name: payment.bank_name || null,
                    bank_branch: payment.bank_branch || null,
                    transfer_amount: payment.transfer_amount || null,
                    transfer_bank_name: payment.transfer_bank_name || null,
                    transfer_branch: payment.transfer_branch || null,
                    transfer_account_number: payment.transfer_account_number || null,
                    transfer_branch_number: payment.transfer_branch_number || null,
                    transfer_number: payment.transfer_number || null,
                    transfer_holder_name: payment.transfer_holder_name || null,
                    check_bank_name: payment.check_bank_name || null,
                    check_branch: payment.check_branch || null,
                    check_branch_number: payment.check_branch_number || null,
                    check_account_number: payment.check_account_number || null,
                    check_number: payment.check_number || null,
                    check_holder_name: payment.check_holder_name || null,
                }));

                const { error: insertError } = await supabase.from('bill_payments').insert(paymentInserts);

                if (insertError) throw insertError;
            }

            const remainingAmount = billTotal - totalPaid;
            if (remainingAmount > 0.01) {
                setAlert({
                    message: `${t('payments_updated')}`,
                    type: 'success',
                });
            } else {
                setAlert({
                    message: t('payments_updated_fully_paid'),
                    type: 'success',
                });
            }

            // Refresh bill data
            await fetchBill();
        } catch (error) {
            console.error('Error updating payments:', error);
            setAlert({ message: t('error_saving_data'), type: 'danger' });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (!bill) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">{t('bill_not_found')}</h2>
                    <Link href="/bills" className="btn btn-primary">
                        {t('back_to_bills')}
                    </Link>
                </div>
            </div>
        );
    }

    // Only allow editing payments for receipt types
    if (bill.bill_type !== 'receipt_only' && bill.bill_type !== 'tax_invoice_receipt') {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">{t('payment_editing_not_supported')}</h2>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">{t('only_receipts_can_edit_payments')}</p>
                    <Link href="/bills" className="btn btn-primary">
                        {t('back_to_bills')}
                    </Link>
                </div>
            </div>
        );
    }

    const currentTotal = payments.reduce((sum, payment) => sum + (payment.amount || 0), 0);
    const billTotal = bill.total_with_tax || 0;
    const remainingAmount = billTotal - currentTotal;

    return (
        <div className="space-y-8 pt-5">
            {/* Fixed Position Alert */}
            {alert && (
                <div className="fixed top-4 right-4 z-50 min-w-80 max-w-md">
                    <Alert type={alert.type} title={alert.type === 'success' ? t('success') : t('error')} message={alert.message} onClose={() => setAlert(null)} />
                </div>
            )}

            {/* Header */}
            <div className="panel !border-white-light/10">
                <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-3">
                        <Link
                            href="/bills"
                            className="flex items-center justify-center w-10 h-10 rounded-lg bg-white-light/40 hover:bg-white-light/60 dark:bg-[#191e3a] dark:hover:bg-[#191e3a]/80 transition-all duration-300"
                        >
                            <IconArrowLeft className="w-5 h-5" />
                        </Link>
                        <div>
                            <h5 className="text-lg font-semibold dark:text-white-light">{t('edit_bill_payments')}</h5>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                {t('bill_id')}: #{bill.id} - {bill.customer_name}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Bill Summary */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="border border-primary-light p-4 rounded-lg">
                        <div className="text-sm text-primary">{t('bill_total')}</div>
                        <div className="text-xl font-bold text-primary">₪{billTotal.toFixed(2)}</div>
                    </div>
                    <div className="border border-success-light p-4 rounded-lg">
                        <div className="text-sm text-success">{t('paid_amount')}</div>
                        <div className="text-xl font-bold text-success">₪{currentTotal.toFixed(2)}</div>
                    </div>
                    <div className={`p-4 rounded-lg ${remainingAmount > 0.01 ? 'border border-warning-light' : 'border border-success-light'}`}>
                        <div className={`text-sm ${remainingAmount > 0.01 ? 'text-warning' : 'text-success'}`}>{remainingAmount > 0.01 ? t('remaining_amount') : t('fully_paid')}</div>
                        <div className={`text-xl font-bold ${remainingAmount > 0.01 ? 'text-warning' : 'text-success'}`}>₪{remainingAmount.toFixed(2)}</div>
                    </div>
                </div>

                {/* Alert removed - now using fixed positioning */}
            </div>

            {/* Payments Form */}
            <div className="panel">
                <div className="mb-5 flex items-center gap-3">
                    <IconDollarSign className="w-5 h-5 text-primary" />
                    <h5 className="text-lg font-semibold dark:text-white-light">{t('manage_payments')}</h5>
                </div>

                <MultiplePaymentForm payments={payments} onPaymentsChange={setPayments} totalAmount={billTotal} />

                <div className="flex justify-end gap-4 mt-6">
                    <button type="button" onClick={() => router.back()} className="btn btn-outline-danger">
                        {t('cancel')}
                    </button>
                    <button type="button" onClick={handleSavePayments} className="btn btn-primary" disabled={saving}>
                        {saving ? t('saving') : t('save_payments')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EditBill;
