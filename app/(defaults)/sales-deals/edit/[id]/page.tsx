'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import supabase from '@/lib/supabase';
import { Alert } from '@/components/elements/alerts/elements-alerts-default';
import { getTranslation } from '@/i18n';
import { generateBillPDF, BillData } from '@/utils/pdf-generator';
import Cookies from 'universal-cookie';
import { formatDate } from '@/utils/date-formatter';
import DealTypeSelect from '@/components/deal-type-select/deal-type-select';
import CustomerSelect from '@/components/customer-select/customer-select';
import CarSelect from '@/components/car-select/car-select';
import BillTypeSelect from '@/components/bill-type-select/bill-type-select';
import PaymentTypeSelect from '@/components/payment-type-select/payment-type-select';
import SingleFileUpload from '@/components/file-upload/single-file-upload';
import CreateCustomerModal from '@/components/modals/create-customer-modal';
import DealPaymentMethods, { PaymentMethod } from '@/components/deal-payment-methods/deal-payment-methods';
import { Deal, Customer, Car, FileItem, DealAttachments, DealAttachment } from '@/types';
import { BillWithPayments } from '@/types/payment';
import { usePermissions } from '@/hooks/usePermissions';

interface Bill extends BillWithPayments {
    amount: number;
    total_amount: number;
    // Legacy payment fields for backward compatibility
    payment_type?: string;
    visa_amount?: number;
    bank_amount?: number;
    transfer_amount?: number;
    check_amount?: number;
    cash_amount?: number;
    bill_amount?: number;
}

// Helper function to convert Bill to BillData format
const convertBillToBillData = (bill: Bill): BillData => {
    return {
        id: bill.id,
        bill_type: bill.bill_type,
        customer_name: bill.customer_name,
        customer_phone: bill.phone,
        created_at: bill.date,

        // Map the bill fields to BillData format
        bill_amount: bill.bill_amount || bill.total,
        bill_description: bill.car_details || '',

        // Tax invoice fields
        total: bill.total,
        tax_amount: bill.tax_amount,
        total_with_tax: bill.total_with_tax,
        commission: bill.commission,
        car_details: bill.car_details,

        // Payment fields
        payment_type: bill.payment_type,
        cash_amount: bill.cash_amount,
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
                  selling_price: bill.deal?.selling_price,
                  car: bill.deal?.car
                      ? {
                            buy_price: bill.deal.car.buy_price,
                            sale_price: bill.deal?.selling_price,
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
                  seller: bill.deal?.seller
                      ? {
                            name: bill.deal.seller.name,
                            id_number: bill.deal.seller.id_number,
                        }
                      : undefined,
                  buyer: bill.deal?.buyer
                      ? {
                            name: bill.deal.buyer.name,
                            id_number: bill.deal.buyer.id_number,
                        }
                      : undefined,
              }
            : undefined,
    };
};

// Define BillPayment type locally since it's not exported from @/types
interface BillPayment {
    payment_type: string;
    amount: number;
    visa_installments?: number;
    visa_card_type?: string;
    visa_last_four?: string;
    approval_number?: string;
    bank_name?: string;
    bank_branch?: string;
    transfer_amount?: number;
    transfer_bank_name?: string;
    transfer_branch?: string;
    transfer_account_number?: string;
    transfer_branch_number?: string;
    transfer_number?: string;
    transfer_holder_name?: string;
    check_bank_name?: string;
    check_branch?: string;
    check_branch_number?: string;
    check_account_number?: string;
    check_number?: string;
    check_holder_name?: string;
}

/**
 * Create invoice/receipt document in Tranzila
 */
const createTranzilaDocument = async (billId: number, billData: any, payments: BillPayment[], deal?: Deal | null, selectedCar?: Car | null) => {
    const { t } = getTranslation();
    try {
        // Map bill type to Tranzila document type
        // Document types from Tranzila API:
        // - IR = Tax invoice / receipt (combined)
        // - IN = Tax invoice (only)
        // - RE = Receipt (only)
        // - DI = Deal Invoice
        const documentTypeMap: Record<string, string> = {
            general: 'IR', // Invoice+Receipt (default)
            tax_invoice: 'IN', // Tax Invoice only
            receipt_only: 'RE', // Receipt only
            tax_invoice_receipt: 'IR', // Invoice+Receipt
        };

        // Map payment type to Tranzila payment method
        // Payment methods from Tranzila API:
        // 1 = Credit Card, 3 = Cheque, 4 = Bank Transfer, 5 = Cash, 6 = PayPal, 10 = Other
        const paymentMethodMap: Record<string, number> = {
            visa: 1, // Credit Card
            cash: 5, // Cash
            check: 3, // Cheque
            bank_transfer: 4, // Bank Transfer
        };

        const documentType = documentTypeMap[billData.bill_type] || 'IR';

        // Calculate total payment amount
        const totalPaymentAmount = payments.reduce((sum, payment) => sum + (payment.amount || 0), 0);

        // Create single item with total payment amount as unit_price
        // Build a descriptive name for the item
        let itemName = 'קבלה'; // Default: Receipt
        if (deal && selectedCar) {
            // Include car details in name
            itemName = `${selectedCar.brand} ${selectedCar.title} ${selectedCar.year}${selectedCar.car_number ? ` - ${selectedCar.car_number}` : ''}`;
        } else if (billData.car_details) {
            itemName = billData.car_details;
        } else if (billData.customer_name) {
            itemName = billData.customer_name;
        }

        const items = [
            {
                type: 'I',
                code: null,
                name: itemName,
                price_type: 'G', // Gross (includes VAT)
                unit_price: totalPaymentAmount,
                units_number: 1,
                unit_type: 1,
                currency_code: 'ILS',
                to_doc_currency_exchange_rate: 1,
            },
        ];

        // Prepare payments array with all payment details
        const tranzilaPayments =
            payments.length > 0
                ? payments
                      .filter((payment) => payment.amount && payment.amount > 0) // Filter out payments with 0 or invalid amounts
                      .map((payment) => {
                          const basePayment = {
                              payment_method: paymentMethodMap[payment.payment_type] || 1,
                              payment_date: billData.date || new Date().toISOString().split('T')[0],
                              amount: payment.amount,
                              currency_code: 'ILS',
                              to_doc_currency_exchange_rate: 1,
                          };

                          // Add payment-type-specific fields
                          if (payment.payment_type === 'visa') {
                              return {
                                  ...basePayment,
                                  cc_last_4_digits: payment.visa_last_four || null,
                                  cc_installments_number: payment.visa_installments || 1,
                                  cc_type: payment.visa_card_type || null,
                                  approval_number: payment.approval_number || null,
                              };
                          } else if (payment.payment_type === 'check') {
                              return {
                                  ...basePayment,
                                  check_number: payment.check_number || null,
                                  check_bank_name: payment.check_bank_name || null,
                                  check_branch: payment.check_branch || null,
                                  check_account_number: payment.check_account_number || null,
                                  check_holder_name: payment.check_holder_name || null,
                              };
                          } else if (payment.payment_type === 'bank_transfer') {
                              return {
                                  ...basePayment,
                                  bank: payment.transfer_bank_name || null,
                                  transfer_number: payment.transfer_number || null,
                                  transfer_branch: payment.transfer_branch || null,
                                  transfer_account_number: payment.transfer_account_number || null,
                                  transfer_holder_name: payment.transfer_holder_name || null,
                              };
                          }

                          // Cash or other payment types
                          return basePayment;
                      })
                : [
                      {
                          payment_method: 1, // Default to credit card
                          payment_date: billData.date || new Date().toISOString().split('T')[0],
                          amount: parseFloat(billData.total_with_tax) || 0,
                          currency_code: 'ILS',
                          to_doc_currency_exchange_rate: 1,
                      },
                  ];

        // Validate payments only for receipts (RE, IR)
        // Tax invoices (IN) don't require payment confirmation
        const requiresPayments = documentType === 'RE' || documentType === 'IR';

        if (requiresPayments) {
            const hasValidPayments = tranzilaPayments.some((p) => p.amount && p.amount > 0);
            if (!hasValidPayments) {
                throw new Error('No valid payments found. Receipts require at least one payment with amount > 0.');
            }
        }

        // Get customer information from deal
        let customerId = ''; // Default fallback for missing ID
        let customerEmail = ''; // Default fallback
        let customerPhone = '';

        if (deal) {
            // Get customer based on deal type
            if (deal.deal_type === 'intermediary') {
                // For intermediary deals, prefer seller, then buyer
                const customer = deal.seller || deal.buyer || deal.customers;
                if (customer) {
                    customerId = customer.id_number?.toString() || customerId;
                    customerEmail = (customer as any).email || customerEmail;
                    customerPhone = (customer as any).phone || '';
                }
            } else {
                // For regular deals, use customer
                if (deal.customers) {
                    customerId = deal.customers.id_number?.toString() || customerId;
                    customerEmail = (deal.customers as any).email || customerEmail;
                    customerPhone = (deal.customers as any).phone || '';
                }
            }
        }

        // Call Tranzila API
        const response = await fetch('/api/tranzila', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'create_document',
                data: {
                    document_type: documentType,
                    document_date: billData.date || new Date().toISOString().split('T')[0],
                    document_currency_code: 'ILS',
                    vat_percent: documentType === 'RE' ? 0 : 18,
                    client_company: billData.customer_name || t('unknown_customer'),
                    client_name: billData.customer_name || t('unknown_customer'),
                    client_id: customerId,
                    client_email: customerEmail || 'no-reply@car-dash.com',
                    client_phone: customerPhone || undefined,
                    items,
                    payments: tranzilaPayments,
                    created_by_user: 'car-dash',
                    created_by_system: 'car-dash',
                },
            }),
        });

        const result = await response.json();

        // Check if Tranzila returned an error
        if (!result.ok || !result.response || result.response.status_code !== 0) {
            const errorMsg = result.response?.status_msg || 'Unknown Tranzila error';
            const statusCode = result.response?.status_code || 'N/A';
            throw new Error(`Tranzila error (${statusCode}): ${errorMsg}`);
        }

        // Document created successfully, update bill record with Tranzila info
        const { error: updateError } = await supabase
            .from('bills')
            .update({
                tranzila_document_id: result.response.document.id,
                tranzila_document_number: result.response.document.number,
                tranzila_retrieval_key: result.response.document.retrieval_key,
                tranzila_created_at: billData.date ? new Date(billData.date + 'T00:00:00').toISOString() : result.response.document.created_at,
            })
            .eq('id', billId);

        if (updateError) {
            throw new Error('Failed to update bill with Tranzila data: ' + updateError.message);
        }

        console.log('Tranzila document created successfully:', result.response.document.number);
    } catch (error) {
        console.error('Error calling Tranzila API:', error);
        throw error;
    }
};

import { uploadMultipleFiles, deleteFile, uploadFile } from '@/utils/file-upload';
import { formatCurrency } from '@/utils/number-formatter';
import AttachmentsDisplay from '@/components/attachments/attachments-display';
import { handleReceiptCreated, getCustomerIdFromDeal, getCustomerIdByName } from '@/utils/balance-manager';
import { MultiplePaymentForm } from '@/components/forms/multiple-payment-form';
import IconNotes from '@/components/icon/icon-notes';
import IconCar from '@/components/icon/icon-car';
import IconDollarSign from '@/components/icon/icon-dollar-sign';
import IconUser from '@/components/icon/icon-user';
import IconCaretDown from '@/components/icon/icon-caret-down';
import IconPlus from '@/components/icon/icon-plus';
import IconEye from '@/components/icon/icon-eye';
import IconReceipt from '@/components/icon/icon-receipt';
import IconCalendar from '@/components/icon/icon-calendar';
import IconPdf from '@/components/icon/icon-pdf';
import BillsTable from '@/components/bills/bills-table';
import IconDocument from '@/components/icon/icon-document';
import IconPaperclip from '@/components/icon/icon-paperclip';
import IconCreditCard from '@/components/icon/icon-credit-card';
import IconTrashLines from '@/components/icon/icon-trash-lines';

