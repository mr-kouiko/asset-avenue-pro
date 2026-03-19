

## Plan: Server-Side Batch Video Preview Backfill

### Overview
Replace the client-side backfill tool with a fully server-side pipeline. The admin dashboard triggers a batch job via an edge function, which calls a self-hosted FFmpeg HTTP API to generate watermarked 720p previews.

### Architecture

```text
Admin Dashboard (trigger button)
  └── calls "batch-backfill-previews" edge function
        ├── queries content_files where preview_path IS NULL + video type
        ├── for each video (in parallel batches of 5):
        │     ├── generates signed URL for source video
        │     ├── calls self-hosted FFmpeg API with:
        │     │     - source video URL (signed, 15min)
        │     │     - watermark logo URL
        │     │     - output settings (720p, full duration)
        │     ├── receives watermarked MP4 blob
        │     ├── uploads to "previews" bucket
        │     └── updates content_files.preview_path
        └── returns summary { processed, succeeded, failed, errors[] }
```

### Part 1: Self-Hosted FFmpeg API (Docker)

You deploy a lightweight Docker container that exposes a single `POST /process` endpoint. It:
- Downloads the video from a signed URL
- Downloads the watermark logo from a URL
- Runs FFmpeg: scale to 720p, overlay centered watermark at 50% opacity
- Returns the processed MP4 as a binary response

I will provide the complete `Dockerfile` and `server.js` (Node.js + Express + FFmpeg). Deploy it on Railway, Fly.io, Render, or any VPS with Docker.

**FFmpeg command used:**
```text
ffmpeg -i input.mp4 -i watermark.png \
  -filter_complex "[1:v]scale=W/5:-1,format=rgba,colorchannelmixer=aa=0.5[logo];
                    [0:v]scale=-2:720[vid];
                    [vid][logo]overlay=(main_w-overlay_w)/2:(main_h-overlay_h)/2" \
  -c:v libx264 -preset fast -crf 23 -c:a aac -movflags +faststart output.mp4
```

### Part 2: New Edge Function — `batch-backfill-previews`

- `verify_jwt = true` (admin-only)
- Accepts optional `{ batchSize, dryRun }` params
- Queries all video `content_files` where `preview_path IS NULL` and `is_original = true`
- Processes in parallel batches (default 5 concurrent)
- For each video:
  1. Creates 15-min signed URL from `content-uploads` bucket
  2. POSTs to `FFMPEG_API_URL` with `{ videoUrl, watermarkUrl, resolution: 720 }`
  3. Uploads returned MP4 to `previews/{submission_id}/{file_id}_preview.mp4`
  4. Updates `content_files.preview_path` with public URL
- Returns JSON summary with counts and per-file error details
- Logs everything server-side

### Part 3: Refactor Admin Dashboard

Replace the current `AdminVideoBackfill` component:
- Single "Start Batch Backfill" button that calls the edge function
- Shows returned summary (processed/succeeded/failed)
- No browser-based video processing whatsoever
- Optional "Dry Run" toggle to preview what would be processed

### Part 4: Secrets Required

Two secrets must be configured in Supabase:
- `FFMPEG_API_URL` — URL of your deployed FFmpeg service (e.g. `https://ffmpeg.yourdomain.com/process`)
- `FFMPEG_API_KEY` — Bearer token for authenticating with the FFmpeg service

### Files to Create/Edit
- **Create**: `docker/ffmpeg-api/Dockerfile` + `docker/ffmpeg-api/server.js` — self-hosted FFmpeg service
- **Create**: `supabase/functions/batch-backfill-previews/index.ts` — server-side batch processor
- **Edit**: `supabase/config.toml` — add function config
- **Edit**: `src/components/admin/AdminVideoBackfill.tsx` — replace with simple trigger UI
- **Edit**: `src/pages/AdminDashboard.tsx` — if needed

### Important Notes
- Edge function timeout is 150s on Supabase Pro. For 558 videos, the function processes in batches and may need to be called multiple times (the UI can auto-retry for remaining videos).
- The FFmpeg API container handles the heavy lifting — each video processes in seconds on a proper server.
- All processing is 100% server-side. No browser tab needed.

