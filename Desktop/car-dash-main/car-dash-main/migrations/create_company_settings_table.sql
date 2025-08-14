-- Create company_settings table for storing company information
-- Run this SQL in your Supabase dashboard or database management tool

CREATE TABLE IF NOT EXISTS company_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    logo_url TEXT,
    address TEXT,
    phone VARCHAR(50),
    tax_number VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_company_settings_name ON company_settings(name);

-- Add comments to describe the table
COMMENT ON TABLE company_settings IS 'Stores company information including name, logo, contact details';
COMMENT ON COLUMN company_settings.name IS 'Company name that appears throughout the dashboard';
COMMENT ON COLUMN company_settings.logo_url IS 'URL to the company logo image';
COMMENT ON COLUMN company_settings.address IS 'Company physical address';
COMMENT ON COLUMN company_settings.phone IS 'Company phone number';
COMMENT ON COLUMN company_settings.tax_number IS 'Company tax identification number';

-- Create storage bucket for company files
INSERT INTO storage.buckets (id, name, public) 
VALUES ('company', 'company', true) 
ON CONFLICT (id) DO NOTHING;

-- Set up RLS policies for company_settings table
ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read company settings
CREATE POLICY "Allow authenticated users to read company settings" ON company_settings
    FOR SELECT USING (auth.role() = 'authenticated');

-- Allow all authenticated users to insert/update company settings
CREATE POLICY "Allow authenticated users to manage company settings" ON company_settings
    FOR ALL USING (auth.role() = 'authenticated');

-- Set up storage policies for company bucket
CREATE POLICY "Allow authenticated users to read company files" ON storage.objects
    FOR SELECT USING (auth.role() = 'authenticated' AND bucket_id = 'company');

CREATE POLICY "Allow authenticated users to upload company files" ON storage.objects
    FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND bucket_id = 'company');

CREATE POLICY "Allow authenticated users to update company files" ON storage.objects
    FOR UPDATE USING (auth.role() = 'authenticated' AND bucket_id = 'company');

CREATE POLICY "Allow authenticated users to delete company files" ON storage.objects
    FOR DELETE USING (auth.role() = 'authenticated' AND bucket_id = 'company');
