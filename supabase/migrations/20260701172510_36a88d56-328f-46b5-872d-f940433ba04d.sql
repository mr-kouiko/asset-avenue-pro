CREATE TABLE IF NOT EXISTS public.blog_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  excerpt text NOT NULL,
  content text NOT NULL,
  category text NOT NULL,
  tags text[] NOT NULL DEFAULT '{}',
  author text NOT NULL DEFAULT 'VisuStock AI Editorial',
  author_role text NOT NULL DEFAULT 'AI Content Team',
  author_avatar text DEFAULT 'https://visustock.com/favicon.png',
  author_bio text DEFAULT 'The VisuStock editorial team covers AI visuals, stock footage, creative trends and prompt engineering for modern creators.',
  hero_image text NOT NULL,
  read_time integer NOT NULL DEFAULT 6,
  seo_title text,
  meta_description text,
  keywords text[] NOT NULL DEFAULT '{}',
  featured boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'published',
  published_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS blog_posts_published_at_idx ON public.blog_posts (published_at DESC);
CREATE INDEX IF NOT EXISTS blog_posts_category_idx ON public.blog_posts (category);
CREATE INDEX IF NOT EXISTS blog_posts_status_idx ON public.blog_posts (status);

GRANT SELECT ON public.blog_posts TO anon, authenticated;
GRANT ALL ON public.blog_posts TO service_role;

ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read published posts" ON public.blog_posts;
CREATE POLICY "Public read published posts"
ON public.blog_posts FOR SELECT
USING (status = 'published');

DROP POLICY IF EXISTS "Admins manage posts" ON public.blog_posts;
CREATE POLICY "Admins manage posts"
ON public.blog_posts FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.blog_posts_touch_updated_at()
RETURNS trigger LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS blog_posts_touch ON public.blog_posts;
CREATE TRIGGER blog_posts_touch BEFORE UPDATE ON public.blog_posts
FOR EACH ROW EXECUTE FUNCTION public.blog_posts_touch_updated_at();

DO $$ BEGIN PERFORM cron.unschedule('generate-blog-post-tue'); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN PERFORM cron.unschedule('generate-blog-post-fri'); EXCEPTION WHEN OTHERS THEN NULL; END $$;

SELECT cron.schedule(
  'generate-blog-post-tue',
  '0 10 * * 2',
  $$ SELECT net.http_post(
    url:='https://kdgfpophpoqugtuvfxqx.supabase.co/functions/v1/generate-blog-post',
    headers:='{"Content-Type":"application/json"}'::jsonb,
    body:='{"trigger":"cron-tue"}'::jsonb
  ); $$
);

SELECT cron.schedule(
  'generate-blog-post-fri',
  '0 10 * * 5',
  $$ SELECT net.http_post(
    url:='https://kdgfpophpoqugtuvfxqx.supabase.co/functions/v1/generate-blog-post',
    headers:='{"Content-Type":"application/json"}'::jsonb,
    body:='{"trigger":"cron-fri"}'::jsonb
  ); $$
);