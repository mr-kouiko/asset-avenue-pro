-- Ajouter les politiques manquantes pour le bucket seller-content
-- Les créateurs doivent pouvoir uploader et gérer leurs fichiers dans seller-content

-- Politique pour permettre aux créateurs d'uploader dans seller-content
CREATE POLICY "Creators can upload seller content"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (
  bucket_id = 'seller-content'
  AND auth.uid() IS NOT NULL
  AND (auth.uid())::text = (storage.foldername(name))[1]
  AND EXISTS (
    SELECT 1
    FROM user_roles
    WHERE user_id = auth.uid()
      AND role = 'creator'::app_role
  )
);

-- Politique pour permettre aux créateurs de gérer leurs fichiers dans seller-content
CREATE POLICY "Creators can manage their seller content"
ON storage.objects
FOR ALL
TO public
USING (
  bucket_id = 'seller-content'
  AND auth.uid() IS NOT NULL
  AND (auth.uid())::text = (storage.foldername(name))[1]
  AND EXISTS (
    SELECT 1
    FROM user_roles
    WHERE user_id = auth.uid()
      AND role = 'creator'::app_role
  )
);