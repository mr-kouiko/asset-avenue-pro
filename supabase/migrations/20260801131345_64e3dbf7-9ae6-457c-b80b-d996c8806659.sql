CREATE POLICY "Admins manage blog images"
ON storage.objects
FOR ALL
TO authenticated
USING (bucket_id = 'thumbnails' AND (storage.foldername(name))[1] = 'blog' AND public.has_role(auth.uid(), 'admin'))
WITH CHECK (bucket_id = 'thumbnails' AND (storage.foldername(name))[1] = 'blog' AND public.has_role(auth.uid(), 'admin'));