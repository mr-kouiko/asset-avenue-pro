/**
 * VisuStock edge worker — SEO prerender + public-surface proxy.
 *
 * Route: visustock.com/*  and www.visustock.com/*
 *
 * Responsibilities:
 *   1. Crawler UA detection → proxy to Supabase `prerender` Edge Function.
 *   2. Public-surface proxying so nothing points at *.supabase.co:
 *        /api/*        → Supabase Edge Functions (functions/v1/*)
 *        /cdn/*        → Supabase Storage public objects
 *        /cdn/sign/*   → Supabase Storage signed objects (token stays in path)
 *        /cdn/audio-watermark.mp3 → hard-mapped signed watermark clip
 *        /sitemap.xml            → static index (from origin)
 *        /sitemap-<name>.xml     → Supabase sitemap-<name> Edge Function
 *        /og/product/<slug>.jpg  → og-product Edge Function
 *   3. Everything else → Lovable-hosted SPA origin.
 *
 * If any proxied upstream fails, we degrade gracefully and never expose
 * the Supabase hostname in headers or bodies.
 */

const SUPABASE_HOST = "kdgfpophpoqugtuvfxqx.supabase.co";
const SUPABASE_BASE = `https://${SUPABASE_HOST}`;
const FUNCTIONS_BASE = `${SUPABASE_BASE}/functions/v1`;
const STORAGE_BASE = `${SUPABASE_BASE}/storage/v1/object`;

// Supabase anon (publishable) key — same key the SPA ships publicly.
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtkZ2Zwb3BocG9xdWd0dXZmeHF4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ1ODQzMzEsImV4cCI6MjA3MDE2MDMzMX0.m8KZCGvdZm2v6jBiQnv6LQqM2DPhuaVlcVWrTc0dMp8";

// Hard-mapped signed URLs kept off the client entirely.
const HARD_MAPPED = {
  "/cdn/audio-watermark.mp3":
    `${STORAGE_BASE}/sign/Audio%20VisuStock/ElevenLabs_2025-08-21T17_27_20_David%20-%20ASMR%20Whisper_pvc_sp100_s50_sb75_v3.mp3?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9jZTIyNjk0My1iMWRhLTRlZTAtYjk3Yi00MjY2NzQ4M2VhMjAiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJBdWRpbyBWaXN1U3RvY2svRWxldmVuTGFic18yMDI1LTA4LTIxVDE3XzI3XzIwX0RhdmlkIC0gQVNNUiBXaGlzcGVyX3B2Y19zcDEwMF9zNTBfc2I3NV92My5tcDMiLCJpYXQiOjE3NjU0OTc3NzEsImV4cCI6NDkxOTA5Nzc3MX0.NlfXBYByI1CKvSSMF_TfAC-xtggdyr0861jaWq-HV-k`,
};

// Sitemap slugs proxied to functions of the same name.
const SITEMAP_FUNCTIONS = new Set([
  "static", "categories", "products", "collections", "pexels", "blog",
]);

const PRERENDER_TIMEOUT_MS = 8000;

const CRAWLER_UA_PATTERNS = [
  "googlebot", "bingbot", "gptbot", "chatgpt-user", "oai-searchbot",
  "claudebot", "anthropic-ai", "claude-web", "perplexitybot",
  "facebookexternalhit", "linkedinbot", "twitterbot", "discordbot",
  "slackbot", "applebot", "yandexbot", "duckduckbot", "ccbot",
  "google-extended",
];

const STATIC_EXT = /\.(?:js|mjs|css|map|png|jpe?g|gif|svg|webp|avif|ico|woff2?|ttf|otf|eot|mp4|webm|mp3|wav|ogg|pdf|xml|txt|json|wasm|zip)$/i;

const SKIP_PATH_PREFIXES = [
  "/api/", "/cdn/", "/og/", "/sitemap", "/assets/", "/static/",
  "/lovable-uploads/", "/admin", "/dashboard", "/seller-dashboard",
  "/buyer-dashboard", "/auth", "/checkout", "/cart",
];

function isCrawler(ua) {
  if (!ua) return false;
  const lower = ua.toLowerCase();
  return CRAWLER_UA_PATTERNS.some((p) => lower.includes(p));
}

function shouldSkipPrerender(pathname) {
  if (STATIC_EXT.test(pathname)) return true;
  return SKIP_PATH_PREFIXES.some((p) => pathname === p || pathname.startsWith(p));
}

