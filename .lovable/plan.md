# Remove Video Watermark Pipeline — Plan

This rewires video uploads to skip all server-side preview/transcoding work. Originals are stored, playback streams the original behind a CSS watermark overlay, and thumbnails are generated in the browser.

⚠️ This **reverses two existing Core project rules** stored in memory:
- "STRICT: video products require preview_path to be approved. DB trigger forces status='processing_preview' until preview exists… NO fallback to original file_path for playback — ever."
- "Video Hardening: Original private-videos vs public-previews, masked file_path"

I'll update `mem://index.md` and related memory files (`architecture/video-preview-system-v7`, `security/video-delivery-hardening-v7`) to reflect the new policy: **originals stream directly with a CSS watermark**. Confirm you accept the security trade-off — anyone who inspects the network tab on a product page will be able to download the original un-watermarked MP4. The only protection becomes the visual overlay.

---

## 1. Database changes (single migration)

- Drop the trigger/function that forces `content_submissions.status = 'processing_preview'` until a preview exists, and the trigger that auto-promotes to `approved` on preview arrival.
- Backfill: any submission currently in `processing_preview` for a video → set to `approved` (assuming all other gates pass), so the ~26 stuck videos appear immediately.
- Leave `content_files.preview_path` / `preview_status` columns in place (non-breaking); they'll just stay null for new uploads. No data destruction.

## 2. Delete edge functions

Remove from `supabase/functions/` and call `supabase--delete_edge_functions` for:
- `generate-video-preview`
- `batch-backfill-previews`
- `audit-broken-previews`
- `watermark-video`
- `probe-ffmpeg-api`
- `generate-video-thumbnail` (server-side thumb; replaced by client-side)
- `backfill-video-thumbnails`

Keep: `proxy-video` (still useful for CORS), `detect-ai-video`, `generate-veo-video`, `image-to-video`.

## 3. Delete Render FFmpeg integration

- Delete `docker/ffmpeg-api/` entirely.
- Delete the stray empty `ffmpeg-api` file at repo root.
- Remove `FFMPEG_API_URL` / `FFMPEG_API_KEY` secrets (I'll instruct you to delete them in the Supabase dashboard — secret deletion is manual).

## 4. Frontend deletions

Hooks (delete):
- `src/hooks/useServerVideoPreview.tsx`
- `src/hooks/useVideoPreviewGenerator.ts`
- `src/hooks/useWatermarkedPreview.tsx`
- `src/hooks/useAutomaticWatermark.tsx` (video portions; if image watermark logic is mixed in I'll keep image-only)

Components (delete):
- `src/components/admin/AdminVideoBackfill.tsx` + remove from `AdminDashboard`
- `src/components/admin/AdminFailedPreviews.tsx` + remove from `AdminDashboard`
- `src/components/WatermarkedVideoThumbnail.tsx`
- `src/components/WatermarkedGallery.tsx` (video paths only — verify no image usage first; if used for images, keep image branch)

Utils (delete):
- `src/utils/videoWatermark.js`
- Video branch of `src/utils/watermark.ts` (keep image watermarking)

## 5. New upload flow

In `useEnhancedUpload.tsx` / `useDraftManager.tsx` / `StreamingUploadHandler.tsx`:
- After R2/storage upload of a video finishes → set `content_files.preview_status = 'not_required'`, leave `preview_path = null`.
- Submission goes straight to the normal moderation flow (no `processing_preview` gate).
- Remove all `invoke('generate-video-preview', …)` calls and the failure toasts that surfaced as "Preview generation failed: Edge Function returned a non-2xx status code".

## 6. New playback: original + CSS watermark overlay

- `UniversalVideoPlayer.tsx` / `VideoPlayer.tsx` / `MediaPlayer.tsx`:
  - Source = original file via `proxy-video` (signed/short-lived URL from a small `get-video-preview-url` edge function that returns a streaming URL for the **original** file, gated by "is this a marketplace preview context" — purchasers get the unsigned download via the existing secure-download path).
  - Add a new `<VideoWatermarkOverlay />` sibling absolutely positioned over the `<video>` element: a CSS-only SVG/`background-image` pattern tiling "VISUSTOCK" diagonally (e.g. `-30deg` rotated repeating pattern, ~40% opacity, `pointer-events: none`, `mix-blend-mode: overlay`). Always visible during playback and fullscreen.
- `VideoWatermark.tsx` is repurposed (or replaced) as this pure-CSS overlay component. No canvas, no MediaRecorder.

## 7. Thumbnails — client-side

- On upload, in the browser: load the file into a hidden `<video>`, seek to ~10%, draw to `<canvas>`, export JPEG, upload as the poster (existing thumbnail bucket). Already partly present in `useVideoPreviewGenerator` — extract just the thumbnail half into a new lightweight `useClientVideoThumbnail.ts`.
- For legacy videos missing a thumbnail, generate on first card render (already the fallback path in `ContentCard`/`WatermarkedVideoThumbnail`); after deletion of `WatermarkedVideoThumbnail`, fold its client-side thumbnail logic into `ContentCard`.

## 8. Downloads

- No watermarked MP4 anywhere. Existing `SecureDownloadButton` already serves the original on purchase — confirm and remove any "download preview" affordance on product pages (`ProductDetail.tsx`).
- Marketplace card "download preview" button (Pexels-only currently) stays as-is for Pexels free assets.

## 9. Memory updates

Rewrite:
- `mem://architecture/video-preview-system-v7` → v8: "No server-side preview. Original streamed, CSS overlay watermark."
- `mem://security/video-delivery-hardening-v7` → updated trade-off note.
- `mem://index.md` Core: replace the STRICT preview rule with: "Videos: store + stream original MP4. Watermark is a CSS overlay on the player. No FFmpeg, no Render, no preview encoding."

## Technical notes

- Single migration drops 2 triggers + 1 function + runs the backfill UPDATE in one transaction.
- Edge function deletions are done via `supabase--delete_edge_functions` after removing the source folders.
- Frontend keeps `useMarketplace` RPC unchanged — but the underlying SQL function `search_marketplace` currently filters videos on `preview_available`. That filter is removed in the same migration (videos with `file_path` are eligible).
- All `corsHeaders` and remaining function shapes untouched.

## Out of scope

- Audio previews (separate pipeline, untouched).
- Image watermarking (untouched).
- Pexels integration (untouched).
