-- Add Tranzila integration columns to bills table
-- Run this migration to store Tranzila document information

ALTER TABLE public.bills 
ADD COLUMN IF NOT EXISTS tranzila_document_id VARCHAR(50),
ADD COLUMN IF NOT EXISTS tranzila_document_number VARCHAR(50),
ADD COLUMN IF NOT EXISTS tranzila_retrieval_key TEXT,
ADD COLUMN IF NOT EXISTS tranzila_created_at TIMESTAMP;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_bills_tranzila_document_number 
ON public.bills(tranzila_document_number);

-- Add comment to document the columns
COMMENT ON COLUMN public.bills.tranzila_document_id IS 'Tranzila internal document ID';
COMMENT ON COLUMN public.bills.tranzila_document_number IS 'Tranzila document/invoice number (e.g., 30002)';
COMMENT ON COLUMN public.bills.tranzila_retrieval_key IS 'Encoded key used to retrieve the document from Tranzila';
COMMENT ON COLUMN public.bills.tranzila_created_at IS 'Timestamp when the document was created in Tranzila';