const EditDeal = ({ params }: { params: { id: string } }) => {
    const { t } = getTranslation();
    const router = useRouter();
    const { hasPermission } = usePermissions();
    const [activeTab, setActiveTab] = useState<'info' | 'attachments' | 'payments' | 'bills'>('info');
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(true);
    const [showCreateCustomerModal, setShowCreateCustomerModal] = useState(false);
    const [customerCreationContext, setCustomerCreationContext] = useState<'customer' | 'seller' | 'buyer'>('customer'); // Track which customer we're creating
    const [deal, setDeal] = useState<Deal | null>(null);
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [selectedSeller, setSelectedSeller] = useState<Customer | null>(null);
    const [selectedBuyer, setSelectedBuyer] = useState<Customer | null>(null);
    const [selectedCar, setSelectedCar] = useState<Car | null>(null);
    const [carTakenFromClient, setCarTakenFromClient] = useState<Car | null>(null);
    const [dealDate, setDealDate] = useState(new Date().toISOString().split('T')[0]);
    const [hasCustomerSignature, setHasCustomerSignature] = useState(false);
    const dealId = params.id;

    // Bill creation state
    const [isBillSectionExpanded, setIsBillSectionExpanded] = useState(false);
    const [creatingBill, setCreatingBill] = useState(false);

    // New multiple payments state for receipts
    const [payments, setPayments] = useState<BillPayment[]>([
        {
            payment_type: 'cash',
            amount: 0,
        },
    ]);

    // Deal payment methods state
    const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
    const [paymentNotes, setPaymentNotes] = useState<string>('');

    const [billForm, setBillForm] = useState({
        bill_type: '',
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
        visa_amount: '',
        visa_installments: '',
        visa_card_type: '',
        visa_last_four: '',
        bank_amount: '',
        bank_name: '',
        bank_branch: '',
        approval_number: '',
        account_number: '',
        transfer_number: '',
        transfer_holder_name: '',
        transfer_amount: '',
        transfer_bank_name: '',
        transfer_branch: '',
        transfer_account_number: '',
        transfer_branch_number: '',
        check_amount: '',
        check_bank_name: '',
        check_branch_number: '',
        check_account_number: '',
        check_number: '',
        check_holder_name: '',
        check_branch: '',
        cash_amount: '',
        // General bill fields
        bill_direction: 'positive',
        bill_description: '',
        bill_amount: '',
    });

    // Helper function to format currency
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'ILS',
        }).format(amount);
    };

    // Helper function to get bill amount based on bill type and payment method
    const getBillAmount = (bill: any) => {
        if (bill.bill_type === 'general') {
            return parseFloat(bill.bill_amount || '0');
        }

        if (bill.bill_type === 'tax_invoice') {
            return parseFloat(bill.total_with_tax || '0');
        }

        // For receipt types, calculate total from payments array if available
        if (bill.bill_type === 'receipt_only' || bill.bill_type === 'tax_invoice_receipt') {
            // If using new multiple payments structure, calculate total from payments
            if (bill.payments && bill.payments.length > 0) {
                return bill.payments.reduce((sum: number, payment: any) => sum + (payment.amount || 0), 0);
            }

            // Otherwise, use legacy payment fields
            switch (bill.payment_type?.toLowerCase()) {
                case 'bank_transfer':
                    return parseFloat(bill.bank_amount || bill.transfer_amount || '0');
                case 'check':
                    return parseFloat(bill.check_amount || '0');
                case 'visa':
                    return parseFloat(bill.visa_amount || '0');
                case 'cash':
                    return parseFloat(bill.cash_amount || '0');
                default:
                    return parseFloat(bill.total_with_tax || '0');
            }
        }

        return 0;
    };

    // Helper function to calculate deal balance
    const calculateDealBalance = () => {
        if (!deal) return 0;

        let dealAmount = deal.selling_price || deal.amount || 0;

        // For exchange deals, subtract the customer car evaluation value
        if (deal.deal_type === 'exchange' && carTakenFromClient) {
            const carEvaluation = carTakenFromClient.buy_price || 0;
            dealAmount -= carEvaluation;
        }

        // Deduct register orders (أمر سجل)
        if (registerOrders && registerOrders.length > 0) {
            const totalDeductions = registerOrders.reduce((sum, order) => sum + order.amount, 0);
            dealAmount += totalDeductions; // Add because dealAmount is the remaining debt, deductions increase it
        }

        // Calculate total payments from bills
        let totalPaid = 0;
        bills.forEach((bill) => {
            const billAmount = getBillAmount(bill);
            // Only count positive bills (receipts) as payments
            if (bill.bill_direction !== 'negative') {
                totalPaid += billAmount;
            }
        });

        return dealAmount - totalPaid;
    };

    const [dealType, setDealType] = useState('');
    const [form, setForm] = useState({
        title: '',
        description: '',
        amount: '',
        status: '',
        customer_id: '',
        seller_id: '',
        buyer_id: '',
        car_id: '',
        loss_amount: '',
        selling_price: '',
        customer_car_eval_value: '',
        additional_customer_amount: '',
        additional_company_amount: '',
    }); // State for file attachments
    const [dealAttachments, setDealAttachments] = useState<DealAttachments>({
        carLicense: null,
        driverLicense: null,
        carTransferDocument: null,
    });
    const [existingAttachments, setExistingAttachments] = useState<DealAttachment[]>([]);
    const [newAttachments, setNewAttachments] = useState<{ [key: string]: FileItem }>({});
    const [deletingAttachment, setDeletingAttachment] = useState<string | null>(null);

    const [alert, setAlert] = useState<{ message: string; type: 'success' | 'danger' } | null>(null);

    // Bill related states
    const [billType, setBillType] = useState('');
    const [billStatus, setBillStatus] = useState('');
    const [paymentType, setPaymentType] = useState('');
    const [showBillSection, setShowBillSection] = useState(false);
    const [billFormLegacy, setBillFormLegacy] = useState({
        billTitle: '',
        billDescription: '',
        billAmount: '',
        billStatus: '',
        paymentType: '',
    });

    // Bills states
    const [bills, setBills] = useState<any[]>([]);
    const [loadingBills, setLoadingBills] = useState(false);
    const [selectedBill, setSelectedBill] = useState<any>(null);
    const [showBillModal, setShowBillModal] = useState(false);
    const [downloadingPDF, setDownloadingPDF] = useState<string | null>(null);

    // Register Order states
    const [registerOrderForm, setRegisterOrderForm] = useState({
        amount: '',
        description: '',
    });
    const [creatingRegisterOrder, setCreatingRegisterOrder] = useState(false);
    const [registerOrders, setRegisterOrders] = useState<Array<{ amount: number; description: string; created_at: string }>>([]);

    // Cancel deal confirmation modal state
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [cancelReason, setCancelReason] = useState('');
    const [cancellingDeal, setCancellingDeal] = useState(false);

    useEffect(() => {
        const fetchDeal = async () => {
            try {
                const { data, error } = await supabase.from('deals').select('*').eq('id', dealId).single();

                if (error) throw error;
                if (data) {
                    setDeal(data);
                    setDealType(data.deal_type || '');
                    // Set the deal date from the existing deal's created_at, or default to today
                    setDealDate(data.created_at ? new Date(data.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);

                    // Check for customer signature
                    const { data: signatureData } = await supabase.from('deal_signatures').select('customer_signature_url').eq('deal_id', dealId).single();

                    setHasCustomerSignature(!!signatureData?.customer_signature_url);

                    // Load payment methods if they exist
                    if (data.payment_methods && Array.isArray(data.payment_methods)) {
                        setPaymentMethods(data.payment_methods);
                    }

                    // Load payment notes if they exist
                    if (data.payment_notes) {
                        setPaymentNotes(data.payment_notes);
                    }

                    // Load register orders if they exist
                    if (data.register_orders && Array.isArray(data.register_orders)) {
                        setRegisterOrders(data.register_orders);
                    }

                    setForm({
                        title: data.title || '',
                        description: data.description || '',
                        amount: data.amount?.toString() || '0',
                        selling_price: data.selling_price?.toString() || '',
                        status: data.status || 'active',
                        customer_id: data.customer_id || '',
                        seller_id: data.seller_id || '',
                        buyer_id: data.buyer_id || '',
                        car_id: data.car_id || '',
                        loss_amount: data.loss_amount?.toString() || '',
                        customer_car_eval_value: data.customer_car_eval_value?.toString() || '',
                        additional_customer_amount: data.additional_customer_amount?.toString() || '',
                        additional_company_amount: data.additional_company_amount?.toString() || '',
                    });

                    // Set existing attachments
                    if (data.attachments && Array.isArray(data.attachments)) {
                        setExistingAttachments(data.attachments);
                    }

                    // Fetch customer details if customer_id exists
                    if (data.customer_id) {
                        const { data: customerData } = await supabase.from('customers').select('*').eq('id', data.customer_id).single();
                        if (customerData) {
                            setSelectedCustomer(customerData);
                        }
                    }

                    // Fetch seller details if seller_id exists (for intermediary deals)
                    if (data.seller_id) {
                        const { data: sellerData } = await supabase.from('customers').select('*').eq('id', data.seller_id).single();
                        if (sellerData) {
                            setSelectedSeller(sellerData);
                        }
                    }

                    // Fetch buyer details if buyer_id exists (for intermediary deals)
                    if (data.buyer_id) {
                        const { data: buyerData } = await supabase.from('customers').select('*').eq('id', data.buyer_id).single();
                        if (buyerData) {
                            setSelectedBuyer(buyerData);
                        }
                    } // Fetch car details if car_id exists
                    if (data.car_id) {
                        const { data: carData } = await supabase.from('cars').select('*').eq('id', data.car_id).single();
                        if (carData) {
                            setSelectedCar(carData);
                        }
                    }

                    // Fetch car taken from client details if car_taken_from_client exists (for exchange deals)
                    if (data.car_taken_from_client) {
                        const { data: carTakenData } = await supabase.from('cars').select('*').eq('id', data.car_taken_from_client).single();
                        if (carTakenData) {
                            setCarTakenFromClient(carTakenData);
                        }
                    }
                }
            } catch (error) {
                console.error('Error fetching deal:', error);
                setAlert({ message: t('error_loading_data'), type: 'danger' });
            } finally {
                setLoading(false);
            }
        };
        if (dealId) {
            fetchDeal();
            fetchBills();
        }
    }, [dealId]);

    // Auto-populate bill form when bill section is expanded
    useEffect(() => {
        if (isBillSectionExpanded && deal && selectedCar) {
            // Use selling_price instead of amount for bill calculations
            const dealSellingPrice = billForm.bill_type === 'receipt_only' ? deal.selling_price || 0 : deal.deal_type === 'new_used_sale_tax_inclusive' ? deal.selling_price || 0 : deal.amount || 0;

            // For intermediary deals, use seller/buyer info
            if (deal.deal_type === 'intermediary' && (selectedSeller || selectedBuyer)) {
                const customerInfo = selectedSeller || selectedBuyer;
                setBillForm((prev) => ({
                    ...prev,
                    customer_name: customerInfo?.name || '',
                    phone: customerInfo?.phone || '',
                    car_details: selectedCar ? `${selectedCar.brand} ${selectedCar.title} ${selectedCar.year}` : '',
                    total: (dealSellingPrice / 1.18).toFixed(0), // Price before tax
                    tax_amount: ((dealSellingPrice / 1.18) * 0.18).toFixed(0), // 18% tax
                    total_with_tax: dealSellingPrice?.toString() || '', // Deal selling price already includes tax
                }));
            }
            // For other deal types, use regular customer
            else if (selectedCustomer) {
                setBillForm((prev) => ({
                    ...prev,
                    customer_name: selectedCustomer.name || '',
                    phone: selectedCustomer.phone || '',
                    car_details: selectedCar ? `${selectedCar.brand} ${selectedCar.title} ${selectedCar.year}` : '',
                    total: (dealSellingPrice / 1.18).toFixed(0), // Price before tax
                    tax_amount: ((dealSellingPrice / 1.18) * 0.18).toFixed(0), // 18% tax
                    total_with_tax: dealSellingPrice?.toString() || '', // Deal selling price already includes tax
                }));
            }
        }
    }, [isBillSectionExpanded, deal, selectedCustomer, selectedSeller, selectedBuyer, selectedCar, billForm.bill_type]);

    // Auto-calculate exchange fields when data is loaded
    useEffect(() => {
        if (dealType === 'exchange' && carTakenFromClient && selectedCar) {
            const purchasePrice = carTakenFromClient.buy_price || 0;
            const salePrice = selectedCar.sale_price || 0;
            const difference = salePrice - purchasePrice;

            setForm((prev) => ({
                ...prev,
                customer_car_eval_value: purchasePrice.toString(),
                additional_customer_amount: difference > 0 ? difference.toString() : '0',
                additional_company_amount: difference < 0 ? Math.abs(difference).toString() : '0',
            }));
        }
    }, [dealType, carTakenFromClient, selectedCar]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        // Prevent any input changes if deal is completed or cancelled
        if (deal?.status === 'completed') {
            setAlert({ message: t('deal_completed_no_edit'), type: 'danger' });
            return;
        }
        if (deal?.status === 'cancelled') {
            setAlert({ message: t('deal_cancelled_no_edit'), type: 'danger' });
            return;
        }

        const { name, value } = e.target;
        setForm((prev) => {
            const updated = { ...prev, [name]: value };

            // Update the selected car's sale_price in real-time when selling_price changes for any deal type
            if (name === 'selling_price' && value && selectedCar) {
                const sellingPrice = parseFloat(value);
                if (!isNaN(sellingPrice)) {
                    // Use a small tolerance to handle floating point precision issues
                    if (Math.abs(sellingPrice - selectedCar.sale_price) > 0.001) {
                        setSelectedCar((prevCar) => (prevCar ? { ...prevCar, sale_price: sellingPrice } : null));
                    }
                }
            }

            // Auto-calculate deal amount when selling_price or loss_amount changes for sale deals
            if (
                (name === 'selling_price' || name === 'loss_amount') &&
                (dealType === 'new_used_sale' || dealType === 'new_sale' || dealType === 'used_sale' || dealType === 'new_used_sale_tax_inclusive') &&
                selectedCar
            ) {
                const sellingPrice = parseFloat(name === 'selling_price' ? value : updated.selling_price || '0');
                const buyPrice = selectedCar.buy_price || 0;
                const lossAmount = parseFloat(name === 'loss_amount' ? value : updated.loss_amount || '0');
                const profitCommission = sellingPrice - buyPrice - lossAmount;

                // Update the amount field with the calculated profit commission
                updated.amount = Math.max(0, profitCommission).toString(); // Ensure amount doesn't go negative
            }
            // Auto-calculate amount when loss_amount changes (fallback for other deal types)
            else if (name === 'loss_amount' && deal) {
                const originalAmount = deal.amount || 0;
                const lossAmount = parseFloat(value) || 0;
                const newAmount = originalAmount - lossAmount;

                // Update the amount field
                updated.amount = Math.max(0, newAmount).toString(); // Ensure amount doesn't go negative
            }

            // Auto-calculate exchange fields when relevant values change for exchange deals
            if (dealType === 'exchange' && carTakenFromClient && selectedCar) {
                const purchasePrice = carTakenFromClient.buy_price || 0;
                const salePrice = parseFloat(updated.selling_price || '0') || 0;
                const difference = salePrice - purchasePrice;

                // Set customer_car_eval_value to the purchase price from customer (buy_price of taken car)
                updated.customer_car_eval_value = purchasePrice.toString();

                // Calculate which side pays the additional amount
                if (difference > 0) {
                    // Company's car is more expensive, customer pays the difference
                    updated.additional_customer_amount = difference.toString();
                    updated.additional_company_amount = '0';
                } else if (difference < 0) {
                    // Customer's car is more expensive, company pays the difference
                    updated.additional_company_amount = Math.abs(difference).toString();
                    updated.additional_customer_amount = '0';
                } else {
                    // Equal value
                    updated.additional_customer_amount = '0';
                    updated.additional_company_amount = '0';
                }
            }

            return updated;
        });
    };

    // Fetch bills related to this deal
    const fetchBills = async () => {
        setLoadingBills(true);
        try {
            const { data, error } = await supabase
                .from('bills')
                .select(
                    `
                    *, 
                    deal:deals(
                        title, 
                        deal_type,
                        amount,
                        loss_amount,
                        selling_price,
                        customer:customers!deals_customer_id_fkey(id, name, id_number),
                        seller:customers!deals_seller_id_fkey(id, name, id_number),
                        buyer:customers!deals_buyer_id_fkey(id, name, id_number),
                        car:cars!deals_car_id_fkey(id, title, brand, year, buy_price, car_number)
                    ),
                    payments:bill_payments(*)
                `,
                )
                .eq('deal_id', dealId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setBills(data || []);
        } catch (error) {
            console.error('Error fetching bills:', error);
        } finally {
            setLoadingBills(false);
        }
    };

    // View bill in modal
    const handleViewBill = (bill: any) => {
        setSelectedBill(bill);
        setShowBillModal(true);
    };

    // Close bill modal
    const closeBillModal = () => {
        setShowBillModal(false);
        setSelectedBill(null);
    };

    // Handle register order creation
    const handleCreateRegisterOrder = async () => {
        // Validate form
        if (!registerOrderForm.amount || parseFloat(registerOrderForm.amount) <= 0) {
            setAlert({ message: t('amount_required'), type: 'danger' });
            return;
        }
        if (!registerOrderForm.description?.trim()) {
            setAlert({ message: t('description_required'), type: 'danger' });
            return;
        }

        setCreatingRegisterOrder(true);
        try {
            // Create new register order object
            const newRegisterOrder = {
                amount: parseFloat(registerOrderForm.amount),
                description: registerOrderForm.description.trim(),
                created_at: new Date().toISOString(),
            };

            // Add to existing register orders array
            const updatedRegisterOrders = [...registerOrders, newRegisterOrder];

            // Update deal with new register orders array
            const { error } = await supabase.from('deals').update({ register_orders: updatedRegisterOrders }).eq('id', dealId);

            if (error) throw error;

            // Update local state
            setRegisterOrders(updatedRegisterOrders);
            setAlert({ message: t('register_order_created_successfully'), type: 'success' });

            // Reset form
            setRegisterOrderForm({
                amount: '',
                description: '',
            });
        } catch (error) {
            console.error('Error creating register order:', error);
            setAlert({
                message: error instanceof Error ? error.message : t('error_creating_register_order'),
                type: 'danger',
            });
        } finally {
            setCreatingRegisterOrder(false);
        }
    };

    // Handle register order deletion
    const handleDeleteRegisterOrder = async (index: number) => {
        try {
            // Remove the register order at the specified index
            const updatedRegisterOrders = registerOrders.filter((_, i) => i !== index);

            // Update deal with new register orders array
            const { error } = await supabase.from('deals').update({ register_orders: updatedRegisterOrders }).eq('id', dealId);

            if (error) throw error;

            // Update local state
            setRegisterOrders(updatedRegisterOrders);
            setAlert({ message: t('register_order_deleted_successfully') || 'Register order deleted successfully', type: 'success' });
        } catch (error) {
            console.error('Error deleting register order:', error);
            setAlert({
                message: error instanceof Error ? error.message : t('error_deleting_register_order') || 'Error deleting register order',
                type: 'danger',
            });
        }
    };

    const handleDealTypeChange = (type: string) => {
        setDealType(type);
    };
    const handleCustomerSelect = (customer: Customer | null) => {
        setSelectedCustomer(customer);
        setForm((prev) => ({ ...prev, customer_id: customer?.id || '' }));
    };

    const handleSellerSelect = (customer: Customer | null) => {
        setSelectedSeller(customer);
        setForm((prev) => ({ ...prev, seller_id: customer?.id || '' }));
    };

    const handleBuyerSelect = (customer: Customer | null) => {
        setSelectedBuyer(customer);
        setForm((prev) => ({ ...prev, buyer_id: customer?.id || '' }));
    };

    const handleCarSelect = (car: Car | null) => {
        setSelectedCar(car);
        setForm((prev) => {
            const updated = { ...prev, car_id: car?.id || '' };

            // Auto-calculate exchange fields when car changes for exchange deals
            if (dealType === 'exchange' && carTakenFromClient && car) {
                const purchasePrice = carTakenFromClient.buy_price || 0;
                const salePrice = car.sale_price || 0;
                const difference = salePrice - purchasePrice;

                updated.customer_car_eval_value = purchasePrice.toString();

                // Calculate which side pays the additional amount
                if (difference > 0) {
                    // Company's car is more expensive, customer pays the difference
                    updated.additional_customer_amount = difference.toString();
                    updated.additional_company_amount = '0';
                } else if (difference < 0) {
                    // Customer's car is more expensive, company pays the difference
                    updated.additional_company_amount = Math.abs(difference).toString();
                    updated.additional_customer_amount = '0';
                } else {
                    // Equal value
                    updated.additional_customer_amount = '0';
                    updated.additional_company_amount = '0';
                }
            }

            return updated;
        });
    };
    const handleCreateNewCustomer = (context: 'customer' | 'seller' | 'buyer' = 'customer') => {
        setCustomerCreationContext(context);
        setShowCreateCustomerModal(true);
    };

    const handleCustomerCreated = (customer: Customer) => {
        if (customerCreationContext === 'seller') {
            setSelectedSeller(customer);
            setForm((prev) => ({ ...prev, seller_id: customer.id }));
        } else if (customerCreationContext === 'buyer') {
            setSelectedBuyer(customer);
            setForm((prev) => ({ ...prev, buyer_id: customer.id }));
        } else {
            setSelectedCustomer(customer);
            setForm((prev) => ({ ...prev, customer_id: customer.id }));
        }
        setShowCreateCustomerModal(false);
        setAlert({ message: t('customer_added'), type: 'success' });
    };

    // Handle cancel deal with confirmation modal
    const handleCancelDealClick = () => {
        setShowCancelModal(true);
        setCancelReason('');
    };

    const handleCancelDealConfirm = async () => {
        if (!cancelReason.trim()) {
            setAlert({ message: t('cancel_reason_required'), type: 'danger' });
            return;
        }

        setCancellingDeal(true);
        try {
            // Check if deal has bills to determine if we need to create a refund bill
            const hasBills = bills && bills.length > 0;

            // Update deal status to cancelled with reason
            const { error: dealError } = await supabase
                .from('deals')
                .update({
                    status: 'cancelled',
                    cancellation_reason: cancelReason.trim(),
                })
                .eq('id', dealId);

            if (dealError) throw dealError;

            // If deal has bills, create a refund bill
            if (hasBills && deal) {
                const refundBillData = {
                    deal_id: dealId,
                    bill_type: 'general',
                    bill_direction: 'negative', // Refund bills should be negative
                    status: 'pending',
                    customer_name: selectedCustomer?.name || t('unknown_customer'),
                    phone: selectedCustomer?.phone || '',
                    date: new Date().toISOString().split('T')[0],
                    bill_description: `${t('refund_bill_for_deal')}: ${deal.title}`,
                    bill_amount: parseFloat(deal.amount?.toString() || '0'),
                    free_text: `${t('deal_cancelled_refund')} - ${cancelReason.trim()}`,
                    created_at: new Date().toISOString(),
                };

                const { data: refundBillResult, error: billError } = await supabase.from('bills').insert([refundBillData]).select().single();

                if (billError) throw billError;
                if (!refundBillResult) throw new Error('Failed to create refund bill');

                // Create Tranzila document for refund bill - THIS IS MANDATORY
                // If Tranzila fails, we'll rollback the bill creation
                try {
                    const refundPayments: BillPayment[] = [
                        {
                            payment_type: 'cash',
                            amount: parseFloat(deal.amount?.toString() || '0'),
                        },
                    ];
                    await createTranzilaDocument(refundBillResult.id, refundBillData, refundPayments, deal);
                } catch (tranzilaError) {
                    // Rollback: Delete the refund bill that was just created
                    await supabase.from('bills').delete().eq('id', refundBillResult.id);
                    throw new Error(t('tranzila_document_creation_failed') + ': ' + (tranzilaError instanceof Error ? tranzilaError.message : 'Unknown error'));
                }

                setAlert({ message: t('deal_cancelled_with_refund_bill'), type: 'success' });
            } else {
                setAlert({ message: t('deal_cancelled_successfully'), type: 'success' });
            }

            // Update local state
            setForm((prev) => ({ ...prev, status: 'cancelled' }));
            setShowCancelModal(false);
            setCancelReason('');
        } catch (error) {
            console.error('Error cancelling deal:', error);
            setAlert({ message: t('error_cancelling_deal'), type: 'danger' });
        } finally {
            setCancellingDeal(false);
        }
    };

    // Handle PDF download for bills
    const handleDownloadPDF = async (bill: any) => {
        setDownloadingPDF(bill.id);
        try {
            // Check if bill has Tranzila retrieval key
            const tranzilaRetrievalKey = bill.tranzila_retrieval_key;

            if (!tranzilaRetrievalKey) {
                setAlert({ message: t('bill_not_created_with_tranzila'), type: 'danger' });
                return;
            }

            // Open Tranzila PDF in new tab via our proxy API
            const proxyUrl = `/api/tranzila/download-pdf?key=${encodeURIComponent(tranzilaRetrievalKey)}`;
            window.open(proxyUrl, '_blank');
        } catch (error) {
            console.error('Error downloading PDF:', error);
            setAlert({ message: t('error_downloading_pdf'), type: 'danger' });
        } finally {
            setDownloadingPDF(null);
        }
    };

    // Handle file upload for new attachments
    const handleFileUpload = (type: string, fileItem: FileItem | null) => {
        if (fileItem) {
            setNewAttachments((prev) => ({ ...prev, [type]: fileItem }));
        } else {
            // Remove the file if null
            handleRemoveNewAttachment(type);
        }
    };

    // Remove existing attachment
    const handleRemoveExistingAttachment = async (attachment: DealAttachment) => {
        setDeletingAttachment(attachment.url);
        try {
            // Extract bucket and file path from the attachment URL
            const bucket = 'deals';
            const filePath = attachment.url.replace(`/${bucket}/`, '');

            // Delete from storage
            const deleteSuccess = await deleteFile(bucket, filePath);
            if (!deleteSuccess) {
                throw new Error('Failed to delete file from storage');
            }

            // Update database
            const updatedAttachments = existingAttachments.filter((a) => a.url !== attachment.url);
            const { error } = await supabase.from('deals').update({ attachments: updatedAttachments }).eq('id', dealId);

            if (error) throw error;

            setExistingAttachments(updatedAttachments);
            setAlert({ message: t('attachment_removed_successfully'), type: 'success' });
        } catch (error) {
            console.error('Error removing attachment:', error);
            setAlert({
                message: t('error_removing_attachment'),
                type: 'danger',
            });
        } finally {
            setDeletingAttachment(null);
        }
    };

    // Remove new attachment (not yet saved)
    const handleRemoveNewAttachment = (type: string) => {
        const fileItem = newAttachments[type];
        if (fileItem?.preview) {
            URL.revokeObjectURL(fileItem.preview);
        }
        setNewAttachments((prev) => {
            const updated = { ...prev };
            delete updated[type];
            return updated;
        });
    };

    const validateForm = () => {
        if (!dealType.trim()) {
            setAlert({ message: t('deal_type_required'), type: 'danger' });
            return false;
        }
        if (!form.title.trim()) {
            setAlert({ message: t('deal_title_required'), type: 'danger' });
            return false;
        }
        if (!form.description.trim()) {
            setAlert({ message: t('description_required'), type: 'danger' });
            return false;
        }
        if (form.amount && parseFloat(form.amount) < 0) {
            setAlert({ message: t('amount_cannot_be_negative'), type: 'danger' });
            return false;
        }

        // Validation for intermediary deals
        if (dealType === 'intermediary') {
            if (!form.seller_id) {
                setAlert({ message: t('seller_required'), type: 'danger' });
                return false;
            }
            if (!form.buyer_id) {
                setAlert({ message: t('buyer_required'), type: 'danger' });
                return false;
            }
        }

        return true;
    };
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // For completed deals, only allow attachment updates
        if (deal?.status === 'completed') {
            return handleAttachmentOnlyUpdate();
        }

        // Prevent form submission if deal is cancelled
        if (deal?.status === 'cancelled') {
            setAlert({ message: t('deal_cancelled_no_edit'), type: 'danger' });
            return;
        }

        if (!validateForm()) return;

        setSaving(true);
        try {
            // Update car's sale_price if it has changed for any deal type with a selected car
            if (selectedCar && form.selling_price) {
                const newSellingPrice = parseFloat(form.selling_price);

                // Always update the car's sale_price to match the deal's selling_price
                // Also set the car as private since sold cars should not be publicly visible
                const { error: carUpdateError } = await supabase
                    .from('cars')
                    .update({
                        sale_price: newSellingPrice,
                        public: false,
                    })
                    .eq('id', selectedCar.id);

                if (carUpdateError) {
                    console.error('Error updating car sale price and public status:', carUpdateError);
                    // Continue with deal update but log the error
                }
            }

            const dealData = {
                deal_type: dealType,
                title: form.title.trim(),
                description: form.description.trim(),
                amount: form.amount ? parseFloat(form.amount) : 0,
                loss_amount: form.loss_amount ? parseFloat(form.loss_amount) : 0,
                selling_price: form.selling_price ? parseFloat(form.selling_price) : null,
                customer_car_eval_value: form.customer_car_eval_value ? parseFloat(form.customer_car_eval_value) : null,
                additional_customer_amount: form.additional_customer_amount ? parseFloat(form.additional_customer_amount) : null,
                additional_company_amount: form.additional_company_amount ? parseFloat(form.additional_company_amount) : null,
                status: form.status,
                customer_id: form.customer_id || null,
                seller_id: form.seller_id || null,
                buyer_id: form.buyer_id || null,
                car_id: form.car_id || null,
                created_at: new Date(dealDate + 'T' + new Date().toTimeString().split(' ')[0]).toISOString(),
            };

            // Handle new file uploads
            let updatedAttachments = [...existingAttachments];

            // Upload new attachments
            for (const [type, fileItem] of Object.entries(newAttachments)) {
                if (fileItem) {
                    const uploadResult = await uploadFile(fileItem.file, 'deals', dealId, `${type}.${fileItem.file.name.split('.').pop()}`);

                    if (uploadResult.success && uploadResult.url) {
                        const newAttachment: DealAttachment = {
                            type: type as DealAttachment['type'],
                            name: fileItem.file.name,
                            url: uploadResult.url,
                            size: fileItem.file.size,
                            mimeType: fileItem.file.type,
                            uploadedAt: new Date().toISOString(),
                        };
                        updatedAttachments.push(newAttachment);
                    }
                }
            }

            // Include attachments in deal data
            const finalDealData = {
                ...dealData,
                attachments: updatedAttachments,
                payment_methods: paymentMethods.length > 0 ? paymentMethods : null,
                payment_notes: paymentNotes || null,
            };

            const { error } = await supabase.from('deals').update(finalDealData).eq('id', dealId);

            if (error) throw error;

            setAlert({ message: t('deal_updated_successfully'), type: 'success' });

            // Redirect to deals list after a short delay
            setTimeout(() => {
                router.push('/sales-deals');
            }, 1500);
        } catch (error) {
            console.error(error);
            setAlert({
                message: error instanceof Error ? error.message : t('error_updating_deal'),
                type: 'danger',
            });
        } finally {
            setSaving(false);
        }
    };

    // Handle attachment-only updates for completed deals
    const handleAttachmentOnlyUpdate = async () => {
        setSaving(true);
        try {
            // Handle new file uploads
            let updatedAttachments = [...existingAttachments];

            // Upload new attachments
            for (const [type, fileItem] of Object.entries(newAttachments)) {
                if (fileItem) {
                    const uploadResult = await uploadFile(fileItem.file, 'deals', dealId, `${type}.${fileItem.file.name.split('.').pop()}`);

                    if (uploadResult.success && uploadResult.url) {
                        const newAttachment: DealAttachment = {
                            type: type as DealAttachment['type'],
                            name: fileItem.file.name,
                            url: uploadResult.url,
                            size: fileItem.file.size,
                            mimeType: fileItem.file.type,
                            uploadedAt: new Date().toISOString(),
                        };
                        updatedAttachments.push(newAttachment);
                    }
                }
            }

            // Update only attachments for completed deals
            const { error } = await supabase.from('deals').update({ attachments: updatedAttachments }).eq('id', dealId);

            if (error) throw error;

            // Update local state
            setExistingAttachments(updatedAttachments);
            setNewAttachments({});

            setAlert({ message: t('attachments_updated_successfully'), type: 'success' });
        } catch (error) {
            console.error(error);
            setAlert({
                message: error instanceof Error ? error.message : t('error_updating_attachments'),
                type: 'danger',
            });
        } finally {
            setSaving(false);
        }
    };

    // Bill creation handlers
    const handleBillFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setBillForm((prev) => {
            const updated = { ...prev, [name]: value };

            // Auto-calculate tax when commission changes
            if (name === 'commission') {
                const commission = parseFloat(value) || 0;
                const totalWithTax = commission; // This total already includes tax
                const preTaxAmount = totalWithTax / 1.18; // Remove 18% tax to get pre-tax amount
                const taxAmount = preTaxAmount * 0.18; // Calculate 18% tax

                updated.total = preTaxAmount.toFixed(0);
                updated.tax_amount = taxAmount.toFixed(0);
                updated.total_with_tax = totalWithTax.toFixed(0);
            }

            return updated;
        });
    };

    const validateBillForm = () => {
        if (!billForm.bill_type) {
            setAlert({ message: t('bill_type_required'), type: 'danger' });
            return false;
        }

        // For general bills, validate required fields
        if (billForm.bill_type === 'general') {
            if (!billForm.bill_description?.trim()) {
                setAlert({ message: t('bill_description') + ' ' + t('required'), type: 'danger' });
                return false;
            }
            if (!billForm.bill_amount || parseFloat(billForm.bill_amount) <= 0) {
                setAlert({ message: t('bill_amount') + ' ' + t('required'), type: 'danger' });
                return false;
            }
            return true;
        }

        // Additional validation for receipts with multiple payments
        if (billForm.bill_type === 'receipt_only' || billForm.bill_type === 'tax_invoice_receipt') {
            const totalPaid = payments.reduce((sum, payment) => sum + (payment.amount || 0), 0);
            const expectedTotal = parseFloat(billForm.total_with_tax) || 0;

            // Allow payments to exceed the expected total (extra goes to customer balance)
            // Only validate that we have some payment amount
            if (totalPaid <= 0) {
                setAlert({
                    message: t('payment_amount_required'),
                    type: 'danger',
                });
                return false;
            }

            // Show info message if payment exceeds selling price
            if (totalPaid > expectedTotal + 0.01) {
                const excessAmount = totalPaid - expectedTotal;
                setAlert({
                    message: `${t('payment_exceeds_selling_price')}: ₪${excessAmount.toFixed(0)} ${t('will_be_added_to_customer_balance')}`,
                    type: 'success',
                });
                // Don't return false - allow the payment to proceed
            }
        }

        // For other bill types, validate customer name
        if (!billForm.customer_name) {
            setAlert({ message: t('customer_name_required'), type: 'danger' });
            return false;
        }
        return true;
    };

    const handleCreateBill = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateBillForm()) return;

        setCreatingBill(true);

        try {
            // Determine customer info based on deal type
            let customerName = billForm.customer_name;
            let customerPhone = billForm.phone;

            if (!customerName || !customerPhone) {
                if (deal?.deal_type === 'intermediary') {
                    const customerInfo = selectedSeller || selectedBuyer;
                    customerName = customerName || customerInfo?.name || '';
                    customerPhone = customerPhone || customerInfo?.phone || '';
                } else {
                    customerName = customerName || selectedCustomer?.name || '';
                    customerPhone = customerPhone || selectedCustomer?.phone || '';
                }
            }

            // Automatically determine bill direction for specific bill types
            let finalBillDirection = billForm.bill_direction;

            if (billForm.bill_type === 'tax_invoice') {
                // Tax invoices are always negative
                finalBillDirection = 'negative';
            } else if (billForm.bill_type === 'tax_invoice_receipt') {
                // Tax invoice with receipt: positive if payments exceed selling_price, negative otherwise
                const totalPaid = payments.reduce((sum, payment) => sum + (payment.amount || 0), 0);
                const sellingPrice = deal?.selling_price || 0;
                finalBillDirection = totalPaid > sellingPrice ? 'positive' : 'negative';
            }

            // For receipts, we'll use multiple payments structure
            // For other bill types, we'll use the legacy single payment structure for now
            const billData =
                billForm.bill_type === 'receipt_only' || billForm.bill_type === 'tax_invoice_receipt'
                    ? {
                          deal_id: parseInt(dealId),
                          bill_type: billForm.bill_type,
                          bill_direction: finalBillDirection,
                          status: billForm.status,
                          customer_name: customerName,
                          phone: customerPhone,
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
                          created_at: new Date().toISOString(),
                      }
                    : {
                          deal_id: parseInt(dealId),
                          bill_type: billForm.bill_type,
                          bill_direction: finalBillDirection,
                          status: billForm.status,
                          customer_name: customerName,
                          phone: customerPhone,
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
                          transfer_amount: parseFloat(billForm.transfer_amount) || null,
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
                          created_at: new Date().toISOString(),
                      };

            const { data: billResult, error } = await supabase.from('bills').insert([billData]).select().single();

            if (error) throw error;
            if (!billResult) throw new Error('Failed to create bill');

            // Insert multiple payments for receipts (before Tranzila so we can send them to Tranzila)
            if ((billForm.bill_type === 'receipt_only' || billForm.bill_type === 'tax_invoice_receipt') && payments.length > 0) {
                const paymentInserts = payments.map((payment) => ({
                    bill_id: billResult.id,
                    payment_type: payment.payment_type,
                    amount: payment.amount,
                    created_at: billForm.date ? new Date(billForm.date + 'T00:00:00').toISOString() : new Date().toISOString(),
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
                    // Rollback: Delete the bill
                    await supabase.from('bills').delete().eq('id', billResult.id);
                    throw paymentsError;
                }
            }

            // Create document in Tranzila - THIS IS MANDATORY
            // If Tranzila fails, we'll rollback the bill creation
            try {
                await createTranzilaDocument(billResult.id, billData, payments, deal, selectedCar);
            } catch (tranzilaError) {
                // Rollback: Delete the bill and payments that were just created
                await supabase.from('bills').delete().eq('id', billResult.id);

                // Delete payments if they were inserted
                if ((billForm.bill_type === 'receipt_only' || billForm.bill_type === 'tax_invoice_receipt') && payments.length > 0) {
                    await supabase.from('bill_payments').delete().eq('bill_id', billResult.id);
                }

                throw new Error(t('tranzila_document_creation_failed') + ': ' + (tranzilaError instanceof Error ? tranzilaError.message : 'Unknown error'));
            }

            // Update the deal status to 'completed' after bill creation
            const { error: dealUpdateError } = await supabase.from('deals').update({ status: 'completed' }).eq('id', dealId);

            if (dealUpdateError) {
                console.error('Error updating deal status:', dealUpdateError);
                // Don't throw error here to not interrupt the bill creation success
            } else {
                // Update the local deal state
                setDeal((prev) => (prev ? { ...prev, status: 'completed' } : null));
                setForm((prev) => ({ ...prev, status: 'completed' }));

                // Force a re-render to ensure UI updates
                setTimeout(() => {
                    window.location.reload();
                }, 2000);
            }

            setAlert({ message: t('bill_created_successfully'), type: 'success' });

            // Update customer balance for all bill types
            let customerId = null;

            if (deal) {
                // For bills with deals, get customer from deal
                customerId = getCustomerIdFromDeal(deal);
            } else if (billForm.bill_type === 'general' && customerName) {
                // For general bills, get customer by name
                customerId = await getCustomerIdByName(customerName);
            }

            if (customerId) {
                const dealSellingPrice = deal?.selling_price || 0;

                // For general bills, don't pass payments array as the amount is in bill_amount field
                const paymentsToPass = billForm.bill_type === 'general' ? undefined : payments;

                const balanceUpdateSuccess = await handleReceiptCreated(billResult.id, customerId, billData, customerName || t('unknown_customer'), dealSellingPrice, paymentsToPass, deal);

                if (!balanceUpdateSuccess) {
                    console.warn('Failed to update customer balance for bill:', billResult.id);
                    // Don't fail the bill creation, just log the warning
                }
            } else if (customerName) {
                console.warn('Could not find customer for balance update:', customerName);
            }

            // Refresh bills list
            fetchBills();

            // Reset bill form and collapse section
            setBillForm({
                bill_type: '',
                bill_direction: 'positive',
                bill_description: '',
                bill_amount: '',
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
                visa_amount: '',
                visa_installments: '',
                visa_card_type: '',
                visa_last_four: '',
                bank_amount: '',
                bank_name: '',
                bank_branch: '',
                approval_number: '',
                account_number: '',
                transfer_number: '',
                transfer_holder_name: '',
                transfer_amount: '',
                transfer_bank_name: '',
                transfer_branch: '',
                transfer_account_number: '',
                transfer_branch_number: '',
                check_amount: '',
                check_bank_name: '',
                check_branch_number: '',
                check_account_number: '',
                check_number: '',
                check_holder_name: '',
                check_branch: '',
                cash_amount: '',
            });
            setIsBillSectionExpanded(false);
        } catch (error) {
            console.error('Error creating bill:', error);
            setAlert({
                message: error instanceof Error ? error.message : t('error_creating_bill'),
                type: 'danger',
            });
        } finally {
            setCreatingBill(false);
        }
    };

    // Populate bill form when deal data is available
    useEffect(() => {
        if (deal && selectedCar) {
            // For intermediary deals, use seller/buyer info
            if (deal.deal_type === 'intermediary' && (selectedSeller || selectedBuyer)) {
                const customerInfo = selectedSeller || selectedBuyer;
                setBillForm((prev) => ({
                    ...prev,
                    customer_name: customerInfo?.name || '',
                    phone: customerInfo?.phone || '',
                    car_details: selectedCar ? `${selectedCar.brand} ${selectedCar.title} ${selectedCar.year}` : '',
                    sale_price: deal.amount?.toString() || '',
                }));
            }
            // For other deal types, use regular customer
            else if (selectedCustomer) {
                setBillForm((prev) => ({
                    ...prev,
                    customer_name: selectedCustomer?.name || '',
                    phone: selectedCustomer?.phone || '',
                    car_details: selectedCar ? `${selectedCar.brand} ${selectedCar.title} ${selectedCar.year}` : '',
                    sale_price: deal.amount?.toString() || '',
                }));
            }
        }
    }, [deal, selectedCustomer, selectedSeller, selectedBuyer, selectedCar]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen gap-4">
                <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
                <p className="text-lg font-semibold text-gray-700 dark:text-gray-300">{t('loading')}</p>
            </div>
        );
    }

    if (!deal) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t('deal_not_found')}</h2>
                    <p className="text-gray-600 dark:text-gray-400 mt-2">{t('deal_not_found_description')}</p>
                    <Link href="/sales-deals" className="btn btn-primary mt-4">
                        {t('back_to_deals')}
                    </Link>
                </div>
            </div>
        );
    }
    return (
        <div className="container mx-auto p-6">
            <div className="flex items-center gap-5 mb-6">
                <div onClick={() => router.push('/sales-deals')}>
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
                        <Link href="/sales-deals" className="text-primary hover:underline">
                            {t('deals')}
                        </Link>
                    </li>
                    <li className="before:content-['/'] ltr:before:mr-2 rtl:before:ml-2">
                        <span>{t('edit_deal')}</span>
                    </li>
                </ul>
            </div>

            <div className="mb-6">
                <h1 className="text-2xl font-bold">{t('edit_deal')}</h1>
                <p className="text-gray-500">{t('update_deal_description')}</p>

                {deal?.status === 'completed' && (
                    <div className="mt-3 p-3 bg-blue-100 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-700 rounded-lg">
                        <p className="text-blue-800 dark:text-blue-200 text-sm font-medium">
                            <span className="inline-flex items-center mr-2">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path
                                        fillRule="evenodd"
                                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                        clipRule="evenodd"
                                    />
                                </svg>
                            </span>
                            {t('deal_completed_notice')}
                        </p>
                    </div>
                )}

                {deal?.status === 'cancelled' && (
                    <div className="mt-3 p-3 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-lg">
                        <p className="text-red-800 dark:text-red-200 text-sm font-medium">
                            <span className="inline-flex items-center mr-2">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path
                                        fillRule="evenodd"
                                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                                        clipRule="evenodd"
                                    />
                                </svg>
                            </span>
                            {t('deal_cancelled_notice')}
                        </p>
                        {deal.cancellation_reason && (
                            <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 rounded border border-red-200 dark:border-red-800">
                                <p className="text-red-700 dark:text-red-300 text-sm">
                                    <span className="font-medium">{t('reason')}:</span> {deal.cancellation_reason}
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {alert && (
                <div className="fixed top-4 right-4 z-50 min-w-80 max-w-md">
                    <Alert type={alert.type} title={alert.type === 'success' ? t('success') : t('error')} message={alert.message} onClose={() => setAlert(null)} />
                </div>
            )}

            {/* Tabs Navigation */}
            <div className="mb-5">
                <div className="border-b border-[#ebedf2] dark:border-[#191e3a]">
                    <ul className="flex flex-wrap">
                        <li className="mx-2">
                            <button
                                type="button"
                                className={`flex items-center gap-2 p-4 text-sm font-medium ${
                                    activeTab === 'info' ? 'border-b-2 border-primary text-primary' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                                }`}
                                onClick={() => setActiveTab('info')}
                            >
                                <IconDocument className="w-4 h-4" />
                                {t('deal_information')}
                            </button>
                        </li>
                        <li className="mx-2">
                            <button
                                type="button"
                                className={`flex items-center gap-2 p-4 text-sm font-medium ${
                                    activeTab === 'attachments' ? 'border-b-2 border-primary text-primary' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                                }`}
                                onClick={() => setActiveTab('attachments')}
                            >
                                <IconPaperclip className="w-4 h-4" />
                                {t('attachments')}
                            </button>
                        </li>
                        <li className="mx-2">
                            <button
                                type="button"
                                className={`flex items-center gap-2 p-4 text-sm font-medium ${
                                    activeTab === 'payments' ? 'border-b-2 border-primary text-primary' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                                }`}
                                onClick={() => setActiveTab('payments')}
                            >
                                <IconCreditCard className="w-4 h-4" />
                                {t('payment_methods')}
                            </button>
                        </li>
                        {hasPermission('view_bills') && (
                            <li className="mx-2">
                                <button
                                    type="button"
                                    className={`flex items-center gap-2 p-4 text-sm font-medium ${
                                        activeTab === 'bills' ? 'border-b-2 border-primary text-primary' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                                    }`}
                                    onClick={() => setActiveTab('bills')}
                                >
                                    <IconReceipt className="w-4 h-4" />
                                    {t('connected_bills')}
                                </button>
                            </li>
                        )}
                    </ul>
                </div>
            </div>

            <div className="panel">
                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Deal Information Tab */}
                    {activeTab === 'info' && (
                        <>
                            <div className="mb-5">
                                <h5 className="text-lg font-semibold dark:text-white-light">{t('deal_information')}</h5>
                            </div>
                            {/* Deal Type Selector */}
                            <div className="bg-gradient-to-r from-primary/10 to-secondary/10 p-6 rounded-lg border-2 border-primary/20">
                                <label className="block text-lg font-bold text-gray-700 dark:text-white mb-4">
                                    {t('deal_type')} <span className="text-red-500">*</span>
                                </label>
                                <DealTypeSelect
                                    defaultValue={dealType}
                                    className="form-input text-lg py-3"
                                    name="deal_type"
                                    onChange={deal?.status === 'completed' || deal?.status === 'cancelled' ? () => {} : handleDealTypeChange}
                                />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                {/* Deal Title */}
                                <div className="md:col-span-2">
                                    <label htmlFor="title" className="block text-sm font-bold text-gray-700 dark:text-white mb-2">
                                        {t('deal_title')} <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        id="title"
                                        name="title"
                                        value={form.title}
                                        onChange={handleInputChange}
                                        className="form-input"
                                        placeholder={t('enter_deal_title')}
                                        required
                                        disabled={deal?.status === 'completed'}
                                    />
                                </div>
                                {/* Description */}
                                <div className="md:col-span-2">
                                    <label htmlFor="description" className="block text-sm font-bold text-gray-700 dark:text-white mb-2">
                                        {t('description')} <span className="text-red-500">*</span>
                                    </label>
                                    <textarea
                                        id="description"
                                        name="description"
                                        value={form.description}
                                        onChange={handleInputChange}
                                        className="form-textarea min-h-[120px]"
                                        placeholder={t('enter_deal_description')}
                                        required
                                        disabled={deal?.status === 'completed'}
                                    />
                                </div>
                            </div>
                            {/* Deal Status Display/Cancel Option */}
                            <div className="panel">
                                <div className="mb-5">
                                    <h5 className="text-lg font-bold text-gray-900 dark:text-white-light">{t('deal_status')}</h5>
                                    <p className="text-gray-600 dark:text-gray-400 mt-2">{t('deal_status_automatic_desc')}</p>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div
                                            className={`px-4 py-2 rounded-lg font-medium ${
                                                form.status === 'active'
                                                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
                                                    : form.status === 'completed'
                                                      ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                                                      : form.status === 'cancelled'
                                                        ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                                                        : 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
                                            }`}
                                        >
                                            {form.status === 'active'
                                                ? t('deal_status_active')
                                                : form.status === 'completed'
                                                  ? t('deal_status_completed')
                                                  : form.status === 'cancelled'
                                                    ? t('deal_status_cancelled')
                                                    : form.status}
                                        </div>
                                        {form.status === 'completed' && <span className="text-sm text-gray-600 dark:text-gray-400">{t('deal_completed_automatically')}</span>}
                                    </div>
                                </div>
                            </div>
                            {/* Deal Date Selector */}
                            <div className="panel">
                                <div className="mb-5 flex items-center gap-3">
                                    <IconCalendar className="w-5 h-5 text-primary" />
                                    <div>
                                        <h5 className="text-lg font-bold text-gray-900 dark:text-white-light">{t('deal_date')}</h5>
                                        <p className="text-gray-600 dark:text-gray-400 mt-1">{t('select_deal_date_desc')}</p>
                                    </div>
                                </div>
                                <div className="relative">
                                    <input
                                        type="date"
                                        value={dealDate}
                                        onChange={(e) => setDealDate(e.target.value)}
                                        className="form-input bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-600 rounded-lg px-4 py-3 text-lg focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-3 [&::-webkit-calendar-picker-indicator]:w-5 [&::-webkit-calendar-picker-indicator]:h-5 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                                        style={{ colorScheme: 'light' }}
                                        disabled={deal?.status === 'completed'}
                                    />
                                    <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                                        <IconCalendar className="w-5 h-5 text-gray-400" />
                                    </div>
                                </div>
                            </div>{' '}
                            {/* Deal Summary Table - Different based on Deal Type */}
                            {selectedCar && (
                                <div className="panel">
                                    <div className="mb-5">
                                        <h5 className="text-lg font-bold text-gray-900 dark:text-white-light">{t('deal_summary')}</h5>
                                    </div>
                                    <div className="bg-transparent rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                                        {/* Table Header */}
                                        <div className="grid grid-cols-3 gap-4 mb-4 pb-2 border-b border-gray-300 dark:border-gray-600">
                                            <div className="text-sm font-bold text-gray-700 dark:text-white text-right">{t('deal_item')}</div>
                                            <div className="text-sm font-bold text-gray-700 dark:text-white text-center">{t('deal_price')}</div>
                                        </div>

                                        {/* New/Used Sale Deal Table */}
                                        {(dealType === 'new_used_sale' || dealType === 'new_sale' || dealType === 'used_sale' || dealType === 'new_used_sale_tax_inclusive') && (
                                            <>
                                                {/* Row 1: Car for Sale */}
                                                <div className="grid grid-cols-3 gap-4 mb-3 py-2">
                                                    <div className="text-sm text-gray-700 dark:text-gray-300 text-right">
                                                        <div className="font-medium">{t('car_for_sale')}</div>
                                                        <div className="text-xs mt-1 text-gray-500">
                                                            {selectedCar.brand} {selectedCar.title} - {selectedCar.year}
                                                            {selectedCar.car_number && ` - ${selectedCar.car_number}`}
                                                        </div>
                                                    </div>
                                                    <div className="text-center">-</div>
                                                </div>

                                                {/* Row 2: Buy Price */}
                                                <div className="grid grid-cols-3 gap-4 mb-3 py-2">
                                                    <div className="text-sm text-gray-700 dark:text-gray-300 text-right">{t('buy_price_auto')}</div>
                                                    <div className="text-center">
                                                        <span className="text-sm text-gray-700 dark:text-gray-300">₪{selectedCar.buy_price?.toFixed(0) || '0.00'}</span>
                                                    </div>
                                                </div>

                                                {/* Row 3: Selling Price (Editable) */}
                                                <div className="grid grid-cols-3 gap-4 mb-3 py-2">
                                                    <div className="text-sm pt-2 text-gray-700 dark:text-gray-300 text-right">
                                                        {t('selling_price_manual')}
                                                        <div className="text-xs text-blue-600 dark:text-blue-400 mt-1 font-normal">{t('updates_car_sale_price')}</div>
                                                    </div>
                                                    <div className="text-center">
                                                        <div className="flex justify-center">
                                                            <span className="inline-flex items-center px-2 bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 border ltr:border-r-0 rtl:border-l-0 border-gray-300 dark:border-gray-600 ltr:rounded-l-md rtl:rounded-r-md text-xs">
                                                                ₪
                                                            </span>
                                                            <input
                                                                type="number"
                                                                name="selling_price"
                                                                step="0.01"
                                                                min="0"
                                                                value={form.selling_price || ''}
                                                                onChange={handleInputChange}
                                                                className="form-input ltr:rounded-l-none rtl:rounded-r-none w-24"
                                                                style={{ direction: 'ltr', textAlign: 'center' }}
                                                                placeholder="0.00"
                                                                disabled={deal?.status === 'completed' || deal?.status === 'cancelled'}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Row 4: Loss Amount (Editable) */}
                                                <div className="grid grid-cols-3 gap-4 mb-3 py-2">
                                                    <div className="text-sm pt-1 text-gray-700 dark:text-gray-300 text-right">{t('loss_amount')}</div>
                                                    <div className="text-center">
                                                        <div className="flex justify-center">
                                                            <span className="inline-flex items-center px-2 bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 border ltr:border-r-0 rtl:border-l-0 border-gray-300 dark:border-gray-600 ltr:rounded-l-md rtl:rounded-r-md text-xs">
                                                                ₪
                                                            </span>
                                                            <input
                                                                type="number"
                                                                name="loss_amount"
                                                                step="0.01"
                                                                min="0"
                                                                value={form.loss_amount || ''}
                                                                onChange={handleInputChange}
                                                                className="form-input ltr:rounded-l-none rtl:rounded-r-none w-24"
                                                                style={{ direction: 'ltr', textAlign: 'center' }}
                                                                placeholder="0.00"
                                                                disabled={deal?.status === 'completed' || deal?.status === 'cancelled'}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Row 5: Profit Commission (Calculated) */}
                                                {hasPermission('view_car_purchase_price') && (
                                                    <div className="grid grid-cols-3 gap-4 mb-4 py-2">
                                                        <div className="text-sm text-gray-700 dark:text-gray-300 text-right">{t('profit_commission')}</div>
                                                        <div className="text-center">
                                                            {(() => {
                                                                if (!form.amount || !selectedCar) return <span className="text-sm text-gray-700 dark:text-gray-300">₪0.00</span>;

                                                                const buyPrice = selectedCar.buy_price || 0;
                                                                const sellPrice = parseFloat(form.selling_price || '0') || 0;
                                                                const loss = parseFloat(form.loss_amount || '0');
                                                                const profitCommission = sellPrice - buyPrice - loss;

                                                                return (
                                                                    <span className={`text-sm ${profitCommission >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                                                        {profitCommission >= 0 ? '+' : ''}₪{profitCommission.toFixed(0)}
                                                                    </span>
                                                                );
                                                            })()}
                                                        </div>
                                                    </div>
                                                )}
                                            </>
                                        )}

                                        {/* Exchange Deal Table */}
                                        {dealType === 'exchange' && (
                                            <>
                                                {/* Row 1: Car for Sale */}
                                                <div className="grid grid-cols-3 gap-4 mb-3 py-2">
                                                    <div className="text-sm text-gray-700 dark:text-gray-300 text-right">
                                                        <div className="font-medium">{t('car_for_sale')}</div>
                                                        <div className="text-xs mt-1 text-gray-500">
                                                            {selectedCar.brand} {selectedCar.title} - {selectedCar.year}
                                                            {selectedCar.car_number && ` - ${selectedCar.car_number}`}
                                                        </div>
                                                    </div>
                                                    <div className="text-center">-</div>
                                                </div>
                                                {/* Row 2: Buy Price */}
                                                <div className="grid grid-cols-3 gap-4 mb-3 py-2">
                                                    <div className="text-sm text-gray-700 dark:text-gray-300 text-right">{t('buy_price_auto')}</div>
                                                    <div className="text-center">
                                                        <span className="text-sm text-gray-700 dark:text-gray-300">₪{selectedCar.buy_price?.toFixed(0) || '0.00'}</span>
                                                    </div>
                                                </div>
                                                {/* Row 3: Selling Price (Editable) */}
                                                <div className="grid grid-cols-3 gap-4 mb-3 py-2">
                                                    <div className="text-sm pt-2 text-gray-700 dark:text-gray-300 text-right">
                                                        {t('selling_price_manual')}
                                                        <div className="text-xs text-blue-600 dark:text-blue-400 mt-1 font-normal">{t('updates_car_sale_price')}</div>
                                                    </div>
                                                    <div className="text-center">
                                                        <div className="flex justify-center">
                                                            <span className="inline-flex items-center px-2 bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 border ltr:border-r-0 rtl:border-l-0 border-gray-300 dark:border-gray-600 ltr:rounded-l-md rtl:rounded-r-md text-xs">
                                                                ₪
                                                            </span>
                                                            <input
                                                                type="number"
                                                                name="selling_price"
                                                                step="0.01"
                                                                min="0"
                                                                value={form.selling_price || ''}
                                                                onChange={handleInputChange}
                                                                onWheel={(e) => e.currentTarget.blur()}
                                                                className="form-input ltr:rounded-l-none rtl:rounded-r-none w-24 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                                style={{ direction: 'ltr', textAlign: 'center' }}
                                                                placeholder="0.00"
                                                                disabled={deal?.status === 'completed' || deal?.status === 'cancelled'}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>{' '}
                                                {/* Row 4: Customer Car Evaluation (Auto-calculated) */}
                                                <div className="grid grid-cols-3 gap-4 mb-3 py-2">
                                                    <div className="text-sm text-gray-700 dark:text-gray-300 text-right">
                                                        <div className="font-medium">{t('customer_car_evaluation')}</div>
                                                        {carTakenFromClient && (
                                                            <div className="text-xs mt-1 text-gray-500">
                                                                {carTakenFromClient.brand} {carTakenFromClient.title} - {carTakenFromClient.year}
                                                                {carTakenFromClient.car_number && ` - ${carTakenFromClient.car_number}`}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="text-center">
                                                        <span className="text-sm text-gray-700 dark:text-gray-300">₪{parseFloat(form.customer_car_eval_value || '0').toFixed(0)}</span>
                                                    </div>
                                                </div>
                                                {/* Row 5: Additional Amount from Customer (Auto-calculated) */}
                                                <div className="grid grid-cols-3 gap-4 mb-3 py-2">
                                                    <div className="text-sm text-gray-700 dark:text-gray-300 text-right">{t('additional_amount_from_customer')}</div>
                                                    <div className="text-center">
                                                        <span className="text-sm text-blue-600 dark:text-blue-400">₪{parseFloat(form.additional_customer_amount || '0').toFixed(0)}</span>
                                                    </div>
                                                </div>
                                                {/* Row 6: Additional Amount from Company (Auto-calculated) */}
                                                <div className="grid grid-cols-3 gap-4 mb-3 py-2">
                                                    <div className="text-sm text-gray-700 dark:text-gray-300 text-right">{t('additional_amount_from_company')}</div>
                                                    <div className="text-center">
                                                        <span className="text-sm text-orange-600 dark:text-orange-400">₪{parseFloat(form.additional_company_amount || '0').toFixed(0)}</span>
                                                    </div>
                                                </div>
                                                {/* Row 7: Loss (Editable) */}
                                                <div className="grid grid-cols-3 gap-4 mb-3 py-2">
                                                    <div className="text-sm pt-2 text-gray-700 dark:text-gray-300 text-right">{t('loss_amount')}</div>
                                                    <div className="text-center">
                                                        <div className="flex justify-center">
                                                            <span className="inline-flex items-center px-2 bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 border ltr:border-r-0 rtl:border-l-0 border-gray-300 dark:border-gray-600 ltr:rounded-l-md rtl:rounded-r-md text-xs">
                                                                ₪
                                                            </span>
                                                            <input
                                                                type="number"
                                                                name="loss_amount"
                                                                step="0.01"
                                                                min="0"
                                                                value={form.loss_amount || ''}
                                                                onChange={handleInputChange}
                                                                onWheel={(e) => e.currentTarget.blur()}
                                                                className="form-input ltr:rounded-l-none rtl:rounded-r-none w-24 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                                style={{ direction: 'ltr', textAlign: 'center' }}
                                                                placeholder="0.00"
                                                                disabled={deal?.status === 'completed' || deal?.status === 'cancelled'}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                                {/* Row 8: Profit Commission (Calculated) */}
                                                <div className="grid grid-cols-3 gap-4 mb-4 py-2">
                                                    <div className="text-sm text-gray-700 dark:text-gray-300 text-right">{t('profit_commission')}</div>
                                                    <div className="text-center">
                                                        {(() => {
                                                            if (!selectedCar || !carTakenFromClient) return <span className="text-sm text-gray-700 dark:text-gray-300">₪0.00</span>;

                                                            const buyPrice = selectedCar.buy_price || 0;
                                                            const sellPrice = parseFloat(form.selling_price || '0') || 0;
                                                            const oldCarPurchasePrice = carTakenFromClient.buy_price || 0;
                                                            const loss = parseFloat(form.loss_amount || '0');

                                                            // For exchange: Profit = Sale Price - Old Car Purchase Price - Buy Price - Loss
                                                            // Note: customer_car_eval_value and additional_customer_amount are display-only and don't affect profit
                                                            const profitCommission = sellPrice - buyPrice - loss;

                                                            return (
                                                                <span className={`text-sm ${profitCommission >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                                                    {profitCommission >= 0 ? '+' : ''}₪{profitCommission.toFixed(0)}
                                                                </span>
                                                            );
                                                        })()}
                                                    </div>
                                                </div>
                                            </>
                                        )}

                                        {/* Intermediary Deal Table */}
                                        {dealType === 'intermediary' && (
                                            <>
                                                {/* Row 1: Car Brokerage Commission */}
                                                <div className="grid grid-cols-3 gap-4 mb-3 py-2">
                                                    <div className="text-sm text-gray-700 dark:text-gray-300 text-right">
                                                        <div className="font-medium">{t('intermediary_car_commission')}</div>
                                                        <div className="text-xs mt-1 text-gray-500">
                                                            {selectedCar.brand} {selectedCar.title} - {selectedCar.year}
                                                            {selectedCar.car_number && ` - ${selectedCar.car_number}`}
                                                        </div>
                                                    </div>
                                                    <div className="text-center">-</div>
                                                </div>

                                                {/* Row 2: Selling Price (Editable) */}
                                                <div className="grid grid-cols-3 gap-4 mb-3 py-2">
                                                    <div className="text-sm pt-2 text-gray-700 dark:text-gray-300 text-right">
                                                        {t('selling_price_manual')}
                                                        <div className="text-xs text-blue-600 dark:text-blue-400 mt-1 font-normal">{t('updates_car_sale_price')}</div>
                                                    </div>
                                                    <div className="text-center">
                                                        <div className="flex justify-center">
                                                            <span className="inline-flex items-center px-2 bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 border ltr:border-r-0 rtl:border-l-0 border-gray-300 dark:border-gray-600 ltr:rounded-l-md rtl:rounded-r-md text-xs">
                                                                ₪
                                                            </span>
                                                            <input
                                                                type="number"
                                                                name="selling_price"
                                                                step="0.01"
                                                                min="0"
                                                                value={selectedCar.sale_price || ''}
                                                                onChange={handleInputChange}
                                                                onWheel={(e) => e.currentTarget.blur()}
                                                                className="form-input ltr:rounded-l-none rtl:rounded-r-none w-24 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                                style={{ direction: 'ltr', textAlign: 'center' }}
                                                                placeholder="0.00"
                                                                disabled={deal?.status === 'completed' || deal?.status === 'cancelled'}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Row 3: Profit Commission (Editable) */}
                                                <div className="grid grid-cols-3 gap-4 mb-4 py-2">
                                                    <div className="text-sm pt-1 text-gray-700 dark:text-gray-300 text-right">{t('profit_commission')}</div>
                                                    <div className="text-center">
                                                        <div className="flex justify-center">
                                                            <span className="inline-flex items-center px-2 bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 border ltr:border-r-0 rtl:border-l-0 border-gray-300 dark:border-gray-600 ltr:rounded-l-md rtl:rounded-r-md text-xs">
                                                                ₪
                                                            </span>
                                                            <input
                                                                type="number"
                                                                name="amount"
                                                                step="0.01"
                                                                min="0"
                                                                value={form.amount}
                                                                onChange={handleInputChange}
                                                                onWheel={(e) => e.currentTarget.blur()}
                                                                className="form-input ltr:rounded-l-none rtl:rounded-r-none w-24 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                                style={{ direction: 'ltr', textAlign: 'center' }}
                                                                placeholder="0.00"
                                                                disabled={deal?.status === 'completed' || deal?.status === 'cancelled'}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            </>
                                        )}

                                        {/* Financing Assistance Deal Table */}
                                        {dealType === 'financing_assistance_intermediary' && (
                                            <>
                                                {/* Row 1: Financing Assistance Commission */}
                                                <div className="grid grid-cols-3 gap-4 mb-3 py-2">
                                                    <div className="text-sm text-gray-700 dark:text-gray-300 text-right">
                                                        <div className="font-medium">{t('financing_assistance_commission')}</div>
                                                        <div className="text-xs mt-1 text-gray-500">
                                                            {selectedCar.brand} {selectedCar.title} - {selectedCar.year}
                                                            {selectedCar.car_number && ` - ${selectedCar.car_number}`}
                                                        </div>
                                                    </div>
                                                    <div className="text-center">-</div>
                                                </div>

                                                {/* Row 2: Selling Price (Editable) */}
                                                <div className="grid grid-cols-3 gap-4 mb-3 py-2">
                                                    <div className="text-sm pt-2 text-gray-700 dark:text-gray-300 text-right">
                                                        {t('selling_price_manual')}
                                                        <div className="text-xs text-blue-600 dark:text-blue-400 mt-1 font-normal">{t('updates_car_sale_price')}</div>
                                                    </div>
                                                    <div className="text-center">
                                                        <div className="flex justify-center">
                                                            <span className="inline-flex items-center px-2 bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 border ltr:border-r-0 rtl:border-l-0 border-gray-300 dark:border-gray-600 ltr:rounded-l-md rtl:rounded-r-md text-xs">
                                                                ₪
                                                            </span>
                                                            <input
                                                                type="number"
                                                                name="selling_price"
                                                                step="0.01"
                                                                min="0"
                                                                value={selectedCar.sale_price || ''}
                                                                onChange={handleInputChange}
                                                                onWheel={(e) => e.currentTarget.blur()}
                                                                className="form-input ltr:rounded-l-none rtl:rounded-r-none w-24 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                                style={{ direction: 'ltr', textAlign: 'center' }}
                                                                placeholder="0.00"
                                                                disabled={deal?.status === 'completed' || deal?.status === 'cancelled'}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Row 3: Commission (Editable) */}
                                                <div className="grid grid-cols-3 gap-4 mb-4 py-2">
                                                    <div className="text-sm pt-1 text-gray-700 dark:text-gray-300 text-right">{t('commission_editable')}</div>
                                                    <div className="text-center">
                                                        <div className="flex justify-center">
                                                            <span className="inline-flex items-center px-2 bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 border ltr:border-r-0 rtl:border-l-0 border-gray-300 dark:border-gray-600 ltr:rounded-l-md rtl:rounded-r-md text-xs">
                                                                ₪
                                                            </span>
                                                            <input
                                                                type="number"
                                                                name="amount"
                                                                step="0.01"
                                                                min="0"
                                                                value={form.amount}
                                                                onChange={handleInputChange}
                                                                onWheel={(e) => e.currentTarget.blur()}
                                                                className="form-input ltr:rounded-l-none rtl:rounded-r-none w-24 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                                style={{ direction: 'ltr', textAlign: 'center' }}
                                                                placeholder="0.00"
                                                                disabled={deal?.status === 'completed' || deal?.status === 'cancelled'}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            </>
                                        )}

                                        {/* Company Commission Deal Table */}
                                        {dealType === 'company_commission' && (
                                            <>
                                                {/* Row 1: Company Commission */}
                                                <div className="grid grid-cols-3 gap-4 mb-3 py-2">
                                                    <div className="text-sm text-gray-700 dark:text-gray-300 text-right">
                                                        <div className="font-medium">{t('deal_type_company_commission')}</div>
                                                    </div>
                                                    <div className="text-center">
                                                        <div className="flex justify-center">
                                                            <span className="inline-flex items-center px-2 bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 border ltr:border-r-0 rtl:border-l-0 border-gray-300 dark:border-gray-600 ltr:rounded-l-md rtl:rounded-r-md text-xs">
                                                                ₪
                                                            </span>
                                                            <input
                                                                type="number"
                                                                name="amount"
                                                                step="0.01"
                                                                min="0"
                                                                value={form.amount}
                                                                onChange={handleInputChange}
                                                                onWheel={(e) => e.currentTarget.blur()}
                                                                className="form-input ltr:rounded-l-none rtl:rounded-r-none w-24 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                                style={{ direction: 'ltr', textAlign: 'center' }}
                                                                placeholder="0.00"
                                                                disabled={deal?.status === 'completed' || deal?.status === 'cancelled'}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Row 2: Selling Price (Editable) */}
                                                <div className="grid grid-cols-3 gap-4 mb-4 py-2">
                                                    <div className="text-sm pt-2 text-gray-700 dark:text-gray-300 text-right">
                                                        {t('selling_price_manual')}
                                                        <div className="text-xs text-blue-600 dark:text-blue-400 mt-1 font-normal">{t('updates_car_sale_price')}</div>
                                                    </div>
                                                    <div className="text-center">
                                                        <div className="flex justify-center">
                                                            <span className="inline-flex items-center px-2 bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 border ltr:border-r-0 rtl:border-l-0 border-gray-300 dark:border-gray-600 ltr:rounded-l-md rtl:rounded-r-md text-xs">
                                                                ₪
                                                            </span>
                                                            <input
                                                                type="number"
                                                                name="selling_price"
                                                                step="0.01"
                                                                min="0"
                                                                value={form.selling_price || ''}
                                                                onChange={handleInputChange}
                                                                onWheel={(e) => e.currentTarget.blur()}
                                                                className="form-input ltr:rounded-l-none rtl:rounded-r-none w-24 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                                style={{ direction: 'ltr', textAlign: 'center' }}
                                                                placeholder="0.00"
                                                                disabled={deal?.status === 'completed' || deal?.status === 'cancelled'}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            )}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                {/* Customer Selectors - Different for Intermediary Deals */}
                                {dealType === 'intermediary' ? (
                                    <>
                                        {/* Seller Selector for Intermediary Deals */}
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 dark:text-white mb-2">{t('seller')}</label>
                                            <CustomerSelect
                                                selectedCustomer={selectedSeller}
                                                onCustomerSelect={deal?.status === 'completed' || deal?.status === 'cancelled' ? () => {} : handleSellerSelect}
                                                onCreateNew={deal?.status === 'completed' || deal?.status === 'cancelled' ? () => {} : () => handleCreateNewCustomer('seller')}
                                                className="form-input"
                                            />
                                        </div>
                                        {/* Buyer Selector for Intermediary Deals */}
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 dark:text-white mb-2">{t('buyer')}</label>
                                            <CustomerSelect
                                                selectedCustomer={selectedBuyer}
                                                onCustomerSelect={deal?.status === 'completed' || deal?.status === 'cancelled' ? () => {} : handleBuyerSelect}
                                                onCreateNew={deal?.status === 'completed' || deal?.status === 'cancelled' ? () => {} : () => handleCreateNewCustomer('buyer')}
                                                className="form-input"
                                            />
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        {/* Single Customer Selector for Other Deal Types */}
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 dark:text-white mb-2">{t('customer')}</label>
                                            <CustomerSelect
                                                selectedCustomer={selectedCustomer}
                                                onCustomerSelect={deal?.status === 'completed' ? () => {} : handleCustomerSelect}
                                                onCreateNew={deal?.status === 'completed' ? () => {} : () => handleCreateNewCustomer('customer')}
                                                className="form-input"
                                            />
                                        </div>
                                        {/* Car Selector */}
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 dark:text-white mb-2">{t('car')}</label>
                                            <CarSelect
                                                selectedCar={selectedCar}
                                                onCarSelect={deal?.status === 'completed' ? () => {} : handleCarSelect}
                                                className="form-input"
                                                excludeLinkedCars={true}
                                                currentDealId={dealId}
                                            />
                                        </div>
                                    </>
                                )}

                                {/* Car Selector for Intermediary Deals (separate row) */}
                                {dealType === 'intermediary' && (
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-bold text-gray-700 dark:text-white mb-2">{t('car')}</label>
                                        <CarSelect
                                            selectedCar={selectedCar}
                                            onCarSelect={deal?.status === 'completed' ? () => {} : handleCarSelect}
                                            className="form-input"
                                            excludeLinkedCars={true}
                                            currentDealId={dealId}
                                        />
                                    </div>
                                )}
                            </div>
                            {/* Car Taken From Client (Exchange Deals) */}
                            {carTakenFromClient && deal && deal.deal_type === 'exchange' && (
                                <div className="panel">
                                    <div className="mb-5 flex items-center gap-3">
                                        <IconCar className="w-5 h-5 text-orange-500" />
                                        <h5 className="text-lg font-semibold dark:text-white-light">{t('car_taken_from_client')}</h5>
                                    </div>
                                    <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                            <div>
                                                <label className="block text-sm text-orange-600 dark:text-orange-400 font-medium">{t('car_name')}</label>
                                                <p className="font-bold text-gray-900 dark:text-white">{carTakenFromClient.title}</p>
                                            </div>
                                            <div>
                                                <label className="block text-sm text-orange-600 dark:text-orange-400 font-medium">{t('brand')}</label>
                                                <p className="font-bold text-gray-900 dark:text-white">{carTakenFromClient.brand}</p>
                                            </div>
                                            <div>
                                                <label className="block text-sm text-orange-600 dark:text-orange-400 font-medium">{t('year')}</label>
                                                <p className="font-bold text-gray-900 dark:text-white">{carTakenFromClient.year}</p>
                                            </div>
                                            <div>
                                                <label className="block text-sm text-orange-600 dark:text-orange-400 font-medium">{t('kilometers')}</label>
                                                <p className="font-bold text-gray-900 dark:text-white">
                                                    {carTakenFromClient.kilometers.toLocaleString()} {t('km')}
                                                </p>
                                            </div>
                                            <div>
                                                <label className="block text-sm text-orange-600 dark:text-orange-400 font-medium">{t('received_value')}</label>
                                                <p className="font-bold text-orange-700 dark:text-orange-300">{formatCurrency(carTakenFromClient.buy_price)}</p>
                                            </div>
                                            {carTakenFromClient.car_number && (
                                                <div>
                                                    <label className="block text-sm text-orange-600 dark:text-orange-400 font-medium">{t('car_number')}</label>
                                                    <p className="font-bold text-gray-900 dark:text-white">{carTakenFromClient.car_number}</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                            {/* Deal Attachments */}
                            {existingAttachments && existingAttachments.length > 0 && (
                                <div className="panel">
                                    <div className="mb-5 flex items-center gap-3">
                                        <IconNotes className="w-5 h-5 text-primary" />
                                        <h5 className="text-lg font-semibold dark:text-white-light">{t('existing_attachments')}</h5>
                                    </div>
                                    <AttachmentsDisplay
                                        attachments={existingAttachments}
                                        compact={false}
                                        showDeleteButton={true}
                                        onDeleteAttachment={handleRemoveExistingAttachment}
                                        isDeleting={deletingAttachment !== null}
                                    />
                                </div>
                            )}
                        </>
                    )}

                    {/* Attachments Tab */}
                    {activeTab === 'attachments' && (
                        <>
                            {/* Add New Attachments */}
                            <div className="panel">
                                <div className="mb-5 flex items-center gap-3">
                                    <IconNotes className="w-5 h-5 text-primary" />
                                    <h5 className="text-lg font-semibold dark:text-white-light">
                                        {existingAttachments && existingAttachments.length > 0 ? t('add_more_attachments') : t('deal_attachments')}
                                    </h5>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <SingleFileUpload
                                        file={newAttachments.car_license}
                                        onFileChange={(file) => handleFileUpload('car_license', file)}
                                        title={t('car_license')}
                                        description={t('car_license_desc')}
                                        accept="image/*,.pdf"
                                        className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                                    />
                                    <SingleFileUpload
                                        file={newAttachments.driver_license}
                                        onFileChange={(file) => handleFileUpload('driver_license', file)}
                                        title={t('driver_license')}
                                        description={t('driver_license_desc')}
                                        accept="image/*,.pdf"
                                        className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                                    />
                                    <SingleFileUpload
                                        file={newAttachments.car_transfer_document}
                                        onFileChange={(file) => handleFileUpload('car_transfer_document', file)}
                                        title={t('car_transfer_document')}
                                        description={t('car_transfer_document_desc')}
                                        accept="image/*,.pdf"
                                        className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                                    />
                                </div>
                            </div>
                        </>
                    )}

                    {/* Payment Methods Tab */}
                    {activeTab === 'payments' && (
                        <>
                            {/* Payment Methods Section */}
                            <div className="panel">
                                <DealPaymentMethods value={paymentMethods} onChange={setPaymentMethods} notes={paymentNotes} onNotesChange={setPaymentNotes} />
                            </div>
                            {/* Expandable Bill Creation Section */}
                            <div className="panel">
                                {!hasCustomerSignature && (
                                    <div className="mb-4 p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                                        <p className="text-sm text-orange-700 dark:text-orange-300">{t('signature_required_for_bill')}</p>
                                    </div>
                                )}
                                <div className="mb-5 border rounded-xl border-gray-200 dark:border-gray-700">
                                    <button
                                        type="button"
                                        onClick={() => hasCustomerSignature && setIsBillSectionExpanded(!isBillSectionExpanded)}
                                        disabled={!hasCustomerSignature}
                                        className={`flex items-center gap-3 w-full text-left p-3 rounded-lg transition-colors duration-200 ${
                                            hasCustomerSignature ? 'hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer' : 'opacity-50 cursor-not-allowed'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3 flex-1">
                                            <IconDollarSign className="w-5 h-5 text-primary" />
                                            <h5 className="text-lg font-semibold dark:text-white-light">{t('automate_bill_for_deal')}</h5>
                                        </div>{' '}
                                        {hasCustomerSignature && <IconCaretDown className={`w-5 h-5 text-gray-500 transition-transform duration-200 ${isBillSectionExpanded ? 'rotate-180' : ''}`} />}
                                    </button>
                                </div>

                                {isBillSectionExpanded && (
                                    <div className="border-t border-gray-200 dark:border-gray-700 pt-6 space-y-6">
                                        {/* Bill Type Selection */}
                                        <div>
                                            <div className="mb-4 flex items-center gap-3">
                                                <IconDollarSign className="w-5 h-5 text-primary" />
                                                <h6 className="text-md font-semibold dark:text-white-light">{t('bill_type')}</h6>
                                            </div>
                                            <BillTypeSelect
                                                defaultValue={billForm.bill_type}
                                                dealType={deal?.deal_type}
                                                onChange={(billType) => handleBillFormChange({ target: { name: 'bill_type', value: billType } } as any)}
                                                className="w-full"
                                            />
                                        </div>
                                        {/* Bill Direction Selector for All Bills except tax_invoice and tax_invoice_receipt */}
                                        {billForm.bill_type && billForm.bill_type !== 'tax_invoice' && billForm.bill_type !== 'tax_invoice_receipt' && (
                                            <div>
                                                <div className="mb-4 flex items-center gap-3">
                                                    <IconDollarSign className="w-5 h-5 text-primary" />
                                                    <div>
                                                        <h6 className="text-md font-semibold dark:text-white-light">{t('bill_direction')}</h6>
                                                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{t('select_bill_direction_desc')}</p>
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div
                                                        className={`p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 ${
                                                            billForm.bill_direction === 'positive'
                                                                ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                                                                : 'border-gray-300 dark:border-gray-600 hover:border-green-400 dark:hover:border-green-500'
                                                        }`}
                                                        onClick={() => handleBillFormChange({ target: { name: 'bill_direction', value: 'positive' } } as any)}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div
                                                                className={`p-2 rounded-full ${billForm.bill_direction === 'positive' ? 'bg-green-100 dark:bg-green-800' : 'bg-gray-100 dark:bg-gray-700'}`}
                                                            >
                                                                <IconDollarSign
                                                                    className={`w-4 h-4 ${billForm.bill_direction === 'positive' ? 'text-green-600 dark:text-green-400' : 'text-gray-500'}`}
                                                                />
                                                            </div>
                                                            <div>
                                                                <h3
                                                                    className={`font-semibold ${billForm.bill_direction === 'positive' ? 'text-green-800 dark:text-green-200' : 'text-gray-700 dark:text-gray-300'}`}
                                                                >
                                                                    {t('positive_bill')}
                                                                </h3>
                                                                <p className={`text-sm ${billForm.bill_direction === 'positive' ? 'text-green-600 dark:text-green-400' : 'text-gray-500'}`}>
                                                                    {t('positive_bill_desc')}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div
                                                        className={`p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 ${
                                                            billForm.bill_direction === 'negative'
                                                                ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                                                                : 'border-gray-300 dark:border-gray-600 hover:border-red-400 dark:hover:border-red-500'
                                                        }`}
                                                        onClick={() => handleBillFormChange({ target: { name: 'bill_direction', value: 'negative' } } as any)}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div
                                                                className={`p-2 rounded-full ${billForm.bill_direction === 'negative' ? 'bg-red-100 dark:bg-red-800' : 'bg-gray-100 dark:bg-gray-700'}`}
                                                            >
                                                                <IconDollarSign className={`w-4 h-4 ${billForm.bill_direction === 'negative' ? 'text-red-600 dark:text-red-400' : 'text-gray-500'}`} />
                                                            </div>
                                                            <div>
                                                                <h3
                                                                    className={`font-semibold ${billForm.bill_direction === 'negative' ? 'text-red-800 dark:text-red-200' : 'text-gray-700 dark:text-gray-300'}`}
                                                                >
                                                                    {t('negative_bill')}
                                                                </h3>
                                                                <p className={`text-sm ${billForm.bill_direction === 'negative' ? 'text-red-600 dark:text-red-400' : 'text-gray-500'}`}>
                                                                    {t('negative_bill_desc')}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                        {/* General Bill Details */}
                                        {billForm.bill_type === 'general' && (
                                            <div>
                                                <div className="mb-4 flex items-center gap-3">
                                                    <IconReceipt className="w-5 h-5 text-primary" />
                                                    <h6 className="text-md font-semibold dark:text-white-light">{t('general_bill_details')}</h6>
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
                                                            value={billForm.bill_description || ''}
                                                            onChange={handleBillFormChange}
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
                                                            <span className="inline-flex items-center px-3 text-sm text-gray-900 bg-gray-200 border border-r-0 border-gray-300 rounded-l-md dark:bg-gray-600 dark:text-gray-400 dark:border-gray-600">
                                                                ₪
                                                            </span>
                                                            <input
                                                                id="bill_amount"
                                                                name="bill_amount"
                                                                type="number"
                                                                step="0.01"
                                                                value={billForm.bill_amount || ''}
                                                                onChange={handleBillFormChange}
                                                                onWheel={(e) => e.currentTarget.blur()}
                                                                className="form-input rounded-l-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                                placeholder={t('enter_bill_amount')}
                                                                required
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                        {(billForm.bill_type === 'tax_invoice' || billForm.bill_type === 'tax_invoice_receipt') &&
                                            (selectedCustomer || (dealType === 'intermediary' && (selectedSeller || selectedBuyer))) && (
                                                <>
                                                    {/* Customer Information Display */}
                                                    <div>
                                                        <div className="mb-4 flex items-center gap-3">
                                                            <IconUser className="w-5 h-5 text-primary" />
                                                            <h6 className="text-md font-semibold dark:text-white-light">{t('customer_information')}</h6>
                                                        </div>
                                                        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                                                            <h6 className="font-semibold text-blue-800 dark:text-blue-200 mb-3">
                                                                {dealType === 'intermediary' ? t('deal_participants') : t('customer_details')}
                                                            </h6>
                                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                                                                {dealType === 'intermediary' ? (
                                                                    <>
                                                                        {selectedSeller && (
                                                                            <>
                                                                                <div>
                                                                                    <label className="text-blue-700 dark:text-blue-300 font-medium">{t('seller_name')}</label>
                                                                                    <p className="text-blue-900 dark:text-blue-100 font-semibold">{selectedSeller.name}</p>
                                                                                </div>
                                                                                <div>
                                                                                    <label className="text-blue-700 dark:text-blue-300 font-medium">{t('seller_phone')}</label>
                                                                                    <p className="text-blue-900 dark:text-blue-100 font-semibold">{selectedSeller.phone}</p>
                                                                                </div>
                                                                            </>
                                                                        )}
                                                                        {selectedBuyer && (
                                                                            <>
                                                                                <div>
                                                                                    <label className="text-blue-700 dark:text-blue-300 font-medium">{t('buyer_name')}</label>
                                                                                    <p className="text-blue-900 dark:text-blue-100 font-semibold">{selectedBuyer.name}</p>
                                                                                </div>
                                                                                <div>
                                                                                    <label className="text-blue-700 dark:text-blue-300 font-medium">{t('buyer_phone')}</label>
                                                                                    <p className="text-blue-900 dark:text-blue-100 font-semibold">{selectedBuyer.phone}</p>
                                                                                </div>
                                                                            </>
                                                                        )}
                                                                    </>
                                                                ) : (
                                                                    selectedCustomer && (
                                                                        <>
                                                                            <div>
                                                                                <label className="text-blue-700 dark:text-blue-300 font-medium">{t('customer_name')}</label>
                                                                                <p className="text-blue-900 dark:text-blue-100 font-semibold">{selectedCustomer.name}</p>
                                                                            </div>
                                                                            <div>
                                                                                <label className="text-blue-700 dark:text-blue-300 font-medium">{t('phone')}</label>
                                                                                <p className="text-blue-900 dark:text-blue-100 font-semibold">{selectedCustomer.phone}</p>
                                                                            </div>
                                                                        </>
                                                                    )
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Summary Table */}
                                                    {selectedCar && (
                                                        <div>
                                                            <div className="mb-4 flex items-center gap-3">
                                                                <IconDollarSign className="w-5 h-5 text-primary" />
                                                                <h6 className="text-md font-semibold dark:text-white-light">{t('bill_summary')}</h6>
                                                            </div>{' '}
                                                            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                                                                {/* Table Header */}
                                                                <div className="grid grid-cols-4 gap-4 mb-4 pb-2 border-b border-gray-300 dark:border-gray-600">
                                                                    <div className="text-sm font-bold text-gray-700 dark:text-white text-right">{t('item_description')}</div>
                                                                    <div className="text-sm font-bold text-gray-700 dark:text-white text-center">{t('unit_price')}</div>
                                                                    <div className="text-sm font-bold text-gray-700 dark:text-white text-center">{t('quantity')}</div>
                                                                    <div className="text-sm font-bold text-gray-700 dark:text-white text-center">{t('total_price')}</div>
                                                                </div>{' '}
                                                                {(deal?.deal_type === 'new_used_sale' || deal?.deal_type === 'new_sale' || deal?.deal_type === 'used_sale') && (
                                                                    <>
                                                                        {/* Row 1: Car for Sale */}
                                                                        <div className="grid grid-cols-4 gap-4 mb-3 py-2">
                                                                            <div className="text-sm text-gray-700 dark:text-gray-300 text-right">
                                                                                <div className="font-medium">{t('car_for_sale')}</div>
                                                                                <div className="text-xs text-gray-500">
                                                                                    {selectedCar.brand} {selectedCar.title} - {selectedCar.year}
                                                                                    {selectedCar.car_number && ` - ${selectedCar.car_number}`} - #{selectedCar.id}
                                                                                </div>
                                                                            </div>
                                                                            <div className="text-center">-</div>
                                                                            <div className="text-center">-</div>
                                                                            <div className="text-center">-</div>
                                                                        </div>
                                                                        {/* Row 2: Buy Price */}
                                                                        <div className="grid grid-cols-4 gap-4 mb-3 py-2">
                                                                            <div className="text-sm text-gray-700 dark:text-gray-300 text-right">{t('buy_price_auto')}</div>{' '}
                                                                            <div className="text-center">
                                                                                <span className="text-sm text-gray-700 dark:text-gray-300">{formatCurrency(selectedCar.buy_price || 0)}</span>
                                                                            </div>
                                                                            <div className="text-center">
                                                                                <span className="text-sm text-gray-700 dark:text-gray-300">1</span>
                                                                            </div>
                                                                            <div className="text-center">
                                                                                <span className="text-sm text-gray-700 dark:text-gray-300">{formatCurrency(selectedCar.buy_price || 0)}</span>
                                                                            </div>
                                                                        </div>{' '}
                                                                        {/* Row 3: Selling Price */}
                                                                        <div className="grid grid-cols-4 gap-4 mb-3 py-2">
                                                                            <div className="text-sm text-gray-700 dark:text-gray-300 text-right">{t('selling_price_manual')}</div>{' '}
                                                                            <div className="text-center">
                                                                                <span className="text-sm text-gray-700 dark:text-gray-300">
                                                                                    {formatCurrency(parseFloat(form.selling_price || '0'))}
                                                                                </span>
                                                                            </div>
                                                                            <div className="text-center">
                                                                                <span className="text-sm text-gray-700 dark:text-gray-300">1</span>
                                                                            </div>
                                                                            <div className="text-center">
                                                                                <span className="text-sm text-gray-700 dark:text-gray-300">
                                                                                    {formatCurrency(parseFloat(form.selling_price || '0'))}
                                                                                </span>
                                                                            </div>
                                                                        </div>
                                                                        {/* Row 4: Loss */}
                                                                        <div className="grid grid-cols-4 gap-4 mb-3 py-2">
                                                                            <div className="text-sm text-gray-700 dark:text-gray-300 text-right">{t('loss_amount')}</div>
                                                                            <div className="text-center">-</div>
                                                                            <div className="text-center">-</div>{' '}
                                                                            <div className="text-center">
                                                                                <span className="text-sm text-red-600 dark:text-red-400">
                                                                                    {formatCurrency(parseFloat(String(form.loss_amount || '0')))}
                                                                                </span>
                                                                            </div>
                                                                        </div>
                                                                        {/* Row 5: Profit Commission */}
                                                                        <div className="grid grid-cols-4 gap-4 mb-4 py-2">
                                                                            <div className="text-sm text-gray-700 dark:text-gray-300 text-right">{t('profit_commission')}</div>
                                                                            <div className="text-center">-</div>
                                                                            <div className="text-center">-</div>
                                                                            <div className="text-center">
                                                                                <span
                                                                                    className={`text-sm ${(() => {
                                                                                        const buyPrice = selectedCar.buy_price || 0;
                                                                                        const sellPrice = parseFloat(form.selling_price || '0');
                                                                                        const loss = parseFloat(form.loss_amount || '0');
                                                                                        const profit = sellPrice - buyPrice - loss;
                                                                                        return profit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';
                                                                                    })()}`}
                                                                                >
                                                                                    ${' '}
                                                                                    {(() => {
                                                                                        const buyPrice = selectedCar.buy_price || 0;
                                                                                        const sellPrice = parseFloat(form.selling_price || '0');
                                                                                        const loss = parseFloat(form.loss_amount || '0');
                                                                                        const profit = sellPrice - buyPrice - loss;
                                                                                        return profit >= 0 ? `+${formatCurrency(profit)}` : formatCurrency(profit);
                                                                                    })()}
                                                                                </span>
                                                                            </div>
                                                                        </div>
                                                                    </>
                                                                )}
                                                                {deal?.deal_type === 'new_used_sale_tax_inclusive' && (
                                                                    <>
                                                                        {/* Row 1: Car for Sale */}
                                                                        <div className="grid grid-cols-4 gap-4 mb-3 py-2">
                                                                            <div className="text-sm text-gray-700 dark:text-gray-300 text-right">
                                                                                <div className="font-medium">{t('car_for_sale')}</div>
                                                                                <div className="text-xs text-gray-500">
                                                                                    {selectedCar.brand} {selectedCar.title} - {selectedCar.year}
                                                                                    {selectedCar.car_number && ` - ${selectedCar.car_number}`} - #{selectedCar.id}
                                                                                </div>
                                                                            </div>
                                                                            <div className="text-center">-</div>
                                                                            <div className="text-center">-</div>
                                                                            <div className="text-center">-</div>
                                                                        </div>
                                                                        {/* Row 2: Buy Price */}
                                                                        <div className="grid grid-cols-4 gap-4 mb-3 py-2">
                                                                            <div className="text-sm text-gray-700 dark:text-gray-300 text-right">{t('buy_price_auto')}</div>{' '}
                                                                            <div className="text-center">
                                                                                <span className="text-sm text-gray-700 dark:text-gray-300">{formatCurrency(selectedCar.buy_price || 0)}</span>
                                                                            </div>
                                                                            <div className="text-center">
                                                                                <span className="text-sm text-gray-700 dark:text-gray-300">1</span>
                                                                            </div>
                                                                            <div className="text-center">
                                                                                <span className="text-sm text-gray-700 dark:text-gray-300">{formatCurrency(selectedCar.buy_price || 0)}</span>
                                                                            </div>
                                                                        </div>{' '}
                                                                        {/* Row 3: Selling Price */}
                                                                        <div className="grid grid-cols-4 gap-4 mb-3 py-2">
                                                                            <div className="text-sm text-gray-700 dark:text-gray-300 text-right">{t('selling_price_manual')}</div>{' '}
                                                                            <div className="text-center">
                                                                                <span className="text-sm text-gray-700 dark:text-gray-300">
                                                                                    {formatCurrency(parseFloat(form.selling_price || '0'))}
                                                                                </span>
                                                                            </div>
                                                                            <div className="text-center">
                                                                                <span className="text-sm text-gray-700 dark:text-gray-300">1</span>
                                                                            </div>
                                                                            <div className="text-center">
                                                                                <span className="text-sm text-gray-700 dark:text-gray-300">
                                                                                    {formatCurrency(parseFloat(form.selling_price || '0'))}
                                                                                </span>
                                                                            </div>
                                                                        </div>
                                                                        {/* Row 4: Loss */}
                                                                        <div className="grid grid-cols-4 gap-4 mb-3 py-2">
                                                                            <div className="text-sm text-gray-700 dark:text-gray-300 text-right">{t('loss_amount')}</div>
                                                                            <div className="text-center">-</div>
                                                                            <div className="text-center">-</div>{' '}
                                                                            <div className="text-center">
                                                                                <span className="text-sm text-red-600 dark:text-red-400">
                                                                                    {formatCurrency(parseFloat(String(form.loss_amount || '0')))}
                                                                                </span>
                                                                            </div>
                                                                        </div>
                                                                        {/* Row 5: Profit Commission */}
                                                                        <div className="grid grid-cols-4 gap-4 mb-4 py-2">
                                                                            <div className="text-sm text-gray-700 dark:text-gray-300 text-right">{t('profit_commission')}</div>
                                                                            <div className="text-center">-</div>
                                                                            <div className="text-center">-</div>
                                                                            <div className="text-center">
                                                                                <span
                                                                                    className={`text-sm ${(() => {
                                                                                        const buyPrice = selectedCar.buy_price || 0;
                                                                                        const sellPrice = parseFloat(form.selling_price || '0');
                                                                                        const loss = parseFloat(form.loss_amount || '0');
                                                                                        const profit = sellPrice - buyPrice - loss;
                                                                                        return profit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';
                                                                                    })()}`}
                                                                                >
                                                                                    ${' '}
                                                                                    {(() => {
                                                                                        const buyPrice = selectedCar.buy_price || 0;
                                                                                        const sellPrice = parseFloat(form.selling_price || '0');
                                                                                        const loss = parseFloat(form.loss_amount || '0');
                                                                                        const profit = sellPrice - buyPrice - loss;
                                                                                        return profit >= 0 ? `+${formatCurrency(profit)}` : formatCurrency(profit);
                                                                                    })()}
                                                                                </span>
                                                                            </div>
                                                                        </div>
                                                                    </>
                                                                )}
                                                                {deal?.deal_type === 'intermediary' && (
                                                                    <>
                                                                        {/* Row 1: Car Brokerage Commission */}
                                                                        <div className="grid grid-cols-4 gap-4 mb-3 py-2">
                                                                            <div className="text-sm text-gray-700 dark:text-gray-300 text-right">
                                                                                <div className="font-medium">{t('intermediary_car_commission')}</div>
                                                                                <div className="text-xs text-gray-500">
                                                                                    {selectedCar.brand} {selectedCar.title} - {selectedCar.year}
                                                                                    {selectedCar.car_number && ` - ${selectedCar.car_number}`} - #{selectedCar.id}
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
                                                                                <span className="text-sm text-gray-700 dark:text-gray-300">{formatCurrency(deal?.amount || 0)}</span>
                                                                            </div>
                                                                            <div className="text-center">
                                                                                <span className="text-sm text-gray-700 dark:text-gray-300">1</span>
                                                                            </div>
                                                                            <div className="text-center">
                                                                                <span className="text-sm text-green-600 dark:text-green-400">{formatCurrency(deal?.amount || 0)}</span>
                                                                            </div>
                                                                        </div>
                                                                    </>
                                                                )}
                                                                {deal?.deal_type === 'financing_assistance_intermediary' && (
                                                                    <>
                                                                        {/* Row 1: Financing Assistance Commission */}
                                                                        <div className="grid grid-cols-4 gap-4 mb-3 py-2">
                                                                            <div className="text-sm text-gray-700 dark:text-gray-300 text-right">
                                                                                <div className="font-medium">{t('financing_assistance_commission')}</div>
                                                                                <div className="text-xs text-gray-500">
                                                                                    {selectedCar.brand} {selectedCar.title} - {selectedCar.year}
                                                                                    {selectedCar.car_number && ` - ${selectedCar.car_number}`} - #{selectedCar.id}
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
                                                                                <span className="text-sm text-gray-700 dark:text-gray-300">{formatCurrency(deal?.amount || 0)}</span>
                                                                            </div>
                                                                            <div className="text-center">
                                                                                <span className="text-sm text-gray-700 dark:text-gray-300">1</span>
                                                                            </div>
                                                                            <div className="text-center">
                                                                                <span className="text-sm text-green-600 dark:text-green-400">{formatCurrency(deal?.amount || 0)}</span>
                                                                            </div>
                                                                        </div>
                                                                    </>
                                                                )}
                                                                {deal?.deal_type === 'exchange' && (
                                                                    <>
                                                                        {/* Row 1: Car for Sale */}
                                                                        <div className="grid grid-cols-4 gap-4 mb-3 py-2">
                                                                            <div className="text-sm text-gray-700 dark:text-gray-300 text-right">
                                                                                <div className="font-medium">{t('car_for_sale')}</div>
                                                                                <div className="text-xs text-gray-500">
                                                                                    {selectedCar.brand} {selectedCar.title} - {selectedCar.year}
                                                                                    {selectedCar.car_number && ` - ${selectedCar.car_number}`} - #{selectedCar.id}
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
                                                                                <span className="text-sm text-gray-700 dark:text-gray-300">{formatCurrency(selectedCar.buy_price || 0)}</span>
                                                                            </div>
                                                                            <div className="text-center">
                                                                                <span className="text-sm text-gray-700 dark:text-gray-300">1</span>
                                                                            </div>
                                                                            <div className="text-center">
                                                                                <span className="text-sm text-red-600 dark:text-red-400">-{formatCurrency(selectedCar.buy_price || 0)}</span>
                                                                            </div>
                                                                        </div>

                                                                        {/* Row 3: Sale Price */}
                                                                        <div className="grid grid-cols-4 gap-4 mb-3 py-2">
                                                                            <div className="text-sm text-gray-700 dark:text-gray-300 text-right">{t('sale_price_auto')}</div>
                                                                            <div className="text-center">
                                                                                <span className="text-sm text-gray-700 dark:text-gray-300">{formatCurrency(selectedCar.sale_price || 0)}</span>
                                                                            </div>
                                                                            <div className="text-center">
                                                                                <span className="text-sm text-gray-700 dark:text-gray-300">1</span>
                                                                            </div>
                                                                            <div className="text-center">
                                                                                <span className="text-sm text-green-600 dark:text-green-400">{formatCurrency(selectedCar.sale_price || 0)}</span>
                                                                            </div>
                                                                        </div>

                                                                        {/* Row 4: Deal Amount */}
                                                                        {hasPermission('view_car_purchase_price') && (
                                                                            <div className="grid grid-cols-4 gap-4 mb-4 py-2">
                                                                                <div className="text-sm text-gray-700 dark:text-gray-300 text-right">{t('deal_amount_exchange')}</div>
                                                                                <div className="text-center">
                                                                                    <span className="text-sm text-gray-700 dark:text-gray-300">{formatCurrency(deal?.amount || 0)}</span>
                                                                                </div>
                                                                                <div className="text-center">
                                                                                    <span className="text-sm text-gray-700 dark:text-gray-300">1</span>
                                                                                </div>
                                                                                <div className="text-center">
                                                                                    {' '}
                                                                                    <span className="text-sm text-blue-600 dark:text-blue-400">{formatCurrency(deal?.amount || 0)}</span>
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                    </>
                                                                )}
                                                                {deal?.deal_type === 'company_commission' && (
                                                                    <>
                                                                        {/* Row 1: Company Commission */}
                                                                        <div className="grid grid-cols-4 gap-4 mb-4 py-2">
                                                                            <div className="text-sm text-gray-700 dark:text-gray-300 text-right">
                                                                                <div className="font-medium">{t('deal_type_company_commission')}</div>
                                                                            </div>
                                                                            <div className="text-center">
                                                                                <span className="text-sm text-gray-700 dark:text-gray-300">{formatCurrency(deal?.amount || 0)}</span>
                                                                            </div>
                                                                            <div className="text-center">
                                                                                <span className="text-sm text-gray-700 dark:text-gray-300">1</span>
                                                                            </div>
                                                                            <div className="text-center">
                                                                                <span className="text-sm text-green-600 dark:text-green-400">{formatCurrency(deal?.amount || 0)}</span>
                                                                            </div>
                                                                        </div>
                                                                    </>
                                                                )}
                                                                {/* Fallback: Show basic deal info if no specific deal type matches */}
                                                                {![
                                                                    'new_used_sale',
                                                                    'new_sale',
                                                                    'used_sale',
                                                                    'new_used_sale_tax_inclusive',
                                                                    'intermediary',
                                                                    'financing_assistance_intermediary',
                                                                    'exchange',
                                                                    'company_commission',
                                                                ].includes(deal?.deal_type || '') && (
                                                                    <div className="grid grid-cols-4 gap-4 mb-4 py-2">
                                                                        <div className="text-sm text-gray-700 dark:text-gray-300 text-right">
                                                                            <div className="font-medium">{t('deal_item')}</div>
                                                                            <div className="text-xs text-gray-500">
                                                                                {deal?.title || t('deal')} - {deal?.deal_type || t('unknown_type')}
                                                                            </div>
                                                                        </div>
                                                                        <div className="text-center">
                                                                            <span className="text-sm text-gray-700 dark:text-gray-300">{formatCurrency(deal?.amount || 0)}</span>
                                                                        </div>
                                                                        <div className="text-center">
                                                                            <span className="text-sm text-gray-700 dark:text-gray-300">1</span>
                                                                        </div>
                                                                        <div className="text-center">
                                                                            <span className="text-sm text-green-600 dark:text-green-400">{formatCurrency(deal?.amount || 0)}</span>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                                {/* Separator */}
                                                                <div className="border-t border-gray-300 dark:border-gray-600 my-4"></div>
                                                                {/* Tax Calculations */}
                                                                {deal.deal_type === 'new_used_sale_tax_inclusive' ? (
                                                                    <div className="space-y-3">
                                                                        {/* Price Before Tax */}
                                                                        <div className="flex justify-between items-center">
                                                                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('price_before_tax')}</span>
                                                                            <span className="text-sm text-gray-700 dark:text-gray-300">
                                                                                {formatCurrency(deal?.selling_price - deal?.selling_price * 0.18 || 0)}
                                                                            </span>
                                                                        </div>

                                                                        {/* Tax */}
                                                                        <div className="flex justify-between items-center">
                                                                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('deal_tax')} 18%</span>
                                                                            <span className="text-sm text-gray-700 dark:text-gray-300">{formatCurrency((deal?.selling_price || 0) * 0.18)}</span>
                                                                        </div>

                                                                        {/* Total Including Tax */}
                                                                        <div className="flex justify-between items-center pt-2 border-t border-gray-300 dark:border-gray-600">
                                                                            <span className="text-lg font-bold text-gray-700 dark:text-gray-300">{t('total_including_tax')}</span>
                                                                            <span className="text-lg font-bold text-primary">{formatCurrency(deal?.selling_price || 0)}</span>
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    <div className="space-y-3">
                                                                        {/* Price Before Tax */}
                                                                        <div className="flex justify-between items-center">
                                                                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('price_before_tax')}</span>
                                                                            <span className="text-sm text-gray-700 dark:text-gray-300">{formatCurrency(deal?.amount - deal?.amount * 0.18 || 0)}</span>
                                                                        </div>

                                                                        {/* Tax */}
                                                                        <div className="flex justify-between items-center">
                                                                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('deal_tax')} 18%</span>
                                                                            <span className="text-sm text-gray-700 dark:text-gray-300">{formatCurrency((deal?.amount || 0) * 0.18)}</span>
                                                                        </div>

                                                                        {/* Total Including Tax */}
                                                                        <div className="flex justify-between items-center pt-2 border-t border-gray-300 dark:border-gray-600">
                                                                            <span className="text-lg font-bold text-gray-700 dark:text-gray-300">{t('total_including_tax')}</span>
                                                                            <span className="text-lg font-bold text-primary">{formatCurrency(deal?.amount || 0)}</span>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Bill Notes */}
                                                    <div>
                                                        <label htmlFor="bill_free_text" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                            {t('bill_notes')}
                                                        </label>
                                                        <textarea
                                                            id="bill_free_text"
                                                            name="free_text"
                                                            rows={3}
                                                            value={billForm.free_text || ''}
                                                            onChange={handleBillFormChange}
                                                            className="form-textarea"
                                                            placeholder={t('enter_bill_notes')}
                                                        />
                                                    </div>
                                                </>
                                            )}
                                        {/* Receipt Section */}
                                        {(billForm.bill_type === 'receipt_only' || billForm.bill_type === 'tax_invoice_receipt') && (
                                            <div>
                                                <div className="mb-4 flex items-center gap-3">
                                                    <IconDollarSign className="w-5 h-5 text-primary" />
                                                    <h6 className="text-md font-semibold dark:text-white-light">{t('receipt_details')}</h6>
                                                </div>

                                                <MultiplePaymentForm
                                                    payments={payments.map((p) => ({
                                                        ...p,
                                                        payment_type: p.payment_type as 'cash' | 'bank_transfer' | 'check' | 'visa',
                                                    }))}
                                                    onPaymentsChange={setPayments}
                                                    totalAmount={parseFloat(billForm.total_with_tax) || 0}
                                                    deal={deal}
                                                    carTakenFromClient={carTakenFromClient}
                                                    bills={bills}
                                                />
                                            </div>
                                        )}
                                        {/* Create Bill Button */}
                                        {billForm.bill_type && (
                                            <div className="flex justify-end gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                                                <button type="button" onClick={() => setIsBillSectionExpanded(false)} className="btn btn-outline-secondary">
                                                    {t('cancel')}
                                                </button>
                                                <button type="button" onClick={handleCreateBill} className="btn btn-success px-8" disabled={creatingBill}>
                                                    {creatingBill ? t('creating') : t('create_bill')}
                                                </button>
                                            </div>
                                        )}{' '}
                                    </div>
                                )}
                            </div>
                        </>
                    )}

                    {/* Bills Tab */}
                    {hasPermission('view_bills') && activeTab === 'bills' && (
                        <>
                            {/* Register Order Section */}
                            <div className="mb-6 panel bg-gradient-to-r from-orange-50 to-yellow-50 dark:from-orange-900/20 dark:to-yellow-900/20 border-2 border-orange-300 dark:border-orange-700">
                                <div className="mb-4">
                                    <h5 className="text-lg font-bold text-orange-800 dark:text-orange-300 flex items-center gap-2">
                                        <IconDocument className="w-5 h-5" />
                                        أمر سجل (Register Order)
                                    </h5>
                                    <p className="text-sm text-orange-600 dark:text-orange-400 mt-1">{t('register_order_description') || 'Add amounts to be deducted from the deal balance'}</p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label htmlFor="register_order_amount" className="block text-sm font-bold text-gray-700 dark:text-white mb-2">
                                            {t('amount')} <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="number"
                                            id="register_order_amount"
                                            value={registerOrderForm.amount}
                                            onChange={(e) => setRegisterOrderForm((prev) => ({ ...prev, amount: e.target.value }))}
                                            onWheel={(e) => e.currentTarget.blur()}
                                            className="form-input [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                            placeholder="0"
                                            step="0.01"
                                            min="0"
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label htmlFor="register_order_description" className="block text-sm font-bold text-gray-700 dark:text-white mb-2">
                                            {t('description')} <span className="text-red-500">*</span>
                                        </label>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                id="register_order_description"
                                                value={registerOrderForm.description}
                                                onChange={(e) => setRegisterOrderForm((prev) => ({ ...prev, description: e.target.value }))}
                                                className="form-input flex-1"
                                                placeholder={t('enter_description')}
                                            />
                                            <button type="button" onClick={handleCreateRegisterOrder} className="btn btn-primary" disabled={creatingRegisterOrder}>
                                                {creatingRegisterOrder ? (
                                                    <div className="flex items-center gap-2">
                                                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-l-transparent"></div>
                                                        {t('creating')}
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-2">
                                                        <IconPlus className="w-4 h-4" />
                                                        {t('add')}
                                                    </div>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Register Orders List */}
                            {registerOrders.length > 0 && (
                                <div className="mb-6 panel">
                                    <div className="mb-4">
                                        <h5 className="text-lg font-semibold text-gray-800 dark:text-white">{t('register_orders') || 'Register Orders'}</h5>
                                    </div>
                                    <div className="table-responsive">
                                        <table className="table-hover">
                                            <thead>
                                                <tr>
                                                    <th className="text-sm font-medium">{t('amount')}</th>
                                                    <th className="text-sm font-medium">{t('description')}</th>
                                                    <th className="text-sm font-medium">{t('created_date')}</th>
                                                    <th className="text-sm font-medium text-center">{t('actions')}</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {registerOrders.map((order, index) => (
                                                    <tr key={index}>
                                                        <td>
                                                            <span className="text-danger font-semibold">-{formatCurrency(order.amount)}</span>
                                                        </td>
                                                        <td>{order.description}</td>
                                                        <td className="text-sm text-gray-600 dark:text-gray-400">
                                                            {new Date(order.created_at).toLocaleDateString('en-GB', {
                                                                year: 'numeric',
                                                                month: '2-digit',
                                                                day: '2-digit',
                                                            })}
                                                        </td>
                                                        <td className="text-center">
                                                            <button type="button" onClick={() => handleDeleteRegisterOrder(index)} className="btn btn-sm btn-outline-danger" title={t('delete')}>
                                                                <IconTrashLines className="w-4 h-4" />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                            <tfoot>
                                                <tr className="bg-gray-50 dark:bg-gray-800">
                                                    <td className="font-bold">{t('total_deductions') || 'Total Deductions'}:</td>
                                                    <td colSpan={3}>
                                                        <span className="text-danger font-bold text-lg">-{formatCurrency(registerOrders.reduce((sum, order) => sum + order.amount, 0))}</span>
                                                    </td>
                                                </tr>
                                            </tfoot>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* Connected Bills Section */}
                            <BillsTable
                                bills={bills}
                                loading={loadingBills}
                                onDownloadPDF={handleDownloadPDF}
                                downloadingPDF={downloadingPDF}
                                readOnly={false}
                                deal={deal}
                                car={selectedCar}
                                carTakenFromClient={carTakenFromClient}
                                selectedCustomer={selectedCustomer}
                                registerOrders={registerOrders}
                            />
                        </>
                    )}

                    {/* Submit Button */}
                    <div className="flex justify-end gap-4 mt-8">
                        <button type="button" onClick={() => router.push('/sales-deals')} className="btn btn-outline-secondary">
                            {t('cancel')}
                        </button>
                        {form.status !== 'completed' && form.status !== 'cancelled' && (
                            <button type="button" onClick={handleCancelDealClick} className="btn btn-outline-danger">
                                {t('cancel_deal')}
                            </button>
                        )}
                        {deal?.status !== 'completed' ? (
                            <button type="submit" className="btn btn-primary" disabled={saving}>
                                {saving ? t('updating') : t('update_deal')}
                            </button>
                        ) : (
                            <div className="flex items-center gap-3">
                                <button type="submit" className="btn btn-primary" disabled={saving || Object.keys(newAttachments).length === 0}>
                                    {saving ? t('updating_attachments') : t('update_attachments')}
                                </button>
                                {Object.keys(newAttachments).length === 0 && <span className="text-sm text-gray-500 dark:text-gray-400">{t('select_attachments_to_update')}</span>}
                            </div>
                        )}
                    </div>
                </form>
            </div>

            {/* Cancel Deal Confirmation Modal */}
            {showCancelModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full">
                        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('confirm_cancel_deal')}</h3>
                            <button onClick={() => setShowCancelModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" disabled={cancellingDeal}>
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                                {bills && bills.length > 0 ? (
                                    <div className="space-y-2">
                                        <p className="font-medium text-amber-600 dark:text-amber-400">⚠️ {t('deal_has_bills_warning')}</p>
                                        <p>{t('refund_bill_will_be_created')}</p>
                                    </div>
                                ) : (
                                    <p>{t('deal_cancel_confirmation')}</p>
                                )}
                            </div>

                            <div>
                                <label htmlFor="cancelReason" className="block text-sm font-medium text-gray-700 dark:text-white mb-2">
                                    {t('cancellation_reason')} <span className="text-red-500">*</span>
                                </label>
                                <textarea
                                    id="cancelReason"
                                    value={cancelReason}
                                    onChange={(e) => setCancelReason(e.target.value)}
                                    className="form-textarea min-h-[100px] w-full"
                                    placeholder={t('enter_cancellation_reason')}
                                    disabled={cancellingDeal}
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
                            <button onClick={() => setShowCancelModal(false)} className="btn btn-outline-secondary" disabled={cancellingDeal}>
                                {t('cancel')}
                            </button>
                            <button onClick={handleCancelDealConfirm} className="btn btn-danger" disabled={cancellingDeal || !cancelReason.trim()}>
                                {cancellingDeal ? t('cancelling') : t('confirm_cancel_deal')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Create Customer Modal */}
            <CreateCustomerModal isOpen={showCreateCustomerModal} onClose={() => setShowCreateCustomerModal(false)} onCustomerCreated={handleCustomerCreated} />
        </div>
    );
};

export default EditDeal;
