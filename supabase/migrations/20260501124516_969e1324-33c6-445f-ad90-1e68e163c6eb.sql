CREATE TABLE public.pexels_downloads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pexels_id BIGINT NOT NULL,
  media_type TEXT NOT NULL CHECK (media_type IN ('photo', 'video')),
  author TEXT,
  downloaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.pexels_downloads ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_pexels_downloads_user_date
  ON public.pexels_downloads (user_id, downloaded_at DESC);

CREATE POLICY "Users insert own pexels downloads"
ON public.pexels_downloads
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users view own pexels downloads"
ON public.pexels_downloads
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins view all pexels downloads"
ON public.pexels_downloads
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));