## Goal

Fix the broken video preview pipeline so every uploaded video reliably gets a watermarked MP4 preview before publishing, and existing stuck items are auto-recovered.

## Root cause (confirmed)

- Render `/process` expects JSON `{ videoUrl, watermarkUrl, resolution }` and downloads the source itself. The working `batch-backfill-previews` function already calls it that way.
- `generate-video-preview` instead downloads the file in Deno and POSTs it as `multipart/form-data` → Render returns 400, preview never produced.
- Frontend `useAutomaticWatermark` swallows that failure (`// Video preview is optional`), so publish proceeds with `preview_path = null` and the DB trigger keeps the row in `processing_preview` forever.
- Client-side recorder may produce `video/webm`, but the marketplace requires `preview_path ~ '.mp4'`, causing a second class of stuck items.

## Chosen architecture

**Option B** — Edge Function sends JSON, Render downloads. This matches the already-working backfill path, requires no Render redeploy, and avoids re-uploading large bodies through Deno.

## Changes

### 1. `supabase/functions/generate-video-preview/index.ts` — rewrite payload

- Drop the Deno-side download + FormData body.
- Create a 1-hour signed URL for the source via `supabase.storage.from('uploads').createSignedUrl(videoPath, 3600)`.
- Build a public URL for the watermark logo in `LOGO DE WATERMARKING`.
- POST JSON to `FFMPEG_API_URL`:
  ```json
  { "videoUrl": "<signed>", "watermarkUrl": "<logo>", "resolution": 720 }
  ```
  Headers: `Authorization: Bearer ${FFMPEG_API_KEY}`, `Content-Type: application/json`.
- Receive MP4 bytes → upload to `previews` bucket (not `uploads/previews/`) at `${userId}/videos/${fileId}_preview.mp4` with `contentType: 'video/mp4'`.
- Update `content_files.preview_path` (and `preview_status='preview_available'`) for the matching row using `submission_id` or `file_path`.
- Keep all existing `[STAGE:*]` / `[FAILURE:*]` logs; add `[STAGE:render-call]` with payload summary and `[STAGE:render-done]` with bytes/ms.
- Return `{ success, previewUrl, previewPath }` on success, structured `failureReason` on failure (no silent OK).

### 2. `src/hooks/useAutomaticWatermark.tsx` — remove silent failures, force MP4

- Replace the `MediaRecorder` MIME selection with **MP4 only**. If `MediaRecorder.isTypeSupported('video/mp4;codecs=avc1') === false`, skip the client path entirely and go straight to server-side.
- Remove the `// Video preview is optional - continue without it` block. Server-side failure must:
  - throw → caught by outer `processSingle` try/catch
  - mark file `status: 'error'`, surface a `toast.error` with the `failureReason`
  - prevent the file from reaching publish
- Validate before completing: `previewUrl` is set, ends in `.mp4`, blob `> 20 KB`. Otherwise throw "Preview generation failed — cannot publish".

### 3. `src/hooks/useProductManager.tsx` & `src/hooks/useContentManagement.tsx` — gate publish

- Before inserting a video into `content_files`, assert `submission.file.previewUrl` exists and matches `/\.mp4($|\?)/`. If missing → abort the insert, surface `toast.error("Video preview not ready — cannot publish.")`, and leave the submission in draft.
- Do not create rows with `preview_path = null` for `file_type='video'`.

### 4. `docker/ffmpeg-api/server.js` — no protocol change needed

Already JSON-compatible. Add only:
- Log incoming payload (`videoUrl` host, `resolution`) at `START`.
- Echo `Content-Type: video/mp4` (already does).
- No code change unless we discover an issue during smoke test.

### 5. Auto-backfill (replaces "silent" failure recovery)

- New scheduled `pg_cron` job (every 10 min) that calls `batch-backfill-previews` with `{ dryRun:false, maxVideos:25, batchSize:5 }`.
- Created via `supabase--read_query` insert path (contains anon key) — not a migration.
- Existing `AdminVideoBackfill` UI keeps its manual button.

### 6. Storage / DB sanity (migration)

- Ensure `previews` bucket exists, public, allowed MIME `['video/mp4','image/jpeg','image/png','image/webp']`. Drop `video/webm` if present.
- Confirm `content_files.preview_status` enum already supports `preview_available` / `preview_failed` (it does — no change).
- Add CHECK trigger: when `file_type='video'` and `preview_path IS NOT NULL`, require `preview_path ILIKE '%.mp4%'`.

## Verification

1. Smoke test: `supabase--curl_edge_functions /generate-video-preview` with the stuck Eiffel Tower video path → expect MP4 bytes saved, `preview_path` populated, status auto-promotes to `approved`.
2. Upload a fresh vertical MP4 from the UI → confirm publish blocks if preview fails (kill `FFMPEG_API_URL` temporarily) and succeeds otherwise.
3. Run cron job manually once → confirm Eiffel Tower + any other null-preview videos are healed.
4. Marketplace filter check: vertical filter returns the new video.

## Files touched

- `supabase/functions/generate-video-preview/index.ts` (rewrite request)
- `src/hooks/useAutomaticWatermark.tsx` (MP4-only, no silent fallback)
- `src/hooks/useProductManager.tsx`, `src/hooks/useContentManagement.tsx` (publish gate)
- `supabase/migrations/<new>.sql` (bucket MIME tightening + preview_path CHECK trigger)
- DB insert (not a migration) for the cron schedule

No changes required to `docker/ffmpeg-api/server.js`.
