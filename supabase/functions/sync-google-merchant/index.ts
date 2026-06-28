import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SITE_URL = "https://visustock.com";
const MERCHANT_ID = Deno.env.get("GOOGLE_MERCHANT_ID")!;
const SERVICE_ACCOUNT_JSON = Deno.env.get("GOOGLE_MERCHANT_SERVICE_ACCOUNT_JSON")!;

let cachedToken: { token: string; expires: number } | null = null;

// --- Google OAuth (Service Account JWT -> access token) ---
function b64url(input: ArrayBuffer | string): string {
  const bytes = typeof input === "string" ? new TextEncoder().encode(input) : new Uint8Array(input);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const b64 = pem.replace(/-----BEGIN [^-]+-----/g, "").replace(/-----END [^-]+-----/g, "").replace(/\s+/g, "");
  const bin = atob(b64);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return buf.buffer;
}

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expires > Date.now() + 60000) return cachedToken.token;
  const sa = JSON.parse(SERVICE_ACCOUNT_JSON);
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claim = {
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/content",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };
  const unsigned = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(claim))}`;
  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToArrayBuffer(sa.private_key),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(unsigned));
  const jwt = `${unsigned}.${b64url(sig)}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`Token exchange failed: ${JSON.stringify(json)}`);
  cachedToken = { token: json.access_token, expires: Date.now() + json.expires_in * 1000 };
  return json.access_token;
}

// --- Build Google product payload ---
function buildProductPayload(sub: any, thumbnail: string | null) {
  const link = `${SITE_URL}/products/${sub.slug}`;
  const title = (sub.title ?? "Untitled").slice(0, 150);
  const description = (sub.description ?? title).slice(0, 5000);
  return {
    offerId: sub.id,
    title,
    description,
    link,
    imageLink: thumbnail || `${SITE_URL}/og-image.jpg`,
    contentLanguage: "en",
    targetCountry: "US",
    channel: "online",
    availability: "in stock",
    condition: "new",
    price: { value: Number(sub.price).toFixed(2), currency: "USD" },
    identifierExists: false,
    googleProductCategory: "Arts & Entertainment > Hobbies & Creative Arts",
  };
}

async function gmcInsert(token: string, product: any) {
  const url = `https://shoppingcontent.googleapis.com/content/v2.1/${MERCHANT_ID}/products`;
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(product),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(JSON.stringify(data));
  return data;
}

async function gmcDelete(token: string, offerId: string) {
  const productId = `online:en:US:${offerId}`;
  const url = `https://shoppingcontent.googleapis.com/content/v2.1/${MERCHANT_ID}/products/${productId}`;
  const res = await fetch(url, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok && res.status !== 404) {
    const txt = await res.text();
    throw new Error(txt);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    if (!MERCHANT_ID || !SERVICE_ACCOUNT_JSON) {
      return new Response(JSON.stringify({ error: "Google Merchant secrets not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Auth: admin only
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: claims } = await userClient.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (!claims?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }
    const userId = claims.claims.sub;
    const { data: isAdmin } = await userClient.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Admin required" }), { status: 403, headers: corsHeaders });
    }

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const body = await req.json().catch(() => ({}));
    const mode: string = body.mode ?? "queue";

    const token = await getAccessToken();
    let uploaded = 0, deleted = 0, failed = 0;
    const errors: any[] = [];

    async function processOne(sub: any, action: "upsert" | "delete") {
      try {
        if (action === "delete") {
          await gmcDelete(token, sub.id);
          deleted++;
          await admin.from("google_merchant_sync_log").insert({
            submission_id: sub.id, action: "delete", status: "success",
          });
        } else {
          const thumb = sub.content_files?.find((f: any) => f.thumbnail_path)?.thumbnail_path ?? null;
          const thumbUrl = thumb
            ? (thumb.startsWith("http") ? thumb : `${Deno.env.get("SUPABASE_URL")}/storage/v1/object/public/content-files/${thumb}`)
            : null;
          await gmcInsert(token, buildProductPayload(sub, thumbUrl));
          uploaded++;
          await admin.from("google_merchant_sync_log").insert({
            submission_id: sub.id, action: "upsert", status: "success",
            google_product_id: `online:en:US:${sub.id}`,
          });
        }
      } catch (e: any) {
        failed++;
        errors.push({ id: sub.id, error: e.message });
        await admin.from("google_merchant_sync_log").insert({
          submission_id: sub.id, action, status: "error", error: e.message?.slice(0, 1000),
        });
      }
    }

    if (mode === "full") {
      // Push all approved premium products
      const PAGE = 200;
      let from = 0;
      while (true) {
        const { data: rows, error } = await admin
          .from("content_submissions")
          .select("id, title, description, price, slug, content_files(thumbnail_path)")
          .eq("status", "approved")
          .gt("price", 0)
          .not("slug", "is", null)
          .order("created_at", { ascending: true })
          .range(from, from + PAGE - 1);
        if (error) throw error;
        if (!rows || rows.length === 0) break;
        for (const r of rows) await processOne(r, "upsert");
        if (rows.length < PAGE) break;
        from += PAGE;
      }
    } else if (mode === "single" && body.submissionId) {
      const { data: row } = await admin
        .from("content_submissions")
        .select("id, title, description, price, slug, content_files(thumbnail_path)")
        .eq("id", body.submissionId).maybeSingle();
      if (row) await processOne(row, "upsert");
    } else if (mode === "delete" && body.submissionId) {
      await processOne({ id: body.submissionId }, "delete");
    } else {
      // Drain queue
      const { data: q } = await admin
        .from("merchant_sync_queue")
        .select("id, submission_id, action")
        .is("processed_at", null)
        .order("created_at", { ascending: true })
        .limit(500);
      for (const item of q ?? []) {
        if (item.action === "upsert") {
          const { data: row } = await admin
            .from("content_submissions")
            .select("id, title, description, price, slug, content_files(thumbnail_path)")
            .eq("id", item.submission_id).maybeSingle();
          if (row && Number(row.price) > 0) await processOne(row, "upsert");
        } else {
          await processOne({ id: item.submission_id }, "delete");
        }
        await admin.from("merchant_sync_queue").update({ processed_at: new Date().toISOString() }).eq("id", item.id);
      }
    }

    return new Response(JSON.stringify({ uploaded, deleted, failed, errors: errors.slice(0, 20) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("sync-google-merchant error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
