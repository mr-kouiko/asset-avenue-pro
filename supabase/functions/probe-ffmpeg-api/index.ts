import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { encodeBase64 } from "https://deno.land/std@0.224.0/encoding/base64.ts";

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
  const mode = u.searchParams.get("mode") || "process";
  const out: Record<string, unknown> = { base, mode };

  if (mode === "health") {
    try {
      const h = await fetch(`${base}/health`);
      out.health_status = h.status;
      out.health_body = await h.text();
    } catch (e) { out.health_error = (e as Error).message; }
    return json(out);
  }

  // Default 17s clean test clip; user-overridable
  const sampleVideo = u.searchParams.get("video") ||
    "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4";
  const resolution = parseInt(u.searchParams.get("resolution") || "720", 10);
  const returnBytes = u.searchParams.get("return_bytes") !== "false";

  console.log("PROBE_START", { sampleVideo, base, resolution });

  try {
    const t0 = Date.now();
    const r = await fetch(`${base}/process`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(key ? { Authorization: `Bearer ${key}` } : {}),
      },
      body: JSON.stringify({ videoUrl: sampleVideo, resolution, muted: true }),
    });
    const headers: Record<string, string> = {};
    r.headers.forEach((v, k) => { headers[k] = v; });
    out.elapsed_ms = Date.now() - t0;
    out.process_status = r.status;
    out.process_headers_subset = {
      ct: headers["content-type"],
      cl: headers["content-length"],
      frame_count: headers["x-preview-frame-count"],
      codec: headers["x-preview-codec"],
      width: headers["x-preview-width"],
      height: headers["x-preview-height"],
      duration: headers["x-preview-duration"],
      avg_luma: headers["x-preview-avg-luma"],
      attempts: headers["x-preview-attempts"],
      total_ms: headers["x-preview-total-ms"],
      job_id: headers["x-job-id"],
    };

    if (r.status !== 200) {
      out.ok = false;
      out.process_body = (await r.text()).slice(0, 8000);
    } else {
      const buf = new Uint8Array(await r.arrayBuffer());
      out.ok = true;
      out.bytes = buf.byteLength;
      // MP4 magic-byte sniff (ftyp at offset 4)
      const ftyp = new TextDecoder().decode(buf.slice(4, 8));
      out.ftyp_marker = ftyp;
      out.valid_mp4_container = ftyp === "ftyp";
      if (returnBytes && buf.byteLength <= 8 * 1024 * 1024) {
        out.mp4_base64 = encodeBase64(buf);
      } else if (returnBytes) {
        out.mp4_base64_omitted = `too_large_${buf.byteLength}B`;
      }
    }
  } catch (e) {
    out.process_error = (e as Error).message;
  }

  console.log("PROBE_RESULT", JSON.stringify({ ...out, mp4_base64: undefined }));
  return json(out);
});

function json(o: unknown) {
  return new Response(JSON.stringify(o, null, 2), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
