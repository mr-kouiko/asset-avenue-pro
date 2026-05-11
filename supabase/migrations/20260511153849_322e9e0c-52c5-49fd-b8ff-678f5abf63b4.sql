-- 1) Add width/height columns to content_submissions
ALTER TABLE public.content_submissions
  ADD COLUMN IF NOT EXISTS width  integer,
  ADD COLUMN IF NOT EXISTS height integer;

-- 2) Index for orientation filtering
CREATE INDEX IF NOT EXISTS idx_content_submissions_dimensions
  ON public.content_submissions (width, height)
  WHERE width IS NOT NULL AND height IS NOT NULL;

-- 3) Backfill from content_files.metadata where present (width/height/videoWidth/videoHeight)
UPDATE public.content_submissions cs
SET
  width  = COALESCE(cs.width,  NULLIF(GREATEST(
             COALESCE((cf.metadata->>'width')::int, 0),
             COALESCE((cf.metadata->>'videoWidth')::int, 0)
           ), 0)),
  height = COALESCE(cs.height, NULLIF(GREATEST(
             COALESCE((cf.metadata->>'height')::int, 0),
             COALESCE((cf.metadata->>'videoHeight')::int, 0)
           ), 0))
FROM public.content_files cf
WHERE cf.submission_id = cs.id
  AND cf.is_original = true
  AND (cs.width IS NULL OR cs.height IS NULL);

-- 4) Replace search_marketplace: orientation filter now uses aspect ratio when known.
CREATE OR REPLACE FUNCTION public.search_marketplace(
  p_category_id uuid DEFAULT NULL::uuid,
  p_search text DEFAULT NULL::text,
  p_subject_tags text[] DEFAULT NULL::text[],
  p_style_tags text[] DEFAULT NULL::text[],
  p_use_case_tags text[] DEFAULT NULL::text[],
  p_orientation_tags text[] DEFAULT NULL::text[],
  p_color_tags text[] DEFAULT NULL::text[],
  p_effect_tags text[] DEFAULT NULL::text[],
  p_platform_tags text[] DEFAULT NULL::text[],
  p_ai_generated boolean DEFAULT NULL::boolean,
  p_free_only boolean DEFAULT false,
  p_price_min numeric DEFAULT NULL::numeric,
  p_price_max numeric DEFAULT NULL::numeric,
  p_with_people boolean DEFAULT NULL::boolean,
  p_sort text DEFAULT 'recent'::text,
  p_offset integer DEFAULT 0,
  p_limit integer DEFAULT 40,
  p_optimal_only boolean DEFAULT false
)
 RETURNS TABLE(id uuid, title text, description text, price numeric, tags text[], created_at timestamp with time zone, category_id uuid, slug text, creator_id uuid, ai_declaration text, preview_quality text, total_count bigint)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_people_tags text[] := ARRAY['people','person','portrait','man','woman','face','group','team','crowd'];
  v_want_vertical   boolean := p_orientation_tags IS NOT NULL AND 'vertical'   = ANY(p_orientation_tags);
  v_want_horizontal boolean := p_orientation_tags IS NOT NULL AND 'horizontal' = ANY(p_orientation_tags);
  v_want_square     boolean := p_orientation_tags IS NOT NULL AND 'square'     = ANY(p_orientation_tags);
  v_want_panoramic  boolean := p_orientation_tags IS NOT NULL AND 'panoramic'  = ANY(p_orientation_tags);
BEGIN
  RETURN QUERY
  WITH base AS (
    SELECT cs.id, cs.title, cs.description, cs.price, cs.tags, cs.created_at,
           cs.category_id, cs.slug, cs.creator_id, cs.ai_declaration,
           cs.width, cs.height
    FROM content_submissions cs
    WHERE cs.status = 'approved'
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
      -- ORIENTATION: prefer real dimensions; fallback to substring tag/title match.
      AND (
        p_orientation_tags IS NULL
        OR (
          cs.width IS NOT NULL AND cs.height IS NOT NULL AND cs.width > 0 AND cs.height > 0
          AND (
            (v_want_vertical   AND cs.height::numeric / cs.width::numeric >= 1.05)
            OR (v_want_horizontal AND cs.width::numeric / cs.height::numeric >= 1.05 AND cs.width::numeric / cs.height::numeric < 2.2)
            OR (v_want_square     AND ABS(cs.width::numeric / cs.height::numeric - 1.0) < 0.05)
            OR (v_want_panoramic  AND cs.width::numeric / cs.height::numeric >= 2.2)
          )
        )
        OR (
          (cs.width IS NULL OR cs.height IS NULL)
          AND EXISTS (
            SELECT 1
            FROM unnest(p_orientation_tags) ot
            WHERE cs.title ILIKE '%' || ot || '%'
               OR cs.description ILIKE '%' || ot || '%'
               OR EXISTS (
                 SELECT 1 FROM unnest(COALESCE(cs.tags, '{}')) t
                 WHERE lower(t) LIKE '%' || lower(ot) || '%'
               )
          )
        )
      )
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
$function$;