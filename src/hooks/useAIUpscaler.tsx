import { useState, useCallback, useRef, useEffect } from 'react';

// ── Types ──────────────────────────────────────────────────────────────────
export type AccelerationBackend = 'webgpu' | 'webgl' | 'cpu' | 'canvas-only';
export type UpscaleMode = 'fast' | 'ai';
export type ModelStatus =
  | 'idle'
  | 'checking-cache'
  | 'downloading'
  | 'loading'
  | 'ready'
  | 'error'
  | 'unsupported';

export interface AIUpscalerState {
  modelStatus: ModelStatus;
  downloadProgress: number;
  backend: AccelerationBackend;
  isProcessing: boolean;
  processingProgress: number;
  statusMessage: string;
  gpuAccelerated: boolean;
}

// ── Constants ──────────────────────────────────────────────────────────────
const MODEL_URL =
  'https://huggingface.co/nicjac/realesrgan-onnx/resolve/main/RealESRGAN_x4plus.onnx';
const MODEL_CACHE_KEY = 'esrgan-model-v1';
const DB_NAME = 'ai-upscaler-cache';
const DB_STORE = 'models';
const MAX_INPUT_PX = 2000; // auto-downscale beyond this
const TILE_SIZE = 256; // tile size for inference
const TILE_PADDING = 16;

// ── IndexedDB helpers ──────────────────────────────────────────────────────
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(DB_STORE)) {
        req.result.createObjectStore(DB_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function getCachedModel(): Promise<ArrayBuffer | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(DB_STORE, 'readonly');
      const store = tx.objectStore(DB_STORE);
      const req = store.get(MODEL_CACHE_KEY);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

async function cacheModel(data: ArrayBuffer): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(DB_STORE, 'readwrite');
      const store = tx.objectStore(DB_STORE);
      const req = store.put(data, MODEL_CACHE_KEY);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    // silently fail caching
  }
}

// ── Detect best backend ────────────────────────────────────────────────────
async function detectBackend(): Promise<AccelerationBackend> {
  // Check WebGPU
  if ('gpu' in navigator) {
    try {
      const adapter = await (navigator as any).gpu.requestAdapter();
      if (adapter) return 'webgpu';
    } catch { /* not available */ }
  }

  // Check WebGL2
  try {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2');
    if (gl) return 'webgl';
  } catch { /* not available */ }

  // Check if device is too weak for ONNX (heuristic: <4 logical cores)
  if (navigator.hardwareConcurrency && navigator.hardwareConcurrency < 4) {
    return 'canvas-only';
  }

  return 'cpu';
}

// ── Download with progress ─────────────────────────────────────────────────
async function downloadModel(
  onProgress: (pct: number) => void,
): Promise<ArrayBuffer> {
  const res = await fetch(MODEL_URL);
  if (!res.ok) throw new Error(`Model download failed: ${res.status}`);

  const total = Number(res.headers.get('content-length') || 0);
  const reader = res.body!.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    received += value.length;
    if (total > 0) onProgress(Math.round((received / total) * 100));
  }

  const buf = new ArrayBuffer(received);
  const view = new Uint8Array(buf);
  let offset = 0;
  for (const chunk of chunks) {
    view.set(chunk, offset);
    offset += chunk.length;
  }
  return buf;
}

// ── Resize helper ──────────────────────────────────────────────────────────
function fitToMax(
  w: number,
  h: number,
  maxPx: number,
): { w: number; h: number; scaled: boolean } {
  if (w <= maxPx && h <= maxPx) return { w, h, scaled: false };
  const ratio = Math.min(maxPx / w, maxPx / h);
  return {
    w: Math.round(w * ratio),
    h: Math.round(h * ratio),
    scaled: true,
  };
}

// ── Canvas (fast) upscale ──────────────────────────────────────────────────
function canvasUpscale(
  img: HTMLImageElement,
  scale: number,
  sharpness: number,
): string {
  const newW = img.naturalWidth * scale;
  const newH = img.naturalHeight * scale;
  const canvas = document.createElement('canvas');
  canvas.width = newW;
  canvas.height = newH;
  const ctx = canvas.getContext('2d')!;

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, newW, newH);

  // Unsharp mask
  if (sharpness > 20) {
    const strength = sharpness / 100;
    const imageData = ctx.getImageData(0, 0, newW, newH);
    const data = imageData.data;
    const blurCanvas = document.createElement('canvas');
    blurCanvas.width = newW;
    blurCanvas.height = newH;
    const blurCtx = blurCanvas.getContext('2d')!;
    blurCtx.filter = 'blur(1px)';
    blurCtx.drawImage(canvas, 0, 0);
    const blurData = blurCtx.getImageData(0, 0, newW, newH).data;
    for (let i = 0; i < data.length; i += 4) {
      data[i] = Math.min(255, Math.max(0, data[i] + strength * (data[i] - blurData[i])));
      data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + strength * (data[i + 1] - blurData[i + 1])));
      data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + strength * (data[i + 2] - blurData[i + 2])));
    }
    ctx.putImageData(imageData, 0, 0);
  }

  return canvas.toDataURL('image/png');
}

