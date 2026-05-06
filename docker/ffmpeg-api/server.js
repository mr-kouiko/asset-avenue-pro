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

function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    const file = fs.createWriteStream(destPath);
    mod.get(url, (response) => {
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
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

// Detect scene change timestamps using ffmpeg select=gt(scene\,0.3)
async function detectSceneChanges(inputPath, jobId) {
  try {
    const out = await new Promise((resolve, reject) => {
      execFile('ffmpeg', [
        '-i', inputPath,
        '-vf', "select='gt(scene,0.3)',showinfo",
        '-vsync', 'vfr',
        '-f', 'null', '-'
      ], { maxBuffer: 20 * 1024 * 1024, timeout: 30000 }, (err, _stdout, stderr) => {
        // showinfo writes to stderr; non-zero exit isn't fatal
        resolve(stderr?.toString() || '');
      });
    });
    const times = [];
    const re = /pts_time:([\d.]+)/g;
    let m;
    while ((m = re.exec(out)) !== null) {
      const t = parseFloat(m[1]);
      if (Number.isFinite(t)) times.push(t);
    }
    console.log(`[${jobId}] Scene detect: ${times.length} candidates`);
    return times;
  } catch (e) {
    console.warn(`[${jobId}] scene detect failed: ${e.message}`);
    return [];
  }
}

// Probe candidate segment for quality: avg luma (brightness) and motion (frame-diff via select scene)
async function probeSegmentQuality(inputPath, start, duration, jobId) {
  try {
    const out = await new Promise((resolve) => {
      execFile('ffmpeg', [
        '-ss', String(start), '-t', String(duration),
        '-i', inputPath,
        '-vf', "scale=160:-2,signalstats,select='gt(scene,0.05)',showinfo",
        '-vsync', 'vfr',
        '-f', 'null', '-'
      ], { maxBuffer: 20 * 1024 * 1024, timeout: 30000 }, (_err, _stdout, stderr) => {
        resolve(stderr?.toString() || '');
      });
    });
    const lumas = [];
    const lumaRe = /YAVG:([\d.]+)/g;
    let m;
    while ((m = lumaRe.exec(out)) !== null) lumas.push(parseFloat(m[1]));
    const sceneCount = (out.match(/pts_time:/g) || []).length;
    const avgLuma = lumas.length ? lumas.reduce((a, b) => a + b, 0) / lumas.length : 0;
    return { avgLuma, sceneCount, sampleCount: lumas.length };
  } catch (e) {
    console.warn(`[${jobId}] segment probe failed: ${e.message}`);
    return { avgLuma: 0, sceneCount: 0, sampleCount: 0 };
  }
}

// Validate produced preview: not blank/dark/blurry, valid mp4
async function validateOutput(outputPath, jobId) {
  // file size sanity
  const size = fs.statSync(outputPath).size;
  if (size < 20 * 1024) return { ok: false, reason: `output too small (${size}B)` };

  // probe stream
  let probeJson;
  try {
    const out = await runFfprobe([
      '-v', 'error', '-print_format', 'json',
      '-show_streams', '-show_format', outputPath
    ]);
    probeJson = JSON.parse(out);
  } catch (e) {
    return { ok: false, reason: `corrupt output: ${e.message}` };
  }
  const vstream = probeJson.streams?.find(s => s.codec_type === 'video');
  if (!vstream) return { ok: false, reason: 'no video stream in output' };
  const dur = parseFloat(probeJson.format?.duration || '0');
  if (dur < 2) return { ok: false, reason: `output duration too short (${dur}s)` };

  // luma + sharpness check on a few frames
  try {
    const out = await new Promise((resolve) => {
      execFile('ffmpeg', [
        '-i', outputPath,
        '-vf', 'scale=320:-2,signalstats',
        '-f', 'null', '-'
      ], { maxBuffer: 20 * 1024 * 1024, timeout: 20000 }, (_err, _stdout, stderr) => resolve(stderr?.toString() || ''));
    });
    const lumas = [];
    const re = /YAVG:([\d.]+)/g;
    let m;
    while ((m = re.exec(out)) !== null) lumas.push(parseFloat(m[1]));
    if (lumas.length === 0) return { ok: false, reason: 'no decodable frames' };
    const avgLuma = lumas.reduce((a, b) => a + b, 0) / lumas.length;
    const minLuma = Math.min(...lumas);
    if (avgLuma < 16) return { ok: false, reason: `too dark (avgLuma=${avgLuma.toFixed(1)})` };
    // mostly black frames check
    const blackFrames = lumas.filter(v => v < 8).length;
    if (blackFrames / lumas.length > 0.6) return { ok: false, reason: `too many black frames (${blackFrames}/${lumas.length})` };
    return { ok: true, size, durationSec: dur, avgLuma, minLuma };
  } catch (e) {
    return { ok: false, reason: `validation probe failed: ${e.message}` };
  }
}

function pickSegmentStart(probedDuration, sceneTimes, duration, attempt) {
  // Prefer scene-change times that leave enough room for `duration`
  const usable = sceneTimes.filter(t => t >= 0.5 && t + duration <= probedDuration - 0.2);
  if (usable.length > 0) {
    // attempt 0: first scene change after 10% mark; subsequent attempts: pick further candidates
    const sorted = usable.sort((a, b) => a - b);
    const minStart = probedDuration * 0.1;
    const filtered = sorted.filter(t => t >= minStart);
    const pool = filtered.length ? filtered : sorted;
    return pool[attempt % pool.length];
  }
  // Fallback: even spread (mid, then 1/4, 3/4, 1/8, 5/8 ...)
  if (probedDuration <= duration + 1) return 0;
  const fractions = [0.5, 0.33, 0.66, 0.2, 0.75, 0.1];
  const f = fractions[attempt % fractions.length];
  return Math.max(0, Math.min(probedDuration - duration, probedDuration * f - duration / 2));
}

app.get('/health', (_req, res) => res.json({ status: 'ok', ffmpeg: true }));

app.post('/process', authenticate, async (req, res) => {
  const { videoUrl, watermarkUrl } = req.body;

  // Hard limits
  const MIN_DURATION = 8;
  const MAX_DURATION = 10;
  const MAX_RESOLUTION = 720;
  const MAX_FPS = 30;
  const MAX_RETRIES = 3; // pick different segments on validation failure
  const MAX_TOTAL_MS = 60_000; // overall safeguard

  const MUTE_AUDIO = req.body.muted !== false;
  const requestedRes = Number(req.body.resolution) || MAX_RESOLUTION;
  const resolution = Math.min(requestedRes, MAX_RESOLUTION);
  const requestedDur = Number(req.body.duration) || MAX_DURATION;
  const duration = Math.min(Math.max(requestedDur, MIN_DURATION), MAX_DURATION);

  if (!videoUrl) return res.status(400).json({ error: 'videoUrl is required' });

  const jobId = randomUUID();
  const inputPath = path.join(TMP_DIR, `${jobId}_input`);
  const watermarkPath = path.join(TMP_DIR, `${jobId}_watermark.png`);
  const outputPath = path.join(TMP_DIR, `${jobId}_output.mp4`);
  

  const jobStart = Date.now();
  console.log(`[${jobId}] START res=${resolution} dur=${duration}s muted=${MUTE_AUDIO}`);

  let watermarkDownloaded = false;
  const attemptLogs = [];

  try {
    // Download source
    await downloadFile(videoUrl, inputPath);
    const inputSize = fs.statSync(inputPath).size;
    console.log(`[${jobId}] downloaded ${(inputSize / 1024 / 1024).toFixed(1)}MB`);

    // Memory safeguard: reject extremely large inputs (>2GB) up-front
    if (inputSize > 2 * 1024 * 1024 * 1024) {
      throw new Error(`input too large: ${(inputSize / 1024 / 1024).toFixed(0)}MB`);
    }

    // Probe duration + resolution
    let probedDuration = 0;
    let inputHeight = 0;
    try {
      const out = await runFfprobe([
        '-v', 'error', '-print_format', 'json',
        '-show_streams', '-show_format', inputPath
      ]);
      const j = JSON.parse(out);
      probedDuration = parseFloat(j.format?.duration || '0') || 0;
      const v = j.streams?.find(s => s.codec_type === 'video');
      inputHeight = v?.height || 0;
    } catch (e) {
      console.warn(`[${jobId}] probe failed: ${e.message}`);
    }
    console.log(`[${jobId}] probed dur=${probedDuration}s height=${inputHeight}`);

    // Scene detection (best-effort, capped)
    let sceneTimes = [];
    if (probedDuration > duration + 1) {
      sceneTimes = await detectSceneChanges(inputPath, jobId);
    }

    // Optional watermark
    if (watermarkUrl) {
      try {
        await downloadFile(watermarkUrl, watermarkPath);
        watermarkDownloaded = true;
      } catch (e) {
        console.warn(`[${jobId}] watermark download failed (continuing without): ${e.message}`);
      }
    }

    const scaleExpr = `scale=-2:'min(${resolution},ih)':flags=lanczos,fps=fps='min(${MAX_FPS},source_fps)'`;

    let lastReason = 'no attempts run';
    let success = false;
    let validation = null;
    let chosenStart = 0;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      if (Date.now() - jobStart > MAX_TOTAL_MS) {
        lastReason = `total time budget exceeded (${MAX_TOTAL_MS}ms)`;
        break;
      }

      const startOffset = pickSegmentStart(probedDuration || duration, sceneTimes, duration, attempt);
      chosenStart = startOffset;

      // Pre-screen segment quality (skip first attempt prescreen for speed)
      if (attempt > 0 && probedDuration > duration + 1) {
        const q = await probeSegmentQuality(inputPath, startOffset, Math.min(duration, 4), jobId);
        if (q.avgLuma > 0 && q.avgLuma < 14) {
          console.log(`[${jobId}] attempt=${attempt} skip dark segment start=${startOffset.toFixed(2)} avgLuma=${q.avgLuma.toFixed(1)}`);
          attemptLogs.push({ attempt, startOffset, skipped: 'dark_segment', avgLuma: q.avgLuma });
          continue;
        }
      }

      // Encode
      const ffmpegArgs = ['-ss', String(startOffset), '-i', inputPath];

      let filterComplex;
      if (watermarkDownloaded) {
        ffmpegArgs.push('-i', watermarkPath);
        filterComplex = [
          `[1:v]scale=iw/5:-1,format=rgba,colorchannelmixer=aa=0.5[logo]`,
          `[0:v]${scaleExpr}[vid]`,
          `[vid][logo]overlay=(main_w-overlay_w)/2:(main_h-overlay_h)/2`
        ].join(';');
      } else {
        filterComplex = `[0:v]${scaleExpr}`;
      }

      // CRF in 23-25 range; lower CRF on first attempt for clarity, raise slightly on retry to keep size in check
      const crf = 23 + attempt; // 23, 24, 25
      ffmpegArgs.push(
        '-filter_complex', filterComplex,
        '-t', String(duration),
        '-c:v', 'libx264',
        '-preset', 'veryfast',           // performance safeguard (<10-15s target)
        '-crf', String(crf),
        '-maxrate', '1500k',
        '-bufsize', '3000k',
        '-pix_fmt', 'yuv420p',
        '-profile:v', 'main',
        '-level', '4.0',
        '-g', String(MAX_FPS * 2),
        '-movflags', '+faststart',
        '-threads', '2',                 // cap CPU/memory
      );

      if (MUTE_AUDIO) ffmpegArgs.push('-an');
      else ffmpegArgs.push('-c:a', 'aac', '-b:a', '96k', '-ac', '2', '-ar', '44100');

      ffmpegArgs.push('-y', outputPath);

      const encStart = Date.now();
      console.log(`[${jobId}] attempt=${attempt} encode start=${startOffset.toFixed(2)} crf=${crf}`);

      let ffmpegStderr = '';
      try {
        await new Promise((resolve, reject) => {
          execFile('ffmpeg', ffmpegArgs, {
            maxBuffer: 20 * 1024 * 1024,
            timeout: 45_000, // per-attempt cap
          }, (error, _stdout, stderr) => {
            ffmpegStderr = (stderr || '').toString();
            if (error) reject(new Error(`ffmpeg attempt failed: ${error.message}`));
            else resolve();
          });
        });
      } catch (e) {
        lastReason = `${e.message} | ${ffmpegStderr.slice(-300)}`;
        console.error(`[${jobId}] attempt=${attempt} ffmpeg failed: ${lastReason}`);
        attemptLogs.push({ attempt, startOffset, ok: false, reason: lastReason });
        continue;
      }
      const encMs = Date.now() - encStart;

      // Validate
      const v = await validateOutput(outputPath, jobId);
      attemptLogs.push({ attempt, startOffset, encMs, ok: v.ok, reason: v.reason, size: v.size, avgLuma: v.avgLuma });
      if (v.ok) {
        // Size guard: aim 1-3MB. If oversized > 4MB, allow but log; if undersized warn only.
        console.log(`[${jobId}] attempt=${attempt} VALID size=${v.size} dur=${v.durationSec} avgLuma=${v.avgLuma?.toFixed(1)} encMs=${encMs}`);
        success = true;
        validation = v;
        break;
      } else {
        lastReason = v.reason;
        console.warn(`[${jobId}] attempt=${attempt} INVALID: ${v.reason} — retrying with new segment`);
      }
    }

    if (!success) {
      throw new Error(`preview validation failed after ${MAX_RETRIES} attempts: ${lastReason} | log=${JSON.stringify(attemptLogs)}`);
    }

    const outputSize = fs.statSync(outputPath).size;
    const totalMs = Date.now() - jobStart;
    console.log(`[${jobId}] DONE totalMs=${totalMs} outputBytes=${outputSize} attempts=${attemptLogs.length}`);

    // Stream MP4 back; embed metadata in headers
    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Content-Length', outputSize);
    res.setHeader('X-Job-Id', jobId);
    res.setHeader('X-Preview-Duration', String(validation.durationSec || duration));
    res.setHeader('X-Preview-Avg-Luma', String(validation.avgLuma?.toFixed?.(1) || ''));
    res.setHeader('X-Preview-Attempts', String(attemptLogs.length));
    res.setHeader('X-Preview-Total-Ms', String(totalMs));

    const readStream = fs.createReadStream(outputPath);
    readStream.pipe(res);
    readStream.on('end', () => cleanup(inputPath, watermarkPath, outputPath));
    readStream.on('error', (err) => {
      console.error(`[${jobId}] stream error:`, err);
      cleanup(inputPath, watermarkPath, outputPath);
    });

  } catch (err) {
    const totalMs = Date.now() - jobStart;
    console.error(`[${jobId}] FAILED totalMs=${totalMs}:`, err.message);
    cleanup(inputPath, watermarkPath, outputPath);
    res.status(500).json({
      error: err.message,
      jobId,
      totalMs,
      attempts: attemptLogs,
    });
  }
});

app.listen(PORT, () => console.log(`FFmpeg API listening on port ${PORT}`));
