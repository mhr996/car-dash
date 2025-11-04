'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import supabase from '@/lib/supabase';
import { Alert } from '@/components/elements/alerts/elements-alerts-default';
import { getTranslation } from '@/i18n';
import DealTypeSelect from '@/components/deal-type-select/deal-type-select';
import CustomerSelect from '@/components/customer-select/customer-select';
import CarSelect from '@/components/car-select/car-select';
import SingleFileUpload from '@/components/file-upload/single-file-upload';
import CreateCustomerModal from '@/components/modals/create-customer-modal';
import CreateCarModal from '@/components/modals/create-car-modal';
import IconUser from '@/components/icon/icon-user';
import IconMenuWidgets from '@/components/icon/menu/icon-menu-widgets';
import IconDollarSign from '@/components/icon/icon-dollar-sign';
import IconNotes from '@/components/icon/icon-notes';
import IconCalendar from '@/components/icon/icon-calendar';
import { uploadMultipleFiles } from '@/utils/file-upload';
import { formatCurrency } from '@/utils/number-formatter';
import { formatDate } from '@/utils/date-formatter';
import { Customer, Car, FileItem, DealAttachments } from '@/types';
import { logActivity } from '@/utils/activity-logger';
import { handleDealCreated, getCustomerIdFromDeal } from '@/utils/balance-manager';
import DealPaymentMethods, { PaymentMethod } from '@/components/deal-payment-methods/deal-payment-methods';

