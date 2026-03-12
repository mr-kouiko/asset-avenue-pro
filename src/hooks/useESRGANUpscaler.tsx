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

export interface ESRGANState {
  modelStatus: ModelStatus;
  downloadProgress: number;
  backend: AccelerationBackend;
  isProcessing: boolean;
  processingProgress: number;
  statusMessage: string;
  gpuAccelerated: boolean;
}

// ── Constants ──────────────────────────────────────────────────────────────
const ESRGAN_MODEL_URL =
  'https://huggingface.co/ai-forever/Real-ESRGAN/resolve/main/RealESRGAN_x4plus.onnx';
const ESRGAN_CACHE_KEY = 'esrgan-model-v2';
const DB_NAME = 'ai-upscaler-cache';
const DB_STORE = 'models';
const MAX_INPUT_PX = 2000;
const TILE_SIZE = 256;
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

async function getCachedModel(cacheKey: string): Promise<ArrayBuffer | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(DB_STORE, 'readonly');
      const store = tx.objectStore(DB_STORE);
      const req = store.get(cacheKey);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

async function cacheModel(data: ArrayBuffer, cacheKey: string): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(DB_STORE, 'readwrite');
      const store = tx.objectStore(DB_STORE);
      const req = store.put(data, cacheKey);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    // silently fail caching
  }
}

// ── Detect best backend ────────────────────────────────────────────────────
async function detectBackend(): Promise<AccelerationBackend> {
  if ('gpu' in navigator) {
    try {
      const adapter = await (navigator as any).gpu.requestAdapter();
      if (adapter) return 'webgpu';
    } catch { /* not available */ }
  }
  try {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2');
    if (gl) return 'webgl';
  } catch { /* not available */ }
  if (navigator.hardwareConcurrency && navigator.hardwareConcurrency < 4) {
    return 'canvas-only';
  }
  return 'cpu';
}

