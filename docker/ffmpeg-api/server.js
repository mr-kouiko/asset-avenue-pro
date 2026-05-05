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
  const { videoUrl, watermarkUrl } = req.body;
  // Hard preview limits — enforced server-side regardless of caller input
  const MIN_DURATION = 8;        // seconds (target lower bound)
  const MAX_DURATION = 10;       // seconds (hard cap)
  const MAX_RESOLUTION = 720;    // px (height), aspect ratio preserved
  const MAX_FPS = 30;            // fps cap (24-30)
  const MUTE_AUDIO = req.body.muted !== false; // default: muted previews
  const requestedRes = Number(req.body.resolution) || MAX_RESOLUTION;
  const resolution = Math.min(requestedRes, MAX_RESOLUTION);
  const requestedDur = Number(req.body.duration) || MAX_DURATION;
  const duration = Math.min(Math.max(requestedDur, MIN_DURATION), MAX_DURATION);

  if (!videoUrl) {
    return res.status(400).json({ error: 'videoUrl is required' });
  }

  const jobId = randomUUID();
  const inputPath = path.join(TMP_DIR, `${jobId}_input`);
  const watermarkPath = path.join(TMP_DIR, `${jobId}_watermark.png`);
  const outputPath = path.join(TMP_DIR, `${jobId}_output.mp4`);

  console.log(`[${jobId}] Starting job: resolution=${resolution} duration=${duration}s muted=${MUTE_AUDIO} fpsCap=${MAX_FPS}`);

  try {
    // Download source video
    console.log(`[${jobId}] Downloading video...`);
    await downloadFile(videoUrl, inputPath);
    const inputSize = fs.statSync(inputPath).size;
    console.log(`[${jobId}] Video downloaded: ${(inputSize / 1024 / 1024).toFixed(1)}MB`);

    // Probe input duration to pick most relevant segment (middle of clip)
    let startOffset = 0;
    try {
      const probed = await new Promise((resolve, reject) => {
        execFile('ffprobe', [
          '-v', 'error', '-show_entries', 'format=duration',
          '-of', 'default=noprint_wrappers=1:nokey=1', inputPath
        ], (err, stdout) => err ? reject(err) : resolve(parseFloat(stdout.trim())));
      });
      if (Number.isFinite(probed) && probed > duration + 1) {
        startOffset = Math.max(0, Math.min(probed - duration, probed / 2 - duration / 2));
      }
      console.log(`[${jobId}] Probed duration=${probed}s, startOffset=${startOffset.toFixed(2)}s`);
    } catch (e) {
      console.warn(`[${jobId}] ffprobe failed, defaulting to start: ${e.message}`);
    }

    // Build FFmpeg filter and args.
    // -ss BEFORE -i = fast seek; -t after -i = exact duration cap.
    let filterComplex;
    const ffmpegArgs = ['-ss', String(startOffset), '-i', inputPath];

    // Scale: cap height at MAX_RESOLUTION, never upscale, preserve aspect ratio.
    // fps filter caps at MAX_FPS (downsamples only).
    const scaleExpr = `scale=-2:'min(${resolution},ih)':flags=lanczos,fps=fps='min(${MAX_FPS},source_fps)'`;

    if (watermarkUrl) {
      console.log(`[${jobId}] Downloading watermark...`);
      await downloadFile(watermarkUrl, watermarkPath);
      console.log(`[${jobId}] Watermark downloaded`);

      ffmpegArgs.push('-i', watermarkPath);
      filterComplex = [
        `[1:v]scale=iw/5:-1,format=rgba,colorchannelmixer=aa=0.5[logo]`,
        `[0:v]${scaleExpr}[vid]`,
        `[vid][logo]overlay=(main_w-overlay_w)/2:(main_h-overlay_h)/2`
      ].join(';');
    } else {
      filterComplex = `[0:v]${scaleExpr}`;
    }

    ffmpegArgs.push(
      '-filter_complex', filterComplex,
      '-t', String(duration),                     // exact duration cap (8-10s)
      '-c:v', 'libx264',
      '-preset', 'medium',                        // better clarity/size tradeoff
      '-crf', '26',                               // visual clarity priority
      '-maxrate', '1500k',                        // smooth bitrate, ~1-3MB target
      '-bufsize', '3000k',
      '-pix_fmt', 'yuv420p',                      // universal browser compat
      '-profile:v', 'main',                       // broad compat incl. older Safari/Android
      '-level', '4.0',
      '-g', String(MAX_FPS * 2),                  // 2s GOP for fast seek
      '-movflags', '+faststart',                  // moov atom at front
    );

    if (MUTE_AUDIO) {
      ffmpegArgs.push('-an');                     // remove audio for muted previews
    } else {
      ffmpegArgs.push('-c:a', 'aac', '-b:a', '96k', '-ac', '2', '-ar', '44100');
    }

    ffmpegArgs.push('-y', outputPath);

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
