-- Create bill_payments table for storing multiple payments per bill
CREATE TABLE bill_payments (
    id SERIAL PRIMARY KEY,
    bill_id INTEGER NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
    payment_type VARCHAR(50) NOT NULL CHECK (payment_type IN ('cash', 'visa', 'bank_transfer', 'check')),
    amount NUMERIC(10,2) NOT NULL,
    
    -- Visa payment fields
    visa_installments INTEGER,
    visa_card_type VARCHAR(100),
    visa_last_four VARCHAR(4),
    approval_number VARCHAR(100),
    
    -- Bank transfer fields
    bank_name VARCHAR(200),
    bank_branch VARCHAR(200),
    transfer_amount NUMERIC(10,2),
    transfer_bank_name VARCHAR(200),
    transfer_branch VARCHAR(200),
    transfer_account_number VARCHAR(100),
    transfer_branch_number VARCHAR(50),
    transfer_number VARCHAR(100),
    transfer_holder_name VARCHAR(200),
    
    -- Check payment fields
    check_bank_name VARCHAR(200),
    check_branch VARCHAR(200),
    check_branch_number VARCHAR(50),
    check_account_number VARCHAR(100),
    check_number VARCHAR(100),
    check_holder_name VARCHAR(200),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index for better performance when querying payments by bill
CREATE INDEX idx_bill_payments_bill_id ON bill_payments(bill_id);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_bill_payments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_bill_payments_updated_at
    BEFORE UPDATE ON bill_payments
    FOR EACH ROW
    EXECUTE FUNCTION update_bill_payments_updated_at();
