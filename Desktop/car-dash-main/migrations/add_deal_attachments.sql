-- Migration to add file attachment columns to deals table
-- Run this SQL in your Supabase dashboard or database management tool

-- Option 1: Add individual URL columns (current approach)
ALTER TABLE deals 
ADD COLUMN IF NOT EXISTS car_license_url TEXT,
ADD COLUMN IF NOT EXISTS driver_license_url TEXT,
ADD COLUMN IF NOT EXISTS car_transfer_document_url TEXT;

-- Option 2: Add JSON array for attachments (recommended approach)
ALTER TABLE deals 
ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;

-- Add comments to describe the columns
COMMENT ON COLUMN deals.car_license_url IS 'Relative path to the car license document in storage (e.g., /deals/123/car_license.pdf)';
COMMENT ON COLUMN deals.driver_license_url IS 'Relative path to the driver license document in storage (e.g., /deals/123/driver_license.jpg)';
COMMENT ON COLUMN deals.car_transfer_document_url IS 'Relative path to the car transfer document in storage (e.g., /deals/123/transfer.pdf)';
COMMENT ON COLUMN deals.attachments IS 'JSON array of file attachments with metadata: [{type, name, url (relative path), uploadedAt, size}]';

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_deals_attachments ON deals USING GIN (attachments);

-- Example attachments structure:
-- [
--   {
--     "type": "car_license",
--     "name": "car_license.pdf",
--     "url": "/deals/123/car_license.pdf",
--     "uploadedAt": "2025-06-24T10:30:00Z",
--     "size": 2048576,
--     "mimeType": "application/pdf"
--   },
--   {
--     "type": "driver_license", 
--     "name": "driver_license.jpg",
--     "url": "/deals/123/driver_license.jpg",
--     "uploadedAt": "2025-06-24T10:31:00Z",
--     "size": 1024768,
--     "mimeType": "image/jpeg"
--   }
-- ]
