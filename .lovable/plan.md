## Plan: Pond5-Style Text-to-Video (Veo 3) — Replace Old Video Credits

### Goal
- Build a Text-to-Video page styled like Pond5, powered by **Google Veo 3 / Veo 3 Fast**.
- **Replace** the old VisuStock generation credit model for video with a **dedicated VideoAI credits wallet** that mirrors Pond5's pricing exactly.
- Image Generator and other AI tools keep using the existing `user_credits` wallet — they are not affected.

---

### 1. New page `/studio-ai/text-to-video`
Reproduces the Pond5 layout (English-only, USD-only):
- Hero: "Bring your imagination to life with VideoAI" + a single dark prompt input + "Generate" button.
- Options row directly under the prompt:
  - **Aspect Ratio**: 16:9 / 9:16
  - **Resolution**: 720p / 1080p
  - **Duration**: 4s / 6s / 8s
  - **Audio**: Off / On
  - **Model**: Automatic / Veo 3 / Veo 3 Fast
- Result panel below with progress state, then the generated MP4 player + Download button.
- Marketing sections: "Generate professional-quality AI videos in seconds" + "Pay only for what you create" linking to the VideoAI credit packs.
- Wallet badge in the header showing remaining VideoAI credits and a "Buy credits" link.

Update `src/pages/StudioAI.tsx` so the Text-to-Video card is `available: true` (badge "New"), pointing to the new route. Add the route in `src/App.tsx`.

---

### 2. New VideoAI wallet (replaces old video credits)
Create a **separate wallet table** so the old per-generation credit logic is fully removed for video, and Image Gen / other tools continue to work untouched:

```text
videoai_credits
  user_id (PK, FK auth.users)
  credits_balance (int, default 0)
  updated_at (timestamptz)

videoai_transactions
  id, user_id, type ('purchase' | 'spend' | 'refund'),
  credits_delta (int, signed),
  reason text, generation_id uuid nullable,
  paypal_order_id text nullable,
  created_at
```

RLS: users can SELECT their own row; only `service_role` writes. Two RPCs:
- `add_videoai_credits(user_id, amount, paypal_order_id, reason)`
- `spend_videoai_credits(user_id, amount, generation_id, reason)` — atomic check `balance >= amount`, returns boolean.

### 3. Pond5-style credit packs (USD)
Add a **VideoAI** tab in `src/pages/BuyCredits.tsx` with three packs:

| Pack | Price | VideoAI Credits | ≈ Generations |
|------|-------|-----------------|---------------|
| Starter | **$20** | 500 | 5 |
| Popular | **$75** | 2,000 | 20 (6% off) |
| Pro | **$220** | 6,000 | 60 (8% off) |

Included in all packs: text-to-video generation, native audio, credits valid 1 year (marketing copy).

### 4. Cost model (server-validated)
Base cost per generation = **100 credits** (Veo 3, 8s, 1080p, audio on). Multipliers, applied server-side from validated params:
- Model: `veo-3` ×1.0, `veo-3-fast` ×0.4, `automatic` resolves to `veo-3-fast`
- Duration: 4s ×0.5, 6s ×0.75, 8s ×1.0
- Resolution: 720p ×0.8, 1080p ×1.0
- Audio off ×0.9

Examples: Veo 3 8s 1080p audio = 100; Veo 3 Fast 8s 720p audio = ~32; Veo 3 Fast 4s 720p no audio = ~14.

The exact integer cost is computed and shown in the UI before "Generate", and re-computed server-side before debit.

### 5. PayPal flow
Extend the existing PayPal pipeline (already used for `user_credits` top-ups):
- `create-paypal-order`: accept new `order_type = 'videoai_credits'` with `pack_id` and the corresponding amount.
- `capture-paypal-order`: on capture of a videoai pack, call `add_videoai_credits` and write the `videoai_transactions` row. The `paypal_orders.pack_type` column already exists and will store `'videoai_starter' | 'videoai_popular' | 'videoai_pro'`.

### 6. New Edge Function `generate-veo-video`
- `verify_jwt = true`.
- Validates user, validates input with Zod (model whitelist, duration ∈ {4,6,8}, resolution ∈ {720,1080}, ratio ∈ {'16:9','9:16'}, audio bool, prompt 1–500 chars).
- Computes cost server-side, calls `spend_videoai_credits` first; aborts with 402 if insufficient.
- Calls Lovable AI Gateway video endpoint for `google/veo-3` or `google/veo-3-fast`. Polls until ready (Veo is async, ~30–90s) and returns intermediate status to the client (long-poll style or single response with poll endpoint — simplest: single function call, awaits completion within 150s edge limit; for ≤8s clips this fits comfortably).
- On failure, refunds credits via `add_videoai_credits` (reason `'refund:generation_failed'`).
- On success: uploads MP4 to new public bucket `ai-videos/{user_id}/{uuid}.mp4`, inserts a row in `ai_video_generations` (prompt, model, duration, resolution, ratio, audio, credits_spent, video_url).
- Returns `{ videoUrl, creditsRemaining, generationId }`. 429/402 surfaced as English toasts.

### 7. Database changes (single migration)
- Create `videoai_credits`, `videoai_transactions`, `ai_video_generations` tables with RLS (users see own rows, admins see all).
- Create `add_videoai_credits` and `spend_videoai_credits` RPCs (`SECURITY DEFINER`, `search_path=public`).
- Create public storage bucket `ai-videos` (50MB file size limit, MP4 only).
- **Cleanup**: remove any references / rows tied to the old "video generation" credit deductions in `user_credits` (none in DB schema — the change is code-only: `image-to-video` edge function and any UI that previously deducted from `user_credits` for video generation will be updated or removed).

### 8. Existing `image-to-video` (kept, but moved to VideoAI wallet)
The current `/studio-ai/image-to-video` page also produces videos. To stay consistent with "remove the old credit system for video generation", route it through the **same VideoAI wallet** with a flat cost (e.g. 60 credits per generation). The old per-call charge against `user_credits` is removed.

### 9. Recent generations
Small "Recent generations" strip on the Text-to-Video page showing the user's last 6 videos from `ai_video_generations`, each with Download.

---

### Files
- **Create**: `src/pages/TextToVideoAI.tsx`, `supabase/functions/generate-veo-video/index.ts`, migration for tables/RPCs/bucket.
- **Edit**: `src/App.tsx` (route), `src/pages/StudioAI.tsx` (enable card), `src/pages/BuyCredits.tsx` (add VideoAI tab + packs), `supabase/functions/create-paypal-order/index.ts` and `capture-paypal-order/index.ts` (handle `videoai_credits` order_type), `supabase/functions/image-to-video/index.ts` (switch debit to VideoAI wallet), `supabase/config.toml` (register new function).

### Open question (resolved at deploy time)
Google Veo 3 availability via the Lovable AI Gateway must be confirmed. If Veo isn't yet exposed on the gateway, fallback is **Replicate `google/veo-3`** with a `REPLICATE_API_TOKEN` secret (which I'll request before deploying). UI, credits logic, and DB stay identical either way.
