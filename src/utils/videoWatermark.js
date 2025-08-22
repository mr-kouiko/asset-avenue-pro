#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * Node.js script for video watermarking with centered logo
 * 
 * Usage: node videoWatermark.js input.mp4 output_prefix
 * Produces: output_prefix_preview_720p_watermarked.mp4 and output_prefix_fullscreen_watermarked.mp4
 */

const LOGO_URL = 'https://kdgfpophpoqugtuvfxqx.supabase.co/storage/v1/object/sign/logo%20VisuStock%20%20transparent%20GRAND/Blue%20Modern%20Sound%20Studio%20Logo%20(3).png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9jZTIyNjk0My1iMWRhLTRlZTAtYjk3Yi00MjY2NzQ4M2VhMjAiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJsb2dvIFZpc3VTdG9jayAgdHJhbnNwYXJlbnQgR1JBTkQvQmx1ZSBNb2Rlcm4gU291bmQgU3R1ZGlvIExvZ28gKDMpLnBuZyIsImlhdCI6MTc1NTg4OTI5NywiZXhwIjo0OTA5NDg5Mjk3fQ.XKuuCbKXmB3_zfUii6S3nQBwRSV4dUwUsteQzzzOPiQ';

function downloadLogo() {
  const logoPath = '/tmp/visustock_logo.png';
  try {
    console.log('Downloading logo...');
    execSync(`curl -s -o "${logoPath}" "${LOGO_URL}"`);
    if (!fs.existsSync(logoPath)) {
      throw new Error('Logo download failed');
    }
    return logoPath;
  } catch (error) {
    console.error('Logo download failed:', error.message);
    return null;
  }
}

function getVideoInfo(inputPath) {
  try {
    const info = execSync(`ffprobe -v quiet -print_format json -show_streams "${inputPath}"`, { encoding: 'utf8' });
    const streams = JSON.parse(info).streams;
    const videoStream = streams.find(s => s.codec_type === 'video');
    return {
      width: parseInt(videoStream.width),
      height: parseInt(videoStream.height)
    };
  } catch (error) {
    throw new Error(`Failed to get video info: ${error.message}`);
  }
}

function createWatermarkedVideo(inputPath, outputPath, logoPath, targetWidth = null) {
  const videoInfo = getVideoInfo(inputPath);
  let scaleFilter = '';
  let watermarkScale = '';
  
  if (targetWidth && videoInfo.width > targetWidth) {
    // Scale down video for preview
    const targetHeight = Math.round((targetWidth / videoInfo.width) * videoInfo.height);
    scaleFilter = `scale=${targetWidth}:${targetHeight},`;
    watermarkScale = `scale=${Math.round(targetWidth / 8)}:-1`;
  } else {
    // Use original resolution
    watermarkScale = `scale=${Math.round(videoInfo.width / 8)}:-1`;
  }
  
  const overlayFilter = `overlay=(main_w-overlay_w)/2:(main_h-overlay_h)/2:format=auto,format=yuv420p`;
  
  if (logoPath) {
    // Use logo watermark
    const command = `ffmpeg -i "${inputPath}" -i "${logoPath}" -filter_complex "[1:v]${watermarkScale},format=rgba,colorchannelmixer=aa=0.5[logo];[0:v]${scaleFilter}[video];[video][logo]${overlayFilter}" -c:a copy "${outputPath}"`;
    console.log(`Creating watermarked video: ${outputPath}`);
    execSync(command);
  } else {
    // Fallback text watermark
    const fontSize = Math.round((targetWidth || videoInfo.width) / 16);
    const textFilter = `${scaleFilter}drawtext=text='VISUSTOCK':fontfile=/System/Library/Fonts/Arial.ttf:fontsize=${fontSize}:fontcolor=white@0.5:x=(w-text_w)/2:y=(h-text_h)/2:borderw=2:bordercolor=black@0.5,format=yuv420p`;
    const command = `ffmpeg -i "${inputPath}" -vf "${textFilter}" -c:a copy "${outputPath}"`;
    console.log(`Creating text watermarked video: ${outputPath}`);
    execSync(command);
  }
}

function processVideo(inputPath, outputPrefix) {
  try {
    // Download logo
    const logoPath = downloadLogo();
    
    // Generate outputs
    const previewOutput = `${outputPrefix}_preview_720p_watermarked.mp4`;
    const fullscreenOutput = `${outputPrefix}_fullscreen_watermarked.mp4`;
    
    // Create 720p preview
    createWatermarkedVideo(inputPath, previewOutput, logoPath, 1280);
    
    // Create fullscreen version
    createWatermarkedVideo(inputPath, fullscreenOutput, logoPath);
    
    // Cleanup
    if (logoPath && fs.existsSync(logoPath)) {
      fs.unlinkSync(logoPath);
    }
    
    console.log('Video watermarking completed:');
    console.log(`- Preview: ${previewOutput}`);
    console.log(`- Fullscreen: ${fullscreenOutput}`);
    
  } catch (error) {
    console.error('Video processing failed:', error.message);
    process.exit(1);
  }
}

// CLI usage
if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.length !== 2) {
    console.log('Usage: node videoWatermark.js input.mp4 output_prefix');
    process.exit(1);
  }
  
  const [inputPath, outputPrefix] = args;
  processVideo(inputPath, outputPrefix);
}

module.exports = { processVideo, createWatermarkedVideo };