## Diagnosis

The product `highway-aerialhighway-trafficinterchange-kingabdulazizcenter` has **no preview file** in the database:

- `content_files.preview_path` = `NULL`
- `content_files.thumbnail_path` = a valid JPG (works fine on the marketplace grid)
- `content_files.file_path` = the original 26 MB MP4 in the public `uploads` bucket
- `content_submissions.status` = `approved` (it should not be — see issue 3 below)

When the product page opens, `useProductDetail.tsx` falls back to the **original MP4** as `previewUrl` because no `preview_path` exists. Chromium then fails to decode it:

```
Media error: code 4 — DEMUXER_ERROR_NO_SUPPORTED_STREAMS:
FFmpegDemuxer: no supported streams
```

The original file is encoded with a codec/profile the browser cannot play (likely HEVC/H.265 or an unsupported pixel format from the source camera). Because the `<video>` element errors out before painting any frame and the `poster` is currently not set (the thumbnail check in `ProductDetail.tsx` line 623 excludes it when the path "includes placeholder"), the player surface stays empty — the watermark overlay tinted black gives the "blue screen" you see.

So three independent issues compound:

1. **Missing 720p preview** — the file never went through the preview pipeline, so the browser is being asked to play the raw original instead of the normalized H.264 preview.
2. **Silent fallback to original** — `useProductDetail.tsx` falls back to `file_path` when `preview_path` is missing. This contradicts the project rule "NO fallback to original file_path for playback — ever" and hides the real problem from users.
3. **Approval slipped through** — the submission is `approved` despite missing `preview_path`. The DB trigger that should hold it in `processing_preview` either no longer exists or didn't fire for this row (the `preview_generation_status` column doesn't exist anymore, suggesting the guard was dropped/refactored).

## Fix

### 1. Backfill the preview for this product (immediate)
Use the existing server-side FFmpeg backfill API (the `video-preview-backfill-system` referenced in memory) to regenerate a 720p watermarked preview for submission `e79b6565-a6ce-4b9a-b099-6eabf6329ffe`, upload it to `public-previews`, and write the resulting path into `content_files.preview_path`. This will make the player work for this product without any code change.

### 2. Harden the player path (prevent recurrence visually)
In `src/hooks/useProductDetail.tsx` (video branch):
- Stop silently falling back to the original `file_path` for `<video>` playback.
- When `preview_path` is missing, set `previewUrl = undefined` so `ProductDetail.tsx` shows the existing "Video processing — it will be available shortly" placeholder instead of a broken player.
- Always pass the thumbnail JPG as the player `poster` (remove the over-eager exclusion at `ProductDetail.tsx` line 623 — only skip when the thumbnail is literally `placeholder.svg`, not whenever the string contains "placeholder").

In `src/components/media/MediaPlayer.tsx`:
- On `<video>` `error` event (code 4 / demuxer error), render a clear "This preview can't be played in your browser" overlay with the thumbnail behind it, instead of an empty black canvas.

### 3. Re-enable the approval guard (prevent recurrence at the source)
Add (or re-add) a `BEFORE INSERT/UPDATE` trigger on `content_submissions` that, for rows where the linked `content_files` row has `file_type='video'` and `preview_path IS NULL`, forces `status` back to `'processing_preview'` (or whatever non-approved status the pipeline uses). Then run a one-shot SQL to find all currently-approved video submissions whose files have `preview_path IS NULL`, flip them to `processing_preview`, and enqueue them in the backfill job.

### 4. Verify
- Reload the product page in Playwright; confirm the `<video>` element loads (`readyState >= 2`, no demuxer error) and the watermarked preview plays.
- Open one more random `?type=video` product from the marketplace; confirm playback still works.
- Run the audit SQL from step 3 and confirm 0 approved videos without a preview.

## Technical references

- Files involved: `src/hooks/useProductDetail.tsx`, `src/pages/ProductDetail.tsx` (lines 610–645), `src/components/media/MediaPlayer.tsx`, the `video-preview-backfill` edge function, and a new migration for the trigger.
- DB row to backfill: `content_submissions.id = e79b6565-a6ce-4b9a-b099-6eabf6329ffe`, `content_files.id = 2af43f5a-04f9-4609-b193-ea4da0dc12e2`.
- No UI redesign, no change to watermark logic, no change to storage layout.