// ── Download with progress ─────────────────────────────────────────────────
async function downloadModelFromURL(
  url: string,
  onProgress: (pct: number) => void,
): Promise<ArrayBuffer> {
  const res = await fetch(url);
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

// ── Helpers ────────────────────────────────────────────────────────────────
function fitToMax(w: number, h: number, maxPx: number) {
  if (w <= maxPx && h <= maxPx) return { w, h, scaled: false };
  const ratio = Math.min(maxPx / w, maxPx / h);
  return { w: Math.round(w * ratio), h: Math.round(h * ratio), scaled: true };
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function canvasUpscale(img: HTMLImageElement, scale: number, sharpness: number): string {
  const newW = img.naturalWidth * scale;
  const newH = img.naturalHeight * scale;
  const canvas = document.createElement('canvas');
  canvas.width = newW;
  canvas.height = newH;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, newW, newH);
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
export function useESRGANUpscaler() {
  const [state, setState] = useState<ESRGANState>({
    modelStatus: 'idle',
    downloadProgress: 0,
    backend: 'cpu',
    isProcessing: false,
    processingProgress: 0,
    statusMessage: '',
    gpuAccelerated: false,
  });

  const esrganSessionRef = useRef<any>(null);
  const backendRef = useRef<AccelerationBackend>('cpu');
  const ortRef = useRef<any>(null);

  const patch = useCallback(
    (p: Partial<ESRGANState>) => setState((s) => ({ ...s, ...p })),
    [],
  );

  useEffect(() => {
    detectBackend().then((b) => {
      backendRef.current = b;
      patch({
        backend: b,
        gpuAccelerated: b === 'webgpu' || b === 'webgl',
        statusMessage: b === 'canvas-only' ? 'Device too weak for AI – using fast mode only' : `Acceleration: ${b.toUpperCase()}`,
      });
    });
  }, [patch]);

  const getOrt = useCallback(async () => {
    if (ortRef.current) return ortRef.current;
    const ort = await import('onnxruntime-web');
    ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.24.3/dist/';
    ort.env.wasm.numThreads = 1;
    ortRef.current = ort;
    return ort;
  }, []);

  const getProviders = useCallback((): string[] => {
    const b = backendRef.current;
    if (b === 'webgpu') return ['webgpu', 'wasm'];
    if (b === 'webgl') return ['webgl', 'wasm'];
    return ['wasm'];
  }, []);

  const initEsrganModel = useCallback(async () => {
    if (esrganSessionRef.current) {
      patch({ modelStatus: 'ready', statusMessage: 'AI model ready' });
      return true;
    }
    if (backendRef.current === 'canvas-only') {
      patch({ modelStatus: 'unsupported', statusMessage: 'AI mode not supported on this device' });
      return false;
    }
    try {
      const ort = await getOrt();
      patch({ modelStatus: 'checking-cache', statusMessage: 'Checking ESRGAN cache…' });
      let modelData = await getCachedModel(ESRGAN_CACHE_KEY);
      if (!modelData) {
        patch({ modelStatus: 'downloading', downloadProgress: 0, statusMessage: 'Downloading ESRGAN model…' });
        modelData = await downloadModelFromURL(ESRGAN_MODEL_URL, (pct) =>
          patch({ downloadProgress: pct, statusMessage: `Downloading ESRGAN… ${pct}%` }),
        );
        await cacheModel(modelData, ESRGAN_CACHE_KEY);
      }
      patch({ modelStatus: 'loading', statusMessage: 'Loading ESRGAN model…' });
      const session = await ort.InferenceSession.create(modelData, {
        executionProviders: getProviders(),
      });
      esrganSessionRef.current = session;
      patch({ modelStatus: 'ready', statusMessage: 'ESRGAN model ready' });
      return true;
    } catch (err) {
      console.error('ESRGAN init error:', err);
      patch({ modelStatus: 'error', statusMessage: 'ESRGAN model failed to load' });
      return false;
    }
  }, [patch, getOrt, getProviders]);

  const inferEsrganTile = useCallback(
    async (imageData: ImageData, ort: any): Promise<Float32Array> => {
      const session = esrganSessionRef.current!;
      const { width, height, data } = imageData;
      const input = new Float32Array(3 * height * width);
      for (let i = 0; i < width * height; i++) {
        input[i] = data[i * 4] / 255;
        input[width * height + i] = data[i * 4 + 1] / 255;
        input[2 * width * height + i] = data[i * 4 + 2] / 255;
      }
      const tensor = new ort.Tensor('float32', input, [1, 3, height, width]);
      const results = await session.run({ [session.inputNames[0]]: tensor });
      return results[session.outputNames[0]].data as Float32Array;
    },
    [],
  );

  const aiUpscale = useCallback(
    async (imgSrc: string, scale: number): Promise<string> => {
      const ort = await getOrt();
      const img = await loadImage(imgSrc);
      const fit = fitToMax(img.naturalWidth, img.naturalHeight, MAX_INPUT_PX);
      const srcCanvas = document.createElement('canvas');
      srcCanvas.width = fit.w;
      srcCanvas.height = fit.h;
      const srcCtx = srcCanvas.getContext('2d')!;
      srcCtx.drawImage(img, 0, 0, fit.w, fit.h);
      const outScale = 4;
      const outW = fit.w * outScale;
      const outH = fit.h * outScale;
      const outCanvas = document.createElement('canvas');
      outCanvas.width = outW;
      outCanvas.height = outH;
      const outCtx = outCanvas.getContext('2d')!;
      const tilesX = Math.ceil(fit.w / TILE_SIZE);
      const tilesY = Math.ceil(fit.h / TILE_SIZE);
      const totalTiles = tilesX * tilesY;
      let processed = 0;

      for (let ty = 0; ty < tilesY; ty++) {
        for (let tx = 0; tx < tilesX; tx++) {
          const sx = tx * TILE_SIZE;
          const sy = ty * TILE_SIZE;
          const usableW = Math.min(TILE_SIZE, fit.w - sx);
          const usableH = Math.min(TILE_SIZE, fit.h - sy);
          const paddedW = Math.min(usableW + TILE_PADDING, fit.w - sx);
          const paddedH = Math.min(usableH + TILE_PADDING, fit.h - sy);
          const tileData = srcCtx.getImageData(sx, sy, paddedW, paddedH);
          const outputData = await inferEsrganTile(tileData, ort);
          const ow = paddedW * outScale;
          const oh = paddedH * outScale;
          const cropW = usableW * outScale;
          const cropH = usableH * outScale;
          const tmpCanvas = document.createElement('canvas');
          tmpCanvas.width = ow;
          tmpCanvas.height = oh;
          const tmpCtx = tmpCanvas.getContext('2d')!;
          const tileImageData = tmpCtx.createImageData(ow, oh);
          for (let i = 0; i < ow * oh; i++) {
            tileImageData.data[i * 4] = Math.min(255, Math.max(0, Math.round(outputData[i] * 255)));
            tileImageData.data[i * 4 + 1] = Math.min(255, Math.max(0, Math.round(outputData[ow * oh + i] * 255)));
            tileImageData.data[i * 4 + 2] = Math.min(255, Math.max(0, Math.round(outputData[2 * ow * oh + i] * 255)));
            tileImageData.data[i * 4 + 3] = 255;
          }
          tmpCtx.putImageData(tileImageData, 0, 0);
          outCtx.drawImage(tmpCanvas, 0, 0, cropW, cropH, sx * outScale, sy * outScale, cropW, cropH);
          processed++;
          patch({
            processingProgress: Math.round((processed / totalTiles) * 100),
            statusMessage: `AI upscaling tile ${processed}/${totalTiles}…`,
          });
        }
      }

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
    [inferEsrganTile, patch, getOrt],
  );

  const upscale = useCallback(
    async (imgSrc: string, scale: number, mode: UpscaleMode, sharpness: number): Promise<string | null> => {
      patch({ isProcessing: true, processingProgress: 0 });
      try {
        let result: string;
        if (mode === 'fast') {
          patch({ statusMessage: 'Fast upscaling…' });
          const img = await loadImage(imgSrc);
          result = canvasUpscale(img, scale, sharpness);
          patch({ statusMessage: 'Upscale complete!', processingProgress: 100 });
        } else {
          const ready = await initEsrganModel();
          if (!ready) {
            patch({ statusMessage: 'Falling back to fast mode…' });
            const img = await loadImage(imgSrc);
            result = canvasUpscale(img, scale, sharpness);
            patch({ statusMessage: 'Done (fast fallback)', processingProgress: 100 });
          } else {
            patch({ statusMessage: 'AI processing…' });
            result = await aiUpscale(imgSrc, scale);
            patch({ statusMessage: 'ESRGAN upscale complete!', processingProgress: 100 });
          }
        }
        return result;
      } catch (err) {
        console.error('Upscale error:', err);
        patch({ statusMessage: 'Error during processing' });
        return null;
      } finally {
        patch({ isProcessing: false });
      }
    },
    [initEsrganModel, aiUpscale, patch],
  );

  const preloadModel = useCallback(async () => {
    await initEsrganModel();
  }, [initEsrganModel]);

  return { ...state, upscale, preloadModel, initModel: initEsrganModel };
}
