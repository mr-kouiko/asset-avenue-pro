## Plan: Business & Enterprise Solutions page (/business)

### 1. New page: `src/pages/Business.tsx`
Wrapped in existing `Header` + `Footer`. Uses site design tokens (semantic classes from `index.css`, shadcn components). Uses `useSEO` hook for meta tags (title, description, OG). All 5 sections in exact order specified.

**Sections:**
- **Hero**: h1 headline, sub, primary CTA button that smooth-scrolls to `#contact-form`. Right-side illustration (generated placeholder image saved to `src/assets/business-hero.jpg`).
- **What We Offer**: shadcn `Tabs` component with 5 tabs (Photos, Videos, Vectors, Audio, AI-Generated). Each panel has a spec line, 5-bullet list, and a Lucide icon.
- **Why Choose**: 4-card grid (Lucide icons: Users, ShieldCheck, FileCheck, Headset).
- **Trusted By**: placeholder horizontal strip with 5 empty logo slots (commented for future population).
- **Contact form** (`#contact-form`): controlled React form with the exact fields listed. On submit, calls `submit-support-ticket` edge function (already exists — reused with a `business_inquiry` category tag). Success/error via existing `toast`. Legal disclaimer with `Link`s to `/terms`, `/privacy-policy`, `/license-agreement`.

### 2. Routing: `src/App.tsx`
Add lazy import `const Business = lazy(() => import("./pages/Business"))` and `<Route path="/business" element={<Business />} />` inside `AppRoutes` (so it's picked up for all language prefixes).

### 3. Footer link: `src/components/Footer.tsx`
Add new "Enterprise" column (or add under existing Company column) with a `<Link to="/business">Business & Enterprise</Link>` entry.

### 4. SEO indexability
- Add `/business` to `supabase/functions/sitemap-static/index.ts` static routes list so it's included in the sitemap index already referenced by `public/sitemap.xml`.
- Add `/business` handling to `supabase/functions/prerender/index.ts` with a hard-coded HTML template (title, meta description, OG tags, `<h1>`, section headings, tab bullet content) so crawlers hitting the Cloudflare Worker get fully rendered HTML — matches the existing prerender pattern used for other static routes.

### 5. Meta/OG
`useSEO({ title: "Business Plans — Enterprise Solutions for Companies", description: "Custom business packages for companies and organizations. Premium photos, videos, vectors, and audio for professional and commercial use.", type: "website", url: "https://visustock.com/business" })`.

### Technical notes
- Form submission uses the existing `submit-support-ticket` Supabase edge function (no new backend). If the user prefers a dedicated `business_inquiries` table, that can be added in a follow-up.
- Placeholder hero image generated via `imagegen` (abstract corporate/creative visual, no text).
- No new dependencies; all UI from existing shadcn primitives (`Tabs`, `Card`, `Button`, `Input`, `Textarea`, `Select`, `Label`).
- Tailwind responsive breakpoints (`md:`, `lg:`) matching patterns in `HeroSection.tsx` and `Marketplace.tsx`.

### Files touched
- **New**: `src/pages/Business.tsx`, `src/assets/business-hero.jpg`
- **Edit**: `src/App.tsx`, `src/components/Footer.tsx`, `supabase/functions/sitemap-static/index.ts`, `supabase/functions/prerender/index.ts`