// ── The Hook ───────────────────────────────────────────────────────────────
export function useAIUpscaler() {
  const [state, setState] = useState<AIUpscalerState>({
    modelStatus: 'idle',
    downloadProgress: 0,
    backend: 'cpu',
    isProcessing: false,
    processingProgress: 0,
    statusMessage: '',
    gpuAccelerated: false,
  });

  const sessionRef = useRef<any>(null);
  const backendRef = useRef<AccelerationBackend>('cpu');

  const patch = useCallback(
    (p: Partial<AIUpscalerState>) => setState((s) => ({ ...s, ...p })),
    [],
  );

  // Detect backend on mount
  useEffect(() => {
    detectBackend().then((b) => {
      backendRef.current = b;
      patch({
        backend: b,
        gpuAccelerated: b === 'webgpu' || b === 'webgl',
        statusMessage:
          b === 'canvas-only'
            ? 'Device too weak for AI – using fast mode only'
            : `Acceleration: ${b.toUpperCase()}`,
      });
    });
  }, [patch]);

  // ── Load / initialise model ────────────────────────────────────────────
  const initModel = useCallback(async () => {
    if (sessionRef.current) {
      patch({ modelStatus: 'ready', statusMessage: 'AI model ready' });
      return true;
    }
    if (backendRef.current === 'canvas-only') {
      patch({ modelStatus: 'unsupported', statusMessage: 'AI mode not supported on this device' });
      return false;
    }

    try {
      const ort = await import('onnxruntime-web');

      // Configure WASM paths to use CDN
      ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@latest/dist/';

      // 1. Check cache
      patch({ modelStatus: 'checking-cache', statusMessage: 'Checking model cache…' });
      let modelData = await getCachedModel();

      // 2. Download if not cached
      if (!modelData) {
        patch({ modelStatus: 'downloading', downloadProgress: 0, statusMessage: 'Downloading AI model…' });
        modelData = await downloadModel((pct) =>
          patch({ downloadProgress: pct, statusMessage: `Downloading AI model… ${pct}%` }),
        );
        await cacheModel(modelData);
      }

      // 3. Create session
      patch({ modelStatus: 'loading', statusMessage: 'Loading AI model…' });

      const providers: string[] = [];
      if (backendRef.current === 'webgpu') providers.push('webgpu');
      if (backendRef.current === 'webgl') providers.push('webgl');
      providers.push('wasm'); // always fallback to wasm (replaces 'cpu')

      const session = await ort.InferenceSession.create(modelData, {
        executionProviders: providers,
      });

      sessionRef.current = session;
      patch({ modelStatus: 'ready', statusMessage: 'AI model ready' });
      return true;
    } catch (err) {
      console.error('Model init error:', err);
      patch({
        modelStatus: 'error',
        statusMessage: 'AI model failed to load – falling back to fast mode',
      });
      return false;
    }
  }, [patch]);

  // ── AI inference on a single tile ──────────────────────────────────────
  const inferTile = useCallback(
    async (
      imageData: ImageData,
      ort: any,
    ): Promise<Float32Array> => {
      const session = sessionRef.current!;
      const { width, height, data } = imageData;

      // Build float32 CHW tensor (RGB normalised 0-1)
      const input = new Float32Array(3 * height * width);
      for (let i = 0; i < width * height; i++) {
        input[i] = data[i * 4] / 255; // R
        input[width * height + i] = data[i * 4 + 1] / 255; // G
        input[2 * width * height + i] = data[i * 4 + 2] / 255; // B
      }

      const tensor = new ort.Tensor('float32', input, [1, 3, height, width]);
      const inputName = session.inputNames[0];
      const results = await session.run({ [inputName]: tensor });
      const outputName = session.outputNames[0];
      return results[outputName].data as Float32Array;
    },
    [],
  );

  // ── AI upscale (tiled) ─────────────────────────────────────────────────
  const aiUpscale = useCallback(
    async (imgSrc: string, scale: number): Promise<string> => {
      const ort = await import('onnxruntime-web');

      // Load image
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise<void>((res, rej) => {
        img.onload = () => res();
        img.onerror = rej;
        img.src = imgSrc;
      });

      // Auto-downscale if too large
      const fit = fitToMax(img.naturalWidth, img.naturalHeight, MAX_INPUT_PX);
      const srcCanvas = document.createElement('canvas');
      srcCanvas.width = fit.w;
      srcCanvas.height = fit.h;
      const srcCtx = srcCanvas.getContext('2d')!;
      srcCtx.drawImage(img, 0, 0, fit.w, fit.h);

      const outScale = 4; // ESRGAN is always 4×
      const outW = fit.w * outScale;
      const outH = fit.h * outScale;
      const outCanvas = document.createElement('canvas');
      outCanvas.width = outW;
      outCanvas.height = outH;
      const outCtx = outCanvas.getContext('2d')!;

      // Process in tiles
      const tilesX = Math.ceil(fit.w / TILE_SIZE);
      const tilesY = Math.ceil(fit.h / TILE_SIZE);
      const totalTiles = tilesX * tilesY;
      let processed = 0;

      for (let ty = 0; ty < tilesY; ty++) {
        for (let tx = 0; tx < tilesX; tx++) {
          const sx = tx * TILE_SIZE;
          const sy = ty * TILE_SIZE;
          const sw = Math.min(TILE_SIZE + TILE_PADDING, fit.w - sx);
          const sh = Math.min(TILE_SIZE + TILE_PADDING, fit.h - sy);

          const tileData = srcCtx.getImageData(sx, sy, sw, sh);
          const outputData = await inferTile(tileData, ort);

          // Output tile dimensions
          const ow = sw * outScale;
          const oh = sh * outScale;

          // Write output tile to canvas
          const tileImageData = outCtx.createImageData(ow, oh);
          for (let i = 0; i < ow * oh; i++) {
            tileImageData.data[i * 4] = Math.min(255, Math.max(0, Math.round(outputData[i] * 255)));
            tileImageData.data[i * 4 + 1] = Math.min(255, Math.max(0, Math.round(outputData[ow * oh + i] * 255)));
            tileImageData.data[i * 4 + 2] = Math.min(255, Math.max(0, Math.round(outputData[2 * ow * oh + i] * 255)));
            tileImageData.data[i * 4 + 3] = 255;
          }
          outCtx.putImageData(tileImageData, sx * outScale, sy * outScale);

          processed++;
          patch({
            processingProgress: Math.round((processed / totalTiles) * 100),
            statusMessage: `AI processing tile ${processed}/${totalTiles}…`,
          });
        }
      }

      // If user requested 2× but model outputs 4×, downscale
      if (scale === 2) {
        const finalCanvas = document.createElement('canvas');
        finalCanvas.width = outW / 2;
        finalCanvas.height = outH / 2;
        const fCtx = finalCanvas.getContext('2d')!;
        fCtx.imageSmoothingEnabled = true;
        fCtx.imageSmoothingQuality = 'high';
        fCtx.drawImage(outCanvas, 0, 0, outW / 2, outH / 2);
        return finalCanvas.toDataURL('image/png');
      }

      return outCanvas.toDataURL('image/png');
    },
    [inferTile, patch],
  );

  // ── Main upscale entry point ──────────────────────────────────────────
  const upscale = useCallback(
    async (
      imgSrc: string,
      scale: number,
      mode: UpscaleMode,
      sharpness: number,
    ): Promise<string | null> => {
      patch({ isProcessing: true, processingProgress: 0 });

      try {
        if (mode === 'fast') {
          patch({ statusMessage: 'Fast upscaling…' });
          const img = new Image();
          img.crossOrigin = 'anonymous';
          await new Promise<void>((res, rej) => {
            img.onload = () => res();
            img.onerror = rej;
            img.src = imgSrc;
          });
          const result = canvasUpscale(img, scale, sharpness);
          patch({ statusMessage: 'Done!', processingProgress: 100 });
          return result;
        }

        // AI mode
        const ready = await initModel();
        if (!ready) {
          // Fallback to fast mode
          patch({ statusMessage: 'Falling back to fast mode…' });
          const img = new Image();
          img.crossOrigin = 'anonymous';
          await new Promise<void>((res, rej) => {
            img.onload = () => res();
            img.onerror = rej;
            img.src = imgSrc;
          });
          const result = canvasUpscale(img, scale, sharpness);
          patch({ statusMessage: 'Done (fast fallback)', processingProgress: 100 });
          return result;
        }

        patch({ statusMessage: 'AI processing…' });
        const result = await aiUpscale(imgSrc, scale);
        patch({ statusMessage: 'AI upscale complete!', processingProgress: 100 });
        return result;
      } catch (err) {
        console.error('Upscale error:', err);
        patch({ statusMessage: 'Error during processing' });
        return null;
      } finally {
        patch({ isProcessing: false });
      }
    },
    [initModel, aiUpscale, patch],
  );

  // ── Preload model ──────────────────────────────────────────────────────
  const preloadModel = useCallback(async () => {
    await initModel();
  }, [initModel]);

  return { ...state, upscale, preloadModel, initModel };
}
