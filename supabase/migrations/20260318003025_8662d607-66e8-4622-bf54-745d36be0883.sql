CREATE TABLE public.pexels_seo_content (
  pexels_id bigint NOT NULL,
  type text NOT NULL DEFAULT 'photo',
  seo_title text,
  meta_description text,
  h1 text,
  intro text,
  main_content text,
  about_section jsonb,
  use_cases text[],
  visual_style text[],
  keywords text[],
  internal_links jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (pexels_id, type)
);

ALTER TABLE public.pexels_seo_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read pexels SEO content"
  ON public.pexels_seo_content
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Service role can insert pexels SEO content"
  ON public.pexels_seo_content
  FOR INSERT
  TO service_role
  WITH CHECK (true);