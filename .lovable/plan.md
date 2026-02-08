

# Fix CORS Issue for Watermarked Video Preview Downloads

## Problem Summary
Videos stored in Supabase Storage cannot be processed client-side (for watermarking, thumbnail extraction) because the browser blocks cross-origin canvas operations when the storage bucket lacks proper CORS headers.

## Root Cause
The `uploads` bucket (and other video storage buckets) are **public** but don't have **CORS policies** configured. This causes:
1. `fetch(url, { mode: 'cors' })` to fail when downloading videos as blobs
2. Canvas "taint" when trying to draw video frames after setting `crossOrigin="anonymous"`
3. Preview generation and thumbnail extraction to fail

## Solution

### Option A: Configure CORS on Supabase Storage Buckets (Recommended)
Add CORS configuration to the `uploads` bucket via SQL migration. This is the cleanest solution.

**Migration SQL:**
```sql
-- Update storage bucket CORS configuration
UPDATE storage.buckets 
SET allowed_mime_types = array['image/*', 'video/*', 'audio/*'],
    avif_autodetection = false
WHERE id = 'uploads';

-- Note: Supabase Cloud handles CORS automatically for public buckets
-- If issues persist, the storage.buckets table may need extension
-- or configuration via Supabase Dashboard > Storage > Policies
```

**However**, Supabase Cloud automatically sets CORS headers for public buckets. The real issue may be:
1. **The bucket isn't truly public** - check RLS policies
2. **The video URL is from a different origin** (R2, external CDN)

### Option B: Proxy Downloads Through Edge Function (More Reliable)
Create a proxy edge function that fetches the video and returns it with proper CORS headers.

**Files to create/modify:**

| File | Changes |
|------|---------|
| `supabase/functions/proxy-video/index.ts` | New edge function to proxy video downloads with CORS |
| `src/hooks/useVideoPreviewGenerator.ts` | Use proxy URL for video fetching |
| `src/components/VFXPreviewUpload.tsx` | Use proxy URL for thumbnail extraction |
| `src/components/WatermarkedVideoThumbnail.tsx` | Use proxy URL for frame extraction |

**Edge Function Implementation:**
```typescript
// supabase/functions/proxy-video/index.ts
serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, range',
    'Access-Control-Expose-Headers': 'Content-Length, Content-Range',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const videoUrl = url.searchParams.get('url');
  
  // Fetch video from storage
  const response = await fetch(videoUrl);
  const videoBlob = await response.blob();
  
  return new Response(videoBlob, {
    headers: {
      ...corsHeaders,
      'Content-Type': response.headers.get('Content-Type') || 'video/mp4',
      'Cache-Control': 'public, max-age=3600',
    }
  });
});
```

### Option C: Use R2 CORS Configuration (If videos are on Cloudflare R2)
Based on the memory about R2 bucket CORS policy, videos may be stored on R2. The existing R2 CORS config includes `GET` and `HEAD` methods, but we need to verify the configuration includes the app's origin.

**Check if video URLs contain R2 domain**, then update R2 CORS policy if needed.

---

## Recommended Approach

1. **First**: Verify where videos are actually stored (Supabase vs R2)
2. **If Supabase**: The public bucket should already have CORS - investigate if there's an RLS policy blocking access
3. **If R2**: Update R2 CORS policy to include `Access-Control-Allow-Origin: *` for `GET` requests
4. **Fallback**: Implement Option B (proxy edge function) as a guaranteed solution

---

## Technical Details

### Files Affected by CORS Issue
- `src/hooks/useVideoPreviewGenerator.ts` (lines 48-77) - blob fetch for preview generation
- `src/components/VFXPreviewUpload.tsx` (line 55) - `video.crossOrigin = 'anonymous'`
- `src/components/WatermarkedVideoThumbnail.tsx` (line 84) - frame extraction

### Current Workaround in Code
The `useVideoPreviewGenerator.ts` already has a fallback pattern:
1. Try `fetch(url, { mode: 'cors' })` to get blob
2. If fails, use `video.crossOrigin = 'anonymous'` with direct URL
3. This second approach also fails if CORS isn't configured

### Why Server-Side Preview (Edge Function) Doesn't Have This Issue
The `generate-video-preview` edge function downloads videos using the service role key, which bypasses CORS (server-to-server requests don't have CORS restrictions).

