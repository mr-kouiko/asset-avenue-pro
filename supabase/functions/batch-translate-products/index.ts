import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ALL_LANGS = ["fr", "es", "de", "pt"] as const;
type Lang = typeof ALL_LANGS[number];

async function withTimeout<T>(p: Promise<T>, ms: number): Promise<T | null> {
  return await Promise.race([
    p,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
  ]);
}

// Fast path: only working endpoints. Disroot LibreTranslate first, MyMemory fallback.
async function translateOne(text: string, target: Lang): Promise<string> {
  if (!text || !text.trim()) return text;
  // Truncate very long text to keep API happy
  const input = text.length > 1500 ? text.slice(0, 1500) : text;

  // 1) Disroot LibreTranslate (verified working)
  try {
    const res = await withTimeout(
      fetch("https://translate.disroot.org/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ q: input, source: "en", target, format: "text" }),
      }),
      6000,
    );
    if (res && res.ok) {
      const data = await res.json();
      if (data?.translatedText) return data.translatedText as string;
    }
  } catch (_) { /* fall through */ }

  // 2) MyMemory fallback
  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(input)}&langpair=en|${target}`;
    const res = await withTimeout(fetch(url), 6000);
    if (res && res.ok) {
      const data = await res.json();
      const t = data?.responseData?.translatedText;
      if (t) return t as string;
    }
  } catch (_) { /* noop */ }

  return text;
}

async function translateProduct(p: { title: string | null; description: string | null; tags: string[] | null }, lang: Lang) {
  const tags = Array.isArray(p.tags) ? p.tags : [];
  // Translate everything in parallel for this product
  const [title, description, ...translatedTags] = await Promise.all([
    translateOne(p.title ?? "", lang),
    p.description ? translateOne(p.description, lang) : Promise.resolve(""),
    ...tags.map((t) => translateOne(t, lang)),
  ]);
  return { title, description, tags: translatedTags };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Auth required" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Auth required" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Admin only" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const requested: string[] = Array.isArray(body.languages) ? body.languages : [];
    // Cap at 15 per call so we stay safely within edge function CPU/wall time
    const limit: number = Math.min(Math.max(Number(body.limit) || 15, 1), 25);
    const targets = requested.filter((l) => (ALL_LANGS as readonly string[]).includes(l)) as Lang[];
    const langs: Lang[] = targets.length ? targets : [...ALL_LANGS];

    const summary: Record<string, { translated: number; skipped: number; failed: number }> = {};

    for (const language of langs) {
      summary[language] = { translated: 0, skipped: 0, failed: 0 };

      const { data: products, error } = await supabase
        .from("content_submissions")
        .select("id, title, description, tags")
        .eq("status", "approved")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) {
        console.error(`Fetch products error (${language}):`, error);
        continue;
      }

      const ids = (products ?? []).map((p) => p.id);
      const { data: existing } = await supabase
        .from("product_translations")
        .select("product_id")
        .eq("language", language)
        .in("product_id", ids);
      const have = new Set((existing ?? []).map((r: any) => r.product_id));

      const todo = (products ?? []).filter((p) => !have.has(p.id)).slice(0, limit);
      console.log(`[${language}] processing ${todo.length} of ${products?.length ?? 0} approved`);

      // Process products in parallel (small batch keeps latency low)
      const results = await Promise.all(todo.map(async (p) => {
        try {
          const t = await translateProduct(p as any, language);
          return { ok: true, row: { product_id: p.id, language, ...t } };
        } catch (e) {
          console.error("translate err", (e as Error).message);
          return { ok: false };
        }
      }));

      const rows = results.filter((r) => r.ok).map((r: any) => r.row);
      summary[language].failed = results.length - rows.length;

      if (rows.length > 0) {
        const { error: insErr } = await supabase
          .from("product_translations")
          .upsert(rows, { onConflict: "product_id,language", ignoreDuplicates: true });
        if (insErr) {
          console.error("bulk insert error", insErr.message);
          summary[language].failed += rows.length;
        } else {
          summary[language].translated = rows.length;
        }
      }
      summary[language].skipped = (products?.length ?? 0) - todo.length;
    }

    return new Response(JSON.stringify({ success: true, summary }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("batch-translate-products error", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
