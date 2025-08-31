-- Make original-files bucket public so videos can be previewed
UPDATE storage.buckets 
SET public = true 
WHERE id = 'original-files';

-- Also make uploads bucket public for consistency  
UPDATE storage.buckets 
SET public = true 
WHERE id = 'uploads';