-- Add bill_direction column to bills table
-- This column will store whether a bill is positive (income) or negative (expense)

ALTER TABLE bills 
ADD COLUMN bill_direction VARCHAR(10) DEFAULT 'positive' CHECK (bill_direction IN ('positive', 'negative'));

-- Update existing bills to have 'positive' direction by default
UPDATE bills 
SET bill_direction = 'positive' 
WHERE bill_direction IS NULL;

-- Add comment to document the column purpose
COMMENT ON COLUMN bills.bill_direction IS 'Indicates whether this bill represents income (positive) or expense (negative)';
