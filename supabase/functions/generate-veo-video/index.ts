// Generate AI video with Google Veo 3 / Veo 3 Fast
// Uses VideoAI credits wallet (separate from user_credits)
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Cost model (server-validated). Base = Veo 3, 8s, 1080p, audio on = 100 credits
const BASE_COST = 100;
const MODEL_MULT: Record<string, number> = {
  "veo-3": 1.0,
  "veo-3-fast": 0.4,
};
const DURATION_MULT: Record<number, number> = { 4: 0.5, 6: 0.75, 8: 1.0 };
const RES_MULT: Record<number, number> = { 720: 0.8, 1080: 1.0 };

function computeCost(opts: {
  model: string;
  duration: number;
  resolution: number;
  audio: boolean;
}): number {
  const base =
    BASE_COST *
    (MODEL_MULT[opts.model] ?? 1.0) *
    (DURATION_MULT[opts.duration] ?? 1.0) *
    (RES_MULT[opts.resolution] ?? 1.0) *
    (opts.audio ? 1.0 : 0.9);
  return Math.max(1, Math.ceil(base));
}

function resolveModel(input: string): "veo-3" | "veo-3-fast" {
  if (input === "veo-3") return "veo-3";
  if (input === "veo-3-fast" || input === "automatic") return "veo-3-fast";
  return "veo-3-fast";
}

