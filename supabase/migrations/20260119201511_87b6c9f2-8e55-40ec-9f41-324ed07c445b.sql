-- Function to generate slugified file name from title and original file extension
CREATE OR REPLACE FUNCTION public.generate_slugified_filename(title_input text, original_filename text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  slug_part text;
  extension text;
  last_dot_index integer;
BEGIN
  -- Extract file extension from original filename
  last_dot_index := strpos(reverse(original_filename), '.');
  IF last_dot_index > 0 THEN
    extension := lower(right(original_filename, last_dot_index));
  ELSE
    extension := '';
  END IF;
  
  -- Generate slug from title (max 50 chars)
  slug_part := generate_product_slug(title_input, ARRAY[]::text[]);
  slug_part := substring(slug_part, 1, 50);
  
  -- Combine slug with extension
  RETURN slug_part || extension;
END;
$$;

-- Migration: Update all existing content_files to use slugified filenames based on their submission's title
-- This preserves the original filename in metadata and updates file_name to be SEO-friendly
DO $$
DECLARE
  file_record RECORD;
  new_file_name text;
BEGIN
  -- Loop through all content_files with their parent submission
  FOR file_record IN 
    SELECT 
      cf.id AS file_id,
      cf.file_name AS current_file_name,
      cf.metadata AS file_metadata,
      cs.title AS submission_title
    FROM content_files cf
    JOIN content_submissions cs ON cs.id = cf.submission_id
    WHERE cs.title IS NOT NULL AND cs.title != ''
  LOOP
    -- Generate new slugified filename
    new_file_name := generate_slugified_filename(file_record.submission_title, file_record.current_file_name);
    
    -- Update the file record - use file_record.file_metadata instead of bare column name
    UPDATE content_files
    SET 
      file_name = new_file_name,
      metadata = COALESCE(file_record.file_metadata, '{}'::jsonb) || 
        jsonb_build_object('originalFileName', file_record.current_file_name)
    WHERE id = file_record.file_id
    AND file_name != new_file_name;
    
  END LOOP;
  
  RAISE NOTICE 'Migration complete: Updated content_files with slugified filenames based on submission titles';
END;
$$;

-- Also ensure all content_submissions have slugs (for any that might be missing)
DO $$
DECLARE
  submission_record RECORD;
  new_slug text;
  existing_slugs text[];
BEGIN
  -- Get all existing slugs
  SELECT array_agg(slug) INTO existing_slugs
  FROM content_submissions
  WHERE slug IS NOT NULL AND slug != '';
  
  IF existing_slugs IS NULL THEN
    existing_slugs := ARRAY[]::text[];
  END IF;
  
  -- Loop through submissions without slugs
  FOR submission_record IN 
    SELECT id, title, tags
    FROM content_submissions
    WHERE (slug IS NULL OR slug = '')
    AND title IS NOT NULL AND title != ''
  LOOP
    -- Generate slug
    new_slug := generate_product_slug(submission_record.title, COALESCE(submission_record.tags, ARRAY[]::text[]));
    
    -- Ensure uniqueness
    WHILE new_slug = ANY(existing_slugs) LOOP
      new_slug := new_slug || '-' || substring(md5(random()::text), 1, 4);
    END LOOP;
    
    -- Update the submission
    UPDATE content_submissions
    SET slug = new_slug
    WHERE id = submission_record.id;
    
    -- Add to existing slugs array
    existing_slugs := array_append(existing_slugs, new_slug);
    
  END LOOP;
  
  RAISE NOTICE 'Migration complete: Generated slugs for submissions that were missing them';
END;
$$;