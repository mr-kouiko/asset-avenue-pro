# Google Merchant Center Integration

Live sync of VisuStock's premium products to Google Merchant Center using the **Content API for Shopping**, enabling free product listings across Google Surfaces (Search, Images, Shopping tab).

## Prerequisites (you handle these in Google)

1. **Google Merchant Center account** at https://merchants.google.com — create one and note the **Merchant ID** (numeric, e.g. `123456789`).
2. Verify and claim `visustock.com` in Merchant Center (DNS or HTML tag method — same flow as Search Console).
3. Opt in to **"Free product listings"** under Growth → Manage programs.
4. In **Google Cloud Console** (https://console.cloud.google.com):
   - Create/select a project, enable the **Content API for Shopping**.
   - Create a **Service Account**, generate a **JSON key** (download it).
   - Copy the service account email (looks like `xxx@yyy.iam.gserviceaccount.com`).
5. In Merchant Center → Settings → Users, **add the service account email** with **Standard** access. This authorizes the API.

Once you have the Merchant ID + service account JSON, I'll request them via secrets.

## What I'll build

### 1. Secrets
- `GOOGLE_MERCHANT_ID` — your numeric merchant ID
- `GOOGLE_MERCHANT_SERVICE_ACCOUNT_JSON` — full JSON key file contents

### 2. Edge function: `sync-google-merchant`
- Auth: admin-only (verify JWT, check `has_role(auth.uid(), 'admin')`).
- Modes:
  - `mode: "full"` — paginate all `approved` premium products (price > 0, exclude any Pexels-sourced rows) and `products.insert` them in batches of 1000 via Content API batch endpoint.
  - `mode: "single"`, `submissionId` — push one product (used by auto-sync trigger).
  - `mode: "delete"`, `submissionId` — `products.delete` on unpublish/delete.
- Builds Google product payload per submission:
  - `offerId` = submission UUID, `targetCountry` = "US", `contentLanguage` = "en", `channel` = "online"
  - `title` (≤150 chars), `description` (≤5000 chars), `link` = `https://visustock.com/products/{slug}`
  - `imageLink` = thumbnail from `content_files`
  - `price` = `{ value, currency: "USD" }`
  - `availability` = "in stock", `condition` = "new"
  - `identifierExists` = false (digital goods, no GTIN/MPN/brand)
  - `productTypes` = [category name], `googleProductCategory` = mapped Google taxonomy ID (photos/video → "Arts & Entertainment > Hobbies & Creative Arts")
- OAuth: mint a JWT from the service account key, exchange for an access token (Google token endpoint), cache in function memory per cold start.
- Returns counts: `{ uploaded, failed, errors[] }`.

### 3. Auto-sync on approval/changes
A Postgres trigger on `content_submissions` calls a small `notify-merchant-sync` edge function (via `pg_net` or by a lightweight queue table) whenever:
- `status` transitions to `approved` AND `price > 0` → push single product
- `status` leaves `approved` OR row deleted → delete product

If `pg_net` isn't available, fall back to a `merchant_sync_queue` table the function drains on each admin run.

### 4. Admin UI
New panel in `src/components/admin/AdminSettings.tsx` (or new `AdminGoogleMerchant.tsx`):
- **Status card** — shows merchant ID configured / last sync timestamp / total products synced.
- **"Sync all products now"** button → calls function with `mode: full`, shows progress + result toast.
- **Error log table** — last 50 sync errors from a new `google_merchant_sync_log` table (id, submission_id, action, status, error, created_at).

### 5. Migration
- `google_merchant_sync_log` table + RLS (admin read only) + GRANTs.
- Trigger function `notify_google_merchant_sync()` on `content_submissions` insert/update/delete.

## Out of scope (can add later)
- Multi-country / multi-currency feeds.
- Shopping Ads (paid) — requires Google Ads linkage.
- Pexels free items (excluded per your choice).
- Translated product listings per language (would need one feed per `contentLanguage`).

## Next step after you approve

I'll first ask you for the **Merchant ID** and the **service account JSON**, then build everything above.
