
-- ============================================================
-- 1️⃣ INDEX ANTI-DOUBLON
-- Empêche que le même fichier SHA256 soit uploadé plusieurs fois
-- ============================================================
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_content_hash
ON public.content_files (file_hash)
WHERE file_hash IS NOT NULL;

-- ============================================================
-- 2️⃣ FONCTION PL/pgSQL : check & insert avec advisory lock
-- Ajout des paramètres obligatoires (file_path, file_size, file_type, file_format)
-- pour respecter les contraintes NOT NULL de content_files
-- ============================================================
CREATE OR REPLACE FUNCTION public.check_and_insert_file(
    p_file_hash text,
    p_file_name text,
    p_submission_id uuid,
    p_file_path text DEFAULT '',
    p_file_size bigint DEFAULT 0,
    p_file_type text DEFAULT 'image',
    p_file_format text DEFAULT 'image/jpeg'
)
RETURNS TABLE(
    success boolean,
    message text,
    existing_owner uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_owner uuid;
BEGIN
    -- ⚡ Advisory lock pour éviter les uploads concurrents du même fichier
    PERFORM pg_advisory_xact_lock(hashtext(p_file_hash));

    -- Vérifie si le fichier existe déjà
    SELECT cs.creator_id
    INTO v_owner
    FROM content_files cf
    JOIN content_submissions cs ON cf.submission_id = cs.id
    WHERE cf.file_hash = p_file_hash
    LIMIT 1;

    IF FOUND THEN
        -- Fichier déjà présent, retourne le propriétaire
        RETURN QUERY SELECT false, 'Duplicate file detected'::text, v_owner;
        RETURN;
    END IF;

    -- Insère le nouveau fichier avec tous les champs obligatoires
    INSERT INTO content_files (file_hash, file_name, submission_id, file_path, file_size, file_type, file_format)
    VALUES (p_file_hash, p_file_name, p_submission_id, p_file_path, p_file_size, p_file_type, p_file_format);

    RETURN QUERY SELECT true, 'File inserted successfully'::text, NULL::uuid;
END;
$$;
