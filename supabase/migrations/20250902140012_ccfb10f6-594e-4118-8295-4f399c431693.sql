-- Create RLS policies for uploads bucket to allow authenticated users to upload files
-- First ensure the uploads bucket exists and is configured properly

-- Policy to allow authenticated users to upload files to uploads bucket
CREATE POLICY "Authenticated users can upload files" 
ON storage.objects 
FOR INSERT 
TO authenticated 
WITH CHECK (bucket_id = 'uploads' AND auth.uid() IS NOT NULL);

-- Policy to allow users to view their own uploaded files
CREATE POLICY "Users can view their own uploads" 
ON storage.objects 
FOR SELECT 
TO authenticated 
USING (bucket_id = 'uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Policy to allow public access to view uploaded files (for covers display)
CREATE POLICY "Public can view upload files" 
ON storage.objects 
FOR SELECT 
TO public 
USING (bucket_id = 'uploads');

-- Policy to allow users to update their own files
CREATE POLICY "Users can update their own uploads" 
ON storage.objects 
FOR UPDATE 
TO authenticated 
USING (bucket_id = 'uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Policy to allow users to delete their own files
CREATE POLICY "Users can delete their own uploads" 
ON storage.objects 
FOR DELETE 
TO authenticated 
USING (bucket_id = 'uploads' AND auth.uid()::text = (storage.foldername(name))[1]);