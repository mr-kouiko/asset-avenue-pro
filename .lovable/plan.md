

## Plan: Marketplace-Style URLs for Pexels Assets

### Current State
- Pexels assets use `/pexels/photo-12345-business-team-meeting`
- Marketplace products use `/products/business-team-meeting-office`
- These are visually different URL structures, making Pexels content look external

### Proposed URL Structure
Pexels assets will use the same `/products/` prefix as marketplace content:

```text
/products/free-photo-business-team-meeting-pexels-12345
/products/free-video-sunset-ocean-waves-pexels-98765
```

The slug format: `free-{type}-{keywords}-pexels-{numericId}`

The trailing `pexels-{id}` suffix lets the system distinguish Pexels assets from database products without any ambiguity.

### Changes

**1. Update slug generator** (`src/utils/pexelsSlug.ts`)
- New function `generatePexelsProductSlug()` producing `free-photo-keywords-pexels-12345`
- New parser `parsePexelsProductSlug()` that detects the `pexels-{id}` suffix and extracts type + ID
- Keep old functions for backward compatibility

**2. Update ProductDetail page** (`src/pages/ProductDetail.tsx`)
- At the top of the component, check if the slug matches the Pexels pattern (`-pexels-\d+$`)
- If it does, render the `PexelsAssetDetail` component instead of the normal product detail
- This keeps a single route handler for `/products/:slug`

**3. Update PexelsCard** (`src/components/PexelsCard.tsx`)
- Change `navigate('/pexels/...')` to `navigate('/products/free-photo-...-pexels-123')`

**4. Update PexelsAssetDetail** (`src/pages/PexelsAssetDetail.tsx`)
- Accept the new slug format via `parsePexelsProductSlug()`
- Keep backward compatibility with old `/pexels/:slug` and `/free-photo/:id` routes

**5. Update routing** (`src/App.tsx`)
- Keep `/pexels/:slug` route as a redirect to the new `/products/` URL (301-style via `navigate(..., { replace: true })`)
- Keep `/free-photo/:id` and `/free-video/:id` legacy redirects
- No new route needed since `/products/:slug` already exists

**6. Update sitemap** (`supabase/functions/sitemap-pexels/index.ts`)
- Generate URLs as `/products/free-photo-...-pexels-123` instead of `/pexels/photo-123-...`

### Technical Details

- Detection logic in ProductDetail: `const pexelsMatch = slug?.match(/-pexels-(\d+)$/)`
- If matched, extract type from slug prefix (`free-photo-` or `free-video-`), render Pexels detail view
- If not matched, proceed with normal Supabase product lookup
- Old `/pexels/` URLs auto-redirect to preserve any existing indexed pages

### No Database Changes Required
Everything is client-side routing and slug generation.

