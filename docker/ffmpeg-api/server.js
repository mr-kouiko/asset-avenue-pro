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

fs.mkdirSync(TMP_DIR, { recursive: true });

function authenticate(req, res, next) {
  if (!API_KEY) return next();
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (token !== API_KEY) return res.status(401).json({ error: 'Unauthorized' });
  next();
}

// ✅ FIX IMPORTANT: headers + supabase compatibility
function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;

    const options = {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept': '*/*'
      }
    };

    const file = fs.createWriteStream(destPath);

    const request = mod.get(url, options, (response) => {

      // handle redirect
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        downloadFile(response.headers.location, destPath)
          .then(resolve)
          .catch(reject);
        return;
      }

      if (response.statusCode !== 200) {
        reject(new Error(`Download failed: HTTP ${response.statusCode}`));
        return;
      }

      response.pipe(file);

      file.on('finish', () => file.close(resolve));
      file.on('error', reject);
    });

    request.on('error', reject);
  });
}

function cleanup(...files) {
  files.forEach(f => { try { fs.unlinkSync(f); } catch (_) {} });
}

function runFfprobe(args) {
  return new Promise((resolve, reject) => {
    execFile('ffprobe', args, { maxBuffer: 10 * 1024 * 1024, timeout: 30000 }, (err, stdout, stderr) => {
      if (err) reject(new Error(stderr?.toString().slice(-200) || err.message));
      else resolve(stdout.toString());
    });
  });
}

// ---------------- THUMBNAIL ----------------
app.post('/thumbnail', authenticate, async (req, res) => {
  const { videoUrl, position, width, videoId } = req.body || {};
  const jobId = randomUUID();

  if (!videoUrl) {
    return res.status(400).json({ error: 'videoUrl is required' });
  }

  const pos = Math.min(Math.max(Number(position) || 0.2, 0.01), 0.95);
  const targetWidth = Math.min(Math.max(Number(width) || 480, 120), 1920);

  const inputPath = path.join(TMP_DIR, `${jobId}_thumb_input`);
  const outputPath = path.join(TMP_DIR, `${jobId}_thumb.jpg`);

  try {
    await downloadFile(videoUrl, inputPath);

    const out = await runFfprobe([
      '-v', 'error',
      '-print_format', 'json',
      '-show_entries', 'format=duration',
      inputPath
    ]);

    const duration = parseFloat(JSON.parse(out).format?.duration || '0') || 0;
    const seekSec = duration * pos;

    await new Promise((resolve, reject) => {
      execFile('ffmpeg', [
        '-ss', String(seekSec),
        '-i', inputPath,
        '-frames:v', '1',
        '-vf', `scale=${targetWidth}:-2:flags=lanczos`,
        '-q:v', '3',
        '-y', outputPath
      ], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    res.setHeader('Content-Type', 'image/jpeg');
    fs.createReadStream(outputPath).pipe(res);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------- PROCESS (WATERMARK FIX APPLIES HERE TOO) ----------------
app.post('/process', authenticate, async (req, res) => {
  const { videoUrl, watermarkUrl } = req.body;

  if (!videoUrl) return res.status(400).json({ error: 'videoUrl is required' });

  const jobId = randomUUID();
  const inputPath = path.join(TMP_DIR, `${jobId}_input`);
  const watermarkPath = path.join(TMP_DIR, `${jobId}_watermark.png`);
  const outputPath = path.join(TMP_DIR, `${jobId}_output.mp4`);

  const MUTE_AUDIO = req.body.muted !== false;
  const MAX_DURATION = 60;
  const MAX_FPS = 30;
  const resolution = Number(req.body.resolution) || 720;

  try {
    await downloadFile(videoUrl, inputPath);

    let duration = MAX_DURATION;

    const probe = await runFfprobe([
      '-v', 'error',
      '-print_format', 'json',
      '-show_streams',
      '-show_format',
      inputPath
    ]);

    const json = JSON.parse(probe);
    const probedDuration = parseFloat(json.format?.duration || '0') || 0;
    if (probedDuration > 0) duration = Math.min(probedDuration, MAX_DURATION);

    let watermarkDownloaded = false;

    if (watermarkUrl) {
      try {
        await downloadFile(watermarkUrl, watermarkPath);
        watermarkDownloaded = true;
      } catch (e) {
        console.warn('Watermark download failed:', e.message);
      }
    }

    const scaleExpr = `scale=-2:'min(${resolution}\\,ih)':flags=lanczos,fps=${MAX_FPS}`;

    const ffmpegArgs = ['-ss', '0', '-i', inputPath];

    let filterComplex;

    if (watermarkDownloaded) {
      ffmpegArgs.push('-i', watermarkPath);

      filterComplex = [
        `[1:v]scale=iw/5:-1,format=rgba,colorchannelmixer=aa=0.5[logo]`,
        `[0:v]${scaleExpr}[vid]`,
        `[vid][logo]overlay=(main_w-overlay_w)/2:(main_h-overlay_h)/2[vout]`
      ].join(';');
    } else {
      filterComplex = `[0:v]${scaleExpr}[vout]`;
    }

    ffmpegArgs.push(
      '-filter_complex', filterComplex,
      '-map', '[vout]',
      '-t', String(duration),
      '-r', String(MAX_FPS),
      '-c:v', 'libx264',
      '-preset', 'veryfast',
      '-crf', '23',
      '-pix_fmt', 'yuv420p',
      '-movflags', '+faststart',
      '-threads', '2'
    );

    if (MUTE_AUDIO) ffmpegArgs.push('-an');

    ffmpegArgs.push('-y', outputPath);

    await new Promise((resolve, reject) => {
      execFile('ffmpeg', ffmpegArgs, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    res.setHeader('Content-Type', 'video/mp4');
    fs.createReadStream(outputPath).pipe(res);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`FFmpeg API listening on port ${PORT}`);
});
