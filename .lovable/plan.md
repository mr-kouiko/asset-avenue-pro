

# Fix Video Preview Generation in Product Management

## Problem Identified
The video preview generation in the upload flow is failing due to **CORS restrictions**. Specifically:

1. **FileUpload page** uses `SimpleFileUpload` component
2. `SimpleFileUpload` uses `useAutomaticWatermark` hook to process files
3. In `useAutomaticWatermark`, video preview generation happens **client-side** using canvas recording
4. The code sets `video.crossOrigin = 'anonymous'` (line 375), but Supabase storage doesn't return proper CORS headers
5. This causes the canvas to become "tainted" when drawing video frames, blocking the preview generation

The error typically looks like:
```text
DOMException: The operation is insecure.
```
Or silent failure with "Video preview generation failed" warning in console.

## Root Cause
The `useAutomaticWatermark` hook tries to:
1. Create a video element pointing to the uploaded video URL
2. Draw video frames to a canvas with watermark overlay
3. Record the canvas as a MediaRecorder stream

This fails because the video URL is cross-origin and the storage bucket doesn't provide `Access-Control-Allow-Origin` headers.

## Solution
Update `useAutomaticWatermark` to use the **video proxy** utility that was already created to bypass CORS:

1. Import `getProxiedVideoUrl` from `@/utils/videoProxy`
2. Use the proxied URL when setting `video.src` for preview generation
3. Add fallback to server-side `generate-video-preview` edge function if client-side fails

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/hooks/useAutomaticWatermark.tsx` | Import proxy utility, use proxied URL for video preview generation |

---

## Technical Implementation

**Current code (failing):**
```typescript
video.crossOrigin = 'anonymous';
video.src = watermarkedUrl!;  // Direct URL - CORS blocks canvas access
```

**Fixed code:**
```typescript
import { getProxiedVideoUrl } from '@/utils/videoProxy';

// Use proxied URL to bypass CORS
video.crossOrigin = 'anonymous';
video.src = getProxiedVideoUrl(watermarkedUrl!);
```

Additionally, add a server-side fallback:
```typescript
// If client-side fails, try server-side generation
const { data, error } = await supabase.functions.invoke('generate-video-preview', {
  body: { videoPath: filePath, duration: 6, resolution: 720 }
});
if (data?.previewUrl) {
  previewUrl = data.previewUrl;
}
```

---

## Expected Outcome
After this fix:
- Videos uploaded through the FileUpload page will have their previews generated successfully
- The preview generation uses the CORS proxy to fetch video frames
- If client-side generation still fails (browser compatibility), the server-side edge function provides a reliable fallback
- Product Management page will display the watermarked video preview

