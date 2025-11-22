-- Enable unaccent extension for removing accents
CREATE EXTENSION IF NOT EXISTS unaccent;

-- Function to remove accents and clean text for slug generation
CREATE OR REPLACE FUNCTION clean_for_slug(text_input text) 
RETURNS text AS $$
DECLARE
  result text;
BEGIN
  -- Remove accents, convert to lowercase, replace spaces/special chars with hyphens
  result := lower(unaccent(text_input));
  result := regexp_replace(result, '[^a-z0-9]+', '-', 'g');
  result := regexp_replace(result, '^-+|-+$', '', 'g'); -- trim leading/trailing hyphens
  RETURN result;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to generate slug from title and tags
CREATE OR REPLACE FUNCTION generate_product_slug(title_input text, tags_input text[])
RETURNS text AS $$
DECLARE
  slug_parts text[];
  final_slug text;
  stop_words text[] := ARRAY[
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'up', 'about', 'into', 'through', 'during',
    'le', 'la', 'les', 'un', 'une', 'des', 'de', 'du', 'et', 'ou', 'mais',
    'pour', 'dans', 'sur', 'avec', 'sans', 'sous', 'par', 'au', 'aux'
  ];
  tag_item text;
  word_item text;
  cleaned_word text;
BEGIN
  slug_parts := ARRAY[]::text[];
  
  -- Add cleaned tags first (most important keywords)
  IF tags_input IS NOT NULL THEN
    FOREACH tag_item IN ARRAY tags_input
    LOOP
      cleaned_word := clean_for_slug(tag_item);
      IF cleaned_word != '' AND length(cleaned_word) > 2 
         AND NOT (cleaned_word = ANY(stop_words))
         AND NOT (cleaned_word = ANY(slug_parts)) THEN
        slug_parts := array_append(slug_parts, cleaned_word);
      END IF;
      -- Limit to 10 keywords total
      EXIT WHEN array_length(slug_parts, 1) >= 10;
    END LOOP;
  END IF;
  
  -- Add words from title
  IF title_input IS NOT NULL THEN
    FOREACH word_item IN ARRAY regexp_split_to_array(title_input, E'[\\s\\-_,\\.]+')
    LOOP
      cleaned_word := clean_for_slug(word_item);
      IF cleaned_word != '' AND length(cleaned_word) > 2 
         AND NOT (cleaned_word = ANY(stop_words))
         AND NOT (cleaned_word = ANY(slug_parts)) THEN
        slug_parts := array_append(slug_parts, cleaned_word);
      END IF;
      -- Limit to 10 keywords total
      EXIT WHEN array_length(slug_parts, 1) >= 10;
    END LOOP;
  END IF;
  
  -- Join parts with hyphens
  final_slug := array_to_string(slug_parts, '-');
  
  -- If empty, fallback to cleaned title
  IF final_slug = '' OR final_slug IS NULL THEN
    final_slug := substring(clean_for_slug(title_input), 1, 60);
  END IF;
  
  -- Limit length to 60 characters
  final_slug := substring(final_slug, 1, 60);
  
  RETURN final_slug;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Backfill slugs for existing products
DO $$
DECLARE
  product_record RECORD;
  base_slug text;
  unique_slug text;
  counter integer;
  slug_exists boolean;
BEGIN
  -- Loop through all approved submissions without slugs
  FOR product_record IN 
    SELECT id, title, tags 
    FROM content_submissions 
    WHERE slug IS NULL 
    AND status = 'approved'
    ORDER BY created_at ASC
  LOOP
    -- Generate base slug
    base_slug := generate_product_slug(product_record.title, product_record.tags);
    unique_slug := base_slug;
    counter := 1;
    
    -- Ensure uniqueness
    LOOP
      SELECT EXISTS(
        SELECT 1 FROM content_submissions 
        WHERE slug = unique_slug 
        AND id != product_record.id
      ) INTO slug_exists;
      
      EXIT WHEN NOT slug_exists;
      
      unique_slug := base_slug || '-' || counter;
      counter := counter + 1;
    END LOOP;
    
    -- Update the product with the unique slug
    UPDATE content_submissions 
    SET slug = unique_slug 
    WHERE id = product_record.id;
    
    RAISE NOTICE 'Generated slug for product %: %', product_record.title, unique_slug;
  END LOOP;
END $$;

-- Add comment
COMMENT ON FUNCTION generate_product_slug(text, text[]) IS 'Generates SEO-friendly slugs from product title and tags';