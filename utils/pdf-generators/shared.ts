import { PDFTranslations, TranslationMap } from './types';

export const translations: PDFTranslations = {
    ar: {
        documentInfo: 'معلومات المستند',
        customerDetails: 'تفاصيل العميل',
        dealDetails: 'تفاصيل الصفقة',
        paymentDetails: 'تفاصيل الدفع',
        financialSummary: 'ملخص مالي',
        paymentDate: 'تاريخ الدفع',
        invoiceDetails: 'تفاصيل الفاتورة',
        receiptDetails: 'تفاصيل الإيصال',
        id: 'رقم',
        date: 'التاريخ',
        status: 'الحالة',
        customerName: 'اسم العميل',
        customerId: 'رقم الهوية',
        phone: 'رقم الهاتف',
        dealTitle: 'عنوان الصفقة',
        dealType: 'نوع الصفقة',
        vehicle: 'المركبة',
        amount: 'المبلغ',
        subTotal: 'السعر قبل الضريبة',
        tax: 'الضريبة 18%',
        totalAmount: 'الاجمالي شامل الضريبة',
        paymentMethod: 'طريقة الدفع',
        paidAmount: 'المبلغ المدفوع',
        remainingAmount: 'المبلغ المتبقي',
        paymentDueDate: 'تاريخ استحقاق الدفع',
        generatedBy: 'تم إنشاؤها بواسطة',
        signatureLine: 'التوقيع: _________________',
        dateLabel: 'التاريخ',
        notAvailable: 'غير متوفر',
        status_paid: 'مدفوع',
        status_pending: 'قيد الانتظار',
        status_cancelled: 'ملغي',
        payment_cash: 'نقداً',
        payment_bank_transfer: 'تحويل بنكي',
        payment_check: 'شيك',
        payment_visa: 'فيزا',
        payment_other: 'أخرى',
        carDetails: 'تفاصيل السيارة',
        buyPrice: 'سعر الشراء',
        salePrice: 'سعر البيع',
        commission: 'العمولة',
        loss: 'خسارة',
        preTaxTotal: 'المجموع قبل الضريبة',
        taxAmount: 'مبلغ الضريبة',
        totalWithTax: 'المجموع مع الضريبة',
        additionalDetails: 'تفاصيل إضافية',
        cardType: 'نوع البطاقة',
        lastFourDigits: 'الأرقام الأربعة الأخيرة',
        approvalCode: 'رمز الموافقة',
        installments: 'الأقساط',
        bankName: 'اسم البنك',
        branchName: 'اسم الفرع',
        accountNumber: 'رقم الحساب',
        transferNumber: 'رقم التحويل',
        accountHolder: 'صاحب الحساب',
        checkNumber: 'رقم الشيك',
        cashPayment: 'دفع نقدي',
        bill_type: 'نوع الفاتورة',
        label: 'البيان',
        value: 'القيمة',
        taxInvoice: 'فاتورة ضريبية',
        taxReceipt: 'إيصال ضريبي',
        taxInvoiceWithReceipt: 'فاتورة ضريبية مع إيصال',
        creditNote: 'إشعار دائن',
        refundReceipt: 'إيصال استرداد',
        general: 'فاتورة عامة',
        recipientSignature: 'توقيع المستلم',
        issuerSignature: 'توقيع المصدر',
        thankYouMessage: 'شكراً لتعاملكم معنا',
    },
    he: {
        documentInfo: 'פרטי המסמך',
        customerDetails: 'פרטי הלקוח',
        dealDetails: 'פרטי העסקה',
        paymentDetails: 'פרטי התשלום',
        financialSummary: 'סיכום פיננסי',
        paymentDate: 'תאריך תשלום',
        invoiceDetails: 'פרטי חשבונית',
        receiptDetails: 'פרטי קבלה',
        id: 'מספר',
        date: 'תאריך',
        status: 'סטטוס',
        customerName: 'שם הלקוח',
        customerId: 'ת.ז',
        phone: 'טלפון',
        dealTitle: 'כותרת העסקה',
        dealType: 'סוג העסקה',
        vehicle: 'רכב',
        amount: 'סכום',
        subTotal: 'סה"כ לפני מע"מ',
        tax: 'מע"מ',
        totalAmount: 'סה"כ כולל מע"מ',
        paymentMethod: 'אמצעי תשלום',
        paidAmount: 'שולם',
        remainingAmount: 'יתרה לתשלום',
        paymentDueDate: 'תאריך פירעון',
        generatedBy: 'הופק ע"י',
        signatureLine: 'חתימה: _________________',
        dateLabel: 'תאריך',
        notAvailable: 'לא זמין',
        status_paid: 'שולם',
        status_pending: 'ממתין',
        status_cancelled: 'מבוטל',
        payment_cash: 'מזומן',
        payment_bank_transfer: 'העברה בנקאית',
        payment_check: "צ'ק",
        payment_visa: 'ויזה',
        payment_other: 'אחר',
        carDetails: 'פרטי הרכב',
        buyPrice: 'מחיר קנייה',
        salePrice: 'מחיר מכירה',
        commission: 'עמלה',
        loss: 'הפסד',
        preTaxTotal: 'סה"כ לפני מע"מ',
        taxAmount: 'סכום מע"מ',
        totalWithTax: 'סה"כ כולל מע"מ',
        additionalDetails: 'פרטים נוספים',
        cardType: 'סוג כרטיס',
        lastFourDigits: 'ארבע ספרות אחרונות',
        approvalCode: 'קוד אישור',
        installments: 'תשלומים',
        bankName: 'שם בנק',
        branchName: 'שם סניף',
        accountNumber: 'מספר חשבון',
        transferNumber: 'מספר העברה',
        accountHolder: 'בעל החשבון',
        checkNumber: 'מספר שיק',
        cashPayment: 'תשלום במזומן',
        bill_type: 'סוג חשבונית',
        label: 'פריט',
        value: 'ערך',
        taxInvoice: 'חשבונית מס',
        taxReceipt: 'קבלה',
        taxInvoiceWithReceipt: 'חשבונית מס עם קבלה',
        creditNote: 'הודעת זיכוי',
        refundReceipt: 'קבלה החזר',
        general: 'חשבונית כללית',
        recipientSignature: 'חתימת מקבל',
        issuerSignature: 'חתימת מוציא',
        thankYouMessage: 'תודה על העסקה',
    },
    en: {
        documentInfo: 'Document Information',
        customerDetails: 'Customer Details',
        dealDetails: 'Deal Details',
        paymentDetails: 'Payment Details',
        financialSummary: 'Financial Summary',
        paymentDate: 'Payment Date',
        invoiceDetails: 'Invoice Details',
        receiptDetails: 'Receipt Details',
        id: 'ID',
        date: 'Date',
        status: 'Status',
        customerName: 'Customer Name',
        customerId: 'ID Number',
        phone: 'Phone',
        dealTitle: 'Deal Title',
        dealType: 'Deal Type',
        vehicle: 'Vehicle',
        amount: 'Amount',
        subTotal: 'Subtotal',
        tax: 'Tax',
        totalAmount: 'Total Amount',
        paymentMethod: 'Payment Method',
        paidAmount: 'Paid Amount',
        remainingAmount: 'Remaining Amount',
        paymentDueDate: 'Payment Due Date',
        generatedBy: 'Generated by',
        signatureLine: 'Signature: _________________',
        dateLabel: 'Date',
        notAvailable: 'N/A',
        status_paid: 'Paid',
        status_pending: 'Pending',
        status_cancelled: 'Cancelled',
        payment_cash: 'Cash',
        payment_bank_transfer: 'Bank Transfer',
        payment_check: 'Check',
        payment_visa: 'Visa',
        payment_other: 'Other',
        carDetails: 'Car Details',
        buyPrice: 'Buy Price',
        salePrice: 'Sale Price',
        commission: 'Commission',
        loss: 'Loss',
        preTaxTotal: 'Total Pre-Tax',
        taxAmount: 'Tax Amount',
        totalWithTax: 'Total with Tax',
        additionalDetails: 'Additional Details',
        cardType: 'Card Type',
        lastFourDigits: 'Last Four Digits',
        approvalCode: 'Approval Code',
        installments: 'Installments',
        bankName: 'Bank Name',
        branchName: 'Branch Name',
        accountNumber: 'Account Number',
        transferNumber: 'Transfer Number',
        accountHolder: 'Account Holder',
        checkNumber: 'Check Number',
        cashPayment: 'Cash Payment',
        bill_type: 'Bill Type',
        label: 'Label',
        value: 'Value',
        taxInvoice: 'Tax Invoice',
        taxReceipt: 'Tax Receipt',
        taxInvoiceWithReceipt: 'Tax Invoice with Receipt',
        creditNote: 'Credit Note',
        refundReceipt: 'Refund Receipt',
        general: 'General Bill',
        recipientSignature: 'Recipient Signature',
        issuerSignature: 'Issuer Signature',
        thankYouMessage: 'Thank you for your business',
    },
};

