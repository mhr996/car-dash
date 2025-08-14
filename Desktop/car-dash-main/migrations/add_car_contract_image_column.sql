-- Add contract_image column to cars table
-- This column will store the path to the contract image file in Supabase storage

ALTER TABLE cars 
ADD COLUMN contract_image text;

-- Add comment to explain the column purpose
COMMENT ON COLUMN cars.contract_image IS 'Path to contract image file in Supabase storage (optional)';
