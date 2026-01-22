export interface PDFOptions {
    filename?: string;
    orientation?: 'portrait' | 'landscape';
    format?: 'a4' | 'letter';
    language?: 'en' | 'he' | 'ar';
}

export interface BillData {
    id: string | number;
    bill_type: string; // More flexible to accept any string from database
    customer_name: string;
    customer_id?: string;
    customer_phone?: string;
    created_at: string;

    // General bill fields
    bill_amount?: number;
    bill_description?: string;

    // Tax invoice fields
    total?: number;
    tax_amount?: number;
    total_with_tax?: number;
    commission?: number;
    car_details?: string;

    // Payment fields
    payment_type?: string;
    cash_amount?: number;
    visa_amount?: number;
    bank_amount?: number;
    bank_name?: string;
    bank_branch?: string;
    account_number?: string;
    transfer_number?: string;
    check_amount?: number;

    // Deal relationship
    deal?: {
        id: string | number;
        deal_title?: string;
        deal_type?: string;
        loss_amount?: number;
        selling_price?: number;
        car?: {
            buy_price?: number;
            sale_price?: number;
            make?: string;
            model?: string;
            year?: number;
            license_plate?: string;
        };
        customer?: {
            name: string;
            id_number?: string;
            phone?: string;
        };
        seller?: {
            name: string;
            id_number?: string;
            phone?: string;
        };
        buyer?: {
            name: string;
            id_number?: string;
            phone?: string;
        };
    };

    // Bill payments relationship
    bill_payments?: Array<{
        id: string | number;
        payment_type: 'cash' | 'visa' | 'bank_transfer' | 'check';
        amount: number;
        // Visa fields
        visa_installments?: number;
        visa_card_type?: string;
        visa_last_four?: string;
        approval_number?: string;
        // Bank transfer fields
        bank_name?: string;
        bank_branch?: string;
        transfer_amount?: number;
        transfer_bank_name?: string;
        transfer_branch?: string;
        transfer_account_number?: string;
        transfer_branch_number?: string;
        transfer_number?: string;
        transfer_holder_name?: string;
        // Check fields
        check_bank_name?: string;
        check_branch?: string;
        check_branch_number?: string;
        check_account_number?: string;
        check_number?: string;
        check_holder_name?: string;
        created_at?: string;
    }>;
}

export type TranslationMap = {
    [key: string]: string;
};

export interface PDFTranslations {
    ar: TranslationMap;
    he: TranslationMap;
    en: TranslationMap;
}

// Define valid bill types for internal use
export type ValidBillType = 'general' | 'receipt_only' | 'tax_invoice' | 'tax_invoice_receipt' | 'credit_note';

// Helper function to validate and normalize bill types
export const normalizeBillType = (billType: string): ValidBillType => {
    const normalizedType = billType.toLowerCase().trim();

    switch (normalizedType) {
        case 'general':
        case 'general_bill':
            return 'general';
        case 'receipt':
        case 'receipt_only':
            return 'receipt_only';
        case 'tax_invoice':
        case 'tax':
            return 'tax_invoice';
        case 'tax_invoice_receipt':
        case 'tax_receipt':
        case 'invoice_receipt':
            return 'tax_invoice_receipt';
        case 'credit_note':
        case 'creditnote':
        case 'credit':
            return 'credit_note';
        default:
            console.warn(`Unknown bill type: ${billType}, defaulting to 'general'`);
            return 'general';
    }
};
