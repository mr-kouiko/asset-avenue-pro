import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { encodeBase64 } from "https://deno.land/std@0.224.0/encoding/base64.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

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

  // mode=fetch_last — return a previously uploaded probe artifact URL
  // (deterministic path so the caller can retrieve after gateway timeout)
  const SUPA_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPA_SRK = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supa = createClient(SUPA_URL, SUPA_SRK);
  const probeKey = u.searchParams.get("key") || "probe-latest.mp4";
  const probePath = `__probe__/${probeKey}`;

  if (mode === "fetch_last") {
    const { data: pub } = supa.storage.from("public-previews").getPublicUrl(probePath);
    out.public_url = pub?.publicUrl;
    return json(out);
  }

  const sampleVideo = u.searchParams.get("video") ||
    "https://download.samplelib.com/mp4/sample-10s.mp4";
  const resolution = parseInt(u.searchParams.get("resolution") || "720", 10);
  const upload = u.searchParams.get("upload") !== "false";

  console.log("PROBE_START", { sampleVideo, base, resolution, probePath });

  // Fire-and-forget: respond immediately so the HTTP gateway doesn't cancel.
  // Result lands in storage at probePath; caller polls via mode=fetch_last.
  const job = (async () => {
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
      const result: Record<string, unknown> = {
        elapsed_ms: Date.now() - t0,
        process_status: r.status,
        headers_subset: {
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
        },
      };
      if (r.status === 200) {
        const buf = new Uint8Array(await r.arrayBuffer());
        result.bytes = buf.byteLength;
        const ftyp = new TextDecoder().decode(buf.slice(4, 8));
        result.ftyp_marker = ftyp;
        result.valid_mp4_container = ftyp === "ftyp";
        if (upload) {
          const { error: upErr } = await supa.storage
            .from("public-previews")
            .upload(probePath, buf, { contentType: "video/mp4", upsert: true });
          if (upErr) result.upload_error = upErr.message;
          else {
            const { data: pub } = supa.storage.from("public-previews").getPublicUrl(probePath);
            result.public_url = pub?.publicUrl;
          }
        }
      } else {
        result.process_body = (await r.text()).slice(0, 4000);
      }
      // Persist result JSON alongside the MP4
      await supa.storage.from("public-previews").upload(
        `__probe__/${probeKey}.json`,
        new Blob([JSON.stringify(result, null, 2)], { type: "application/json" }),
        { upsert: true, contentType: "application/json" },
      );
      console.log("PROBE_RESULT", JSON.stringify(result));
    } catch (e) {
      console.error("PROBE_ERROR", (e as Error).message);
    }
  })();
  // @ts-ignore EdgeRuntime is available at runtime
  if (typeof EdgeRuntime !== "undefined") EdgeRuntime.waitUntil(job);

  const { data: pub } = supa.storage.from("public-previews").getPublicUrl(probePath);
  const { data: pubJson } = supa.storage.from("public-previews").getPublicUrl(`__probe__/${probeKey}.json`);
  out.dispatched = true;
  out.probe_path = probePath;
  out.mp4_url = pub?.publicUrl;
  out.result_json_url = pubJson?.publicUrl;
  return json(out);
});

function json(o: unknown) {
  return new Response(JSON.stringify(o, null, 2), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
