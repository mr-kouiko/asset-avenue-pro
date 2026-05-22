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

// Validate produced preview: not blank/dark/blurry, real multi-frame mp4
async function validateOutput(outputPath, jobId, expectedRes = 720) {
  // file size sanity — full-length 720p H.264 is always >= 250KB
  const size = fs.statSync(outputPath).size;
  if (size < 250 * 1024) return { ok: false, reason: 'output_too_small', detail: `${size}B` };

  // probe stream
  let probeJson;
  try {
    const out = await runFfprobe([
      '-v', 'error', '-print_format', 'json',
      '-show_streams', '-show_format', outputPath
    ]);
    probeJson = JSON.parse(out);
  } catch (e) {
    return { ok: false, reason: 'corrupt_output', detail: e.message };
  }
  const vstream = probeJson.streams?.find(s => s.codec_type === 'video');
  if (!vstream) return { ok: false, reason: 'no_video_stream' };
  if (vstream.codec_name !== 'h264') {
    return { ok: false, reason: 'wrong_codec', detail: vstream.codec_name };
  }
  if (/wrapped_avframe/i.test(JSON.stringify(probeJson))) {
    return { ok: false, reason: 'wrapped_avframe_output' };
  }
  const width = vstream.width || 0;
  const height = vstream.height || 0;
  if (height > expectedRes + 16 || width > expectedRes * 2 + 64) {
    return { ok: false, reason: 'scaling_failed', detail: `${width}x${height}` };
  }
  const dur = parseFloat(probeJson.format?.duration || '0');
  if (dur < 3) return { ok: false, reason: 'duration_too_short', detail: `${dur}s` };

  // Hard frame-count check — single-frame wrapped outputs report nb_read_frames=1
  let frameCount = 0;
  try {
    const out = await runFfprobe([
      '-v', 'error', '-count_frames', '-select_streams', 'v:0',
      '-show_entries', 'stream=nb_read_frames', '-of', 'json', outputPath
    ]);
    frameCount = parseInt(JSON.parse(out).streams?.[0]?.nb_read_frames || '0', 10) || 0;
  } catch (e) {
    return { ok: false, reason: 'frame_count_probe_failed', detail: e.message };
  }
  if (frameCount < 30) {
    return { ok: false, reason: 'single_frame_output', detail: `frames=${frameCount}` };
  }

  // luma + black-frame check
  // NOTE: signalstats per-frame stats (YAVG etc.) are exposed as frame metadata
  // (lavfi.signalstats.YAVG=...). At default loglevel they do NOT appear in stderr,
  // which caused a validator false-positive: healthy previews flagged `no_decodable_frames`
  // because the YAVG: regex never matched. Use `metadata=mode=print:file=-` to force
  // the values to stdout so we can parse them deterministically.
  try {
    const { stdout: lumaOut, stderr: lumaErr } = await new Promise((resolve) => {
      execFile('ffmpeg', [
        '-nostats', '-loglevel', 'error',
        '-i', outputPath,
        '-vf', 'scale=320:-2,signalstats,metadata=mode=print:file=-',
        '-f', 'null', '-'
      ], { maxBuffer: 20 * 1024 * 1024, timeout: 20000 }, (_err, stdout, stderr) => {
        resolve({ stdout: stdout?.toString() || '', stderr: stderr?.toString() || '' });
      });
    });
    const lumas = [];
    // Primary format: `lavfi.signalstats.YAVG=128.45`
    const reMeta = /lavfi\.signalstats\.YAVG=([\d.]+)/g;
    let m;
    while ((m = reMeta.exec(lumaOut)) !== null) lumas.push(parseFloat(m[1]));
    // Legacy fallback: `YAVG:128.45` or `YAVG=...` from verbose loglevel
    if (lumas.length === 0) {
      const reLegacy = /YAVG[:=]([\d.]+)/g;
      const combined = `${lumaOut}\n${lumaErr}`;
      while ((m = reLegacy.exec(combined)) !== null) lumas.push(parseFloat(m[1]));
    }
    if (lumas.length === 0) {
      console.warn(`[${jobId}] luma probe returned 0 samples — stderr tail: ${lumaErr.slice(-300)}`);
      return { ok: false, reason: 'no_decodable_frames', detail: `stderr=${lumaErr.slice(-120)}` };
    }
    const avgLuma = lumas.reduce((a, b) => a + b, 0) / lumas.length;
    const minLuma = Math.min(...lumas);
    if (avgLuma < 16) return { ok: false, reason: 'too_dark', detail: `avgLuma=${avgLuma.toFixed(1)}` };
    const blackFrames = lumas.filter(v => v < 8).length;
    if (blackFrames / lumas.length > 0.6) return { ok: false, reason: 'too_many_black_frames', detail: `${blackFrames}/${lumas.length}` };
    return { ok: true, size, durationSec: dur, avgLuma, minLuma, frameCount, width, height, codec: vstream.codec_name };
  } catch (e) {
    return { ok: false, reason: 'validation_probe_failed', detail: e.message };
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

// =============================================================================
// /thumbnail — Extract a single JPG frame from a video URL.
// Body: { videoUrl: string, position?: number (0-1, default 0.2), width?: number (default 480), videoId?: string }
// Response: image/jpeg bytes
// =============================================================================
app.post('/thumbnail', authenticate, async (req, res) => {
  const { videoUrl, position, width, videoId } = req.body || {};
  const jobId = randomUUID();
  const tag = videoId ? `${jobId}|video=${videoId}` : jobId;

  if (!videoUrl) {
    console.error(`[${tag}] /thumbnail: missing videoUrl`);
    return res.status(400).json({ error: 'videoUrl is required' });
  }

  const pos = Math.min(Math.max(Number(position) || 0.2, 0.01), 0.95);
  const targetWidth = Math.min(Math.max(Number(width) || 480, 120), 1920);

  const inputPath = path.join(TMP_DIR, `${jobId}_thumb_input`);
  const outputPath = path.join(TMP_DIR, `${jobId}_thumb.jpg`);
  const t0 = Date.now();

  try {
    console.log(`[${tag}] /thumbnail START url=${videoUrl.slice(0, 120)} pos=${pos} w=${targetWidth}`);

    // Download
    try {
      await downloadFile(videoUrl, inputPath);
    } catch (e) {
      console.error(`[${tag}] /thumbnail download_error: ${e.message}`);
      return res.status(502).json({ error: `download_error: ${e.message}`, jobId, videoId });
    }
    const inputSize = fs.statSync(inputPath).size;
    console.log(`[${tag}] /thumbnail downloaded ${(inputSize / 1024 / 1024).toFixed(1)}MB`);

    // Probe duration
    let probedDuration = 0;
    try {
      const out = await runFfprobe([
        '-v', 'error', '-print_format', 'json',
        '-show_entries', 'format=duration', inputPath
      ]);
      probedDuration = parseFloat(JSON.parse(out).format?.duration || '0') || 0;
    } catch (e) {
      console.warn(`[${tag}] /thumbnail probe failed: ${e.message}`);
    }
    const seekSec = probedDuration > 0 ? probedDuration * pos : 1;
    console.log(`[${tag}] /thumbnail dur=${probedDuration}s seek=${seekSec.toFixed(2)}s`);

    // Extract frame
    let ffmpegStderr = '';
    try {
      await new Promise((resolve, reject) => {
        execFile('ffmpeg', [
          '-ss', seekSec.toFixed(2),
          '-i', inputPath,
          '-frames:v', '1',
          '-vf', `scale=${targetWidth}:-2:flags=lanczos`,
          '-q:v', '3',
          '-y', outputPath,
        ], { maxBuffer: 20 * 1024 * 1024, timeout: 30_000 }, (err, _stdout, stderr) => {
          ffmpegStderr = (stderr || '').toString();
          if (err) reject(new Error(`ffmpeg_error: ${err.message}`));
          else resolve();
        });
      });
    } catch (e) {
      console.error(`[${tag}] /thumbnail ffmpeg failed: ${e.message} | ${ffmpegStderr.slice(-300)}`);
      cleanup(inputPath, outputPath);
      return res.status(500).json({ error: e.message, jobId, videoId, stderr: ffmpegStderr.slice(-300) });
    }

    const outSize = fs.statSync(outputPath).size;
    if (outSize < 2000) {
      console.error(`[${tag}] /thumbnail output too small: ${outSize}B`);
      cleanup(inputPath, outputPath);
      return res.status(500).json({ error: `invalid output: ${outSize}B`, jobId, videoId });
    }

    const totalMs = Date.now() - t0;
    console.log(`[${tag}] /thumbnail DONE bytes=${outSize} totalMs=${totalMs}`);

    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Content-Length', outSize);
    res.setHeader('X-Job-Id', jobId);
    res.setHeader('X-Total-Ms', String(totalMs));

    const stream = fs.createReadStream(outputPath);
    stream.pipe(res);
    stream.on('end', () => cleanup(inputPath, outputPath));
    stream.on('error', () => cleanup(inputPath, outputPath));
  } catch (err) {
    console.error(`[${tag}] /thumbnail FAILED: ${err.message}`);
    cleanup(inputPath, outputPath);
    res.status(500).json({ error: err.message, jobId, videoId });
  }
});

app.post('/process', authenticate, async (req, res) => {
  const { videoUrl, watermarkUrl } = req.body;

  // Hard limits — preview encodes the FULL source video (uploads capped at 60s elsewhere)
  const MAX_DURATION = 60;       // absolute upper bound for preview length
  const MAX_RESOLUTION = 720;
  const MAX_FPS = 30;
  const MAX_RETRIES = 1;         // full-length encode: no segment retries
  // DIAGNOSTIC: raised from 120s/110s to 320s/300s to characterize true Render throughput.
  // Revert once optimization pass C lands.
  const MAX_TOTAL_MS = 320_000;  // overall safeguard for full-length encode
  const PER_ATTEMPT_MS = 300_000;


  const MUTE_AUDIO = req.body.muted !== false;
  const requestedRes = Number(req.body.resolution) || MAX_RESOLUTION;
  const resolution = Math.min(requestedRes, MAX_RESOLUTION);
  // Duration is determined from the probed source below; placeholder until then.
  let duration = MAX_DURATION;

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

    // Encode the FULL video (capped at MAX_DURATION as a safety net)
    if (probedDuration > 0) {
      duration = Math.min(probedDuration, MAX_DURATION);
    }

    // Scene detection no longer needed (full-length encode)
    const sceneTimes = [];

    // Optional watermark
    if (watermarkUrl) {
      try {
        await downloadFile(watermarkUrl, watermarkPath);
        watermarkDownloaded = true;
      } catch (e) {
        console.warn(`[${jobId}] watermark download failed (continuing without): ${e.message}`);
      }
    }

    // Valid scale + fps chain. `source_fps` is NOT a valid expression variable for the fps filter
    // and previously evaluated to 0, producing single-frame outputs. Use a plain numeric fps cap.
    const scaleExpr = `scale=-2:'min(${resolution}\\,ih)':flags=lanczos,fps=${MAX_FPS}`;

    let lastReason = 'no attempts run';
    let success = false;
    let validation = null;
    let chosenStart = 0;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      if (Date.now() - jobStart > MAX_TOTAL_MS) {
        lastReason = `total time budget exceeded (${MAX_TOTAL_MS}ms)`;
        break;
      }

      const startOffset = 0;       // always start at the beginning — full-length preview
      chosenStart = startOffset;

      // Encode
      const ffmpegArgs = ['-ss', String(startOffset), '-i', inputPath];

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

      const crf = 23 + attempt; // 23, 24, 25
      ffmpegArgs.push(
        '-filter_complex', filterComplex,
        '-map', '[vout]',
        '-t', String(duration),
        '-r', String(MAX_FPS),
        '-vsync', 'cfr',
        '-c:v', 'libx264',
        '-preset', 'veryfast',
        '-crf', String(crf),
        '-maxrate', '1500k',
        '-bufsize', '3000k',
        '-pix_fmt', 'yuv420p',
        '-profile:v', 'main',
        '-level', '4.0',
        '-g', String(MAX_FPS * 2),
        '-movflags', '+faststart',
        '-threads', '2',
      );

      if (MUTE_AUDIO) ffmpegArgs.push('-an');
      else ffmpegArgs.push('-c:a', 'aac', '-b:a', '96k', '-ac', '2', '-ar', '44100');

      ffmpegArgs.push('-y', outputPath);

      const encStart = Date.now();
      console.log(`[${jobId}] attempt=${attempt} encode start=${startOffset.toFixed(2)} crf=${crf}`);

      let ffmpegStderr = '';
      let killInfo = null;
      try {
        await new Promise((resolve, reject) => {
          const child = execFile('ffmpeg', ffmpegArgs, {
            maxBuffer: 20 * 1024 * 1024,
            timeout: PER_ATTEMPT_MS,
            killSignal: 'SIGTERM',
          }, (error, _stdout, stderr) => {
            ffmpegStderr = (stderr || '').toString();
            if (error) {
              // Distinguish termination cause:
              //  - Node timeout/maxBuffer  => error.killed=true,  error.signal='SIGTERM'
              //  - OOM killer / Render restart => error.killed=false, error.signal='SIGKILL'
              //  - ffmpeg exited on its own => error.signal=null,  error.code=<int>
              killInfo = {
                message: error.message,
                code: error.code ?? null,
                signal: error.signal ?? null,
                killedByNode: error.killed === true,
                cmdElapsedMs: Date.now() - encStart,
                stderrTail: ffmpegStderr.slice(-800),
                rssMb: Math.round(process.memoryUsage().rss / 1024 / 1024),
              };
              console.error(`[${jobId}] FFMPEG_KILL ${JSON.stringify(killInfo)}`);
              reject(new Error(`ffmpeg attempt failed: signal=${killInfo.signal} code=${killInfo.code} killedByNode=${killInfo.killedByNode} elapsedMs=${killInfo.cmdElapsedMs}`));
            } else resolve();
          });
          child.on('spawn', () => console.log(`[${jobId}] ffmpeg spawned pid=${child.pid}`));
        });
      } catch (e) {
        lastReason = `${e.message} | stderrTail=${ffmpegStderr.slice(-300)}`;
        console.error(`[${jobId}] attempt=${attempt} ffmpeg failed: ${lastReason}`);
        attemptLogs.push({ attempt, startOffset, ok: false, reason: lastReason, kill: killInfo });
        continue;
      }
      const encMs = Date.now() - encStart;

      // Validate
      const v = await validateOutput(outputPath, jobId, resolution);
      attemptLogs.push({ attempt, startOffset, encMs, ok: v.ok, reason: v.reason, detail: v.detail, size: v.size, frameCount: v.frameCount, width: v.width, height: v.height, avgLuma: v.avgLuma });
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
    res.setHeader('X-Preview-Frame-Count', String(validation.frameCount || 0));
    res.setHeader('X-Preview-Width', String(validation.width || 0));
    res.setHeader('X-Preview-Height', String(validation.height || 0));
    res.setHeader('X-Preview-Codec', String(validation.codec || ''));
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
