const express = require('express');
const { execFile } = require('child_process');
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { randomUUID } = require('crypto');

const app = express();
app.use(express.json({ limit: '10mb' }));

const PORT = process.env.PORT || 3000;
const API_KEY = process.env.FFMPEG_API_KEY || '';
const TMP_DIR = '/tmp/ffmpeg-work';

// Ensure tmp dir exists
fs.mkdirSync(TMP_DIR, { recursive: true });

// Auth middleware
function authenticate(req, res, next) {
  if (!API_KEY) return next(); // No key configured = open (dev mode)
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (token !== API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

// Download file from URL to disk
function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    const file = fs.createWriteStream(destPath);
    mod.get(url, (response) => {
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        // Follow redirect
        downloadFile(response.headers.location, destPath).then(resolve).catch(reject);
        return;
      }
      if (response.statusCode !== 200) {
        reject(new Error(`Download failed: HTTP ${response.statusCode}`));
        return;
      }
      response.pipe(file);
      file.on('finish', () => file.close(resolve));
      file.on('error', reject);
    }).on('error', reject);
  });
}

// Cleanup temp files
function cleanup(...files) {
  files.forEach(f => {
    try { fs.unlinkSync(f); } catch (_) {}
  });
}

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', ffmpeg: true });
});

// Main processing endpoint
app.post('/process', authenticate, async (req, res) => {
  const { videoUrl, watermarkUrl, resolution = 720 } = req.body;

  if (!videoUrl) {
    return res.status(400).json({ error: 'videoUrl is required' });
  }

  const jobId = randomUUID();
  const inputPath = path.join(TMP_DIR, `${jobId}_input`);
  const watermarkPath = path.join(TMP_DIR, `${jobId}_watermark.png`);
  const outputPath = path.join(TMP_DIR, `${jobId}_output.mp4`);

  console.log(`[${jobId}] Starting job: resolution=${resolution}`);

  try {
    // Download source video
    console.log(`[${jobId}] Downloading video...`);
    await downloadFile(videoUrl, inputPath);
    const inputSize = fs.statSync(inputPath).size;
    console.log(`[${jobId}] Video downloaded: ${(inputSize / 1024 / 1024).toFixed(1)}MB`);

    // Build FFmpeg filter and args
    let filterComplex;
    const ffmpegArgs = ['-i', inputPath];

    if (watermarkUrl) {
      console.log(`[${jobId}] Downloading watermark...`);
      await downloadFile(watermarkUrl, watermarkPath);
      console.log(`[${jobId}] Watermark downloaded`);

      ffmpegArgs.push('-i', watermarkPath);
      filterComplex = [
        `[1:v]scale=iw/5:-1,format=rgba,colorchannelmixer=aa=0.5[logo]`,
        `[0:v]scale=-2:${resolution}[vid]`,
        `[vid][logo]overlay=(main_w-overlay_w)/2:(main_h-overlay_h)/2`
      ].join(';');
    } else {
      filterComplex = `[0:v]scale=-2:${resolution}`;
    }

    ffmpegArgs.push(
      '-filter_complex', filterComplex,
      '-c:v', 'libx264',
      '-preset', 'fast',
      '-crf', '23',
      '-c:a', 'aac',
      '-b:a', '128k',
      '-movflags', '+faststart',
      '-y',
      outputPath
    );

    console.log(`[${jobId}] Running FFmpeg...`);

    await new Promise((resolve, reject) => {
      const proc = execFile('ffmpeg', ffmpegArgs, {
        maxBuffer: 50 * 1024 * 1024,
        timeout: 300000, // 5 min timeout per video
      }, (error, _stdout, stderr) => {
        if (error) {
          console.error(`[${jobId}] FFmpeg error:`, stderr?.slice(-500));
          reject(new Error(`FFmpeg failed: ${error.message}`));
        } else {
          resolve();
        }
      });
    });

    const outputSize = fs.statSync(outputPath).size;
    console.log(`[${jobId}] FFmpeg done. Output: ${(outputSize / 1024 / 1024).toFixed(1)}MB`);

    // Stream output file back
    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Content-Length', outputSize);
    res.setHeader('X-Job-Id', jobId);

    const readStream = fs.createReadStream(outputPath);
    readStream.pipe(res);
    readStream.on('end', () => {
      cleanup(inputPath, watermarkPath, outputPath);
    });
    readStream.on('error', (err) => {
      console.error(`[${jobId}] Stream error:`, err);
      cleanup(inputPath, watermarkPath, outputPath);
    });

  } catch (err) {
    console.error(`[${jobId}] Job failed:`, err.message);
    cleanup(inputPath, watermarkPath, outputPath);
    res.status(500).json({ error: err.message, jobId });
  }
});

app.listen(PORT, () => {
  console.log(`FFmpeg API listening on port ${PORT}`);
});
