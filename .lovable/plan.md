

## Plan: AI-Generated Unique SEO Content for Pexels Asset Pages

### Problem
Current Pexels detail pages have thin, templated content — just a short paragraph with the alt text repeated. Every page looks nearly identical, which hurts SEO rankings.

### Approach
Use a **Supabase Edge Function** to generate rich, unique SEO content per Pexels asset at request time, then cache it. The frontend will call this function when rendering a Pexels detail page and display the structured content sections.

### Architecture

```text
PexelsAssetDetail
  ├── fetches Pexels item (existing)
  ├── calls generate-pexels-seo edge function with item data
  │     ├── checks cache (Supabase table) → return if exists
  │     └── calls AI gateway to generate unique content
  │           └── stores in cache table → returns content
  └── renders rich SEO sections from response
```

### Changes

**1. New Supabase table: `pexels_seo_content`**
- Migration to create a cache table storing generated SEO content per Pexels asset
- Columns: `pexels_id` (int, PK), `type` (text), `seo_title`, `meta_description`, `h1`, `intro`, `main_content`, `about_section` (jsonb), `use_cases` (text[]), `visual_style` (text[]), `keywords` (text[]), `created_at`
- This ensures content is generated once and reused

**2. New Edge Function: `generate-pexels-seo`**
- Input: Pexels item data (alt, photographer, dimensions, type)
- Check `pexels_seo_content` table first; return cached if exists
- If not cached, use the AI gateway to generate all content sections per the spec
- Store result in table and return
- System prompt enforces the strict output format: unique, no Pexels mentions in main content, natural language, use-case bullets, visual style descriptors, long-tail keywords

**3. New hook: `usePexelsSEOContent`** (`src/hooks/usePexelsSEOContent.tsx`)
- Calls the edge function with the Pexels item data
- Returns loading state + structured SEO content object
- Caches in memory so re-renders don't re-fetch

**4. Refactor `PexelsAssetDetail.tsx`** — Rich content sections
- Replace the thin "About this photo" paragraph with full structured sections:
  - **H1**: Use AI-generated H1 instead of raw alt text
  - **Intro**: 2-3 sentence scene description
  - **Main Content**: 300-500 word unique article body
  - **📍 About this photo**: Location, subject, style card
  - **🎯 Best use cases**: Bullet list
  - **🎨 Visual style**: Descriptor badges
  - **🏷 Related keywords**: Tag cloud linking to marketplace search
  - **Why download from us?**: Differentiation block
- Update `useSEO` call to use AI-generated `seo_title` and `meta_description`

**5. Update `PexelsSchemaOrg.tsx`**
- Use AI-generated description instead of templated one
- Add keywords to structured data

**6. Update internal links section**
- Generate dynamic "Related photos" links from keywords (link to `/marketplace?search={keyword}`)
- Generate "Explore more" category links based on detected subject matter

### SEO Content Generation Prompt (Edge Function)
The edge function will send the Pexels item metadata to the AI with a strict system prompt that enforces:
- 100% unique content per asset
- No mention of "Pexels" in main content body
- Natural language, not spammy
- Structured JSON output matching the schema

### Performance
- First visit: ~2-3s to generate (AI call), then cached permanently in DB
- Subsequent visits: instant (DB lookup)
- Fallback: if AI generation fails, show current templated content as-is

### Files to Create/Edit
- **Create**: `supabase/migrations/xxx_create_pexels_seo_content.sql`
- **Create**: `supabase/functions/generate-pexels-seo/index.ts`
- **Create**: `src/hooks/usePexelsSEOContent.tsx`
- **Edit**: `src/pages/PexelsAssetDetail.tsx` — render rich content sections
- **Edit**: `src/components/pexels/PexelsSchemaOrg.tsx` — use generated description
- **Edit**: `src/components/pexels/PexelsDetailSidebar.tsx` — add keywords/style badges

