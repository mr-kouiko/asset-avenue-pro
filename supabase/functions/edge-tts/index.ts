import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { EdgeTTS } from "npm:edge-tts-universal@1.4.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MAX_TEXT_LENGTH = 10000;

function normalizeRate(value: unknown): string {
  const parsed = Number.parseInt(String(value ?? "").replace("%", ""), 10);
  if (Number.isNaN(parsed)) return "+0%";

  const clamped = Math.max(-50, Math.min(100, parsed));
  return `${clamped >= 0 ? "+" : ""}${clamped}%`;
}

function normalizePitch(value: unknown): string {
  const parsed = Number.parseInt(String(value ?? "").replace("Hz", ""), 10);
  if (Number.isNaN(parsed)) return "+0Hz";

  const clamped = Math.max(-50, Math.min(50, parsed));
  return `${clamped >= 0 ? "+" : ""}${clamped}Hz`;
}

async function toUint8Array(audio: unknown): Promise<Uint8Array> {
  if (audio instanceof Uint8Array) return audio;
  if (audio instanceof ArrayBuffer) return new Uint8Array(audio);

  if (
    typeof audio === "object" &&
    audio !== null &&
    "arrayBuffer" in audio &&
    typeof (audio as { arrayBuffer: unknown }).arrayBuffer === "function"
  ) {
    const ab = await (audio as { arrayBuffer: () => Promise<ArrayBuffer> }).arrayBuffer();
    return new Uint8Array(ab);
  }

  throw new Error("Unsupported audio payload format from TTS engine");
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Authentication required" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } },
    );

    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Authentication required" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const text = typeof body.text === "string" ? body.text.trim() : "";
    const voice = typeof body.voice === "string" ? body.voice : "";
    const rate = normalizeRate(body.rate);
    const pitch = normalizePitch(body.pitch);

    if (!text || !voice) {
      return new Response(JSON.stringify({ error: "Text and voice are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (text.length > MAX_TEXT_LENGTH) {
      return new Response(
        JSON.stringify({ error: `Text must be ${MAX_TEXT_LENGTH} characters or less` }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    console.log(
      `Generating TTS: ${text.length} chars, voice=${voice}, rate=${rate}, pitch=${pitch}`,
    );

    const tts = new EdgeTTS(text, voice, {
      rate,
      pitch,
      volume: "+0%",
    });

    const result = await tts.synthesize();
    const audioData = await toUint8Array(result?.audio);

    if (audioData.byteLength === 0) {
      throw new Error("No audio data received from TTS service");
    }

    console.log(`Generated audio: ${audioData.byteLength} bytes`);

    return new Response(audioData, {
      headers: {
        ...corsHeaders,
        "Content-Type": "audio/mpeg",
      },
    });
  } catch (error) {
    console.error("Error in edge-tts function:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Internal server error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
