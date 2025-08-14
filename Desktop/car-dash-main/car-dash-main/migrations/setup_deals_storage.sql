-- Storage bucket setup for deals attachments
-- Run this SQL in your Supabase dashboard SQL editor

-- Create the deals bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('deals', 'deals', true, 10485760, ARRAY['image/*', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
ON CONFLICT (id) DO NOTHING;

-- Set up RLS (Row Level Security) policies for the deals bucket
-- Allow authenticated users to upload files
CREATE POLICY IF NOT EXISTS "Authenticated users can upload deal files" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'deals');

-- Allow authenticated users to view deal files
CREATE POLICY IF NOT EXISTS "Authenticated users can view deal files" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'deals');

-- Allow authenticated users to delete deal files
CREATE POLICY IF NOT EXISTS "Authenticated users can delete deal files" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'deals');

-- Allow authenticated users to update deal files
CREATE POLICY IF NOT EXISTS "Authenticated users can update deal files" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'deals');

-- Enable RLS on storage.objects table
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
