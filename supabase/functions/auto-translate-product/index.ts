import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LANGS = ["fr", "es", "de", "pt"] as const;
type Lang = typeof LANGS[number];

async function withTimeout<T>(p: Promise<T>, ms: number): Promise<T | null> {
  return await Promise.race([
    p,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
  ]);
}

async function translateOne(text: string, target: Lang): Promise<string> {
  if (!text || !text.trim()) return text;
  const input = text.length > 1500 ? text.slice(0, 1500) : text;
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

async function translateProduct(
  p: { title: string | null; description: string | null; tags: string[] | null },
  lang: Lang,
) {
  const tags = Array.isArray(p.tags) ? p.tags : [];
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

    const body = await req.json().catch(() => ({}));
    const productId: string | undefined = body.product_id ?? body.record?.id;
    if (!productId) {
      return new Response(JSON.stringify({ error: "product_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: product, error: pErr } = await supabase
      .from("content_submissions")
      .select("id, title, description, tags, status")
      .eq("id", productId)
      .maybeSingle();

    if (pErr || !product) {
      return new Response(JSON.stringify({ error: "Product not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (product.status !== "approved") {
      return new Response(JSON.stringify({ skipped: true, reason: "not approved" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: existing } = await supabase
      .from("product_translations")
      .select("language")
      .eq("product_id", productId);
    const have = new Set((existing ?? []).map((r: any) => r.language));

    const todo = LANGS.filter((l) => !have.has(l));
    if (todo.length === 0) {
      return new Response(JSON.stringify({ skipped: true, reason: "all done" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const rows = await Promise.all(
      todo.map(async (lang) => {
        const t = await translateProduct(product as any, lang);
        return { product_id: productId, language: lang, ...t };
      }),
    );

    const { error: insErr } = await supabase
      .from("product_translations")
      .upsert(rows, { onConflict: "product_id,language", ignoreDuplicates: true });

    if (insErr) {
      console.error("insert error", insErr.message);
      return new Response(JSON.stringify({ error: insErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, languages: todo }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("auto-translate-product error", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
