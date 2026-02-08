# Plan: Fix Creator Name Display for Anonymous Users

## Status: ✅ COMPLETED

## Summary
Fixed the "Anonymous Store" issue and "Seller Not Found" error for logged-out users by:
1. Created secure SECURITY DEFINER RPC functions that work for anonymous users
2. Updated all frontend hooks to use the new RPCs instead of direct profile queries

## Changes Made

### Database (Migration)
- Created `get_creator_public_info(creator_ids uuid[])` - SECURITY DEFINER function
- Fixed `get_creator_profiles_public()` - SECURITY DEFINER function  
- Both functions only return safe fields: `user_id, store_name, display_name, avatar_url`
- Both are executable by `anon` and `authenticated` roles

### Frontend Files Updated
- `src/hooks/useMarketplace.tsx` - Uses `get_creator_public_info` RPC
- `src/hooks/useProductDetail.tsx` - Uses `get_creator_public_info` RPC
- `src/hooks/useTrendingContent.tsx` - Uses `get_creator_public_info` RPC
- `src/hooks/useFreeContent.tsx` - Uses `get_creator_public_info` RPC
- `src/pages/SellerPortfolio.tsx` - Already uses `get_creator_profiles_public()` (now fixed)

### Name Display Priority (Standardized)
1. `store_name` (preferred brand identity)
2. `display_name`
3. `'Anonymous Store'` (fallback)

## Verification
1. Open site in incognito (logged out)
2. Marketplace tiles should show real creator names (e.g., "MediaVista Stock")
3. Clicking creator link should load seller page correctly
4. Product detail pages should show correct author name and avatar
