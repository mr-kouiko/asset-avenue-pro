import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SITE_URL = "https://visustock.com";
const MERCHANT_ID = Deno.env.get("GOOGLE_MERCHANT_ID")!;
// Merchant API requires a dataSource ID (numeric) created in Merchant Center
// under Data sources → API. Store just the numeric ID (e.g. "12345678901").
const GOOGLE_MERCHANT_DATA_SOURCE = Deno.env.get("GOOGLE_MERCHANT_DATA_SOURCE");

const MERCHANT_API_BASE = "https://merchantapi.googleapis.com/products/v1beta";
const CONTENT_LANGUAGE = "en";
const FEED_LABEL = "US";
const CHANNEL = "ONLINE";

let cachedToken: { token: string; expires: number } | null = null;

// --- Helpers ---
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

function getServiceAccount() {
  const privateKey = Deno.env.get("GOOGLE_PRIVATE_KEY")
    ?.replace(/\\n/g, "\n")
    .trim();

  const rawKey = Deno.env.get("GOOGLE_PRIVATE_KEY");
  const lines = privateKey?.split("\n") ?? [];
  console.log("[GMC] GOOGLE_PRIVATE_KEY debug", {
    exists: !!rawKey,
    rawLength: rawKey?.length ?? 0,
    normalizedLength: privateKey?.length ?? 0,
    lineCount: lines.length,
    firstLine: lines[0] ?? null,
    lastLine: lines[lines.length - 1] ?? null,
    hasKey: !!privateKey,
    startsCorrectly: privateKey?.startsWith("-----BEGIN PRIVATE KEY-----"),
    endsCorrectly: privateKey?.endsWith("-----END PRIVATE KEY-----"),
  });

  const serviceAccount = {
    project_id: Deno.env.get("GOOGLE_PROJECT_ID"),
    client_email: Deno.env.get("GOOGLE_CLIENT_EMAIL"),
    private_key: privateKey,
  };

  if (!serviceAccount.project_id || !serviceAccount.client_email || !serviceAccount.private_key) {
    throw new Error("Missing Google auth secrets: GOOGLE_PROJECT_ID, GOOGLE_CLIENT_EMAIL, or GOOGLE_PRIVATE_KEY");
  }

  if (!serviceAccount.private_key.includes("BEGIN PRIVATE KEY")) {
    throw new Error("GOOGLE_PRIVATE_KEY does not look like a PEM private key");
  }

  return serviceAccount;
}

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expires > Date.now() + 60000) return cachedToken.token;
  const sa = getServiceAccount();
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
  const text = await res.text();
  let json: any;
  try { json = JSON.parse(text); } catch { json = { raw: text }; }
  if (!res.ok) {
    console.error("Google token exchange failed:", res.status, text);
    throw new Error(`Google token exchange failed (${res.status}): ${json.error_description ?? json.error ?? text}`);
  }
  cachedToken = { token: json.access_token, expires: Date.now() + json.expires_in * 1000 };
  return json.access_token;
}

