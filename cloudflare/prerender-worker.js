/**
 * VisuStock SEO prerender worker
 *
 * Route: visustock.com/*  (and www.visustock.com/*)
 *
 * - Detects crawler UAs and proxies to the Supabase `prerender` Edge Function.
 * - Everything else (browsers, static assets) passes straight through to the
 *   Lovable-hosted SPA origin so nothing about the normal user experience
 *   changes.
 * - If the prerender call fails, times out, or returns non-OK, we transparently
 *   fall back to the SPA response so crawlers never see a broken page.
 */

const PRERENDER_ENDPOINT =
  "https://kdgfpophpoqugtuvfxqx.supabase.co/functions/v1/prerender";

// Supabase anon (publishable) key — safe to ship in a Worker, same key the SPA uses.
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtkZ2Zwb3BocG9xdWd0dXZmeHF4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ1ODQzMzEsImV4cCI6MjA3MDE2MDMzMX0.m8KZCGvdZm2v6jBiQnv6LQqM2DPhuaVlcVWrTc0dMp8";

const PRERENDER_TIMEOUT_MS = 8000;

const CRAWLER_UA_PATTERNS = [
  "googlebot",
  "bingbot",
  "gptbot",
  "chatgpt-user",
  "oai-searchbot",
  "claudebot",
  "anthropic-ai",
  "claude-web",
  "perplexitybot",
  "facebookexternalhit",
  "linkedinbot",
  "twitterbot",
  "discordbot",
  "slackbot",
  "applebot",
  "yandexbot",
  "duckduckbot",
  "ccbot",
  "google-extended",
];

// Extensions we never prerender — pass through to origin verbatim.
const STATIC_EXT = /\.(?:js|mjs|css|map|png|jpe?g|gif|svg|webp|avif|ico|woff2?|ttf|otf|eot|mp4|webm|mp3|wav|ogg|pdf|xml|txt|json|wasm|zip)$/i;

// Paths the prerender function does not handle (private / SPA-only areas).
const SKIP_PATH_PREFIXES = [
  "/api/",
  "/assets/",
  "/static/",
  "/lovable-uploads/",
  "/admin",
  "/dashboard",
  "/seller-dashboard",
  "/buyer-dashboard",
  "/auth",
  "/checkout",
  "/cart",
];

function isCrawler(ua) {
  if (!ua) return false;
  const lower = ua.toLowerCase();
  return CRAWLER_UA_PATTERNS.some((p) => lower.includes(p));
}

function shouldSkip(pathname) {
  if (STATIC_EXT.test(pathname)) return true;
  return SKIP_PATH_PREFIXES.some((p) => pathname === p || pathname.startsWith(p));
}

async function fetchPrerender(pathAndQuery, request) {
  const url = `${PRERENDER_ENDPOINT}?path=${encodeURIComponent(pathAndQuery)}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PRERENDER_TIMEOUT_MS);
  try {
    console.log(`[prerender] fetching Supabase: ${url}`);
    const res = await fetch(url, {
      method: "GET",
      headers: {
        // Preserve crawler UA so the edge function's own gate passes.
        "User-Agent": request.headers.get("user-agent") || "Mozilla/5.0 (compatible; Prerender)",
        "Accept": "text/html",
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
      },
      signal: controller.signal,
    });
    console.log(`[prerender] Supabase response: status=${res.status}, content-type=${res.headers.get("content-type") || "none"}`);
    return res;
  } finally {
    clearTimeout(timer);
  }
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const ua = request.headers.get("user-agent") || "";
    const crawler = isCrawler(ua);

    console.log(`[prerender] incoming: method=${request.method}, path=${url.pathname}${url.search || ""}, ua="${ua}", isCrawler=${crawler}`);

    // Only intercept GET/HEAD html-ish navigations.
    if (request.method !== "GET" && request.method !== "HEAD") {
      console.log(`[prerender] passthrough: non-GET/HEAD method (${request.method})`);
      return fetch(request);
    }

    if (shouldSkip(url.pathname)) {
      console.log(`[prerender] passthrough: path skipped (${url.pathname})`);
      return fetch(request);
    }

    if (!crawler) {
      console.log(`[prerender] passthrough: not a crawler`);
      return fetch(request);
    }

    const pathAndQuery = url.pathname + (url.search || "");

    try {
      const prerendered = await fetchPrerender(pathAndQuery, request);
      if (prerendered && prerendered.ok) {
        // Rewrite headers so downstream caches key on the same URL, and mark for debugging.
        const headers = new Headers(prerendered.headers);
        headers.set("X-Prerendered", "1");
        headers.set("Vary", "User-Agent");
        // Force HTML content-type in case the function ever returns JSON fallback.
        if (!headers.get("content-type")?.includes("text/html")) {
          console.log(`[prerender] fallback: Supabase returned non-HTML content-type (${headers.get("content-type") || "none"}), falling back to origin`);
          return fetch(request);
        }
        console.log(`[prerender] success: returning prerendered HTML for ${pathAndQuery}`);
        return new Response(prerendered.body, {
          status: 200,
          headers,
        });
      }
      console.log(`[prerender] fallback: Supabase returned non-OK status (${prerendered ? prerendered.status : "no response"}), falling back to origin`);
      return fetch(request);
    } catch (err) {
      // Timeout / network / abort — log and fall back.
      console.log(`[prerender] fallback: exception during Supabase fetch (${err && err.message}), falling back to origin`);
      return fetch(request);
    }
  },
};
