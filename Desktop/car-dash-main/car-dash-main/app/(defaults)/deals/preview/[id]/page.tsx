'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import supabase from '@/lib/supabase';
import { Alert } from '@/components/elements/alerts/elements-alerts-default';
import { getTranslation } from '@/i18n';
import IconEdit from '@/components/icon/icon-edit';
import IconCalendar from '@/components/icon/icon-calendar';
import IconDollarSign from '@/components/icon/icon-dollar-sign';
import IconUser from '@/components/icon/icon-user';
import IconCar from '@/components/icon/icon-car';
import IconPhone from '@/components/icon/icon-phone';
import IconMapPin from '@/components/icon/icon-map-pin';
import IconInvoice from '@/components/icon/icon-invoice';
import IconReceipt from '@/components/icon/icon-receipt';
import IconPlus from '@/components/icon/icon-plus';
import IconPaperclip from '@/components/icon/icon-paperclip';
import { Deal, DealAttachment } from '@/types';
import AttachmentsDisplay from '@/components/attachments/attachments-display';
import ContractGenerator from '@/components/contracts/contract-generator';
import { CarContract } from '@/types/contract';
import { ContractPDFGenerator } from '@/utils/contract-pdf-generator-new';
import IconDocument from '@/components/icon/icon-document';
import { getCompanyInfo, CompanyInfo } from '@/lib/company-info';

interface Customer {
    id: string;
    name: string;
    phone: string;
    age: number;
}

interface Car {
    id: string;
    title: string;
    year: number;
    brand: string;
    status: string;
    type?: string;
    provider: string;
    kilometers: number;
    market_price: number;
    buy_price: number;
    sale_price: number;
    car_number?: string;
    images: string[] | string;
}

interface Bill {
    id: string;
    bill_type: string;
    status: string;
    customer_name: string;
    date: string;
    total_with_tax: number;
    total: number;
    created_at: string;
}

