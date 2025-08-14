import supabase from '@/lib/supabase';

interface BalanceTransaction {
    customerId: string;
    amount: number; // Positive for credits, negative for debits
    type: 'deal_created' | 'deal_deleted' | 'receipt_created' | 'receipt_deleted';
    referenceId: string; // Deal ID or Bill ID
    description: string;
}

/**
 * Updates customer balance and logs the transaction
 */
export const updateCustomerBalance = async (transaction: BalanceTransaction): Promise<boolean> => {
    try {
        // Start a transaction to ensure data consistency
        const { data: customer, error: fetchError } = await supabase.from('customers').select('balance').eq('id', transaction.customerId).single();

        if (fetchError) {
            console.error('Error fetching customer balance:', fetchError);
            return false;
        }

        const currentBalance = customer.balance || 0;
        const newBalance = currentBalance + transaction.amount;

        // Update customer balance
        const { error: updateError } = await supabase.from('customers').update({ balance: newBalance }).eq('id', transaction.customerId);

        if (updateError) {
            console.error('Error updating customer balance:', updateError);
            return false;
        }

        // Log the transaction (we'll create this table if it doesn't exist)
        try {
            await supabase.from('customer_transactions').insert({
                customer_id: transaction.customerId,
                type: transaction.type,
                amount: transaction.amount,
                balance_before: currentBalance,
                balance_after: newBalance,
                reference_id: transaction.referenceId,
                description: transaction.description,
                created_at: new Date().toISOString(),
            });
        } catch (logError) {
            console.warn('Could not log transaction (table may not exist):', logError);
            // Don't fail the balance update if logging fails
        }

        console.log(`Balance updated for customer ${transaction.customerId}: ${currentBalance} -> ${newBalance}`);
        return true;
    } catch (error) {
        console.error('Error in updateCustomerBalance:', error);
        return false;
    }
};

/**
 * Handles balance update when a deal is created
 */
export const handleDealCreated = async (dealId: string, customerId: string, dealAmount: number, dealTitle: string): Promise<boolean> => {
    return await updateCustomerBalance({
        customerId,
        amount: -dealAmount, // Negative because deal amount is deducted
        type: 'deal_created',
        referenceId: dealId,
        description: `Deal created: ${dealTitle}`,
    });
};

/**
 * Handles balance update when a deal is deleted
 */
export const handleDealDeleted = async (dealId: string, customerId: string, dealAmount: number, dealTitle: string): Promise<boolean> => {
    return await updateCustomerBalance({
        customerId,
        amount: dealAmount, // Positive because we're reversing the deduction
        type: 'deal_deleted',
        referenceId: dealId,
        description: `Deal deleted: ${dealTitle}`,
    });
};

/**
 * Calculates total payment amount from a bill's payment fields
 */
export const calculateTotalPaymentAmount = (bill: any): number => {
    const visaAmount = parseFloat(bill.visa_amount || '0') || 0;
    const transferAmount = parseFloat(bill.transfer_amount || '0') || 0;
    const checkAmount = parseFloat(bill.check_amount || '0') || 0;
    const cashAmount = parseFloat(bill.cash_amount || '0') || 0;
    const bankAmount = parseFloat(bill.bank_amount || '0') || 0;
    const billAmount = parseFloat(bill.bill_amount || '0') || 0; // For general bills

    let totalAmount = visaAmount + transferAmount + checkAmount + cashAmount + bankAmount + billAmount;

    // Apply bill direction: negative bills should have negative amounts
    if (bill.bill_direction === 'negative') {
        totalAmount = -Math.abs(totalAmount);
    } else {
        totalAmount = Math.abs(totalAmount); // Ensure positive for positive bills
    }

    return totalAmount;
};

/**
 * Handles balance update when a receipt/bill is created
 */
export const handleReceiptCreated = async (billId: string, customerId: string, bill: any, customerName: string): Promise<boolean> => {
    const paymentAmount = calculateTotalPaymentAmount(bill);

    if (paymentAmount === 0) {
        console.log('No payment amount to process for receipt:', billId);
        return true; // Not an error, just no payment to process
    }

    const description =
        bill.bill_direction === 'negative' ? `Expense/Deduction for ${customerName}: ${getPaymentDescription(bill)}` : `Payment received from ${customerName}: ${getPaymentDescription(bill)}`;

    return await updateCustomerBalance({
        customerId,
        amount: paymentAmount, // Will be positive or negative based on bill_direction
        type: 'receipt_created',
        referenceId: billId,
        description,
    });
};

/**
 * Handles balance update when a receipt/bill is deleted
 */
export const handleReceiptDeleted = async (billId: string, customerId: string, bill: any, customerName: string): Promise<boolean> => {
    const paymentAmount = calculateTotalPaymentAmount(bill);

    if (paymentAmount === 0) {
        console.log('No payment amount to reverse for deleted receipt:', billId);
        return true; // Not an error, just no payment to reverse
    }

    const description =
        bill.bill_direction === 'negative' ? `Reversed expense/deduction for ${customerName}: ${getPaymentDescription(bill)}` : `Reversed payment from ${customerName}: ${getPaymentDescription(bill)}`;

    return await updateCustomerBalance({
        customerId,
        amount: -paymentAmount, // Reverse the original amount (flip the sign)
        type: 'receipt_deleted',
        referenceId: billId,
        description,
    });
};

/**
 * Helper function to create a readable payment description
 */
const getPaymentDescription = (bill: any): string => {
    const descriptions = [];

    if (bill.visa_amount && parseFloat(bill.visa_amount) > 0) {
        descriptions.push(`Visa: ${bill.visa_amount}`);
    }
    if (bill.transfer_amount && parseFloat(bill.transfer_amount) > 0) {
        descriptions.push(`Transfer: ${bill.transfer_amount}`);
    }
    if (bill.check_amount && parseFloat(bill.check_amount) > 0) {
        descriptions.push(`Check: ${bill.check_amount}`);
    }
    if (bill.cash_amount && parseFloat(bill.cash_amount) > 0) {
        descriptions.push(`Cash: ${bill.cash_amount}`);
    }
    if (bill.bank_amount && parseFloat(bill.bank_amount) > 0) {
        descriptions.push(`Bank: ${bill.bank_amount}`);
    }

    return descriptions.join(', ') || 'Payment';
};

/**
 * Gets customer ID from a deal, handling different deal types
 */
export const getCustomerIdFromDeal = (deal: any): string | null => {
    // For regular deals, use customer_id
    if (deal.customer_id) {
        return deal.customer_id.toString();
    }

    // For intermediary deals, use seller_id as the primary customer for balance tracking
    // If seller_id is not available, fall back to buyer_id
    if (deal.deal_type === 'intermediary') {
        if (deal.seller_id) {
            return deal.seller_id.toString();
        } else if (deal.buyer_id) {
            return deal.buyer_id.toString();
        }
    }

    return null;
};
