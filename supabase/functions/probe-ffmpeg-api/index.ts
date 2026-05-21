// Probes the Render ffmpeg-api to detect whether the NEW server.js is deployed.
// The new build emits X-Preview-Frame-Count + X-Preview-Codec headers on /process responses.
// We invoke /process against a tiny public sample MP4 and report what headers came back.
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const url = Deno.env.get("FFMPEG_API_URL");
  const key = Deno.env.get("FFMPEG_API_KEY");
  if (!url) {
    return new Response(JSON.stringify({ ok: false, error: "FFMPEG_API_URL not set" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const base = url.replace(/\/process\/?$/, "");
  const out: Record<string, unknown> = { base };

  // 1. health
  try {
    const h = await fetch(`${base}/health`);
    out.health_status = h.status;
    out.health_body = await h.text();
  } catch (e) {
    out.health_error = (e as Error).message;
  }

  // 2. process a tiny sample
  const sampleVideo = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4";
  try {
    const r = await fetch(`${base.replace(/\/$/, "")}/process`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(key ? { Authorization: `Bearer ${key}` } : {}),
      },
      body: JSON.stringify({ videoUrl: sampleVideo, resolution: 360, muted: true }),
    });
    const headers: Record<string, string> = {};
    r.headers.forEach((v, k) => { headers[k] = v; });
    out.process_status = r.status;
    out.process_headers = headers;
    out.has_frame_count_header = !!r.headers.get("x-preview-frame-count");
    out.frame_count = r.headers.get("x-preview-frame-count");
    out.preview_codec = r.headers.get("x-preview-codec");
    out.preview_width = r.headers.get("x-preview-width");
    out.preview_height = r.headers.get("x-preview-height");
    out.attempts = r.headers.get("x-preview-attempts");
    if (r.status !== 200) {
      out.process_body = (await r.text()).slice(0, 2000);
    } else {
      const buf = await r.arrayBuffer();
      out.bytes = buf.byteLength;
    }
  } catch (e) {
    out.process_error = (e as Error).message;
  }

  const newBuildLikely =
    out.has_frame_count_header === true ||
    !!out.preview_codec ||
    !!out.attempts;
  out.new_build_detected = newBuildLikely;

  return new Response(JSON.stringify(out, null, 2), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
