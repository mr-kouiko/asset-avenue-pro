# Why some previews show 0:00

The previews showing `0:00` are **old client-side generated files** from before the server-side FFmpeg pipeline. Two patterns in the DB confirm this:

- Path shape `/previews/<sub>/previews/<ts>-<rand>_preview.mp4` and `/previews/<sub>/videos/<ts>-<rand>_original_preview_720p.mp4` → produced by `useVideoPreviewGenerator` / `useAutomaticWatermark` (Canvas + MediaRecorder in the browser).
- Path shape `/previews/<sub>/<fileId>_preview.mp4` → produced by the new server-side `generate-video-preview` / `batch-backfill-previews` (FFmpeg API on Render). These are the healthy ones.

### Root cause
MediaRecorder on Chromium writes a WebM/MP4 container **without a duration in the header** (it's an unfinalized stream). Browsers then display `0:00` until the user seeks to the end. On top of that, some of those recordings were truncated to a single frame when the source tab was throttled, so the file really is ~0 s.

### Recommendation
Don't delete the rows — just **re-process** them through the server pipeline. The FFmpeg job rewrites the file at the same canonical path `previews/<submission_id>/<file_id>_preview.mp4`, fixes the duration, and applies the new Imgur watermark. No public URLs need to change because the product page reads `preview_path` from the DB.

## Plan

1. **Detect broken previews** — Add a one-shot SQL helper (or just a manual query) that flags any `content_files` row whose `preview_path` does NOT match the canonical server pattern `…/previews/<submission_id>/<file_id>_preview.mp4`. Set `preview_path = NULL` and `preview_status = NULL` on those rows so the existing backfill picks them up.

2. **Reuse `batch-backfill-previews`** — No code change needed. Run it from the Admin → Video Backfill panel with `force: false` (default). It will:
   - Find rows where `preview_path IS NULL` and submission is approved
   - Re-encode at 720p with the new Imgur watermark
   - Upload to `previews/<submission_id>/<file_id>_preview.mp4`
   - Update `preview_path` in the DB

3. **Surface them in the admin UI** — In `src/components/admin/AdminVideoBackfill.tsx`, add a "Reset legacy previews" button that runs the SQL from step 1 (via a tiny new edge function `reset-legacy-previews` restricted to admins). After clicking, the existing "Run backfill" button regenerates them in batches of 5.

4. **Keep the rows** — Do NOT delete the products. The originals in `private-videos` / `content-uploads` are intact; only the preview file is being replaced.

## Technical details

- Canonical regex used to detect legacy previews:
  `preview_path !~ '/previews/[0-9a-f-]{36}/[0-9a-f-]{36}_preview\.mp4$'`
- Legacy files in `previews/<sub>/videos/…` and `previews/<sub>/previews/…` can be deleted from storage after the new preview is confirmed (optional cleanup step, can be done later via a storage prefix list).
- The new edge function `reset-legacy-previews` needs: admin JWT check (same pattern as `batch-backfill-previews`), one `UPDATE content_files SET preview_path = NULL, preview_status = NULL WHERE …` statement, returns the count.

## What you should do
**Don't get rid of them.** Approve this plan and after I ship it, open Admin → Video Backfill, click "Reset legacy previews", then "Run backfill" until the counter hits 0.
