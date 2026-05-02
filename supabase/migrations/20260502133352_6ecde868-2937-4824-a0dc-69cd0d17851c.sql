-- =========================================================
-- 1) Make sensitive buckets PRIVATE
-- =========================================================
UPDATE storage.buckets SET public = false WHERE id IN ('uploads','original-files','ai-videos');

-- =========================================================
-- 2) Remove dangerous storage policies
-- =========================================================
DROP POLICY IF EXISTS "Everyone can view seller content" ON storage.objects;
DROP POLICY IF EXISTS "Public read ai-videos" ON storage.objects;

-- Replace ai-videos public read with owner-scoped read.
-- File path convention assumed: '<user_id>/...'
CREATE POLICY "Users can read their own ai-videos"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'ai-videos'
  AND (storage.foldername(name))[1] = (auth.uid())::text
);

-- Harden the ai-videos service-role policy
DROP POLICY IF EXISTS "Service role manages ai-videos" ON storage.objects;
CREATE POLICY "Service role manages ai-videos"
ON storage.objects
FOR ALL
TO service_role
USING (bucket_id = 'ai-videos')
WITH CHECK (bucket_id = 'ai-videos');

-- =========================================================
-- 3) Fix downloads table privilege escalation
-- =========================================================
DROP POLICY IF EXISTS "service_role_can_log_downloads" ON public.downloads;

-- =========================================================
-- 4) Remove permissive content_files exposure
-- =========================================================
DROP POLICY IF EXISTS "public_can_view_product_files" ON public.content_files;

-- =========================================================
-- 5) Replace spoofable current_setting('role') checks with auth.role()
-- =========================================================

-- ai_video_generations
DROP POLICY IF EXISTS "Service role manages video generations" ON public.ai_video_generations;
CREATE POLICY "Service role manages video generations"
ON public.ai_video_generations FOR ALL TO service_role
USING (true) WITH CHECK (true);

-- integrity_issues
DROP POLICY IF EXISTS "Service role can manage integrity issues" ON public.integrity_issues;
CREATE POLICY "Service role can manage integrity issues"
ON public.integrity_issues FOR ALL TO service_role
USING (true) WITH CHECK (true);

-- integrity_scans
DROP POLICY IF EXISTS "Service role can manage integrity scans" ON public.integrity_scans;
CREATE POLICY "Service role can manage integrity scans"
ON public.integrity_scans FOR ALL TO service_role
USING (true) WITH CHECK (true);

-- payout_requests
DROP POLICY IF EXISTS "Service role manages payouts" ON public.payout_requests;
CREATE POLICY "Service role manages payouts"
ON public.payout_requests FOR ALL TO service_role
USING (true) WITH CHECK (true);

-- payouts
DROP POLICY IF EXISTS "Service role can manage payouts" ON public.payouts;
CREATE POLICY "Service role can manage payouts"
ON public.payouts FOR ALL TO service_role
USING (true) WITH CHECK (true);

-- paypal_orders
DROP POLICY IF EXISTS "Service role can manage orders" ON public.paypal_orders;
CREATE POLICY "Service role can manage orders"
ON public.paypal_orders FOR ALL TO service_role
USING (true) WITH CHECK (true);

-- platform_settings
DROP POLICY IF EXISTS "Service role only access for edge functions" ON public.platform_settings;
CREATE POLICY "Service role only access for edge functions"
ON public.platform_settings FOR SELECT TO service_role
USING (true);

-- product_translations
DROP POLICY IF EXISTS "Service role can manage translations" ON public.product_translations;
CREATE POLICY "Service role can manage translations"
ON public.product_translations FOR ALL TO service_role
USING (true) WITH CHECK (true);

-- secure_downloads
DROP POLICY IF EXISTS "Service role can manage secure downloads" ON public.secure_downloads;
CREATE POLICY "Service role can manage secure downloads"
ON public.secure_downloads FOR ALL TO service_role
USING (true) WITH CHECK (true);

-- seller_earnings
DROP POLICY IF EXISTS "Service role manages earnings" ON public.seller_earnings;
CREATE POLICY "Service role manages earnings"
ON public.seller_earnings FOR ALL TO service_role
USING (true) WITH CHECK (true);

-- seo_audit_log
DROP POLICY IF EXISTS "Service role access to seo_audit_log" ON public.seo_audit_log;
CREATE POLICY "Service role access to seo_audit_log"
ON public.seo_audit_log FOR ALL TO service_role
USING (true) WITH CHECK (true);

-- seo_metadata
DROP POLICY IF EXISTS "Service role access to seo_metadata" ON public.seo_metadata;
CREATE POLICY "Service role access to seo_metadata"
ON public.seo_metadata FOR ALL TO service_role
USING (true) WITH CHECK (true);

-- seo_scans
DROP POLICY IF EXISTS "Service role access to seo_scans" ON public.seo_scans;
CREATE POLICY "Service role access to seo_scans"
ON public.seo_scans FOR ALL TO service_role
USING (true) WITH CHECK (true);

-- stripe_accounts
DROP POLICY IF EXISTS "Service role can manage Stripe accounts" ON public.stripe_accounts;
CREATE POLICY "Service role can manage Stripe accounts"
ON public.stripe_accounts FOR ALL TO service_role
USING (true) WITH CHECK (true);

-- transactions
DROP POLICY IF EXISTS "Service role can manage transactions" ON public.transactions;
CREATE POLICY "Service role can manage transactions"
ON public.transactions FOR ALL TO service_role
USING (true) WITH CHECK (true);

-- user_subscriptions
DROP POLICY IF EXISTS "Service role can manage subscriptions" ON public.user_subscriptions;
CREATE POLICY "Service role can manage subscriptions"
ON public.user_subscriptions FOR ALL TO service_role
USING (true) WITH CHECK (true);

-- videoai_credits
DROP POLICY IF EXISTS "Service role manages videoai credits" ON public.videoai_credits;
CREATE POLICY "Service role manages videoai credits"
ON public.videoai_credits FOR ALL TO service_role
USING (true) WITH CHECK (true);

-- videoai_transactions
DROP POLICY IF EXISTS "Service role manages videoai transactions" ON public.videoai_transactions;
CREATE POLICY "Service role manages videoai transactions"
ON public.videoai_transactions FOR ALL TO service_role
USING (true) WITH CHECK (true);