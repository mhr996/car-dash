'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import supabase from '@/lib/supabase';
import { Alert } from '@/components/elements/alerts/elements-alerts-default';
import { getTranslation } from '@/i18n';
import DealTypeSelect from '@/components/deal-type-select/deal-type-select';
import DealStatusSelect from '@/components/deal-status-select/deal-status-select';
import CustomerSelect from '@/components/customer-select/customer-select';
import CarSelect from '@/components/car-select/car-select';
import BillTypeSelect from '@/components/bill-type-select/bill-type-select';
import BillStatusSelect from '@/components/bill-status-select/bill-status-select';
import PaymentTypeSelect from '@/components/payment-type-select/payment-type-select';
import SingleFileUpload from '@/components/file-upload/single-file-upload';
import { Deal, Customer, Car, FileItem, DealAttachments, DealAttachment } from '@/types';
import { uploadMultipleFiles, deleteFile, uploadFile } from '@/utils/file-upload';
import { formatCurrency } from '@/utils/number-formatter';
import AttachmentsDisplay from '@/components/attachments/attachments-display';
import IconNotes from '@/components/icon/icon-notes';
import IconCar from '@/components/icon/icon-car';
import IconDollarSign from '@/components/icon/icon-dollar-sign';
import IconUser from '@/components/icon/icon-user';
import IconCaretDown from '@/components/icon/icon-caret-down';
import IconPlus from '@/components/icon/icon-plus';
import IconEye from '@/components/icon/icon-eye';
import IconReceipt from '@/components/icon/icon-receipt';
import IconCalendar from '@/components/icon/icon-calendar';
import { handleReceiptCreated, getCustomerIdFromDeal } from '@/utils/balance-manager';

