
-- Drop ALL versions of check_file_duplicate and recreate the correct one
DROP FUNCTION IF EXISTS public.check_file_duplicate(text);
DROP FUNCTION IF EXISTS public.check_file_duplicate(text, text);

-- Recreate with proper file_type filtering
CREATE OR REPLACE FUNCTION public.check_file_duplicate(
  hash_value text,
  file_type_param text DEFAULT NULL
)
RETURNS TABLE(
  exists_in_content boolean, 
  exists_in_uploaded boolean, 
  duplicate_file_name text, 
  duplicate_user_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    EXISTS(
      SELECT 1 FROM content_files cf 
      WHERE cf.file_hash = hash_value 
      AND (file_type_param IS NULL OR cf.file_type = file_type_param)
    ) as exists_in_content,
    EXISTS(
      SELECT 1 FROM uploaded_files uf 
      WHERE uf.file_hash = hash_value 
      AND (file_type_param IS NULL OR uf.file_type = file_type_param)
    ) as exists_in_uploaded,
    COALESCE(
      (SELECT cf.file_name FROM content_files cf 
       WHERE cf.file_hash = hash_value 
       AND (file_type_param IS NULL OR cf.file_type = file_type_param)
       LIMIT 1),
      (SELECT uf.file_name FROM uploaded_files uf 
       WHERE uf.file_hash = hash_value 
       AND (file_type_param IS NULL OR uf.file_type = file_type_param)
       LIMIT 1)
    ) as duplicate_file_name,
    COALESCE(
      (SELECT cs.creator_id FROM content_files cf 
       JOIN content_submissions cs ON cf.submission_id = cs.id
       WHERE cf.file_hash = hash_value 
       AND (file_type_param IS NULL OR cf.file_type = file_type_param)
       LIMIT 1),
      (SELECT uf.user_id FROM uploaded_files uf 
       WHERE uf.file_hash = hash_value 
       AND (file_type_param IS NULL OR uf.file_type = file_type_param)
       LIMIT 1)
    ) as duplicate_user_id;
END;
$$;

-- Also fix check_file_duplicate_by_size - drop old versions
DROP FUNCTION IF EXISTS public.check_file_duplicate_by_size(bigint, uuid);
DROP FUNCTION IF EXISTS public.check_file_duplicate_by_size(bigint, uuid, text);

-- Recreate with proper file_type filtering
CREATE OR REPLACE FUNCTION public.check_file_duplicate_by_size(
  p_file_size bigint, 
  p_user_id uuid,
  p_file_type text DEFAULT NULL
)
RETURNS TABLE(
  exists_in_content boolean, 
  exists_in_uploaded boolean, 
  duplicate_file_name text, 
  duplicate_user_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    EXISTS(
      SELECT 1 FROM content_files cf 
      JOIN content_submissions cs ON cf.submission_id = cs.id
      WHERE cf.file_size = p_file_size 
      AND cs.creator_id = p_user_id
      AND (p_file_type IS NULL OR cf.file_type = p_file_type)
    ) as exists_in_content,
    EXISTS(
      SELECT 1 FROM uploaded_files uf 
      WHERE uf.file_size = p_file_size 
      AND uf.user_id = p_user_id
      AND (p_file_type IS NULL OR uf.file_type = p_file_type)
    ) as exists_in_uploaded,
    COALESCE(
      (SELECT cf.file_name FROM content_files cf 
       JOIN content_submissions cs ON cf.submission_id = cs.id
       WHERE cf.file_size = p_file_size 
       AND cs.creator_id = p_user_id
       AND (p_file_type IS NULL OR cf.file_type = p_file_type)
       LIMIT 1),
      (SELECT uf.file_name FROM uploaded_files uf 
       WHERE uf.file_size = p_file_size 
       AND uf.user_id = p_user_id
       AND (p_file_type IS NULL OR uf.file_type = p_file_type)
       LIMIT 1)
    ) as duplicate_file_name,
    p_user_id as duplicate_user_id;
END;
$$;
