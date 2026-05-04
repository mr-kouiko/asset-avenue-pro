
-- 1. Profiles: drop overly broad public policy
DROP POLICY IF EXISTS "Public can view limited creator info" ON public.profiles;

-- 2. User credits: prevent users from granting themselves balances
DROP POLICY IF EXISTS "Users can insert their own credits" ON public.user_credits;
CREATE POLICY "Users can insert their own zero credits"
ON public.user_credits
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND COALESCE(credits_balance, 0) = 0
  AND COALESCE(total_purchased, 0) = 0
  AND COALESCE(total_used, 0) = 0
);

-- Allow service role full insert (e.g. payment webhooks)
DROP POLICY IF EXISTS "Service role can insert credits" ON public.user_credits;
CREATE POLICY "Service role can insert credits"
ON public.user_credits
FOR INSERT
TO service_role
WITH CHECK (true);

-- 3. Content likes: hide per-user like rows from public, expose aggregate counts via view
DROP POLICY IF EXISTS "Anyone can view like counts" ON public.content_likes;

CREATE POLICY "Users can view their own likes"
ON public.content_likes
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE OR REPLACE VIEW public.content_like_counts
WITH (security_invoker = true) AS
SELECT submission_id, COUNT(*)::bigint AS like_count
FROM public.content_likes
GROUP BY submission_id;

GRANT SELECT ON public.content_like_counts TO anon, authenticated;

-- 4. Storage uploads bucket: enforce path ownership on insert
DROP POLICY IF EXISTS "creators_can_insert_own_files" ON storage.objects;
CREATE POLICY "creators_can_insert_own_files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'uploads'
  AND (has_role(auth.uid(), 'creator'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
  AND (storage.foldername(name))[1] = auth.uid()::text
);
