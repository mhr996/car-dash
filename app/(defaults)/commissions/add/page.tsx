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
import IconMinusCircle from '@/components/icon/icon-minus-circle';
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
    id_number?: string;
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
    const [items, setItems] = useState<CommissionItem[]>([{ id: '1', item_description: '', unit_price: 0, quantity: 1 }]);

    // سند القبض - مدفوعات
    const [payments, setPayments] = useState<BillPayment[]>([{ payment_type: 'cash', amount: 0 }]);

    // Cancel fields - for credit notes and refund receipts
    const [cancelCommissionId, setCancelCommissionId] = useState('');
    const [cancelTranzilaDocId, setCancelTranzilaDocId] = useState('');
    const [cancelTranzilaDocNumber, setCancelTranzilaDocNumber] = useState('');
    const [cancelAmount, setCancelAmount] = useState('');
    const [cancelDescription, setCancelDescription] = useState('');
    const [providerCommissions, setProviderCommissions] = useState<any[]>([]);

    useEffect(() => {
        if (!providerId) {
            setSelectedProvider(null);
            setProviderCommissions([]);
            return;
        }
        const fetchProvider = async () => {
            const { data } = await supabase
                .from('providers')
                .select('id, name, address, phone, id_number')
                .eq('id', parseInt(providerId, 10) || providerId)
                .single();
            setSelectedProvider(data || null);
        };
        const fetchProviderCommissions = async () => {
            const { data } = await supabase
                .from('commissions')
                .select('id, commission_type, total_with_tax, tranzila_document_id, tranzila_document_number, date, created_at')
                .eq('provider_id', parseInt(providerId, 10) || providerId)
                .in('commission_type', ['tax_invoice', 'receipt_only', 'tax_invoice_receipt'])
                .not('tranzila_document_number', 'is', null)
                .order('created_at', { ascending: false });
            setProviderCommissions(data || []);
        };
        fetchProvider();
        fetchProviderCommissions();
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
        setItems((prev) => prev.map((i) => (i.id === id ? { ...i, [field]: field === 'item_description' ? value : typeof value === 'string' ? parseFloat(value) || 0 : value } : i)));
    };

    const itemsTotal = items.reduce((sum, i) => sum + (i.unit_price || 0) * (i.quantity || 1), 0);
    const itemsTotalBeforeTax = itemsTotal / 1.18;
    const taxAmount = itemsTotalBeforeTax * 0.18;
    const totalWithTax = itemsTotal;

    const totalPaid = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const totalAmountForPaymentForm = commissionType === 'tax_invoice_receipt' ? totalWithTax : totalPaid;

    // ==================== Tranzila Integration ====================
    // Calls Tranzila API first — returns document info. DB insert only happens after success.
    const createTranzilaDocument = async (
        commissionData: {
            commission_type: string;
            date: string;
            cancel_tranzila_doc_number?: string;
            cancel_tranzila_doc_id?: string;
            cancel_amount?: number;
            cancel_description?: string;
        },
        commissionItems: CommissionItem[],
        commissionPayments: BillPayment[],
        provider: ProviderInfo,
    ): Promise<{ id: string; number: string; retrieval_key: string; created_at: string }> => {
        // Map commission type to Tranzila document type (same mapping as bills)
        const documentTypeMap: Record<string, string> = {
            tax_invoice: 'IN', // Tax Invoice only
            receipt_only: 'RE', // Receipt only
            tax_invoice_receipt: 'IR', // Invoice + Receipt
            credit_note: 'IN', // Credit Note - uses IN (Tax Invoice) with canceldoc=Y
            refund_receipt: 'RE', // Refund Receipt - uses RE (Receipt) with canceldoc=Y
        };

        // Map payment type to Tranzila payment method (same as bills)
        const paymentMethodMap: Record<string, number> = {
            visa: 1,
            cash: 5,
            check: 3,
            bank_transfer: 4,
        };

        const documentType = documentTypeMap[commissionData.commission_type] || 'IR';
        const isCreditNote = commissionData.commission_type === 'credit_note';
        const isRefundReceipt = commissionData.commission_type === 'refund_receipt';
        const isCancelDocument = isCreditNote || isRefundReceipt;

        // Build items array
        let tranzilaItems: any[] = [];

        if (isCreditNote) {
            // CREDIT NOTE - for cancelling/reversing tax invoices
            const creditAmount = commissionData.cancel_amount || 0;
            if (creditAmount <= 0) {
                throw new Error('Credit Note requires a positive amount to reverse');
            }

            let itemName = 'הודעת זיכוי';
            if (commissionData.cancel_description) {
                itemName = `הודעת זיכוי - ${commissionData.cancel_description}`;
            } else if (provider.name) {
                itemName = `הודעת זיכוי - ${provider.name}`;
            }

            tranzilaItems = [
                {
                    type: 'I',
                    code: null,
                    name: itemName,
                    price_type: 'G',
                    unit_price: creditAmount,
                    units_number: 1,
                    unit_type: 1,
                    currency_code: 'ILS',
                    to_doc_currency_exchange_rate: 1,
                },
            ];
        } else if (isRefundReceipt) {
            // REFUND RECEIPT - for cancelling/reversing receipts
            const refundAmount = commissionData.cancel_amount || 0;
            if (refundAmount <= 0) {
                throw new Error('Refund Receipt requires a positive amount to reverse');
            }

            let itemName = 'קבלה החזר';
            if (commissionData.cancel_description) {
                itemName = `קבלה החזר - ${commissionData.cancel_description}`;
            } else if (provider.name) {
                itemName = `קבלה החזר - ${provider.name}`;
            }

            tranzilaItems = [
                {
                    type: 'I',
                    code: null,
                    name: itemName,
                    price_type: 'G',
                    unit_price: refundAmount,
                    units_number: 1,
                    unit_type: 1,
                    currency_code: 'ILS',
                    to_doc_currency_exchange_rate: 1,
                },
            ];
        } else if (documentType === 'IN' || documentType === 'IR') {
            // Tax Invoice or Invoice+Receipt — use the manually entered items
            const validItems = commissionItems.filter((i) => (i.item_description || '').trim() && (i.unit_price || 0) > 0);
            tranzilaItems = validItems.map((item) => ({
                type: 'I',
                code: null,
                name: item.item_description.trim(),
                price_type: 'G', // Gross (includes VAT)
                unit_price: item.unit_price,
                units_number: item.quantity || 1,
                unit_type: 1,
                currency_code: 'ILS',
                to_doc_currency_exchange_rate: 1,
            }));

            if (tranzilaItems.length === 0) {
                throw new Error('Tax Invoice requires at least one item');
            }
        } else if (documentType === 'RE') {
            // Receipt only — single item with provider name and total amount
            const totalPaymentAmount = commissionPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
            if (totalPaymentAmount <= 0) {
                throw new Error('Receipt requires at least one payment with amount > 0');
            }
            tranzilaItems = [
                {
                    type: 'I',
                    code: null,
                    name: provider.name || 'קבלה',
                    price_type: 'G',
                    unit_price: totalPaymentAmount,
                    units_number: 1,
                    unit_type: 1,
                    currency_code: 'ILS',
                    to_doc_currency_exchange_rate: 1,
                },
            ];
        }

        // Build payments array (for RE and IR) — skip for cancel documents
        let tranzilaPayments: any[] = [];

        if (!isCancelDocument && (documentType === 'RE' || documentType === 'IR')) {
            tranzilaPayments = commissionPayments
                .filter((p) => p.amount && p.amount > 0)
                .map((payment) => {
                    const methodCode = paymentMethodMap[payment.payment_type];
                    if (!methodCode) {
                        throw new Error(`Unsupported payment type: ${payment.payment_type}`);
                    }
                    const basePayment = {
                        payment_method: methodCode,
                        payment_date: commissionData.date || new Date().toISOString().split('T')[0],
                        amount: payment.amount,
                        currency_code: 'ILS',
                        to_doc_currency_exchange_rate: 1,
                    };

                    // Map UI fields to Tranzila API fields per documented schema.
                    // See: https://docs.tranzila.com/docs/invoices/e9f00t8lnhw3k-create-document
                    if (payment.payment_type === 'visa') {
                        // payment_method 1 - Credit Card
                        const visaFields: Record<string, any> = {};
                        if (payment.visa_last_four) visaFields.cc_last_4_digits = payment.visa_last_four;
                        // Tranzila requires cc_installments_number >= 2; omit for single-payment (Regular)
                        if (payment.visa_installments && payment.visa_installments >= 2) {
                            visaFields.cc_installments_number = payment.visa_installments;
                        }
                        return { ...basePayment, ...visaFields };
                    } else if (payment.payment_type === 'check') {
                        // payment_method 3 - Cheque
                        const chequeFields: Record<string, any> = {};
                        if (payment.check_bank_name) chequeFields.bank = payment.check_bank_name;
                        if (payment.check_branch) chequeFields.bank_branch = payment.check_branch;
                        if (payment.check_account_number) chequeFields.bank_account = payment.check_account_number;
                        if (payment.check_number) chequeFields.cheque_number = payment.check_number;
                        return { ...basePayment, ...chequeFields };
                    } else if (payment.payment_type === 'bank_transfer') {
                        // payment_method 4 - Bank Transfer
                        const transferFields: Record<string, any> = {};
                        if (payment.transfer_bank_name) transferFields.bank = payment.transfer_bank_name;
                        if (payment.transfer_branch) transferFields.bank_branch = payment.transfer_branch;
                        if (payment.transfer_account_number) transferFields.bank_account = payment.transfer_account_number;
                        return { ...basePayment, ...transferFields };
                    }

                    // payment_method 5 - Cash: no extra fields per Tranzila API
                    return basePayment;
                });

            if (tranzilaPayments.length === 0) {
                throw new Error('Receipt requires at least one valid payment');
            }
        }

        // VAT: 18% for invoices and credit notes, 0% for receipt-only and refund receipts
        const vatPercent = isCreditNote ? 18 : documentType === 'RE' ? 0 : 18;

        // Build Tranzila request - handle payments differently for cancel documents
        let tranzilaPaymentsForRequest: any[] = [];

        if (isCreditNote) {
            // Credit notes don't need payments - they're reversals
            tranzilaPaymentsForRequest = [];
        } else if (isRefundReceipt) {
            if (!cancelCommissionId) {
                throw new Error('Refund receipt requires selecting an original receipt to refund.');
            }

            // Fetch original commission payments from our DB.
            // Tranzila's get_document endpoint returns only a PDF, not JSON payment data.
            console.log('🔍 Fetching original commission payments from DB, commission_id:', cancelCommissionId);
            const { data: originalPaymentsData, error: paymentsError } = await supabase
                .from('commission_payments')
                .select('payment_type, amount')
                .eq('commission_id', parseInt(cancelCommissionId, 10));

            if (paymentsError || !originalPaymentsData || originalPaymentsData.length === 0) {
                throw new Error('Original receipt has no payment information in DB. Cannot create refund receipt.');
            }

            tranzilaPaymentsForRequest = originalPaymentsData.map((payment: any) => ({
                payment_method: paymentMethodMap[payment.payment_type],
                payment_date: commissionData.date,
                amount: payment.amount,
                currency_code: 'ILS',
                to_doc_currency_exchange_rate: 1,
            }));
        } else {
            // Normal document - use the provided payments
            tranzilaPaymentsForRequest = documentType === 'IN' ? [] : tranzilaPayments;
        }

        const tranzilaRequestData = {
            action: 'create_document',
            data: {
                document_type: documentType,
                document_date: commissionData.date || new Date().toISOString().split('T')[0],
                document_currency_code: 'ILS',
                vat_percent: vatPercent,
                // action: 1 = debit (normal document), 3 = credit (refund/credit note)
                action: isCancelDocument ? 3 : 1,
                client_company: provider.name || '',
                client_name: provider.name || '',
                client_id: provider.id_number || '',
                client_email: 'no-reply@car-dash.com',
                client_phone: provider.phone || '',
                client_address_line_1: provider.address || null,
                items: tranzilaItems,
                payments: tranzilaPaymentsForRequest,
                created_by_user: 'car-dash',
                created_by_system: 'car-dash',
                // Cancel document parameters
                // related_document_number + relation_type 1 = cancelling by document number (per Tranzila docs)
                ...(isCancelDocument && commissionData.cancel_tranzila_doc_number
                    ? {
                          canceldoc: 'Y',
                          related_document_number: parseInt(commissionData.cancel_tranzila_doc_number),
                          relation_type: 1,
                      }
                    : {}),
            },
        };

        console.log('🧾 ============ TRANZILA COMMISSION REQUEST ============');
        console.log('📋 Document Type:', documentType);
        console.log('📝 Commission Type:', commissionData.commission_type);
        if (isCancelDocument) {
            console.log('🔄 This is a CANCEL document (credit note / refund receipt)');
            console.log('🔄 Cancel Doc Number:', commissionData.cancel_tranzila_doc_number);
            console.log('🔄 Cancel Doc ID:', commissionData.cancel_tranzila_doc_id);
        }
        console.log('📦 Items being sent:');
        tranzilaItems.forEach((item, idx) => {
            console.log(`   Item ${idx + 1}: ${item.name} - Price: ₪${item.unit_price} x ${item.units_number}`);
        });
        if (tranzilaPaymentsForRequest.length > 0) {
            console.log('💳 Payments being sent:');
            tranzilaPaymentsForRequest.forEach((payment, idx) => {
                console.log(`   Payment ${idx + 1}: Method ${payment.payment_method} - Amount: ₪${payment.amount}`);
            });
        }
        console.log('📄 Full Request Data:', JSON.stringify(tranzilaRequestData, null, 2));
        console.log('==================================================');

        // Call Tranzila API
        const response = await fetch('/api/tranzila', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(tranzilaRequestData),
        });

        const result = await response.json();

        if (!result.ok || !result.response || result.response.status_code !== 0) {
            const errorMsg = result.response?.status_msg || 'Unknown Tranzila error';
            const statusCode = result.response?.status_code || 'N/A';
            throw new Error(`Tranzila error (${statusCode}): ${errorMsg}`);
        }

        console.log('✅ Tranzila commission document created successfully:', result.response.document.number);
        return result.response.document;
    };

    const validateForm = () => {
        if (!providerId) {
            setAlert({ message: t('provider_required'), type: 'danger' });
            return false;
        }
        if (!commissionType) {
            setAlert({ message: t('commission_type_required'), type: 'danger' });
            return false;
        }

        // Credit note validation
        if (commissionType === 'credit_note') {
            if (!cancelCommissionId) {
                setAlert({ message: t('select_commission_to_cancel'), type: 'danger' });
                return false;
            }
            const amount = parseFloat(cancelAmount) || 0;
            if (amount <= 0) {
                setAlert({ message: t('cancel_amount_required'), type: 'danger' });
                return false;
            }
            return true;
        }

        // Refund receipt validation
        if (commissionType === 'refund_receipt') {
            if (!cancelCommissionId) {
                setAlert({ message: t('select_commission_to_cancel'), type: 'danger' });
                return false;
            }
            const amount = parseFloat(cancelAmount) || 0;
            if (amount <= 0) {
                setAlert({ message: t('cancel_amount_required'), type: 'danger' });
                return false;
            }
            if (!cancelTranzilaDocId) {
                setAlert({ message: t('original_tranzila_doc_required'), type: 'danger' });
                return false;
            }
            return true;
        }

        if (commissionType === 'tax_invoice' || commissionType === 'tax_invoice_receipt') {
            const hasValidItem = items.some((i) => (i.item_description || '').trim() && (i.unit_price || 0) > 0);
            if (!hasValidItem) {
                setAlert({ message: t('commission_items_required'), type: 'danger' });
                return false;
            }
        }

        if (commissionType === 'receipt_only' || commissionType === 'tax_invoice_receipt') {
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
            const isCancelDoc = commissionType === 'credit_note' || commissionType === 'refund_receipt';

            let total = 0;
            let tax_amount = 0;
            let total_with_tax = 0;

            if (isCancelDoc) {
                // For cancel documents, use the cancel amount
                total_with_tax = parseFloat(cancelAmount) || 0;
                if (commissionType === 'credit_note') {
                    // Credit notes have 18% VAT
                    total = total_with_tax / 1.18;
                    tax_amount = total_with_tax - total;
                } else {
                    // Refund receipts have 0% VAT
                    total = total_with_tax;
                    tax_amount = 0;
                }
            } else if (commissionType === 'tax_invoice' || commissionType === 'tax_invoice_receipt') {
                total = itemsTotalBeforeTax;
                tax_amount = taxAmount;
                total_with_tax = totalWithTax;
            } else if (commissionType === 'receipt_only') {
                total_with_tax = totalPaid;
                total = totalPaid;
                tax_amount = 0;
            }

            // Step 1: Call Tranzila FIRST — if it fails, nothing is saved to DB
            const tranzilaDoc = await createTranzilaDocument(
                {
                    commission_type: commissionType,
                    date: commissionDate,
                    cancel_tranzila_doc_number: cancelTranzilaDocNumber || undefined,
                    cancel_tranzila_doc_id: cancelTranzilaDocId || undefined,
                    cancel_amount: parseFloat(cancelAmount) || undefined,
                    cancel_description: cancelDescription || undefined,
                },
                items,
                payments,
                selectedProvider!,
            );

            // Step 2: Tranzila succeeded — now insert commission with Tranzila data
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
                    tranzila_document_id: tranzilaDoc.id,
                    tranzila_document_number: tranzilaDoc.number,
                    tranzila_retrieval_key: tranzilaDoc.retrieval_key,
                    tranzila_created_at: commissionDate ? new Date(commissionDate + 'T00:00:00').toISOString() : tranzilaDoc.created_at,
                    ...(isCancelDoc
                        ? {
                              cancel_tranzila_doc_number: cancelTranzilaDocNumber || null,
                              cancel_tranzila_doc_id: cancelTranzilaDocId || null,
                              cancel_commission_id: cancelCommissionId ? parseInt(cancelCommissionId, 10) : null,
                          }
                        : {}),
                })
                .select('id')
                .single();

            if (error) throw error;
            const commissionId = commissionResult.id;

            // Step 3: Insert items (skip for cancel documents)
            if (!isCancelDoc && (commissionType === 'tax_invoice' || commissionType === 'tax_invoice_receipt')) {
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

            // Step 4: Insert payments (skip for cancel documents)
            if (!isCancelDoc && (commissionType === 'receipt_only' || commissionType === 'tax_invoice_receipt')) {
                const paymentInserts = payments
                    .filter((p) => (p.amount || 0) > 0)
                    .map((p) => ({
                        commission_id: commissionId,
                        payment_type: p.payment_type,
                        amount: p.amount,
                        visa_installments: p.visa_installments || null,
                        visa_last_four: p.visa_last_four || null,
                        transfer_bank_name: p.transfer_bank_name || null,
                        transfer_branch: p.transfer_branch || null,
                        transfer_account_number: p.transfer_account_number || null,
                        check_bank_name: p.check_bank_name || null,
                        check_number: p.check_number || null,
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
            <div className="container mx-auto p-6 pb-96">
                <div className="flex items-center gap-5 mb-6">
                    <div onClick={() => router.back()}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 mb-4 cursor-pointer text-primary rtl:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-white dark:bg-gray-800 rounded-lg border">
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
                                    <div>
                                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('provider_id_number')}</label>
                                        <p className="text-sm text-gray-900 dark:text-white">{selectedProvider.id_number || '-'}</p>
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
                                <CommissionTypeSelect
                                    defaultValue={commissionType}
                                    onChange={(type) => {
                                        setCommissionType(type);
                                        // Reset cancel fields when type changes
                                        setCancelCommissionId('');
                                        setCancelTranzilaDocId('');
                                        setCancelTranzilaDocNumber('');
                                        setCancelAmount('');
                                        setCancelDescription('');
                                    }}
                                    showCreditNote={true}
                                    showRefundReceipt={true}
                                />
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

                    {/* Select Commission to Cancel - Credit Note */}
                    {commissionType === 'credit_note' && (
                        <div className="panel">
                            <div className="mb-5 flex items-center gap-3">
                                <IconMinusCircle className="w-5 h-5 text-red-500" />
                                <div>
                                    <h5 className="text-lg font-semibold dark:text-white-light">{t('select_commission_to_cancel')}</h5>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{t('select_commission_to_cancel_credit_desc')}</p>
                                </div>
                            </div>
                            {providerCommissions.filter((c) => c.commission_type === 'tax_invoice').length > 0 ? (
                                <select
                                    value={cancelCommissionId}
                                    onChange={(e) => {
                                        const selected = providerCommissions.find((c) => c.id.toString() === e.target.value);
                                        setCancelCommissionId(e.target.value);
                                        setCancelTranzilaDocId(selected?.tranzila_document_id || '');
                                        setCancelTranzilaDocNumber(selected?.tranzila_document_number || '');
                                        setCancelAmount(selected ? (selected.total_with_tax || 0).toString() : '');
                                        setCancelDescription(selected ? `${t('credit_note_for_commission')} #${selected.tranzila_document_number}` : '');
                                    }}
                                    className="form-select bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-600 rounded-lg px-4 py-3 text-lg focus:border-red-500 focus:ring-2 focus:ring-red-500/20 transition-all duration-200"
                                >
                                    <option value="">{t('select_commission_to_cancel_placeholder')}</option>
                                    {providerCommissions
                                        .filter((c) => c.commission_type === 'tax_invoice')
                                        .map((comm) => (
                                            <option key={comm.id} value={comm.id}>
                                                #{comm.tranzila_document_number} - {t('commission_type_tax_invoice')} - ₪{(comm.total_with_tax || 0).toLocaleString()} -{' '}
                                                {new Date(comm.date || comm.created_at).toLocaleDateString('en-GB')}
                                            </option>
                                        ))}
                                </select>
                            ) : (
                                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                                    <p className="text-yellow-700 dark:text-yellow-300 text-sm">{t('no_commissions_to_cancel')}</p>
                                </div>
                            )}

                            {/* Cancel Amount & Description */}
                            {cancelCommissionId && (
                                <div className="mt-4 space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            {t('cancel_amount')} <span className="text-red-500">*</span>
                                        </label>
                                        <div className="flex">
                                            <span className="inline-flex items-center px-3 bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 border border-r-0 border-gray-300 dark:border-gray-600 ltr:rounded-l-md rtl:rounded-r-md">
                                                ₪
                                            </span>
                                            <input
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                value={cancelAmount}
                                                onChange={(e) => setCancelAmount(e.target.value)}
                                                className="form-input ltr:rounded-l-none rtl:rounded-r-none"
                                                placeholder="0.00"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('cancel_description')}</label>
                                        <input
                                            type="text"
                                            value={cancelDescription}
                                            onChange={(e) => setCancelDescription(e.target.value)}
                                            className="form-input"
                                            placeholder={t('cancel_description_placeholder')}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Select Commission to Cancel - Refund Receipt */}
                    {commissionType === 'refund_receipt' && (
                        <div className="panel">
                            <div className="mb-5 flex items-center gap-3">
                                <IconMinusCircle className="w-5 h-5 text-pink-500" />
                                <div>
                                    <h5 className="text-lg font-semibold dark:text-white-light">{t('select_receipt_to_refund')}</h5>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{t('select_commission_to_cancel_refund_desc')}</p>
                                </div>
                            </div>
                            {providerCommissions.filter((c) => c.commission_type === 'receipt_only' || c.commission_type === 'tax_invoice_receipt').length > 0 ? (
                                <select
                                    value={cancelCommissionId}
                                    onChange={(e) => {
                                        const selected = providerCommissions.find((c) => c.id.toString() === e.target.value);
                                        setCancelCommissionId(e.target.value);
                                        setCancelTranzilaDocId(selected?.tranzila_document_id || '');
                                        setCancelTranzilaDocNumber(selected?.tranzila_document_number || '');
                                        setCancelAmount(selected ? (selected.total_with_tax || 0).toString() : '');
                                        setCancelDescription(selected ? `${t('refund_receipt_for_commission')} #${selected.tranzila_document_number}` : '');
                                    }}
                                    className="form-select bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-600 rounded-lg px-4 py-3 text-lg focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 transition-all duration-200"
                                >
                                    <option value="">{t('select_receipt_to_refund_placeholder')}</option>
                                    {providerCommissions
                                        .filter((c) => c.commission_type === 'receipt_only' || c.commission_type === 'tax_invoice_receipt')
                                        .map((comm) => (
                                            <option key={comm.id} value={comm.id}>
                                                #{comm.tranzila_document_number} - {comm.commission_type === 'receipt_only' ? t('commission_type_receipt') : t('commission_type_both')} - ₪
                                                {(comm.total_with_tax || 0).toLocaleString()} - {new Date(comm.date || comm.created_at).toLocaleDateString('en-GB')}
                                            </option>
                                        ))}
                                </select>
                            ) : (
                                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                                    <p className="text-yellow-700 dark:text-yellow-300 text-sm">{t('no_receipts_to_refund')}</p>
                                </div>
                            )}

                            {/* Cancel Amount & Description */}
                            {cancelCommissionId && (
                                <div className="mt-4 space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            {t('cancel_amount')} <span className="text-red-500">*</span>
                                        </label>
                                        <div className="flex">
                                            <span className="inline-flex items-center px-3 bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 border border-r-0 border-gray-300 dark:border-gray-600 ltr:rounded-l-md rtl:rounded-r-md">
                                                ₪
                                            </span>
                                            <input
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                value={cancelAmount}
                                                onChange={(e) => setCancelAmount(e.target.value)}
                                                className="form-input ltr:rounded-l-none rtl:rounded-r-none"
                                                placeholder="0.00"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('cancel_description')}</label>
                                        <input
                                            type="text"
                                            value={cancelDescription}
                                            onChange={(e) => setCancelDescription(e.target.value)}
                                            className="form-input"
                                            placeholder={t('cancel_description_placeholder')}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

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
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
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
                                        <div>
                                            <span className="text-blue-600 dark:text-blue-300 font-medium">{t('provider_id_number')}:</span>
                                            <p className="text-blue-800 dark:text-blue-100">{selectedProvider.id_number || '-'}</p>
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

                    {/* Receipt Section - مثل الفواتير */}
                    {(commissionType === 'receipt_only' || commissionType === 'tax_invoice_receipt') && (
                        <div className="panel">
                            <div className="mb-5 flex items-center gap-3">
                                <IconDollarSign className="w-5 h-5 text-primary" />
                                <h5 className="text-lg font-semibold dark:text-white-light">{t('receipt_details')}</h5>
                            </div>
                            <MultiplePaymentForm payments={payments} onPaymentsChange={setPayments} totalAmount={totalAmountForPaymentForm} />
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