const AddDeal = () => {
    const { t } = getTranslation();
    const router = useRouter();

    // Ref to track the last auto-filled selling price and car ID to prevent overriding user edits
    const lastAutoFilledRef = useRef<{ carId: string | null; price: string }>({ carId: null, price: '' });
    const [saving, setSaving] = useState(false);
    const [showCreateCustomerModal, setShowCreateCustomerModal] = useState(false);
    const [showCreateCarModal, setShowCreateCarModal] = useState(false);
    const [customerCreationContext, setCustomerCreationContext] = useState<'customer' | 'seller' | 'buyer'>('customer'); // Track which customer we're creating
    const [dealType, setDealType] = useState('');
    const [dealStatus, setDealStatus] = useState('active'); // Default to active - automatically managed
    const [dealDate, setDealDate] = useState(new Date().toISOString().split('T')[0]); // Default to today
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [selectedCar, setSelectedCar] = useState<Car | null>(null); // Form state for new/used sale deal
    const [saleForm, setSaleForm] = useState({
        title: '',
        notes: '',
        selling_price: '',
        quantity: '1', // Default quantity
        loss_amount: '', // Manual loss/deductions
        tax_percentage: '18', // Default tax percentage
    });

    // Form state for exchange deal
    const [exchangeForm, setExchangeForm] = useState({
        title: '',
        notes: '',
        selling_price: '', // Add selling price field
        // Customer old car details
        old_car_manufacturer: '',
        old_car_name: '',
        old_car_year: '',
        old_car_kilometers: '',
        old_car_condition: '', // يد
        old_car_number: '', // رقم السيارة
        old_car_market_price: '',
        old_car_purchase_price: '',
        // Exchange calculation fields
        customer_car_eval_value: '', // تم تبديل على سيارة وتم تقييمها ب
        additional_customer_amount: '', // المبلغ المضاف من الزبون
        loss_amount: '', // Manual loss/deductions
    });
    // Form state for company commission deal
    const [companyCommissionForm, setCompanyCommissionForm] = useState({
        title: '',
        selling_price: '', // Add selling price field
        company_name: '', // اسم الشركة المقدمه للعموله
        commission_date: '', // التاريخ
        amount: '', // المبلغ
        description: '', // حول (تفاصيل العموله)
    }); // Form state for intermediary deal
    const [intermediaryForm, setIntermediaryForm] = useState({
        title: '',
        notes: '',
        selling_price: '', // Add selling price field
        profit_commission: '', // عمولة الربح
    });

    // Form state for financing assistance intermediary deal
    const [financingAssistanceForm, setFinancingAssistanceForm] = useState({
        title: '',
        notes: '',
        selling_price: '', // Add selling price field
        commission: '', // العمولة
    });

    // Separate state for intermediary deal participants
    const [selectedSeller, setSelectedSeller] = useState<Customer | null>(null);
    const [selectedBuyer, setSelectedBuyer] = useState<Customer | null>(null);

    // Payment methods state
    const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
    const [paymentNotes, setPaymentNotes] = useState<string>('');

    // File uploads - separate for each document type
    const [dealAttachments, setDealAttachments] = useState<DealAttachments>({
        carLicense: null,
        driverLicense: null,
        carTransferDocument: null,
    });

    const [alert, setAlert] = useState<{ message: string; type: 'success' | 'danger' } | null>(null); // Auto-fill form when car is selected
    useEffect(() => {
        if (dealType === 'intermediary') {
            // For intermediary deals, use seller and buyer
            if (selectedCar && (selectedSeller || selectedBuyer)) {
                setIntermediaryForm((prev) => {
                    // Only auto-fill selling_price if:
                    // 1. It's a new car selection (different car ID), OR
                    // 2. The current price matches the last auto-filled price (user hasn't manually edited it)
                    const shouldAutoFillPrice = lastAutoFilledRef.current.carId !== selectedCar.id || prev.selling_price === lastAutoFilledRef.current.price || prev.selling_price === '';

                    const newSellingPrice = shouldAutoFillPrice ? selectedCar.sale_price.toString() : prev.selling_price;

                    // Update the ref with the new auto-filled values
                    if (shouldAutoFillPrice) {
                        lastAutoFilledRef.current = {
                            carId: selectedCar.id,
                            price: newSellingPrice,
                        };
                    }

                    return {
                        ...prev,
                        title: `${t('intermediary_deal_for')} ${selectedCar.title} - ${selectedSeller?.name || ''} ${t('to')} ${selectedBuyer?.name || ''}`,
                        selling_price: newSellingPrice,
                    };
                });
            }
        } else if (dealType === 'financing_assistance_intermediary') {
            // For financing assistance intermediary deals, use customer and car
            if (selectedCar && selectedCustomer) {
                setFinancingAssistanceForm((prev) => {
                    // Only auto-fill selling_price if:
                    // 1. It's a new car selection (different car ID), OR
                    // 2. The current price matches the last auto-filled price (user hasn't manually edited it)
                    const shouldAutoFillPrice = lastAutoFilledRef.current.carId !== selectedCar.id || prev.selling_price === lastAutoFilledRef.current.price || prev.selling_price === '';

                    const newSellingPrice = shouldAutoFillPrice ? selectedCar.sale_price.toString() : prev.selling_price;

                    // Update the ref with the new auto-filled values
                    if (shouldAutoFillPrice) {
                        lastAutoFilledRef.current = {
                            carId: selectedCar.id,
                            price: newSellingPrice,
                        };
                    }

                    return {
                        ...prev,
                        title: `${t('financing_assistance_commission')} ${selectedCar.title} - ${selectedCustomer.name}`,
                        selling_price: newSellingPrice,
                    };
                });
            }
        } else if (dealType === 'company_commission') {
            // For company commission deals, auto-fill when car is selected
            if (selectedCar) {
                setCompanyCommissionForm((prev) => {
                    // Only auto-fill selling_price if:
                    // 1. It's a new car selection (different car ID), OR
                    // 2. The current price matches the last auto-filled price (user hasn't manually edited it)
                    const shouldAutoFillPrice = lastAutoFilledRef.current.carId !== selectedCar.id || prev.selling_price === lastAutoFilledRef.current.price || prev.selling_price === '';

                    const newSellingPrice = shouldAutoFillPrice ? selectedCar.sale_price.toString() : prev.selling_price;

                    // Update the ref with the new auto-filled values
                    if (shouldAutoFillPrice) {
                        lastAutoFilledRef.current = {
                            carId: selectedCar.id,
                            price: newSellingPrice,
                        };
                    }

                    return {
                        ...prev,
                        selling_price: newSellingPrice,
                    };
                });
            }
        } else if (selectedCar && selectedCustomer) {
            if (dealType === 'new_used_sale' || dealType === 'new_sale' || dealType === 'used_sale' || dealType === 'new_used_sale_tax_inclusive') {
                setSaleForm((prev) => {
                    // Only auto-fill selling_price if:
                    // 1. It's a new car selection (different car ID), OR
                    // 2. The current price matches the last auto-filled price (user hasn't manually edited it)
                    const shouldAutoFillPrice = lastAutoFilledRef.current.carId !== selectedCar.id || prev.selling_price === lastAutoFilledRef.current.price || prev.selling_price === '';

                    const newSellingPrice = shouldAutoFillPrice ? selectedCar.sale_price.toString() : prev.selling_price;

                    // Update the ref with the new auto-filled values
                    if (shouldAutoFillPrice) {
                        lastAutoFilledRef.current = {
                            carId: selectedCar.id,
                            price: newSellingPrice,
                        };
                    }

                    return {
                        ...prev,
                        title: `${t('sale_deal_for')} ${selectedCar.title} - ${selectedCustomer.name}`,
                        selling_price: newSellingPrice,
                    };
                });
            } else if (dealType === 'exchange') {
                setExchangeForm((prev) => {
                    // Only auto-fill selling_price if:
                    // 1. It's a new car selection (different car ID), OR
                    // 2. The current price matches the last auto-filled price (user hasn't manually edited it)
                    const shouldAutoFillPrice = lastAutoFilledRef.current.carId !== selectedCar.id || prev.selling_price === lastAutoFilledRef.current.price || prev.selling_price === '';

                    const newSellingPrice = shouldAutoFillPrice ? selectedCar.sale_price.toString() : prev.selling_price;

                    // Update the ref with the new auto-filled values
                    if (shouldAutoFillPrice) {
                        lastAutoFilledRef.current = {
                            carId: selectedCar.id,
                            price: newSellingPrice,
                        };
                    }

                    const updated = {
                        ...prev,
                        title: `${t('exchange_deal_for')} ${selectedCar.title} - ${selectedCustomer.name}`,
                        selling_price: newSellingPrice,
                    };

                    // Auto-calculate display fields if old car purchase price exists
                    if (prev.old_car_purchase_price && selectedCar) {
                        const purchasePrice = parseFloat(prev.old_car_purchase_price);
                        const salePrice = selectedCar.sale_price;
                        const difference = salePrice - purchasePrice;

                        updated.customer_car_eval_value = purchasePrice.toString();
                        updated.additional_customer_amount = difference > 0 ? difference.toString() : '0';
                    }

                    return updated;
                });
            }
        }
    }, [selectedCar, selectedCustomer, selectedSeller, selectedBuyer, dealType]);

    const handleSaleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setSaleForm((prev) => ({ ...prev, [name]: value }));

        // Update the car's sale_price in real-time when selling_price changes
        if (name === 'selling_price' && selectedCar && value && !isNaN(parseFloat(value))) {
            const newSellingPrice = parseFloat(value);

            // Use a small tolerance to handle floating point precision issues
            if (Math.abs(newSellingPrice - selectedCar.sale_price) > 0.001) {
                // Update the selectedCar state to reflect the new sale price
                setSelectedCar((prevCar) => (prevCar ? { ...prevCar, sale_price: newSellingPrice } : null));
            }
        }
    };
    const handleExchangeFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setExchangeForm((prev) => {
            const updated = { ...prev, [name]: value };

            // Update the car's sale_price in real-time when selling_price changes
            if (name === 'selling_price' && selectedCar && value && !isNaN(parseFloat(value))) {
                const newSellingPrice = parseFloat(value);
                if (Math.abs(newSellingPrice - selectedCar.sale_price) > 0.001) {
                    setSelectedCar((prevCar) => (prevCar ? { ...prevCar, sale_price: newSellingPrice } : null));
                }
            }

            // Auto-calculate values for exchange deals when old car purchase price changes
            if (name === 'old_car_purchase_price' && selectedCar) {
                const purchasePrice = parseFloat(value || '0');
                const salePrice = selectedCar.sale_price;
                const difference = salePrice - purchasePrice;

                // Set customer_car_eval_value to the purchase price from customer
                updated.customer_car_eval_value = purchasePrice.toString();

                // Set additional_customer_amount to the difference (only if positive)
                updated.additional_customer_amount = difference > 0 ? difference.toString() : '0';
            }

            return updated;
        });
    };
    const handleCompanyCommissionFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setCompanyCommissionForm((prev) => ({ ...prev, [name]: value }));

        // Update the car's sale_price in real-time when selling_price changes
        if (name === 'selling_price' && selectedCar && value && !isNaN(parseFloat(value))) {
            const newSellingPrice = parseFloat(value);
            if (Math.abs(newSellingPrice - selectedCar.sale_price) > 0.001) {
                setSelectedCar((prevCar) => (prevCar ? { ...prevCar, sale_price: newSellingPrice } : null));
            }
        }
    };
    const handleIntermediaryFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setIntermediaryForm((prev) => ({ ...prev, [name]: value }));

        // Update the car's sale_price in real-time when selling_price changes
        if (name === 'selling_price' && selectedCar && value && !isNaN(parseFloat(value))) {
            const newSellingPrice = parseFloat(value);
            if (Math.abs(newSellingPrice - selectedCar.sale_price) > 0.001) {
                setSelectedCar((prevCar) => (prevCar ? { ...prevCar, sale_price: newSellingPrice } : null));
            }
        }
    };

    const handleFinancingAssistanceFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFinancingAssistanceForm((prev) => ({ ...prev, [name]: value }));

        // Update the car's sale_price in real-time when selling_price changes
        if (name === 'selling_price' && selectedCar && value && !isNaN(parseFloat(value))) {
            const newSellingPrice = parseFloat(value);
            if (Math.abs(newSellingPrice - selectedCar.sale_price) > 0.001) {
                setSelectedCar((prevCar) => (prevCar ? { ...prevCar, sale_price: newSellingPrice } : null));
            }
        }
    };

    const handleDealTypeChange = (type: string) => {
        setDealType(type);
        // Reset form when deal type changes
        setSelectedCustomer(null);
        setSelectedCar(null);
        setSelectedSeller(null);
        setSelectedBuyer(null);
        setSaleForm({
            title: '',
            notes: '',
            selling_price: '',
            quantity: '1',
            loss_amount: '',
            tax_percentage: '18',
        });
        setExchangeForm({
            title: '',
            notes: '',
            selling_price: '',
            old_car_manufacturer: '',
            old_car_name: '',
            old_car_year: '',
            old_car_kilometers: '',
            old_car_condition: '',
            old_car_number: '',
            old_car_market_price: '',
            old_car_purchase_price: '',
            customer_car_eval_value: '',
            additional_customer_amount: '',
            loss_amount: '',
        });
        setCompanyCommissionForm({
            title: '',
            selling_price: '',
            company_name: '',
            commission_date: '',
            amount: '',
            description: '',
        });
        setIntermediaryForm({
            title: '',
            notes: '',
            selling_price: '',
            profit_commission: '',
        });
        setFinancingAssistanceForm({
            title: '',
            notes: '',
            selling_price: '',
            commission: '',
        });
        setDealAttachments({
            carLicense: null,
            driverLicense: null,
            carTransferDocument: null,
        });
    };
    const handleCustomerCreated = (customer: Customer) => {
        if (customerCreationContext === 'seller') {
            setSelectedSeller(customer);
        } else if (customerCreationContext === 'buyer') {
            setSelectedBuyer(customer);
        } else {
            setSelectedCustomer(customer);
        }
        setAlert({ message: t('customer_created_successfully'), type: 'success' });
    };

    const handleCarCreated = (car: Car) => {
        setSelectedCar(car);
        setAlert({ message: t('car_created_successfully'), type: 'success' });
    };

    const validateNewUsedSaleForm = () => {
        if (!selectedCustomer) {
            setAlert({ message: t('customer_required'), type: 'danger' });
            return false;
        }
        if (!selectedCar) {
            setAlert({ message: t('car_required'), type: 'danger' });
            return false;
        }
        if (!saleForm.title.trim()) {
            setAlert({ message: t('deal_title_required'), type: 'danger' });
            return false;
        }
        if (!saleForm.selling_price || parseFloat(saleForm.selling_price) <= 0) {
            setAlert({ message: t('selling_price_required'), type: 'danger' });
            return false;
        }
        return true;
    };
    const validateExchangeForm = () => {
        if (!selectedCustomer) {
            setAlert({ message: t('customer_required'), type: 'danger' });
            return false;
        }
        if (!selectedCar) {
            setAlert({ message: t('car_required'), type: 'danger' });
            return false;
        }
        if (!exchangeForm.title.trim()) {
            setAlert({ message: t('deal_title_required'), type: 'danger' });
            return false;
        }
        if (!exchangeForm.old_car_manufacturer || !exchangeForm.old_car_name || !exchangeForm.old_car_year) {
            setAlert({ message: t('old_car_details_required'), type: 'danger' });
            return false;
        }
        if (!exchangeForm.old_car_purchase_price || parseFloat(exchangeForm.old_car_purchase_price) <= 0) {
            setAlert({ message: t('old_car_purchase_price_required'), type: 'danger' });
            return false;
        }
        return true;
    };

    const validateCompanyCommissionForm = () => {
        if (!companyCommissionForm.title.trim()) {
            setAlert({ message: t('deal_title_required'), type: 'danger' });
            return false;
        }
        if (!companyCommissionForm.company_name.trim()) {
            setAlert({ message: t('company_name_required'), type: 'danger' });
            return false;
        }
        if (!companyCommissionForm.commission_date) {
            setAlert({ message: t('commission_date_required'), type: 'danger' });
            return false;
        }
        if (!companyCommissionForm.amount || parseFloat(companyCommissionForm.amount) <= 0) {
            setAlert({ message: t('company_commission_amount_required'), type: 'danger' });
            return false;
        }
        return true;
    };
    const validateIntermediaryForm = () => {
        if (!selectedSeller) {
            setAlert({ message: t('seller_required'), type: 'danger' });
            return false;
        }
        if (!selectedBuyer) {
            setAlert({ message: t('buyer_required'), type: 'danger' });
            return false;
        }
        if (!selectedCar) {
            setAlert({ message: t('car_required'), type: 'danger' });
            return false;
        }
        if (!intermediaryForm.title.trim()) {
            setAlert({ message: t('deal_title_required'), type: 'danger' });
            return false;
        }
        if (!intermediaryForm.profit_commission || parseFloat(intermediaryForm.profit_commission) <= 0) {
            setAlert({ message: t('profit_commission_required'), type: 'danger' });
            return false;
        }
        return true;
    };

    const validateFinancingAssistanceForm = () => {
        if (!selectedCustomer) {
            setAlert({ message: t('customer_required'), type: 'danger' });
            return false;
        }
        if (!selectedCar) {
            setAlert({ message: t('car_required'), type: 'danger' });
            return false;
        }
        if (!financingAssistanceForm.title.trim()) {
            setAlert({ message: t('deal_title_required'), type: 'danger' });
            return false;
        }
        if (!financingAssistanceForm.commission || parseFloat(financingAssistanceForm.commission) <= 0) {
            setAlert({ message: t('commission_required'), type: 'danger' });
            return false;
        }
        return true;
    };
    
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!dealType) {
            setAlert({ message: t('deal_type_required'), type: 'danger' });
            return;
        } // Validate based on deal type
        if ((dealType === 'new_used_sale' || dealType === 'new_sale' || dealType === 'used_sale' || dealType === 'new_used_sale_tax_inclusive') && !validateNewUsedSaleForm()) {
            return;
        }
        if (dealType === 'exchange' && !validateExchangeForm()) {
            return;
        }
        if (dealType === 'company_commission' && !validateCompanyCommissionForm()) {
            return;
        }
        if (dealType === 'intermediary' && !validateIntermediaryForm()) {
            return;
        }
        if (dealType === 'financing_assistance_intermediary' && !validateFinancingAssistanceForm()) {
            return;
        }

        setSaving(true);
        try {
            // Update car's sale_price if it has changed for any deal type with a selected car
            if (selectedCar) {
                let sellingPrice = null;

                // Get selling price from the appropriate form based on deal type
                if (dealType === 'new_used_sale' || dealType === 'new_sale' || dealType === 'used_sale' || dealType === 'new_used_sale_tax_inclusive') {
                    sellingPrice = saleForm.selling_price ? parseFloat(saleForm.selling_price) : null;
                } else if (dealType === 'exchange') {
                    sellingPrice = exchangeForm.selling_price ? parseFloat(exchangeForm.selling_price) : null;
                } else if (dealType === 'intermediary') {
                    sellingPrice = intermediaryForm.selling_price ? parseFloat(intermediaryForm.selling_price) : null;
                } else if (dealType === 'financing_assistance_intermediary') {
                    sellingPrice = financingAssistanceForm.selling_price ? parseFloat(financingAssistanceForm.selling_price) : null;
                } else if (dealType === 'company_commission') {
                    sellingPrice = companyCommissionForm.selling_price ? parseFloat(companyCommissionForm.selling_price) : null;
                }

                if (sellingPrice && sellingPrice > 0) {
                    // Always update the car's sale_price to match the deal's selling_price
                    // Also set the car as private since sold cars should not be publicly visible
                    const { error: carUpdateError } = await supabase
                        .from('cars')
                        .update({
                            sale_price: sellingPrice,
                            public: false,
                        })
                        .eq('id', selectedCar.id);

                    if (carUpdateError) {
                        console.error('Error updating car sale price and public status:', carUpdateError);
                        // Continue with deal creation but log the error
                    }
                }
            }
            // First create the deal to get an ID
            let dealData: any = {
                deal_type: dealType,
                status: dealStatus,
                customer_id: selectedCustomer?.id || null,
                created_at: new Date(dealDate + 'T' + new Date().toTimeString().split(' ')[0]).toISOString(),
                payment_methods: paymentMethods.length > 0 ? paymentMethods : null,
                payment_notes: paymentNotes || null,
            };

            if (dealType === 'new_used_sale' || dealType === 'new_sale' || dealType === 'used_sale' || dealType === 'new_used_sale_tax_inclusive') {
                // Calculate profit commission (amount) = selling price - buy price - loss
                const sellingPrice = parseFloat(saleForm.selling_price);
                const buyPrice = selectedCar?.buy_price || 0;
                const loss = parseFloat(saleForm.loss_amount || '0');
                const profitCommission = sellingPrice - buyPrice - loss;

                dealData = {
                    ...dealData,
                    title: saleForm.title.trim(),
                    description: saleForm.notes.trim() || `${t('sale_deal_description')} ${selectedCar?.title}`,
                    amount: profitCommission, // This is the profit commission (عمولة الربح)
                    car_id: selectedCar?.id,
                    selling_price: sellingPrice,
                    loss_amount: saleForm.loss_amount ? parseFloat(saleForm.loss_amount) : null,
                    tax_percentage: saleForm.tax_percentage ? parseFloat(saleForm.tax_percentage) : null,
                    quantity: parseInt(saleForm.quantity),
                    notes: saleForm.notes.trim(),
                };
            }
            if (dealType === 'exchange') {
                // First, create a new car record for the old car taken from the client
                const oldCarData = {
                    title: `${exchangeForm.old_car_manufacturer} ${exchangeForm.old_car_name} (${exchangeForm.old_car_year})`,
                    year: parseInt(exchangeForm.old_car_year),
                    brand: exchangeForm.old_car_manufacturer,
                    status: 'received_from_client',
                    type: 'used',
                    provider: '1', // Default provider ID for cars received from clients
                    kilometers: exchangeForm.old_car_kilometers ? parseInt(exchangeForm.old_car_kilometers) : 0,
                    market_price: exchangeForm.old_car_market_price ? parseFloat(exchangeForm.old_car_market_price) : 0,
                    buy_price: parseFloat(exchangeForm.old_car_purchase_price),
                    sale_price: exchangeForm.old_car_market_price ? parseFloat(exchangeForm.old_car_market_price) : 0,
                    car_number: exchangeForm.old_car_number || '',
                    images: JSON.stringify([]),
                };

                const { data: newCarData, error: carError } = await supabase.from('cars').insert(oldCarData).select().single();

                if (carError) {
                    throw new Error(`Failed to create car record: ${carError.message}`);
                }

                // Log the car received from client as a separate activity
                await logActivity({
                    type: 'car_received_from_client',
                    car: {
                        ...newCarData,
                        customer: selectedCustomer,
                    },
                });

                // Calculate profit for exchange deal:
                // Profit = New car sale price - New car buy price - Old car purchase price - Loss amount
                const newCarSalePrice = selectedCar?.sale_price || 0;
                const newCarBuyPrice = selectedCar?.buy_price || 0;
                const oldCarPurchasePrice = parseFloat(exchangeForm.old_car_purchase_price || '0');
                const lossAmount = parseFloat(exchangeForm.loss_amount || '0');
                const exchangeProfit = newCarSalePrice - newCarBuyPrice - lossAmount;

                // Note: customer_car_eval_value and additional_customer_amount are for display only
                // and don't affect the actual deal amount or profit calculation
                dealData = {
                    ...dealData,
                    title: exchangeForm.title.trim(),
                    description: exchangeForm.notes.trim() || `${t('exchange_deal_description')} ${selectedCar?.title}`,
                    amount: exchangeProfit, // This is the actual profit from the exchange
                    car_id: selectedCar?.id,
                    car_taken_from_client: newCarData.id, // Link the newly created car
                    loss_amount: lossAmount || null,
                    selling_price: exchangeForm.selling_price ? parseFloat(exchangeForm.selling_price) : null,
                    customer_car_eval_value: oldCarPurchasePrice || null,
                    additional_customer_amount: Math.max(0, newCarSalePrice - oldCarPurchasePrice) || null,
                    notes: exchangeForm.notes.trim(),
                };
            }
            if (dealType === 'company_commission') {
                dealData = {
                    ...dealData,
                    title: companyCommissionForm.title.trim(),
                    description: companyCommissionForm.description.trim() || `${t('company_commission_deal_description')} ${companyCommissionForm.company_name}`,
                    amount: parseFloat(companyCommissionForm.amount),
                    selling_price: companyCommissionForm.selling_price ? parseFloat(companyCommissionForm.selling_price) : null,
                    // Company commission specific fields
                    company_name: companyCommissionForm.company_name.trim(),
                    commission_date: companyCommissionForm.commission_date,
                    notes: companyCommissionForm.description.trim(),
                };
            }
            if (dealType === 'intermediary') {
                dealData = {
                    ...dealData,
                    title: intermediaryForm.title.trim(),
                    description: intermediaryForm.notes.trim() || `${t('intermediary_deal_description')} ${selectedCar?.title}`,
                    amount: parseFloat(intermediaryForm.profit_commission),
                    car_id: selectedCar?.id,
                    customer_id: null, // No single customer for intermediary deals
                    selling_price: parseFloat(intermediaryForm.profit_commission), // Intermediary specific fields
                    profit_commission: parseFloat(intermediaryForm.profit_commission),
                    seller_id: selectedSeller?.id,
                    buyer_id: selectedBuyer?.id,
                    notes: intermediaryForm.notes.trim(),
                };
            }
            if (dealType === 'financing_assistance_intermediary') {
                dealData = {
                    ...dealData,
                    title: financingAssistanceForm.title.trim(),
                    description: financingAssistanceForm.notes.trim() || `${t('financing_assistance_commission')} ${selectedCar?.title}`,
                    amount: parseFloat(financingAssistanceForm.commission),
                    car_id: selectedCar?.id,
                    customer_id: selectedCustomer?.id,
                    selling_price: parseFloat(financingAssistanceForm.commission),
                    // Financing assistance specific fields
                    commission: parseFloat(financingAssistanceForm.commission),
                    notes: financingAssistanceForm.notes.trim(),
                };
            }

            // Insert the deal first to get the ID
            const { data: dealResult, error: dealError } = await supabase.from('deals').insert([dealData]).select('id').single();

            if (dealError) throw dealError;

            const dealId = dealResult.id;

            // Upload files if any exist
            let fileUrls: { [key: string]: string } = {};
            const filesToUpload: { file: File; name: string }[] = [];

            if (dealAttachments.carLicense?.file) {
                const fileExt = dealAttachments.carLicense.file.name.split('.').pop();
                filesToUpload.push({
                    file: dealAttachments.carLicense.file,
                    name: `car_license.${fileExt}`,
                });
            }

            if (dealAttachments.driverLicense?.file) {
                const fileExt = dealAttachments.driverLicense.file.name.split('.').pop();
                filesToUpload.push({
                    file: dealAttachments.driverLicense.file,
                    name: `driver_license.${fileExt}`,
                });
            }

            if (dealAttachments.carTransferDocument?.file) {
                const fileExt = dealAttachments.carTransferDocument.file.name.split('.').pop();
                filesToUpload.push({
                    file: dealAttachments.carTransferDocument.file,
                    name: `car_transfer_document.${fileExt}`,
                });
            }
            if (filesToUpload.length > 0) {
                const uploadResults = await uploadMultipleFiles(filesToUpload, 'deals', dealId);

                // Check for upload errors
                const uploadErrors = Object.entries(uploadResults)
                    .filter(([_, result]) => !result.success)
                    .map(([name, result]) => `${name}: ${result.error}`);

                if (uploadErrors.length > 0) {
                    console.warn('Some files failed to upload:', uploadErrors);
                    // Continue with the deal creation but log the warnings
                }

                // Build attachments array from successful uploads
                const attachments: any[] = [];
                Object.entries(uploadResults).forEach(([fileName, result]) => {
                    if (result.success && result.url) {
                        // Determine attachment type from filename
                        let type = 'document';
                        if (fileName.includes('car_license')) type = 'car_license';
                        else if (fileName.includes('driver_license')) type = 'driver_license';
                        else if (fileName.includes('car_transfer_document')) type = 'car_transfer_document';

                        // Find the original file to get metadata
                        const originalFile = filesToUpload.find((f) => f.name === fileName)?.file;

                        attachments.push({
                            type,
                            name: fileName,
                            url: result.url,
                            uploadedAt: new Date().toISOString(),
                            size: originalFile?.size || 0,
                            mimeType: originalFile?.type || 'application/octet-stream',
                        });
                    }
                });

                // Update the deal with attachments array if any were uploaded successfully
                if (attachments.length > 0) {
                    const { error: updateError } = await supabase.from('deals').update({ attachments }).eq('id', dealId);

                    if (updateError) {
                        console.error('Error updating deal with attachments:', updateError);
                        // Don't throw here as the deal was already created successfully
                    }
                }
            }
            setAlert({ message: t('deal_added_successfully'), type: 'success' });

            // Log the activity with full deal data
            const dealLogData = {
                ...dealData,
                id: dealId,
                customer: selectedCustomer,
                car: selectedCar,
            };

            await logActivity({
                type: 'deal_created',
                deal: dealLogData,
            });

            // Update customer balance if applicable
            const customerId = getCustomerIdFromDeal(dealData);
            if (customerId && dealData.selling_price) {
                const balanceUpdateSuccess = await handleDealCreated(dealId, customerId, dealData.selling_price, dealData.title || 'Deal');

                if (!balanceUpdateSuccess) {
                    console.warn('Failed to update customer balance for deal:', dealId);
                    // Don't fail the deal creation, just log the warning
                }
            }

            // Redirect to the newly created deal's edit page after a short delay
            setTimeout(() => {
                router.push(`/sales-deals/edit/${dealId}`);
            }, 1500);
        } catch (error) {
            console.error(error);
            setAlert({
                message: error instanceof Error ? error.message : t('error_adding_deal'),
                type: 'danger',
            });
        } finally {
            setSaving(false);
        }
    };




    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'ILS',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(value);
    };

    const renderNewUsedSaleForm = () => (
        <div className="space-y-8">
            {/* Customer Selection */}
            <div className="panel">
                <div className="mb-5 flex items-center gap-3">
                    <IconUser className="w-5 h-5 text-primary" />
                    <h5 className="text-lg font-semibold dark:text-white-light">{t('customer_information')}</h5>
                </div>{' '}
                <div className="space-y-4">
                    <CustomerSelect
                        selectedCustomer={selectedCustomer}
                        onCustomerSelect={setSelectedCustomer}
                        onCreateNew={() => {
                            setCustomerCreationContext('customer');
                            setShowCreateCustomerModal(true);
                        }}
                        className="form-input"
                    />
                    <div className="flex justify-end">
                        <button
                            type="button"
                            onClick={() => {
                                setCustomerCreationContext('customer');
                                setShowCreateCustomerModal(true);
                            }}
                            className="btn btn-outline-primary"
                        >
                            {t('create_new_customer')}
                        </button>
                    </div>

                    {/* Customer Details Display */}
                    {selectedCustomer && (
                        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                            <h6 className="font-semibold text-blue-800 dark:text-blue-200 mb-3">{t('customer_details')}</h6>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                                <div>
                                    <span className="text-blue-600 dark:text-blue-300 font-medium">{t('customer_name')}:</span>
                                    <p className="text-blue-800 dark:text-blue-100">{selectedCustomer.name}</p>
                                </div>
                                <div>
                                    <span className="text-blue-600 dark:text-blue-300 font-medium">{t('phone')}:</span>
                                    <p className="text-blue-800 dark:text-blue-100">{selectedCustomer.phone}</p>
                                </div>
                                {selectedCustomer.id_number && (
                                    <div>
                                        <span className="text-blue-600 dark:text-blue-300 font-medium">{t('id_number')}:</span>
                                        <p className="text-blue-800 dark:text-blue-100">{selectedCustomer.id_number}</p>
                                    </div>
                                )}
                                {selectedCustomer.birth_date && (
                                    <div>
                                        <span className="text-blue-600 dark:text-blue-300 font-medium">{t('birth_date')}:</span>
                                        <p className="text-blue-800 dark:text-blue-100">{new Date(selectedCustomer.birth_date).toLocaleDateString()}</p>
                                    </div>
                                )}
                                <div>
                                    <span className="text-blue-600 dark:text-blue-300 font-medium">{t('age')}:</span>
                                    <p className="text-blue-800 dark:text-blue-100">
                                        {selectedCustomer.age} {t('years_old')}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            {/* Car Selection */}
            <div className="panel">
                <div className="mb-5 flex items-center gap-3">
                    <IconMenuWidgets className="w-5 h-5 text-primary" />
                    <h5 className="text-lg font-semibold dark:text-white-light">{t('car_information')}</h5>
                </div>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 dark:text-white mb-2">
                            {t('select_car')} <span className="text-red-500">*</span>
                        </label>
                        <CarSelect selectedCar={selectedCar} onCarSelect={setSelectedCar} onCreateNew={() => setShowCreateCarModal(true)} className="form-input" excludeLinkedCars={true} />
                    </div>
                    <div className="flex justify-end">
                        <button type="button" onClick={() => setShowCreateCarModal(true)} className="btn btn-outline-primary">
                            {t('create_new_car')}
                        </button>
                    </div>

                    {/* Car Details Display */}
                    {selectedCar && (
                        <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
                            <h6 className="font-semibold text-green-800 dark:text-green-200 mb-3">{t('car_details')}</h6>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                                <div>
                                    <span className="text-green-600 dark:text-green-300 font-medium">{t('manufacturer')}:</span>
                                    <p className="text-green-800 dark:text-green-100">{selectedCar.brand}</p>
                                </div>
                                <div>
                                    <span className="text-green-600 dark:text-green-300 font-medium">{t('car_name')}:</span>
                                    <p className="text-green-800 dark:text-green-100">{selectedCar.title}</p>
                                </div>{' '}
                                <div>
                                    <span className="text-green-600 dark:text-green-300 font-medium">{t('provider')}:</span>
                                    <p className="text-green-800 dark:text-green-100">{selectedCar.provider}</p>
                                </div>
                                <div>
                                    <span className="text-green-600 dark:text-green-300 font-medium">{t('year')}:</span>
                                    <p className="text-green-800 dark:text-green-100">{selectedCar.year}</p>
                                </div>
                                {selectedCar.car_number && (
                                    <div>
                                        <span className="text-green-600 dark:text-green-300 font-medium">{t('car_number')}:</span>
                                        <p className="text-green-800 dark:text-green-100">{selectedCar.car_number}</p>
                                    </div>
                                )}
                                <div>
                                    <span className="text-green-600 dark:text-green-300 font-medium">{t('kilometers')}:</span>
                                    <p className="text-green-800 dark:text-green-100">
                                        {selectedCar.kilometers.toLocaleString()} {t('km')}
                                    </p>
                                </div>
                                <div>
                                    <span className="text-green-600 dark:text-green-300 font-medium">{t('status')}:</span>
                                    <p className="text-green-800 dark:text-green-100">{selectedCar.status}</p>
                                </div>
                                <div>
                                    <span className="text-green-600 dark:text-green-300 font-medium">{t('buy_price')}:</span>
                                    <p className="text-green-800 dark:text-green-100">{formatCurrency(selectedCar.buy_price)}</p>
                                </div>
                                <div>
                                    <span className="text-green-600 dark:text-green-300 font-medium">{t('market_price')}:</span>
                                    <p className="text-green-800 dark:text-green-100">{formatCurrency(selectedCar.market_price)}</p>
                                </div>
                                <div>
                                    <span className="text-green-600 dark:text-green-300 font-medium">{t('suggested_selling_price')}:</span>
                                    <p className="text-green-800 dark:text-green-100">{formatCurrency(selectedCar.sale_price)}</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            {/* Deal Details */}
            <div className="panel">
                <div className="mb-5 flex items-center gap-3">
                    <IconDollarSign className="w-5 h-5 text-primary" />
                    <h5 className="text-lg font-semibold dark:text-white-light">{t('deal_details')}</h5>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {/* Deal Title */}
                    <div className="md:col-span-2">
                        <label htmlFor="title" className="block text-sm font-bold text-gray-700 dark:text-white mb-2">
                            {t('deal_title')} <span className="text-red-500">*</span>
                        </label>
                        <input type="text" id="title" name="title" value={saleForm.title} onChange={handleSaleFormChange} className="form-input" placeholder={t('enter_deal_title')} />
                    </div>
                    {/* Deal Summary Table */}
                    {selectedCar && (
                        <div className="md:col-span-2">
                            <div className="bg-transparent rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                                {' '}
                                {/* Table Header */}
                                <div className="grid grid-cols-3 gap-4 mb-4 pb-2 border-b border-gray-300 dark:border-gray-600">
                                    <div className="text-sm font-bold text-gray-700 dark:text-white text-right">{t('deal_item')}</div>
                                    <div className="text-sm font-bold text-gray-700 dark:text-white text-center">{t('deal_price')}</div>
                                </div>{' '}
                                {/* Row 1: Car for Sale */}
                                <div className="grid grid-cols-3 gap-4 mb-3 py-2">
                                    <div className="text-sm text-gray-700 dark:text-gray-300 text-right">
                                        <div className="font-medium">{t('car_for_sale')}</div>
                                        <div className="text-s mt-1 text-gray-500">
                                            {selectedCar.brand} {selectedCar.title} - {selectedCar.year}
                                            {selectedCar.car_number && ` - ${selectedCar.car_number}`}
                                        </div>
                                    </div>
                                    <div className="text-center">-</div>
                                </div>{' '}
                                {/* Row 2: Buy Price */}
                                <div className="grid grid-cols-3 gap-4 mb-3 py-2">
                                    <div className="text-sm text-gray-700 dark:text-gray-300 text-right">{t('buy_price_auto')}</div>
                                    <div className="text-center">
                                        <span className="text-sm text-gray-700 dark:text-gray-300">{formatCurrency(selectedCar.buy_price)}</span>
                                    </div>
                                </div>{' '}
                                {/* Row 3: Selling Price */}
                                <div className="grid grid-cols-3 gap-4 mb-3 py-2">
                                    <div className="text-sm pt-2 text-gray-700 dark:text-gray-300 text-right">
                                        {t('selling_price_manual')}
                                        <div className="text-xs text-blue-600 dark:text-blue-400 mt-1 font-normal">{t('updates_car_sale_price')}</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="flex justify-center">
                                            <span className="inline-flex items-center px-2 bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 border ltr:border-r-0 rtl:border-l-0 border-gray-300 dark:border-gray-600 ltr:rounded-l-md rtl:rounded-r-md text-xs">
                                                $
                                            </span>
                                            <input
                                                type="number"
                                                name="selling_price"
                                                step="0.01"
                                                min="0"
                                                value={saleForm.selling_price}
                                                onChange={handleSaleFormChange}
                                                className="form-input ltr:rounded-l-none rtl:rounded-r-none w-24"
                                                style={{ direction: 'ltr', textAlign: 'center' }}
                                                placeholder="0.00"
                                            />
                                        </div>
                                    </div>
                                </div>{' '}
                                {/* Row 4: Loss (Editable) */}
                                <div className="grid grid-cols-3 gap-4 mb-3 py-2">
                                    <div className="text-sm pt-1 text-gray-700 dark:text-gray-300 text-right">{t('loss_amount')}</div>
                                    <div className="text-center">
                                        <div className="flex justify-center">
                                            <span className="inline-flex items-center px-2 bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 border ltr:border-r-0 rtl:border-l-0 border-gray-300 dark:border-gray-600 ltr:rounded-l-md rtl:rounded-r-md text-xs">
                                                $
                                            </span>
                                            <input
                                                type="number"
                                                name="loss_amount"
                                                step="0.01"
                                                min="0"
                                                value={saleForm.loss_amount}
                                                onChange={handleSaleFormChange}
                                                className="form-input ltr:rounded-l-none rtl:rounded-r-none w-24"
                                                style={{ direction: 'ltr', textAlign: 'center' }}
                                                placeholder="0.00"
                                            />
                                        </div>
                                    </div>
                                </div>{' '}
                                {/* Row 5: Profit Commission (Calculated) */}
                                <div className="grid grid-cols-3 gap-4 mb-4 py-2">
                                    <div className="text-sm text-gray-700 dark:text-gray-300 text-right">{t('profit_commission')}</div>
                                    <div className="text-center">
                                        {(() => {
                                            if (!saleForm.selling_price || !selectedCar) return <span className="text-sm text-gray-700 dark:text-gray-300">{formatCurrency(0)}</span>;

                                            const buyPrice = selectedCar.buy_price;
                                            const sellPrice = parseFloat(saleForm.selling_price);
                                            const loss = parseFloat(saleForm.loss_amount || '0');
                                            const profitCommission = sellPrice - buyPrice - loss;

                                            return (
                                                <span className={`text-sm ${profitCommission >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                                    {profitCommission >= 0 ? '+' : ''}
                                                    {formatCurrency(profitCommission)}
                                                </span>
                                            );
                                        })()}
                                    </div>
                                </div>{' '}
                            </div>
                        </div>
                    )}
                    {/* Notes */}
                    <div className="md:col-span-2">
                        <label htmlFor="notes" className="block text-sm font-bold text-gray-700 dark:text-white mb-2">
                            {t('notes')}
                        </label>
                        <textarea id="notes" name="notes" value={saleForm.notes} onChange={handleSaleFormChange} className="form-textarea min-h-[120px]" placeholder={t('enter_deal_notes')} />
                    </div>
                </div>
            </div>

            {/* Payment Methods Section */}
            <div className="panel">
                <DealPaymentMethods value={paymentMethods} onChange={setPaymentMethods} notes={paymentNotes} onNotesChange={setPaymentNotes} />
            </div>

            {/* Deal Attachments */}
            <div className="panel">
                <div className="mb-5 flex items-center gap-3">
                    <IconNotes className="w-5 h-5 text-primary" />
                    <h5 className="text-lg font-semibold dark:text-white-light">{t('deal_attachments')}</h5>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <SingleFileUpload
                        file={dealAttachments.carLicense}
                        onFileChange={(file) => setDealAttachments((prev) => ({ ...prev, carLicense: file }))}
                        title={t('car_license')}
                        description={t('car_license_desc')}
                        accept="image/*,.pdf"
                        className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                    />
                    <SingleFileUpload
                        file={dealAttachments.driverLicense}
                        onFileChange={(file) => setDealAttachments((prev) => ({ ...prev, driverLicense: file }))}
                        title={t('driver_license')}
                        description={t('driver_license_desc')}
                        accept="image/*,.pdf"
                        className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                    />
                    <SingleFileUpload
                        file={dealAttachments.carTransferDocument}
                        onFileChange={(file) => setDealAttachments((prev) => ({ ...prev, carTransferDocument: file }))}
                        title={t('car_transfer_document')}
                        description={t('car_transfer_document_desc')}
                        accept="image/*,.pdf"
                        className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                    />
                </div>
            </div>
        </div>
    );

    const renderExchangeForm = () => (
        <div className="space-y-6">
            {/* Customer Selection */}
            <div className="panel">
                <div className="mb-5 flex items-center gap-3">
                    <IconUser className="w-5 h-5 text-primary" />
                    <h5 className="text-lg font-semibold dark:text-white-light">{t('customer_information')}</h5>
                </div>{' '}
                <div className="space-y-4">
                    <CustomerSelect
                        selectedCustomer={selectedCustomer}
                        onCustomerSelect={setSelectedCustomer}
                        onCreateNew={() => {
                            setCustomerCreationContext('customer');
                            setShowCreateCustomerModal(true);
                        }}
                        className="form-input"
                    />
                    <div className="flex justify-end">
                        <button
                            type="button"
                            onClick={() => {
                                setCustomerCreationContext('customer');
                                setShowCreateCustomerModal(true);
                            }}
                            className="btn btn-outline-primary"
                        >
                            {t('create_new_customer')}
                        </button>
                    </div>
                    {/* Customer Details Display */}
                    {selectedCustomer && (
                        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                            <h6 className="font-semibold text-blue-800 dark:text-blue-200 mb-3">{t('customer_details')}</h6>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                                <div>
                                    <span className="text-blue-600 dark:text-blue-300 font-medium">{t('customer_name')}:</span>
                                    <p className="text-blue-800 dark:text-blue-100">{selectedCustomer.name}</p>
                                </div>
                                <div>
                                    <span className="text-blue-600 dark:text-blue-300 font-medium">{t('phone')}:</span>
                                    <p className="text-blue-800 dark:text-blue-100">{selectedCustomer.phone}</p>
                                </div>
                                {selectedCustomer.id_number && (
                                    <div>
                                        <span className="text-blue-600 dark:text-blue-300 font-medium">{t('id_number')}:</span>
                                        <p className="text-blue-800 dark:text-blue-100">{selectedCustomer.id_number}</p>
                                    </div>
                                )}
                                {selectedCustomer.birth_date && (
                                    <div>
                                        <span className="text-blue-600 dark:text-blue-300 font-medium">{t('birth_date')}:</span>
                                        <p className="text-blue-800 dark:text-blue-100">{new Date(selectedCustomer.birth_date).toLocaleDateString()}</p>
                                    </div>
                                )}
                                <div>
                                    <span className="text-blue-600 dark:text-blue-300 font-medium">{t('age')}:</span>
                                    <p className="text-blue-800 dark:text-blue-100">
                                        {selectedCustomer.age} {t('years_old')}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            {/* New Car Selection from Showroom */}
            <div className="panel">
                <div className="mb-5 flex items-center gap-3">
                    <IconMenuWidgets className="w-5 h-5 text-primary" />
                    <h5 className="text-lg font-semibold dark:text-white-light">{t('new_car_from_showroom')}</h5>
                </div>
                <div className="space-y-4">
                    <CarSelect selectedCar={selectedCar} onCarSelect={setSelectedCar} onCreateNew={() => setShowCreateCarModal(true)} className="form-input" excludeLinkedCars={true} />
                    <div className="flex justify-end">
                        <button type="button" onClick={() => setShowCreateCarModal(true)} className="btn btn-outline-primary">
                            {t('create_new_car')}
                        </button>
                    </div>

                    {/* Car Details Display */}
                    {selectedCar && (
                        <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
                            <h6 className="font-semibold text-green-800 dark:text-green-200 mb-3">{t('new_car_details')}</h6>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                                <div>
                                    <span className="text-green-600 dark:text-green-300 font-medium">{t('manufacturer')}:</span>
                                    <p className="text-green-800 dark:text-green-100">{selectedCar.brand}</p>
                                </div>
                                <div>
                                    <span className="text-green-600 dark:text-green-300 font-medium">{t('car_name')}:</span>
                                    <p className="text-green-800 dark:text-green-100">{selectedCar.title}</p>
                                </div>
                                <div>
                                    <span className="text-green-600 dark:text-green-300 font-medium">{t('year')}:</span>
                                    <p className="text-green-800 dark:text-green-100">{selectedCar.year}</p>
                                </div>
                                <div>
                                    <span className="text-green-600 dark:text-green-300 font-medium">{t('kilometers')}:</span>
                                    <p className="text-green-800 dark:text-green-100">
                                        {selectedCar.kilometers.toLocaleString()} {t('km')}
                                    </p>
                                </div>
                                <div>
                                    <span className="text-green-600 dark:text-green-300 font-medium">{t('condition')}:</span>
                                    <p className="text-green-800 dark:text-green-100">{selectedCar.status}</p>
                                </div>
                                <div>
                                    <span className="text-green-600 dark:text-green-300 font-medium">{t('market_price')}:</span>
                                    <p className="text-green-800 dark:text-green-100">{formatCurrency(selectedCar.market_price)}</p>
                                </div>
                                <div>
                                    <span className="text-green-600 dark:text-green-300 font-medium">{t('sale_price')}:</span>
                                    <p className="text-green-800 dark:text-green-100">{formatCurrency(selectedCar.sale_price)}</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            {/* Customer's Old Car Details */}
            <div className="panel">
                <div className="mb-5 flex items-center gap-3">
                    <IconMenuWidgets className="w-5 h-5 text-warning" />
                    <h5 className="text-lg font-semibold dark:text-white-light">{t('customer_old_car_details')}</h5>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="old_car_manufacturer" className="block text-sm font-bold text-gray-700 dark:text-white mb-2">
                            {t('manufacturer')} <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            id="old_car_manufacturer"
                            name="old_car_manufacturer"
                            value={exchangeForm.old_car_manufacturer}
                            onChange={handleExchangeFormChange}
                            className="form-input"
                            placeholder={t('enter_manufacturer')}
                        />
                    </div>
                    <div>
                        <label htmlFor="old_car_name" className="block text-sm font-bold text-gray-700 dark:text-white mb-2">
                            {t('car_name')} <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            id="old_car_name"
                            name="old_car_name"
                            value={exchangeForm.old_car_name}
                            onChange={handleExchangeFormChange}
                            className="form-input"
                            placeholder={t('enter_car_name')}
                        />
                    </div>
                    <div>
                        <label htmlFor="old_car_year" className="block text-sm font-bold text-gray-700 dark:text-white mb-2">
                            {t('year')} <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="number"
                            id="old_car_year"
                            name="old_car_year"
                            value={exchangeForm.old_car_year}
                            onChange={handleExchangeFormChange}
                            className="form-input"
                            placeholder={t('enter_year')}
                            min="1900"
                            max="2030"
                        />
                    </div>
                    <div>
                        <label htmlFor="old_car_kilometers" className="block text-sm font-bold text-gray-700 dark:text-white mb-2">
                            {t('kilometers')}
                        </label>
                        <input
                            type="number"
                            id="old_car_kilometers"
                            name="old_car_kilometers"
                            value={exchangeForm.old_car_kilometers}
                            onChange={handleExchangeFormChange}
                            className="form-input"
                            placeholder={t('enter_kilometers')}
                        />
                    </div>{' '}
                    <div>
                        <label htmlFor="old_car_condition" className="block text-sm font-bold text-gray-700 dark:text-white mb-2">
                            {t('condition')} ({t('hand')})
                        </label>
                        <input
                            type="text"
                            id="old_car_condition"
                            name="old_car_condition"
                            value={exchangeForm.old_car_condition}
                            onChange={handleExchangeFormChange}
                            className="form-input"
                            placeholder={t('enter_condition')}
                        />
                    </div>
                    <div>
                        <label htmlFor="old_car_number" className="block text-sm font-bold text-gray-700 dark:text-white mb-2">
                            {t('car_number')}
                        </label>
                        <input
                            type="text"
                            id="old_car_number"
                            name="old_car_number"
                            value={exchangeForm.old_car_number}
                            onChange={handleExchangeFormChange}
                            className="form-input"
                            placeholder={t('enter_car_number')}
                        />
                    </div>
                    <div>
                        <label htmlFor="old_car_market_price" className="block text-sm font-bold text-gray-700 dark:text-white mb-2">
                            {t('market_price')}
                        </label>
                        <input
                            type="number"
                            id="old_car_market_price"
                            name="old_car_market_price"
                            value={exchangeForm.old_car_market_price}
                            onChange={handleExchangeFormChange}
                            className="form-input"
                            placeholder="0.00"
                            step="0.01"
                        />
                    </div>
                    <div>
                        <label htmlFor="old_car_purchase_price" className="block text-sm font-bold text-gray-700 dark:text-white mb-2">
                            {t('purchase_price_from_customer')} <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="number"
                            id="old_car_purchase_price"
                            name="old_car_purchase_price"
                            value={exchangeForm.old_car_purchase_price}
                            onChange={handleExchangeFormChange}
                            className="form-input"
                            placeholder="0.00"
                            step="0.01"
                        />
                    </div>
                </div>

                {/* Exchange Calculation Display */}
                {selectedCar && exchangeForm.old_car_purchase_price && (
                    <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                        <h6 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-3">{t('exchange_calculation')}</h6>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                            <div>
                                <span className="text-yellow-600 dark:text-yellow-300 font-medium">{t('new_car_price')}:</span>
                                <p className="text-yellow-800 dark:text-yellow-100">{formatCurrency(selectedCar.sale_price)}</p>
                            </div>
                            <div>
                                <span className="text-yellow-600 dark:text-yellow-300 font-medium">{t('old_car_value')}:</span>
                                <p className="text-yellow-800 dark:text-yellow-100">{formatCurrency(parseFloat(exchangeForm.old_car_purchase_price))}</p>
                            </div>
                            <div>
                                <span className="text-yellow-600 dark:text-yellow-300 font-medium">{t('difference_to_pay')}:</span>
                                <p className="text-yellow-800 dark:text-yellow-100 font-bold">{formatCurrency(selectedCar.sale_price - parseFloat(exchangeForm.old_car_purchase_price))}</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>{' '}
            {/* Deal Details */}
            <div className="panel">
                <div className="mb-5 flex items-center gap-3">
                    <IconDollarSign className="w-5 h-5 text-primary" />
                    <h5 className="text-lg font-semibold dark:text-white-light">{t('deal_details')}</h5>
                </div>
                <div className="grid grid-cols-1 gap-4">
                    <div>
                        <label htmlFor="title" className="block text-sm font-bold text-gray-700 dark:text-white mb-2">
                            {t('deal_title')} <span className="text-red-500">*</span>
                        </label>
                        <input type="text" id="title" name="title" value={exchangeForm.title} onChange={handleExchangeFormChange} className="form-input" placeholder={t('enter_deal_title')} />
                    </div>

                    {/* Exchange Deal Summary Table */}
                    {selectedCar && (
                        <div className="md:col-span-2">
                            <div className="bg-transparent rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                                {/* Table Header */}
                                <div className="grid grid-cols-3 gap-4 mb-4 pb-2 border-b border-gray-300 dark:border-gray-600">
                                    <div className="text-sm font-bold text-gray-700 dark:text-white text-right">{t('deal_item')}</div>
                                    <div className="text-sm font-bold text-gray-700 dark:text-white text-center">{t('deal_price')}</div>
                                </div>
                                {/* Row 1: Car for Sale */}
                                <div className="grid grid-cols-3 gap-4 mb-3 py-2">
                                    <div className="text-sm text-gray-700 dark:text-gray-300 text-right">
                                        <div className="font-medium">{t('car_for_sale')}</div>
                                        <div className="text-s mt-1 text-gray-500">
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
                                        <span className="text-sm text-gray-700 dark:text-gray-300">{formatCurrency(selectedCar.buy_price)}</span>
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
                                                value={exchangeForm.selling_price || ''}
                                                onChange={handleExchangeFormChange}
                                                className="form-input ltr:rounded-l-none rtl:rounded-r-none w-24"
                                                style={{ direction: 'ltr', textAlign: 'center' }}
                                                placeholder="0.00"
                                            />
                                        </div>
                                    </div>
                                </div>{' '}
                                {/* Row 4: Customer Car Evaluation (Auto-calculated) */}
                                <div className="grid grid-cols-3 gap-4 mb-3 py-2">
                                    <div className="text-sm text-gray-700 dark:text-gray-300 text-right">
                                        <div className="font-medium">{t('customer_car_evaluation')}</div>
                                        {exchangeForm.old_car_manufacturer && exchangeForm.old_car_name && (
                                            <div className="text-s mt-1 text-gray-500">
                                                {exchangeForm.old_car_manufacturer} {exchangeForm.old_car_name}
                                                {exchangeForm.old_car_year && ` - ${exchangeForm.old_car_year}`}
                                                {exchangeForm.old_car_number && ` - ${exchangeForm.old_car_number}`}
                                                {exchangeForm.old_car_condition && ` - ${exchangeForm.old_car_condition}`}
                                            </div>
                                        )}
                                    </div>
                                    <div className="text-center">
                                        <span className="text-sm text-gray-700 dark:text-gray-300">{formatCurrency(parseFloat(exchangeForm.customer_car_eval_value || '0'))}</span>
                                    </div>
                                </div>
                                {/* Row 5: Additional Amount from Customer (Auto-calculated) */}
                                <div className="grid grid-cols-3 gap-4 mb-3 py-2">
                                    <div className="text-sm text-gray-700 dark:text-gray-300 text-right">{t('additional_amount_from_customer')}</div>
                                    <div className="text-center">
                                        <span className="text-sm text-gray-700 dark:text-gray-300">{formatCurrency(parseFloat(exchangeForm.additional_customer_amount || '0'))}</span>
                                    </div>
                                </div>
                                {/* Row 6: Loss (Editable) */}
                                <div className="grid grid-cols-3 gap-4 mb-3 py-2">
                                    <div className="text-sm pt-1 text-gray-700 dark:text-gray-300 text-right">{t('loss_amount')}</div>
                                    <div className="text-center">
                                        <div className="flex justify-center">
                                            <span className="inline-flex items-center px-2 bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 border ltr:border-r-0 rtl:border-l-0 border-gray-300 dark:border-gray-600 ltr:rounded-l-md rtl:rounded-r-md text-xs">
                                                $
                                            </span>
                                            <input
                                                type="number"
                                                name="loss_amount"
                                                step="0.01"
                                                min="0"
                                                value={exchangeForm.loss_amount}
                                                onChange={handleExchangeFormChange}
                                                className="form-input ltr:rounded-l-none rtl:rounded-r-none w-24"
                                                style={{ direction: 'ltr', textAlign: 'center' }}
                                                placeholder="0.00"
                                            />
                                        </div>
                                    </div>
                                </div>
                                {/* Row 7: Profit Commission (Calculated) */}
                                <div className="grid grid-cols-3 gap-4 mb-4 py-2">
                                    <div className="text-sm text-gray-700 dark:text-gray-300 text-right">{t('profit_commission')}</div>
                                    <div className="text-center">
                                        {(() => {
                                            if (!selectedCar) return <span className="text-sm text-gray-700 dark:text-gray-300">{formatCurrency(0)}</span>;

                                            const buyPrice = selectedCar.buy_price;
                                            const sellPrice = selectedCar.sale_price;
                                            const oldCarPurchasePrice = parseFloat(exchangeForm.old_car_purchase_price || '0');
                                            const loss = parseFloat(exchangeForm.loss_amount || '0');

                                            // For exchange: Profit = Sale Price - Old Car Purchase Price - Buy Price - Loss
                                            // Note: customer_car_eval_value and additional_customer_amount are display-only and don't affect profit
                                            const profitCommission = sellPrice - buyPrice - loss;

                                            return (
                                                <span className={`text-sm ${profitCommission >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                                    {profitCommission >= 0 ? '+' : ''}
                                                    {formatCurrency(profitCommission)}
                                                </span>
                                            );
                                        })()}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Notes */}
                    <div>
                        <label htmlFor="notes" className="block text-sm font-bold text-gray-700 dark:text-white mb-2">
                            {t('notes')}
                        </label>
                        <textarea id="notes" name="notes" value={exchangeForm.notes} onChange={handleExchangeFormChange} className="form-textarea min-h-[120px]" placeholder={t('enter_deal_notes')} />
                    </div>
                </div>
            </div>
            {/* Payment Methods Section */}
            <div className="panel">
                <DealPaymentMethods value={paymentMethods} onChange={setPaymentMethods} notes={paymentNotes} onNotesChange={setPaymentNotes} />
            </div>
            {/* Deal Attachments */}
            <div className="panel">
                <div className="mb-5 flex items-center gap-3">
                    <IconNotes className="w-5 h-5 text-primary" />
                    <h5 className="text-lg font-semibold dark:text-white-light">{t('deal_attachments')}</h5>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <SingleFileUpload
                        file={dealAttachments.carLicense}
                        onFileChange={(file) => setDealAttachments((prev) => ({ ...prev, carLicense: file }))}
                        title={t('car_license')}
                        description={t('car_license_desc')}
                        accept="image/*,.pdf"
                        className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                    />
                    <SingleFileUpload
                        file={dealAttachments.driverLicense}
                        onFileChange={(file) => setDealAttachments((prev) => ({ ...prev, driverLicense: file }))}
                        title={t('driver_license')}
                        description={t('driver_license_desc')}
                        accept="image/*,.pdf"
                        className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                    />
                    <SingleFileUpload
                        file={dealAttachments.carTransferDocument}
                        onFileChange={(file) => setDealAttachments((prev) => ({ ...prev, carTransferDocument: file }))}
                        title={t('car_transfer_document')}
                        description={t('car_transfer_document_desc')}
                        accept="image/*,.pdf"
                        className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                    />
                </div>
            </div>
        </div>
    );

    const renderCompanyCommissionForm = () => (
        <div className="space-y-8">
            {/* Company Commission Details */}
            <div className="panel">
                <div className="mb-5 flex items-center gap-3">
                    <IconDollarSign className="w-5 h-5 text-primary" />
                    <h5 className="text-lg font-semibold dark:text-white-light">{t('company_commission_details')}</h5>
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
                            value={companyCommissionForm.title}
                            onChange={handleCompanyCommissionFormChange}
                            className="form-input"
                            placeholder={t('enter_deal_title')}
                        />
                    </div>
                    {/* Company Name */}
                    <div>
                        <label htmlFor="company_name" className="block text-sm font-bold text-gray-700 dark:text-white mb-2">
                            {t('company_name')} <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            id="company_name"
                            name="company_name"
                            value={companyCommissionForm.company_name}
                            onChange={handleCompanyCommissionFormChange}
                            className="form-input"
                            placeholder={t('enter_company_name')}
                        />
                    </div>
                    {/* Commission Date */}
                    <div>
                        <label htmlFor="commission_date" className="block text-sm font-bold text-gray-700 dark:text-white mb-2">
                            {t('commission_date')} <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="date"
                            id="commission_date"
                            name="commission_date"
                            value={companyCommissionForm.commission_date}
                            onChange={handleCompanyCommissionFormChange}
                            className="form-input"
                        />
                    </div>
                    {/* Commission Amount */}
                    <div>
                        <label htmlFor="amount" className="block text-sm font-bold text-gray-700 dark:text-white mb-2">
                            {t('company_commission_amount')} <span className="text-red-500">*</span>
                        </label>
                        <div className="flex">
                            <span className="inline-flex items-center px-3 bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 border ltr:border-r-0 rtl:border-l-0 border-gray-300 dark:border-gray-600 ltr:rounded-l-md rtl:rounded-r-md">
                                ₪
                            </span>
                            <input
                                type="number"
                                id="amount"
                                name="amount"
                                step="0.01"
                                min="0"
                                value={companyCommissionForm.amount}
                                onChange={handleCompanyCommissionFormChange}
                                className="form-input ltr:rounded-l-none rtl:rounded-r-none"
                                placeholder="0.00"
                            />
                        </div>
                    </div>
                    {/* Selling Price */}
                    <div>
                        <label htmlFor="selling_price" className="block text-sm font-bold text-gray-700 dark:text-white mb-2">
                            {t('selling_price_manual')}
                            <div className="text-xs text-blue-600 dark:text-blue-400 mt-1 font-normal">{t('updates_car_sale_price')}</div>
                        </label>
                        <div className="flex">
                            <span className="inline-flex items-center px-3 bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 border ltr:border-r-0 rtl:border-l-0 border-gray-300 dark:border-gray-600 ltr:rounded-l-md rtl:rounded-r-md">
                                ₪
                            </span>
                            <input
                                type="number"
                                id="selling_price"
                                name="selling_price"
                                step="0.01"
                                min="0"
                                value={companyCommissionForm.selling_price || ''}
                                onChange={handleCompanyCommissionFormChange}
                                className="form-input ltr:rounded-l-none rtl:rounded-r-none"
                                placeholder="0.00"
                            />
                        </div>
                    </div>
                    {/* Commission Description */}
                    <div className="md:col-span-2">
                        <label htmlFor="description" className="block text-sm font-bold text-gray-700 dark:text-white mb-2">
                            {t('commission_description')}
                        </label>
                        <textarea
                            id="description"
                            name="description"
                            value={companyCommissionForm.description}
                            onChange={handleCompanyCommissionFormChange}
                            className="form-textarea min-h-[120px]"
                            placeholder={t('enter_commission_description')}
                        />
                    </div>
                </div>
            </div>

            {/* Payment Methods Section */}
            <div className="panel">
                <DealPaymentMethods value={paymentMethods} onChange={setPaymentMethods} notes={paymentNotes} onNotesChange={setPaymentNotes} />
            </div>

            {/* Deal Attachments */}
            <div className="panel">
                <div className="mb-5 flex items-center gap-3">
                    <IconNotes className="w-5 h-5 text-primary" />
                    <h5 className="text-lg font-semibold dark:text-white-light">{t('deal_attachments')}</h5>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <SingleFileUpload
                        file={dealAttachments.carLicense}
                        onFileChange={(file) => setDealAttachments((prev) => ({ ...prev, carLicense: file }))}
                        title={t('car_license')}
                        description={t('car_license_desc')}
                        accept="image/*,.pdf"
                        className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                    />
                    <SingleFileUpload
                        file={dealAttachments.driverLicense}
                        onFileChange={(file) => setDealAttachments((prev) => ({ ...prev, driverLicense: file }))}
                        title={t('driver_license')}
                        description={t('driver_license_desc')}
                        accept="image/*,.pdf"
                        className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                    />
                    <SingleFileUpload
                        file={dealAttachments.carTransferDocument}
                        onFileChange={(file) => setDealAttachments((prev) => ({ ...prev, carTransferDocument: file }))}
                        title={t('car_transfer_document')}
                        description={t('car_transfer_document_desc')}
                        accept="image/*,.pdf"
                        className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                    />
                </div>
            </div>
        </div>
    );
    const renderIntermediaryForm = () => (
        <div className="space-y-8">
            {/* Seller Information */}
            <div className="panel">
                <div className="mb-5 flex items-center gap-3">
                    <IconUser className="w-5 h-5 text-primary" />
                    <h5 className="text-lg font-semibold dark:text-white-light">{t('seller_information')}</h5>
                </div>{' '}
                <div className="space-y-4">
                    <CustomerSelect
                        selectedCustomer={selectedSeller}
                        onCustomerSelect={setSelectedSeller}
                        onCreateNew={() => {
                            setCustomerCreationContext('seller');
                            setShowCreateCustomerModal(true);
                        }}
                        className="form-input"
                    />
                    <div className="flex justify-end">
                        <button
                            type="button"
                            onClick={() => {
                                setCustomerCreationContext('seller');
                                setShowCreateCustomerModal(true);
                            }}
                            className="btn btn-outline-primary"
                        >
                            {t('create_new_customer')}
                        </button>
                    </div>

                    {/* Seller Details Display */}
                    {selectedSeller && (
                        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                            <h6 className="font-semibold text-blue-800 dark:text-blue-200 mb-3">{t('seller_details')}</h6>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                                <div>
                                    <span className="text-blue-600 dark:text-blue-300 font-medium">{t('customer_name')}:</span>
                                    <p className="text-blue-800 dark:text-blue-100">{selectedSeller.name}</p>
                                </div>
                                <div>
                                    <span className="text-blue-600 dark:text-blue-300 font-medium">{t('phone')}:</span>
                                    <p className="text-blue-800 dark:text-blue-100">{selectedSeller.phone}</p>
                                </div>
                                {selectedSeller.id_number && (
                                    <div>
                                        <span className="text-blue-600 dark:text-blue-300 font-medium">{t('id_number')}:</span>
                                        <p className="text-blue-800 dark:text-blue-100">{selectedSeller.id_number}</p>
                                    </div>
                                )}
                                {selectedSeller.birth_date && (
                                    <div>
                                        <span className="text-blue-600 dark:text-blue-300 font-medium">{t('birth_date')}:</span>
                                        <p className="text-blue-800 dark:text-blue-100">{new Date(selectedSeller.birth_date).toLocaleDateString()}</p>
                                    </div>
                                )}
                                <div>
                                    <span className="text-blue-600 dark:text-blue-300 font-medium">{t('age')}:</span>
                                    <p className="text-blue-800 dark:text-blue-100">
                                        {selectedSeller.age} {t('years_old')}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            {/* Car Information */}
            <div className="panel">
                <div className="mb-5 flex items-center gap-3">
                    <IconMenuWidgets className="w-5 h-5 text-primary" />
                    <h5 className="text-lg font-semibold dark:text-white-light">{t('car_information')}</h5>
                </div>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 dark:text-white mb-2">
                            {t('select_car')} <span className="text-red-500">*</span>
                        </label>
                        <CarSelect selectedCar={selectedCar} onCarSelect={setSelectedCar} onCreateNew={() => setShowCreateCarModal(true)} className="form-input" excludeLinkedCars={true} />
                    </div>
                    <div className="flex justify-end">
                        <button type="button" onClick={() => setShowCreateCarModal(true)} className="btn btn-outline-primary">
                            {t('create_new_car')}
                        </button>
                    </div>

                    {/* Car Details Display */}
                    {selectedCar && (
                        <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
                            <h6 className="font-semibold text-green-800 dark:text-green-200 mb-3">{t('car_details')}</h6>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                                <div>
                                    <span className="text-green-600 dark:text-green-300 font-medium">{t('manufacturer')}:</span>
                                    <p className="text-green-800 dark:text-green-100">{selectedCar.brand}</p>
                                </div>
                                <div>
                                    <span className="text-green-600 dark:text-green-300 font-medium">{t('car_name')}:</span>
                                    <p className="text-green-800 dark:text-green-100">{selectedCar.title}</p>
                                </div>
                                <div>
                                    <span className="text-green-600 dark:text-green-300 font-medium">{t('provider')}:</span>
                                    <p className="text-green-800 dark:text-green-100">{selectedCar.provider}</p>
                                </div>
                                <div>
                                    <span className="text-green-600 dark:text-green-300 font-medium">{t('year')}:</span>
                                    <p className="text-green-800 dark:text-green-100">{selectedCar.year}</p>
                                </div>
                                {selectedCar.car_number && (
                                    <div>
                                        <span className="text-green-600 dark:text-green-300 font-medium">{t('car_number')}:</span>
                                        <p className="text-green-800 dark:text-green-100">{selectedCar.car_number}</p>
                                    </div>
                                )}
                                <div>
                                    <span className="text-green-600 dark:text-green-300 font-medium">{t('kilometers')}:</span>
                                    <p className="text-green-800 dark:text-green-100">
                                        {selectedCar.kilometers.toLocaleString()} {t('km')}
                                    </p>
                                </div>
                                <div>
                                    <span className="text-green-600 dark:text-green-300 font-medium">{t('status')}:</span>
                                    <p className="text-green-800 dark:text-green-100">{selectedCar.status}</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            {/* Buyer Information */}
            <div className="panel">
                <div className="mb-5 flex items-center gap-3">
                    <IconUser className="w-5 h-5 text-warning" />
                    <h5 className="text-lg font-semibold dark:text-white-light">{t('buyer_information')}</h5>
                </div>{' '}
                <div className="space-y-4">
                    <CustomerSelect
                        selectedCustomer={selectedBuyer}
                        onCustomerSelect={setSelectedBuyer}
                        onCreateNew={() => {
                            setCustomerCreationContext('buyer');
                            setShowCreateCustomerModal(true);
                        }}
                        className="form-input"
                    />
                    <div className="flex justify-end">
                        <button
                            type="button"
                            onClick={() => {
                                setCustomerCreationContext('buyer');
                                setShowCreateCustomerModal(true);
                            }}
                            className="btn btn-outline-primary"
                        >
                            {t('create_new_customer')}
                        </button>
                    </div>

                    {/* Buyer Details Display */}
                    {selectedBuyer && (
                        <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg border border-orange-200 dark:border-orange-800">
                            <h6 className="font-semibold text-orange-800 dark:text-orange-200 mb-3">{t('buyer_details')}</h6>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                                <div>
                                    <span className="text-orange-600 dark:text-orange-300 font-medium">{t('customer_name')}:</span>
                                    <p className="text-orange-800 dark:text-orange-100">{selectedBuyer.name}</p>
                                </div>
                                <div>
                                    <span className="text-orange-600 dark:text-orange-300 font-medium">{t('phone')}:</span>
                                    <p className="text-orange-800 dark:text-orange-100">{selectedBuyer.phone}</p>
                                </div>
                                {selectedBuyer.id_number && (
                                    <div>
                                        <span className="text-orange-600 dark:text-orange-300 font-medium">{t('id_number')}:</span>
                                        <p className="text-orange-800 dark:text-orange-100">{selectedBuyer.id_number}</p>
                                    </div>
                                )}
                                {selectedBuyer.birth_date && (
                                    <div>
                                        <span className="text-orange-600 dark:text-orange-300 font-medium">{t('birth_date')}:</span>
                                        <p className="text-orange-800 dark:text-orange-100">{new Date(selectedBuyer.birth_date).toLocaleDateString()}</p>
                                    </div>
                                )}
                                <div>
                                    <span className="text-orange-600 dark:text-orange-300 font-medium">{t('age')}:</span>
                                    <p className="text-orange-800 dark:text-orange-100">
                                        {selectedBuyer.age} {t('years_old')}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            {/* Deal Details */}
            <div className="panel">
                <div className="mb-5 flex items-center gap-3">
                    <IconDollarSign className="w-5 h-5 text-primary" />
                    <h5 className="text-lg font-semibold dark:text-white-light">{t('deal_details')}</h5>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {/* Deal Title */}
                    <div className="md:col-span-2">
                        <label htmlFor="title" className="block text-sm font-bold text-gray-700 dark:text-white mb-2">
                            {t('deal_title')} <span className="text-red-500">*</span>
                        </label>
                        <input type="text" id="title" name="title" value={intermediaryForm.title} onChange={handleIntermediaryFormChange} className="form-input" placeholder={t('enter_deal_title')} />
                    </div>
                    {/* Deal Summary Table */}
                    {selectedCar && (
                        <div className="md:col-span-2">
                            <div className="bg-transparent rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                                {/* Table Header */}
                                <div className="grid grid-cols-3 gap-4 mb-4 pb-2 border-b border-gray-300 dark:border-gray-600">
                                    <div className="text-sm font-bold text-gray-700 dark:text-white text-right">{t('deal_item')}</div>
                                    <div className="text-sm font-bold text-gray-700 dark:text-white text-center">{t('deal_price')}</div>
                                </div>
                                {/* Row 1: Car Brokerage Commission */}
                                <div className="grid grid-cols-3 gap-4 mb-3 py-2">
                                    <div className="text-sm text-gray-700 dark:text-gray-300 text-right">
                                        <div className="font-medium">{t('intermediary_car_commission')}</div>
                                        <div className="text-s mt-1 text-gray-500">
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
                                                value={intermediaryForm.selling_price || ''}
                                                onChange={handleIntermediaryFormChange}
                                                className="form-input ltr:rounded-l-none rtl:rounded-r-none w-24"
                                                style={{ direction: 'ltr', textAlign: 'center' }}
                                                placeholder="0.00"
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
                                                $
                                            </span>
                                            <input
                                                type="number"
                                                name="profit_commission"
                                                step="0.01"
                                                min="0"
                                                value={intermediaryForm.profit_commission}
                                                onChange={handleIntermediaryFormChange}
                                                className="form-input ltr:rounded-l-none rtl:rounded-r-none w-24"
                                                style={{ direction: 'ltr', textAlign: 'center' }}
                                                placeholder="0.00"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Notes */}
                    <div className="md:col-span-2">
                        <label htmlFor="notes" className="block text-sm font-bold text-gray-700 dark:text-white mb-2">
                            {t('notes')}
                        </label>
                        <textarea
                            id="notes"
                            name="notes"
                            value={intermediaryForm.notes}
                            onChange={handleIntermediaryFormChange}
                            className="form-textarea min-h-[120px]"
                            placeholder={t('enter_deal_notes')}
                        />
                    </div>
                </div>
            </div>

            {/* Payment Methods Section */}
            <div className="panel">
                <DealPaymentMethods value={paymentMethods} onChange={setPaymentMethods} notes={paymentNotes} onNotesChange={setPaymentNotes} />
            </div>

            {/* Deal Attachments */}
            <div className="panel">
                <div className="mb-5 flex items-center gap-3">
                    <IconNotes className="w-5 h-5 text-primary" />
                    <h5 className="text-lg font-semibold dark:text-white-light">{t('deal_attachments')}</h5>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <SingleFileUpload
                        file={dealAttachments.carLicense}
                        onFileChange={(file) => setDealAttachments((prev) => ({ ...prev, carLicense: file }))}
                        title={t('car_license')}
                        description={t('car_license_desc')}
                        accept="image/*,.pdf"
                        className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                    />
                    <SingleFileUpload
                        file={dealAttachments.driverLicense}
                        onFileChange={(file) => setDealAttachments((prev) => ({ ...prev, driverLicense: file }))}
                        title={t('driver_license')}
                        description={t('driver_license_desc')}
                        accept="image/*,.pdf"
                        className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                    />
                    <SingleFileUpload
                        file={dealAttachments.carTransferDocument}
                        onFileChange={(file) => setDealAttachments((prev) => ({ ...prev, carTransferDocument: file }))}
                        title={t('car_transfer_document')}
                        description={t('car_transfer_document_desc')}
                        accept="image/*,.pdf"
                        className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                    />
                </div>
            </div>
        </div>
    );

    const renderFinancingAssistanceForm = () => (
        <div className="space-y-8">
            {/* Customer Information */}
            <div className="panel">
                <div className="mb-5 flex items-center gap-3">
                    <IconUser className="w-5 h-5 text-primary" />
                    <h5 className="text-lg font-semibold dark:text-white-light">{t('customer_information')}</h5>
                </div>
                <div className="space-y-4">
                    <CustomerSelect
                        selectedCustomer={selectedCustomer}
                        onCustomerSelect={setSelectedCustomer}
                        onCreateNew={() => {
                            setCustomerCreationContext('customer');
                            setShowCreateCustomerModal(true);
                        }}
                        className="form-input"
                    />
                    <div className="flex justify-end">
                        <button
                            type="button"
                            onClick={() => {
                                setCustomerCreationContext('customer');
                                setShowCreateCustomerModal(true);
                            }}
                            className="btn btn-outline-primary"
                        >
                            {t('create_new_customer')}
                        </button>
                    </div>

                    {/* Customer Details Display */}
                    {selectedCustomer && (
                        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                            <h6 className="font-semibold text-blue-800 dark:text-blue-200 mb-3">{t('customer_details')}</h6>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                                <div>
                                    <span className="text-blue-600 dark:text-blue-300 font-medium">{t('customer_name')}:</span>
                                    <p className="text-blue-800 dark:text-blue-100">{selectedCustomer.name}</p>
                                </div>
                                <div>
                                    <span className="text-blue-600 dark:text-blue-300 font-medium">{t('phone')}:</span>
                                    <p className="text-blue-800 dark:text-blue-100">{selectedCustomer.phone}</p>
                                </div>
                                {selectedCustomer.id_number && (
                                    <div>
                                        <span className="text-blue-600 dark:text-blue-300 font-medium">{t('id_number')}:</span>
                                        <p className="text-blue-800 dark:text-blue-100">{selectedCustomer.id_number}</p>
                                    </div>
                                )}
                                {selectedCustomer.birth_date && (
                                    <div>
                                        <span className="text-blue-600 dark:text-blue-300 font-medium">{t('birth_date')}:</span>
                                        <p className="text-blue-800 dark:text-blue-100">{new Date(selectedCustomer.birth_date).toLocaleDateString()}</p>
                                    </div>
                                )}
                                <div>
                                    <span className="text-blue-600 dark:text-blue-300 font-medium">{t('age')}:</span>
                                    <p className="text-blue-800 dark:text-blue-100">
                                        {selectedCustomer.age} {t('years_old')}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Car Information */}
            <div className="panel">
                <div className="mb-5 flex items-center gap-3">
                    <IconMenuWidgets className="w-5 h-5 text-primary" />
                    <h5 className="text-lg font-semibold dark:text-white-light">{t('car_information')}</h5>
                </div>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 dark:text-white mb-2">
                            {t('select_car')} <span className="text-red-500">*</span>
                        </label>
                        <CarSelect selectedCar={selectedCar} onCarSelect={setSelectedCar} onCreateNew={() => setShowCreateCarModal(true)} className="form-input" excludeLinkedCars={true} />
                    </div>
                    <div className="flex justify-end">
                        <button type="button" onClick={() => setShowCreateCarModal(true)} className="btn btn-outline-primary">
                            {t('create_new_car')}
                        </button>
                    </div>

                    {/* Car Details Display */}
                    {selectedCar && (
                        <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
                            <h6 className="font-semibold text-green-800 dark:text-green-200 mb-3">{t('car_details')}</h6>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                                <div>
                                    <span className="text-green-600 dark:text-green-300 font-medium">{t('manufacturer')}:</span>
                                    <p className="text-green-800 dark:text-green-100">{selectedCar.brand}</p>
                                </div>
                                <div>
                                    <span className="text-green-600 dark:text-green-300 font-medium">{t('car_name')}:</span>
                                    <p className="text-green-800 dark:text-green-100">{selectedCar.title}</p>
                                </div>
                                <div>
                                    <span className="text-green-600 dark:text-green-300 font-medium">{t('year')}:</span>
                                    <p className="text-green-800 dark:text-green-100">{selectedCar.year}</p>
                                </div>
                                <div>
                                    <span className="text-green-600 dark:text-green-300 font-medium">{t('kilometers')}:</span>
                                    <p className="text-green-800 dark:text-green-100">
                                        {selectedCar.kilometers.toLocaleString()} {t('km')}
                                    </p>
                                </div>
                                <div>
                                    <span className="text-green-600 dark:text-green-300 font-medium">{t('condition')}:</span>
                                    <p className="text-green-800 dark:text-green-100">{selectedCar.status}</p>
                                </div>
                                <div>
                                    <span className="text-green-600 dark:text-green-300 font-medium">{t('market_price')}:</span>
                                    <p className="text-green-800 dark:text-green-100">{formatCurrency(selectedCar.market_price)}</p>
                                </div>
                                <div>
                                    <span className="text-green-600 dark:text-green-300 font-medium">{t('sale_price')}:</span>
                                    <p className="text-green-800 dark:text-green-100">{formatCurrency(selectedCar.sale_price)}</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Deal Details */}
            <div className="panel">
                <div className="mb-5 flex items-center gap-3">
                    <IconDollarSign className="w-5 h-5 text-primary" />
                    <h5 className="text-lg font-semibold dark:text-white-light">{t('deal_details')}</h5>
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
                            value={financingAssistanceForm.title}
                            onChange={handleFinancingAssistanceFormChange}
                            className="form-input"
                            placeholder={t('enter_deal_title')}
                        />
                    </div>
                    {/* Deal Summary Table */}
                    {selectedCar && (
                        <div className="md:col-span-2">
                            <div className="bg-transparent rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                                {/* Table Header */}
                                <div className="grid grid-cols-3 gap-4 mb-4 pb-2 border-b border-gray-300 dark:border-gray-600">
                                    <div className="text-sm font-bold text-gray-700 dark:text-white text-right">{t('deal_item')}</div>
                                    <div className="text-sm font-bold text-gray-700 dark:text-white text-center">{t('deal_price')}</div>
                                </div>
                                {/* Row 1: Financing Assistance Commission */}
                                <div className="grid grid-cols-3 gap-4 mb-3 py-2">
                                    <div className="text-sm text-gray-700 dark:text-gray-300 text-right">
                                        <div className="font-medium">{t('financing_assistance_commission')}</div>
                                        <div className="text-s mt-1 text-gray-500">
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
                                                value={financingAssistanceForm.selling_price || ''}
                                                onChange={handleFinancingAssistanceFormChange}
                                                className="form-input ltr:rounded-l-none rtl:rounded-r-none w-24"
                                                style={{ direction: 'ltr', textAlign: 'center' }}
                                                placeholder="0.00"
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
                                                $
                                            </span>
                                            <input
                                                type="number"
                                                name="commission"
                                                step="0.01"
                                                min="0"
                                                value={financingAssistanceForm.commission}
                                                onChange={handleFinancingAssistanceFormChange}
                                                className="form-input ltr:rounded-l-none rtl:rounded-r-none w-24"
                                                style={{ direction: 'ltr', textAlign: 'center' }}
                                                placeholder="0.00"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                    {/* Notes */}
                    <div className="md:col-span-2">
                        <label htmlFor="notes" className="block text-sm font-bold text-gray-700 dark:text-white mb-2">
                            {t('notes')}
                        </label>
                        <textarea
                            id="notes"
                            name="notes"
                            value={financingAssistanceForm.notes}
                            onChange={handleFinancingAssistanceFormChange}
                            className="form-textarea min-h-[120px]"
                            placeholder={t('enter_deal_notes')}
                        />
                    </div>
                </div>
            </div>

            {/* Payment Methods Section */}
            <div className="panel">
                <DealPaymentMethods value={paymentMethods} onChange={setPaymentMethods} notes={paymentNotes} onNotesChange={setPaymentNotes} />
            </div>

            {/* Deal Attachments */}
            <div className="panel">
                <div className="mb-5 flex items-center gap-3">
                    <IconNotes className="w-5 h-5 text-primary" />
                    <h5 className="text-lg font-semibold dark:text-white-light">{t('deal_attachments')}</h5>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <SingleFileUpload
                        file={dealAttachments.carLicense}
                        onFileChange={(file) => setDealAttachments((prev) => ({ ...prev, carLicense: file }))}
                        title={t('car_license')}
                        description={t('car_license_desc')}
                        accept="image/*,.pdf"
                        className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                    />
                    <SingleFileUpload
                        file={dealAttachments.driverLicense}
                        onFileChange={(file) => setDealAttachments((prev) => ({ ...prev, driverLicense: file }))}
                        title={t('driver_license')}
                        description={t('driver_license_desc')}
                        accept="image/*,.pdf"
                        className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                    />
                    <SingleFileUpload
                        file={dealAttachments.carTransferDocument}
                        onFileChange={(file) => setDealAttachments((prev) => ({ ...prev, carTransferDocument: file }))}
                        title={t('car_transfer_document')}
                        description={t('car_transfer_document_desc')}
                        accept="image/*,.pdf"
                        className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                    />
                </div>
            </div>
        </div>
    );

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
                        <Link href="/sales-deals" className="text-primary hover:underline">
                            {t('deals')}
                        </Link>
                    </li>
                    <li className="before:content-['/'] ltr:before:mr-2 rtl:before:ml-2">
                        <span>{t('add_new_deal')}</span>
                    </li>
                </ul>
            </div>
            <div className="mb-6">
                <h1 className="text-2xl font-bold">{t('add_new_deal')}</h1>
                <p className="text-gray-500">{t('create_deal_description')}</p>
            </div>
            {alert && (
                <div className="fixed top-4 right-4 z-50 min-w-80 max-w-md">
                    <Alert type={alert.type} title={alert.type === 'success' ? t('success') : t('error')} message={alert.message} onClose={() => setAlert(null)} />
                </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Deal Type Selector - Prominent at the top */}
                <div className="panel bg-gradient-to-r from-primary/10 to-secondary/10 border-2 border-primary/20">
                    <div className="mb-5">
                        <h5 className="text-xl font-bold text-primary dark:text-white-light">{t('select_deal_type')}</h5>
                        <p className="text-gray-600 dark:text-gray-400 mt-2">{t('select_deal_type_desc')}</p>
                    </div>
                    <DealTypeSelect defaultValue={dealType} className="form-input text-lg py-3 bg-white dark:bg-black" name="deal_type" onChange={handleDealTypeChange} />
                </div>
                {/* Deal Date Selector */}
                {dealType && (
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
                            />
                            <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                                <IconCalendar className="w-5 h-5 text-gray-400" />
                            </div>
                        </div>
                    </div>
                )}{' '}
                {/* Render form based on deal type */}
                {(dealType === 'new_used_sale' || dealType === 'new_sale' || dealType === 'used_sale' || dealType === 'new_used_sale_tax_inclusive') && renderNewUsedSaleForm()}
                {dealType === 'exchange' && renderExchangeForm()}
                {dealType === 'company_commission' && renderCompanyCommissionForm()}
                {dealType === 'intermediary' && renderIntermediaryForm()}
                {dealType === 'financing_assistance_intermediary' && renderFinancingAssistanceForm()}
                {/* Other deal types placeholder */}
                {dealType &&
                    dealType !== 'new_used_sale' &&
                    dealType !== 'new_sale' &&
                    dealType !== 'used_sale' &&
                    dealType !== 'new_used_sale_tax_inclusive' &&
                    dealType !== 'exchange' &&
                    dealType !== 'company_commission' &&
                    dealType !== 'intermediary' &&
                    dealType !== 'financing_assistance_intermediary' && (
                        <div className="panel">
                            <div className="text-center py-12">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{t(`deal_type_${dealType}`)}</h3>
                                <p className="text-gray-600 dark:text-gray-400">{t('form_coming_soon')}</p>
                            </div>
                        </div>
                    )}
                {/* Submit Button */}
                {dealType && (
                    <div className="flex justify-end gap-4">
                        <button type="button" onClick={() => router.back()} className="btn btn-outline-danger">
                            {t('cancel')}
                        </button>
                        <button type="submit" className="btn btn-primary px-8" disabled={saving || !dealType}>
                            {saving ? t('creating') : t('create_deal')}
                        </button>
                    </div>
                )}
            </form>
            {/* Create Customer Modal */}
            <CreateCustomerModal isOpen={showCreateCustomerModal} onClose={() => setShowCreateCustomerModal(false)} onCustomerCreated={handleCustomerCreated} />
            {/* Create Car Modal */}
            <CreateCarModal isOpen={showCreateCarModal} onClose={() => setShowCreateCarModal(false)} onCarCreated={handleCarCreated} />
        </div>
    );
};

export default AddDeal;
