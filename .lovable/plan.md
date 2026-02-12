
# Fix: Video Thumbnails Showing Blank/White Images

## Root Cause

The server-side thumbnail generator (`generate-video-thumbnail` edge function) sometimes produces blank white frames that pass the brightness check (threshold is 245, but pure white = 255 would fail; near-white at ~240 would pass). These invalid thumbnails are stored in Supabase storage and return HTTP 200, so the browser's `<img onError>` never fires. The `WatermarkedVideoThumbnail` component treats these as valid thumbnails and displays them -- resulting in the blank purple cards you see.

## Solution: Two-Part Fix

### Part 1 -- Frontend: Validate thumbnail on load (canvas brightness check)

In `WatermarkedVideoThumbnail.tsx`, add an `onLoad` handler to the `<img>` element that draws the loaded image to a hidden canvas and checks average brightness. If the image is mostly white (avg brightness > 240) or mostly black (avg brightness < 15), mark the thumbnail as invalid and trigger the existing fallback path (frame extraction from the video via `#t=0.1`).

This catches:
- White/blank thumbnails from failed FFmpeg extraction
- All-black thumbnails from videos with dark intros

### Part 2 -- Server-side: Tighten the thumbnail validation threshold

In `generate-video-thumbnail/index.ts`, lower `BRIGHTNESS_THRESHOLD_HIGH` from 245 to 235 to catch more near-white frames. This prevents future uploads from generating blank thumbnails.

## Technical Details

### WatermarkedVideoThumbnail.tsx Changes

Add a new `validateThumbnailBrightness` function:

```typescript
const validateThumbnailBrightness = (img: HTMLImageElement): boolean => {
  try {
    const canvas = document.createElement('canvas');
    const size = 32; // Small sample for speed
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return true;
    ctx.drawImage(img, 0, 0, size, size);
    const data = ctx.getImageData(0, 0, size, size).data;
    let totalBrightness = 0;
    const pixelCount = size * size;
    for (let i = 0; i < data.length; i += 4) {
      totalBrightness += (data[i] + data[i+1] + data[i+2]) / 3;
    }
    const avgBrightness = totalBrightness / pixelCount;
    return avgBrightness > 15 && avgBrightness < 240;
  } catch {
    return true; // CORS error = assume valid
  }
};
```

Add `onLoad` to the existing `<img>` tag:
```typescript
onLoad={(e) => {
  const img = e.currentTarget;
  if (!validateThumbnailBrightness(img)) {
    setThumbnailError(true); // triggers fallback
  }
}}
```

### generate-video-thumbnail/index.ts Changes

```typescript
const BRIGHTNESS_THRESHOLD_HIGH = 235; // Was 245
const BRIGHTNESS_THRESHOLD_LOW = 15;   // Was 10
```

## Files Modified

1. `src/components/WatermarkedVideoThumbnail.tsx` -- Add `onLoad` brightness validation
2. `supabase/functions/generate-video-thumbnail/index.ts` -- Tighten brightness thresholds
