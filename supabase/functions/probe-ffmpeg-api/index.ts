import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const url = Deno.env.get("FFMPEG_API_URL");
  const key = Deno.env.get("FFMPEG_API_KEY");
  if (!url) return json({ ok: false, error: "FFMPEG_API_URL not set" });

  const base = url.replace(/\/process\/?$/, "").replace(/\/$/, "");
  const u = new URL(req.url);
  const mode = u.searchParams.get("mode") || "health";
  const out: Record<string, unknown> = { base, mode };

  if (mode === "health") {
    try {
      const h = await fetch(`${base}/health`);
      out.health_status = h.status;
      out.health_body = await h.text();
    } catch (e) { out.health_error = (e as Error).message; }
    return json(out);
  }

  // mode=process — verifies new server.js by checking response headers
  const sampleVideo = u.searchParams.get("video") ||
    "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4";
  try {
    const t0 = Date.now();
    const r = await fetch(`${base}/process`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(key ? { Authorization: `Bearer ${key}` } : {}),
      },
      body: JSON.stringify({ videoUrl: sampleVideo, resolution: 360, muted: true }),
    });
    const headers: Record<string, string> = {};
    r.headers.forEach((v, k) => { headers[k] = v; });
    out.elapsed_ms = Date.now() - t0;
    out.process_status = r.status;
    out.process_headers = headers;
    out.frame_count = r.headers.get("x-preview-frame-count");
    out.preview_codec = r.headers.get("x-preview-codec");
    out.preview_width = r.headers.get("x-preview-width");
    out.preview_height = r.headers.get("x-preview-height");
    out.new_build_detected = !!r.headers.get("x-preview-frame-count");
    if (r.status !== 200) {
      out.process_body = (await r.text()).slice(0, 2000);
    } else {
      const buf = await r.arrayBuffer();
      out.bytes = buf.byteLength;
    }
  } catch (e) { out.process_error = (e as Error).message; }

  return json(out);
});

function json(o: unknown) {
  return new Response(JSON.stringify(o, null, 2), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
