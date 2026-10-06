export interface PurchaseParty {
    id: string | number;
    name: string;
    address?: string;
    phone?: string;
    id_number?: string | number;
}

export function resolvePurchaseSeller<T extends { source_type?: string | null; providers?: PurchaseParty | null; customers?: PurchaseParty | null }>(car: T) {
    if (car.source_type === 'customer' || car.source_type === 'brokerage' || car.source_type === 'broker') return car.customers;
    return car.providers || car.customers;
}

export function validatePurchaseCarId(carId: string | number): void {
    if (!/^\d+$/.test(String(carId))) throw new Error('Invalid purchase car ID');
}

export interface PurchaseBill {
    id: number;
    purchase_car_id?: string | number;
    created_at: string;
    date: string;
    bill_type: string;
    status: string;
    total_with_tax: number;
    customer_name?: string;
    bill_direction?: string;
    bill_amount?: number;
    bill_payments?: BillPayment[];
    tranzila_document_id?: string;
    tranzila_document_number?: string;
    tranzila_retrieval_key?: string;
    cancel_tranzila_doc_number?: string;
    cancel_tranzila_doc_id?: string;
}

export function cancellablePurchaseBills(bills: PurchaseBill[], type: string): PurchaseBill[] {
    return bills.filter((bill) => {
        const eligibleType =
            type === 'credit_note' ? bill.bill_type === 'tax_invoice' || bill.bill_type === 'tax_invoice_receipt' : bill.bill_type === 'receipt_only' || bill.bill_type === 'tax_invoice_receipt';
        return (
            eligibleType &&
            !!bill.tranzila_document_number &&
            !bills.some((cancellation) => cancellation.bill_type === type && cancellation.cancel_tranzila_doc_number === bill.tranzila_document_number)
        );
    });
}
import { BillPayment } from '@/types/payment';
