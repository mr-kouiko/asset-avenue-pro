
-- ============================================================
-- ANTI-DUPLICATE SYSTEM V4 - Fix type mismatch + add DB constraints
-- ============================================================

-- 1. Add unique partial indexes on file_hash to prevent concurrent duplicates
CREATE UNIQUE INDEX IF NOT EXISTS idx_content_files_unique_hash 
  ON content_files (file_hash) 
  WHERE file_hash IS NOT NULL AND file_hash != '';

CREATE UNIQUE INDEX IF NOT EXISTS idx_uploaded_files_unique_hash 
  ON uploaded_files (file_hash) 
  WHERE file_hash IS NOT NULL AND file_hash != '';

-- 2. Fix check_file_duplicate: normalize file_type before comparison
-- uploaded_files stores 'video/mp4', content_files stores 'video'
-- We need to handle both formats
DROP FUNCTION IF EXISTS public.check_file_duplicate(text, text);

CREATE OR REPLACE FUNCTION public.check_file_duplicate(
  hash_value text, 
  file_type_param text DEFAULT NULL::text
)
RETURNS TABLE(exists_in_content boolean, exists_in_uploaded boolean, duplicate_file_name text, duplicate_user_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_normalized_type text;
BEGIN
  -- Normalize: 'video/mp4' -> 'video', 'image/jpeg' -> 'image', etc.
  v_normalized_type := CASE 
    WHEN file_type_param IS NULL THEN NULL
    WHEN file_type_param LIKE '%/%' THEN split_part(file_type_param, '/', 1)
    ELSE file_type_param
  END;

  RETURN QUERY
  SELECT 
    EXISTS(
      SELECT 1 FROM content_files cf 
      WHERE cf.file_hash = hash_value 
      AND (v_normalized_type IS NULL 
           OR cf.file_type = v_normalized_type 
           OR split_part(cf.file_type, '/', 1) = v_normalized_type)
    ) as exists_in_content,
    EXISTS(
      SELECT 1 FROM uploaded_files uf 
      WHERE uf.file_hash = hash_value 
      AND (v_normalized_type IS NULL 
           OR uf.file_type = v_normalized_type 
           OR split_part(uf.file_type, '/', 1) = v_normalized_type)
    ) as exists_in_uploaded,
    COALESCE(
      (SELECT cf.file_name FROM content_files cf 
       WHERE cf.file_hash = hash_value 
       AND (v_normalized_type IS NULL OR cf.file_type = v_normalized_type OR split_part(cf.file_type, '/', 1) = v_normalized_type)
       LIMIT 1),
      (SELECT uf.file_name FROM uploaded_files uf 
       WHERE uf.file_hash = hash_value 
       AND (v_normalized_type IS NULL OR uf.file_type = v_normalized_type OR split_part(uf.file_type, '/', 1) = v_normalized_type)
       LIMIT 1)
    ) as duplicate_file_name,
    COALESCE(
      (SELECT cs.creator_id FROM content_files cf 
       JOIN content_submissions cs ON cf.submission_id = cs.id
       WHERE cf.file_hash = hash_value 
       AND (v_normalized_type IS NULL OR cf.file_type = v_normalized_type OR split_part(cf.file_type, '/', 1) = v_normalized_type)
       LIMIT 1),
      (SELECT uf.user_id FROM uploaded_files uf 
       WHERE uf.file_hash = hash_value 
       AND (v_normalized_type IS NULL OR uf.file_type = v_normalized_type OR split_part(uf.file_type, '/', 1) = v_normalized_type)
       LIMIT 1)
    ) as duplicate_user_id;
END;
$function$;

-- 3. Fix check_file_duplicate_by_size: also normalize types + check ALL users (not just same user)
DROP FUNCTION IF EXISTS public.check_file_duplicate_by_size(bigint, uuid, text);

CREATE OR REPLACE FUNCTION public.check_file_duplicate_by_size(
  p_file_size bigint, 
  p_user_id uuid, 
  p_file_type text DEFAULT NULL::text
)
RETURNS TABLE(exists_in_content boolean, exists_in_uploaded boolean, duplicate_file_name text, duplicate_user_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_normalized_type text;
BEGIN
  -- Normalize type
  v_normalized_type := CASE 
    WHEN p_file_type IS NULL THEN NULL
    WHEN p_file_type LIKE '%/%' THEN split_part(p_file_type, '/', 1)
    ELSE p_file_type
  END;

  RETURN QUERY
  SELECT 
    EXISTS(
      SELECT 1 FROM content_files cf 
      JOIN content_submissions cs ON cf.submission_id = cs.id
      WHERE cf.file_size = p_file_size 
      AND cs.status IN ('approved', 'pending', 'draft')
      AND (v_normalized_type IS NULL 
           OR cf.file_type = v_normalized_type 
           OR split_part(cf.file_type, '/', 1) = v_normalized_type)
    ) as exists_in_content,
    EXISTS(
      SELECT 1 FROM uploaded_files uf 
      WHERE uf.file_size = p_file_size 
      AND (v_normalized_type IS NULL 
           OR uf.file_type = v_normalized_type 
           OR split_part(uf.file_type, '/', 1) = v_normalized_type)
    ) as exists_in_uploaded,
    COALESCE(
      (SELECT cf.file_name FROM content_files cf 
       JOIN content_submissions cs ON cf.submission_id = cs.id
       WHERE cf.file_size = p_file_size 
       AND cs.status IN ('approved', 'pending', 'draft')
       AND (v_normalized_type IS NULL OR cf.file_type = v_normalized_type OR split_part(cf.file_type, '/', 1) = v_normalized_type)
       LIMIT 1),
      (SELECT uf.file_name FROM uploaded_files uf 
       WHERE uf.file_size = p_file_size 
       AND (v_normalized_type IS NULL OR uf.file_type = v_normalized_type OR split_part(uf.file_type, '/', 1) = v_normalized_type)
       LIMIT 1)
    ) as duplicate_file_name,
    COALESCE(
      (SELECT cs.creator_id FROM content_files cf 
       JOIN content_submissions cs ON cf.submission_id = cs.id
       WHERE cf.file_size = p_file_size 
       AND (v_normalized_type IS NULL OR cf.file_type = v_normalized_type OR split_part(cf.file_type, '/', 1) = v_normalized_type)
       LIMIT 1),
      (SELECT uf.user_id FROM uploaded_files uf 
       WHERE uf.file_size = p_file_size 
       AND (v_normalized_type IS NULL OR uf.file_type = v_normalized_type OR split_part(uf.file_type, '/', 1) = v_normalized_type)
       LIMIT 1)
    ) as duplicate_user_id;
END;
$function$;

-- 4. Fix check_and_insert_file: also normalize types for consistency
DROP FUNCTION IF EXISTS public.check_and_insert_file(text, text, uuid, text, bigint, text, text);

CREATE OR REPLACE FUNCTION public.check_and_insert_file(
  p_file_hash text,
  p_file_name text,
  p_submission_id uuid,
  p_file_path text,
  p_file_size bigint,
  p_file_type text,
  p_file_format text
)
RETURNS TABLE(is_new boolean, message text, owner_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_owner uuid;
    v_normalized_type text;
BEGIN
    -- Normalize type
    v_normalized_type := CASE 
      WHEN p_file_type LIKE '%/%' THEN split_part(p_file_type, '/', 1)
      ELSE p_file_type
    END;

    -- Advisory lock to prevent concurrent uploads of the same file
    PERFORM pg_advisory_xact_lock(hashtext(p_file_hash));

    -- Check 1: Exact hash match in content_files
    SELECT cs.creator_id INTO v_owner
    FROM content_files cf
    JOIN content_submissions cs ON cf.submission_id = cs.id
    WHERE cf.file_hash = p_file_hash
      AND cf.file_hash IS NOT NULL
      AND p_file_hash IS NOT NULL
      AND p_file_hash != ''
    LIMIT 1;

    IF FOUND THEN
        RETURN QUERY SELECT false, 'Duplicate file detected (hash match in content_files)'::text, v_owner;
        RETURN;
    END IF;

    -- Check 1b: Exact hash match in uploaded_files
    SELECT uf.user_id INTO v_owner
    FROM uploaded_files uf
    WHERE uf.file_hash = p_file_hash
      AND uf.file_hash IS NOT NULL
      AND p_file_hash IS NOT NULL
      AND p_file_hash != ''
    LIMIT 1;

    IF FOUND THEN
        RETURN QUERY SELECT false, 'Duplicate file detected (hash match in uploaded_files)'::text, v_owner;
        RETURN;
    END IF;

    -- Check 2: file_size + normalized file_type fallback
    IF p_file_size > 0 THEN
        SELECT cs.creator_id INTO v_owner
        FROM content_files cf
        JOIN content_submissions cs ON cf.submission_id = cs.id
        WHERE cf.file_size = p_file_size
          AND cs.status IN ('approved', 'pending', 'draft')
          AND (cf.file_type = v_normalized_type OR split_part(cf.file_type, '/', 1) = v_normalized_type)
        LIMIT 1;

        IF FOUND THEN
            RETURN QUERY SELECT false, 'Duplicate file detected (size+type match)'::text, v_owner;
            RETURN;
        END IF;

        -- Also check uploaded_files
        SELECT uf.user_id INTO v_owner
        FROM uploaded_files uf
        WHERE uf.file_size = p_file_size
          AND (uf.file_type = v_normalized_type OR split_part(uf.file_type, '/', 1) = v_normalized_type)
        LIMIT 1;

        IF FOUND THEN
            RETURN QUERY SELECT false, 'Duplicate file detected (size+type match in uploaded_files)'::text, v_owner;
            RETURN;
        END IF;
    END IF;

    -- No duplicate found - insert
    INSERT INTO content_files (file_hash, file_name, submission_id, file_path, file_size, file_type, file_format)
    VALUES (p_file_hash, p_file_name, p_submission_id, p_file_path, p_file_size, p_file_type, p_file_format);

    RETURN QUERY SELECT true, 'File inserted successfully'::text, NULL::uuid;
END;
$function$;
