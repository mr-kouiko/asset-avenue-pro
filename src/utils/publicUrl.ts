/**
 * publicUrl — normalize any internal infrastructure URL (Supabase project
 * hostname, storage endpoints, edge-function endpoints, R2 endpoints) into a
 * clean visustock.com URL that is proxied at the edge by our Cloudflare Worker.
 *
 * The worker maps:
 *   /api/<fn>                → Supabase Edge Functions (functions/v1/<fn>)
 *   /cdn/<bucket>/<path>     → Supabase Storage public object
 *   /cdn/sign/<bucket>/<..>  → Supabase Storage signed object (token kept in query)
 *
 * Anywhere the app is about to expose a raw *.supabase.co URL to a user
 * (image src, video src, share link, OG image, JSON-LD, sitemap, ...),
 * wrap it in publicUrl().
 */

const SITE_ORIGIN = "https://visustock.com";
const SUPABASE_HOST_RE = /^[a-z0-9-]+\.supabase\.co$/i;

/** Rewrite a single URL to its public-facing visustock.com equivalent. */
export function publicUrl(input?: string | null): string {
  if (!input) return "";
  const raw = String(input).trim();
  if (!raw) return "";

  // Already on our own domains — pass through.
  try {
    const u = new URL(raw, SITE_ORIGIN);

    // Already public.
    if (
      u.hostname === "visustock.com" ||
      u.hostname === "www.visustock.com" ||
      u.hostname === "cdn.visustock.com"
    ) {
      return u.toString();
    }

    // Supabase-hosted URL → rewrite path to /api/* or /cdn/*.
    if (SUPABASE_HOST_RE.test(u.hostname)) {
      // /storage/v1/object/public/<bucket>/<path>  →  /cdn/<bucket>/<path>
      const pub = u.pathname.match(/^\/storage\/v1\/object\/public\/(.+)$/);
      if (pub) {
        return `${SITE_ORIGIN}/cdn/${pub[1]}${u.search}`;
      }
      // /storage/v1/object/sign/<bucket>/<path>?token=...  →  /cdn/sign/<bucket>/<path>?token=...
      const signed = u.pathname.match(/^\/storage\/v1\/object\/sign\/(.+)$/);
      if (signed) {
        return `${SITE_ORIGIN}/cdn/sign/${signed[1]}${u.search}`;
      }
      // /functions/v1/<name>  →  /api/<name>
      const fn = u.pathname.match(/^\/functions\/v1\/(.+)$/);
      if (fn) {
        return `${SITE_ORIGIN}/api/${fn[1]}${u.search}`;
      }
      // Anything else on Supabase — best effort: strip host.
      return `${SITE_ORIGIN}${u.pathname}${u.search}`;
    }

    return u.toString();
  } catch {
    return raw;
  }
}

/** Convenience: build an OG image URL for a product from its slug. */
export function ogProductImageUrl(slug: string): string {
  return `${SITE_ORIGIN}/og/product/${encodeURIComponent(slug)}.jpg`;
}

/** Convenience: our own site origin. */
export const SITE_URL = SITE_ORIGIN;
