'use client';
import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import supabase from '@/lib/supabase';
import { Alert } from '@/components/elements/alerts/elements-alerts-default';
import { getTranslation } from '@/i18n';
import IconDollarSign from '@/components/icon/icon-dollar-sign';
import IconUser from '@/components/icon/icon-user';
import IconMenuWidgets from '@/components/icon/menu/icon-menu-widgets';
import IconCalendar from '@/components/icon/icon-calendar';
import DealSelect from '@/components/deal-select/deal-select';
import BillTypeSelect from '@/components/bill-type-select/bill-type-select';
import PaymentTypeSelect from '@/components/payment-type-select/payment-type-select';
import { logActivity } from '@/utils/activity-logger';
import { handleReceiptCreated, getCustomerIdFromDeal } from '@/utils/balance-manager';
import { BillPayment } from '@/types/payment';
import { MultiplePaymentForm } from '@/components/forms/multiple-payment-form';

interface Deal {
    id: number;
    title: string;
    deal_type: string;
    amount: number;
    selling_price?: number;
    loss_amount?: number;
    status: string;
    customer_id?: number;
    customer_name?: string;
    car_id?: number;
    seller_id?: number; // For intermediary deals
    buyer_id?: number; // For intermediary deals
    customer?: {
        id: number;
        name: string;
        phone: string;
        email?: string;
        age?: number;
    };
    seller?: {
        id: number;
        name: string;
        phone: string;
        email?: string;
        age?: number;
    };
    buyer?: {
        id: number;
        name: string;
        phone: string;
        email?: string;
        age?: number;
    };
    car?: {
        id: number;
        title: string;
        brand: string;
        year: number;
        status: string;
        type?: string;
        provider: string;
        kilometers: number;
        market_price: number;
        buy_price: number;
        sale_price: number;
        car_number?: string; // Car number field
    };
}

