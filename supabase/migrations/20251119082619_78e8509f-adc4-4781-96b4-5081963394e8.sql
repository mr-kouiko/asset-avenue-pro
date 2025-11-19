-- ============================================
-- SUPPRESSION DES POLICIES EXISTANTES SUR BUCKET UPLOADS
-- ============================================

DO $$ 
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects'
        AND policyname LIKE '%upload%'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
    END LOOP;
END $$;

-- ============================================
-- CRÉATION DES POLICIES PROPRES POUR BUCKET UPLOADS
-- ============================================

-- 1) PUBLIC CAN VIEW PREVIEWS
CREATE POLICY "public_can_view_previews"
ON storage.objects
FOR SELECT
TO public
USING (
  bucket_id = 'uploads' 
  AND EXISTS (
    SELECT 1 
    FROM content_files cf
    JOIN content_submissions cs ON cs.id = cf.submission_id
    WHERE cf.file_path = storage.objects.name
      AND cf.is_preview = true
      AND cs.status = 'approved'
  )
);

-- 2) CREATORS CAN SELECT THEIR OWN FILES
CREATE POLICY "creators_can_select_own_files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'uploads'
  AND EXISTS (
    SELECT 1 
    FROM content_files cf
    JOIN content_submissions cs ON cs.id = cf.submission_id
    WHERE cf.file_path = storage.objects.name
      AND cs.creator_id = auth.uid()
      AND (has_role(auth.uid(), 'creator'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
  )
);

-- 3) CREATORS CAN INSERT FILES
CREATE POLICY "creators_can_insert_own_files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'uploads'
  AND (has_role(auth.uid(), 'creator'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
);

-- 4) CREATORS CAN UPDATE THEIR OWN FILES
CREATE POLICY "creators_can_update_own_files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'uploads'
  AND EXISTS (
    SELECT 1 
    FROM content_files cf
    JOIN content_submissions cs ON cs.id = cf.submission_id
    WHERE cf.file_path = storage.objects.name
      AND cs.creator_id = auth.uid()
      AND (has_role(auth.uid(), 'creator'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
  )
);

-- 5) CREATORS CAN DELETE THEIR OWN FILES
CREATE POLICY "creators_can_delete_own_files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'uploads'
  AND EXISTS (
    SELECT 1 
    FROM content_files cf
    JOIN content_submissions cs ON cs.id = cf.submission_id
    WHERE cf.file_path = storage.objects.name
      AND cs.creator_id = auth.uid()
      AND (has_role(auth.uid(), 'creator'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
  )
);

-- 6) CLIENTS CAN VIEW PURCHASED FILES
CREATE POLICY "clients_can_view_purchased_files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'uploads'
  AND EXISTS (
    SELECT 1 
    FROM content_files cf
    JOIN downloads d ON d.submission_id = cf.submission_id
    WHERE cf.file_path = storage.objects.name
      AND d.user_id = auth.uid()
      AND (d.expires_at IS NULL OR d.expires_at > now())
  )
);

-- 7) ADMINS CAN MANAGE EVERYTHING
CREATE POLICY "admins_can_manage_all_files"
ON storage.objects
FOR ALL
TO authenticated
USING (
  bucket_id = 'uploads'
  AND has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  bucket_id = 'uploads'
  AND has_role(auth.uid(), 'admin'::app_role)
);