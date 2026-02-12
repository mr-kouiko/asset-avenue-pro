
# Add Image Converter to Studio AI

## Overview

A free, client-side image format converter tool accessible at `/studio-ai/image-converter`. Inspired by Shutterstock's converter, it lets users upload an image and convert it to PNG, JPEG, WebP, or PDF -- all processed in the browser with zero server cost or credit consumption.

## What it does

- Drag-and-drop or click to upload an image (JPG, PNG, WebP, BMP, GIF, TIFF)
- Choose a target format: PNG, JPEG, WebP, or PDF
- Adjust quality for lossy formats (JPEG, WebP)
- Preview original and converted image side by side
- Download the converted file instantly
- Shows file size before/after conversion

## Cost

This tool runs entirely in the browser using the Canvas API. There is no server call, no edge function, and no credit or quota consumption.

## Technical Plan

### 1. New page: `src/pages/ImageConverter.tsx`

- Follows the same dark theme and layout as `RemoveBackground.tsx`
- Upload zone with drag-and-drop support
- Format selector buttons (PNG, JPEG, WebP, PDF)
- Quality slider (for JPEG/WebP, 10-100%)
- Side-by-side preview (original vs converted)
- File size comparison display
- Download button
- Uses `canvas.toBlob()` for raster conversions and `jsPDF`-free approach (canvas to PDF via data URL) for PDF output

### 2. Register route in `src/App.tsx`

- Add lazy import: `const ImageConverter = lazy(() => import("./pages/ImageConverter"))`
- Add route: `<Route path="/studio-ai/image-converter" element={<ImageConverter />} />`

### 3. Add tool card in `src/pages/StudioAI.tsx`

- Add a new entry to the `imageTools` array with `id: 'image-converter'`, title "Image Converter", and the `RefreshCw` icon
- Badge: "Available", `available: true`
- Links to `/studio-ai/image-converter`

### Supported conversions

| From | To |
|------|-----|
| JPG, PNG, WebP, BMP, GIF, TIFF | PNG |
| JPG, PNG, WebP, BMP, GIF, TIFF | JPEG |
| JPG, PNG, WebP, BMP, GIF, TIFF | WebP |
| JPG, PNG, WebP, BMP, GIF, TIFF | PDF (single page) |

### Files to create/modify

- **Create**: `src/pages/ImageConverter.tsx` (new page)
- **Edit**: `src/App.tsx` (add route)
- **Edit**: `src/pages/StudioAI.tsx` (add tool card to imageTools array)