const PreviewDeal = ({ params }: { params: { id: string } }) => {
    const { t } = getTranslation();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [deal, setDeal] = useState<Deal | null>(null);
    const [customer, setCustomer] = useState<Customer | null>(null);
    const [car, setCar] = useState<Car | null>(null);
    const [carTakenFromClient, setCarTakenFromClient] = useState<Car | null>(null);
    const [bills, setBills] = useState<Bill[]>([]);
    const [carImageUrl, setCarImageUrl] = useState<string | null>(null);
    const [carTakenImageUrl, setCarTakenImageUrl] = useState<string | null>(null);
    const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
    const [generatingContract, setGeneratingContract] = useState(false);
    const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);
    const dealId = params.id;

    const [alert, setAlert] = useState<{ visible: boolean; message: string; type: 'success' | 'danger' }>({
        visible: false,
        message: '',
        type: 'success',
    });
    useEffect(() => {
        const fetchDeal = async () => {
            try {
                const { data, error } = await supabase.from('deals').select('*').eq('id', dealId).single();

                if (error) throw error;

                if (data) {
                    setDeal(data);
                    console.log('Fetched deal:', data);

                    // Fetch customer details if customer_id exists
                    if (data.customer_id) {
                        const { data: customerData } = await supabase.from('customers').select('*').eq('id', data.customer_id).single();
                        if (customerData) {
                            setCustomer(customerData);
                        }
                    } // Fetch car details if car_id exists
                    if (data.car_id) {
                        const { data: carData } = await supabase.from('cars').select('*').eq('id', data.car_id).single();
                        if (carData) {
                            setCar(carData);
                            // Get car image URL
                            if (carData.images && carData.images.length > 0) {
                                const imageUrl = await getCarImageUrl(carData.images);
                                setCarImageUrl(imageUrl);
                            }
                        }
                    }

                    // Fetch car taken from client details if car_taken_from_client exists (for exchange deals)
                    if (data.car_taken_from_client) {
                        const { data: carTakenData } = await supabase.from('cars').select('*').eq('id', data.car_taken_from_client).single();
                        if (carTakenData) {
                            setCarTakenFromClient(carTakenData);
                            // Get car taken image URL
                            if (carTakenData.images && carTakenData.images.length > 0) {
                                const imageUrl = await getCarImageUrl(carTakenData.images);
                                setCarTakenImageUrl(imageUrl);
                            }
                        }
                    }

                    // Fetch bills linked to this deal
                    const { data: billsData } = await supabase
                        .from('bills')
                        .select(
                            'id, bill_type, status, customer_name, date, total_with_tax, total, created_at, bill_amount, payment_type, visa_amount, cash_amount, bank_amount, transfer_amount, check_amount',
                        )
                        .eq('deal_id', dealId)
                        .order('created_at', { ascending: false });

                    if (billsData) {
                        setBills(billsData);
                    }
                }
            } catch (error) {
                console.error('Error fetching deal:', error);
                setAlert({ visible: true, message: t('error_loading_data'), type: 'danger' });
            } finally {
                setLoading(false);
            }
        };

        if (dealId) {
            fetchDeal();
        }
    }, [dealId]);

    // Load company information
    useEffect(() => {
        const loadCompanyInfo = async () => {
            try {
                const info = await getCompanyInfo();
                setCompanyInfo(info);
            } catch (error) {
                console.error('Failed to load company info:', error);
            }
        };
        loadCompanyInfo();
    }, []);

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'ILS',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(value);
    };

    // Helper function to get bill amount based on bill type and payment method
    const getBillAmount = (bill: any) => {
        if (bill.bill_type === 'general') {
            return parseFloat(bill.bill_amount || '0');
        }

        if (bill.bill_type === 'tax_invoice') {
            return parseFloat(bill.total_with_tax || '0');
        }

        // For receipt types, return the payment amount based on payment method
        if (bill.bill_type === 'receipt_only' || bill.bill_type === 'tax_invoice_receipt') {
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
    const getCarImageUrl = async (images: string[] | string | null) => {
        if (!images) return null;
        const imageArray = Array.isArray(images) ? images : [images];
        if (imageArray.length === 0) return null;
        const imagePath = imageArray[0];
        const { data } = supabase.storage.from('cars').getPublicUrl(imagePath);
        return data.publicUrl;
    };

    const getDealTypeBadgeClass = (type: string) => {
        switch (type) {
            case 'new_used_sale':
            case 'new_sale':
            case 'used_sale':
                return 'badge-outline-success';
            case 'exchange':
                return 'badge-outline-primary';
            case 'intermediary':
                return 'badge-outline-warning';
            case 'company_commission':
                return 'badge-outline-info';
            default:
                return 'badge-outline-secondary';
        }
    };
    const getStatusBadgeClass = (status: string) => {
        switch (status) {
            case 'active':
                return 'badge-outline-success';
            case 'completed':
                return 'badge-outline-primary';
            case 'cancelled':
                return 'badge-outline-danger';
            default:
                return 'badge-outline-secondary';
        }
    };

    const getBillStatusBadgeClass = (status: string) => {
        switch (status) {
            case 'paid':
                return 'badge-outline-success';
            case 'pending':
                return 'badge-outline-warning';
            case 'overdue':
                return 'badge-outline-danger';
            default:
                return 'badge-outline-secondary';
        }
    };

    const getBillTypeIcon = (type: string) => {
        switch (type) {
            case 'tax_invoice':
                return <IconInvoice className="w-5 h-5" />;
            case 'receipt_only':
                return <IconReceipt className="w-5 h-5" />;
            case 'tax_invoice_receipt':
                return <IconInvoice className="w-5 h-5" />;
            default:
                return <IconInvoice className="w-5 h-5" />;
        }
    };

    const createContractData = (bill?: Bill): CarContract => {
        if (!deal || !customer || !car) throw new Error('Missing required data');

        return {
            dealType: deal.deal_type === 'exchange' ? 'trade-in' : 'normal',
            dealDate: new Date(deal.created_at).toISOString().split('T')[0],

            // Use real company info instead of translation keys
            sellerName: companyInfo?.name || 'Car Dealership',
            sellerTaxNumber: companyInfo?.tax_number || '',
            sellerAddress: companyInfo?.address || '',
            sellerPhone: companyInfo?.phone || '',

            // Customer info
            buyerName: customer.name,
            buyerId: customer.id,
            buyerAddress: '',
            buyerPhone: customer.phone,

            // Car info
            carType: car.type || '',
            carMake: car.brand,
            carModel: car.title,
            carYear: car.year,
            carPlateNumber: car.car_number || '',
            carVin: '', // Would need to be added to car data
            carEngineNumber: '', // Would need to be added to car data
            carKilometers: car.kilometers,

            // Deal amount (always available)
            dealAmount: deal.amount || 0,

            // Trade-in car info if applicable
            ...(carTakenFromClient && {
                tradeInCar: {
                    type: carTakenFromClient.type || '',
                    plateNumber: carTakenFromClient.car_number || '',
                    year: carTakenFromClient.year,
                    estimatedValue: carTakenFromClient.buy_price,
                },
            }),

            // Payment info - only include if bill exists
            ...(bill && {
                totalAmount: bill.total_with_tax || bill.total,
                paymentMethod: 'other' as const,
                paidAmount: bill.total_with_tax || bill.total,
                remainingAmount: 0,
            }),

            // Standard terms
            ownershipTransferDays: 30,
        };
    };
    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (!deal) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t('deal_not_found')}</h2>
                    <p className="text-gray-600 dark:text-gray-400 mt-2">{t('deal_not_found_description')}</p>
                    <Link href="/deals" className="btn btn-primary mt-4">
                        {t('back_to_deals')}
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-6">
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
                        <Link href="/deals" className="text-primary hover:underline">
                            {t('deals')}
                        </Link>
                    </li>
                    <li className="before:content-['/'] ltr:before:mr-2 rtl:before:ml-2">
                        <span>{t('deal_details')}</span>
                    </li>
                </ul>
            </div>

            {alert.visible && (
                <div className="fixed top-4 right-4 z-50 min-w-80 max-w-md">
                    <Alert
                        type={alert.type}
                        title={alert.type === 'success' ? t('success') : t('error')}
                        message={alert.message}
                        onClose={() => setAlert({ visible: false, message: '', type: 'success' })}
                    />
                </div>
            )}

            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold">{deal.title}</h1>
                    <p className="text-gray-500">#{deal.id}</p>
                </div>
                <Link href={`/deals/edit/${deal.id}`} className="btn btn-primary gap-2">
                    <IconEdit className="w-4 h-4" />
                    {t('edit_deal')}
                </Link>
            </div>

            <div className="space-y-6">
                {/* Deal Information */}
                <div className="panel">
                    <div className="mb-5">
                        <h5 className="text-xl font-bold text-gray-900 dark:text-white-light">{t('deal_information')}</h5>
                    </div>

                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="flex justify-center items-center flex-col gap-2">
                                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">{t('deal_type')}</label>
                                <span className={`badge ${getDealTypeBadgeClass(deal.deal_type)} mt-2 text-base px-3 py-2`}>{t(`deal_type_${deal.deal_type}`)}</span>
                            </div>
                            <div className="flex justify-center items-center flex-col gap-2">
                                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">{t('status')}</label>
                                <span className={`badge ${getStatusBadgeClass(deal.status)} text-base px-3 py-2`}>{t(`status_${deal.status}`)}</span>
                            </div>
                            <div className="flex justify-center items-center flex-col gap-2">
                                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">{t('amount')}</label>
                                <div className="flex items-center gap-2">
                                    <IconDollarSign className="w-5 h-5 text-success" />
                                    <span className="text-xl font-bold text-success">{formatCurrency(car?.sale_price || 0)}</span>
                                </div>
                            </div>
                            <div className="flex justify-center items-center flex-col gap-2">
                                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">{t('created_date')}</label>
                                <div className="flex items-center gap-2">
                                    <IconCalendar className="w-5 h-5 text-primary" />
                                    <span className="font-medium">
                                        {new Date(deal.created_at).toLocaleDateString('en-GB', {
                                            year: 'numeric',
                                            month: '2-digit',
                                            day: '2-digit',
                                        })}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-3">{t('deal_title')}</label>
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{deal.title}</h2>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-3">{t('description')}</label>
                            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border">
                                <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">{deal.description}</p>
                            </div>{' '}
                        </div>

                        {/* Cancellation Reason - Only show if deal is cancelled and reason exists */}
                        {deal.status === 'cancelled' && deal.cancellation_reason && (
                            <div>
                                <label className="block text-sm font-medium text-red-600 dark:text-red-400 mb-3">{t('cancellation_reason')}</label>
                                <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-200 dark:border-red-800">
                                    <div className="flex items-start gap-3">
                                        <div className="flex-shrink-0">
                                            <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                                                <path
                                                    fillRule="evenodd"
                                                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                                                    clipRule="evenodd"
                                                />
                                            </svg>
                                        </div>
                                        <div>
                                            <p className="text-red-700 dark:text-red-300 leading-relaxed whitespace-pre-wrap">{deal.cancellation_reason}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                {/* Deal Summary Table */}
                {car && (
                    <div className="panel">
                        <div className="mb-5">
                            <h5 className="text-xl font-bold text-gray-900 dark:text-white-light">{t('deal_summary')}</h5>
                        </div>
                        <div className="bg-transparent rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                            {/* Table Header */}
                            <div className="grid grid-cols-3 gap-4 mb-4 pb-2 border-b border-gray-300 dark:border-gray-600">
                                <div className="text-sm font-bold text-gray-700 dark:text-white text-right">{t('deal_item')}</div>
                                <div className="text-sm font-bold text-gray-700 dark:text-white text-center">{t('deal_price')}</div>
                            </div>

                            {/* Row 1: Car */}
                            <div className="grid grid-cols-3 gap-4 mb-3 py-2">
                                <div className="text-sm text-gray-700 dark:text-gray-300 text-right">
                                    <div className="font-medium">{t('car')}</div>
                                    <div className="text-xs mt-1 text-gray-500">
                                        {car.brand} {car.title} - {car.year}
                                    </div>
                                </div>
                                <div className="text-center">-</div>
                            </div>

                            {/* Row 2: Buy Price */}
                            <div className="grid grid-cols-3 gap-4 mb-3 py-2">
                                <div className="text-sm text-gray-700 dark:text-gray-300 text-right">{t('buy_price')}</div>
                                <div className="text-center">
                                    <span className="text-sm text-gray-700 dark:text-gray-300">₪{car.buy_price?.toFixed(2) || '0.00'}</span>
                                </div>
                            </div>
                            {/* Row 3: Sale Price */}
                            <div className="grid grid-cols-3 gap-4 mb-3 py-2">
                                <div className="text-sm text-gray-700 dark:text-gray-300 text-right">{t('sale_price')}</div>
                                <div className="text-center">
                                    <span className="text-sm text-gray-700 dark:text-gray-300">₪{car.sale_price?.toFixed(2) || '0.00'}</span>
                                </div>
                            </div>

                            {/* Row 4: Deal Amount */}
                            <div className="grid grid-cols-3 gap-4 mb-3 py-2">
                                <div className="text-sm text-gray-700 dark:text-gray-300 text-right">{t('deal_amount')}</div>
                                <div className="text-center">
                                    <span className="text-sm text-gray-700 dark:text-gray-300">₪{deal.amount?.toFixed(2) || '0.00'}</span>
                                </div>
                            </div>

                            {/* Row 5: Profit/Loss */}
                            <div className="grid grid-cols-3 gap-4 mb-3 py-2 border-t border-gray-200 dark:border-gray-600 pt-2">
                                <div className="text-sm font-bold text-gray-700 dark:text-white text-right">{t('profit_loss')}</div>
                                <div className="text-center">
                                    <span className={`text-sm font-bold ${(car.sale_price || 0) - (car.buy_price || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        ₪{((car.sale_price || 0) - (car.buy_price || 0)).toFixed(2)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                {/* Customer Information */}
                {customer && (
                    <div className="panel">
                        <div className="mb-5">
                            <h5 className="text-xl font-bold text-gray-900 dark:text-white-light flex items-center gap-3">
                                <IconUser className="w-6 h-6 text-primary" />
                                {t('customer_information')}
                            </h5>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border">
                                <div className="p-3 bg-primary/10 rounded-full">
                                    <IconUser className="w-6 h-6 text-primary" />
                                </div>
                                <div>
                                    <p className="font-bold text-gray-900 dark:text-white text-lg">{customer.name}</p>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">{t('customer_name')}</p>
                                </div>
                            </div>

                            {customer.phone && (
                                <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border">
                                    <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-full">
                                        <IconPhone className="w-6 h-6 text-green-600 dark:text-green-400" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-900 dark:text-white text-lg">{customer.phone}</p>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">{t('phone_number')}</p>
                                    </div>
                                </div>
                            )}

                            <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border">
                                <div className="p-3 bg-amber-100 dark:bg-amber-900/20 rounded-full">
                                    <IconUser className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                                </div>
                                <div>
                                    <p className="font-bold text-gray-900 dark:text-white text-lg">{customer.age}</p>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">{t('age')}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                {/* Car Information */}
                {car && (
                    <div className="panel">
                        <div className="mb-5">
                            <h5 className="text-xl font-bold text-gray-900 dark:text-white-light flex items-center gap-3">
                                <IconCar className="w-6 h-6 text-primary" />
                                {t('car_information')}
                            </h5>
                        </div>

                        <div className="space-y-6">
                            {/* Car Image and Basic Info */}
                            <div className="flex flex-col md:flex-row gap-6 p-6 bg-gray-50 dark:bg-gray-800 rounded-lg border">
                                <div className="flex-shrink-0">
                                    {carImageUrl ? (
                                        <img src={carImageUrl} alt={car.title} className="w-full md:w-[200px] h-[150px] rounded-lg object-cover" />
                                    ) : (
                                        <div className="w-full md:w-[200px] h-[150px] bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                                            <IconCar className="w-12 h-12 text-gray-400" />
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-bold text-2xl text-gray-900 dark:text-white mb-2">{car.title}</h3>
                                    <p className="text-gray-600 dark:text-gray-400 text-lg mb-4">
                                        {car.brand} • {car.year}
                                    </p>
                                    <div className="flex flex-wrap items-center gap-4">
                                        <span className="text-gray-600 dark:text-gray-400 font-medium">
                                            {car.kilometers.toLocaleString()} {t('km')}
                                        </span>
                                        <span className="text-gray-600 dark:text-gray-400 font-medium">
                                            {t('provider')}: {car.provider}
                                        </span>
                                        {car.type && (
                                            <span className="text-gray-600 dark:text-gray-400 font-medium">
                                                {t('car_type')}: {car.type}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            {/* Car Pricing */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="p-6 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                                    <p className="text-blue-600 dark:text-blue-400 font-medium mb-2">{t('market_price')}</p>
                                    <p className="text-3xl font-bold text-blue-700 dark:text-blue-300">{formatCurrency(car.market_price)}</p>
                                </div>
                                <div className="p-6 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
                                    <p className="text-emerald-600 dark:text-emerald-400 font-medium mb-2">{t('buy_price')}</p>
                                    <p className="text-3xl font-bold text-emerald-700 dark:text-emerald-300">{formatCurrency(car.buy_price)}</p>
                                </div>
                                <div className="p-6 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                                    <p className="text-amber-600 dark:text-amber-400 font-medium mb-2">{t('sale_price')}</p>
                                    <p className="text-3xl font-bold text-amber-700 dark:text-amber-300">{formatCurrency(car.sale_price)}</p>
                                </div>
                            </div>{' '}
                        </div>
                    </div>
                )}{' '}
                {/* Car Taken From Client (Exchange Deals) */}
                {carTakenFromClient && deal.deal_type === 'exchange' && (
                    <div className="panel">
                        <div className="mb-5">
                            <h5 className="text-xl font-bold text-gray-900 dark:text-white-light flex items-center gap-3">
                                <IconCar className="w-6 h-6 text-orange-500" />
                                {t('car_taken_from_client')}
                            </h5>
                        </div>

                        <div className="space-y-6">
                            {/* Car Image and Basic Info */}
                            <div className="flex flex-col md:flex-row gap-6 p-6 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                                <div className="flex-shrink-0">
                                    {carTakenImageUrl ? (
                                        <img src={carTakenImageUrl} alt={carTakenFromClient.title} className="w-full md:w-[200px] h-[150px] rounded-lg object-cover" />
                                    ) : (
                                        <div className="w-full md:w-[200px] h-[150px] bg-orange-200 dark:bg-orange-700 rounded-lg flex items-center justify-center">
                                            <IconCar className="w-12 h-12 text-orange-400" />
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-bold text-2xl text-gray-900 dark:text-white mb-2">{carTakenFromClient.title}</h3>
                                    <p className="text-gray-600 dark:text-gray-400 text-lg mb-4">
                                        {carTakenFromClient.brand} • {carTakenFromClient.year}
                                    </p>
                                    <div className="flex flex-wrap items-center gap-4">
                                        <span className="text-gray-600 dark:text-gray-400 font-medium">
                                            {carTakenFromClient.kilometers.toLocaleString()} {t('km')}
                                        </span>
                                        <span className="text-gray-600 dark:text-gray-400 font-medium">
                                            {t('provider')}: {carTakenFromClient.provider}
                                        </span>
                                        {carTakenFromClient.car_number && (
                                            <span className="text-gray-600 dark:text-gray-400 font-medium">
                                                {t('car_number')}: {carTakenFromClient.car_number}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Car Pricing */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="p-6 bg-orange-100 dark:bg-orange-900/30 rounded-lg border border-orange-200 dark:border-orange-800">
                                    <p className="text-orange-600 dark:text-orange-400 font-medium mb-2">{t('market_price')}</p>
                                    <p className="text-3xl font-bold text-orange-700 dark:text-orange-300">{formatCurrency(carTakenFromClient.market_price)}</p>
                                </div>
                                <div className="p-6 bg-orange-100 dark:bg-orange-900/30 rounded-lg border border-orange-200 dark:border-orange-800">
                                    <p className="text-orange-600 dark:text-orange-400 font-medium mb-2">{t('buy_price')}</p>
                                    <p className="text-3xl font-bold text-orange-700 dark:text-orange-300">{formatCurrency(carTakenFromClient.buy_price)}</p>
                                </div>
                                <div className="p-6 bg-orange-100 dark:bg-orange-900/30 rounded-lg border border-orange-200 dark:border-orange-800">
                                    <p className="text-orange-600 dark:text-orange-400 font-medium mb-2">{t('received_value')}</p>
                                    <p className="text-3xl font-bold text-orange-700 dark:text-orange-300">{formatCurrency(carTakenFromClient.buy_price)}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                {/* Attachments Section */}
                <div className="panel">
                    <div className="mb-5">
                        <h5 className="text-xl font-bold text-gray-900 dark:text-white-light flex items-center gap-3">
                            <IconPaperclip className="w-6 h-6 text-primary" />
                            {t('attachments')}
                        </h5>
                    </div>
                    {deal.attachments && deal.attachments.length > 0 ? (
                        <AttachmentsDisplay attachments={deal.attachments} compact={false} />
                    ) : (
                        <div className="text-center py-8">
                            <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                                <IconPaperclip className="w-8 h-8 text-gray-400" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{t('no_attachments_found')}</h3>
                            <p className="text-gray-600 dark:text-gray-400">{t('no_attachments_added_yet')}</p>
                        </div>
                    )}
                </div>
                {/* Bills Section */}
                <div className="panel">
                    <div className="mb-5">
                        <h5 className="text-xl font-bold text-gray-900 dark:text-white-light flex items-center gap-3">
                            <IconInvoice className="w-6 h-6 text-primary" />
                            {t('bills')}
                        </h5>
                    </div>

                    {bills.length > 0 ? (
                        <div className="space-y-4">
                            {bills.map((bill) => (
                                <div key={bill.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border">
                                    <div className="flex items-center gap-4">
                                        <div className="p-2 bg-primary/10 rounded-full text-primary">{getBillTypeIcon(bill.bill_type)}</div>
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <h4 className="font-semibold text-gray-900 dark:text-white">{t(`bill_type_${bill.bill_type}`)}</h4>
                                            </div>
                                            <div className="text-sm text-gray-600 dark:text-gray-400">
                                                {bill.customer_name} •{' '}
                                                {new Date(bill.date).toLocaleDateString('en-GB', {
                                                    year: 'numeric',
                                                    month: '2-digit',
                                                    day: '2-digit',
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right flex flex-col gap-2">
                                        <div className="font-bold text-gray-900 dark:text-white text-lg">{formatCurrency(getBillAmount(bill))}</div>
                                        <div className="flex gap-2 justify-end">
                                            <Link href={`/bills/preview/${bill.id}`} className="text-primary hover:underline text-sm">
                                                {t('view_bill')}
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8">
                            <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                                <IconInvoice className="w-8 h-8 text-gray-400" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{t('no_bills_found')}</h3>
                            <p className="text-gray-600 dark:text-gray-400 mb-4">{t('no_bills_description')}</p>
                            <Link href={`/bills/add?deal=${dealId}`} className="btn btn-primary gap-2">
                                <IconPlus className="w-4 h-4" />
                                {t('create_bill')}
                            </Link>
                        </div>
                    )}
                </div>
                {/* Actions */}
                <div className="panel">
                    <div className="mb-5">
                        <h5 className="text-xl font-bold text-gray-900 dark:text-white-light">{t('actions')}</h5>
                    </div>

                    <div className="flex flex-wrap gap-4">
                        {deal.status !== 'cancelled' && deal.status !== 'completed' && (
                            <Link href={`/deals/edit/${deal.id}`} className="btn btn-primary gap-2">
                                <IconEdit className="w-4 h-4" />
                                {t('edit_deal')}
                            </Link>
                        )}
                        <button
                            className={`btn btn-outline-success gap-2${generatingContract ? ' opacity-60 pointer-events-none' : ''}`}
                            disabled={generatingContract}
                            onClick={async () => {
                                setGeneratingContract(true);
                                try {
                                    // Create contract - include bill if available, otherwise create without payment info
                                    const contractData = createContractData(bills.length > 0 ? bills[0] : undefined);

                                    // Get language from i18nextLng cookie
                                    const getCookie = (name: string) => {
                                        const value = `; ${document.cookie}`;
                                        const parts = value.split(`; ${name}=`);
                                        if (parts.length === 2) {
                                            const part = parts.pop();
                                            if (part) {
                                                return part.split(';').shift();
                                            }
                                        }
                                        return null;
                                    };

                                    const lang = getCookie('i18nextLng') || 'ar';
                                    const normalizedLang = lang.toLowerCase().split('-')[0] as 'en' | 'ar' | 'he';

                                    const filename = `car-contract-${contractData.carPlateNumber}-${new Date().toISOString().split('T')[0]}.pdf`;

                                    // Use the new optimized PDF generator
                                    await ContractPDFGenerator.generateFromContract(contractData, {
                                        filename,
                                        language: normalizedLang,
                                        format: 'A4',
                                        orientation: 'portrait',
                                    });
                                } catch (error) {
                                    console.error('Error generating contract:', error);
                                    setAlert({ visible: true, message: t('error_generating_pdf') || 'Error generating PDF', type: 'danger' });
                                } finally {
                                    setGeneratingContract(false);
                                }
                            }}
                        >
                            {generatingContract ? (
                                <svg className="animate-spin h-4 w-4 text-success" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                                </svg>
                            ) : (
                                <IconDocument className="w-4 h-4" />
                            )}
                            {generatingContract ? t('generating_contract') : t('generate_contract')}
                        </button>
                        <Link href="/deals" className="btn btn-outline-secondary">
                            {t('back_to_deals')}
                        </Link>
                    </div>
                </div>
            </div>
            {/* Contract Generator Modal removed: now opens in new tab */}
        </div>
    );
};

export default PreviewDeal;
