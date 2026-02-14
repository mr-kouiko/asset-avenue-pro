-- 1. Delete the 2 duplicate camel caravan submissions
DELETE FROM content_files WHERE submission_id IN ('e8442dab-cb65-4bf8-8187-0147a1e47070', 'cb0ba523-d6a6-4f6e-8e6b-ff1ef2941777');
DELETE FROM content_submissions WHERE id IN ('e8442dab-cb65-4bf8-8187-0147a1e47070', 'cb0ba523-d6a6-4f6e-8e6b-ff1ef2941777');

-- 2. Drop and recreate the anti-duplicate function with file_size fallback
DROP FUNCTION IF EXISTS public.check_and_insert_file(text,text,uuid,text,bigint,text,text);

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
SET search_path = public
AS $$
DECLARE
    v_owner uuid;
BEGIN
    -- Advisory lock to prevent concurrent uploads of the same file
    PERFORM pg_advisory_xact_lock(hashtext(p_file_hash));

    -- Check 1: Exact hash match (primary dedup)
    SELECT cs.creator_id
    INTO v_owner
    FROM content_files cf
    JOIN content_submissions cs ON cf.submission_id = cs.id
    WHERE cf.file_hash = p_file_hash
      AND cf.file_hash IS NOT NULL
      AND p_file_hash IS NOT NULL
      AND p_file_hash != ''
    LIMIT 1;

    IF FOUND THEN
        RETURN QUERY SELECT false, 'Duplicate file detected (hash match)'::text, v_owner;
        RETURN;
    END IF;

    -- Check 2: file_size + file_type fallback for legacy files without hash
    IF p_file_size > 0 THEN
        SELECT cs.creator_id
        INTO v_owner
        FROM content_files cf
        JOIN content_submissions cs ON cf.submission_id = cs.id
        WHERE cf.file_size = p_file_size
          AND cs.status IN ('approved', 'pending')
          AND cf.file_type = p_file_type
        LIMIT 1;

        IF FOUND THEN
            RETURN QUERY SELECT false, 'Duplicate file detected (size+type match)'::text, v_owner;
            RETURN;
        END IF;
    END IF;

    -- No duplicate found - insert
    INSERT INTO content_files (file_hash, file_name, submission_id, file_path, file_size, file_type, file_format)
    VALUES (p_file_hash, p_file_name, p_submission_id, p_file_path, p_file_size, p_file_type, p_file_format);

    RETURN QUERY SELECT true, 'File inserted successfully'::text, NULL::uuid;
END;
$$;