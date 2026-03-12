import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function generateRequestId(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function escapeSSML(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function buildSSML(text: string, voice: string, rate: string, pitch: string): string {
  return `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='en-US'>
    <voice name='${voice}'>
      <prosody rate='${rate}' pitch='${pitch}'>
        ${escapeSSML(text)}
      </prosody>
    </voice>
  </speak>`;
}

function dateToString(): string {
  const d = new Date();
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${d.getMilliseconds().toString().padStart(3,"0")}Z`;
}

async function synthesizeSpeech(
  text: string,
  voice: string,
  rate: string,
  pitch: string
): Promise<Uint8Array> {
  const requestId = generateRequestId();
  const outputFormat = "audio-24khz-48kbitrate-mono-mp3";
  
  const wsUrl = `wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=6A5AA1D4EAFF4E9FB37E23D68491D6F4&ConnectionId=${requestId}`;

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      try { ws.close(); } catch(_) {}
      reject(new Error("TTS synthesis timed out after 30s"));
    }, 30000);

    const audioChunks: Uint8Array[] = [];
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      // Send config
      const configMsg = `X-Timestamp:${dateToString()}\r\nContent-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n{"context":{"synthesis":{"audio":{"metadataoptions":{"sentenceBoundaryEnabled":"false","wordBoundaryEnabled":"false"},"outputFormat":"${outputFormat}"}}}}`;
      ws.send(configMsg);

      // Send SSML
      const ssml = buildSSML(text, voice, rate, pitch);
      const ssmlMsg = `X-RequestId:${requestId}\r\nContent-Type:application/ssml+xml\r\nX-Timestamp:${dateToString()}\r\nPath:ssml\r\n\r\n${ssml}`;
      ws.send(ssmlMsg);
    };

    ws.onmessage = (event: MessageEvent) => {
      if (typeof event.data === "string") {
        if (event.data.includes("Path:turn.end")) {
          clearTimeout(timeout);
          ws.close();
          // Concatenate all audio chunks
          const totalLength = audioChunks.reduce((acc, chunk) => acc + chunk.length, 0);
          const result = new Uint8Array(totalLength);
          let offset = 0;
          for (const chunk of audioChunks) {
            result.set(chunk, offset);
            offset += chunk.length;
          }
          resolve(result);
        }
      } else if (event.data instanceof ArrayBuffer) {
        // Binary message: extract audio data after the header
        const view = new Uint8Array(event.data);
        // Header format: 2 bytes length + header string + audio data
        // The header ends with "Path:audio\r\n"
        const headerText = "Path:audio\r\n";
        const headerBytes = new TextEncoder().encode(headerText);
        
        // Find the header boundary
        let headerEnd = -1;
        for (let i = 0; i < Math.min(view.length, 500); i++) {
          let match = true;
          for (let j = 0; j < headerBytes.length && (i + j) < view.length; j++) {
            if (view[i + j] !== headerBytes[j]) {
              match = false;
              break;
            }
          }
          if (match) {
            headerEnd = i + headerBytes.length;
            break;
          }
        }

        if (headerEnd > 0 && headerEnd < view.length) {
          audioChunks.push(view.slice(headerEnd));
        }
      } else if (event.data instanceof Blob) {
        // Handle Blob data (Deno WebSocket may return Blob)
        event.data.arrayBuffer().then((ab: ArrayBuffer) => {
          const view = new Uint8Array(ab);
          const headerText = "Path:audio\r\n";
          const headerBytes = new TextEncoder().encode(headerText);
          
          let headerEnd = -1;
          for (let i = 0; i < Math.min(view.length, 500); i++) {
            let match = true;
            for (let j = 0; j < headerBytes.length && (i + j) < view.length; j++) {
              if (view[i + j] !== headerBytes[j]) {
                match = false;
                break;
              }
            }
            if (match) {
              headerEnd = i + headerBytes.length;
              break;
            }
          }

          if (headerEnd > 0 && headerEnd < view.length) {
            audioChunks.push(view.slice(headerEnd));
          }
        });
      }
    };

    ws.onerror = (err) => {
      clearTimeout(timeout);
      console.error("WebSocket error:", err);
      reject(new Error("WebSocket connection failed"));
    };

    ws.onclose = (event) => {
      clearTimeout(timeout);
      // If we haven't resolved yet and have chunks, resolve
      if (audioChunks.length > 0) {
        const totalLength = audioChunks.reduce((acc, chunk) => acc + chunk.length, 0);
        const result = new Uint8Array(totalLength);
        let offset = 0;
        for (const chunk of audioChunks) {
          result.set(chunk, offset);
          offset += chunk.length;
        }
        resolve(result);
      }
    };
  });
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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

    console.log(`Generating TTS: ${text.length} chars, voice=${voice}, rate=${rate}, pitch=${pitch}`);

    const audioData = await synthesizeSpeech(
      text,
      voice,
      rate || "+0%",
      pitch || "+0Hz"
    );

    console.log(`Generated audio: ${audioData.byteLength} bytes`);

    if (audioData.byteLength === 0) {
      throw new Error("No audio data received from TTS service");
    }

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
