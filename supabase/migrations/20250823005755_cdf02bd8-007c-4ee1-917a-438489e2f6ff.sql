-- Add RLS policies for temp-chunks bucket to support chunked uploads

-- Allow creators to upload chunks to temp-chunks bucket
CREATE POLICY "Creators can upload chunks to temp-chunks" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'temp-chunks' 
  AND auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'creator'
  )
);

-- Allow creators to access their own chunks in temp-chunks bucket
CREATE POLICY "Creators can access their own chunks" ON storage.objects
FOR SELECT USING (
  bucket_id = 'temp-chunks'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow creators to delete their own chunks after merge
CREATE POLICY "Creators can delete their own chunks" ON storage.objects
FOR DELETE USING (
  bucket_id = 'temp-chunks'
  AND auth.uid()::text = (storage.foldername(name))[1]
  AND EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'creator'
  )
);