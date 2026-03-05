

## Security and Workflow Plan: Private Uploads Bucket with Reliable Preview Generation

### Current State Analysis

**Storage architecture:**
- Originals upload to `content-uploads` bucket (public) via `useEnhancedUpload`
- Previews also upload to `content-uploads` under `{userId}/previews/` paths
- The `get_product_files` RPC blanks internal file paths for originals, but the bucket itself is public -- meaning anyone who discovers a URL pattern can access unwatermarked originals directly

**Preview generation:**
- Client-side only via `useVideoPreviewGenerator.ts` (Canvas + MediaRecorder)
- Uses `addWatermarkToVideo()` during upload processing phase
- The proxy-video edge function exists for CORS bypass but currently fetches from public URLs
- Server-side `generate-video-preview` exists but requires an external FFmpeg API (not configured), so it returns 501

**The core problem:** Making the bucket private breaks client-side preview generation because the browser can no longer fetch the video blob. The proxy-video function currently fetches public URLs -- it would need to use signed URLs or service role credentials to access private storage.

---

### Proposed Solution: Signed URL Pipeline

The approach uses **signed URLs** (time-limited, server-generated) to give temporary access to private originals only during controlled operations.

#### Architecture

```text
┌──────────────────────────────────────────────────────────┐
│                    UPLOAD FLOW                           │
│                                                          │
│  Seller uploads → content-uploads (PRIVATE bucket)       │
│       │                                                  │
│       ├─ Client gets upload URL back                     │
│       │  (but bucket is private, URL won't work publicly)│
│       │                                                  │
│       ▼                                                  │
│  Client requests signed URL from edge function           │
│       │                                                  │
│       ▼                                                  │
│  Client-side preview generation (Canvas+MediaRecorder)   │
│  using signed URL (valid ~15 min)                        │
│       │                                                  │
│       ▼                                                  │
│  Watermarked preview uploads to "previews" bucket        │
│  (PUBLIC bucket, separate from originals)                │
│                                                          │
│  FALLBACK: If client-side fails → trigger server-side    │
│  edge function that uses service_role to access private  │
│  original and generate preview                           │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│                  PUBLIC ACCESS                           │
│                                                          │
│  Visitors see previews from "previews" bucket (PUBLIC)   │
│  Originals in "content-uploads" are NEVER directly       │
│  accessible -- only via secure-download after purchase   │
└──────────────────────────────────────────────────────────┘
```

#### Step-by-Step Changes

**1. Create a separate `previews` public bucket**
- All watermarked previews, thumbnails, and preview videos go here
- This bucket is public -- safe because everything in it is watermarked
- Originals stay in `content-uploads` which becomes private

**2. Make `content-uploads` bucket private**
- Remove public access via Supabase dashboard
- Existing public URLs for originals stop working (this is the goal)

**3. Create `generate-signed-url` edge function**
- Authenticated endpoint (JWT required)
- Takes a storage path, validates the user owns the file
- Returns a signed URL valid for 15 minutes using `supabase.storage.from('content-uploads').createSignedUrl(path, 900)`
- Used by the client during upload processing to feed the video to Canvas

**4. Update `proxy-video` edge function**
- Add service_role support for private bucket access
- When a URL points to `content-uploads`, use the service role key to generate a signed URL server-side and fetch through it
- This keeps the CORS proxy working for preview generation without exposing credentials

**5. Update `useEnhancedUpload` hook**
- After uploading to `content-uploads`, request a signed URL for the uploaded file
- Pass the signed URL to `addWatermarkToVideo()` / `useVideoPreviewGenerator`
- Upload the resulting watermarked preview to the `previews` bucket (public)
- Store the preview URL from the `previews` bucket in `content_files.preview_path`

**6. Update `secure-download` edge function**
- Already handles purchased downloads -- update to generate signed URLs from the private bucket using service role
- This is the only legitimate path to access originals after purchase

**7. Update `get_product_files` RPC**
- Continue blanking `file_path` for originals (already done)
- Ensure `preview_path` always points to the public `previews` bucket

**8. Fallback: server-side preview generation**
- If client-side preview fails, the upload hook triggers `generate-video-preview` edge function
- This function uses service_role to access the private original, processes it (requires FFmpeg API or a simpler frame-extraction approach), and uploads the result to the public `previews` bucket
- Until an FFmpeg API is configured, the client-side path is the primary method

#### Security Guarantees

- **Originals are never publicly accessible** -- bucket is private, RPC blanks paths
- **Signed URLs expire in 15 minutes** -- only used during upload processing by the authenticated seller
- **Proxy-video uses server credentials** -- never exposes service role key to client
- **No fallback to unwatermarked content** -- if preview generation fails entirely, the product shows "preview unavailable" rather than serving the original
- **Download-after-purchase** uses secure-download with service role, never a direct URL

#### Migration Considerations

- Existing preview URLs in `content_files.preview_path` that point to `content-uploads` will break after making it private -- need a one-time migration to copy existing previews to the `previews` bucket
- Existing marketplace listings with thumbnails from the public bucket need their URLs updated

#### What This Plan Does NOT Include

- FFmpeg server-side processing (requires external API subscription)
- Audio preview generation (separate concern)
- Retroactive re-watermarking of existing previews

