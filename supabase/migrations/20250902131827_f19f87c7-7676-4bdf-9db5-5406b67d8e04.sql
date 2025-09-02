-- Supprimer tout le contenu du vendeur lechheb.karim@hotmail.com
-- User ID: 25b8feb7-eaa1-4dbd-857c-0a3c21fd0d76

-- 1. Supprimer les secure downloads liés aux content files de ce vendeur
DELETE FROM secure_downloads 
WHERE content_file_id IN (
  SELECT cf.id 
  FROM content_files cf 
  JOIN content_submissions cs ON cf.submission_id = cs.id 
  WHERE cs.creator_id = '25b8feb7-eaa1-4dbd-857c-0a3c21fd0d76'
);

-- 2. Supprimer les downloads liés aux submissions de ce vendeur
DELETE FROM downloads 
WHERE submission_id IN (
  SELECT id 
  FROM content_submissions 
  WHERE creator_id = '25b8feb7-eaa1-4dbd-857c-0a3c21fd0d76'
);

-- 3. Supprimer les transactions liées à ce vendeur
DELETE FROM transactions 
WHERE seller_id = '25b8feb7-eaa1-4dbd-857c-0a3c21fd0d76';

-- 4. Supprimer les payouts liés à ce vendeur
DELETE FROM payouts 
WHERE seller_id = '25b8feb7-eaa1-4dbd-857c-0a3c21fd0d76';

-- 5. Supprimer les content files
DELETE FROM content_files 
WHERE submission_id IN (
  SELECT id 
  FROM content_submissions 
  WHERE creator_id = '25b8feb7-eaa1-4dbd-857c-0a3c21fd0d76'
);

-- 6. Supprimer les content submissions
DELETE FROM content_submissions 
WHERE creator_id = '25b8feb7-eaa1-4dbd-857c-0a3c21fd0d76';

-- 7. Supprimer le compte Stripe Connect s'il existe
DELETE FROM stripe_accounts 
WHERE user_id = '25b8feb7-eaa1-4dbd-857c-0a3c21fd0d76';