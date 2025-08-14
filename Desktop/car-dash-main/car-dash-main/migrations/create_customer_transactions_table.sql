-- Create customer_transactions table for tracking balance changes
-- Run this SQL in your Supabase dashboard or database management tool

CREATE TABLE IF NOT EXISTS customer_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    customer_id BIGINT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN ('deal_created', 'deal_deleted', 'receipt_created', 'receipt_deleted')),
    amount DECIMAL(10, 2) NOT NULL,
    balance_before DECIMAL(10, 2) NOT NULL,
    balance_after DECIMAL(10, 2) NOT NULL,
    reference_id VARCHAR(255) NOT NULL, -- Deal ID or Bill ID
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_customer_transactions_customer_id ON customer_transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_transactions_type ON customer_transactions(type);
CREATE INDEX IF NOT EXISTS idx_customer_transactions_reference_id ON customer_transactions(reference_id);
CREATE INDEX IF NOT EXISTS idx_customer_transactions_created_at ON customer_transactions(created_at);

-- Add comments to describe the table
COMMENT ON TABLE customer_transactions IS 'Tracks all balance changes for customers including deals and payments';
COMMENT ON COLUMN customer_transactions.type IS 'Type of transaction: deal_created, deal_deleted, receipt_created, receipt_deleted';
COMMENT ON COLUMN customer_transactions.amount IS 'Transaction amount (positive for credits, negative for debits)';
COMMENT ON COLUMN customer_transactions.balance_before IS 'Customer balance before this transaction';
COMMENT ON COLUMN customer_transactions.balance_after IS 'Customer balance after this transaction';
COMMENT ON COLUMN customer_transactions.reference_id IS 'References the deal ID or bill ID that caused this transaction';
