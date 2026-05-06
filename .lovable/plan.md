## Goal
Make video previews play the **full length** of the original video (still 720p + watermarked), instead of being trimmed to 6 seconds.

## Root cause
Previews are hardcoded to 6 seconds in two places:
- `src/hooks/useServerVideoPreview.tsx` — defaults `duration = 6` and passes it to the edge function.
- `supabase/functions/generate-video-preview/index.ts` — forwards `duration` to the FFmpeg API, which trims output to that length.

Plus, the existing cached previews in the `public-previews` bucket are already 6s files, so even after the fix they'd stay short until regenerated.

## Changes

### 1. Stop trimming new previews
- `src/hooks/useServerVideoPreview.tsx`: remove the `duration = 6` default; do not send `duration` unless explicitly provided.
- `supabase/functions/generate-video-preview/index.ts`: when `duration` is missing, do NOT pass a trim flag to the FFmpeg API → full-length output.
- `docker/ffmpeg-api/server.js`: confirm the `-t` flag is only applied when `duration` is provided (skip it otherwise).

### 2. Other call sites
- `useVideoPreviewGenerator.ts` and any client-side EBML/MediaRecorder paths: audit for hardcoded 6s caps and remove them so re-generated previews are full length.

### 3. Regenerate existing 6s previews
- Use the existing `AdminVideoBackfill` flow / `generate-video-preview` function to overwrite cached previews. Add a "force regenerate" flag (skip the cache check) so previously trimmed files get replaced.
- Optionally run a one-time backfill across all approved video products.

### 4. Keep duration label correct
- Already wired to `get_product_original_video_url` RPC → no change needed; full-length label will now match the playable preview.

## Heads up
- Watermarked full-length previews give buyers most of the value of the original (just at 720p with a watermark). If piracy becomes an issue later, we can re-add a cap (e.g. 30s or 50% of length).
- Storage + bandwidth costs will go up significantly (previews become roughly N× larger where N = original_duration / 6).
- Backfill of existing previews will cost FFmpeg API processing time across all current video products.

## Files touched
- `src/hooks/useServerVideoPreview.tsx`
- `src/hooks/useVideoPreviewGenerator.ts` (audit)
- `supabase/functions/generate-video-preview/index.ts`
- `docker/ffmpeg-api/server.js`
- `src/components/admin/AdminVideoBackfill.tsx` (add force-regenerate option)
