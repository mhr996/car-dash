'use client';
import React, { useState, useEffect, useRef } from 'react';
import { BillPayment } from '@/types/payment';
import { getTranslation } from '@/i18n';
import IconTrash from '@/components/icon/icon-trash';
import IconPlus from '@/components/icon/icon-plus';
import IconCaretDown from '@/components/icon/icon-caret-down';

interface PaymentTypeSelectProps {
    value: string;
    onChange: (value: string) => void;
    className?: string;
}

const PaymentTypeSelect: React.FC<PaymentTypeSelectProps> = ({ value, onChange, className = 'form-select' }) => {
    const { t } = getTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    const paymentTypes = [
        { value: 'cash', label: t('cash'), icon: '💵' },
        { value: 'visa', label: t('visa_card'), icon: '💳' },
        { value: 'bank_transfer', label: t('bank_transfer'), icon: '🏦' },
        { value: 'check', label: t('check'), icon: '📝' },
    ];

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (selectedValue: string) => {
        onChange(selectedValue);
        setIsOpen(false);
    };

    const getSelectedLabel = () => {
        const selected = paymentTypes.find((type) => type.value === value);
        return selected ? (
            <span className="flex items-center gap-2">
                <span>{selected.icon}</span>
                <span>{selected.label}</span>
            </span>
        ) : (
            <span className="text-gray-500">{t('select_payment_method')}</span>
        );
    };

    return (
        <div ref={wrapperRef} className="relative">
            <div
                className={`${className} cursor-pointer dark:bg-black dark:text-white-dark dark:border-[#374151] flex items-center justify-between min-h-[42px] px-3 py-2 border border-gray-300 rounded-md bg-white hover:border-primary transition-colors`}
                onClick={() => setIsOpen(!isOpen)}
            >
                {getSelectedLabel()}
                <IconCaretDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''} text-gray-400`} />
            </div>
            {isOpen && (
                <div className="absolute z-50 mt-1 w-full rounded-md border border-gray-300 bg-white shadow-lg dark:bg-black dark:border-[#374151]">
                    <div className="max-h-60 overflow-y-auto">
                        {paymentTypes.map((type) => (
                            <div
                                key={type.value}
                                className="cursor-pointer px-4 py-3 hover:bg-gray-100 dark:text-white-dark dark:hover:bg-[#191e3a] border-b border-gray-100 dark:border-[#374151] last:border-b-0 flex items-center gap-3"
                                onClick={() => handleSelect(type.value)}
                            >
                                <span className="text-lg">{type.icon}</span>
                                <span className="font-medium">{type.label}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

interface PaymentFormProps {
    payment: BillPayment;
    onUpdate: (payment: BillPayment) => void;
    onRemove: () => void;
    showRemove: boolean;
    index: number;
}

const PaymentForm: React.FC<PaymentFormProps> = ({ payment, onUpdate, onRemove, showRemove, index }) => {
    const { t } = getTranslation();

    const handleInputChange = (field: keyof BillPayment, value: any) => {
        onUpdate({
            ...payment,
            [field]: value,
        });
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('he-IL', {
            style: 'currency',
            currency: 'ILS',
            minimumFractionDigits: 2,
        }).format(amount);
    };

    return (
        <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-6 mb-6  shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary/10 text-primary rounded-full flex items-center justify-center font-semibold text-sm">{index + 1}</div>
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {t('payment')} #{index + 1}
                    </h4>
                </div>
                {showRemove && (
                    <button type="button" onClick={onRemove} className="btn btn-outline-danger btn-sm hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                        <IconTrash className="w-4 h-4" />
                    </button>
                )}
            </div>

            {/* Payment Type Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-white mb-2">{t('payment_method')}</label>
                    <PaymentTypeSelect value={payment.payment_type} onChange={(value) => handleInputChange('payment_type', value)} className="w-full" />
                </div>

                <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-white mb-2">{t('amount')}</label>
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 font-medium z-10">₪</span>
                        <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={payment.amount || ''}
                            onChange={(e) => handleInputChange('amount', parseFloat(e.target.value) || 0)}
                            className="form-input pl-8 pr-4 w-full border border-gray-300 rounded-md hover:border-primary transition-colors dark:bg-black dark:text-white-dark dark:border-[#374151] focus:border-primary focus:ring-1 focus:ring-primary"
                            placeholder="0.00"
                            required
                        />
                    </div>
                </div>
            </div>

            {/* Visa Card Details */}
            {payment.payment_type === 'visa' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 dark:text-white mb-2">{t('card_type')}</label>
                        <input
                            type="text"
                            value={payment.visa_card_type || ''}
                            onChange={(e) => handleInputChange('visa_card_type', e.target.value)}
                            className="form-input"
                            placeholder={t('enter_card_type')}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 dark:text-white mb-2">{t('last_four_digits')}</label>
                        <input
                            type="text"
                            maxLength={4}
                            value={payment.visa_last_four || ''}
                            onChange={(e) => handleInputChange('visa_last_four', e.target.value)}
                            className="form-input"
                            placeholder="1234"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 dark:text-white mb-2">{t('installments')}</label>
                        <input
                            type="number"
                            min="1"
                            value={payment.visa_installments || ''}
                            onChange={(e) => handleInputChange('visa_installments', parseInt(e.target.value) || undefined)}
                            className="form-input"
                            placeholder="1"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 dark:text-white mb-2">{t('approval_number')}</label>
                        <input
                            type="text"
                            value={payment.approval_number || ''}
                            onChange={(e) => handleInputChange('approval_number', e.target.value)}
                            className="form-input"
                            placeholder={t('enter_approval_number')}
                        />
                    </div>
                </div>
            )}

            {/* Bank Transfer Details */}
            {payment.payment_type === 'bank_transfer' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 dark:text-white mb-2">{t('bank_transfer_details')}</label>
                        <input
                            type="text"
                            value={payment.transfer_bank_name || ''}
                            onChange={(e) => handleInputChange('transfer_bank_name', e.target.value)}
                            className="form-input"
                            placeholder={t('enter_bank_transfer_details')}
                        />
                    </div>
                </div>
            )}

            {/* Check Details */}
            {payment.payment_type === 'check' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 dark:text-white mb-2">{t('bank_name')}</label>
                        <input
                            type="text"
                            value={payment.check_bank_name || ''}
                            onChange={(e) => handleInputChange('check_bank_name', e.target.value)}
                            className="form-input"
                            placeholder={t('enter_bank_name')}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 dark:text-white mb-2">{t('branch')}</label>
                        <input
                            type="text"
                            value={payment.check_branch || ''}
                            onChange={(e) => handleInputChange('check_branch', e.target.value)}
                            className="form-input"
                            placeholder={t('enter_branch')}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 dark:text-white mb-2">{t('branch_number')}</label>
                        <input
                            type="text"
                            value={payment.check_branch_number || ''}
                            onChange={(e) => handleInputChange('check_branch_number', e.target.value)}
                            className="form-input"
                            placeholder={t('enter_branch_number')}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 dark:text-white mb-2">{t('account_number')}</label>
                        <input
                            type="text"
                            value={payment.check_account_number || ''}
                            onChange={(e) => handleInputChange('check_account_number', e.target.value)}
                            className="form-input"
                            placeholder={t('enter_account_number')}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 dark:text-white mb-2">{t('check_number')}</label>
                        <input
                            type="text"
                            value={payment.check_number || ''}
                            onChange={(e) => handleInputChange('check_number', e.target.value)}
                            className="form-input"
                            placeholder={t('enter_check_number')}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 dark:text-white mb-2">{t('check_holder')}</label>
                        <input
                            type="text"
                            value={payment.check_holder_name || ''}
                            onChange={(e) => handleInputChange('check_holder_name', e.target.value)}
                            className="form-input"
                            placeholder={t('enter_check_holder')}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

interface MultiplePaymentFormProps {
    payments: BillPayment[];
    onPaymentsChange: (payments: BillPayment[]) => void;
    totalAmount: number;
    deal?: any; // Deal information for balance calculation
    carTakenFromClient?: any; // Car taken from client for exchange deals
    bills?: any[]; // Existing bills for balance calculation
}

export const MultiplePaymentForm: React.FC<MultiplePaymentFormProps> = ({ payments, onPaymentsChange, totalAmount, deal, carTakenFromClient, bills = [] }) => {
    const { t } = getTranslation();

    const addPayment = () => {
        const newPayment: BillPayment = {
            payment_type: 'cash',
            amount: 0,
        };
        onPaymentsChange([...payments, newPayment]);
    };

    const updatePayment = (index: number, updatedPayment: BillPayment) => {
        const newPayments = [...payments];
        newPayments[index] = updatedPayment;
        onPaymentsChange(newPayments);
    };

    const removePayment = (index: number) => {
        const newPayments = payments.filter((_, i) => i !== index);
        onPaymentsChange(newPayments);
    };

    const totalPaid = payments.reduce((sum, payment) => sum + (payment.amount || 0), 0);
    const remaining = totalAmount - totalPaid;

    // Helper function to calculate deal balance
    const calculateDealBalance = () => {
        if (!deal) return 0;

        let dealAmount = deal.selling_price || deal.amount || 0;

        // For exchange deals, subtract the customer car evaluation value
        if (deal.deal_type === 'exchange' && carTakenFromClient) {
            const carEvaluation = carTakenFromClient.buy_price || 0;
            dealAmount -= carEvaluation;
        }

        // Calculate total payments from existing bills
        let totalPaidFromBills = 0;
        bills.forEach((bill) => {
            // Only count positive bills (receipts) as payments
            if (bill.bill_direction !== 'negative') {
                if (bill.bill_type === 'general') {
                    totalPaidFromBills += parseFloat(bill.bill_amount || '0');
                } else if (bill.bill_type === 'tax_invoice') {
                    totalPaidFromBills += parseFloat(bill.total_with_tax || '0');
                } else if (bill.bill_type === 'receipt_only' || bill.bill_type === 'tax_invoice_receipt') {
                    if (bill.payments && bill.payments.length > 0) {
                        totalPaidFromBills += bill.payments.reduce((sum: number, payment: any) => sum + (payment.amount || 0), 0);
                    }
                }
            }
        });

        return dealAmount - totalPaidFromBills;
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white"></h3>
                <button type="button" onClick={addPayment} className="btn btn-primary btn-sm hover:bg-primary-dark transition-colors flex items-center gap-2 px-4 py-2 rounded-lg">
                    <IconPlus className="w-4 h-4" />
                    {t('add_payment')}
                </button>
            </div>

            {payments.map((payment, index) => (
                <PaymentForm
                    key={index}
                    payment={payment}
                    onUpdate={(updatedPayment) => updatePayment(index, updatedPayment)}
                    onRemove={() => removePayment(index)}
                    showRemove={payments.length > 1}
                    index={index}
                />
            ))}

            {/* Payment Summary */}
            <div className="rounded-xl p-6 border border-gray-200 dark:border-gray-600">
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('payment_summary')}</h4>
                <div className="space-y-3">
                    <div className="flex justify-between items-center">
                        <span className="text-gray-700 dark:text-gray-300 font-medium">{t('total_amount')}:</span>
                        <span className="font-bold text-lg text-gray-900 dark:text-white">₪{totalAmount.toFixed(0)}</span>
                    </div>

                    {/* Deal Balance - only show when deal info is available */}
                    {deal && (
                        <div className="flex justify-between items-center">
                            <span className="text-gray-700 dark:text-gray-300 font-medium">{t('deal_balance')}:</span>
                            <span
                                className={`font-bold text-lg ${calculateDealBalance() > 0 ? 'text-red-600 dark:text-red-400' : calculateDealBalance() < 0 ? 'text-green-600 dark:text-green-400' : 'text-gray-600 dark:text-gray-400'}`}
                            >
                                ₪{calculateDealBalance().toFixed(0)}
                            </span>
                        </div>
                    )}

                    <div className="flex justify-between items-center">
                        <span className="text-gray-700 dark:text-gray-300 font-medium">{t('total_paid')}:</span>
                        <span className="font-bold text-lg text-blue-600 dark:text-blue-400">₪{totalPaid.toFixed(0)}</span>
                    </div>
                    <div className="border-t border-gray-300 dark:border-gray-600 pt-3">
                        <div className="flex justify-between items-center">
                            <span className="text-gray-700 dark:text-gray-300 font-medium">{remaining < 0 ? t('excess_payment') : t('remaining')}:</span>
                            <span
                                className={`font-bold text-lg ${remaining === 0 ? 'text-green-600 dark:text-green-400' : remaining < 0 ? 'text-blue-600 dark:text-blue-400' : 'text-yellow-600 dark:text-yellow-400'}`}
                            >
                                ₪{Math.abs(remaining).toFixed(0)}
                            </span>
                        </div>
                        {remaining < 0 && <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">{t('excess_payment_note')}</p>}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PaymentForm;
