# FFmpeg Video Processing API

Self-hosted FFmpeg HTTP service for generating watermarked video previews.

## Deploy

### Option 1: Railway / Render / Fly.io

1. Push this `docker/ffmpeg-api/` folder to a Git repo (or use Railway's CLI)
2. Set environment variables:
   - `FFMPEG_API_KEY` — a random secret token (e.g. `openssl rand -hex 32`)
   - `PORT` — usually auto-set by the platform
3. Deploy

### Option 2: VPS with Docker

```bash
cd docker/ffmpeg-api
docker build -t ffmpeg-api .
docker run -d -p 3000:3000 -e FFMPEG_API_KEY=your-secret-key ffmpeg-api
```

## API

### `GET /health`
Returns `{ "status": "ok", "ffmpeg": true }`.

### `POST /process`
Headers: `Authorization: Bearer <FFMPEG_API_KEY>`

Body:
```json
{
  "videoUrl": "https://...",
  "watermarkUrl": "https://...",
  "resolution": 720
}
```

Returns: `video/mp4` binary stream.

## After deploying

Add these secrets to your Supabase project:
- `FFMPEG_API_URL` → `https://your-ffmpeg-api.example.com/process`
- `FFMPEG_API_KEY` → the same key you set above
