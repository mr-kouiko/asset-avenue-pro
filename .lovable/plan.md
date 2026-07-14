# Quick View Modal — Implementation Plan

Adds a reusable Quick View overlay to marketplace results so users can browse assets without navigating away. Standalone `/products/[slug]` pages remain untouched (SEO, sharing, canonicals preserved).

## Scope

In: Marketplace grid → Quick View modal for photos, videos, audio, vectors, ebooks. Keyboard + mobile swipe nav. URL sync via `?asset=<slug>`. Prev/Next across current results. Reuse of existing player/pricing/favorite/share components.

Out (future-ready hooks only): AI Remix/Upscale/Variations, Comments, Follow, Recently Viewed.

## Architecture

```text
src/components/quickview/
  QuickViewProvider.tsx     — context: openQuickView(slug, list), close, next, prev
  QuickViewModal.tsx        — Dialog shell, URL sync, keyboard, focus trap, swipe
  QuickViewContent.tsx      — fetches product via useProductDetail(slug), routes to viewer
  viewers/
    PhotoViewer.tsx         — zoom + wheel (reuse WatermarkedGallery)
    VideoViewer.tsx         — reuse VideoPlayer + VideoWatermark
    AudioViewer.tsx         — reuse AudioHeroPlayer (auto-stops via AudioPlayerContext)
    EbookViewer.tsx         — cover + metadata
    VectorViewer.tsx        — PhotoViewer variant
  QuickViewSidebar.tsx      — title, price, license selector, buy/fav/share, keywords, specs, creator
  QuickViewRelated.tsx      — reuses existing "More from creator" + "Similar" queries, horizontal scroll, click updates modal in place
  QuickViewNav.tsx          — prev/next buttons
```

- `QuickViewProvider` mounted once in `App.tsx` above routes.
- Marketplace grid cards: intercept click → `openQuickView(slug, orderedSlugs)` instead of `<Link>` navigation. Cmd/Ctrl+click and middle-click still open standalone page.
- `useProductDetail(slug)` (existing hook) supplies data — no duplicated business logic. React Query caches; provider prefetches prev/next slugs on open.
- URL: `history.pushState` adds `?asset=<slug>`; close → `history.back()` if entry is ours, else `replaceState` strip. Refresh with `?asset=` re-opens.
- Modal uses shadcn `Dialog` with a light `bg-background/40` scrim (not dark), rounded panel, 200ms fade+scale.
- Mobile: full-screen sheet, `react-swipeable` (or lightweight touch handler) for left/right nav + swipe-down close.
- Focus trap + ARIA labels via Radix Dialog defaults; `aria-label` on nav buttons.

## Data flow per asset switch

1. `next()` updates internal `currentSlug` state → `useProductDetail` runs against cache (prefetched) → viewer swaps.
2. Search page never remounts (provider lives above `<Routes>`).
3. Related items reuse existing queries from `ProductDetail`; clicking calls `openQuickView(slug, relatedSlugs)`.

## SEO

No changes to product routes, sitemap, prerender, canonicals, or JSON-LD. Quick View is client-only; `?asset=` param is not added to sitemap.

## Files to add
- 8 files under `src/components/quickview/`

## Files to edit
- `src/App.tsx` — wrap routes in `<QuickViewProvider>` + render `<QuickViewModal/>`
- `src/pages/Marketplace.tsx` — pass ordered slug list to grid, intercept card click
- `src/components/ContentCard.tsx`, `AudioContentCard.tsx` — accept optional `onQuickView` handler
- `src/i18n/{en,fr,es,de,pt}.ts` — add `qv.*` keys (close, next, prev, loading, viewFullPage)

## Non-goals / preserved
- Standalone `/products/[slug]` unchanged.
- Existing hooks (`useProductDetail`, `useFavorites`, `useCart`, pricing, download, share) reused as-is.
- No new API endpoints, no DB changes.

## Test checklist
- Click card → modal opens, URL gains `?asset=`, grid stays mounted (verify via React DevTools / no scroll jump).
- Arrow keys + Prev/Next cycle through visible results; audio auto-stops on switch.
- Esc / back button closes, URL restored, scroll preserved.
- Cmd+click still opens `/products/slug` in new tab.
- Mobile: swipe nav + full-screen layout on 375px viewport.
- Refresh with `?asset=slug` reopens modal on top of results.
