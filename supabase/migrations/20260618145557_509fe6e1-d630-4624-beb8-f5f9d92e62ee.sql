
-- 1. Drop preview-gating triggers + functions
DROP TRIGGER IF EXISTS trg_enforce_video_preview_before_approval ON public.content_submissions;
DROP TRIGGER IF EXISTS enforce_video_preview_before_approval ON public.content_submissions;
DROP TRIGGER IF EXISTS trg_auto_approve_when_preview_ready ON public.content_files;
DROP TRIGGER IF EXISTS auto_approve_when_preview_ready ON public.content_files;
DROP TRIGGER IF EXISTS trg_sync_preview_status ON public.content_files;
DROP TRIGGER IF EXISTS trg_enforce_video_preview_is_mp4 ON public.content_files;
DROP TRIGGER IF EXISTS enforce_video_preview_is_mp4 ON public.content_files;

DROP FUNCTION IF EXISTS public.enforce_video_preview_before_approval() CASCADE;
DROP FUNCTION IF EXISTS public.auto_approve_when_preview_ready() CASCADE;
DROP FUNCTION IF EXISTS public.enforce_video_preview_is_mp4() CASCADE;
DROP FUNCTION IF EXISTS public.sync_preview_status_on_preview_path() CASCADE;
DROP FUNCTION IF EXISTS public.retry_failed_preview(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.increment_preview_attempts(uuid) CASCADE;

-- 2. Promote stuck videos
UPDATE public.content_submissions
SET status = 'approved', updated_at = now()
WHERE status = 'processing_preview';

-- 3. Rewrite search_marketplace without the preview_quality gate
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
  p_free_only boolean DEFAULT false,
  p_price_min numeric DEFAULT NULL,
  p_price_max numeric DEFAULT NULL,
  p_with_people boolean DEFAULT NULL,
  p_sort text DEFAULT 'recent',
  p_offset integer DEFAULT 0,
  p_limit integer DEFAULT 40,
  p_optimal_only boolean DEFAULT false
)
RETURNS TABLE(id uuid, title text, description text, price numeric, tags text[], created_at timestamp with time zone, category_id uuid, slug text, creator_id uuid, ai_declaration text, preview_quality text, total_count bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
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
      AND EXISTS (SELECT 1 FROM content_files cf WHERE cf.submission_id = cs.id)
      AND (p_category_id IS NULL OR cs.category_id = p_category_id)
      AND (p_search IS NULL OR p_search = '' OR
           cs.title ILIKE '%' || p_search || '%' OR
           cs.description ILIKE '%' || p_search || '%' OR
           EXISTS (SELECT 1 FROM unnest(COALESCE(cs.tags, '{}')) t WHERE lower(t) LIKE '%' || lower(p_search) || '%'))
      AND (p_subject_tags IS NULL OR cs.tags && p_subject_tags)
      AND (p_style_tags IS NULL OR cs.tags && p_style_tags)
      AND (p_use_case_tags IS NULL OR cs.tags && p_use_case_tags)
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
            SELECT 1 FROM unnest(p_orientation_tags) ot
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
           (p_ai_generated = TRUE  AND cs.ai_declaration IS NOT NULL AND cs.ai_declaration != 'no_ai_used') OR
           (p_ai_generated = FALSE AND (cs.ai_declaration IS NULL OR cs.ai_declaration = 'no_ai_used')))
      AND (NOT p_free_only OR cs.price = 0)
      AND (p_price_min IS NULL OR cs.price >= p_price_min)
      AND (p_price_max IS NULL OR cs.price <= p_price_max)
  ),
  counted AS (SELECT COUNT(*) AS total FROM base)
  SELECT b.id, b.title, b.description, b.price, b.tags, b.created_at,
         b.category_id, b.slug, b.creator_id, b.ai_declaration,
         'preview_available'::text AS preview_quality,
         (SELECT total FROM counted) AS total_count
  FROM base b
  ORDER BY
    CASE WHEN p_sort = 'recent'     THEN b.created_at END DESC NULLS LAST,
    CASE WHEN p_sort = 'price_asc'  THEN b.price      END ASC  NULLS LAST,
    CASE WHEN p_sort = 'price_desc' THEN b.price      END DESC NULLS LAST,
    b.created_at DESC
  OFFSET p_offset
  LIMIT p_limit;
END;
$function$;
