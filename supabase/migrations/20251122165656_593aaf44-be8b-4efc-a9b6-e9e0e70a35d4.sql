-- Fix search_path for the slug generation functions to prevent security issues

-- Recreate clean_for_slug with secure search_path
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
$$ LANGUAGE plpgsql IMMUTABLE SECURITY DEFINER
SET search_path = public, pg_temp;

-- Recreate generate_product_slug with secure search_path
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
$$ LANGUAGE plpgsql IMMUTABLE SECURITY DEFINER
SET search_path = public, pg_temp;