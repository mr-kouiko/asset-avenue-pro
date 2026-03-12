import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TRUSTED_TOKEN = "6A5AA1D4EAFF4E9FB37E23D68491D6F4";
const WSS_URL = `wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=${TRUSTED_TOKEN}`;

function generateRequestId(): string {
  return crypto.randomUUID().replace(/-/g, "");
}

function buildSSML(
  text: string,
  voice: string,
  rate: string,
  pitch: string
): string {
  // Escape XML special characters
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

  return `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='en-US'>
<voice name='${voice}'>
<prosody rate='${rate}' pitch='${pitch}'>
${escaped}
</prosody>
</voice>
</speak>`;
}

function dateToString(): string {
  const d = new Date();
  return d.toUTCString();
}

async function synthesizeSpeech(
  text: string,
  voice: string,
  rate: string,
  pitch: string
): Promise<Uint8Array> {
  const requestId = generateRequestId();

  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      try { ws.close(); } catch (_) { /* ignore */ }
      reject(new Error("TTS request timed out after 30 seconds"));
    }, 30000);

    const ws = new WebSocket(WSS_URL);
    const audioChunks: Uint8Array[] = [];

    ws.onopen = () => {
      // Send config message
      const configMessage =
        `X-Timestamp:${dateToString()}\r\n` +
        `Content-Type:application/json; charset=utf-8\r\n` +
        `Path:speech.config\r\n\r\n` +
        JSON.stringify({
          context: {
            synthesis: {
              audio: {
                metadataoptions: {
                  sentenceBoundaryEnabled: "false",
                  wordBoundaryEnabled: "false",
                },
                outputFormat: "audio-24khz-96kbitrate-mono-mp3",
              },
            },
          },
        });
      ws.send(configMessage);

      // Send SSML message
      const ssml = buildSSML(text, voice, rate, pitch);
      const ssmlMessage =
        `X-RequestId:${requestId}\r\n` +
        `Content-Type:application/ssml+xml\r\n` +
        `X-Timestamp:${dateToString()}\r\n` +
        `Path:ssml\r\n\r\n` +
        ssml;
      ws.send(ssmlMessage);
    };

    ws.onmessage = (event) => {
      if (event.data instanceof ArrayBuffer) {
        // Binary message — audio data
        const data = new Uint8Array(event.data);
        // Find the separator between headers and audio: two consecutive \r\n
        const headerEnd = findHeaderEnd(data);
        if (headerEnd !== -1) {
          audioChunks.push(data.slice(headerEnd));
        }
      } else if (typeof event.data === "string") {
        if (event.data.includes("Path:turn.end")) {
          clearTimeout(timeoutId);
          ws.close();
          // Concatenate all chunks
          const totalLength = audioChunks.reduce((s, c) => s + c.length, 0);
          const result = new Uint8Array(totalLength);
          let offset = 0;
          for (const chunk of audioChunks) {
            result.set(chunk, offset);
            offset += chunk.length;
          }
          resolve(result);
        }
      }
    };

    ws.onerror = (err) => {
      clearTimeout(timeoutId);
      reject(new Error(`WebSocket error: ${err}`));
    };

    ws.onclose = (event) => {
      clearTimeout(timeoutId);
      if (audioChunks.length === 0 && event.code !== 1000) {
        reject(new Error(`WebSocket closed unexpectedly: ${event.code}`));
      }
    };
  });
}

function findHeaderEnd(data: Uint8Array): number {
  // Headers in binary messages are separated by \r\n\r\n from audio
  // The first 2 bytes are a 16-bit header length
  if (data.length < 2) return -1;
  const headerLen = (data[0] << 8) | data[1];
  return 2 + headerLen;
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authentication required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Authentication required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { text, voice, rate, pitch } = await req.json();

    if (!text || !voice) {
      return new Response(
        JSON.stringify({ error: "Text and voice are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (text.length > 10000) {
      return new Response(
        JSON.stringify({ error: "Text must be 10000 characters or less" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`User ${user.id} generating Edge TTS: ${text.length} chars, voice=${voice}, rate=${rate}, pitch=${pitch}`);

    const audioData = await synthesizeSpeech(
      text,
      voice,
      rate || "+0%",
      pitch || "+0Hz"
    );

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
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