// Verbose diagnostic version of the token flow used by the dry-run endpoint.
// Returns granular stage info WITHOUT leaking the private key or the access token itself.
async function diagnoseAccessToken(): Promise<Record<string, unknown>> {
  const diag: Record<string, unknown> = {
    tokenOk: false,
    tokenError: null as string | null,
    stage: "start",
    serviceAccountEmail: null as string | null,
    projectId: null as string | null,
    privateKeyPresent: false,
    privateKeyLength: 0,
    privateKeyStartsCorrectly: false,
    privateKeyEndsCorrectly: false,
    importKeyOk: false,
    signOk: false,
    httpStatus: null as number | null,
    googleError: null as string | null,
    googleErrorDescription: null as string | null,
    googleResponseBody: null as string | null,
  };
  try {
    diag.stage = "load-service-account";
    const sa = getServiceAccount();
    diag.serviceAccountEmail = sa.client_email;
    diag.projectId = sa.project_id;
    diag.privateKeyPresent = !!sa.private_key;
    diag.privateKeyLength = sa.private_key?.length ?? 0;
    diag.privateKeyStartsCorrectly = sa.private_key.startsWith("-----BEGIN PRIVATE KEY-----");
    diag.privateKeyEndsCorrectly = sa.private_key.endsWith("-----END PRIVATE KEY-----");

    diag.stage = "build-jwt";
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

    diag.stage = "import-key";
    let key: CryptoKey;
    try {
      key = await crypto.subtle.importKey(
        "pkcs8",
        pemToArrayBuffer(sa.private_key),
        { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
        false,
        ["sign"],
      );
      diag.importKeyOk = true;
    } catch (e: any) {
      diag.tokenError = `importKey failed: ${e?.message ?? String(e)}`;
      return diag;
    }

    diag.stage = "sign-jwt";
    let sig: ArrayBuffer;
    try {
      sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(unsigned));
      diag.signOk = true;
    } catch (e: any) {
      diag.tokenError = `sign failed: ${e?.message ?? String(e)}`;
      return diag;
    }
    const jwt = `${unsigned}.${b64url(sig)}`;

    diag.stage = "exchange-token";
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
    });
    diag.httpStatus = res.status;
    const text = await res.text();
    // Truncate any raw body echo to avoid returning huge payloads.
    diag.googleResponseBody = text.slice(0, 2000);
    let json: any = null;
    try { json = JSON.parse(text); } catch { /* keep raw */ }
    if (json) {
      diag.googleError = json.error ?? null;
      diag.googleErrorDescription = json.error_description ?? null;
    }
    if (!res.ok) {
      diag.tokenError = `Google token exchange failed (${res.status}): ${diag.googleErrorDescription ?? diag.googleError ?? text.slice(0, 300)}`;
      return diag;
    }
    diag.tokenOk = true;
    return diag;
  } catch (e: any) {
    diag.tokenError = `${diag.stage}: ${e?.message ?? String(e)}`;
    return diag;
  }
}




// --- Build Merchant API ProductInput payload ---
// Docs: https://developers.google.com/merchant/api/reference/rest/products_v1beta/accounts.productInputs
function buildProductInput(sub: any, thumbnail: string | null) {
  const link = `${SITE_URL}/products/${sub.slug}`;
  const title = (sub.title ?? "Untitled").slice(0, 150);
  const description = (sub.description ?? title).slice(0, 5000);
  const priceMicros = Math.round(Number(sub.price) * 1_000_000).toString();
  return {
    offerId: String(sub.id),
    contentLanguage: CONTENT_LANGUAGE,
    feedLabel: FEED_LABEL,
    channel: CHANNEL,
    productAttributes: {
      title,
      description,
      link,
      imageLink: thumbnail || `${SITE_URL}/og-image.jpg`,
      availability: "in_stock",
      condition: "new",
      price: { amountMicros: priceMicros, currencyCode: "USD" },
      identifierExists: false,
      googleProductCategory: "Arts & Entertainment > Hobbies & Creative Arts",
      productTypes: ["Digital Stock Media"],
    },
  };
}

function productInputName(offerId: string) {
  // accounts/{account}/productInputs/{channel}~{contentLanguage}~{feedLabel}~{offerId}
  return `accounts/${MERCHANT_ID}/productInputs/${CHANNEL.toLowerCase()}~${CONTENT_LANGUAGE}~${FEED_LABEL}~${offerId}`;
}

function dataSourceName() {
  return `accounts/${MERCHANT_ID}/dataSources/${GOOGLE_MERCHANT_DATA_SOURCE}`;
}

async function gmcInsert(token: string, product: any) {
  const url = `${MERCHANT_API_BASE}/accounts/${MERCHANT_ID}/productInputs:insert?dataSource=${encodeURIComponent(dataSourceName())}`;
  console.error("[GMC] POST", url);
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(product),
  });
  const text = await res.text();
  console.error("[GMC] insert status", res.status, "body", text);
  let data: any; try { data = JSON.parse(text); } catch { data = { raw: text }; }
  if (!res.ok) {
    const msg = data?.error?.message ?? text;
    throw new Error(`Merchant API insert ${res.status}: ${msg}`);
  }
  return data;
}

