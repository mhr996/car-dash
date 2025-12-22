-- Add signature field to company_settings table
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS signature_url text;

-- Create table to store customer signatures for deals
CREATE TABLE IF NOT EXISTS deal_signatures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id bigint NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  customer_signature_url text NOT NULL,
  signed_at timestamp with time zone DEFAULT now(),
  signed_by_name text,
  UNIQUE(deal_id)
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_deal_signatures_deal_id ON deal_signatures(deal_id);
