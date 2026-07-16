import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Action =
  | "prompt"
  | "remove-bg"
  | "expand"
  | "change-bg"
  | "change-mood"
  | "change-color";

const buildPrompt = (action: Action, userPrompt?: string): string => {
  const p = (userPrompt || "").trim();
  switch (action) {
    case "prompt":
      return p || "Enhance and improve this image while preserving its subject and composition.";
    case "remove-bg":
      return "Remove the background from this image completely. Make the background fully transparent (alpha channel). Keep only the main subject with clean, precise edges. Output a PNG image with transparent background.";
    case "expand":
      return "Extend and outpaint this image beyond its original borders on all sides, seamlessly continuing the scene. Maintain the same style, lighting, perspective, and details. Output a wider/larger version of this image with new content generated at the edges.";
    case "change-bg":
      return `Replace the background of this image with: ${p || "a clean, softly lit studio backdrop"}. Keep the main subject unchanged with clean, precise edges. Match lighting and shadows naturally.`;
    case "change-mood":
      return `Change the mood, atmosphere, and lighting of this image to: ${p || "warm, cinematic golden hour"}. Preserve the subject, composition, and details.`;
    case "change-color":
      return `Recolor this image, shifting its palette to: ${p || "a cool, muted, cinematic color grade"}. Preserve subject, composition, edges, and fine details.`;
  }
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { action, imageUrl, prompt, productId } = body as {
      action: Action;
      imageUrl: string;
      prompt?: string;
      productId?: string;
    };

    if (!action || !imageUrl) {
      return new Response(JSON.stringify({ error: "action and imageUrl are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );
    const {
      data: { user },
      error: userErr,
    } = await userClient.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: creditsData } = await serviceClient
      .from("user_credits")
      .select("credits_balance")
      .eq("user_id", user.id)
      .single();

    const currentBalance = creditsData?.credits_balance ?? 0;
    if (currentBalance < 1) {
      return new Response(
        JSON.stringify({
          error: "insufficient_credits",
          message: "You need at least 1 credit to run an AI edit.",
          current_balance: currentBalance,
        }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const finalPrompt = buildPrompt(action, prompt);

    // Resolve the CLEAN original image when a productId is supplied. The public
    // thumbnail may have a burned-in watermark; feeding that to Gemini would make
    // the AI edit inherit the watermark. Load the original from the private
    // bucket via the service role and hand a fresh signed URL to the model.
    let sourceImageUrl = imageUrl;
    if (productId) {
      try {
        const { data: files } = await serviceClient
          .from("content_files")
          .select("file_path, metadata, is_original, file_type")
          .eq("submission_id", productId);
        const original = (files || []).find((f: any) =>
          f.is_original && String(f.file_type || "").toLowerCase().includes("image")
        ) || (files || []).find((f: any) => f.is_original);
        if (original?.file_path) {
          let bucket = (original as any).metadata?.bucket || "content-uploads";
          let relativePath: string = original.file_path;
          if (relativePath.startsWith("http")) {
            const u = new URL(relativePath);
            const parts = u.pathname.split("/");
            const idx = parts.indexOf("storage");
            if (idx !== -1 && parts.length > idx + 4) {
              bucket = parts[idx + 4];
              relativePath = parts.slice(idx + 5).join("/");
            }
          }
          const { data: signed } = await serviceClient
            .storage.from(bucket).createSignedUrl(relativePath, 300);
          if (signed?.signedUrl) {
            sourceImageUrl = signed.signedUrl;
            console.log(`[ai-edit-image] using clean original for product ${productId}`);
          }
        }
      } catch (e) {
        console.warn("[ai-edit-image] clean-original lookup failed", e);
      }
    }

    console.log(`[ai-edit-image] user=${user.id} action=${action}`);

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3.1-flash-image",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: finalPrompt },
              { type: "image_url", image_url: { url: imageUrl } },
            ],
          },
        ],
        modalities: ["image", "text"],
      }),
    });

    if (!aiRes.ok) {
      const txt = await aiRes.text();
      console.error("[ai-edit-image] gateway error", aiRes.status, txt);
      if (aiRes.status === 429) {
        return new Response(
          JSON.stringify({ error: "rate_limited", message: "Too many requests. Try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiRes.status === 402) {
        return new Response(
          JSON.stringify({ error: "payment_required", message: "AI Gateway credits exhausted." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      return new Response(
        JSON.stringify({ error: "ai_error", message: "AI edit failed", details: txt }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await aiRes.json();
    const resultUrl: string | undefined =
      data?.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    if (!resultUrl || !resultUrl.startsWith("data:")) {
      console.error("[ai-edit-image] no image in response", JSON.stringify(data).slice(0, 400));
      return new Response(JSON.stringify({ error: "no_image", message: "The AI did not return an image" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Deduct credit
    const { error: deductErr } = await serviceClient.rpc("deduct_user_credit", {
      user_id_param: user.id,
      cost_param: 1,
    });
    if (deductErr) console.error("[ai-edit-image] deduct error", deductErr);

    // History
    await userClient.from("ai_image_generations").insert({
      user_id: user.id,
      prompt: `[${action}] ${finalPrompt}`.slice(0, 2000),
      image_url: resultUrl,
    });

    const { data: updated } = await serviceClient
      .from("user_credits")
      .select("credits_balance")
      .eq("user_id", user.id)
      .single();

    return new Response(
      JSON.stringify({
        imageUrl: resultUrl,
        creditsRemaining: updated?.credits_balance ?? currentBalance - 1,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("[ai-edit-image] fatal", e);
    return new Response(
      JSON.stringify({ error: "internal", message: e instanceof Error ? e.message : String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
