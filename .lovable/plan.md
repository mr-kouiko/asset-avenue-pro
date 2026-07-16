
## Scope

6 image edit tools powered by `google/gemini-3.1-flash-image` via Lovable AI Gateway, exposed on both internal images and Pexels images, in both surfaces (QuickView modal + ProductDetail page). Costs 1 credit / edit. Output is watermarked before download. **Animate is deferred** (separate follow-up once the 6 image tools are shipped).

## Tools shipped

| Tool | Prompt sent to Gemini |
|---|---|
| Type to edit | user's free-text prompt |
| Remove background | migrated from existing `remove-background` fn to `gemini-3.1-flash-image` |
| Expand image | "Extend/outpaint this image beyond its borders, seamlessly continuing the scene on all sides. Maintain style, lighting, and perspective." |
| Change background | "Replace the background of this image with: {userPrompt}. Keep the main subject unchanged with clean edges." |
| Change mood | "Change the mood/atmosphere/lighting of this image to: {userPrompt}. Preserve subject and composition." |
| Change color | "Recolor / shift the color palette of this image to: {userPrompt}. Preserve subject, composition, and details." |

## Backend

**New edge function `ai-edit-image`** (single endpoint, action-based) — the fan-out avoids 6 near-identical functions:

```
POST /ai-edit-image
{ action: 'prompt' | 'remove-bg' | 'expand' | 'change-bg' | 'change-mood' | 'change-color',
  imageUrl: string (https URL or data:), prompt?: string }
→ { imageUrl: base64 dataUrl, creditsRemaining: number }
```

Flow (mirrors `generate-ai-image`):
1. Verify JWT → get user
2. Check `user_credits.credits_balance >= 1` (service role)
3. Build prompt from action + userPrompt
4. Call `https://ai.gateway.lovable.dev/v1/chat/completions` with `google/gemini-3.1-flash-image`, `messages` + `image_url` block, `modalities: ["image","text"]`
5. Handle 429/402/content-policy errors
6. `deduct_user_credit(user, 1)`
7. Insert row in `ai_image_generations` for history
8. Return image + updated balance

Existing `remove-background` fn stays for backward compat but the new UI routes through `ai-edit-image`.

**Animate deferred**: no Veo work in this batch. A placeholder "Animate (soon)" button is rendered disabled with a tooltip; wiring will reuse `generate-veo-video` in a follow-up.

## Frontend — shared component

New file `src/components/ai-studio/AIImageStudioPanel.tsx`:
- Trigger button "✨ Edit with AI" (Studio AI entry point)
- On click, opens a right-side Sheet (Radix) or overlay panel with:
  - Live preview of current image (original vs. latest result, before/after slider on result)
  - 6 tool tabs / pills (Type to edit, Remove BG, Expand, Change BG, Change mood, Change color, Animate-disabled)
  - Contextual input (textarea for tools that need a user prompt)
  - "Generate (1 credit)" button — shows current balance
  - Result preview + "Download watermarked" button (uses existing `applyImageWatermark` util — added if missing, matching video watermark style)
  - "Try another" resets to original
- Props: `{ imageUrl: string; alt: string; source: 'internal' | 'pexels'; onClose?: () => void }`
- Handles: auth gate (prompt to sign in), insufficient-credits state (link to `/buy-credits`), errors, loading.

Watermark: reuse the existing SVG "VISUSTOCK" diagonal pattern from `VideoWatermark.tsx`, applied to a canvas overlay on export.

## Integration points

1. **QuickView modal** (`src/components/quickview/QuickViewBody.tsx`) — for image assets (internal + Pexels), add a top-right button "Edit with AI" that opens the `AIImageStudioPanel` inline (replaces main image area while open, keeps modal open).
2. **ProductDetail** (`src/pages/ProductDetail.tsx`) — for image products, add the same button below the main image.
3. **PexelsAssetDetail** (`src/pages/PexelsAssetDetail.tsx`) — same button. For Pexels, pass the public Pexels image URL directly.

## Credits

Uses existing `user_credits` + `deduct_user_credit` RPC. 1 credit per edit. No new tables.

## Files changed

- **New**: `supabase/functions/ai-edit-image/index.ts`
- **New**: `src/components/ai-studio/AIImageStudioPanel.tsx`
- **New**: `src/components/ai-studio/AIImageStudioButton.tsx` (small wrapper trigger)
- **New**: `src/utils/imageWatermark.ts` (canvas-based export watermark)
- **Edit**: `src/components/quickview/QuickViewBody.tsx` (mount button for images)
- **Edit**: `src/pages/ProductDetail.tsx` (mount button for image products)
- **Edit**: `src/pages/PexelsAssetDetail.tsx` (mount button)

## Out of scope (explicit)

- Animate image (Veo) — deferred; disabled UI placeholder only
- Saved history / "My AI Edits" gallery — user opted for watermarked download only
- Batch edits / multi-step chains
- Editing videos or non-image assets
