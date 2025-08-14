# Customer Balance Management System

## Overview

This document describes the implementation of the customer balance management system that automatically tracks and updates customer account balances based on deals and receipts.

## How It Works

### Balance Update Rules

1. **Deal Creation** → **Deducts** deal amount from customer balance
2. **Deal Deletion** → **Adds back** deal amount to customer balance
3. **Receipt Creation** → **Adds** payment amounts to customer balance
4. **Receipt Deletion** → **Deducts** payment amounts from customer balance

### Payment Amount Calculation

When processing receipts, the system sums up all payment method amounts:

- `visa_amount`
- `transfer_amount`
- `check_amount`
- `cash_amount`
- `bank_amount`

## Database Schema

### Customer Transactions Table

```sql
CREATE TABLE customer_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN ('deal_created', 'deal_deleted', 'receipt_created', 'receipt_deleted')),
    amount DECIMAL(10, 2) NOT NULL,
    balance_before DECIMAL(10, 2) NOT NULL,
    balance_after DECIMAL(10, 2) NOT NULL,
    reference_id VARCHAR(255) NOT NULL, -- Deal ID or Bill ID
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Implementation Files

### Core Balance Manager (`utils/balance-manager.ts`)

Contains all balance management logic:

- `updateCustomerBalance()` - Core function to update balance and log transaction
- `handleDealCreated()` - Handles deal creation balance updates
- `handleDealDeleted()` - Handles deal deletion balance updates
- `handleReceiptCreated()` - Handles receipt creation balance updates
- `handleReceiptDeleted()` - Handles receipt deletion balance updates
- `calculateTotalPaymentAmount()` - Sums up all payment amounts from a bill
- `getCustomerIdFromDeal()` - Extracts customer ID from different deal types

### Integration Points

**Deal Creation:**

- `app/(defaults)/deals/add/page.tsx` - Integrated in deal creation flow

**Deal Deletion:**

- `app/(defaults)/deals/page.tsx` - Integrated in single and bulk deal deletion

**Receipt Creation:**

- `app/(defaults)/bills/add/page.tsx` - Integrated in bill creation flow
- `app/(defaults)/deals/edit/[id]/page.tsx` - Integrated in quick bill creation from deal page

**Receipt Deletion:**

- `app/(defaults)/bills/page.tsx` - Integrated in single and bulk bill deletion

**Transaction History:**

- `app/(defaults)/customers/preview/[id]/page.tsx` - Shows real transaction history from database

## Special Handling

### Deal Types

- **Regular Deals** (`new_used_sale`, `exchange`, etc.): Uses `customer_id`
- **Intermediary Deals**: Uses `seller_id` as the primary customer for balance tracking
- **Company Commission**: Uses `customer_id` if available

### Error Handling

- Balance update failures are logged as warnings but don't fail the main operation
- If the `customer_transactions` table doesn't exist, balance updates still work (logging fails gracefully)
- Negative balances are allowed as per business requirements

### Transaction Descriptions

The system creates descriptive transaction logs:

- Deal transactions: "Deal created: [Deal Title]" / "Deal deleted: [Deal Title]"
- Payment transactions: "Payment received from [Customer]: [Payment Methods]"
- Example: "Payment received from John Doe: Visa: 5000, Cash: 2000"

## Migration Required

Run the following SQL migration in your Supabase dashboard:

```sql
-- From migrations/create_customer_transactions_table.sql
CREATE TABLE IF NOT EXISTS customer_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN ('deal_created', 'deal_deleted', 'receipt_created', 'receipt_deleted')),
    amount DECIMAL(10, 2) NOT NULL,
    balance_before DECIMAL(10, 2) NOT NULL,
    balance_after DECIMAL(10, 2) NOT NULL,
    reference_id VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_customer_transactions_customer_id ON customer_transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_transactions_type ON customer_transactions(type);
CREATE INDEX IF NOT EXISTS idx_customer_transactions_reference_id ON customer_transactions(reference_id);
CREATE INDEX IF NOT EXISTS idx_customer_transactions_created_at ON customer_transactions(created_at);
```

## Testing

After implementation, test the following scenarios:

1. **Create a deal** → Verify customer balance decreases by deal amount
2. **Delete a deal** → Verify customer balance increases by deal amount
3. **Create a receipt with payments** → Verify customer balance increases by total payment amount
4. **Delete a receipt** → Verify customer balance decreases by total payment amount
5. **View customer transaction history** → Verify all transactions are logged correctly

## Benefits

- **Automated Balance Tracking**: No manual balance updates required
- **Complete Audit Trail**: Every balance change is logged with details
- **Data Integrity**: Transactions ensure balance consistency
- **Real-time Updates**: Balances update immediately with each operation
- **Flexible Payment Methods**: Handles multiple payment types in receipts
- **Negative Balance Support**: Allows overdrafts as per business needs
