create extension if not exists vector;

CREATE TABLE IF NOT EXISTS public.asset_embeddings (
  submission_id uuid PRIMARY KEY REFERENCES public.content_submissions(id) ON DELETE CASCADE,
  embedding vector(3072) NOT NULL,
  model text NOT NULL DEFAULT 'google/gemini-embedding-2',
  source text NOT NULL DEFAULT 'image',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.asset_embeddings TO anon;
GRANT SELECT ON public.asset_embeddings TO authenticated;
GRANT ALL ON public.asset_embeddings TO service_role;

ALTER TABLE public.asset_embeddings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Embeddings are publicly readable"
ON public.asset_embeddings FOR SELECT
USING (true);

CREATE POLICY "Service role manages embeddings"
ON public.asset_embeddings FOR ALL
TO service_role
USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS asset_embeddings_hnsw_idx
  ON public.asset_embeddings using hnsw ((embedding::halfvec(3072)) halfvec_cosine_ops);

CREATE OR REPLACE FUNCTION public.match_similar_assets(
  query_embedding vector(3072),
  exclude_id uuid,
  match_count int DEFAULT 12
)
RETURNS TABLE (
  id uuid,
  title text,
  slug text,
  price numeric,
  thumbnail_path text,
  file_type text,
  similarity float
)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT s.id,
         s.title,
         s.slug,
         s.price,
         f.thumbnail_path,
         f.file_type,
         1 - (e.embedding::halfvec(3072) <=> query_embedding::halfvec(3072)) AS similarity
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
  ORDER BY e.embedding::halfvec(3072) <=> query_embedding::halfvec(3072)
  LIMIT match_count;
$$;

GRANT EXECUTE ON FUNCTION public.match_similar_assets(vector, uuid, int) TO anon, authenticated, service_role;