export const getTranslationFunction = (language: 'en' | 'he' | 'ar' = 'he') => {
    return (key: string) => translations[language]?.[key] || translations.en[key];
};

export const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('he-IL', {
        style: 'currency',
        currency: 'ILS',
        minimumFractionDigits: 2,
    }).format(amount);
};

export const formatDate = (dateString: string, language: 'en' | 'he' | 'ar' = 'he'): string => {
    const date = new Date(dateString);
    const locale = language === 'ar' ? 'ar-SA' : language === 'he' ? 'he-IL' : 'en-US';

    return date.toLocaleDateString(locale, {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    });
};

export const createTempContainer = (id: string): HTMLDivElement => {
    const tempContainer = document.createElement('div');
    tempContainer.id = id;
    tempContainer.style.position = 'absolute';
    tempContainer.style.left = '-9999px';
    tempContainer.style.top = '-9999px';
    tempContainer.style.width = '800px';
    tempContainer.style.backgroundColor = '#ffffff';
    tempContainer.style.padding = '0';
    tempContainer.style.fontFamily = 'Inter, system-ui, -apple-system, sans-serif';
    tempContainer.style.fontSize = '14px';
    tempContainer.style.lineHeight = '1.6';
    tempContainer.style.color = '#1f2937';

    return tempContainer;
};

