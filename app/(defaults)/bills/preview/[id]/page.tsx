'use client';
import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import supabase from '@/lib/supabase';
import { getTranslation } from '@/i18n';
import IconDollarSign from '@/components/icon/icon-dollar-sign';
import IconUser from '@/components/icon/icon-user';
import IconDownload from '@/components/icon/icon-download';
import { generateBillPDF, BillData } from '@/utils/pdf-generator';
import { BillWithPayments } from '@/types/payment';

// Helper function to convert Bill to BillData format
const convertBillToBillData = (bill: Bill): BillData => {
    return {
        id: bill.id,
        bill_type: bill.bill_type,
        customer_name: bill.customer_name,
        customer_phone: bill.phone,
        created_at: bill.date,

        // Map the bill fields to BillData format
        bill_amount: bill.total,
        bill_description: bill.car_details || '',

        // Tax invoice fields
        total: bill.total,
        tax_amount: bill.tax_amount,
        total_with_tax: bill.total_with_tax,
        commission: bill.commission,
        car_details: bill.car_details,

        // Payment fields
        payment_type: bill.payment_type,
        visa_amount: bill.visa_amount,
        bank_amount: bill.bank_amount || bill.transfer_amount,
        check_amount: bill.check_amount,

        // Deal information (if available)
        deal: bill.deal
            ? {
                  id: bill.deal_id,
                  deal_title: bill.deal?.title,
                  deal_type: bill.deal?.deal_type,
                  loss_amount: bill.deal?.loss_amount,
                  car: bill.deal?.car
                      ? {
                            buy_price: bill.deal.car.buy_price,
                            sale_price: bill.deal.car.sale_price,
                            make: bill.deal.car.brand,
                            model: bill.deal.car.title,
                            year: bill.deal.car.year,
                            license_plate: bill.deal.car.car_number,
                        }
                      : undefined,
                  customer: bill.deal?.customer
                      ? {
                            name: bill.deal.customer.name,
                            id_number: bill.deal.customer.id_number,
                        }
                      : undefined,
              }
            : undefined,
    };
};

interface Bill extends BillWithPayments {
    // Legacy payment fields for backward compatibility
    payment_type?: string;
    visa_amount?: number;
    visa_installments?: number;
    visa_card_type?: string;
    visa_last_four?: string;
    bank_amount?: number;
    bank_name?: string;
    bank_branch?: string;
    account_number?: string;
    transfer_number?: string;
    transfer_holder_name?: string;
    transfer_amount?: number;
    transfer_bank_name?: string;
    transfer_branch?: string;
    transfer_account_number?: string;
    transfer_branch_number?: string;
    check_amount?: number;
    check_bank_name?: string;
    check_branch_number?: string;
    check_account_number?: string;
    check_number?: string;
    check_holder_name?: string;
    check_branch?: string;
    created_at: string;
}

