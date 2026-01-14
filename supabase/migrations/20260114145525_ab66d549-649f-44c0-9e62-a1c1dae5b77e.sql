-- Create RLS policies for user-avatars bucket

-- Allow authenticated users to upload their own avatars
CREATE POLICY "Users can upload their own avatars"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'user-avatars' 
  AND auth.uid() IS NOT NULL 
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

-- Allow authenticated users to update their own avatars
CREATE POLICY "Users can update their own avatars"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'user-avatars' 
  AND auth.uid() IS NOT NULL 
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

-- Allow authenticated users to delete their own avatars
CREATE POLICY "Users can delete their own avatars"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'user-avatars' 
  AND auth.uid() IS NOT NULL 
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

-- Allow public read access since the bucket is public
CREATE POLICY "Anyone can view avatars"
ON storage.objects
FOR SELECT
USING (bucket_id = 'user-avatars');