export const getCompanyInfo = async () => {
    try {
        // Import the existing supabase client
        const supabase = (await import('../../lib/supabase.js')).default;

        const { data, error } = await supabase.from('company_settings').select('name, logo_url, address, phone, tax_number, email').single();

        if (error || !data) {
            console.warn('Failed to fetch company settings from database:', error?.message);
            // Return empty values instead of fallbacks
            return {
                name: '',
                address: '',
                phone: '',
                email: '',
                logo: '',
                taxNumber: '',
            };
        }

        return {
            name: data.name || '',
            address: data.address || '',
            phone: data.phone || '',
            email: data.email || '',
            logo: data.logo_url || '',
            taxNumber: data.tax_number || '',
        };
    } catch (error) {
        console.error('Error fetching company info:', error);
        // Return empty values instead of fallbacks
        return {
            name: '',
            address: '',
            phone: '',
            email: '',
            logo: '',
            taxNumber: '',
        };
    }
};

export const getBaseHTML = async (lang: string = 'ar') => {
    const companyInfo = await getCompanyInfo();

    return `
    <!DOCTYPE html>
    <html dir="${lang === 'ar' ? 'rtl' : 'ltr'}" lang="${lang}">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>PDF Document</title>
        <style>
            ${getCommonStyles()}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="header-content">
                    <div class="company-section">
                        ${companyInfo.logo ? `<img src="${companyInfo.logo}" alt="Company Logo" class="company-logo" style="object-fit: cover; width: 150px; height: auto;" />` : ''}
                        ${
                            companyInfo.name || companyInfo.address || companyInfo.phone || companyInfo.email || companyInfo.taxNumber
                                ? `
                        <div class="company-info">
                            ${companyInfo.name ? `<div class="company-name">${companyInfo.name}</div>` : ''}
                            <div class="company-details">
                                ${companyInfo.address ? `<div>${companyInfo.address}</div>` : ''}
                                ${companyInfo.phone || companyInfo.email ? `<div>${companyInfo.phone ? `טלפון: ${companyInfo.phone}` : ''}${companyInfo.phone && companyInfo.email ? ' | ' : ''}${companyInfo.email || ''}</div>` : ''}
                                ${companyInfo.taxNumber ? `<div>ח.פ: ${companyInfo.taxNumber}</div>` : ''}
                            </div>
                        </div>`
                                : ''
                        }
                    </div>
                    <div class="document-info-header">
                        
                    </div>
                </div>
            </div>
            <div class="content">
                {{CONTENT}}
            </div>
            <div class="footer">
                <div class="thank-you">${lang === 'ar' ? 'شكراً لتعاملكم معنا' : lang === 'he' ? 'תודה על העסקה' : 'Thank you for your business'}</div>
                ${companyInfo.name ? `<div>${companyInfo.name} © 2024</div>` : ''}
            </div>
        </div>
    </body>
    </html>
`;
};

