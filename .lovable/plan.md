
# Plan: Add Preview Image Upload for VFX Products

## Overview
Add a feature that allows sellers to upload a custom preview image (thumbnail) for VFX products (RAR/ZIP archives) in the Product Management page. Since archive files cannot automatically generate thumbnails, this manual upload is essential for marketplace visibility.

## Current State Analysis
- VFX products are detected when uploading `.rar` files (category auto-set to VFX)
- The `EbookForm` component already implements a similar pattern for PDF cover uploads
- Database tables already support preview URLs (`thumbnail_path`, `preview_path`)
- The publish flow in `useProductManager.tsx` already handles thumbnail storage

## Implementation Steps

### 1. Update ProductData Interface
Add a `previewImageUrl` field to track manually uploaded preview images:

**File:** `src/pages/ProductManagement.tsx`
- Add `previewImageUrl?: string` to the `ProductData` interface
- This mirrors the existing `coverUrl` field used for ebooks

### 2. Create VFX Preview Upload Section
Add a new UI section in the product form that appears only for VFX/archive files:

**File:** `src/pages/ProductManagement.tsx`
- Add a card section similar to the ebook cover upload in `EbookForm.tsx`
- Include:
  - File input for images (JPG, PNG, WebP)
  - Image preview display
  - Upload progress indicator
  - Remove/replace button
  - 2MB size limit (consistent with ebook covers)
- Upload images to Supabase Storage under `previews/` folder
- The section appears when `selectedFile.type.includes('rar')` or for VFX category

### 3. Update Publish Flow
Ensure the preview image is used as the thumbnail when publishing VFX products:

**File:** `src/pages/ProductManagement.tsx`
- In `handlePublish()`, pass the `previewImageUrl` as `thumbnailUrl` for VFX products
- Similar to how ebooks use `coverUrl` as their thumbnail

**File:** `src/hooks/useProductManager.tsx`
- The existing publish logic already handles `thumbnailUrl` from the file object
- No changes needed here - just pass the correct URL from ProductManagement

### 4. Visual Indicator for Missing Preview
Add a warning badge/message when VFX products don't have a preview image:

**File:** `src/pages/ProductManagement.tsx`
- Display warning text below the upload zone when no preview is set
- Optionally block publishing until a preview is uploaded (like ebook covers)

## Technical Details

### Preview Upload Function
```text
handlePreviewUpload(file: File)
├── Validate file type (image/*) and size (≤2MB)
├── Upload to Supabase Storage: previews/{timestamp}.{ext}
├── Get public URL
├── Update productData.previewImageUrl
└── Show success toast
```

### UI Component Structure
```text
Product Form (for VFX files)
├── File Info Header
├── [NEW] Preview Image Upload Card
│   ├── Image preview or upload dropzone
│   ├── Upload/Change button
│   └── Remove button
├── Title input
├── Category (auto-detected as VFX)
├── Description
├── Tags
├── AI Toggle
├── Free Content Toggle
└── Publish/Save buttons
```

### Files to Modify
| File | Changes |
|------|---------|
| `src/pages/ProductManagement.tsx` | Add PreviewImageUpload section, update ProductData interface, update publish logic |

### Database Changes
None required - existing columns already support preview URLs.

## Edge Cases Handled
1. **User removes preview then re-uploads**: State properly reset
2. **Edit mode**: Load existing preview from draft/submission
3. **Multiple drafts**: Each draft tracks its own preview independently
4. **File type validation**: Only accept image files for preview
5. **Size validation**: 2MB limit consistent with ebook covers

## Expected Outcome
After implementation:
1. When uploading a VFX product (RAR file), sellers see a "Preview Image" upload section
2. Uploaded preview appears as thumbnail in the marketplace catalog
3. VFX products display properly in search results and collections
4. The experience is consistent with ebook cover upload flow