function validatePayload(body: any): {
  prompt: string;
  model: "veo-3" | "veo-3-fast";
  duration: number;
  resolution: number;
  aspectRatio: "16:9" | "9:16";
  audio: boolean;
} | null {
  if (!body || typeof body !== "object") return null;
  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  if (prompt.length < 1 || prompt.length > 500) return null;
  const duration = Number(body.duration);
  if (![4, 6, 8].includes(duration)) return null;
  const resolution = Number(body.resolution);
  if (![720, 1080].includes(resolution)) return null;
  const aspectRatio = body.aspectRatio;
  if (aspectRatio !== "16:9" && aspectRatio !== "9:16") return null;
  const audio = Boolean(body.audio);
  const model = resolveModel(String(body.model || "automatic"));
  return { prompt, model, duration, resolution, aspectRatio, audio };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const json = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json(401, { error: "Unauthorized" });

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } },
    );
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { data: { user }, error: userError } = await supabaseClient.auth
      .getUser();
    if (userError || !user) return json(401, { error: "Unauthorized" });

    const body = await req.json().catch(() => null);
    const params = validatePayload(body);
    if (!params) {
      return json(400, {
        error: "invalid_input",
        message:
          "Provide prompt (1-500 chars), duration 4|6|8, resolution 720|1080, aspectRatio 16:9|9:16, audio bool, model.",
      });
    }

    const cost = computeCost({
      model: params.model,
      duration: params.duration,
      resolution: params.resolution,
      audio: params.audio,
    });

    // Pre-create generation row (status pending) so we have an id for ledger
    const { data: genRow, error: genErr } = await supabaseAdmin
      .from("ai_video_generations")
      .insert({
        user_id: user.id,
        prompt: params.prompt,
        model: params.model,
        duration: params.duration,
        resolution: params.resolution,
        aspect_ratio: params.aspectRatio,
        audio: params.audio,
        credits_spent: cost,
        status: "pending",
      })
      .select("id")
      .single();
    if (genErr || !genRow) {
      console.error("Failed to insert generation row", genErr);
      return json(500, { error: "internal_error" });
    }

    // Atomic spend
    const { data: spendResult, error: spendErr } = await supabaseAdmin.rpc(
      "spend_videoai_credits",
      {
        p_user_id: user.id,
        p_amount: cost,
        p_generation_id: genRow.id,
        p_reason: "video_generation",
      },
    );
    if (spendErr) {
      console.error("spend_videoai_credits error", spendErr);
      await supabaseAdmin.from("ai_video_generations").update({
        status: "failed",
        error_message: "internal_error",
      }).eq("id", genRow.id);
      return json(500, { error: "internal_error" });
    }
    const newBalance = Number(spendResult);
    if (newBalance < 0) {
      await supabaseAdmin.from("ai_video_generations").update({
        status: "failed",
        error_message: "insufficient_credits",
      }).eq("id", genRow.id);
      return json(402, {
        error: "insufficient_credits",
        message:
          "Not enough VideoAI credits. Please buy a credit pack to continue.",
        cost,
      });
    }

    // Call Google Gemini API for Veo 3
    const GEMINI_API_KEY = Deno.env.get("GOOGLE_GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      // refund and fail
      await supabaseAdmin.rpc("add_videoai_credits", {
        p_user_id: user.id,
        p_amount: cost,
        p_type: "refund",
        p_reason: "missing_api_key",
        p_generation_id: genRow.id,
      });
      await supabaseAdmin.from("ai_video_generations").update({
        status: "failed",
        error_message: "missing_api_key",
      }).eq("id", genRow.id);
      return json(500, { error: "config_error" });
    }

    const veoModel = params.model === "veo-3" ? "veo-3.1-generate-preview" : "veo-3.1-fast-generate-preview";
    console.log(`[gen ${genRow.id}] Calling Veo (${veoModel}) cost=${cost}`);

    const startResp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${veoModel}:predictLongRunning?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instances: [{ prompt: params.prompt }],
          parameters: {
            aspectRatio: params.aspectRatio,
            durationSeconds: params.duration,
            resolution: params.resolution === 1080 ? "1080p" : "720p",
            // generateAudio is only supported on veo-3 (not on veo-3-fast)
            ...(params.model === "veo-3" ? { generateAudio: params.audio } : {}),
            sampleCount: 1,
          },
        }),
      },
    );

    if (!startResp.ok) {
      const errTxt = await startResp.text();
      console.error(`[gen ${genRow.id}] Veo start error`, startResp.status, errTxt);
      // Refund credits
      await supabaseAdmin.rpc("add_videoai_credits", {
        p_user_id: user.id,
        p_amount: cost,
        p_type: "refund",
        p_reason: `veo_error_${startResp.status}`,
        p_generation_id: genRow.id,
      });
      await supabaseAdmin.from("ai_video_generations").update({
        status: "failed",
        error_message: `veo_${startResp.status}`,
      }).eq("id", genRow.id);

      if (startResp.status === 429) {
        return json(429, { error: "rate_limited", message: "AI service is busy. Please retry shortly." });
      }
      if (startResp.status === 402 || startResp.status === 403) {
        return json(402, { error: "provider_payment_required", message: "Video AI provider rejected the request." });
      }
      return json(500, { error: "veo_start_failed" });
    }

    const op = await startResp.json();
    const opName: string = op.name;
    if (!opName) {
      console.error("Missing operation name", op);
      await supabaseAdmin.rpc("add_videoai_credits", {
        p_user_id: user.id,
        p_amount: cost,
        p_type: "refund",
        p_reason: "veo_no_op_name",
        p_generation_id: genRow.id,
      });
      return json(500, { error: "veo_invalid_response" });
    }

    // Poll until done. Veo typically 30-90s. Edge functions max 150s.
    const maxAttempts = 28; // ~28*5s = 140s
    let videoUri: string | null = null;
    let lastErr: any = null;
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise((r) => setTimeout(r, 5000));
      const pollResp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/${opName}?key=${GEMINI_API_KEY}`,
      );
      if (!pollResp.ok) {
        lastErr = await pollResp.text();
        continue;
      }
      const pollData = await pollResp.json();
      if (pollData.error) {
        lastErr = pollData.error;
        break;
      }
      if (pollData.done) {
        videoUri = pollData.response?.generateVideoResponse?.generatedSamples
          ?.[0]?.video?.uri ??
          pollData.response?.videos?.[0]?.uri ??
          pollData.response?.candidates?.[0]?.video?.uri ?? null;
        break;
      }
    }

    if (!videoUri) {
      console.error(`[gen ${genRow.id}] Veo poll failed`, lastErr);
      await supabaseAdmin.rpc("add_videoai_credits", {
        p_user_id: user.id,
        p_amount: cost,
        p_type: "refund",
        p_reason: "veo_timeout_or_error",
        p_generation_id: genRow.id,
      });
      await supabaseAdmin.from("ai_video_generations").update({
        status: "failed",
        error_message: "veo_timeout",
      }).eq("id", genRow.id);
      return json(504, {
        error: "generation_timeout",
        message: "Video generation took too long. Credits refunded.",
      });
    }

    // Download video and upload to ai-videos bucket
    const dlUrl = videoUri.startsWith("http")
      ? `${videoUri}${videoUri.includes("?") ? "&" : "?"}key=${GEMINI_API_KEY}`
      : videoUri;
    const videoResp = await fetch(dlUrl);
    if (!videoResp.ok) {
      console.error(`[gen ${genRow.id}] download failed`, videoResp.status);
      await supabaseAdmin.rpc("add_videoai_credits", {
        p_user_id: user.id,
        p_amount: cost,
        p_type: "refund",
        p_reason: "download_failed",
        p_generation_id: genRow.id,
      });
      return json(500, { error: "download_failed" });
    }
    const buf = new Uint8Array(await videoResp.arrayBuffer());
    const path = `${user.id}/${genRow.id}.mp4`;
    const { error: upErr } = await supabaseAdmin.storage.from("ai-videos")
      .upload(path, buf, { contentType: "video/mp4", upsert: true });
    if (upErr) {
      console.error(`[gen ${genRow.id}] upload failed`, upErr);
      await supabaseAdmin.rpc("add_videoai_credits", {
        p_user_id: user.id,
        p_amount: cost,
        p_type: "refund",
        p_reason: "upload_failed",
        p_generation_id: genRow.id,
      });
      return json(500, { error: "upload_failed" });
    }

    // Store the storage path (bucket is private). Generate a signed URL for immediate playback.
    const { data: signed, error: signedErr } = await supabaseAdmin.storage
      .from("ai-videos")
      .createSignedUrl(path, 60 * 60 * 24 * 7); // 7 days
    if (signedErr || !signed) {
      console.error(`[gen ${genRow.id}] failed to sign url`, signedErr);
    }
    const playbackUrl = signed?.signedUrl ?? "";

    await supabaseAdmin.from("ai_video_generations").update({
      status: "completed",
      video_url: path, // store storage path; resolve to signed URL on read
    }).eq("id", genRow.id);

    return json(200, {
      videoUrl: playbackUrl,
      videoPath: path,
      creditsRemaining: newBalance,
      generationId: genRow.id,
      cost,
    });
  } catch (err) {
    console.error("generate-veo-video fatal", err);
    return json(500, {
      error: "internal_error",
      message: err instanceof Error ? err.message : "Unknown error",
    });
  }
});