export const generateDocumentInfoSection = (t: (key: string) => string, data: any) => `
    <div class="document-info">
        <div class="info-section">
            <h3>${t('documentInfo')}</h3>
            <div class="info-content">
                <div class="info-item">
                    <span class="info-label">${t('id')}:</span>
                    <span class="info-value">${data.id || t('notAvailable')}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">${t('date')}:</span>
                    <span class="info-value">${formatDate(data.created_at || new Date().toISOString())}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">${t('bill_type')}:</span>
                    <span class="info-value">${data.bill_type === 'tax_invoice' ? t('taxInvoice') : data.bill_type === 'receipt_only' ? t('taxReceipt') : data.bill_type === 'tax_invoice_receipt' ? t('taxInvoiceWithReceipt') : data.bill_type === 'credit_note' ? t('creditNote') : data.bill_type === 'refund_receipt' ? t('refundReceipt') : t('general')}</span>
                </div>
            </div>
        </div>
        <div class="info-section">
            <h3>${t('customerDetails')}</h3>
            <div class="info-content">
                <div class="info-item">
                    <span class="info-label">${t('customerName')}:</span>
                    <span class="info-value">${data.customer_name || data.deal?.customer?.name || t('notAvailable')}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">${t('customerId')}:</span>
                    <span class="info-value">${data.customer_id || data.deal?.customer?.id_number || t('notAvailable')}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">${t('phone')}:</span>
                    <span class="info-value">${data.customer_phone || data.deal?.customer?.phone || t('notAvailable')}</span>
                </div>
            </div>
        </div>
    </div>

    <h3 style="font-size: 18px; font-weight: bold; color: #1a2941; text-align: center;">
        ${data.bill_type === 'tax_invoice' ? t('taxInvoice') : data.bill_type === 'receipt_only' ? t('taxReceipt') : data.bill_type === 'tax_invoice_receipt' ? t('taxInvoiceWithReceipt') : data.bill_type === 'credit_note' ? t('creditNote') : data.bill_type === 'refund_receipt' ? t('refundReceipt') : t('general')}
    </h3>
`;

export const generateSignatureSection = (t: (key: string) => string) => `
    <div class="signature-section">
        <div class="signature-row">
            <div class="signature-item">
                <div class="signature-label">${t('recipientSignature')}</div>
                <div class="signature-line"></div>
                <div>Recipient Signature</div>
            </div>
            <div class="signature-item">
                <div class="signature-label">${t('issuerSignature')}</div>
                <div class="signature-line"></div>
                <div>Issuer Signature</div>
            </div>
        </div>
    </div>
`;

