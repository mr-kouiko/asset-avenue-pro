

# Update All 2024 Dates to 2026

VisuStock launched in 2026 - all references to 2024 must be updated for brand consistency.

## Files to Update

### 1. Legal Pages (English) - "Last updated" dates

| File | Current | Updated |
|------|---------|---------|
| `src/pages/en/CookiePolicyEN.tsx` | January 15, 2024 | January 15, 2026 |
| `src/pages/en/PrivacyPolicyEN.tsx` | January 15, 2024 | January 15, 2026 |
| `src/pages/en/TermsEN.tsx` | January 15, 2024 | January 15, 2026 |
| `src/pages/en/LicenseAgreementEN.tsx` | January 15, 2024 | January 15, 2026 |

---

### 2. Copyright Notices

| File | Current | Updated |
|------|---------|---------|
| `src/pages/en/AboutEN.tsx` | © 2024 VisuStock | © 2026 VisuStock |
| `src/pages/en/IndexEN.tsx` | © 2024 VisuStock | © 2026 VisuStock |

---

### 3. Blog Article Content (`src/pages/en/BlogArticleEN.tsx`)

This file contains the full article content for the blog detail pages (separate from the index listings in BlogEN.tsx which are already updated to 2026).

#### Article Slugs & Titles
- `stock-photography-tips-composition-lighting-guide-2024` → `stock-photography-tips-composition-lighting-guide-2026`
- Title: "Mastering Stock Photography in **2024**" → "Mastering Stock Photography in **2026**"

#### Article Publish/Update Dates
| Article | Current Dates | Updated Dates |
|---------|---------------|---------------|
| Photography Guide | 2024-01-10 | 2026-01-10 |
| Video Trends | 2024-01-08 | 2026-01-08 |
| AI Transforming Industry | 2024-01-05 | 2026-01-05 |
| Color Psychology | 2024-01-03 | 2026-01-03 |
| Success Stories | 2024-01-01 | 2026-01-01 |

#### Content References
- "Trending Themes for 2024" → "Trending Themes for 2026"
- "Top Video Trends for 2024" → "Top Video Trends for 2026"

---

### 4. Technical Configuration

| File | Current | Updated |
|------|---------|---------|
| `src/components/media/StreamingUploadHandler.tsx` | `'temp-upload-key-2024'` | `'temp-upload-key-2026'` |

---

## Summary

| Category | Files | Changes |
|----------|-------|---------|
| Legal Pages | 4 files | Update "Last updated" date |
| Copyright | 2 files | Update © year |
| Blog Articles | 1 file | Update slugs, titles, dates, content |
| Technical | 1 file | Update API key string |
| **Total** | **8 files** | All 2024 → 2026 |

---

## Technical Details

All changes are simple string replacements:
- `2024` → `2026` in date strings
- `2024-01-XX` → `2026-01-XX` in ISO date formats
- Slug URLs will change (old URLs will 404 - consider redirects if SEO is a concern)

