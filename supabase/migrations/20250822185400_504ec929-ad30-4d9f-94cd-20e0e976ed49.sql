-- Make original-files bucket public so media files can be accessed
UPDATE storage.buckets 
SET public = true 
WHERE id = 'original-files';