const EditDeal = ({ params }: { params: { id: string } }) => {
    const { t } = getTranslation();
    const router = useRouter();
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(true);
    const [deal, setDeal] = useState<Deal | null>(null);
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [selectedSeller, setSelectedSeller] = useState<Customer | null>(null);
    const [selectedBuyer, setSelectedBuyer] = useState<Customer | null>(null);
    const [selectedCar, setSelectedCar] = useState<Car | null>(null);
    const [carTakenFromClient, setCarTakenFromClient] = useState<Car | null>(null);
    const [dealDate, setDealDate] = useState(new Date().toISOString().split('T')[0]);
    const dealId = params.id;

    // Bill creation state
    const [isBillSectionExpanded, setIsBillSectionExpanded] = useState(false);
    const [creatingBill, setCreatingBill] = useState(false);
    const [billForm, setBillForm] = useState({
        bill_type: '',
        status: 'pending',
        customer_name: '',
        phone: '',
        date: new Date().toISOString().split('T')[0],
        car_details: '',
        sale_price: '',
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

    // Helper function to format currency
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'ILS',
        }).format(amount);
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
    }); // State for file attachments
    const [dealAttachments, setDealAttachments] = useState<DealAttachments>({
        carLicense: null,
        driverLicense: null,
        carTransferDocument: null,
    });
    const [existingAttachments, setExistingAttachments] = useState<DealAttachment[]>([]);
    const [newAttachments, setNewAttachments] = useState<{ [key: string]: FileItem }>({});

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
            // For intermediary deals, use seller/buyer info
            if (deal.deal_type === 'intermediary' && (selectedSeller || selectedBuyer)) {
                const customerInfo = selectedSeller || selectedBuyer;
                setBillForm((prev) => ({
                    ...prev,
                    customer_name: customerInfo?.name || '',
                    phone: customerInfo?.phone || '',
                    car_details: selectedCar ? `${selectedCar.brand} ${selectedCar.title} ${selectedCar.year}` : '',
                    sale_price: deal.amount?.toString() || '',
                    total: (deal.amount / 1.18).toFixed(2), // Price before tax
                    tax_amount: ((deal.amount / 1.18) * 0.18).toFixed(2), // 18% tax
                    total_with_tax: deal.amount?.toString() || '', // Deal amount already includes tax
                }));
            }
            // For other deal types, use regular customer
            else if (selectedCustomer) {
                setBillForm((prev) => ({
                    ...prev,
                    customer_name: selectedCustomer.name || '',
                    phone: selectedCustomer.phone || '',
                    car_details: selectedCar ? `${selectedCar.brand} ${selectedCar.title} ${selectedCar.year}` : '',
                    sale_price: deal.amount?.toString() || '',
                    total: (deal.amount / 1.18).toFixed(2), // Price before tax
                    tax_amount: ((deal.amount / 1.18) * 0.18).toFixed(2), // 18% tax
                    total_with_tax: deal.amount?.toString() || '', // Deal amount already includes tax
                }));
            }
        }
    }, [isBillSectionExpanded, deal, selectedCustomer, selectedSeller, selectedBuyer, selectedCar]);

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
            }));
        }
    }, [dealType, carTakenFromClient, selectedCar]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        // Prevent any input changes if deal is completed
        if (deal?.status === 'completed') {
            setAlert({ message: t('deal_completed_no_edit'), type: 'danger' });
            return;
        }

        const { name, value } = e.target;
        setForm((prev) => {
            const updated = { ...prev, [name]: value };

            // Auto-calculate exchange fields when relevant values change for exchange deals
            if (dealType === 'exchange' && carTakenFromClient && selectedCar) {
                const purchasePrice = carTakenFromClient.buy_price || 0;
                const salePrice = selectedCar.sale_price || 0;
                const difference = salePrice - purchasePrice;

                // Set customer_car_eval_value to the purchase price from customer (buy_price of taken car)
                updated.customer_car_eval_value = purchasePrice.toString();

                // Set additional_customer_amount to the difference (only if positive)
                updated.additional_customer_amount = difference > 0 ? difference.toString() : '0';
            }

            return updated;
        });
    }; // Fetch bills related to this deal
    const fetchBills = async () => {
        setLoadingBills(true);
        try {
            const { data, error } = await supabase
                .from('bills')
                .select(
                    `
                    *,
                    deals!inner (
                        id,
                        title,
                        customers!deals_customer_id_fkey (
                            name,
                            phone
                        )
                    )
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
    const handleDealTypeChange = (type: string) => {
        setDealType(type);
    };
    const handleStatusChange = (status: string) => {
        setForm((prev) => ({ ...prev, status }));
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
                updated.additional_customer_amount = difference > 0 ? difference.toString() : '0';
            }

            return updated;
        });
    };
    const handleCreateNewCustomer = () => {
        // Navigate to create customer page
        // This can be implemented later
        console.log('Create new customer');
    }; // Handle file upload for new attachments
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

        // Prevent form submission if deal is completed
        if (deal?.status === 'completed') {
            setAlert({ message: t('deal_completed_no_edit'), type: 'danger' });
            return;
        }

        if (!validateForm()) return;

        setSaving(true);
        try {
            const dealData = {
                deal_type: dealType,
                title: form.title.trim(),
                description: form.description.trim(),
                amount: form.amount ? parseFloat(form.amount) : 0,
                loss_amount: form.loss_amount ? parseFloat(form.loss_amount) : 0,
                customer_car_eval_value: form.customer_car_eval_value ? parseFloat(form.customer_car_eval_value) : null,
                additional_customer_amount: form.additional_customer_amount ? parseFloat(form.additional_customer_amount) : null,
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
            };

            const { error } = await supabase.from('deals').update(finalDealData).eq('id', dealId);

            if (error) throw error;

            setAlert({ message: t('deal_updated_successfully'), type: 'success' });

            // Redirect to deals list after a short delay
            setTimeout(() => {
                router.push('/deals');
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

    // Bill creation handlers
    const handleBillFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setBillForm((prev) => {
            const updated = { ...prev, [name]: value };

            // Auto-calculate tax when sale_price or commission changes
            if (name === 'sale_price' || name === 'commission') {
                const salePrice = parseFloat(name === 'sale_price' ? value : updated.sale_price) || 0;
                const commission = parseFloat(name === 'commission' ? value : updated.commission) || 0;
                const totalWithTax = salePrice + commission; // This total already includes tax
                const preTaxAmount = totalWithTax / 1.18; // Remove 18% tax to get pre-tax amount
                const taxAmount = preTaxAmount * 0.18; // Calculate 18% tax

                updated.total = preTaxAmount.toFixed(2);
                updated.tax_amount = taxAmount.toFixed(2);
                updated.total_with_tax = totalWithTax.toFixed(2);
            }

            return updated;
        });
    };

    const validateBillForm = () => {
        if (!billForm.bill_type) {
            setAlert({ message: t('bill_type_required'), type: 'danger' });
            return false;
        }
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

            const billData = {
                deal_id: parseInt(dealId),
                ...billForm,
                customer_name: customerName,
                phone: customerPhone,
                sale_price: parseFloat(billForm.sale_price) || deal?.amount || 0,
                commission: parseFloat(billForm.commission) || 0,
                total: parseFloat(billForm.total) || 0,
                tax_amount: parseFloat(billForm.tax_amount) || 0,
                total_with_tax: parseFloat(billForm.total_with_tax) || 0,
                visa_amount: billForm.visa_amount ? parseFloat(billForm.visa_amount) : null,
                visa_installments: billForm.visa_installments ? parseInt(billForm.visa_installments) : null,
                bank_amount: billForm.bank_amount ? parseFloat(billForm.bank_amount) : null,
                transfer_amount: billForm.transfer_amount ? parseFloat(billForm.transfer_amount) : null,
                check_amount: billForm.check_amount ? parseFloat(billForm.check_amount) : null,
                cash_amount: billForm.cash_amount ? parseFloat(billForm.cash_amount) : null,
            };

            const { data: billResult, error } = await supabase.from('bills').insert([billData]).select().single();

            if (error) throw error;
            if (!billResult) throw new Error('Failed to create bill');

            // Update the deal status to 'completed' after bill creation
            const { error: dealUpdateError } = await supabase.from('deals').update({ status: 'completed' }).eq('id', dealId);

            if (dealUpdateError) {
                console.error('Error updating deal status:', dealUpdateError);
                // Don't throw error here to not interrupt the bill creation success
            } else {
                // Update the local deal state
                console.log('Deal status updated to completed successfully');
                setDeal((prev) => (prev ? { ...prev, status: 'completed' } : null));
                setForm((prev) => ({ ...prev, status: 'completed' }));

                // Force a re-render to ensure UI updates
                setTimeout(() => {
                    window.location.reload();
                }, 2000);
            }

            setAlert({ message: t('bill_created_successfully'), type: 'success' });

            // Update customer balance if this bill has payment amounts
            const customerId = getCustomerIdFromDeal(deal);
            if (customerId) {
                const balanceUpdateSuccess = await handleReceiptCreated(billResult.id, customerId, billData, customerName || 'Customer');

                if (!balanceUpdateSuccess) {
                    console.warn('Failed to update customer balance for bill:', billResult.id);
                    // Don't fail the bill creation, just log the warning
                }
            }

            // Refresh bills list
            fetchBills();

            // Reset bill form and collapse section
            setBillForm({
                bill_type: '',
                status: 'pending',
                customer_name: '',
                phone: '',
                date: new Date().toISOString().split('T')[0],
                car_details: '',
                sale_price: '',
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
                <div onClick={() => router.push('/deals')}>
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
            </div>

            {alert && (
                <div className="fixed top-4 right-4 z-50 min-w-80 max-w-md">
                    <Alert type={alert.type} title={alert.type === 'success' ? t('success') : t('error')} message={alert.message} onClose={() => setAlert(null)} />
                </div>
            )}

            <div className="panel">
                <div className="mb-5">
                    <h5 className="text-lg font-semibold dark:text-white-light">{t('deal_information')}</h5>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Deal Type Selector */}
                    <div className="bg-gradient-to-r from-primary/10 to-secondary/10 p-6 rounded-lg border-2 border-primary/20">
                        <label className="block text-lg font-bold text-gray-700 dark:text-white mb-4">
                            {t('deal_type')} <span className="text-red-500">*</span>
                        </label>
                        <DealTypeSelect defaultValue={dealType} className="form-input text-lg py-3" name="deal_type" onChange={deal?.status === 'completed' ? () => {} : handleDealTypeChange} />
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
                    {/* Deal Status Selector - Full Width */}
                    <div className="panel">
                        <div className="mb-5">
                            <h5 className="text-lg font-bold text-gray-900 dark:text-white-light">{t('deal_status')}</h5>
                            <p className="text-gray-600 dark:text-gray-400 mt-2">{t('select_deal_status_desc')}</p>
                        </div>
                        <DealStatusSelect defaultValue={form.status} className="form-input" name="status" onChange={deal?.status === 'completed' ? () => {} : handleStatusChange} />
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
                                {(dealType === 'new_used_sale' || dealType === 'new_used_sale_tax_inclusive') && (
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
                                                <span className="text-sm text-gray-700 dark:text-gray-300">${selectedCar.buy_price?.toFixed(2) || '0.00'}</span>
                                            </div>
                                        </div>

                                        {/* Row 3: Selling Price (Editable) */}
                                        <div className="grid grid-cols-3 gap-4 mb-3 py-2">
                                            <div className="text-sm pt-2 text-gray-700 dark:text-gray-300 text-right">{t('selling_price_manual')}</div>
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
                                                        value={form.selling_price || ''}
                                                        onChange={handleInputChange}
                                                        className="form-input ltr:rounded-l-none rtl:rounded-r-none w-24"
                                                        style={{ direction: 'ltr', textAlign: 'center' }}
                                                        placeholder="0.00"
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
                                                        $
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
                                                        disabled={deal?.status === 'completed'}
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Row 5: Profit Commission (Calculated) */}
                                        <div className="grid grid-cols-3 gap-4 mb-4 py-2">
                                            <div className="text-sm text-gray-700 dark:text-gray-300 text-right">{t('profit_commission')}</div>
                                            <div className="text-center">
                                                {(() => {
                                                    if (!form.amount || !selectedCar) return <span className="text-sm text-gray-700 dark:text-gray-300">$0.00</span>;

                                                    const buyPrice = selectedCar.buy_price || 0;
                                                    const sellPrice = parseFloat(form.selling_price || '0') || 0;
                                                    const loss = parseFloat(form.loss_amount || '0');
                                                    const profitCommission = sellPrice - buyPrice - loss;

                                                    return (
                                                        <span className={`text-sm ${profitCommission >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                                            {profitCommission >= 0 ? '+' : ''}${profitCommission.toFixed(2)}
                                                        </span>
                                                    );
                                                })()}
                                            </div>
                                        </div>
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
                                                <span className="text-sm text-gray-700 dark:text-gray-300">${selectedCar.buy_price?.toFixed(2) || '0.00'}</span>
                                            </div>
                                        </div>

                                        {/* Row 3: Selling Price */}
                                        <div className="grid grid-cols-3 gap-4 mb-3 py-2">
                                            <div className="text-sm text-gray-700 dark:text-gray-300 text-right">{t('selling_price_manual')}</div>
                                            <div className="text-center">
                                                <span className="text-sm text-gray-700 dark:text-gray-300">${selectedCar.sale_price?.toFixed(2) || '0.00'}</span>
                                            </div>
                                        </div>

                                        {/* Row 4: Customer Car Evaluation (Auto-calculated) */}
                                        <div className="grid grid-cols-3 gap-4 mb-3 py-2">
                                            <div className="text-sm text-gray-700 dark:text-gray-300 text-right">
                                                <div className="font-medium">{t('customer_car_evaluation')}</div>
                                            </div>
                                            <div className="text-center">
                                                <span className="text-sm text-gray-700 dark:text-gray-300">${parseFloat(form.customer_car_eval_value || '0').toFixed(2)}</span>
                                            </div>
                                        </div>

                                        {/* Row 5: Additional Amount from Customer (Auto-calculated) */}
                                        <div className="grid grid-cols-3 gap-4 mb-3 py-2">
                                            <div className="text-sm text-gray-700 dark:text-gray-300 text-right">{t('additional_amount_from_customer')}</div>
                                            <div className="text-center">
                                                <span className="text-sm text-gray-700 dark:text-gray-300">${parseFloat(form.additional_customer_amount || '0').toFixed(2)}</span>
                                            </div>
                                        </div>

                                        {/* Row 6: Loss (Editable) */}
                                        <div className="grid grid-cols-3 gap-4 mb-3 py-2">
                                            <div className="text-sm pt-2 text-gray-700 dark:text-gray-300 text-right">{t('loss_amount')}</div>
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
                                                        value={form.loss_amount || ''}
                                                        onChange={handleInputChange}
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
                                                    if (!selectedCar || !carTakenFromClient) return <span className="text-sm text-gray-700 dark:text-gray-300">$0.00</span>;

                                                    const buyPrice = selectedCar.buy_price || 0;
                                                    const sellPrice = selectedCar.sale_price || 0;
                                                    const oldCarPurchasePrice = carTakenFromClient.buy_price || 0;
                                                    const loss = parseFloat(form.loss_amount || '0');

                                                    // For exchange: Profit = Sale Price - Old Car Purchase Price - Buy Price - Loss
                                                    // Note: customer_car_eval_value and additional_customer_amount are display-only and don't affect profit
                                                    const profitCommission = sellPrice - buyPrice - loss;

                                                    return (
                                                        <span className={`text-sm ${profitCommission >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                                            {profitCommission >= 0 ? '+' : ''}${profitCommission.toFixed(2)}
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

                                        {/* Row 2: Profit Commission (Editable) */}
                                        <div className="grid grid-cols-3 gap-4 mb-4 py-2">
                                            <div className="text-sm pt-1 text-gray-700 dark:text-gray-300 text-right">{t('profit_commission')}</div>
                                            <div className="text-center">
                                                <div className="flex justify-center">
                                                    <span className="inline-flex items-center px-2 bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 border ltr:border-r-0 rtl:border-l-0 border-gray-300 dark:border-gray-600 ltr:rounded-l-md rtl:rounded-r-md text-xs">
                                                        $
                                                    </span>
                                                    <input
                                                        type="number"
                                                        name="amount"
                                                        step="0.01"
                                                        min="0"
                                                        value={form.amount}
                                                        onChange={handleInputChange}
                                                        className="form-input ltr:rounded-l-none rtl:rounded-r-none w-24"
                                                        style={{ direction: 'ltr', textAlign: 'center' }}
                                                        placeholder="0.00"
                                                        disabled={deal?.status === 'completed'}
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

                                        {/* Row 2: Commission (Editable) */}
                                        <div className="grid grid-cols-3 gap-4 mb-4 py-2">
                                            <div className="text-sm pt-1 text-gray-700 dark:text-gray-300 text-right">{t('commission_editable')}</div>
                                            <div className="text-center">
                                                <div className="flex justify-center">
                                                    <span className="inline-flex items-center px-2 bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 border ltr:border-r-0 rtl:border-l-0 border-gray-300 dark:border-gray-600 ltr:rounded-l-md rtl:rounded-r-md text-xs">
                                                        $
                                                    </span>
                                                    <input
                                                        type="number"
                                                        name="amount"
                                                        step="0.01"
                                                        min="0"
                                                        value={form.amount}
                                                        onChange={handleInputChange}
                                                        className="form-input ltr:rounded-l-none rtl:rounded-r-none w-24"
                                                        style={{ direction: 'ltr', textAlign: 'center' }}
                                                        placeholder="0.00"
                                                        disabled={deal?.status === 'completed'}
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
                                        <div className="grid grid-cols-3 gap-4 mb-4 py-2">
                                            <div className="text-sm text-gray-700 dark:text-gray-300 text-right">
                                                <div className="font-medium">{t('deal_type_company_commission')}</div>
                                            </div>
                                            <div className="text-center">
                                                <div className="flex justify-center">
                                                    <span className="inline-flex items-center px-2 bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 border ltr:border-r-0 rtl:border-l-0 border-gray-300 dark:border-gray-600 ltr:rounded-l-md rtl:rounded-r-md text-xs">
                                                        $
                                                    </span>
                                                    <input
                                                        type="number"
                                                        name="amount"
                                                        step="0.01"
                                                        min="0"
                                                        value={form.amount}
                                                        onChange={handleInputChange}
                                                        className="form-input ltr:rounded-l-none rtl:rounded-r-none w-24"
                                                        style={{ direction: 'ltr', textAlign: 'center' }}
                                                        placeholder="0.00"
                                                        disabled={deal?.status === 'completed'}
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
                                        onCustomerSelect={deal?.status === 'completed' ? () => {} : handleSellerSelect}
                                        onCreateNew={deal?.status === 'completed' ? () => {} : handleCreateNewCustomer}
                                        className="form-input"
                                    />
                                </div>
                                {/* Buyer Selector for Intermediary Deals */}
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 dark:text-white mb-2">{t('buyer')}</label>
                                    <CustomerSelect
                                        selectedCustomer={selectedBuyer}
                                        onCustomerSelect={deal?.status === 'completed' ? () => {} : handleBuyerSelect}
                                        onCreateNew={deal?.status === 'completed' ? () => {} : handleCreateNewCustomer}
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
                                        onCreateNew={deal?.status === 'completed' ? () => {} : handleCreateNewCustomer}
                                        className="form-input"
                                    />
                                </div>
                                {/* Car Selector */}
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 dark:text-white mb-2">{t('car')}</label>
                                    <CarSelect selectedCar={selectedCar} onCarSelect={deal?.status === 'completed' ? () => {} : handleCarSelect} className="form-input" />
                                </div>
                            </>
                        )}

                        {/* Car Selector for Intermediary Deals (separate row) */}
                        {dealType === 'intermediary' && (
                            <div className="md:col-span-2">
                                <label className="block text-sm font-bold text-gray-700 dark:text-white mb-2">{t('car')}</label>
                                <CarSelect selectedCar={selectedCar} onCarSelect={deal?.status === 'completed' ? () => {} : handleCarSelect} className="form-input" />
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
                    {deal.attachments && deal.attachments.length > 0 && (
                        <div className="panel">
                            <div className="mb-5 flex items-center gap-3">
                                <IconNotes className="w-5 h-5 text-primary" />
                                <h5 className="text-lg font-semibold dark:text-white-light">{t('existing_attachments')}</h5>
                            </div>
                            <AttachmentsDisplay attachments={deal.attachments} compact={false} />
                        </div>
                    )}
                    {/* Add New Attachments */}
                    <div className="panel">
                        <div className="mb-5 flex items-center gap-3">
                            <IconNotes className="w-5 h-5 text-primary" />
                            <h5 className="text-lg font-semibold dark:text-white-light">{t('deal_attachments')}</h5>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <SingleFileUpload
                                file={dealAttachments.carLicense}
                                onFileChange={deal?.status === 'completed' ? () => {} : (file) => setDealAttachments((prev) => ({ ...prev, carLicense: file }))}
                                title={t('car_license')}
                                description={t('car_license_desc')}
                                accept="image/*,.pdf"
                                className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                            />
                            <SingleFileUpload
                                file={dealAttachments.driverLicense}
                                onFileChange={deal?.status === 'completed' ? () => {} : (file) => setDealAttachments((prev) => ({ ...prev, driverLicense: file }))}
                                title={t('driver_license')}
                                description={t('driver_license_desc')}
                                accept="image/*,.pdf"
                                className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                            />
                            <SingleFileUpload
                                file={dealAttachments.carTransferDocument}
                                onFileChange={deal?.status === 'completed' ? () => {} : (file) => setDealAttachments((prev) => ({ ...prev, carTransferDocument: file }))}
                                title={t('car_transfer_document')}
                                description={t('car_transfer_document_desc')}
                                accept="image/*,.pdf"
                                className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                            />
                        </div>
                    </div>
                    {/* Expandable Bill Creation Section */}
                    {deal?.status !== 'completed' && (
                        <div className="panel">
                            <div className="mb-5 border rounded-xl border-gray-200 dark:border-gray-700">
                                <button
                                    type="button"
                                    onClick={() => setIsBillSectionExpanded(!isBillSectionExpanded)}
                                    className="flex items-center gap-3 w-full text-left hover:bg-gray-50 dark:hover:bg-gray-800 p-3 rounded-lg transition-colors duration-200"
                                >
                                    <div className="flex items-center gap-3 flex-1">
                                        <IconDollarSign className="w-5 h-5 text-primary" />
                                        <h5 className="text-lg font-semibold dark:text-white-light">{t('automate_bill_for_deal')}</h5>
                                    </div>{' '}
                                    <IconCaretDown className={`w-5 h-5 text-gray-500 transition-transform duration-200 ${isBillSectionExpanded ? 'rotate-180' : ''}`} />
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
                                    </div>{' '}
                                    {/* Tax Invoice Section */}
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
                                                                            {selectedSeller.country && (
                                                                                <div>
                                                                                    <label className="text-blue-700 dark:text-blue-300 font-medium">{t('seller_country')}</label>
                                                                                    <p className="text-blue-900 dark:text-blue-100 font-semibold">{selectedSeller.country}</p>
                                                                                </div>
                                                                            )}
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
                                                                            {selectedBuyer.country && (
                                                                                <div>
                                                                                    <label className="text-blue-700 dark:text-blue-300 font-medium">{t('buyer_country')}</label>
                                                                                    <p className="text-blue-900 dark:text-blue-100 font-semibold">{selectedBuyer.country}</p>
                                                                                </div>
                                                                            )}
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
                                                                        {selectedCustomer.country && (
                                                                            <div>
                                                                                <label className="text-blue-700 dark:text-blue-300 font-medium">{t('country')}</label>
                                                                                <p className="text-blue-900 dark:text-blue-100 font-semibold">{selectedCustomer.country}</p>
                                                                            </div>
                                                                        )}
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
                                                            {deal?.deal_type === 'new_used_sale' && (
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
                                                                            <span className="text-sm text-gray-700 dark:text-gray-300">{formatCurrency(parseFloat(form.selling_price || '0'))}</span>
                                                                        </div>
                                                                        <div className="text-center">
                                                                            <span className="text-sm text-gray-700 dark:text-gray-300">1</span>
                                                                        </div>
                                                                        <div className="text-center">
                                                                            <span className="text-sm text-gray-700 dark:text-gray-300">{formatCurrency(parseFloat(form.selling_price || '0'))}</span>
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
                                                                            <span className="text-sm text-gray-700 dark:text-gray-300">{formatCurrency(parseFloat(form.selling_price || '0'))}</span>
                                                                        </div>
                                                                        <div className="text-center">
                                                                            <span className="text-sm text-gray-700 dark:text-gray-300">1</span>
                                                                        </div>
                                                                        <div className="text-center">
                                                                            <span className="text-sm text-gray-700 dark:text-gray-300">{formatCurrency(parseFloat(form.selling_price || '0'))}</span>
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
                                                                                    const sellPrice = parseFloat(form.amount || '0');
                                                                                    const loss = parseFloat(form.loss_amount || '0');
                                                                                    const profit = sellPrice - buyPrice - loss;
                                                                                    return profit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';
                                                                                })()}`}
                                                                            >
                                                                                ${' '}
                                                                                {(() => {
                                                                                    const buyPrice = selectedCar.buy_price || 0;
                                                                                    const sellPrice = parseFloat(form.amount || '0');
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
                                                                            {deal?.title || 'Deal'} - {deal?.deal_type || 'Unknown type'}
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
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                <div className="md:col-span-2 lg:col-span-3">
                                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('payment_type')}</label>
                                                    <PaymentTypeSelect
                                                        defaultValue={billForm.payment_type}
                                                        onChange={(paymentType) => handleBillFormChange({ target: { name: 'payment_type', value: paymentType } } as any)}
                                                        className="w-full"
                                                    />
                                                </div>
                                                {/* Payment Type Specific Fields */}
                                                {billForm.payment_type === 'visa' && (
                                                    <>
                                                        <div>
                                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('visa_amount')}</label>
                                                            <input
                                                                name="visa_amount"
                                                                type="number"
                                                                step="0.01"
                                                                value={billForm.visa_amount}
                                                                onChange={handleBillFormChange}
                                                                className="form-input"
                                                                placeholder={t('visa_amount')}
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('visa_installments')}</label>
                                                            <input
                                                                name="visa_installments"
                                                                type="number"
                                                                value={billForm.visa_installments}
                                                                onChange={handleBillFormChange}
                                                                className="form-input"
                                                                placeholder={t('visa_installments')}
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('visa_card_type')}</label>
                                                            <input
                                                                name="visa_card_type"
                                                                value={billForm.visa_card_type}
                                                                onChange={handleBillFormChange}
                                                                className="form-input"
                                                                placeholder={t('visa_card_type')}
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('visa_last_four')}</label>
                                                            <input
                                                                name="visa_last_four"
                                                                value={billForm.visa_last_four}
                                                                onChange={handleBillFormChange}
                                                                className="form-input"
                                                                placeholder={t('visa_last_four')}
                                                            />
                                                        </div>
                                                    </>
                                                )}
                                                {billForm.payment_type === 'bank_transfer' && (
                                                    <>
                                                        <div>
                                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('bank_amount')}</label>
                                                            <input
                                                                name="bank_amount"
                                                                type="number"
                                                                step="0.01"
                                                                value={billForm.bank_amount}
                                                                onChange={handleBillFormChange}
                                                                className="form-input"
                                                                placeholder={t('bank_amount')}
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('bank_name')}</label>
                                                            <input name="bank_name" value={billForm.bank_name} onChange={handleBillFormChange} className="form-input" placeholder={t('bank_name')} />
                                                        </div>
                                                        <div>
                                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('bank_branch')}</label>
                                                            <input
                                                                name="bank_branch"
                                                                value={billForm.bank_branch}
                                                                onChange={handleBillFormChange}
                                                                className="form-input"
                                                                placeholder={t('bank_branch')}
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('account_number')}</label>
                                                            <input
                                                                name="account_number"
                                                                value={billForm.account_number}
                                                                onChange={handleBillFormChange}
                                                                className="form-input"
                                                                placeholder={t('account_number')}
                                                            />
                                                        </div>
                                                    </>
                                                )}
                                                {billForm.payment_type === 'transfer' && (
                                                    <>
                                                        <div>
                                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('transfer_number')}</label>
                                                            <input
                                                                name="transfer_number"
                                                                value={billForm.transfer_number}
                                                                onChange={handleBillFormChange}
                                                                className="form-input"
                                                                placeholder={t('transfer_number')}
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('transfer_holder_name')}</label>{' '}
                                                            <input
                                                                name="transfer_holder_name"
                                                                type="text"
                                                                value={billForm.transfer_holder_name}
                                                                onChange={handleBillFormChange}
                                                                className="form-input"
                                                                placeholder={t('transfer_holder_name')}
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('transfer_amount')}</label>
                                                            <input
                                                                name="transfer_amount"
                                                                type="number"
                                                                step="0.01"
                                                                value={billForm.transfer_amount}
                                                                onChange={handleBillFormChange}
                                                                className="form-input"
                                                                placeholder={t('transfer_amount')}
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('transfer_bank_name')}</label>
                                                            <input
                                                                name="transfer_bank_name"
                                                                value={billForm.transfer_bank_name}
                                                                onChange={handleBillFormChange}
                                                                className="form-input"
                                                                placeholder={t('transfer_bank_name')}
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('transfer_branch')}</label>
                                                            <input
                                                                name="transfer_branch"
                                                                value={billForm.transfer_branch}
                                                                onChange={handleBillFormChange}
                                                                className="form-input"
                                                                placeholder={t('transfer_branch')}
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('transfer_account_number')}</label>
                                                            <input
                                                                name="transfer_account_number"
                                                                value={billForm.transfer_account_number}
                                                                onChange={handleBillFormChange}
                                                                className="form-input"
                                                                placeholder={t('transfer_account_number')}
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('transfer_branch_number')}</label>
                                                            <input
                                                                name="transfer_branch_number"
                                                                value={billForm.transfer_branch_number}
                                                                onChange={handleBillFormChange}
                                                                className="form-input"
                                                                placeholder={t('transfer_branch_number')}
                                                            />
                                                        </div>
                                                    </>
                                                )}
                                                {billForm.payment_type === 'check' && (
                                                    <>
                                                        <div>
                                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('check_amount')}</label>
                                                            <input
                                                                name="check_amount"
                                                                type="number"
                                                                step="0.01"
                                                                value={billForm.check_amount}
                                                                onChange={handleBillFormChange}
                                                                className="form-input"
                                                                placeholder={t('check_amount')}
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('check_bank_name')}</label>
                                                            <input
                                                                name="check_bank_name"
                                                                value={billForm.check_bank_name}
                                                                onChange={handleBillFormChange}
                                                                className="form-input"
                                                                placeholder={t('check_bank_name')}
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('check_branch_number')}</label>
                                                            <input
                                                                name="check_branch_number"
                                                                value={billForm.check_branch_number}
                                                                onChange={handleBillFormChange}
                                                                className="form-input"
                                                                placeholder={t('check_branch_number')}
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('check_account_number')}</label>
                                                            <input
                                                                name="check_account_number"
                                                                value={billForm.check_account_number}
                                                                onChange={handleBillFormChange}
                                                                className="form-input"
                                                                placeholder={t('check_account_number')}
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('check_number')}</label>
                                                            <input
                                                                name="check_number"
                                                                value={billForm.check_number}
                                                                onChange={handleBillFormChange}
                                                                className="form-input"
                                                                placeholder={t('check_number')}
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('check_holder_name')}</label>
                                                            <input
                                                                name="check_holder_name"
                                                                value={billForm.check_holder_name}
                                                                onChange={handleBillFormChange}
                                                                className="form-input"
                                                                placeholder={t('check_holder_name')}
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('check_branch')}</label>
                                                            <input
                                                                name="check_branch"
                                                                value={billForm.check_branch}
                                                                onChange={handleBillFormChange}
                                                                className="form-input"
                                                                placeholder={t('check_branch')}
                                                            />
                                                        </div>
                                                    </>
                                                )}
                                                {billForm.payment_type === 'cash' && (
                                                    <>
                                                        <div>
                                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('cash_amount')}</label>
                                                            <input
                                                                name="cash_amount"
                                                                type="number"
                                                                step="0.01"
                                                                value={billForm.cash_amount}
                                                                onChange={handleBillFormChange}
                                                                className="form-input"
                                                                placeholder={t('cash_amount')}
                                                            />
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                    {/* Status Selection */}
                                    {billForm.bill_type && (
                                        <div>
                                            <div className="mb-4 flex items-center gap-3">
                                                <IconDollarSign className="w-5 h-5 text-primary" />
                                                <h6 className="text-md font-semibold dark:text-white-light">{t('bill_status')}</h6>
                                            </div>
                                            <BillStatusSelect
                                                defaultValue={billForm.status}
                                                onChange={(status) => handleBillFormChange({ target: { name: 'status', value: status } } as any)}
                                                className="w-full"
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
                    )}
                    {/* Connected Bills Section */}
                    <div className="panel">
                        <div className="mb-5 flex items-center gap-3">
                            <IconReceipt className="w-5 h-5 text-primary" />
                            <h5 className="text-lg font-semibold dark:text-white-light">{t('connected_bills')}</h5>
                        </div>

                        {loadingBills ? (
                            <div className="flex justify-center items-center py-8">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                            </div>
                        ) : bills.length === 0 ? (
                            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                                <IconReceipt className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                <p>{t('no_bills_connected')}</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="table-auto w-full">
                                    <thead>
                                        <tr className="bg-gray-50 dark:bg-gray-800">
                                            <th className="px-4 py-3  text-sm font-medium text-gray-700 dark:text-gray-300">{t('bill_type')}</th>
                                            <th className="px-4 py-3  text-sm font-medium text-gray-700 dark:text-gray-300">{t('customer_name')}</th>
                                            <th className="px-4 py-3  text-sm font-medium text-gray-700 dark:text-gray-300">{t('amount')}</th>
                                            <th className="px-4 py-3  text-sm font-medium text-gray-700 dark:text-gray-300">{t('status')}</th>
                                            <th className="px-4 py-3  text-sm font-medium text-gray-700 dark:text-gray-300">{t('created_date')}</th>
                                            <th className="px-4 py-3 text-center text-sm font-medium text-gray-700 dark:text-gray-300">{t('actions')}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                        {bills.map((bill) => (
                                            <tr key={bill.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                                                <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                                                        {t(`bill_type_${bill.bill_type}`)}
                                                    </span>
                                                </td>{' '}
                                                <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{bill.deals?.customers?.name || bill.customer_name || t('unknown_customer')}</td>
                                                <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">${bill.total_with_tax || bill.total || '0.00'}</td>
                                                <td className="px-4 py-3 text-sm">
                                                    <span
                                                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                                            bill.status === 'paid'
                                                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                                                                : bill.status === 'pending'
                                                                  ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
                                                                  : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                                                        }`}
                                                    >
                                                        {t(`bill_status_${bill.status}`)}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{new Date(bill.created_at).toLocaleDateString()}</td>{' '}
                                                <td className="px-4 py-3 text-center">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleViewBill(bill)}
                                                        className="inline-flex items-center gap-1 px-3 py-1 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors duration-200 text-xs"
                                                    >
                                                        <IconEye className="w-3 h-3" />
                                                        {t('view')}
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                    {/* Submit Button */}
                    <div className="flex justify-end gap-4 mt-8">
                        <button type="button" onClick={() => router.push('/deals')} className="btn btn-outline-danger">
                            {t('cancel')}
                        </button>
                        {deal?.status !== 'completed' ? (
                            <button type="submit" className="btn btn-primary" disabled={saving}>
                                {saving ? t('updating') : t('update_deal')}
                            </button>
                        ) : (
                            <div className="text-sm text-gray-500 dark:text-gray-400 py-2">{t('deal_completed_no_edit')}</div>
                        )}
                    </div>
                </form>
            </div>

            {/* Bill View Modal */}
            {showBillModal && selectedBill && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                {t('view_bill')} - {t(`bill_type_${selectedBill.bill_type}`)}
                            </h3>
                            <button onClick={closeBillModal} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Bill Header Info */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
                                <div>
                                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-400">{t('bill_number')}</label>
                                    <p className="text-lg font-semibold text-gray-900 dark:text-white">#{selectedBill.id}</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-400">{t('status')}</label>
                                    <span
                                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                            selectedBill.status === 'paid'
                                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                                                : selectedBill.status === 'pending'
                                                  ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
                                                  : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                                        }`}
                                    >
                                        {t(`bill_status_${selectedBill.status}`)}
                                    </span>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-400">{t('created_date')}</label>
                                    <p className="text-lg font-semibold text-gray-900 dark:text-white">{new Date(selectedBill.created_at).toLocaleDateString()}</p>
                                </div>
                            </div>

                            {/* Customer Information */}
                            <div>
                                <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-3">{t('customer_information')}</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                                    {' '}
                                    <div>
                                        <label className="block text-sm font-medium text-blue-600 dark:text-blue-400">{t('customer_name')}</label>
                                        <p className="text-blue-900 dark:text-blue-100 font-semibold">{selectedBill.deals?.customers?.name || selectedBill.customer_name || t('unknown_customer')}</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-blue-600 dark:text-blue-400">{t('phone')}</label>
                                        <p className="text-blue-900 dark:text-blue-100 font-semibold">{selectedBill.deals?.customers?.phone || selectedBill.phone || '-'}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Bill Summary */}
                            <div>
                                <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-3">{t('bill_summary')}</h4>
                                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('price_before_tax')}</span>
                                            <span className="text-sm text-gray-700 dark:text-gray-300">${selectedBill.total || '0.00'}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('tax_amount')}</span>
                                            <span className="text-sm text-gray-700 dark:text-gray-300">${selectedBill.tax_amount || '0.00'}</span>
                                        </div>
                                        <div className="border-t border-gray-300 dark:border-gray-600 pt-3">
                                            <div className="flex justify-between items-center">
                                                <span className="text-lg font-bold text-gray-900 dark:text-white">{t('total_amount')}</span>
                                                <span className="text-lg font-bold text-primary">${selectedBill.total_with_tax || selectedBill.total || '0.00'}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Bill Notes */}
                            {selectedBill.free_text && (
                                <div>
                                    <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-3">{t('bill_notes')}</h4>
                                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                                        <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{selectedBill.free_text}</p>
                                    </div>
                                </div>
                            )}

                            {/* Payment Information */}
                            {selectedBill.payment_type && (
                                <div>
                                    <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-3">{t('payment_information')}</h4>
                                    <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                                        <p className="text-green-800 dark:text-green-200 font-medium">
                                            {t('payment_type')}: {t(`payment_type_${selectedBill.payment_type}`)}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
                            <button onClick={closeBillModal} className="btn btn-outline-secondary">
                                {t('close')}
                            </button>
                            <Link href={`/bills/edit/${selectedBill.id}`} className="btn btn-primary">
                                {t('edit_bill')}
                            </Link>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EditDeal;
