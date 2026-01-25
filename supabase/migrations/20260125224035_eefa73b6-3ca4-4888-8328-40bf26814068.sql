-- Supprimer l'ancienne fonction et recréer avec le bon ordre de colonnes
DROP FUNCTION IF EXISTS public.check_file_duplicate(text);

-- Recréer la fonction avec le même ordre de colonnes
CREATE OR REPLACE FUNCTION public.check_file_duplicate(hash_value text)
RETURNS TABLE(
  exists_in_uploaded boolean,
  exists_in_content boolean,
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
    EXISTS(SELECT 1 FROM uploaded_files WHERE file_hash = hash_value) as exists_in_uploaded,
    EXISTS(SELECT 1 FROM content_files WHERE file_hash = hash_value) as exists_in_content,
    COALESCE(
      (SELECT uf.file_name FROM uploaded_files uf WHERE uf.file_hash = hash_value LIMIT 1),
      (SELECT cf.file_name FROM content_files cf WHERE cf.file_hash = hash_value LIMIT 1)
    ) as duplicate_file_name,
    (SELECT uf.user_id FROM uploaded_files uf WHERE uf.file_hash = hash_value LIMIT 1) as duplicate_user_id;
END;
$$;

-- Nouvelle fonction pour vérifier doublon par taille exacte (pour anciens fichiers sans hash)
CREATE OR REPLACE FUNCTION public.check_file_duplicate_by_size(
  p_file_size bigint,
  p_user_id uuid
)
RETURNS TABLE(
  exists_in_uploaded boolean,
  exists_in_content boolean,
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
      SELECT 1 FROM uploaded_files uf 
      WHERE uf.file_size = p_file_size 
      AND uf.user_id = p_user_id
    ) as exists_in_uploaded,
    EXISTS(
      SELECT 1 FROM content_files cf 
      WHERE cf.file_size = p_file_size
    ) as exists_in_content,
    COALESCE(
      (SELECT uf.file_name FROM uploaded_files uf 
       WHERE uf.file_size = p_file_size 
       AND uf.user_id = p_user_id
       LIMIT 1),
      (SELECT cf.file_name FROM content_files cf 
       WHERE cf.file_size = p_file_size 
       LIMIT 1)
    ) as duplicate_file_name,
    (SELECT uf.user_id FROM uploaded_files uf 
     WHERE uf.file_size = p_file_size 
     AND uf.user_id = p_user_id
     LIMIT 1) as duplicate_user_id;
END;
$$;