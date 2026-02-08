
## What’s happening (why “MediaVista Stock” still doesn’t show)
On the public homepage/marketplace (when you are not logged in), the app tries to read creator names from `public.profiles`:

- `useMarketplace.tsx` does: `supabase.from('profiles').select('user_id, store_name, display_name')...`
- But anonymous users do **not** have `SELECT` permission on `profiles` (it was explicitly revoked as a security hardening step).
- In the network logs, those requests fail with **401** / `permission denied for table profiles`.

When that “profiles” fetch fails, the code builds an empty `creatorMap`, and it falls back to:
- `author: creatorMap.get(item.creator_id) || 'Anonymous Store'`

Same root cause also explains:
- Seller link leading to **Seller Not Found** (SellerPortfolio calls `rpc('get_creator_profiles_public')`, which currently also ends up touching `profiles` and fails for anon).

## Goal
Show the real creator name publicly (Store name first, then Display name) **without** reopening public access to sensitive `profiles` columns (email, paypal_email, etc.).

## Preferred fix (secure + consistent)
### A) Backend: add/adjust a “public-safe” RPC that works for anon
Create (or modify) a Supabase SQL function that:
- Is **SECURITY DEFINER**
- Returns **only safe fields**: `user_id, store_name, display_name, avatar_url`
- Filters to only creators who actually have approved content
- Is executable by `anon` and `authenticated`

This avoids granting `SELECT` on the whole `profiles` table to anonymous users (which would expose all columns on any row they can see).

Concretely:
1. Add a new migration (or update an existing one) to create:
   - `public.get_creator_public_info(creator_ids uuid[])`
   - Implementation reads `profiles` internally and returns only safe columns.
   - Ensure `GRANT EXECUTE ON FUNCTION ... TO anon, authenticated`.

2. Ensure the function applies the creator visibility rule:
   - user has role `creator` (or has approved submissions), and
   - has at least one `content_submissions.status='approved'`.

### B) Frontend: stop querying `profiles` directly on public pages
Update code paths that currently hit `profiles` from the browser:

1. `src/hooks/useMarketplace.tsx`
   - Replace both creator fetches:
     - in `fetchMarketplaceContent` and in `backgroundRefresh`
   - Use the new RPC:
     - build `creatorMap` from results
   - Use consistent fallback: `store_name || display_name || 'Anonymous Store'`

2. `src/hooks/useProductDetail.tsx`
   - Remove/avoid direct `.from('profiles')...` calls (these will fail for anon).
   - When you have `creator_id`, call the same public RPC to get:
     - `store_name/display_name` (for author label)
     - `avatar_url` (for author avatar)
   - Keep author fallback consistent.

3. `src/pages/SellerPortfolio.tsx`
   - Replace `rpc('get_creator_profiles_public')` usage with the new RPC (or adjust DB so existing RPC works).
   - This ensures Seller pages load for anonymous users and don’t show “Seller Not Found”.

4. Also update any other public widgets that use creator RPCs and may be failing for anon:
   - `src/hooks/useTrendingContent.tsx`
   - `src/hooks/useFreeContent.tsx`
   (Both currently call `get_creator_profiles_public`, which is failing in anon context right now.)

## Implementation details (important)
### Security note (why we do SECURITY DEFINER RPC instead of granting profiles SELECT)
- `profiles` contains sensitive columns (email, paypal_email, country).
- If we grant anon `SELECT` on `profiles`, RLS restricts rows, but **does not hide columns**.
- So the safe pattern is: keep `profiles` locked down, and expose only sanitized creator info through a definer function.

### Name display rule (site-wide)
Standardize everywhere to:
1) `store_name` (preferred brand identity)
2) `display_name`
3) `'Anonymous Store'`

## Files / artifacts that will change
### Frontend
- `src/hooks/useMarketplace.tsx`
- `src/hooks/useProductDetail.tsx`
- `src/pages/SellerPortfolio.tsx`
- `src/hooks/useTrendingContent.tsx`
- `src/hooks/useFreeContent.tsx`

### Database (migration)
- Add new migration SQL file under `supabase/migrations/` to define the SECURITY DEFINER public creator-info function (and grant execute to anon/authenticated).

## Verification checklist (end-to-end)
1. Open the site in an incognito window (logged out).
2. Go to `/` marketplace tiles:
   - Creator for the audio product shows “MediaVista Stock” (not Anonymous Store).
3. Click the creator link:
   - `/seller/:creatorHash` loads, shows the correct store header and products.
4. Open a product detail page while logged out:
   - Author name shows “MediaVista Stock”
   - Avatar shows if set
5. Confirm no direct browser calls to `/rest/v1/profiles` for public pages (Network tab should not show permission denied for profiles).

## Fallback option (not recommended, but simplest)
Grant `SELECT` on `profiles` to anon and rely on RLS.
I’m not proposing to do this because it risks exposing email/paypal_email columns to the public if a row is readable.

## Expected result
- “MediaVista Stock” displays correctly everywhere for logged-out visitors.
- Seller pages stop returning “Seller Not Found”.
- We keep `profiles` protected from public access to sensitive fields.
