import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ALL_LANGS = ["fr", "es", "de", "pt"] as const;
type Lang = typeof ALL_LANGS[number];

// Try multiple free translation endpoints. Returns original on failure.
async function translateOne(text: string, target: Lang): Promise<string> {
  if (!text || !text.trim()) return text;

  // 1) LibreTranslate public mirrors
  const ltEndpoints = [
    "https://translate.disroot.org/translate",
    "https://libretranslate.de/translate",
    "https://lt.vern.cc/translate",
  ];
  for (const url of ltEndpoints) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ q: text, source: "en", target, format: "text" }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.translatedText) return data.translatedText as string;
      }
    } catch (_) { /* try next */ }
  }

  // 2) MyMemory fallback
  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|${target}`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      const t = data?.responseData?.translatedText;
      if (t) return t as string;
    }
  } catch (_) { /* noop */ }

  return text;
}

async function translateTags(tags: string[] | null | undefined, lang: Lang): Promise<string[]> {
  if (!Array.isArray(tags) || tags.length === 0) return [];
  const out: string[] = [];
  for (const t of tags) {
    out.push(await translateOne(t, lang));
    await new Promise((r) => setTimeout(r, 100));
  }
  return out;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Verify caller is admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Auth required" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
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
    const limit: number = Math.min(Math.max(Number(body.limit) || 25, 1), 100);
    const targets: Lang[] = (requested.filter((l) => (ALL_LANGS as readonly string[]).includes(l)) as Lang[]);
    const langs: Lang[] = targets.length ? targets : [...ALL_LANGS];

    const summary: Record<string, { translated: number; skipped: number; failed: number }> = {};

    for (const language of langs) {
      summary[language] = { translated: 0, skipped: 0, failed: 0 };

      // Find approved products that don't yet have a translation in this language
      const { data: products, error } = await supabase
        .from("content_submissions")
        .select("id, title, description, tags")
        .eq("status", "approved")
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

      for (const p of todo) {
        try {
          const title = await translateOne(p.title ?? "", language);
          const description = p.description ? await translateOne(p.description, language) : "";
          const tags = await translateTags(p.tags as string[] | null, language);

          const { error: insErr } = await supabase.from("product_translations").insert({
            product_id: p.id, language, title, description, tags,
          });
          if (insErr) { summary[language].failed++; console.error("insert", insErr.message); }
          else summary[language].translated++;
          await new Promise((r) => setTimeout(r, 200));
        } catch (e) {
          summary[language].failed++;
          console.error("translate err", (e as Error).message);
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
