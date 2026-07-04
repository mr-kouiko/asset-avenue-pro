# VisuStock Cloudflare Prerender Worker

This Worker sits in front of `visustock.com` and serves crawler-friendly
HTML from the `prerender` Supabase Edge Function while real browsers keep
hitting the Lovable-hosted SPA untouched.

## 1. Deploy the Worker

### Option A — Dashboard (fastest)

1. Cloudflare dashboard → **Workers & Pages** → **Create application** →
   **Create Worker**. Name it `visustock-prerender`.
2. Click **Edit code**, delete the starter, paste the contents of
   `prerender-worker.js`, click **Deploy**.

### Option B — Wrangler CLI

```bash
npm i -g wrangler
wrangler login
# in this folder:
wrangler deploy prerender-worker.js --name visustock-prerender \
  --compatibility-date 2024-11-01
```

## 2. Bind the Worker to routes

In the dashboard: **Workers & Pages → visustock-prerender → Settings →
Domains & Routes → Add → Route**.

Add both:

- Zone: `visustock.com`
  - Route: `visustock.com/*`
- Zone: `visustock.com`
  - Route: `www.visustock.com/*`

The Worker itself skips static assets (`.js`, `.css`, images, fonts,
`/lovable-uploads/*`, `/assets/*`, etc.) and private routes (`/admin`,
`/dashboard`, `/auth`, `/checkout`, ...) so binding to `/*` is safe —
non-crawler and non-HTML traffic is passed through with a single
`fetch(request)` that hits your normal Lovable origin.

Make sure the DNS records for `visustock.com` and `www.visustock.com`
are **Proxied** (orange cloud) in Cloudflare — otherwise the Worker
never runs.

## 3. How it decides what to prerender

- Request must be `GET`/`HEAD`.
- Path must not be a static asset or a private route (see
  `SKIP_PATH_PREFIXES` / `STATIC_EXT` in the Worker).
- `User-Agent` must match one of: Googlebot, Bingbot, GPTBot,
  ChatGPT-User, OAI-SearchBot, ClaudeBot, anthropic-ai, Claude-Web,
  PerplexityBot, facebookexternalhit, LinkedInBot, Twitterbot,
  Discordbot, Slackbot, Applebot, YandexBot, DuckDuckBot, CCBot,
  Google-Extended.

If all three match, the Worker calls:

```
GET https://kdgfpophpoqugtuvfxqx.supabase.co/functions/v1/prerender?path=<encoded pathname+search>
```

with the crawler's original UA (so the Edge Function's own crawler
check passes) and the Supabase anon key.

If the response is not `text/html` (e.g. the function returns
`{prerender:false, reason:"unknown-path"}`) or the request errors /
times out (4s), the Worker falls back to `fetch(request)` and returns
the normal SPA — crawlers never see a broken page.

## 4. Verification (run from your laptop)

Replace `visustock.com` with `www.visustock.com` if that's your canonical.

### Crawlers should get real prerendered HTML

```bash
# Googlebot — homepage
curl -sS -A "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)" \
  https://visustock.com/ | grep -Ei "<h1|application/ld\+json|<title>" | head

# Bingbot — marketplace
curl -sS -A "Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)" \
  https://visustock.com/marketplace | grep -Ei "<h1|Marketplace|CollectionPage" | head

# GPTBot — a category filter
curl -sS -A "Mozilla/5.0 (compatible; GPTBot/1.0; +https://openai.com/gptbot)" \
  "https://visustock.com/marketplace?category=<CATEGORY_UUID>" | grep -Ei "<h1|itemtype" | head

# ClaudeBot — a dynamic product page (replace with a real slug)
curl -sS -A "Mozilla/5.0 (compatible; ClaudeBot/1.0; +claudebot@anthropic.com)" \
  https://visustock.com/products/<YOUR-PRODUCT-SLUG> | grep -Ei "<h1|schema.org/Product|itemprop=\"price\"" | head

# PerplexityBot
curl -sS -A "Mozilla/5.0 (compatible; PerplexityBot/1.0; +https://www.perplexity.ai/perplexitybot)" \
  https://visustock.com/products/<YOUR-PRODUCT-SLUG> | grep -Ei "<h1|BreadcrumbList" | head

# Social scrapers (OG tags)
curl -sS -A "facebookexternalhit/1.1" https://visustock.com/ | grep -Ei "og:title|og:image|og:description"
curl -sS -A "LinkedInBot/1.0 (compatible; Mozilla/5.0; Jakarta Commons-HttpClient/3.1 +http://www.linkedin.com)" \
  https://visustock.com/marketplace | grep -Ei "og:"
curl -sS -A "Twitterbot/1.0" https://visustock.com/ | grep -Ei "twitter:"
curl -sS -A "Slackbot-LinkExpanding 1.0 (+https://api.slack.com/robots)" \
  https://visustock.com/products/<YOUR-PRODUCT-SLUG> | grep -Ei "og:"
curl -sS -A "Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)" \
  https://visustock.com/ | grep -Ei "og:"
```

You should see real `<h1>…</h1>`, product titles / category names, and
`<script type="application/ld+json">` blocks in every crawler response.
The response headers should include `X-Prerendered: 1` and
`Vary: User-Agent` — quick check:

```bash
curl -sSI -A "Googlebot" https://visustock.com/ | grep -i x-prerendered
```

### Real browsers should still get the SPA shell

```bash
# Chrome-like UA — expect empty <div id="root"></div>, no <h1>
curl -sS -A "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36" \
  https://visustock.com/ | grep -Ei "<div id=\"root\"|<h1"
# Should print only the <div id="root"></div> line — no <h1>.

# Static asset — must NOT be prerendered, must return the real JS
curl -sSI -A "Googlebot" https://visustock.com/assets/index.js | grep -i content-type
# Content-Type should be application/javascript (Worker skipped it).
```

## 5. Troubleshooting

- **Crawler still sees the empty shell** → check the Worker route bindings
  in the dashboard (`visustock.com/*` AND `www.visustock.com/*`) and
  that DNS is orange-cloud proxied.
- **`X-Prerendered` header missing** → the Worker chose to skip. Confirm
  the UA (`curl -A "Googlebot" -sSI https://visustock.com/ | grep -i x-`)
  and confirm the path isn't in `SKIP_PATH_PREFIXES`.
- **Blank / 500 for a specific path** → hit the Edge Function directly:
  `curl -A Googlebot "https://kdgfpophpoqugtuvfxqx.supabase.co/functions/v1/prerender?path=/products/your-slug" | head`.
  If that's broken, fix `supabase/functions/prerender/index.ts`; the
  Worker will keep falling back to the SPA in the meantime.
