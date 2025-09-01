'use client';
import React from 'react';
import Link from 'next/link';
import { getTranslation } from '@/i18n';
import IconReceipt from '@/components/icon/icon-receipt';
import IconEye from '@/components/icon/icon-eye';
import IconPdf from '@/components/icon/icon-pdf';
import { formatDate } from '@/utils/date-formatter';

interface BillsTableProps {
    bills: any[];
    loading?: boolean;
    onDownloadPDF?: (bill: any) => void;
    downloadingPDF?: string | null;
    readOnly?: boolean; // For preview mode
    className?: string;
    deal?: any; // Deal information for exchange deals
    car?: any; // Car data for the deal
    carTakenFromClient?: any; // Car taken from client for exchange deals
    selectedCustomer?: any; // Selected customer for display
}

const BillsTable: React.FC<BillsTableProps> = ({ bills, loading = false, onDownloadPDF, downloadingPDF, readOnly = false, className = '', deal, car, carTakenFromClient, selectedCustomer }) => {
    const { t } = getTranslation();

    // Helper function to get bill amount based on bill type and payment method
    const getBillAmount = (bill: any) => {
        if (bill.bill_type === 'general') {
            const amount = parseFloat(bill.bill_amount || '0');
            // Apply bill direction: negative bills should have negative amounts
            return bill.bill_direction === 'negative' ? -Math.abs(amount) : Math.abs(amount);
        }

        if (bill.bill_type === 'tax_invoice') {
            const amount = parseFloat(bill.total_with_tax || '0');
            // Tax invoices are always negative
            return -Math.abs(amount);
        }

        // For receipt types, calculate total from payments array if available
        if (bill.bill_type === 'receipt_only' || bill.bill_type === 'tax_invoice_receipt') {
            let totalAmount = 0;

            // If using new multiple payments structure, calculate total from payments
            // Handle both 'payments' and 'bill_payments' property names
            const paymentsArray = bill.payments || bill.bill_payments;
            if (paymentsArray && paymentsArray.length > 0) {
                totalAmount = paymentsArray.reduce((sum: number, payment: any) => sum + (payment.amount || 0), 0);
            } else {
                // Otherwise, use legacy payment fields
                const visaAmount = parseFloat(bill.visa_amount || '0') || 0;
                const transferAmount = parseFloat(bill.transfer_amount || '0') || 0;
                const checkAmount = parseFloat(bill.check_amount || '0') || 0;
                const cashAmount = parseFloat(bill.cash_amount || '0') || 0;
                const bankAmount = parseFloat(bill.bank_amount || '0') || 0;

                totalAmount = visaAmount + transferAmount + checkAmount + cashAmount + bankAmount;
            }

            // Apply bill direction: negative bills should have negative amounts
            if (bill.bill_direction === 'negative') {
                return -Math.abs(totalAmount);
            } else {
                return Math.abs(totalAmount);
            }
        }

        return 0;
    };

    // Helper function to format currency
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'ILS',
        }).format(amount);
    };

    if (loading) {
        return (
            <div className={`panel ${className}`}>
                <div className="mb-5 flex items-center gap-3">
                    <IconReceipt className="w-5 h-5 text-primary" />
                    <h5 className="text-lg font-semibold dark:text-white-light">{t('connected_bills')}</h5>
                </div>
                <div className="flex justify-center items-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
            </div>
        );
    }

    if (bills.length === 0) {
        return (
            <div className={`panel ${className}`}>
                <div className="mb-5 flex items-center gap-3">
                    <IconReceipt className="w-5 h-5 text-primary" />
                    <h5 className="text-lg font-semibold dark:text-white-light">{t('connected_bills')}</h5>
                </div>
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <IconReceipt className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>{t('no_bills_connected')}</p>
                </div>
            </div>
        );
    }

    return (
        <div className={`panel ${className}`}>
            <div className="mb-5 flex items-center gap-3">
                <IconReceipt className="w-5 h-5 text-primary" />
                <h5 className="text-lg font-semibold dark:text-white-light">{t('connected_bills')}</h5>
            </div>

            <div className="overflow-x-auto">
                <table className="table-auto w-full">
                    <thead>
                        <tr className="bg-gray-50 dark:bg-gray-800">
                            <th className="px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300">{t('bill_type')}</th>
                            <th className="px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300">{t('customer_name')}</th>
                            <th className="px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300">{t('amount')}</th>
                            <th className="px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300">{t('created_date')}</th>
                            <th className="px-4 py-3 text-center text-sm font-medium text-gray-700 dark:text-gray-300">{t('actions')}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {/* Add special row for exchange deals showing customer car evaluation */}
                        {deal?.deal_type === 'exchange' && carTakenFromClient && (
                            <tr className="bg-blue-50 dark:bg-blue-900/20 border-b-2 border-blue-200 dark:border-blue-700">
                                <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                                        {t('car_taken_from_client_label')}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                                    {deal?.customers?.name || deal?.customer?.name || selectedCustomer?.name || t('unknown_customer')}
                                </td>
                                <td className="px-4 py-3 text-sm">
                                    <span className="text-green-600 dark:text-green-400 font-medium">{formatCurrency(carTakenFromClient.buy_price || 0)}</span>
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{formatDate(deal.created_at)}</td>
                                <td className="px-4 py-3 text-center">
                                    <span className="text-gray-500 dark:text-gray-400 text-xs">-</span>
                                </td>
                            </tr>
                        )}

                        {/* Add special row for financing assistance intermediary deals showing bank transfer order */}
                        {deal?.deal_type === 'financing_assistance_intermediary' && car && (
                            <tr className="bg-purple-50 dark:bg-purple-900/20 border-b-2 border-purple-200 dark:border-purple-700">
                                <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300">
                                        {t('bank_transfer_order_customer')}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                                    {deal?.customers?.name || deal?.customer?.name || selectedCustomer?.name || t('unknown_customer')}
                                </td>
                                <td className="px-4 py-3 text-sm">
                                    <span className="text-purple-600 dark:text-purple-400 font-medium">{formatCurrency((car?.sale_price || 0) - (deal?.amount || 0))}</span>
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{formatDate(deal.created_at)}</td>
                                <td className="px-4 py-3 text-center">
                                    <span className="text-gray-500 dark:text-gray-400 text-xs">-</span>
                                </td>
                            </tr>
                        )}
                        {bills.map((bill) => {
                            const billAmount = getBillAmount(bill);
                            return (
                                <tr key={bill.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                                            {t(`bill_type_${bill.bill_type}`)}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{bill.deals?.customers?.name || bill.customer_name || t('unknown_customer')}</td>
                                    <td className="px-4 py-3 text-sm">
                                        {billAmount < 0 ? (
                                            <span className="text-red-600 dark:text-red-400 font-medium">{formatCurrency(billAmount)}</span>
                                        ) : (
                                            <span className="text-gray-900 dark:text-gray-100">{formatCurrency(billAmount)}</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{formatDate(bill.created_at)}</td>
                                    <td className="px-4 py-3 text-center">
                                        <div className="flex items-center justify-center gap-2">
                                            <Link
                                                href={`/bills/preview/${bill.id}`}
                                                className="inline-flex items-center gap-1 px-3 py-1 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors duration-200 text-xs"
                                            >
                                                <IconEye className="w-3 h-3" />
                                                {t('view')}
                                            </Link>
                                            {onDownloadPDF && (
                                                <button
                                                    type="button"
                                                    onClick={() => onDownloadPDF(bill)}
                                                    className="inline-flex items-center gap-1 px-3 py-1 bg-success text-white rounded-md hover:bg-success-dark transition-colors duration-200 text-xs"
                                                    title={t('download_pdf')}
                                                    disabled={downloadingPDF === bill.id}
                                                >
                                                    {downloadingPDF === bill.id ? <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div> : <IconPdf className="w-3 h-3" />}
                                                    PDF
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default BillsTable;
