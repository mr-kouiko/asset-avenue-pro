# Multi-Language Support Plan (No AI Credits)

Add support for **5 languages**: English (default), French, Spanish, German, Portuguese — using free LibreTranslate, with **path-prefix URLs** (`/fr/marketplace`, `/es/products/...`) for proper SEO.

## What changes

### 1. URL routing (`/xx/` prefix)
- English stays at root (`/marketplace`) — keeps existing SEO intact
- Other languages get prefix: `/fr/marketplace`, `/es/marketplace`, `/de/marketplace`, `/pt/marketplace`
- Update `LanguageRedirect.tsx` to detect prefix and set language; remove forced English-only redirect
- Update `BrowserRouter` config in `App.tsx` to handle prefixed routes (wrap in `:lang?` param or duplicate route tree)
- Add `<link rel="alternate" hreflang="...">` tags in `SEOHead.tsx` for each language variant

### 2. UI translations (manual, free)
Restructure `LanguageContext.tsx`:
- Split dictionaries into separate files: `src/i18n/en.ts`, `fr.ts`, `es.ts`, `de.ts`, `pt.ts`
- Move existing `en` keys + add equivalents in 4 other languages (initially via DeepL Free / Google Translate web — done by you or me, not via API)
- Re-enable real `setLanguage()` (currently locked to `en`)
- Persist choice in `localStorage` + sync with URL prefix
- Audit ~15 main pages and wrap visible strings with `t()` (Header, Navigation, Marketplace, ProductDetail, Footer, Auth, Cart, Checkout, Dashboard, etc.)

### 3. Language switcher UI
- Add dropdown in `Header.tsx` (flag + language name)
- Also add to `MobileMenu.tsx` drawer
- Switching language rewrites URL to add/remove prefix and reloads route

### 4. Product translations (LibreTranslate batch)
Your `product_translations` table + `scripts/batch-translate-products.js` already exist. We will:
- Extend the script to loop over all 4 target languages (`fr`, `es`, `de`, `pt`)
- Translate `title`, `description`, and each `tag`
- Store results in `product_translations` (one row per product × language)
- Add a **trigger Edge Function** (`auto-translate-product`) called when a new submission is approved → translates it into all 4 languages automatically, so new uploads stay multilingual without manual reruns

### 5. Frontend product display
- Update `useProductDetail.tsx`, `useMarketplace.tsx`, `ContentCard.tsx` to fetch `product_translations` joined by current language
- Fallback to original English if no translation row exists
- Update SEO meta (title/description) to use translated values per language

### 6. SEO
- Generate per-language sitemaps (`/sitemap-fr.xml`, etc.) — extend the existing prerender Edge Function
- Update `robots.txt` to reference all sitemaps
- `hreflang` cross-links between language versions of each product page

## Memories to update
- Replace core rule "Strictly USD ($). No EUR or localization." → keep USD, drop the "no localization" part
- Update "Legal Contact & Policies" memory: legal pages will also be translated (or note that they remain English-only — your call)
- Add new memory `i18n/multi-language-system` documenting the architecture

## What stays in English only
- Pexels SEO programmatic content (already AI-generated, retranslating would balloon DB)
- Admin dashboards (internal use)
- Email templates (per existing memory)
- Legal pages (recommended — translated legal text creates liability unless professionally reviewed)

## Cost
- **AI credits used: 0**
- LibreTranslate free public instance (`libretranslate.de`) — rate-limited but sufficient for batch overnight runs
- If their public instance is flaky, fallback to **MyMemory API** (free, 1000 words/day anonymous, ~50k with email)
- Manual UI dictionary work: ~200-300 strings × 4 languages, one-time

## Technical notes
- Router pattern: use `useParams()` with `/:lang?/...` wrapper, validate `lang` against `['fr','es','de','pt']`
- `LanguageProvider` reads URL first, then `localStorage`, then browser `navigator.language`
- Translation fetching: single query `SELECT * FROM product_translations WHERE product_id IN (...) AND language = $1` joined client-side
- Auto-translate Edge Function triggered by DB webhook on `content_submissions` status → 'approved'

## Rollout order
1. Schema/backend: extend batch script + create auto-translate Edge Function
2. Routing: add `/:lang?/` prefix support + `LanguageRedirect` rewrite
3. i18n files: create `en/fr/es/de/pt.ts` dictionaries (start with current `en` keys)
4. Wire `t()` into Header/Navigation/Footer/Marketplace/ProductDetail
5. Add language switcher UI
6. Run batch translation on existing products
7. Add hreflang + per-language sitemaps
8. Update memories

Confirm and I'll start implementing.