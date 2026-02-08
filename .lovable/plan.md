

# Add MP4 Video as Preview Media for VFX Products

## Summary
Extend the VFX preview upload component to support MP4 video files in addition to the existing image formats. This will allow sellers to upload short video previews that showcase their VFX archive products with animated content, making them more appealing in the marketplace.

## Current State
- **VFXPreviewUpload** only accepts images: `image/jpeg,image/png,image/webp`
- Size limit: 2MB (too small for videos)
- Preview display: Only renders an `<img>` tag
- Marketplace display (ContentCard): VFX products currently use `LazyImage` for static thumbnails

## Proposed Changes

### 1. Update VFXPreviewUpload Component
**File:** `src/components/VFXPreviewUpload.tsx`

- Add MP4 to accepted file types
- Increase size limit for video files (20MB for MP4, keep 2MB for images)
- Detect media type (image vs video) from the uploaded file
- Render video preview with `<video>` tag when MP4 is uploaded
- Show appropriate UI feedback (video thumbnail with play indicator)
- Update labels and helper text to reflect support for both formats

### 2. Update ProductData Interface
**File:** `src/pages/ProductManagement.tsx`

- Add `previewMediaType` field to track whether the preview is an image or video
- Update the data flow to pass media type alongside the URL

### 3. Update ContentCard for VFX Video Previews
**File:** `src/components/ContentCard.tsx`

- For VFX products with video previews, use `WatermarkedVideoThumbnail` component
- This enables hover-to-play functionality like regular video products
- Fall back to `LazyImage` for VFX products with image-only previews

### 4. Update Database Flow
**File:** `src/hooks/useProductManager.tsx`

- Ensure the preview file path and type are correctly stored in `content_files`
- The `file_format` should reflect whether it's an MP4 or image

---

## Technical Details

### File Validation Logic
```text
Image types: image/jpeg, image/png, image/webp, image/jpg
Video types: video/mp4

Size limits:
- Images: 2MB max
- Videos: 20MB max
```

### Preview Detection in Marketplace
The marketplace hooks already have logic to detect video content based on file format. By storing the MP4 preview correctly, the system will automatically:
1. Set `type: 'vfx'` (unchanged)
2. Populate `videoUrl` from the MP4 preview path
3. Enable hover playback in ContentCard

### UI Changes in VFXPreviewUpload
- Replace static "Preview Image" label with "Preview Media"
- Update helper text: "Upload an image or short video clip"
- For uploaded videos: Show video thumbnail with play overlay
- Add video-specific validation: max 30 seconds recommended (soft guidance)

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/VFXPreviewUpload.tsx` | Add MP4 support, video preview rendering, updated size limits |
| `src/pages/ProductManagement.tsx` | Add `previewMediaType` to ProductData, pass to publish flow |
| `src/components/ContentCard.tsx` | Detect VFX video previews and use WatermarkedVideoThumbnail |
| `src/hooks/useMarketplace.tsx` | Ensure VFX video preview URLs populate videoUrl field |

---

## Edge Cases & Considerations

1. **Large video files**: 20MB limit balances quality vs upload time; can use existing chunked upload for larger files if needed

2. **Thumbnail extraction for video previews**: When an MP4 is uploaded, we should extract a thumbnail for the marketplace grid (static display). Can use existing client-side frame extraction logic or fall back to first frame.

3. **Mobile performance**: Video autoplay on hover doesn't apply to mobile; will show thumbnail with play indicator

4. **Storage path**: Videos go to `previews/` folder like images, but with `.mp4` extension

5. **Backward compatibility**: Existing VFX products with image previews continue to work unchanged

