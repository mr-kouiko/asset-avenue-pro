
ALTER TABLE public.ai_image_generations
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'success',
  ADD COLUMN IF NOT EXISTS error_message text,
  ADD COLUMN IF NOT EXISTS source_image_url text,
  ADD COLUMN IF NOT EXISTS action text;

CREATE INDEX IF NOT EXISTS idx_ai_image_generations_created_at ON public.ai_image_generations (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_image_generations_user_created ON public.ai_image_generations (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_downloads_downloaded_at ON public.downloads (downloaded_at DESC);
CREATE INDEX IF NOT EXISTS idx_pexels_downloads_downloaded_at ON public.pexels_downloads (downloaded_at DESC);

-- Allow admins to read all AI edit logs for analytics
DROP POLICY IF EXISTS "Admins can view all ai image generations" ON public.ai_image_generations;
CREATE POLICY "Admins can view all ai image generations"
ON public.ai_image_generations
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to read all download logs for analytics
DROP POLICY IF EXISTS "Admins can view all downloads" ON public.downloads;
CREATE POLICY "Admins can view all downloads"
ON public.downloads
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can view all pexels downloads" ON public.pexels_downloads;
CREATE POLICY "Admins can view all pexels downloads"
ON public.pexels_downloads
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));