/** Strip any leaked upstream identifiers from response headers. */
function scrubHeaders(src) {
  const h = new Headers(src);
  h.delete("x-sb-request-id");
  h.delete("x-sb-edge-region");
  h.delete("sb-gateway-version");
  h.delete("server");
  h.delete("x-served-by");
  return h;
}

async function proxy(target, request, { injectAnonKey = false } = {}) {
  const headers = new Headers(request.headers);
  headers.delete("host");
  headers.delete("cf-connecting-ip");
  headers.delete("cf-ray");
  if (injectAnonKey) {
    headers.set("apikey", SUPABASE_ANON_KEY);
    if (!headers.has("authorization")) {
      headers.set("authorization", `Bearer ${SUPABASE_ANON_KEY}`);
    }
  }
  const upstream = await fetch(target, {
    method: request.method,
    headers,
    body: ["GET", "HEAD"].includes(request.method) ? undefined : request.body,
    redirect: "follow",
  });
  return new Response(upstream.body, {
    status: upstream.status,
    headers: scrubHeaders(upstream.headers),
  });
}

async function fetchPrerender(pathAndQuery, request) {
  const url = `${FUNCTIONS_BASE}/prerender?path=${encodeURIComponent(pathAndQuery)}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PRERENDER_TIMEOUT_MS);
  try {
    return await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent": request.headers.get("user-agent") || "Mozilla/5.0 (compatible; Prerender)",
        "Accept": "text/html",
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
      },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // ---- Hard-mapped opaque paths ----
    if (HARD_MAPPED[path]) {
      return proxy(HARD_MAPPED[path], request);
    }

    // ---- /api/* → Supabase Edge Functions ----
    if (path.startsWith("/api/")) {
      const fnPath = path.slice("/api/".length); // e.g. "pexels-search"
      const target = `${FUNCTIONS_BASE}/${fnPath}${url.search}`;
      return proxy(target, request, { injectAnonKey: true });
    }

    // ---- /cdn/sign/... → Supabase Storage signed objects ----
    if (path.startsWith("/cdn/sign/")) {
      const rest = path.slice("/cdn/sign/".length);
      const target = `${STORAGE_BASE}/sign/${rest}${url.search}`;
      return proxy(target, request);
    }

    // ---- /cdn/... → Supabase Storage public objects ----
    if (path.startsWith("/cdn/")) {
      const rest = path.slice("/cdn/".length);
      const target = `${STORAGE_BASE}/public/${rest}${url.search}`;
      return proxy(target, request);
    }

    // ---- /og/product/<slug>(.jpg) → og-product edge function ----
    if (path.startsWith("/og/product/")) {
      const slug = path.slice("/og/product/".length).replace(/\.(jpg|png|webp)$/i, "");
      const target = `${FUNCTIONS_BASE}/og-product?slug=${encodeURIComponent(slug)}`;
      return proxy(target, request, { injectAnonKey: true });
    }

    // ---- /sitemap.xml → served by origin (static file) ----
    // ---- /sitemap-<name>.xml → matching sitemap edge function ----
    const sitemapMatch = path.match(/^\/sitemap-([a-z0-9-]+)\.xml$/i);
    if (sitemapMatch) {
      const name = sitemapMatch[1].toLowerCase();
      if (SITEMAP_FUNCTIONS.has(name)) {
        const target = `${FUNCTIONS_BASE}/sitemap-${name}`;
        return proxy(target, request, { injectAnonKey: true });
      }
    }

    // ---- Prerender for crawler navigations ----
    if (
      (request.method === "GET" || request.method === "HEAD") &&
      !shouldSkipPrerender(path) &&
      isCrawler(request.headers.get("user-agent") || "")
    ) {
      const pathAndQuery = path + (url.search || "");
      try {
        const prerendered = await fetchPrerender(pathAndQuery, request);
        if (prerendered && prerendered.ok) {
          const headers = scrubHeaders(prerendered.headers);
          headers.set("X-Prerendered", "1");
          headers.set("Vary", "User-Agent");
          if ((headers.get("content-type") || "").includes("text/html")) {
            return new Response(prerendered.body, { status: 200, headers });
          }
        }
      } catch {
        // fall through
      }
    }

    // ---- Everything else → SPA origin ----
    return fetch(request);
  },
};
