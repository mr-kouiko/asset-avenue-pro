#!/bin/bash

# ImageMagick commands for centered watermark
# Usage: ./imageWatermark.sh input.jpg output_prefix

LOGO_URL="https://kdgfpophpoqugtuvfxqx.supabase.co/storage/v1/object/sign/logo%20VisuStock%20%20transparent%20GRAND/Blue%20Modern%20Sound%20Studio%20Logo%20(3).png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9jZTIyNjk0My1iMWRhLTRlZTAtYjk3Yi00MjY2NzQ4M2VhMjAiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJsb2dvIFZpc3VTdG9jayAgdHJhbnNwYXJlbnQgR1JBTkQvQmx1ZSBNb2Rlcm4gU291bmQgU3R1ZGlvIExvZ28gKDMpLnBuZyIsImlhdCI6MTc1NTg4OTI5NywiZXhwIjo0OTA5NDg5Mjk3fQ.XKuuCbKXmB3_zfUii6S3nQBwRSV4dUwUsteQzzzOPiQ"

INPUT_FILE="$1"
OUTPUT_PREFIX="$2"

if [ $# -ne 2 ]; then
    echo "Usage: $0 input.jpg output_prefix"
    exit 1
fi

# Download logo
echo "Downloading logo..."
curl -s -o "/tmp/visustock_logo.png" "$LOGO_URL"

if [ ! -f "/tmp/visustock_logo.png" ]; then
    echo "Logo download failed, using text watermark"
    LOGO_FAILED=1
fi

# Get image dimensions
ORIGINAL_WIDTH=$(identify -format "%w" "$INPUT_FILE")
WATERMARK_SIZE=$((ORIGINAL_WIDTH / 8))

# Create preview (max 1280px width)
PREVIEW_OUTPUT="${OUTPUT_PREFIX}_preview_center_watermarked.webp"
echo "Creating preview: $PREVIEW_OUTPUT"

if [ "$LOGO_FAILED" = "1" ]; then
    # Text watermark fallback for preview
    FONT_SIZE=$((1280 / 16))
    convert "$INPUT_FILE" -resize "1280x>" \
        -font Arial-Bold -pointsize $FONT_SIZE -fill "rgba(0,0,0,0.5)" \
        -stroke "rgba(255,255,255,0.8)" -strokewidth 2 \
        -gravity center -annotate +0+0 "VISUSTOCK" \
        -quality 90 "$PREVIEW_OUTPUT"
else
    # Logo watermark for preview
    convert "$INPUT_FILE" -resize "1280x>" \
        \( "/tmp/visustock_logo.png" -resize "${WATERMARK_SIZE}x" \) \
        -gravity center -compose dissolve -define compose:args=50 \
        -composite -quality 90 "$PREVIEW_OUTPUT"
fi

# Create fullscreen (original resolution)
FULLSCREEN_OUTPUT="${OUTPUT_PREFIX}_fullscreen_center_watermarked.${INPUT_FILE##*.}"
echo "Creating fullscreen: $FULLSCREEN_OUTPUT"

if [ "$LOGO_FAILED" = "1" ]; then
    # Text watermark fallback for fullscreen
    FONT_SIZE=$((ORIGINAL_WIDTH / 16))
    convert "$INPUT_FILE" \
        -font Arial-Bold -pointsize $FONT_SIZE -fill "rgba(0,0,0,0.5)" \
        -stroke "rgba(255,255,255,0.8)" -strokewidth 2 \
        -gravity center -annotate +0+0 "VISUSTOCK" \
        -quality 95 "$FULLSCREEN_OUTPUT"
else
    # Logo watermark for fullscreen
    convert "$INPUT_FILE" \
        \( "/tmp/visustock_logo.png" -resize "${WATERMARK_SIZE}x" \) \
        -gravity center -compose dissolve -define compose:args=50 \
        -composite -quality 95 "$FULLSCREEN_OUTPUT"
fi

# Cleanup
rm -f "/tmp/visustock_logo.png"

echo "Image watermarking completed:"
echo "- Preview: $PREVIEW_OUTPUT"
echo "- Fullscreen: $FULLSCREEN_OUTPUT"