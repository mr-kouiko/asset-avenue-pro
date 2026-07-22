/**
 * Prebuild: fetch dynamic sitemap XML from Supabase Edge Functions and write
 * them under public/ so /sitemap-*.xml resolves on the SPA origin without
 * requiring the Cloudflare Worker.
 *
 * Runs at predev and prebuild. Failures are non-fatal so local dev keeps
 * working when the network is unavailable.
 */

import { writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

const SUPABASE_URL =
  process.env.VITE_SUPABASE_URL || "https://kdgfpophpoqugtuvfxqx.supabase.co";
const SUPABASE_ANON_KEY =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtkZ2Zwb3BocG9xdWd0dXZmeHF4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ1ODQzMzEsImV4cCI6MjA3MDE2MDMzMX0.m8KZCGvdZm2v6jBiQnv6LQqM2DPhuaVlcVWrTc0dMp8";

const SITEMAPS = ["static", "categories", "products", "collections", "pexels", "blog"];
const OUT_DIR = resolve("public");

const EMPTY_URLSET = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>`;

async function fetchSitemap(name: string): Promise<string> {
  const url = `${SUPABASE_URL}/functions/v1/sitemap-${name}`;
  const res = await fetch(url, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
  });
  if (!res.ok) throw new Error(`sitemap-${name} responded ${res.status}`);
  const xml = await res.text();
  if (!xml.trim().startsWith("<?xml")) throw new Error(`sitemap-${name} not xml`);
  return xml;
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  const results = await Promise.allSettled(
    SITEMAPS.map(async (name) => {
      const xml = await fetchSitemap(name);
      writeFileSync(resolve(OUT_DIR, `sitemap-${name}.xml`), xml);
      const kb = (xml.length / 1024).toFixed(1);
      console.log(`sitemap-${name}.xml written (${kb} KB)`);
    })
  );
  results.forEach((r, i) => {
    if (r.status === "rejected") {
      const name = SITEMAPS[i];
      console.warn(`sitemap-${name} failed: ${r.reason?.message ?? r.reason}. Writing empty stub.`);
      try {
        writeFileSync(resolve(OUT_DIR, `sitemap-${name}.xml`), EMPTY_URLSET);
      } catch {}
    }
  });
}

main().catch((e) => {
  console.error("generate-sitemaps failed:", e);
  // Do not fail the build.
});
