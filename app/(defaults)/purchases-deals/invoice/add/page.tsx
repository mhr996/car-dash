'use client';
import React, { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
import DateInput from '@/components/elements/date-input';
import IconMinusCircle from '@/components/icon/icon-minus-circle';
import CommissionTypeSelect from '@/components/commission-type-select/commission-type-select';
import { MultiplePaymentForm } from '@/components/forms/multiple-payment-form';
import { BillPayment } from '@/types/payment';
import { cancellablePurchaseBills, PurchaseBill, resolvePurchaseSeller } from '@/utils/purchase-billing';
import { createAndStoreTranzilaDocument, TranzilaReconciliationRequiredError } from '@/utils/tranzila-document';
import { getPurchaseSignature, validPurchaseSignature } from '@/utils/purchase-signature';

interface InvoiceItem {
    id: string;
    item_description: string;
    unit_price: number;
    quantity: number;
}

interface PartyInfo {
    id: string | number;
    name: string;
    address?: string;
    phone?: string;
    id_number?: string | number;
    kind: 'provider' | 'customer';
}

interface CarInfo {
    id: string | number;
    title?: string;
    brand?: string;
    year?: number;
    car_number?: string;
    buy_price?: number;
    source_type?: string | null;
    providers?: {
        id: string | number;
        name: string;
        address?: string;
        phone?: string;
        id_number?: string | number;
    } | null;
    customers?: {
        id: string | number;
        name: string;
        phone?: string;
        id_number?: string | number;
        address?: string;
    } | null;
}

const AddPurchaseInvoice = () => {
    const { t } = getTranslation();
    const router = useRouter();
    const searchParams = useSearchParams();
    const carId = searchParams?.get('car_id') || '';
    const returnTo = searchParams?.get('returnTo') || (carId ? `/purchases-deals/preview/${carId}?tab=bills` : '/purchases-deals');

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const submitting = useRef(false);
    const [billCreationReviewMessage, setBillCreationReviewMessage] = useState<string | null>(null);
    const [alert, setAlert] = useState<{ message: string; type: 'success' | 'danger' } | null>(null);
    const [car, setCar] = useState<CarInfo | null>(null);
    const [party, setParty] = useState<PartyInfo | null>(null);
    const [hasSellerSignature, setHasSellerSignature] = useState(false);

    const [billType, setBillType] = useState('');
    const [billDate, setBillDate] = useState(new Date().toISOString().split('T')[0]);
    const [status, setStatus] = useState('pending');
    const [freeText, setFreeText] = useState('');
    const [items, setItems] = useState<InvoiceItem[]>([{ id: '1', item_description: '', unit_price: 0, quantity: 1 }]);
    const [payments, setPayments] = useState<BillPayment[]>([{ payment_type: 'cash', amount: 0 }]);

    const [cancelBillId, setCancelBillId] = useState('');
    const [cancelTranzilaDocId, setCancelTranzilaDocId] = useState('');
    const [cancelTranzilaDocNumber, setCancelTranzilaDocNumber] = useState('');
    const [cancelAmount, setCancelAmount] = useState('');
    const [cancelDescription, setCancelDescription] = useState('');
    const [carBills, setCarBills] = useState<PurchaseBill[]>([]);

    useEffect(() => {
        let cancelled = false;

        const load = async () => {
            if (!carId) {
                setLoading(false);
                return;
            }
            setLoading(true);
            setCar(null);
            setParty(null);
            setHasSellerSignature(false);
            setCarBills([]);
            setBillCreationReviewMessage(null);
            setAlert(null);
            try {
                const { data, error } = await supabase
                    .from('cars')
                    .select(
                        `
                        id, title, brand, year, car_number, buy_price, source_type,
                        providers!cars_provider_fkey(id, name, address, phone, id_number),
                        customers!cars_source_customer_id_fkey(id, name, address, phone, id_number)
                    `,
                    )
                    .eq('id', carId)
                    .returns<CarInfo[]>()
                    .single();

                if (error) throw error;
                if (cancelled) return;

                const carData = data;
                setCar(carData);

                const seller = resolvePurchaseSeller(carData);
                if (seller) {
                    setParty({
                        ...seller,
                        kind: seller === carData.providers ? 'provider' : 'customer',
                    });
                } else {
                    setParty(null);
                }

                const { data: bills, error: billsError } = await supabase
                    .from('bills')
                    .select('id, bill_type, status, total_with_tax, tranzila_document_id, tranzila_document_number, tranzila_retrieval_key, cancel_tranzila_doc_number, cancel_tranzila_doc_id, date, created_at')
                    .eq('purchase_car_id', carId)
                    .order('created_at', { ascending: false })
                    .returns<PurchaseBill[]>();

                if (billsError) throw billsError;
                if (cancelled) return;
                setCarBills(bills || []);
                const signature = await getPurchaseSignature(carData.id);
                if (cancelled) return;
                setHasSellerSignature(validPurchaseSignature(signature, carData));
                const unresolvedBill = bills?.find((bill) => !bill.tranzila_retrieval_key);
                if (unresolvedBill) {
                    const message = new TranzilaReconciliationRequiredError(unresolvedBill.id, 'This purchase has an unresolved bill.').message;
                    setBillCreationReviewMessage(message);
                    setAlert({ message, type: 'danger' });
                }

                if (carData.buy_price && carData.buy_price > 0) {
                    setItems([
                        {
                            id: '1',
                            item_description: `${carData.brand || ''} ${carData.title || ''} ${carData.year || ''}${carData.car_number ? ` - ${carData.car_number}` : ''}`.trim(),
                            unit_price: carData.buy_price,
                            quantity: 1,
                        },
                    ]);
                }
            } catch (e) {
                if (cancelled) return;
                console.error(e);
                setBillCreationReviewMessage(t('error_loading_data'));
                setAlert({ message: t('error_loading_data'), type: 'danger' });
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        load();
        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps -- load once per carId only (t changes every render)
    }, [carId]);

    const addItem = () => {
        setItems((prev) => [...prev, { id: Date.now().toString(), item_description: '', unit_price: 0, quantity: 1 }]);
    };

    const removeItem = (id: string) => {
        if (items.length > 1) setItems((prev) => prev.filter((i) => i.id !== id));
    };

    const updateItem = (id: string, field: keyof InvoiceItem, value: string | number) => {
        setItems((prev) => prev.map((i) => (i.id === id ? { ...i, [field]: field === 'item_description' ? value : typeof value === 'string' ? parseFloat(value) || 0 : value } : i)));
    };

    const itemsTotal = Math.round(items.reduce((sum, i) => sum + i.unit_price * i.quantity, 0) * 100) / 100;
    const itemsTotalBeforeTax = Math.round((itemsTotal / 1.18) * 100) / 100;
    const taxAmount = Math.round((itemsTotal - itemsTotalBeforeTax) * 100) / 100;
    const totalWithTax = itemsTotal;
    const totalPaid = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const totalAmountForPaymentForm = billType === 'tax_invoice_receipt' ? totalWithTax : totalPaid;
    const billsToCancel = cancellablePurchaseBills(carBills, billType);

    const carDetailsText = car
        ? `${car.brand || ''} ${car.title || ''} ${car.year || ''}${car.car_number ? ` - ${car.car_number}` : ''}`.trim()
        : '';

    const createTranzilaDocument = async (
        billId: number,
        billData: { bill_type: string; date: string; cancel_tranzila_doc_number?: string; cancel_amount?: number; cancel_description?: string },
        billItems: InvoiceItem[],
        billPayments: BillPayment[],
        client: PartyInfo,
    ) => {
        const documentTypeMap: Record<string, string> = {
            tax_invoice: 'IN',
            receipt_only: 'RE',
            tax_invoice_receipt: 'IR',
            credit_note: 'IN',
            refund_receipt: 'RE',
        };
        const paymentMethodMap: Record<string, number> = {
            visa: 1,
            cash: 5,
            check: 3,
            bank_transfer: 4,
        };

        const documentType = documentTypeMap[billData.bill_type] || 'IR';
        const isCreditNote = billData.bill_type === 'credit_note';
        const isRefundReceipt = billData.bill_type === 'refund_receipt';
        const isCancelDocument = isCreditNote || isRefundReceipt;

        let tranzilaItems: Array<{
            type: string;
            code: null;
            name: string;
            price_type: string;
            unit_price: number;
            units_number: number;
            unit_type: number;
            currency_code: string;
            to_doc_currency_exchange_rate: number;
        }> = [];

        if (isCreditNote || isRefundReceipt) {
            const amount = billData.cancel_amount || 0;
            if (amount <= 0) throw new Error('Cancel document requires a positive amount');
            const defaultName = isCreditNote ? 'הודעת זיכוי' : 'קבלה החזר';
            const itemName = billData.cancel_description
                ? `${defaultName} - ${billData.cancel_description}`
                : client.name
                  ? `${defaultName} - ${client.name}`
                  : defaultName;
            tranzilaItems = [
                {
                    type: 'I',
                    code: null,
                    name: itemName,
                    price_type: 'G',
                    unit_price: amount,
                    units_number: 1,
                    unit_type: 1,
                    currency_code: 'ILS',
                    to_doc_currency_exchange_rate: 1,
                },
            ];
        } else if (documentType === 'IN' || documentType === 'IR') {
            const validItems = billItems.filter((i) => (i.item_description || '').trim() && (i.unit_price || 0) > 0);
            tranzilaItems = validItems.map((item) => ({
                type: 'I',
                code: null,
                name: item.item_description.trim(),
                price_type: 'G',
                unit_price: item.unit_price,
                units_number: item.quantity,
                unit_type: 1,
                currency_code: 'ILS',
                to_doc_currency_exchange_rate: 1,
            }));
            if (tranzilaItems.length === 0) throw new Error('Tax Invoice requires at least one item');
        } else if (documentType === 'RE') {
            const totalPaymentAmount = billPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
            if (totalPaymentAmount <= 0) throw new Error('Receipt requires at least one payment with amount > 0');
            tranzilaItems = [
                {
                    type: 'I',
                    code: null,
                    name: client.name || carDetailsText || 'קבלה',
                    price_type: 'G',
                    unit_price: totalPaymentAmount,
                    units_number: 1,
                    unit_type: 1,
                    currency_code: 'ILS',
                    to_doc_currency_exchange_rate: 1,
                },
            ];
        }

        let tranzilaPayments: Record<string, string | number>[] = [];
        if (!isCancelDocument && (documentType === 'RE' || documentType === 'IR')) {
            tranzilaPayments = billPayments
                .filter((p) => p.amount && p.amount > 0)
                .map((payment) => {
                    const methodCode = paymentMethodMap[payment.payment_type];
                    if (!methodCode) throw new Error(`Unsupported payment type: ${payment.payment_type}`);
                    const basePayment = {
                        payment_method: methodCode,
                        payment_date: billData.date || new Date().toISOString().split('T')[0],
                        amount: payment.amount,
                        currency_code: 'ILS',
                        to_doc_currency_exchange_rate: 1,
                    };
                    if (payment.payment_type === 'visa') {
                        const visaFields: Record<string, string | number> = {};
                        if (payment.visa_last_four) visaFields.cc_last_4_digits = payment.visa_last_four;
                        if (payment.visa_installments && payment.visa_installments >= 2) {
                            visaFields.cc_credit_term = 8;
                            visaFields.cc_installments_number = payment.visa_installments;
                        } else {
                            visaFields.cc_credit_term = 1;
                        }
                        return { ...basePayment, ...visaFields };
                    }
                    if (payment.payment_type === 'check') {
                        return {
                            ...basePayment,
                            ...(payment.check_bank_name ? { bank: payment.check_bank_name } : {}),
                            ...(payment.check_branch ? { bank_branch: payment.check_branch } : {}),
                            ...(payment.check_account_number ? { bank_account: payment.check_account_number } : {}),
                            ...(payment.check_number ? { cheque_number: payment.check_number } : {}),
                        };
                    }
                    if (payment.payment_type === 'bank_transfer') {
                        return {
                            ...basePayment,
                            ...(payment.transfer_bank_name ? { bank: payment.transfer_bank_name } : {}),
                            ...(payment.transfer_branch ? { bank_branch: payment.transfer_branch } : {}),
                            ...(payment.transfer_account_number ? { bank_account: payment.transfer_account_number } : {}),
                        };
                    }
                    return basePayment;
                });
            if (tranzilaPayments.length === 0) throw new Error('Receipt requires at least one valid payment');
        }

        let tranzilaPaymentsForRequest: Record<string, string | number>[] = [];
        if (isRefundReceipt) {
            if (!cancelBillId) throw new Error('Refund receipt requires selecting an original receipt');
            const { data: originalPaymentsData, error: paymentsError } = await supabase
                .from('bill_payments')
                .select('payment_type, amount')
                .eq('bill_id', parseInt(cancelBillId, 10))
                .returns<Pick<BillPayment, 'payment_type' | 'amount'>[]>();
            if (paymentsError) throw new Error('Failed to load original receipt payments: ' + paymentsError.message);
            if (!originalPaymentsData?.length) {
                throw new Error('Original receipt has no payment information');
            }
            tranzilaPaymentsForRequest = originalPaymentsData.map((payment) => ({
                payment_method: paymentMethodMap[payment.payment_type],
                payment_date: billData.date,
                amount: payment.amount,
                currency_code: 'ILS',
                to_doc_currency_exchange_rate: 1,
            }));
        } else if (!isCreditNote) {
            tranzilaPaymentsForRequest = documentType === 'IN' ? [] : tranzilaPayments;
        }

        const vatPercent = isCreditNote ? 18 : documentType === 'RE' ? 0 : 18;
        await createAndStoreTranzilaDocument(billId, billData.date, {
                    document_type: documentType,
                    document_date: billData.date || new Date().toISOString().split('T')[0],
                    document_currency_code: 'ILS',
                    vat_percent: vatPercent,
                    action: isCancelDocument ? 3 : 1,
                    client_company: client.name || '',
                    client_name: client.name || '',
                    client_id: client.id_number?.toString() || '',
                    client_email: 'no-reply@car-dash.com',
                    client_phone: client.phone || '',
                    client_address_line_1: client.address || null,
                    items: tranzilaItems,
                    payments: tranzilaPaymentsForRequest,
                    created_by_user: 'car-dash',
                    created_by_system: 'car-dash',
                    ...(isCancelDocument && billData.cancel_tranzila_doc_number
                        ? {
                              canceldoc: 'Y',
                              related_document_number: parseInt(billData.cancel_tranzila_doc_number),
                              relation_type: 1,
                          }
                        : {}),
        });
    };

    const validateForm = () => {
        if (!hasSellerSignature) {
            setAlert({ message: t('signature_required_for_bill'), type: 'danger' });
            return false;
        }
        if (!party) {
            setAlert({ message: t('no_details_available'), type: 'danger' });
            return false;
        }
        if (!billType) {
            setAlert({ message: t('bill_type_required'), type: 'danger' });
            return false;
        }
        if (billType === 'credit_note' || billType === 'refund_receipt') {
            const originalBill = billsToCancel.find((bill) => String(bill.id) === cancelBillId);
            if (!originalBill || !cancelTranzilaDocNumber) {
                setAlert({ message: t('select_bill_to_cancel') || t('select_commission_to_cancel'), type: 'danger' });
                return false;
            }
            if ((parseFloat(cancelAmount) || 0) <= 0) {
                setAlert({ message: t('cancel_amount_required'), type: 'danger' });
                return false;
            }
            if (Math.round(Number(cancelAmount) * 100) !== Math.round(originalBill.total_with_tax * 100)) {
                setAlert({ message: t('cancellation_full_amount_required'), type: 'danger' });
                return false;
            }
            if (billType === 'refund_receipt' && !cancelTranzilaDocId) {
                setAlert({ message: t('original_tranzila_doc_required'), type: 'danger' });
                return false;
            }
            return true;
        }
        if ((billType === 'tax_invoice' || billType === 'tax_invoice_receipt') && (items.length === 0 || !items.every((i) => i.item_description.trim() && Number.isFinite(i.unit_price) && i.unit_price > 0 && Number.isFinite(i.quantity) && i.quantity > 0))) {
            setAlert({ message: t('commission_items_required'), type: 'danger' });
            return false;
        }
        if ((billType === 'receipt_only' || billType === 'tax_invoice_receipt') && (totalPaid <= 0 || !payments.every((p) => Number.isFinite(p.amount) && p.amount >= 0))) {
            setAlert({ message: t('payment_amount_required'), type: 'danger' });
            return false;
        }
        if (billType === 'tax_invoice_receipt' && Math.abs(Math.round(totalPaid * 100) - Math.round(totalWithTax * 100)) > 1) {
            setAlert({ message: t('tax_invoice_receipt_exact_match_required'), type: 'danger' });
            return false;
        }
        return true;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (submitting.current || billCreationReviewMessage) {
            if (billCreationReviewMessage) setAlert({ message: billCreationReviewMessage, type: 'danger' });
            return;
        }
        if (!validateForm() || !party || !car) return;

        submitting.current = true;
        setSaving(true);
        let succeeded = false;
        try {
            if (!validPurchaseSignature(await getPurchaseSignature(car.id), car)) throw new Error(t('signature_required_for_bill'));
            const isCancelDoc = billType === 'credit_note' || billType === 'refund_receipt';
            let total = 0;
            let tax_amount = 0;
            let total_with_tax = 0;

            if (isCancelDoc) {
                total_with_tax = parseFloat(cancelAmount) || 0;
                if (billType === 'credit_note') {
                    total = total_with_tax / 1.18;
                    tax_amount = total_with_tax - total;
                } else {
                    total = total_with_tax;
                    tax_amount = 0;
                }
            } else if (billType === 'tax_invoice' || billType === 'tax_invoice_receipt') {
                total = itemsTotalBeforeTax;
                tax_amount = taxAmount;
                total_with_tax = totalWithTax;
            } else if (billType === 'receipt_only') {
                total_with_tax = totalPaid;
                total = totalPaid;
                tax_amount = 0;
            }

            const billData = {
                deal_id: null,
                purchase_car_id: car.id,
                bill_type: billType,
                bill_direction: billType === 'tax_invoice' || billType === 'refund_receipt' || (billType === 'tax_invoice_receipt' && totalPaid <= (car.buy_price || 0)) ? 'negative' : 'positive',
                status,
                customer_name: party.name,
                phone: party.phone || null,
                date: billDate,
                car_details: carDetailsText,
                free_text: freeText,
                total,
                tax_amount,
                total_with_tax,
                bill_amount: isCancelDoc ? total_with_tax : null,
                bill_description: isCancelDoc ? cancelDescription || null : null,
                cancel_tranzila_doc_number: isCancelDoc ? cancelTranzilaDocNumber : null,
                cancel_tranzila_doc_id: isCancelDoc ? cancelTranzilaDocId || null : null,
                created_at: billDate ? new Date(billDate + 'T00:00:00').toISOString() : new Date().toISOString(),
            };

            const { data: billResult, error } = await supabase.from('bills').insert([billData]).select('id').single();
            if (error) throw error;
            if (!billResult) throw new Error('Failed to create bill');

            try {
                if (!isCancelDoc && (billType === 'receipt_only' || billType === 'tax_invoice_receipt')) {
                    const paymentInserts = payments
                        .filter((p) => (p.amount || 0) > 0)
                        .map((p) => ({
                            ...p,
                            id: undefined,
                            bill_id: billResult.id,
                            created_at: billData.created_at,
                        }));
                    if (paymentInserts.length > 0) {
                        const { error: paymentsError } = await supabase.from('bill_payments').insert(paymentInserts);
                        if (paymentsError) throw paymentsError;
                    }
                }
                await createTranzilaDocument(
                    billResult.id,
                    {
                        bill_type: billType,
                        date: billDate,
                        cancel_tranzila_doc_number: cancelTranzilaDocNumber || undefined,
                        cancel_amount: parseFloat(cancelAmount) || undefined,
                        cancel_description: cancelDescription || undefined,
                    },
                    items,
                    payments,
                    party,
                );
            } catch (creationError) {
                if (creationError instanceof TranzilaReconciliationRequiredError) {
                    setBillCreationReviewMessage(creationError.message);
                    throw creationError;
                }
                const { error: paymentsDeleteError } = await supabase.from('bill_payments').delete().eq('bill_id', billResult.id);
                const { error: billDeleteError } = paymentsDeleteError
                    ? { error: paymentsDeleteError }
                    : await supabase.from('bills').delete().eq('id', billResult.id);
                if (billDeleteError) {
                    const message = `Bill ${billResult.id} could not be rolled back: ${billDeleteError.message}. Review this bill before retrying.`;
                    setBillCreationReviewMessage(message);
                    throw new Error(message);
                }
                throw creationError;
            }

            succeeded = true;
            setAlert({ message: t('bill_created_successfully'), type: 'success' });
            setTimeout(() => router.push(returnTo), 1200);
        } catch (err) {
            console.error(err);
            setAlert({ message: err instanceof Error ? err.message : t('error_creating_bill'), type: 'danger' });
        } finally {
            if (!succeeded) {
                submitting.current = false;
                setSaving(false);
            }
        }
    };

    if (loading) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center gap-4">
                <div className="h-16 w-16 animate-spin rounded-full border-b-2 border-primary"></div>
                <p>{t('loading')}</p>
            </div>
        );
    }

    if (!carId || !car) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center gap-4">
                <p>{t('car_not_found')}</p>
                <Link href="/purchases-deals" className="btn btn-primary">
                    {t('back_to_purchases_deals')}
                </Link>
            </div>
        );
    }

    return (
        <PermissionGuard permission="manage_bills">
            <div className="container mx-auto p-6 pb-96">
                <div className="mb-6 flex items-center gap-5">
                    <div onClick={() => router.back()}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="mb-4 h-7 w-7 cursor-pointer text-primary rtl:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                    </div>
                    <ul className="mb-4 flex space-x-2 rtl:space-x-reverse">
                        <li>
                            <Link href="/" className="text-primary hover:underline">
                                {t('home')}
                            </Link>
                        </li>
                        <li className="before:content-['/'] ltr:before:mr-2 rtl:before:ml-2">
                            <Link href={`/purchases-deals/preview/${car.id}`} className="text-primary hover:underline">
                                {t('purchases_deals')}
                            </Link>
                        </li>
                        <li className="before:content-['/'] ltr:before:mr-2 rtl:before:ml-2">
                            <span>{t('create_bill')}</span>
                        </li>
                    </ul>
                </div>

                <div className="mb-6">
                    <h1 className="text-2xl font-bold">{t('create_bill')}</h1>
                    <p className="text-gray-500">
                        {carDetailsText} {party ? `— ${party.name}` : ''}
                    </p>
                </div>

                {alert && (
                    <div className="fixed top-4 right-4 z-50 min-w-80 max-w-md">
                        <Alert type={alert.type} title={alert.type === 'success' ? t('success') : t('error')} message={alert.message} onClose={() => setAlert(null)} />
                    </div>
                )}

                {!party ? (
                    <div className="panel py-10 text-center text-gray-500">{t('no_details_available')}</div>
                ) : !hasSellerSignature ? (
                    <div className="panel space-y-4 py-10 text-center">
                        <p>{t('signature_required_for_bill')}</p>
                        <Link href={`/purchases-deals/preview/${car.id}`} className="btn btn-primary inline-flex">{t('sign_purchase')}</Link>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="panel border-2 border-primary/20 bg-gradient-to-r from-primary/10 to-secondary/10">
                            <div className="mb-5 flex items-center gap-3">
                                <IconUser className="h-5 w-5 text-primary" />
                                <h5 className="text-xl font-bold text-primary dark:text-white-light">
                                    {party.kind === 'provider' ? t('provider_information') : t('customer_information')}
                                </h5>
                            </div>
                            <div className="grid grid-cols-1 gap-4 rounded-lg border bg-white p-4 md:grid-cols-2 lg:grid-cols-4 dark:bg-gray-800">
                                <div>
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                        {party.kind === 'provider' ? t('provider') : t('customer')}
                                    </label>
                                    <p className="text-sm text-gray-900 dark:text-white">{party.name}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('phone')}</label>
                                    <p className="text-sm text-gray-900 dark:text-white">{party.phone || '-'}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('address')}</label>
                                    <p className="text-sm text-gray-900 dark:text-white">{party.address || '-'}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('id_number')}</label>
                                    <p className="text-sm text-gray-900 dark:text-white">{party.id_number || '-'}</p>
                                </div>
                            </div>
                        </div>

                        <div className="panel">
                            <div className="mb-5 flex items-center gap-3">
                                <IconDollarSign className="h-5 w-5 text-primary" />
                                <h5 className="text-lg font-semibold dark:text-white-light">{t('bill_type')}</h5>
                            </div>
                            <CommissionTypeSelect
                                defaultValue={billType}
                                onChange={(type) => {
                                    setBillType(type);
                                    setCancelBillId('');
                                    setCancelTranzilaDocId('');
                                    setCancelTranzilaDocNumber('');
                                    setCancelAmount('');
                                    setCancelDescription('');
                                }}
                                showCreditNote={true}
                                showRefundReceipt={true}
                            />
                        </div>

                        {billType && (
                            <div className="panel">
                                <div className="mb-5 flex items-center gap-3">
                                    <IconCalendar className="h-5 w-5 text-primary" />
                                    <h5 className="text-lg font-semibold dark:text-white-light">{t('date')}</h5>
                                </div>
                                <DateInput value={billDate} onChange={setBillDate} className="form-input max-w-xs" />
                            </div>
                        )}

                        {(billType === 'credit_note' || billType === 'refund_receipt') && (
                            <div className="panel">
                                <div className="mb-4">
                                    <label className="mb-2 block text-sm font-medium">{t('select_bill_to_cancel') || t('select_commission_to_cancel')}</label>
                                    {billsToCancel.length > 0 ? (
                                        <select
                                            className="form-select"
                                            value={cancelBillId}
                                            onChange={(e) => {
                                                const selected = carBills.find((b) => b.id.toString() === e.target.value);
                                                setCancelBillId(e.target.value);
                                                setCancelTranzilaDocId(selected?.tranzila_document_id || '');
                                                setCancelTranzilaDocNumber(selected?.tranzila_document_number || '');
                                                setCancelAmount(selected?.total_with_tax?.toString() || '');
                                            }}
                                        >
                                            <option value="">{t('select')}</option>
                                            {billsToCancel
                                                .map((b) => (
                                                    <option key={b.id} value={b.id}>
                                                        #{b.tranzila_document_number || b.id} — ₪{Number(b.total_with_tax || 0).toLocaleString()}
                                                    </option>
                                                ))}
                                        </select>
                                    ) : (
                                        <p className="text-sm text-gray-500">{t('no_bills_to_cancel')}</p>
                                    )}
                                </div>
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    <div>
                                        <label className="mb-2 block text-sm font-medium">{t('amount')}</label>
                                        <input type="number" className="form-input" value={cancelAmount} onChange={(e) => setCancelAmount(e.target.value)} />
                                    </div>
                                    <div>
                                        <label className="mb-2 block text-sm font-medium">{t('description')}</label>
                                        <input type="text" className="form-input" value={cancelDescription} onChange={(e) => setCancelDescription(e.target.value)} />
                                    </div>
                                </div>
                            </div>
                        )}

                        {(billType === 'tax_invoice' || billType === 'tax_invoice_receipt') && (
                            <div className="panel">
                                <div className="mb-5 flex items-center justify-between">
                                    <h5 className="text-lg font-semibold dark:text-white-light">{t('items') || t('commission_items')}</h5>
                                    <button type="button" className="btn btn-outline-primary btn-sm gap-1" onClick={addItem}>
                                        <IconPlus className="h-4 w-4" />
                                        {t('add_item')}
                                    </button>
                                </div>
                                <div className="space-y-3">
                                    {items.map((item) => (
                                        <div key={item.id} className="grid grid-cols-1 items-end gap-3 md:grid-cols-12">
                                            <div className="md:col-span-6">
                                                <label className="mb-1 block text-xs text-gray-500">{t('description')}</label>
                                                <input
                                                    type="text"
                                                    className="form-input"
                                                    value={item.item_description}
                                                    onChange={(e) => updateItem(item.id, 'item_description', e.target.value)}
                                                />
                                            </div>
                                            <div className="md:col-span-2">
                                                <label className="mb-1 block text-xs text-gray-500">{t('price')}</label>
                                                <input
                                                    type="number"
                                                    className="form-input"
                                                    value={item.unit_price}
                                                    onChange={(e) => updateItem(item.id, 'unit_price', e.target.value)}
                                                />
                                            </div>
                                            <div className="md:col-span-2">
                                                <label className="mb-1 block text-xs text-gray-500">{t('quantity')}</label>
                                                <input
                                                    type="number"
                                                    className="form-input"
                                                    value={item.quantity}
                                                    onChange={(e) => updateItem(item.id, 'quantity', e.target.value)}
                                                />
                                            </div>
                                            <div className="md:col-span-2 flex items-center gap-2">
                                                <span className="font-medium">₪{((item.unit_price || 0) * (item.quantity || 1)).toLocaleString()}</span>
                                                <button type="button" className="text-danger" onClick={() => removeItem(item.id)} disabled={items.length === 1}>
                                                    <IconTrash className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-4 border-t pt-3 text-sm">
                                    <div className="flex justify-between">
                                        <span>{t('total_before_tax')}</span>
                                        <span>₪{itemsTotalBeforeTax.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>{t('tax')}</span>
                                        <span>₪{taxAmount.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between font-bold">
                                        <span>{t('total_with_tax')}</span>
                                        <span>₪{totalWithTax.toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {(billType === 'receipt_only' || billType === 'tax_invoice_receipt') && (
                            <div className="panel">
                                <div className="mb-5 flex items-center gap-3">
                                    <IconMinusCircle className="h-5 w-5 text-primary" />
                                    <h5 className="text-lg font-semibold dark:text-white-light">{t('payments')}</h5>
                                </div>
                                <MultiplePaymentForm payments={payments} onPaymentsChange={setPayments} totalAmount={totalAmountForPaymentForm} />
                            </div>
                        )}

                        {billType && (
                            <div className="panel">
                                <label className="mb-2 block text-sm font-medium">{t('notes')}</label>
                                <textarea className="form-textarea" rows={3} value={freeText} onChange={(e) => setFreeText(e.target.value)} />
                                <div className="mt-4">
                                    <label className="mb-2 block text-sm font-medium">{t('status')}</label>
                                    <select className="form-select max-w-xs" value={status} onChange={(e) => setStatus(e.target.value)}>
                                        <option value="pending">{t('pending')}</option>
                                        <option value="paid">{t('paid')}</option>
                                        <option value="cancelled">{t('cancelled')}</option>
                                    </select>
                                </div>
                            </div>
                        )}

                        {billType && (
                            <div className="flex justify-end gap-3">
                                <button type="button" className="btn btn-outline-secondary" onClick={() => router.back()} disabled={saving}>
                                    {t('cancel')}
                                </button>
                                <button type="submit" className="btn btn-primary" disabled={saving || !!billCreationReviewMessage}>
                                    {saving ? t('saving') : t('create_bill')}
                                </button>
                            </div>
                        )}
                    </form>
                )}
            </div>
        </PermissionGuard>
    );
};

export default AddPurchaseInvoice;