async function gmcDelete(token: string, offerId: string) {
  const name = productInputName(String(offerId));
  const url = `${MERCHANT_API_BASE}/${name}?dataSource=${encodeURIComponent(dataSourceName())}`;
  console.error("[GMC] DELETE", url);
  const res = await fetch(url, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  const text = await res.text();
  console.error("[GMC] delete status", res.status, "body", text);
  if (!res.ok && res.status !== 404) {
    throw new Error(`Merchant API delete ${res.status}: ${text}`);
  }
}


Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const missing: string[] = [];
    if (!MERCHANT_ID) missing.push("GOOGLE_MERCHANT_ID");
    if (!Deno.env.get("GOOGLE_PROJECT_ID")) missing.push("GOOGLE_PROJECT_ID");
    if (!Deno.env.get("GOOGLE_CLIENT_EMAIL")) missing.push("GOOGLE_CLIENT_EMAIL");
    if (!Deno.env.get("GOOGLE_PRIVATE_KEY")) missing.push("GOOGLE_PRIVATE_KEY");
    if (!GOOGLE_MERCHANT_DATA_SOURCE) missing.push("GOOGLE_MERCHANT_DATA_SOURCE");
    if (missing.length) {
      return new Response(JSON.stringify({ error: `Missing secrets: ${missing.join(", ")}` }), {
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

    // Diagnostic: return eligibility + a sample payload without hitting Google.
    if (mode === "dryrun") {
      const { count: eligible } = await admin
        .from("content_submissions")
        .select("id", { count: "exact", head: true })
        .eq("status", "approved")
        .gt("price", 0)
        .not("slug", "is", null);
      const { data: sample } = await admin
        .from("content_submissions")
        .select("id, title, description, price, slug, content_files(thumbnail_path)")
        .eq("status", "approved")
        .gt("price", 0)
        .not("slug", "is", null)
        .limit(1)
        .maybeSingle();
      const tokenDiag = await diagnoseAccessToken();
      const samplePayload = sample
        ? buildProductInput(sample, sample.content_files?.[0]?.thumbnail_path ?? null)
        : null;
      return new Response(JSON.stringify({
        eligible: eligible ?? 0,
        tokenOk: tokenDiag.tokenOk,
        tokenError: tokenDiag.tokenError,
        tokenDiag,
        merchantId: MERCHANT_ID,
        dataSource: GOOGLE_MERCHANT_DATA_SOURCE,
        insertUrl: `${MERCHANT_API_BASE}/accounts/${MERCHANT_ID}/productInputs:insert?dataSource=${encodeURIComponent(dataSourceName())}`,
        samplePayload,
      }, null, 2), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

    }

    const token = await getAccessToken();
    let uploaded = 0, deleted = 0, failed = 0, considered = 0;
    const errors: any[] = [];

    async function processOne(sub: any, action: "upsert" | "delete") {
      considered++;
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
          await gmcInsert(token, buildProductInput(sub, thumbUrl));
          uploaded++;
          await admin.from("google_merchant_sync_log").insert({
            submission_id: sub.id, action: "upsert", status: "success",
            google_product_id: `online:en:US:${sub.id}`,
          });
        }
      } catch (e: any) {
        failed++;
        const msg = e?.message ?? String(e);
        console.error(`processOne(${action}) failed for ${sub.id}:`, msg);
        errors.push({ id: sub.id, error: msg });
        await admin.from("google_merchant_sync_log").insert({
          submission_id: sub.id, action, status: "error", error: msg?.slice(0, 1000),
        });
      }
    }

    if (mode === "full") {
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
        console.log(`[GMC] full sync page from=${from} rows=${rows.length}`);
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
      const { data: q } = await admin
        .from("merchant_sync_queue")
        .select("id, submission_id, action")
        .is("processed_at", null)
        .order("created_at", { ascending: true })
        .limit(500);
      console.log(`[GMC] queue items=${q?.length ?? 0}`);
      for (const item of q ?? []) {
        if (item.action === "upsert") {
          const { data: row } = await admin
            .from("content_submissions")
            .select("id, title, description, price, slug, content_files(thumbnail_path)")
            .eq("id", item.submission_id).maybeSingle();
          if (row && Number(row.price) > 0 && row.slug) {
            await processOne(row, "upsert");
          } else {
            console.log(`[GMC] queue skip ${item.submission_id} — not eligible`);
          }
        } else {
          await processOne({ id: item.submission_id }, "delete");
        }
        await admin.from("merchant_sync_queue").update({ processed_at: new Date().toISOString() }).eq("id", item.id);
      }
    }

    console.log(`[GMC] done considered=${considered} uploaded=${uploaded} deleted=${deleted} failed=${failed}`);
    return new Response(JSON.stringify({ considered, uploaded, deleted, failed, errors: errors.slice(0, 20) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    const msg = e?.message ?? String(e);
    console.error("sync-google-merchant fatal:", msg, e?.stack);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