const BillPreview = () => {
    const { t } = getTranslation();
    const router = useRouter();
    const params = useParams();
    const billId = params?.id as string;
    const [loading, setLoading] = useState(true);
    const [bill, setBill] = useState<Bill | null>(null);
    const [downloadingPDF, setDownloadingPDF] = useState(false);

    useEffect(() => {
        fetchBill();
    }, [billId]);

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
            console.log('Fetched bill:', data);
        } catch (error) {
            console.error('Error fetching bill:', error);
        } finally {
            setLoading(false);
        }
    };

    const getBillTypeLabel = (type: string) => {
        switch (type) {
            case 'tax_invoice':
                return t('tax_invoice_only');
            case 'receipt_only':
                return t('receipt_only');
            case 'tax_invoice_receipt':
                return t('tax_invoice_and_receipt');
            default:
                return type;
        }
    };

    const handleDownloadPDF = async () => {
        if (!bill) return;

        setDownloadingPDF(true);
        try {
            await generateBillPDF(convertBillToBillData(bill), {
                filename: `bill-${bill.id}-${bill.customer_name.replace(/\s+/g, '-').toLowerCase()}.pdf`,
            });
        } catch (error) {
            console.error('Error generating PDF:', error);
            // You might want to show an error notification here
        } finally {
            setDownloadingPDF(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (!bill) {
        return (
            <div className="container mx-auto p-6">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-red-600">{t('bill_not_found')}</h1>
                    <Link href="/bills" className="btn btn-primary mt-4">
                        {t('back_to_bills')}
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-6">
            {/* Header - Hide when printing */}
            <div className="print:hidden mb-6">
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
                            <span>{t('bill_preview')}</span>
                        </li>
                    </ul>
                </div>

                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-2xl font-bold">{t('bill_preview')}</h1>
                        <p className="text-gray-500">{t('view_bill_details')}</p>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={handleDownloadPDF} disabled={downloadingPDF} className="btn btn-outline-primary gap-2">
                            <IconDownload className="w-4 h-4" />
                            {downloadingPDF ? t('generating_pdf') : t('download_pdf')}
                        </button>
                    </div>
                </div>
            </div>

            {/* Bill Content */}
            <div className="space-y-6">
                {/* Bill Header */}
                <div className="panel">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <h2 className="text-xl font-bold text-primary mb-4">{t('bill_information')}</h2>
                            <div className="space-y-3">
                                <div className="flex justify-between">
                                    <span className="text-gray-600 dark:text-gray-400">{t('bill_id')}:</span>
                                    <span className="font-medium">#{bill.id}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600 dark:text-gray-400">{t('bill_type')}:</span>
                                    <span className="badge badge-outline-info">{getBillTypeLabel(bill.bill_type)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600 dark:text-gray-400">{t('created_at')}:</span>
                                    <span className="font-medium">
                                        {new Date(bill.created_at).toLocaleDateString('en-GB', {
                                            year: 'numeric',
                                            month: '2-digit',
                                            day: '2-digit',
                                        })}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-primary mb-4">{t('associated_deal')}</h2>
                            <div className="space-y-3">
                                <div className="flex justify-between">
                                    <span className="text-gray-600 dark:text-gray-400">{t('deal_title')}:</span>
                                    <span className="font-medium">{bill.deal?.title}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600 dark:text-gray-400">{t('deal_type')}:</span>
                                    <span className="font-medium">{t(`deal_type_${bill.deal?.deal_type}`)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600 dark:text-gray-400">{t('customer')}:</span>
                                    <span className="font-medium">{bill.deal?.customer?.name}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600 dark:text-gray-400">{t('car')}:</span>
                                    <span className="font-medium">
                                        {bill.deal?.car?.brand} {bill.deal?.car?.title}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Deal Summary Table (تفاصيل الفاتورة الضريبية) */}
                {bill.bill_type !== 'receipt_only' && bill.deal && bill.deal.car && (
                    <div className="panel">
                        <div className="mb-5 flex items-center gap-3">
                            <IconDollarSign className="w-5 h-5 text-primary" />
                            <h5 className="text-lg font-semibold dark:text-white-light">{t('tax_invoice_details')}</h5>
                        </div>
                        <div className="bg-transparent rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                            {/* Table Header */}
                            <div className="grid grid-cols-4 gap-4 mb-4 pb-2 border-b border-gray-300 dark:border-gray-600">
                                <div className="text-sm font-bold text-gray-700 dark:text-white text-right">{t('deal_item')}</div>
                                <div className="text-sm font-bold text-gray-700 dark:text-white text-center">{t('deal_price')}</div>
                                <div className="text-sm font-bold text-gray-700 dark:text-white text-center">{t('deal_quantity')}</div>
                                <div className="text-sm font-bold text-gray-700 dark:text-white text-center">{t('deal_total')}</div>
                            </div>

                            {/* Render table based on deal type */}
                            {(bill.deal.deal_type === 'new_used_sale' ||
                                bill.deal.deal_type === 'new_sale' ||
                                bill.deal.deal_type === 'used_sale' ||
                                bill.deal.deal_type === 'new_used_sale_tax_inclusive') && (
                                <>
                                    {/* Row 1: Car for Sale */}
                                    <div className="grid grid-cols-4 gap-4 mb-3 py-2">
                                        <div className="text-sm text-gray-700 dark:text-gray-300 text-right">
                                            <div className="font-medium">{t('car_for_sale')}</div>
                                            <div className="text-xs text-gray-500">
                                                {bill.deal.car.brand} {bill.deal.car.title} - {bill.deal.car.year}
                                                {bill.deal.car.car_number && ` - ${bill.deal.car.car_number}`} - #{bill.deal.car.id}
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
                                            <span className="text-sm text-gray-700 dark:text-gray-300">₪{bill.deal.car.buy_price?.toFixed(0) || '0.00'}</span>
                                        </div>
                                        <div className="text-center">
                                            <span className="text-sm text-gray-700 dark:text-gray-300">1</span>
                                        </div>
                                        <div className="text-center">
                                            <span className="text-sm text-gray-700 dark:text-gray-300">₪{bill.deal.car.buy_price?.toFixed(0) || '0.00'}</span>
                                        </div>
                                    </div>

                                    {/* Row 3: Selling Price */}
                                    <div className="grid grid-cols-4 gap-4 mb-3 py-2">
                                        <div className="text-sm text-gray-700 dark:text-gray-300 text-right">{t('selling_price')}</div>
                                        <div className="text-center">
                                            <span className="text-sm text-gray-700 dark:text-gray-300">₪{bill.deal.car.sale_price?.toFixed(0) || '0.00'}</span>
                                        </div>
                                        <div className="text-center">
                                            <span className="text-sm text-gray-700 dark:text-gray-300">1</span>
                                        </div>
                                        <div className="text-center">
                                            <span className="text-sm text-gray-700 dark:text-gray-300">₪{bill.deal.car.sale_price?.toFixed(0) || '0.00'}</span>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-4 gap-4 mb-4 py-2 ">
                                        <div className="text-sm font-bold text-gray-700 dark:text-white text-right">{t('profit_loss')}</div>

                                        <span className={`text-sm font-bold text-center ${(bill.deal.car.sale_price || 0) - (bill.deal.car.buy_price || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            ₪{((bill.deal.car.sale_price || 0) - (bill.deal.car.buy_price || 0)).toFixed(0)}
                                        </span>
                                        <div className="text-center">-</div>
                                        <span className={`text-sm font-bold text-center ${(bill.deal.car.sale_price || 0) - (bill.deal.car.buy_price || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            ₪{((bill.deal.car.sale_price || 0) - (bill.deal.car.buy_price || 0)).toFixed(0)}
                                        </span>
                                    </div>
                                </>
                            )}

                            {bill.deal.deal_type === 'intermediary' && (
                                <>
                                    {/* Row 1: Car Brokerage Commission */}
                                    <div className="grid grid-cols-4 gap-4 mb-3 py-2">
                                        <div className="text-sm text-gray-700 dark:text-gray-300 text-right">
                                            <div className="font-medium">{t('intermediary_car_commission')}</div>
                                            <div className="text-xs text-gray-500">
                                                {bill.deal.car.brand} {bill.deal.car.title} - {bill.deal.car.year}
                                                {bill.deal.car.car_number && ` - ${bill.deal.car.car_number}`} - #{bill.deal.car.id}
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
                                            <span className="text-sm text-gray-700 dark:text-gray-300">₪{bill.deal.car.buy_price?.toFixed(0) || '0.00'}</span>
                                        </div>
                                        <div className="text-center">
                                            <span className="text-sm text-gray-700 dark:text-gray-300">1</span>
                                        </div>
                                        <div className="text-center">
                                            <span className="text-sm text-gray-700 dark:text-gray-300">₪{bill.deal.car.buy_price?.toFixed(0) || '0.00'}</span>
                                        </div>
                                    </div>

                                    {/* Row 3: Selling Price */}
                                    <div className="grid grid-cols-4 gap-4 mb-3 py-2">
                                        <div className="text-sm text-gray-700 dark:text-gray-300 text-right">{t('selling_price')}</div>
                                        <div className="text-center">
                                            <span className="text-sm text-gray-700 dark:text-gray-300">₪{bill.deal.car.sale_price?.toFixed(0) || '0.00'}</span>
                                        </div>
                                        <div className="text-center">
                                            <span className="text-sm text-gray-700 dark:text-gray-300">1</span>
                                        </div>
                                        <div className="text-center">
                                            <span className="text-sm text-gray-700 dark:text-gray-300">₪{bill.deal.car.sale_price?.toFixed(0) || '0.00'}</span>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-4 gap-4 mb-4 py-2 ">
                                        <div className="text-sm font-bold text-gray-700 dark:text-white text-right">{t('profit_loss')}</div>

                                        <span className={`text-sm font-bold text-center ${(bill.deal.car.sale_price || 0) - (bill.deal.car.buy_price || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            ₪{((bill.deal.car.sale_price || 0) - (bill.deal.car.buy_price || 0)).toFixed(0)}
                                        </span>
                                        <div className="text-center">-</div>
                                        <span className={`text-sm font-bold text-center ${(bill.deal.car.sale_price || 0) - (bill.deal.car.buy_price || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            ₪{((bill.deal.car.sale_price || 0) - (bill.deal.car.buy_price || 0)).toFixed(0)}
                                        </span>
                                    </div>
                                </>
                            )}

                            {bill.deal.deal_type === 'financing_assistance_intermediary' && (
                                <>
                                    {/* Row 1: Financing Assistance Commission */}
                                    <div className="grid grid-cols-4 gap-4 mb-3 py-2">
                                        <div className="text-sm text-gray-700 dark:text-gray-300 text-right">
                                            <div className="font-medium">{t('financing_assistance_commission')}</div>
                                            <div className="text-xs text-gray-500">
                                                {bill.deal.car.brand} {bill.deal.car.title} - {bill.deal.car.year}
                                                {bill.deal.car.car_number && ` - ${bill.deal.car.car_number}`} - #{bill.deal.car.id}
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
                                            <span className="text-sm text-gray-700 dark:text-gray-300">₪{bill.deal.amount?.toFixed(0) || '0.00'}</span>
                                        </div>
                                        <div className="text-center">
                                            <span className="text-sm text-gray-700 dark:text-gray-300">1</span>
                                        </div>
                                        <div className="text-center">
                                            <span className="text-sm text-green-600 dark:text-green-400">₪{bill.deal.amount?.toFixed(0) || '0.00'}</span>
                                        </div>
                                    </div>
                                </>
                            )}

                            {bill.deal.deal_type === 'exchange' && (
                                <>
                                    {/* Row 1: Car for Sale */}
                                    <div className="grid grid-cols-4 gap-4 mb-3 py-2">
                                        <div className="text-sm text-gray-700 dark:text-gray-300 text-right">
                                            <div className="font-medium">{t('car_for_sale')}</div>
                                            <div className="text-xs text-gray-500">
                                                {bill.deal.car.brand} {bill.deal.car.title} - {bill.deal.car.year}
                                                {bill.deal.car.car_number && ` - ${bill.deal.car.car_number}`} - #{bill.deal.car.id}
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
                                            <span className="text-sm text-gray-700 dark:text-gray-300">₪{bill.deal.car.buy_price?.toFixed(0) || '0.00'}</span>
                                        </div>
                                        <div className="text-center">
                                            <span className="text-sm text-gray-700 dark:text-gray-300">1</span>
                                        </div>
                                        <div className="text-center">
                                            <span className="text-sm text-gray-700 dark:text-gray-300">₪{bill.deal.car.buy_price?.toFixed(0) || '0.00'}</span>
                                        </div>
                                    </div>

                                    {/* Row 3: Selling Price */}
                                    <div className="grid grid-cols-4 gap-4 mb-3 py-2">
                                        <div className="text-sm text-gray-700 dark:text-gray-300 text-right">{t('selling_price_manual')}</div>
                                        <div className="text-center">
                                            <span className="text-sm text-gray-700 dark:text-gray-300">₪{bill.deal.car.sale_price?.toFixed(0) || '0.00'}</span>
                                        </div>
                                        <div className="text-center">
                                            <span className="text-sm text-gray-700 dark:text-gray-300">1</span>
                                        </div>
                                        <div className="text-center">
                                            <span className="text-sm text-gray-700 dark:text-gray-300">₪{bill.deal.car.sale_price?.toFixed(0) || '0.00'}</span>
                                        </div>
                                    </div>

                                    {/* Row 4: Customer Car Evaluation */}
                                    <div className="grid grid-cols-4 gap-4 mb-3 py-2">
                                        <div className="text-sm text-gray-700 dark:text-gray-300 text-right">
                                            <div className="font-medium">{t('customer_car_evaluation')}</div>
                                        </div>
                                        <div className="text-center">
                                            <span className="text-sm text-gray-700 dark:text-gray-300">₪{((bill.deal.customer_car_eval_value ?? 0) as number).toFixed(0)}</span>
                                        </div>
                                        <div className="text-center">
                                            <span className="text-sm text-gray-700 dark:text-gray-300">1</span>
                                        </div>
                                        <div className="text-center">
                                            <span className="text-sm text-gray-700 dark:text-gray-300">₪{((bill.deal.customer_car_eval_value ?? 0) as number).toFixed(0)}</span>
                                        </div>
                                    </div>

                                    {/* Row 5: Additional Customer Amount */}
                                    <div className="grid grid-cols-4 gap-4 mb-3 py-2">
                                        <div className="text-sm text-gray-700 dark:text-gray-300 text-right">{t('additional_amount_from_customer')}</div>
                                        <div className="text-center">-</div>
                                        <div className="text-center">-</div>
                                        <div className="text-center">
                                            <span className="text-sm text-blue-600 dark:text-blue-400">₪{Math.max(0, (bill.deal.car.sale_price || 0) - (bill.deal.amount || 0)).toFixed(0)}</span>
                                        </div>
                                    </div>

                                    {/* Row 6: Additional Company Amount */}
                                    <div className="grid grid-cols-4 gap-4 mb-4 py-2">
                                        <div className="text-sm text-gray-700 dark:text-gray-300 text-right">{t('additional_amount_from_company')}</div>
                                        <div className="text-center">-</div>
                                        <div className="text-center">-</div>
                                        <div className="text-center">
                                            <span className="text-sm text-orange-600 dark:text-orange-400">₪{Math.max(0, (bill.deal.amount || 0) - (bill.deal.car.sale_price || 0)).toFixed(0)}</span>
                                        </div>
                                    </div>
                                </>
                            )}

                            {bill.deal.deal_type === 'company_commission' && (
                                <>
                                    {/* Row 1: Company Commission */}
                                    <div className="grid grid-cols-4 gap-4 mb-4 py-2">
                                        <div className="text-sm text-gray-700 dark:text-gray-300 text-right">
                                            <div className="font-medium">{t('company_commission')}</div>
                                        </div>
                                        <div className="text-center">
                                            <span className="text-sm text-gray-700 dark:text-gray-300">₪{bill.deal.amount?.toFixed(0) || '0.00'}</span>
                                        </div>
                                        <div className="text-center">
                                            <span className="text-sm text-gray-700 dark:text-gray-300">1</span>
                                        </div>
                                        <div className="text-center">
                                            <span className="text-sm text-green-600 dark:text-green-400">₪{bill.deal.amount?.toFixed(0) || '0.00'}</span>
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* Separator */}
                            <div className="border-t border-gray-300 dark:border-gray-600 my-4"></div>

                            {/* Tax Calculations */}
                            {bill.deal.deal_type === 'new_used_sale_tax_inclusive' ? (
                                <div className="space-y-3">
                                    {/* Price Before Tax - calculated by removing 18% tax from deal amount */}
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('price_before_tax')}</span>
                                        <span className="text-sm text-gray-700 dark:text-gray-300">₪{((bill.deal.selling_price ?? 0) / 1.18).toFixed(0)}</span>
                                    </div>

                                    {/* Tax - calculated as 18% of the price before tax */}
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('deal_tax')} 18%</span>
                                        <span className="text-sm text-gray-700 dark:text-gray-300">₪{(((bill.deal.selling_price ?? 0) / 1.18) * 0.18).toFixed(0)}</span>{' '}
                                    </div>

                                    {/* Total Including Tax - this is the deal selling_price which already includes tax */}
                                    <div className="flex justify-between items-center pt-2 border-t border-gray-300 dark:border-gray-600">
                                        <span className="text-lg font-bold text-gray-700 dark:text-gray-300">{t('total_including_tax')}</span>
                                        <span className="text-lg font-bold text-primary">₪{(bill.deal.selling_price ?? 0).toFixed(0)}</span>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {/* Price Before Tax - calculated by removing 18% tax from deal amount */}
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('price_before_tax')}</span>
                                        <span className="text-sm text-gray-700 dark:text-gray-300">₪{(bill.deal.amount / 1.18).toFixed(0)}</span>
                                    </div>

                                    {/* Tax - calculated as 18% of the price before tax */}
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('deal_tax')} 18%</span>
                                        <span className="text-sm text-gray-700 dark:text-gray-300">₪{((bill.deal.amount / 1.18) * 0.18).toFixed(0)}</span>{' '}
                                    </div>

                                    {/* Total Including Tax - this is the deal amount which already includes tax */}
                                    <div className="flex justify-between items-center pt-2 border-t border-gray-300 dark:border-gray-600">
                                        <span className="text-lg font-bold text-gray-700 dark:text-gray-300">{t('total_including_tax')}</span>
                                        <span className="text-lg font-bold text-primary">₪{bill.deal.amount.toFixed(0)}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Receipt Details - Multiple Payments */}
                {(bill.bill_type === 'receipt_only' || bill.bill_type === 'tax_invoice_receipt') && (
                    <div className="panel">
                        <div className="mb-5 flex items-center gap-3">
                            <IconDollarSign className="w-5 h-5 text-primary" />
                            <h2 className="text-xl font-bold text-primary">{t('receipt_details')}</h2>
                        </div>

                        {/* Display multiple payments if they exist */}
                        {bill.payments && bill.payments.length > 0 ? (
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                                    {t('payments')} ({bill.payments.length})
                                </h3>
                                {bill.payments.map((payment, index) => (
                                    <div key={payment.id || index} className=" p-4 rounded-lg border">
                                        <div className="flex items-center justify-between mb-3">
                                            <h4 className="font-medium text-gray-900 dark:text-white">
                                                {t('payment')} #{index + 1} - {t(payment.payment_type)}
                                            </h4>
                                            <span className="font-bold text-lg text-primary">₪{new Intl.NumberFormat('he-IL').format(payment.amount || 0)}</span>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                            {payment.payment_type === 'visa' && (
                                                <>
                                                    {payment.visa_installments && (
                                                        <div>
                                                            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{t('visa_installments')}</label>
                                                            <p className="text-sm text-gray-900 dark:text-white">{payment.visa_installments}</p>
                                                        </div>
                                                    )}
                                                    {payment.visa_card_type && (
                                                        <div>
                                                            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{t('visa_card_type')}</label>
                                                            <p className="text-sm text-gray-900 dark:text-white">{payment.visa_card_type}</p>
                                                        </div>
                                                    )}
                                                    {payment.visa_last_four && (
                                                        <div>
                                                            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{t('visa_last_four')}</label>
                                                            <p className="text-sm text-gray-900 dark:text-white">{payment.visa_last_four}</p>
                                                        </div>
                                                    )}
                                                    {payment.approval_number && (
                                                        <div>
                                                            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{t('approval_number')}</label>
                                                            <p className="text-sm text-gray-900 dark:text-white">{payment.approval_number}</p>
                                                        </div>
                                                    )}
                                                </>
                                            )}

                                            {payment.payment_type === 'bank_transfer' && (
                                                <>
                                                    {payment.transfer_bank_name && (
                                                        <div>
                                                            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{t('bank_name')}</label>
                                                            <p className="text-sm text-gray-900 dark:text-white">{payment.transfer_bank_name}</p>
                                                        </div>
                                                    )}
                                                    {payment.transfer_branch && (
                                                        <div>
                                                            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{t('bank_branch')}</label>
                                                            <p className="text-sm text-gray-900 dark:text-white">{payment.transfer_branch}</p>
                                                        </div>
                                                    )}
                                                    {payment.transfer_branch_number && (
                                                        <div>
                                                            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{t('branch_number')}</label>
                                                            <p className="text-sm text-gray-900 dark:text-white">{payment.transfer_branch_number}</p>
                                                        </div>
                                                    )}
                                                    {payment.transfer_account_number && (
                                                        <div>
                                                            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{t('account_number')}</label>
                                                            <p className="text-sm text-gray-900 dark:text-white">{payment.transfer_account_number}</p>
                                                        </div>
                                                    )}
                                                    {payment.transfer_number && (
                                                        <div>
                                                            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{t('transfer_number')}</label>
                                                            <p className="text-sm text-gray-900 dark:text-white">{payment.transfer_number}</p>
                                                        </div>
                                                    )}
                                                    {payment.transfer_holder_name && (
                                                        <div>
                                                            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{t('transfer_holder_name')}</label>
                                                            <p className="text-sm text-gray-900 dark:text-white">{payment.transfer_holder_name}</p>
                                                        </div>
                                                    )}
                                                </>
                                            )}

                                            {payment.payment_type === 'check' && (
                                                <>
                                                    {payment.check_number && (
                                                        <div>
                                                            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{t('check_number')}</label>
                                                            <p className="text-sm text-gray-900 dark:text-white">{payment.check_number}</p>
                                                        </div>
                                                    )}
                                                    {payment.check_bank_name && (
                                                        <div>
                                                            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{t('check_bank_name')}</label>
                                                            <p className="text-sm text-gray-900 dark:text-white">{payment.check_bank_name}</p>
                                                        </div>
                                                    )}
                                                    {payment.check_holder_name && (
                                                        <div>
                                                            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{t('check_holder_name')}</label>
                                                            <p className="text-sm text-gray-900 dark:text-white">{payment.check_holder_name}</p>
                                                        </div>
                                                    )}
                                                    {payment.check_branch && (
                                                        <div>
                                                            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{t('check_branch')}</label>
                                                            <p className="text-sm text-gray-900 dark:text-white">{payment.check_branch}</p>
                                                        </div>
                                                    )}
                                                    {payment.check_branch_number && (
                                                        <div>
                                                            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{t('check_branch_number')}</label>
                                                            <p className="text-sm text-gray-900 dark:text-white">{payment.check_branch_number}</p>
                                                        </div>
                                                    )}
                                                    {payment.check_account_number && (
                                                        <div>
                                                            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{t('check_account_number')}</label>
                                                            <p className="text-sm text-gray-900 dark:text-white">{payment.check_account_number}</p>
                                                        </div>
                                                    )}
                                                </>
                                            )}

                                            {payment.payment_type === 'cash' && (
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{t('payment_type')}</label>
                                                    <p className="text-sm text-gray-900 dark:text-white">{t('cash')}</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}

                                {/* Total Payments Summary */}
                                <div className="bg-primary/10 p-4 rounded-lg border border-primary/20">
                                    <div className="flex justify-between items-center">
                                        <span className="font-medium text-gray-900 dark:text-white">{t('total_payments')}</span>
                                        <span className="font-bold text-lg text-primary">
                                            ₪{new Intl.NumberFormat('he-IL').format(bill.payments.reduce((sum, payment) => sum + (payment.amount || 0), 0))}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            /* Fallback to legacy single payment display if no payments array */
                            bill.payment_type && (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('payment_type')}</label>
                                        <p className="text-sm text-gray-900 dark:text-white">{t(bill.payment_type)}</p>
                                    </div>

                                    {bill.payment_type === 'visa' && (
                                        <>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('visa_amount')}</label>
                                                <p className="text-sm text-gray-900 dark:text-white">₪{new Intl.NumberFormat('he-IL').format(bill.visa_amount || 0)}</p>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('visa_installments')}</label>
                                                <p className="text-sm text-gray-900 dark:text-white">{bill.visa_installments || t('not_provided')}</p>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('visa_card_type')}</label>
                                                <p className="text-sm text-gray-900 dark:text-white">{bill.visa_card_type || t('not_provided')}</p>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('visa_last_four')}</label>
                                                <p className="text-sm text-gray-900 dark:text-white">{bill.visa_last_four ? `****${bill.visa_last_four}` : t('not_provided')}</p>
                                            </div>
                                        </>
                                    )}

                                    {bill.payment_type === 'bank_transfer' && (
                                        <>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('bank_amount')}</label>
                                                <p className="text-sm text-gray-900 dark:text-white">₪{new Intl.NumberFormat('he-IL').format(bill.bank_amount || 0)}</p>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('bank_name')}</label>
                                                <p className="text-sm text-gray-900 dark:text-white">{bill.bank_name || t('not_provided')}</p>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('bank_branch')}</label>
                                                <p className="text-sm text-gray-900 dark:text-white">{bill.bank_branch || t('not_provided')}</p>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('account_number')}</label>
                                                <p className="text-sm text-gray-900 dark:text-white">{bill.account_number || t('not_provided')}</p>
                                            </div>
                                        </>
                                    )}

                                    {bill.payment_type === 'check' && (
                                        <>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('check_amount')}</label>
                                                <p className="text-sm text-gray-900 dark:text-white">₪{new Intl.NumberFormat('he-IL').format(bill.check_amount || 0)}</p>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('check_number')}</label>
                                                <p className="text-sm text-gray-900 dark:text-white">{bill.check_number || t('not_provided')}</p>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('check_bank_name')}</label>
                                                <p className="text-sm text-gray-900 dark:text-white">{bill.check_bank_name || t('not_provided')}</p>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('check_holder_name')}</label>
                                                <p className="text-sm text-gray-900 dark:text-white">{bill.check_holder_name || t('not_provided')}</p>
                                            </div>
                                        </>
                                    )}
                                </div>
                            )
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default BillPreview;
