CREATE OR REPLACE FUNCTION public.match_similar_assets(
  query_embedding vector,
  exclude_id uuid,
  match_count integer DEFAULT 12,
  query_tags text[] DEFAULT '{}',
  prefer_type text DEFAULT NULL,
  min_similarity double precision DEFAULT 0.55,
  max_per_creator integer DEFAULT 3
)
RETURNS TABLE(id uuid, title text, slug text, price numeric, thumbnail_path text, file_type text, similarity double precision)
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $function$
  WITH pool AS (
    SELECT s.id,
           s.title,
           s.slug,
           s.price,
           s.creator_id,
           s.tags,
           f.thumbnail_path,
           f.file_type,
           1 - (e.embedding::halfvec(3072) <=> query_embedding::halfvec(3072)) AS visual_similarity
    FROM public.asset_embeddings e
    JOIN public.content_submissions s ON s.id = e.submission_id
    LEFT JOIN LATERAL (
      SELECT cf.thumbnail_path, cf.file_type
      FROM public.content_files cf
      WHERE cf.submission_id = s.id
      ORDER BY cf.created_at ASC
      LIMIT 1
    ) f ON true
    WHERE s.status = 'approved'
      AND s.id <> exclude_id
      AND f.thumbnail_path IS NOT NULL
    ORDER BY e.embedding::halfvec(3072) <=> query_embedding::halfvec(3072)
    LIMIT GREATEST(match_count * 10, 100)
  ),
  scored AS (
    SELECT p.*,
      -- AI visual embedding is the dominant signal (85%).
      p.visual_similarity * 0.85
      -- Keyword overlap only refines the ordering (max 10%).
      + CASE
          WHEN COALESCE(array_length(query_tags, 1), 0) = 0 THEN 0
          ELSE 0.10 * (
            SELECT COUNT(*)::float
            FROM unnest(COALESCE(p.tags, '{}')) t
            WHERE lower(t) = ANY (SELECT lower(q) FROM unnest(query_tags) q)
          ) / GREATEST(array_length(query_tags, 1), 1)
        END
      -- Same media family gets a light nudge (max 5%).
      + CASE
          WHEN prefer_type IS NOT NULL
           AND split_part(lower(COALESCE(p.file_type, '')), '/', 1) = split_part(lower(prefer_type), '/', 1)
          THEN 0.05 ELSE 0
        END AS score
    FROM pool p
    WHERE p.visual_similarity >= min_similarity
  ),
  ranked AS (
    SELECT s.*,
           ROW_NUMBER() OVER (PARTITION BY s.creator_id ORDER BY s.score DESC) AS creator_rank
    FROM scored s
  )
  SELECT r.id, r.title, r.slug, r.price, r.thumbnail_path, r.file_type, r.visual_similarity
  FROM ranked r
  WHERE r.creator_rank <= GREATEST(max_per_creator, 1)
  ORDER BY r.score DESC
  LIMIT match_count;
$function$;