const AddBill = () => {
    const { t } = getTranslation();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [saving, setSaving] = useState(false);
    const [deals, setDeals] = useState<Deal[]>([]);
    const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
    const [billDate, setBillDate] = useState(new Date().toISOString().split('T')[0]); // Default to today
    const [alert, setAlert] = useState<{ message: string; type: 'success' | 'danger' } | null>(null);

    // Billing form state matching database schema exactly
    const [billForm, setBillForm] = useState({
        bill_type: '',
        bill_direction: 'positive', // Default to positive
        status: 'pending',
        customer_name: '',
        phone: '',
        date: new Date().toISOString().split('T')[0],
        car_details: '',
        commission: '',
        free_text: '',
        total: '',
        tax_amount: '',
        total_with_tax: '',
        payment_type: '',
        // General bill fields
        bill_description: '',
        bill_amount: '',
        // Visa payment fields
        visa_amount: '',
        visa_installments: '',
        visa_card_type: '',
        visa_last_four: '',
        // Bank transfer fields
        bank_amount: '',
        bank_name: '',
        bank_branch: '',
        account_number: '',
        transfer_number: '',
        transfer_holder_name: '',
        transfer_amount: '',
        transfer_bank_name: '',
        transfer_branch: '',
        transfer_account_number: '',
        transfer_branch_number: '',
        // Check fields
        check_amount: '',
        check_bank_name: '',
        check_branch_number: '',
        check_account_number: '',
        check_number: '',
        check_holder_name: '',
        check_branch: '',
        // Cash fields
        cash_amount: '',
        // Approval number (common for various payment types)
        approval_number: '',
    });

    // New multiple payments state for receipts
    const [payments, setPayments] = useState<BillPayment[]>([
        {
            payment_type: 'cash',
            amount: 0,
        },
    ]);

    useEffect(() => {
        fetchDeals();
    }, []); // Effect to handle pre-selected deal from URL parameter
    useEffect(() => {
        const dealId = searchParams?.get('deal');
        if (dealId && deals.length > 0) {
            handleDealSelect(dealId);
        }
    }, [deals, searchParams]);
    // Auto-dismiss alert after 5 seconds
    useEffect(() => {
        if (alert) {
            const timer = setTimeout(() => {
                setAlert(null);
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [alert]);
    const fetchDeals = async () => {
        try {
            const { data, error } = await supabase
                .from('deals')
                .select(
                    `
                    *,
                    customer:customers!deals_customer_id_fkey(*),
                    seller:customers!deals_seller_id_fkey(*),
                    buyer:customers!deals_buyer_id_fkey(*),
                    car:cars!deals_car_id_fkey(*)
                `,
                )
                .neq('status', 'cancelled') // Exclude cancelled deals from bill selector
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Process the data to ensure we have proper fallbacks
            const processedDeals = (data || []).map((deal) => ({
                ...deal,
                customer: deal.customer || null,
                seller: deal.seller || null,
                buyer: deal.buyer || null,
                car: deal.car || null,
            }));

            setDeals(processedDeals);
            console.log('Fetched deals:', processedDeals);
        } catch (error) {
            console.error('Error fetching deals:', error);
            setAlert({ message: t('error_loading_deals'), type: 'danger' });
        }
    };
    const handleDealSelect = (dealId: string) => {
        const deal = deals.find((d) => d.id.toString() === dealId);
        if (deal) {
            setSelectedDeal(deal);

            // Determine customer info based on deal type
            let customerInfo = null;
            let customerName = '';
            let customerPhone = '';

            if (deal.deal_type === 'intermediary') {
                // For intermediary deals, use seller info first, then buyer as fallback
                customerInfo = deal.seller || deal.buyer;
                customerName = customerInfo?.name || '';
                customerPhone = customerInfo?.phone || '';
            } else {
                // For regular deals, use customer info
                customerInfo = deal.customer;
                customerName = customerInfo?.name || '';
                customerPhone = customerInfo?.phone || '';
            }

            // Auto-fill form with deal data and reset bill_type when deal changes
            setBillForm((prev) => ({
                ...prev,
                bill_type: '', // Reset bill type when deal changes as available options might change
                customer_name: customerName,
                phone: customerPhone,
                car_details: deal.car ? `${deal.car.brand} ${deal.car.title} ${deal.car.year}` : '',
                sale_price: deal.amount?.toString() || '',
                // Calculate financials based on the deal amount (which already includes tax)
                total: (deal.amount / 1.18)?.toFixed(2) || '', // Price before tax
                tax_amount: ((deal.amount / 1.18) * 0.18)?.toFixed(2) || '', // Tax amount
                total_with_tax: deal.amount?.toFixed(2) || '', // Deal amount already includes tax
            }));
        }
    };

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setBillForm((prev) => {
            const updated = { ...prev, [name]: value };

            return updated;
        });
    };

    const validateForm = () => {
        if (!billForm.bill_type) {
            setAlert({ message: t('bill_type_required'), type: 'danger' });
            return false;
        }

        // For general bills, we don't need a deal
        if (billForm.bill_type === 'general') {
            if (!billForm.bill_description.trim()) {
                setAlert({ message: t('bill_description') + ' ' + t('required'), type: 'danger' });
                return false;
            }
            if (!billForm.bill_amount || parseFloat(billForm.bill_amount) <= 0) {
                setAlert({ message: t('bill_amount') + ' ' + t('required'), type: 'danger' });
                return false;
            }
            return true;
        }

        // For other bill types, we need a deal
        if (!selectedDeal) {
            setAlert({ message: t('deal_required'), type: 'danger' });
            return false;
        }
        if (!billForm.customer_name) {
            setAlert({ message: t('customer_name_required'), type: 'danger' });
            return false;
        }
        return true;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) return;

        // Additional validation for receipts with multiple payments
        if (billForm.bill_type === 'receipt_only' || billForm.bill_type === 'tax_invoice_receipt') {
            const totalPaid = payments.reduce((sum, payment) => sum + (payment.amount || 0), 0);
            const expectedTotal = parseFloat(billForm.total_with_tax) || 0;

            // Allow partial payments - just ensure the total doesn't exceed the bill amount
            if (totalPaid > expectedTotal + 0.01) {
                // Allow for small rounding differences
                setAlert({
                    message: `${t('payment_exceeds_total')}: ${t('maximum_allowed')} ₪${expectedTotal.toFixed(2)}, ${t('received')} ₪${totalPaid.toFixed(2)}`,
                    type: 'danger',
                });
                return;
            }

            // If this is a partial payment, show a success message but allow it
            if (totalPaid < expectedTotal - 0.01) {
                const remainingAmount = expectedTotal - totalPaid;
                setAlert({
                    message: `${t('partial_payment_notice')}: ${t('paid')} ₪${totalPaid.toFixed(2)}, ${t('remaining')} ₪${remainingAmount.toFixed(2)}`,
                    type: 'success',
                });
                // Don't return - allow the partial payment to proceed
            }
        }

        setSaving(true);
        try {
            // For receipts, we'll use multiple payments structure
            // For other bill types, we'll use the legacy single payment structure for now
            const billData =
                billForm.bill_type === 'receipt_only' || billForm.bill_type === 'tax_invoice_receipt'
                    ? {
                          deal_id: selectedDeal?.id || null,
                          bill_type: billForm.bill_type,
                          bill_direction: billForm.bill_direction,
                          status: billForm.status,
                          customer_name: billForm.customer_name,
                          phone: billForm.phone,
                          date: billForm.date,
                          car_details: billForm.car_details,
                          commission: parseFloat(billForm.commission) || null,
                          free_text: billForm.free_text,
                          total: parseFloat(billForm.total) || null,
                          tax_amount: parseFloat(billForm.tax_amount) || null,
                          total_with_tax: parseFloat(billForm.total_with_tax) || null,
                          // For receipts, we'll leave the old payment fields null since we use the new structure
                          payment_type: null,
                          bill_description: billForm.bill_description || null,
                          bill_amount: parseFloat(billForm.bill_amount) || null,
                          created_at: billDate ? new Date(billDate + 'T00:00:00').toISOString() : new Date().toISOString(),
                      }
                    : {
                          deal_id: selectedDeal?.id || null,
                          bill_type: billForm.bill_type,
                          bill_direction: billForm.bill_direction,
                          status: billForm.status,
                          customer_name: billForm.customer_name,
                          phone: billForm.phone,
                          date: billForm.date,
                          car_details: billForm.car_details,
                          commission: parseFloat(billForm.commission) || null,
                          free_text: billForm.free_text,
                          total: parseFloat(billForm.total) || null,
                          tax_amount: parseFloat(billForm.tax_amount) || null,
                          total_with_tax: parseFloat(billForm.total_with_tax) || null,
                          payment_type: billForm.payment_type || null,
                          // General bill fields
                          bill_description: billForm.bill_description || null,
                          bill_amount: parseFloat(billForm.bill_amount) || null,
                          visa_amount: parseFloat(billForm.visa_amount) || null,
                          visa_installments: parseInt(billForm.visa_installments) || null,
                          visa_card_type: billForm.visa_card_type || null,
                          visa_last_four: billForm.visa_last_four || null,
                          bank_amount: parseFloat(billForm.bank_amount) || null,
                          bank_name: billForm.bank_name || null,
                          bank_branch: billForm.bank_branch || null,
                          approval_number: billForm.approval_number || null,
                          account_number: billForm.account_number || null,
                          transfer_number: billForm.transfer_number || null,
                          transfer_holder_name: billForm.transfer_holder_name || null,
                          transfer_amount: parseFloat(billForm.bank_amount) || null,
                          transfer_bank_name: billForm.transfer_bank_name || null,
                          transfer_branch: billForm.transfer_branch || null,
                          transfer_account_number: billForm.transfer_account_number || null,
                          transfer_branch_number: billForm.transfer_branch_number || null,
                          check_amount: parseFloat(billForm.check_amount) || null,
                          check_bank_name: billForm.check_bank_name || null,
                          check_branch_number: billForm.check_branch_number || null,
                          check_account_number: billForm.check_account_number || null,
                          check_number: billForm.check_number || null,
                          check_holder_name: billForm.check_holder_name || null,
                          check_branch: billForm.check_branch || null,
                          cash_amount: parseFloat(billForm.cash_amount) || null,
                          created_at: billDate ? new Date(billDate + 'T00:00:00').toISOString() : new Date().toISOString(),
                      };

            const { data: billResult, error } = await supabase.from('bills').insert([billData]).select('id').single();

            if (error) throw error;

            // Insert multiple payments for receipts
            if ((billForm.bill_type === 'receipt_only' || billForm.bill_type === 'tax_invoice_receipt') && payments.length > 0) {
                const paymentInserts = payments.map((payment) => ({
                    bill_id: billResult.id,
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

                const { error: paymentsError } = await supabase.from('bill_payments').insert(paymentInserts);

                if (paymentsError) {
                    console.error('Error inserting payments:', paymentsError);
                    // Don't fail the entire operation, but log the error
                }
            }

            if (error) throw error;

            setAlert({ message: t('bill_created_successfully'), type: 'success' });

            // Log the activity with full bill data
            const billLogData = {
                ...billData,
                id: billResult.id,
                deal: selectedDeal,
            };

            await logActivity({
                type: 'bill_created',
                bill: billLogData,
            });

            // Update customer balance if this bill has payment amounts
            const customerId = getCustomerIdFromDeal(selectedDeal);
            if (customerId) {
                const balanceUpdateSuccess = await handleReceiptCreated(billResult.id, customerId, billData, billData.customer_name || 'Customer');

                if (!balanceUpdateSuccess) {
                    console.warn('Failed to update customer balance for bill:', billResult.id);
                    // Don't fail the bill creation, just log the warning
                }
            }

            // Automatically update deal status to 'completed' when a bill is created
            if (selectedDeal?.id && selectedDeal.status !== 'completed') {
                try {
                    const { error: dealUpdateError } = await supabase.from('deals').update({ status: 'completed' }).eq('id', selectedDeal.id);

                    if (dealUpdateError) {
                        console.warn('Failed to update deal status to completed:', dealUpdateError);
                        // Don't fail the bill creation, just log the warning
                    } else {
                        console.log(`Deal ${selectedDeal.id} status updated to completed after bill creation`);
                    }
                } catch (updateError) {
                    console.warn('Error updating deal status:', updateError);
                }
            }

            // Redirect to bills list after a short delay
            setTimeout(() => {
                router.push('/bills');
            }, 1500);
        } catch (error) {
            console.error(error);
            setAlert({
                message: t('error_creating_bill'),
                type: 'danger',
            });
        } finally {
            setSaving(false);
        }
    };

    const populateFormFromDeal = (deal: Deal) => {
        if (!deal) return;

        // Determine customer info based on deal type
        let customerName = '';
        let customerPhone = '';

        if (deal.deal_type === 'intermediary') {
            // For intermediary deals, use seller info first, then buyer as fallback
            const customerInfo = deal.seller || deal.buyer;
            customerName = customerInfo?.name || '';
            customerPhone = customerInfo?.phone || '';
        } else {
            // For regular deals, use customer info
            customerName = deal.customer?.name || '';
            customerPhone = deal.customer?.phone || '';
        }

        setBillForm((prev) => ({
            ...prev,
            customer_name: customerName,
            phone: customerPhone,
            car_details: deal.car ? `${deal.car.brand} ${deal.car.title} ${deal.car.year}` : '',
            sale_price: deal.amount?.toString() || '',
            // Calculate financials based on the deal amount (which already includes tax)
            total: (deal.amount / 1.18)?.toFixed(2) || '', // Price before tax
            tax_amount: ((deal.amount / 1.18) * 0.18)?.toFixed(2) || '', // Tax amount
            total_with_tax: deal.amount?.toFixed(2) || '', // Deal amount already includes tax
            // Set default date to today if not already set
            date: prev.date || new Date().toISOString().split('T')[0],
        }));
    };
    return (
        <div className="container mx-auto p-6 pb-24">
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
                        <Link href="/bills" className="text-primary hover:underline">
                            {t('bills')}
                        </Link>
                    </li>
                    <li className="before:content-['/'] ltr:before:mr-2 rtl:before:ml-2">
                        <span>{t('add_new_bill')}</span>
                    </li>
                </ul>
            </div>

            <div className="mb-6">
                <h1 className="text-2xl font-bold">{t('add_new_bill')}</h1>
                <p className="text-gray-500">{t('create_bill_description')}</p>
            </div>

            {alert && (
                <div className="fixed top-4 right-4 z-50 min-w-80 max-w-md">
                    <Alert type={alert.type} title={alert.type === 'success' ? t('success') : t('error')} message={alert.message} onClose={() => setAlert(null)} />
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Deal Selection */}
                <div className="panel bg-gradient-to-r from-primary/10 to-secondary/10 border-2 border-primary/20">
                    <div className="mb-5 flex items-center gap-3">
                        <IconMenuWidgets className="w-5 h-5 text-primary" />
                        <h5 className="text-xl font-bold text-primary dark:text-white-light">{t('select_deal')}</h5>
                    </div>
                    <div className="space-y-4">
                        <DealSelect
                            deals={deals}
                            selectedDeal={selectedDeal}
                            onChange={(deal) => {
                                setSelectedDeal(deal);
                                if (deal) {
                                    populateFormFromDeal(deal);
                                }
                            }}
                            className="w-full"
                        />
                        {selectedDeal && (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 bg-white dark:bg-gray-800 rounded-lg border">
                                <div>
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('deal_title')}</label>
                                    <p className="text-sm text-gray-900 dark:text-white">{selectedDeal.title}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('customer_name')}</label>
                                    <p className="text-sm text-gray-900 dark:text-white">
                                        {(() => {
                                            if (selectedDeal.deal_type === 'intermediary') {
                                                const seller = selectedDeal.seller?.name;
                                                const buyer = selectedDeal.buyer?.name;
                                                if (seller && buyer) {
                                                    return `${seller} → ${buyer}`;
                                                } else if (seller) {
                                                    return `${t('seller')}: ${seller}`;
                                                } else if (buyer) {
                                                    return `${t('buyer')}: ${buyer}`;
                                                } else {
                                                    return t('no_customer');
                                                }
                                            } else {
                                                return selectedDeal.customer?.name || t('no_customer');
                                            }
                                        })()}
                                    </p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('deal_type')}</label>
                                    <p className="text-sm text-gray-900 dark:text-white">{t(`deal_type_${selectedDeal.deal_type}`)}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('amount')}</label>
                                    <p className="text-sm text-gray-900 dark:text-white">{'$' + selectedDeal.amount}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('car')}</label>
                                    <p className="text-sm text-gray-900 dark:text-white">{selectedDeal.car ? `${selectedDeal.car.brand} ${selectedDeal.car.title}` : t('no_car')}</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                {/* Bill Type Selection */}
                {selectedDeal && (
                    <div className="panel">
                        <div className="mb-5 flex items-center gap-3">
                            <IconDollarSign className="w-5 h-5 text-primary" />
                            <h5 className="text-lg font-semibold dark:text-white-light">{t('bill_type')}</h5>
                        </div>
                        <div className="space-y-4">
                            <BillTypeSelect
                                defaultValue={billForm.bill_type}
                                dealType={selectedDeal?.deal_type}
                                onChange={(billType) => handleFormChange({ target: { name: 'bill_type', value: billType } } as any)}
                                className="w-full"
                            />
                        </div>
                    </div>
                )}

                {/* Bill Direction Selector */}
                {billForm.bill_type && (
                    <div className="panel">
                        <div className="mb-5 flex items-center gap-3">
                            <IconDollarSign className="w-5 h-5 text-primary" />
                            <div>
                                <h5 className="text-lg font-semibold dark:text-white-light">{t('bill_direction')}</h5>
                                <p className="text-gray-600 dark:text-gray-400 mt-1">{t('select_bill_direction_desc')}</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div
                                className={`p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 ${
                                    billForm.bill_direction === 'positive'
                                        ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                                        : 'border-gray-200 dark:border-gray-700 hover:border-green-300 dark:hover:border-green-600'
                                }`}
                                onClick={() => handleFormChange({ target: { name: 'bill_direction', value: 'positive' } } as any)}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-4 h-4 rounded-full border-2 ${billForm.bill_direction === 'positive' ? 'border-green-500 bg-green-500' : 'border-gray-300'}`}>
                                        {billForm.bill_direction === 'positive' && <div className="w-2 h-2 bg-white rounded-full mx-auto mt-0.5"></div>}
                                    </div>
                                    <div>
                                        <h6 className="font-semibold text-green-700 dark:text-green-300">+ {t('positive_bill')}</h6>
                                        <p className="text-sm text-green-600 dark:text-green-400">{t('positive_bill_desc')}</p>
                                    </div>
                                </div>
                            </div>
                            <div
                                className={`p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 ${
                                    billForm.bill_direction === 'negative'
                                        ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                                        : 'border-gray-200 dark:border-gray-700 hover:border-red-300 dark:hover:border-red-600'
                                }`}
                                onClick={() => handleFormChange({ target: { name: 'bill_direction', value: 'negative' } } as any)}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-4 h-4 rounded-full border-2 ${billForm.bill_direction === 'negative' ? 'border-red-500 bg-red-500' : 'border-gray-300'}`}>
                                        {billForm.bill_direction === 'negative' && <div className="w-2 h-2 bg-white rounded-full mx-auto mt-0.5"></div>}
                                    </div>
                                    <div>
                                        <h6 className="font-semibold text-red-700 dark:text-red-300">- {t('negative_bill')}</h6>
                                        <p className="text-sm text-red-600 dark:text-red-400">{t('negative_bill_desc')}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                {/* Bill Date Selector */}
                {(selectedDeal || billForm.bill_type === 'general') && (
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
                                value={billDate}
                                onChange={(e) => setBillDate(e.target.value)}
                                className="form-input bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-600 rounded-lg px-4 py-3 text-lg focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-3 [&::-webkit-calendar-picker-indicator]:w-5 [&::-webkit-calendar-picker-indicator]:h-5 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                                style={{ colorScheme: 'light' }}
                            />
                            <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                                <IconCalendar className="w-5 h-5 text-gray-400" />
                            </div>
                        </div>
                    </div>
                )}
                {/* General Bill Section */}
                {billForm.bill_type === 'general' && (
                    <div className="panel">
                        <div className="mb-5 flex items-center gap-3">
                            <IconDollarSign className="w-5 h-5 text-primary" />
                            <h5 className="text-lg font-semibold dark:text-white-light">{t('general_bill_details')}</h5>
                        </div>
                        <div className="space-y-4">
                            {/* Bill Description */}
                            <div>
                                <label htmlFor="bill_description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    {t('bill_description')} <span className="text-red-500">*</span>
                                </label>
                                <textarea
                                    id="bill_description"
                                    name="bill_description"
                                    rows={4}
                                    value={billForm.bill_description}
                                    onChange={handleFormChange}
                                    className="form-textarea"
                                    placeholder={t('enter_bill_description')}
                                    required
                                />
                            </div>
                            {/* Bill Amount */}
                            <div>
                                <label htmlFor="bill_amount" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    {t('bill_amount')} <span className="text-red-500">*</span>
                                </label>
                                <div className="flex">
                                    <span className="inline-flex items-center px-3 bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 border border-r-0 border-gray-300 dark:border-gray-600 ltr:rounded-l-md rtl:rounded-r-md">
                                        ₪
                                    </span>
                                    <input
                                        type="number"
                                        id="bill_amount"
                                        name="bill_amount"
                                        step="0.01"
                                        min="0"
                                        value={billForm.bill_amount}
                                        onChange={handleFormChange}
                                        className="form-input ltr:rounded-l-none rtl:rounded-r-none"
                                        placeholder={t('enter_bill_amount')}
                                        required
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                {/* Tax Invoice Section */}
                {(billForm.bill_type === 'tax_invoice' || billForm.bill_type === 'tax_invoice_receipt') && selectedDeal && (
                    <>
                        {/* Customer Information Display */}
                        <div className="panel">
                            <div className="mb-5 flex items-center gap-3">
                                <IconUser className="w-5 h-5 text-primary" />
                                <h5 className="text-lg font-semibold dark:text-white-light">{t('customer_information')}</h5>
                            </div>
                            {(() => {
                                // Determine which customer info to show based on deal type
                                let customerToShow = null;
                                let customerTitle = t('customer_details');

                                if (selectedDeal.deal_type === 'intermediary') {
                                    // For intermediary deals, show seller info first, then buyer as fallback
                                    customerToShow = selectedDeal.seller || selectedDeal.buyer;
                                    if (selectedDeal.seller) {
                                        customerTitle = t('seller_details');
                                    } else if (selectedDeal.buyer) {
                                        customerTitle = t('buyer_details');
                                    }
                                } else {
                                    // For regular deals, show customer info
                                    customerToShow = selectedDeal.customer;
                                }

                                return customerToShow ? (
                                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                                        <h6 className="font-semibold text-blue-800 dark:text-blue-200 mb-3">{customerTitle}</h6>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                                            <div>
                                                <span className="text-blue-600 dark:text-blue-300 font-medium">{t('customer_name')}:</span>
                                                <p className="text-blue-800 dark:text-blue-100">{customerToShow.name}</p>
                                            </div>
                                            <div>
                                                <span className="text-blue-600 dark:text-blue-300 font-medium">{t('phone')}:</span>
                                                <p className="text-blue-800 dark:text-blue-100">{customerToShow.phone}</p>
                                            </div>
                                            {customerToShow.email && (
                                                <div>
                                                    <span className="text-blue-600 dark:text-blue-300 font-medium">{t('email')}:</span>
                                                    <p className="text-blue-800 dark:text-blue-100">{customerToShow.email}</p>
                                                </div>
                                            )}
                                            {customerToShow.age && (
                                                <div>
                                                    <span className="text-blue-600 dark:text-blue-300 font-medium">{t('age')}:</span>
                                                    <p className="text-blue-800 dark:text-blue-100">
                                                        {customerToShow.age} {t('years_old')}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ) : null;
                            })()}
                        </div>

                        {/* Tax Invoice Details Table */}
                        <div className="panel">
                            <div className="mb-5 flex items-center gap-3">
                                <IconDollarSign className="w-5 h-5 text-primary" />
                                <h5 className="text-lg font-semibold dark:text-white-light">تفاصيل الفاتورة الضريبية</h5>
                            </div>
                            {selectedDeal.car && (
                                <div className="bg-transparent rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                                    {/* Table Header */}
                                    <div className="grid grid-cols-4 gap-4 mb-4 pb-2 border-b border-gray-300 dark:border-gray-600">
                                        <div className="text-sm font-bold text-gray-700 dark:text-white text-right">{t('deal_item')}</div>
                                        <div className="text-sm font-bold text-gray-700 dark:text-white text-center">{t('deal_price')}</div>
                                        <div className="text-sm font-bold text-gray-700 dark:text-white text-center">{t('deal_quantity')}</div>
                                        <div className="text-sm font-bold text-gray-700 dark:text-white text-center">{t('deal_total')}</div>
                                    </div>

                                    {/* Render table based on deal type */}
                                    {(selectedDeal.deal_type === 'new_used_sale' ||
                                        selectedDeal.deal_type === 'new_sale' ||
                                        selectedDeal.deal_type === 'used_sale' ||
                                        selectedDeal.deal_type === 'new_used_sale_tax_inclusive') && (
                                        <>
                                            {/* Row 1: Car for Sale */}
                                            <div className="grid grid-cols-4 gap-4 mb-3 py-2">
                                                <div className="text-sm text-gray-700 dark:text-gray-300 text-right">
                                                    <div className="font-medium">{t('car_for_sale')}</div>
                                                    <div className="text-xs text-gray-500">
                                                        {selectedDeal.car.brand} {selectedDeal.car.title} - {selectedDeal.car.year}
                                                        {selectedDeal.car.car_number && ` - ${selectedDeal.car.car_number}`} - #{selectedDeal.car.id}
                                                    </div>
                                                </div>
                                                <div className="text-center">-</div>
                                                <div className="text-center">-</div>
                                                <div className="text-center">-</div>
                                            </div>

                                            {/* Row 2: Buy Price */}
                                            <div className="grid grid-cols-4 gap-4 mb-3 py-2">
                                                <div className="text-sm text-gray-700 dark:text-gray-300 text-right">{t('buy_price')}</div>
                                                <div className="text-center">
                                                    <span className="text-sm text-gray-700 dark:text-gray-300">₪{selectedDeal.car.buy_price.toFixed(2)}</span>
                                                </div>
                                                <div className="text-center">
                                                    <span className="text-sm text-gray-700 dark:text-gray-300">1</span>
                                                </div>
                                                <div className="text-center">
                                                    <span className="text-sm text-gray-700 dark:text-gray-300">₪{selectedDeal.car.buy_price.toFixed(2)}</span>
                                                </div>
                                            </div>

                                            {/* Row 3: Selling Price */}
                                            <div className="grid grid-cols-4 gap-4 mb-3 py-2">
                                                <div className="text-sm text-gray-700 dark:text-gray-300 text-right">{t('selling_price')}</div>
                                                <div className="text-center">
                                                    <span className="text-sm text-gray-700 dark:text-gray-300">₪{selectedDeal?.selling_price?.toFixed(2)}</span>
                                                </div>
                                                <div className="text-center">
                                                    <span className="text-sm text-gray-700 dark:text-gray-300">1</span>
                                                </div>
                                                <div className="text-center">
                                                    <span className="text-sm text-gray-700 dark:text-gray-300">₪{selectedDeal?.selling_price?.toFixed(2)}</span>
                                                </div>
                                            </div>

                                            {/* Row 4: Loss */}
                                            <div className="grid grid-cols-4 gap-4 mb-3 py-2">
                                                <div className="text-sm text-gray-700 dark:text-gray-300 text-right">{t('loss_amount')}</div>
                                                <div className="text-center">-</div>
                                                <div className="text-center">-</div>
                                                <div className="text-center">
                                                    <span className="text-sm text-red-600 dark:text-red-400">₪{selectedDeal?.loss_amount?.toFixed(2)}</span>
                                                </div>
                                            </div>

                                            {/* Row 5: Profit Commission */}
                                            <div className="grid grid-cols-4 gap-4 mb-4 py-2">
                                                <div className="text-sm text-gray-700 dark:text-gray-300 text-right">{t('profit_commission')}</div>
                                                <div className="text-center">-</div>
                                                <div className="text-center">-</div>
                                                <div className="text-center">
                                                    <span className="text-sm text-green-600 dark:text-green-400">₪{selectedDeal?.amount?.toFixed(2)}</span>
                                                </div>
                                            </div>
                                        </>
                                    )}

                                    {selectedDeal.deal_type === 'intermediary' && (
                                        <>
                                            {/* Row 1: Car Brokerage Commission */}
                                            <div className="grid grid-cols-4 gap-4 mb-3 py-2">
                                                <div className="text-sm text-gray-700 dark:text-gray-300 text-right">
                                                    <div className="font-medium">{t('intermediary_car_commission')}</div>
                                                    <div className="text-xs text-gray-500">
                                                        {selectedDeal.car.brand} {selectedDeal.car.title} - {selectedDeal.car.year}
                                                        {selectedDeal.car.car_number && ` - ${selectedDeal.car.car_number}`} - #{selectedDeal.car.id}
                                                    </div>
                                                </div>
                                                <div className="text-center">-</div>
                                                <div className="text-center">-</div>
                                                <div className="text-center">-</div>
                                            </div>

                                            {/* Row 2: Profit Commission */}
                                            <div className="grid grid-cols-4 gap-4 mb-4 py-2">
                                                <div className="text-sm text-gray-700 dark:text-gray-300 text-right">{t('profit_commission')}</div>
                                                <div className="text-center">
                                                    <span className="text-sm text-gray-700 dark:text-gray-300">₪{selectedDeal.amount.toFixed(2)}</span>
                                                </div>
                                                <div className="text-center">
                                                    <span className="text-sm text-gray-700 dark:text-gray-300">1</span>
                                                </div>
                                                <div className="text-center">
                                                    <span className="text-sm text-green-600 dark:text-green-400">₪{selectedDeal.amount.toFixed(2)}</span>
                                                </div>
                                            </div>
                                        </>
                                    )}

                                    {selectedDeal.deal_type === 'financing_assistance_intermediary' && (
                                        <>
                                            {/* Row 1: Financing Assistance Commission */}
                                            <div className="grid grid-cols-4 gap-4 mb-3 py-2">
                                                <div className="text-sm text-gray-700 dark:text-gray-300 text-right">
                                                    <div className="font-medium">{t('financing_assistance_commission')}</div>
                                                    <div className="text-xs text-gray-500">
                                                        {selectedDeal.car.brand} {selectedDeal.car.title} - {selectedDeal.car.year}
                                                        {selectedDeal.car.car_number && ` - ${selectedDeal.car.car_number}`} - #{selectedDeal.car.id}
                                                    </div>
                                                </div>
                                                <div className="text-center">-</div>
                                                <div className="text-center">-</div>
                                                <div className="text-center">-</div>
                                            </div>

                                            {/* Row 2: Commission */}
                                            <div className="grid grid-cols-4 gap-4 mb-4 py-2">
                                                <div className="text-sm text-gray-700 dark:text-gray-300 text-right">{t('commission_editable')}</div>
                                                <div className="text-center">
                                                    <span className="text-sm text-gray-700 dark:text-gray-300">₪{selectedDeal.amount.toFixed(2)}</span>
                                                </div>
                                                <div className="text-center">
                                                    <span className="text-sm text-gray-700 dark:text-gray-300">1</span>
                                                </div>
                                                <div className="text-center">
                                                    <span className="text-sm text-green-600 dark:text-green-400">₪{selectedDeal.amount.toFixed(2)}</span>
                                                </div>
                                            </div>
                                        </>
                                    )}

                                    {selectedDeal.deal_type === 'exchange' && (
                                        <>
                                            {/* Row 1: Car for Sale */}
                                            <div className="grid grid-cols-4 gap-4 mb-3 py-2">
                                                <div className="text-sm text-gray-700 dark:text-gray-300 text-right">
                                                    <div className="font-medium">{t('car_for_sale')}</div>
                                                    <div className="text-xs text-gray-500">
                                                        {selectedDeal.car.brand} {selectedDeal.car.title} - {selectedDeal.car.year}
                                                        {selectedDeal.car.car_number && ` - ${selectedDeal.car.car_number}`} - #{selectedDeal.car.id}
                                                    </div>
                                                </div>
                                                <div className="text-center">-</div>
                                                <div className="text-center">-</div>
                                                <div className="text-center">-</div>
                                            </div>

                                            {/* Row 2: Buy Price */}
                                            <div className="grid grid-cols-4 gap-4 mb-3 py-2">
                                                <div className="text-sm text-gray-700 dark:text-gray-300 text-right">{t('buy_price_auto')}</div>
                                                <div className="text-center">
                                                    <span className="text-sm text-gray-700 dark:text-gray-300">${selectedDeal.car.buy_price.toFixed(2)}</span>
                                                </div>
                                                <div className="text-center">
                                                    <span className="text-sm text-gray-700 dark:text-gray-300">1</span>
                                                </div>
                                                <div className="text-center">
                                                    <span className="text-sm text-gray-700 dark:text-gray-300">${selectedDeal.car.buy_price.toFixed(2)}</span>
                                                </div>
                                            </div>

                                            {/* Row 3: Selling Price */}
                                            <div className="grid grid-cols-4 gap-4 mb-3 py-2">
                                                <div className="text-sm text-gray-700 dark:text-gray-300 text-right">{t('selling_price_manual')}</div>
                                                <div className="text-center">
                                                    <span className="text-sm text-gray-700 dark:text-gray-300">₪{selectedDeal.car.sale_price.toFixed(2)}</span>
                                                </div>
                                                <div className="text-center">
                                                    <span className="text-sm text-gray-700 dark:text-gray-300">1</span>
                                                </div>
                                                <div className="text-center">
                                                    <span className="text-sm text-gray-700 dark:text-gray-300">₪{selectedDeal.car.sale_price.toFixed(2)}</span>
                                                </div>
                                            </div>

                                            {/* Row 4: Customer Car Evaluation */}
                                            <div className="grid grid-cols-4 gap-4 mb-3 py-2">
                                                <div className="text-sm text-gray-700 dark:text-gray-300 text-right">
                                                    <div className="font-medium">{t('customer_car_evaluation')}</div>
                                                </div>
                                                <div className="text-center">
                                                    <span className="text-sm text-gray-700 dark:text-gray-300">₪{selectedDeal.amount.toFixed(2)}</span>
                                                </div>
                                                <div className="text-center">
                                                    <span className="text-sm text-gray-700 dark:text-gray-300">1</span>
                                                </div>
                                                <div className="text-center">
                                                    <span className="text-sm text-gray-700 dark:text-gray-300">₪{selectedDeal.amount.toFixed(2)}</span>
                                                </div>
                                            </div>

                                            {/* Row 5: Additional Customer Amount */}
                                            <div className="grid grid-cols-4 gap-4 mb-4 py-2">
                                                <div className="text-sm text-gray-700 dark:text-gray-300 text-right">{t('additional_customer_amount')}</div>
                                                <div className="text-center">-</div>
                                                <div className="text-center">-</div>
                                                <div className="text-center">
                                                    <span className="text-sm text-blue-600 dark:text-blue-400">₪{Math.max(0, selectedDeal.car.sale_price - selectedDeal.amount).toFixed(2)}</span>
                                                </div>
                                            </div>
                                        </>
                                    )}

                                    {selectedDeal.deal_type === 'company_commission' && (
                                        <>
                                            {/* Row 1: Company Commission */}
                                            <div className="grid grid-cols-4 gap-4 mb-4 py-2">
                                                <div className="text-sm text-gray-700 dark:text-gray-300 text-right">
                                                    <div className="font-medium">{t('company_commission')}</div>
                                                </div>
                                                <div className="text-center">
                                                    <span className="text-sm text-gray-700 dark:text-gray-300">₪{selectedDeal.amount.toFixed(2)}</span>
                                                </div>
                                                <div className="text-center">
                                                    <span className="text-sm text-gray-700 dark:text-gray-300">1</span>
                                                </div>
                                                <div className="text-center">
                                                    <span className="text-sm text-green-600 dark:text-green-400">₪{selectedDeal.amount.toFixed(2)}</span>
                                                </div>
                                            </div>
                                        </>
                                    )}

                                    {/* Separator */}
                                    <div className="border-t border-gray-300 dark:border-gray-600 my-4"></div>

                                    {/* Tax Calculations */}
                                    <div className="space-y-3">
                                        {/* Price Before Tax - calculated by removing 18% tax from deal amount */}
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('price_before_tax')}</span>
                                            <span className="text-sm text-gray-700 dark:text-gray-300">₪{(selectedDeal.amount / 1.18).toFixed(2)}</span>
                                        </div>

                                        {/* Tax - calculated as 18% of the price before tax */}
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('deal_tax')} 18%</span>
                                            <span className="text-sm text-gray-700 dark:text-gray-300">₪{((selectedDeal.amount / 1.18) * 0.18).toFixed(2)}</span>{' '}
                                        </div>

                                        {/* Total Including Tax - this is the deal amount which already includes tax */}
                                        <div className="flex justify-between items-center pt-2 border-t border-gray-300 dark:border-gray-600">
                                            <span className="text-lg font-bold text-gray-700 dark:text-gray-300">{t('total_including_tax')}</span>
                                            <span className="text-lg font-bold text-primary">₪{selectedDeal.amount.toFixed(2)}</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                        {/* Notes Section */}
                        <div className="mt-6">
                            <label htmlFor="free_text" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                {t('notes')}
                            </label>
                            <textarea
                                id="free_text"
                                name="free_text"
                                rows={3}
                                value={billForm.free_text || ''}
                                onChange={handleFormChange}
                                className="form-textarea"
                                placeholder={t('enter_bill_notes')}
                            />
                        </div>
                    </>
                )}
                {/* Receipt Section */}
                {(billForm.bill_type === 'receipt_only' || billForm.bill_type === 'tax_invoice_receipt') && (
                    <div className="panel">
                        <div className="mb-5 flex items-center gap-3">
                            <IconDollarSign className="w-5 h-5 text-primary" />
                            <h5 className="text-lg font-semibold dark:text-white-light">{t('receipt_details')}</h5>
                        </div>

                        <MultiplePaymentForm payments={payments} onPaymentsChange={setPayments} totalAmount={parseFloat(billForm.total_with_tax) || 0} />
                    </div>
                )}
                {/* Submit Button */}
                {selectedDeal && billForm.bill_type && (
                    <div className="flex justify-end gap-4">
                        <button type="button" onClick={() => router.back()} className="btn btn-outline-danger">
                            {t('cancel')}
                        </button>
                        <button type="submit" className="btn btn-primary px-8" disabled={saving}>
                            {saving ? t('creating') : t('create_bill')}
                        </button>
                    </div>
                )}
            </form>
        </div>
    );
};

export default AddBill;
