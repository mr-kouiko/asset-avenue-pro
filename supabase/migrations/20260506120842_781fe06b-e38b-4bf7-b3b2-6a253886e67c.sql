
-- 1. Drop old partial index referencing 'preview_degraded'
DROP INDEX IF EXISTS public.idx_content_files_preview_quality_degraded;

-- 2. Migrate existing values: anything MP4-derived → preview_available, else no_preview
UPDATE public.content_files
SET preview_quality = CASE
  WHEN preview_path IS NOT NULL AND preview_path ~* '\.mp4($|\?)' THEN 'preview_available'
  ELSE 'no_preview'
END;

-- 3. Replace trigger function: MP4 only counts as a real preview
CREATE OR REPLACE FUNCTION public.sync_preview_status_on_preview_path()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.preview_path IS DISTINCT FROM OLD.preview_path THEN
    IF NEW.preview_path IS NOT NULL AND NEW.preview_path ~* '\.mp4($|\?)' THEN
      NEW.preview_status := 'ready';
      NEW.preview_failure_reason := NULL;
      NEW.preview_last_error := NULL;
      NEW.preview_quality := 'preview_available';
    ELSE
      NEW.preview_quality := 'no_preview';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- 4. Index for fast lookup of submissions with valid MP4 previews
CREATE INDEX IF NOT EXISTS idx_content_files_preview_available
  ON public.content_files (submission_id)
  WHERE preview_quality = 'preview_available';

-- 5. Update search_marketplace: require at least one MP4 preview per submission
CREATE OR REPLACE FUNCTION public.search_marketplace(
  p_category_id uuid DEFAULT NULL,
  p_search text DEFAULT NULL,
  p_subject_tags text[] DEFAULT NULL,
  p_style_tags text[] DEFAULT NULL,
  p_use_case_tags text[] DEFAULT NULL,
  p_orientation_tags text[] DEFAULT NULL,
  p_color_tags text[] DEFAULT NULL,
  p_effect_tags text[] DEFAULT NULL,
  p_platform_tags text[] DEFAULT NULL,
  p_ai_generated boolean DEFAULT NULL,
  p_free_only boolean DEFAULT FALSE,
  p_price_min numeric DEFAULT NULL,
  p_price_max numeric DEFAULT NULL,
  p_with_people boolean DEFAULT NULL,
  p_sort text DEFAULT 'recent',
  p_offset integer DEFAULT 0,
  p_limit integer DEFAULT 40,
  p_optimal_only boolean DEFAULT FALSE  -- kept for backward compat; no-op
)
RETURNS TABLE(
  id uuid,
  title text,
  description text,
  price numeric,
  tags text[],
  created_at timestamptz,
  category_id uuid,
  slug text,
  creator_id uuid,
  ai_declaration text,
  preview_quality text,
  total_count bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_people_tags text[] := ARRAY['people','person','portrait','man','woman','face','group','team','crowd'];
BEGIN
  RETURN QUERY
  WITH base AS (
    SELECT cs.id, cs.title, cs.description, cs.price, cs.tags, cs.created_at,
           cs.category_id, cs.slug, cs.creator_id, cs.ai_declaration
    FROM content_submissions cs
    WHERE cs.status = 'approved'
      -- STRICT: require at least one MP4 preview
      AND EXISTS (
        SELECT 1 FROM content_files cf
        WHERE cf.submission_id = cs.id
          AND cf.preview_quality = 'preview_available'
      )
      AND (p_category_id IS NULL OR cs.category_id = p_category_id)
      AND (p_search IS NULL OR p_search = '' OR
           cs.title ILIKE '%' || p_search || '%' OR
           cs.description ILIKE '%' || p_search || '%' OR
           EXISTS (SELECT 1 FROM unnest(COALESCE(cs.tags, '{}')) t WHERE lower(t) LIKE '%' || lower(p_search) || '%'))
      AND (p_subject_tags IS NULL OR cs.tags && p_subject_tags)
      AND (p_style_tags IS NULL OR cs.tags && p_style_tags)
      AND (p_use_case_tags IS NULL OR cs.tags && p_use_case_tags)
      AND (p_orientation_tags IS NULL OR cs.tags && p_orientation_tags)
      AND (p_color_tags IS NULL OR cs.tags && p_color_tags)
      AND (p_effect_tags IS NULL OR cs.tags && p_effect_tags)
      AND (p_platform_tags IS NULL OR cs.tags && p_platform_tags)
      AND (p_ai_generated IS NULL OR
           (p_ai_generated = TRUE AND cs.ai_declaration IS NOT NULL AND cs.ai_declaration != 'no_ai_used') OR
           (p_ai_generated = FALSE AND (cs.ai_declaration IS NULL OR cs.ai_declaration = 'no_ai_used')))
      AND (NOT p_free_only OR cs.price = 0)
      AND (p_price_min IS NULL OR cs.price >= p_price_min)
      AND (p_price_max IS NULL OR cs.price <= p_price_max)
      AND (p_with_people IS NULL OR
           (p_with_people = TRUE AND cs.tags && v_people_tags) OR
           (p_with_people = FALSE AND NOT (COALESCE(cs.tags, '{}') && v_people_tags)))
  ),
  counted AS (
    SELECT count(*) AS cnt FROM base
  )
  SELECT b.id, b.title, b.description, b.price, b.tags, b.created_at,
         b.category_id, b.slug, b.creator_id, b.ai_declaration,
         'preview_available'::text AS preview_quality,
         c.cnt AS total_count
  FROM base b
  CROSS JOIN counted c
  ORDER BY
    CASE p_sort
      WHEN 'recent' THEN -1 * extract(epoch FROM b.created_at)::numeric
      WHEN 'price-low' THEN COALESCE(b.price, 0)::numeric
      WHEN 'price-high' THEN -1 * COALESCE(b.price, 0)::numeric
      WHEN 'popular' THEN -1 * (
        (SELECT count(*) FROM content_likes cl WHERE cl.submission_id = b.id) +
        (SELECT count(*) FROM downloads d WHERE d.submission_id = b.id)
      )::numeric
      ELSE -1 * extract(epoch FROM b.created_at)::numeric
    END ASC NULLS LAST
  OFFSET p_offset
  LIMIT p_limit;
END;
$$;
