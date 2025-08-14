export interface BillPayment {
    id?: string;
    bill_id?: string;
    payment_type: 'cash' | 'visa' | 'bank_transfer' | 'check';
    amount: number;

    // Visa payment fields
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
    updated_at?: string;
}

export interface BillWithPayments {
    id: string;
    deal_id: string;
    bill_type: string;
    customer_name: string;
    phone?: string;
    date: string;
    car_details?: string;
    sale_price?: number;
    commission?: number;
    free_text?: string;
    total: number;
    tax_amount: number;
    total_with_tax: number;
    status: string;
    created_at: string;

    // Multiple payments
    payments?: BillPayment[];

    // Deal relationship
    deal?: {
        title: string;
        amount: number;
        loss_amount?: number;
        selling_price?: number;
        deal_type: string;
        customer?: {
            id: number;
            name: string;
            id_number?: string;
        };
        seller?: {
            id: number;
            name: string;
            id_number?: string;
        };
        buyer?: {
            id: number;
            name: string;
            id_number?: string;
        };
        car?: {
            id: number;
            title: string;
            brand: string;
            year: number;
            buy_price: number;
            sale_price?: number;
            car_number?: string;
        };
    };
}