export const generatePaymentDetailsSection = (t: (key: string) => string, billData: any) => {
    const paymentMethods = [];

    if (billData.visa_amount && billData.visa_amount > 0) {
        paymentMethods.push({
            method: 'فيزا - Visa',
            amount: billData.visa_amount,
            details: billData.visa_approval_code ? `كود الموافقة: ${billData.visa_approval_code}` : '',
        });
    }

    if (billData.bank_amount && billData.bank_amount > 0) {
        paymentMethods.push({
            method: 'تحويل بنكي - Bank Transfer',
            amount: billData.bank_amount,
            details: [
                billData.bank_name && `البنك: ${billData.bank_name}`,
                billData.bank_branch && `الفرع: ${billData.bank_branch}`,
                billData.account_number && `رقم الحساب: ${billData.account_number}`,
                billData.transfer_number && `رقم الحوالة: ${billData.transfer_number}`,
            ]
                .filter(Boolean)
                .join(' - '),
        });
    }

    if (billData.cash_amount && billData.cash_amount > 0) {
        paymentMethods.push({
            method: 'نقداً - Cash',
            amount: billData.cash_amount,
            details: '',
        });
    }

    if (billData.check_amount && billData.check_amount > 0) {
        paymentMethods.push({
            method: 'شيك - Check',
            amount: billData.check_amount,
            details: [
                billData.check_number && `رقم الشيك: ${billData.check_number}`,
                billData.check_bank && `البنك: ${billData.check_bank}`,
                billData.check_date && `التاريخ: ${formatDate(billData.check_date)}`,
            ]
                .filter(Boolean)
                .join(' - '),
        });
    }

    if (paymentMethods.length === 0) {
        return '';
    }

    return `
        <div class="financial-summary">
            <h3>تفاصيل الدفع - Payment Details</h3>
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>طريقة الدفع</th>
                            <th>المبلغ</th>
                            <th>التفاصيل</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${paymentMethods
                            .map(
                                (payment) => `
                            <tr>
                                <td>${payment.method}</td>
                                <td>${formatCurrency(payment.amount)}</td>
                                <td>${payment.details || '-'}</td>
                            </tr>
                        `,
                            )
                            .join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
};

export const getCommonStyles = () => {
    return `
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: Arial, sans-serif;
            font-size: 14px;
            line-height: 1.6;
            color: #333;
            background: white;
        }
        
        .container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            padding: 48px;
        }
        
        .header {
            margin-bottom: 30px;
            border-bottom: 2px solid #1a2941;
            padding-bottom: 20px;
        }
        
        .header-content {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 20px;
        }
        
        .company-section {
            display: flex;
            align-items: center;
            gap: 15px;
            flex: 1;
        }
        
        .company-logo {
            width: 80px;
            height: 80px;
            object-fit: contain;
            border-radius: 8px;
        }
        
        .company-info {
            flex: 1;
        }
        
        .company-name {
            font-size: 24px;
            font-weight: bold;
            color: #1a2941;
            margin-bottom: 8px;
            line-height: 1.2;
        }
        
        .company-details {
            font-size: 12px;
            color: #666;
            line-height: 1.4;
        }
        
        .company-details div {
            margin-bottom: 3px;
        }
        
        .document-info-header {
            text-align: right;
            min-width: 200px;
        }
        
        .document-title {
            font-size: 20px;
            font-weight: bold;
            color: #1a2941;
            margin-bottom: 10px;
            padding: 10px 15px;
            background-color: #f8f9fa;
            border-radius: 8px;
            border: 1px solid #e5e7eb;
        }
        
        .content {
            margin: 20px 0;
        }
        
        .document-info {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 30px;
            margin-bottom: 30px;
        }
        
        .info-section {
            border: 1px solid #e5e7eb;
            border-radius: 10px;
            overflow: hidden;
        }
        
        .info-section h3 {
            background-color: #1a2941;
            color: white;
            padding: 10px 15px;
            margin: 0;
            font-size: 14px;
            font-weight: bold;
            text-align: center;
            vertical-align: middle;
        }
        
        .info-content {
            padding: 15px;
        }
        
        .info-item {
            display: flex;
            justify-content: space-between;
            margin: 8px 0;
            padding: 4px 0;
            border-bottom: 1px solid #f3f4f6;
        }
        
        .info-item:last-child {
            border-bottom: none;
        }
        
        .info-label {
            font-weight: bold;
            color: #374151;
        }
        
        .info-value {
            color: #6b7280;
        }
        
        .table-container {
            margin: 20px 0;
            border: 1px solid #e5e7eb;
            border-radius: 10px;
            overflow: hidden;
        }
        
        table {
            width: 100%;
            border-collapse: collapse;
            background: white;
        }
        
        th {
            background-color: #1a2941;
            color: white;
            font-weight: bold;
            padding: 12px 15px;
            text-align: center;
            vertical-align: middle;
            font-size: 14px;
            border-bottom: 1px solid #e5e7eb;
        }
        
        td {
            padding: 12px 15px;
            border-bottom: 1px solid #e5e7eb;
            background: white;
            text-align: center;
        }

     

        tr:nth-child(even) td {
            background: #f9fafb;
        }
        
        .financial-summary {
            margin: 20px 0;
            border: 1px solid #e5e7eb;
            border-radius: 10px;
            overflow: hidden;
        }
        
        .financial-summary h3 {
            background-color: #1a2941;
            color: white;
            padding: 10px 15px;
            margin: 0;
            font-size: 14px;
            font-weight: bold;
            text-align: center;
            vertical-align: middle;
        }
        
        .summary-content {
            padding: 15px;
        }
        
        .summary-item {
            display: flex;
            justify-content: space-between;
            margin: 8px 0;
            padding: 4px 0;
            border-bottom: 1px solid #f3f4f6;
        }
        
        .summary-item:last-child {
            border-bottom: none;
            font-weight: bold;
            border-top: 1px solid #e5e7eb;
            padding-top: 8px;
            margin-top: 8px;
        }
        
        .signature-section {
            margin: 30px 0;
            padding: 20px 0;
            border-top: 1px solid #e5e7eb;
            width: 100%;
        }
        
        .signature-row {
            display: flex;
            flex: 1;
            align-items: center;
            justify-content: space-between;
            margin: 20px 0;
        }
        
        .signature-item {
            text-align: center;
        }
        
        .signature-label {
            font-weight: bold;
            color: #374151;
            margin-bottom: 30px;
        }
        
        .signature-line {
            border-bottom: 1px solid #374151;
            width: 200px;
            margin: 0 auto;
        }
        
        .footer {
            text-align: center;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            color: #6b7280;
        }
        
        .thank-you {
            text-align: center;
            margin: 20px 0;
            color: #374151;
            font-weight: bold;
        }
        
        @media print {
            body {
                background: white;
            }
            
            .container {
                padding: 20px;
                margin: 0;
            }
        }
    `;
};
