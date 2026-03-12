import { useState, useCallback, useRef, useEffect } from 'react';

// ── Types ──────────────────────────────────────────────────────────────────
export type AccelerationBackend = 'webgpu' | 'webgl' | 'cpu' | 'canvas-only';
export type ModelStatus =
  | 'idle'
  | 'checking-cache'
  | 'downloading'
  | 'loading'
  | 'ready'
  | 'error'
  | 'unsupported';

export type FaceEnhanceStep =
  | 'idle'
  | 'detecting-faces'
  | 'enhancing-faces'
  | 'blending'
  | 'complete'
  | 'no-faces'
  | 'error';

export interface GFPGANState {
  modelStatus: ModelStatus;
  downloadProgress: number;
  backend: AccelerationBackend;
  isProcessing: boolean;
  processingProgress: number;
  statusMessage: string;
  gpuAccelerated: boolean;
  step: FaceEnhanceStep;
  facesDetected: number;
}

// ── Constants ──────────────────────────────────────────────────────────────
const GFPGAN_MODEL_URL =
  'https://huggingface.co/facefusion/models-3.0.0/resolve/main/gfpgan_1.2.onnx';
const GFPGAN_CACHE_KEY = 'gfpgan-model-v3';
const DB_NAME = 'ai-upscaler-cache';
const DB_STORE = 'models';
const GFPGAN_INPUT_SIZE = 512;
const MAX_FACE_ENHANCE_RESOLUTION = 4096;

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
  } catch {}
}

async function downloadModelFromURL(url: string, onProgress: (pct: number) => void): Promise<ArrayBuffer> {
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
  for (const chunk of chunks) { view.set(chunk, offset); offset += chunk.length; }
  return buf;
}

async function detectBackend(): Promise<AccelerationBackend> {
  if ('gpu' in navigator) {
    try {
      const adapter = await (navigator as any).gpu.requestAdapter();
      if (adapter) return 'webgpu';
    } catch {}
  }
  try {
    const c = document.createElement('canvas');
    if (c.getContext('webgl2')) return 'webgl';
  } catch {}
  if (navigator.hardwareConcurrency && navigator.hardwareConcurrency < 4) return 'canvas-only';
  return 'cpu';
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

// ── Face detection ─────────────────────────────────────────────────────────
interface FaceBox { x: number; y: number; width: number; height: number; }

async function detectFaces(canvas: HTMLCanvasElement): Promise<FaceBox[]> {
  if ('FaceDetector' in window) {
    try {
      const detector = new (window as any).FaceDetector({ maxDetectedFaces: 10 });
      const faces = await detector.detect(canvas);
      if (faces.length > 0) {
        return faces.map((f: any) => ({
          x: Math.round(f.boundingBox.x),
          y: Math.round(f.boundingBox.y),
          width: Math.round(f.boundingBox.width),
          height: Math.round(f.boundingBox.height),
        }));
      }
    } catch {}
  }
  return detectFacesFallback(canvas);
}

function detectFacesFallback(canvas: HTMLCanvasElement): FaceBox[] {
  const w = canvas.width;
  const h = canvas.height;
  const scale = Math.min(1, 400 / Math.max(w, h));
  const sw = Math.round(w * scale);
  const sh = Math.round(h * scale);
  const smallCanvas = document.createElement('canvas');
  smallCanvas.width = sw;
  smallCanvas.height = sh;
  const sCtx = smallCanvas.getContext('2d')!;
  sCtx.drawImage(canvas, 0, 0, sw, sh);
  const imageData = sCtx.getImageData(0, 0, sw, sh);
  const data = imageData.data;

  const mask = new Uint8Array(sw * sh);
  for (let i = 0; i < sw * sh; i++) {
    const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2];
    if (r > 95 && g > 40 && b > 20 && r > g && r > b && Math.abs(r - g) > 15 && r - b > 15 && r < 250 && g < 230 && b < 210) {
      mask[i] = 1;
    }
  }

  const visited = new Uint8Array(sw * sh);
  const regions: FaceBox[] = [];

  for (let y = 0; y < sh; y++) {
    for (let x = 0; x < sw; x++) {
      const idx = y * sw + x;
      if (mask[idx] && !visited[idx]) {
        let minX = x, maxX = x, minY = y, maxY = y, count = 0;
        const queue: number[] = [idx];
        visited[idx] = 1;
        while (queue.length > 0) {
          const ci = queue.pop()!;
          const cx = ci % sw, cy = Math.floor(ci / sw);
          minX = Math.min(minX, cx); maxX = Math.max(maxX, cx);
          minY = Math.min(minY, cy); maxY = Math.max(maxY, cy);
          count++;
          for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
            const nx = cx + dx, ny = cy + dy;
            if (nx >= 0 && nx < sw && ny >= 0 && ny < sh) {
              const ni = ny * sw + nx;
              if (mask[ni] && !visited[ni]) { visited[ni] = 1; queue.push(ni); }
            }
          }
        }
        const regionW = maxX - minX, regionH = maxY - minY;
        const aspect = regionW / (regionH || 1);
        const minFaceArea = (sw * sh) * 0.005;
        if (count > minFaceArea && aspect > 0.4 && aspect < 2.5 && regionW > 15 && regionH > 15) {
          const pad = Math.round(Math.max(regionW, regionH) * 0.3);
          regions.push({
            x: Math.max(0, Math.round((minX - pad) / scale)),
            y: Math.max(0, Math.round((minY - pad) / scale)),
            width: Math.min(w, Math.round((regionW + pad * 2) / scale)),
            height: Math.min(h, Math.round((regionH + pad * 2) / scale)),
          });
        }
      }
    }
  }
  return mergeBoxes(regions).slice(0, 5);
}

function mergeBoxes(boxes: FaceBox[]): FaceBox[] {
  if (boxes.length <= 1) return boxes;
  const merged: FaceBox[] = [];
  const used = new Set<number>();
  for (let i = 0; i < boxes.length; i++) {
    if (used.has(i)) continue;
    let box = { ...boxes[i] };
    used.add(i);
    for (let j = i + 1; j < boxes.length; j++) {
      if (used.has(j)) continue;
      const b = boxes[j];
      const overlapX = Math.max(0, Math.min(box.x + box.width, b.x + b.width) - Math.max(box.x, b.x));
      const overlapY = Math.max(0, Math.min(box.y + box.height, b.y + b.height) - Math.max(box.y, b.y));
      if (overlapX > 0 && overlapY > 0) {
        const nx = Math.min(box.x, b.x), ny = Math.min(box.y, b.y);
        box = { x: nx, y: ny, width: Math.max(box.x + box.width, b.x + b.width) - nx, height: Math.max(box.y + box.height, b.y + b.height) - ny };
        used.add(j);
      }
    }
    merged.push(box);
  }
  return merged;
}

// ── The Hook ───────────────────────────────────────────────────────────────
export function useGFPGANEnhancer() {
  const [state, setState] = useState<GFPGANState>({
    modelStatus: 'idle',
    downloadProgress: 0,
    backend: 'cpu',
    isProcessing: false,
    processingProgress: 0,
    statusMessage: '',
    gpuAccelerated: false,
    step: 'idle',
    facesDetected: 0,
  });

  const gfpganSessionRef = useRef<any>(null);
  const backendRef = useRef<AccelerationBackend>('cpu');
  const ortRef = useRef<any>(null);

  const patch = useCallback(
    (p: Partial<GFPGANState>) => setState((s) => ({ ...s, ...p })),
    [],
  );

  useEffect(() => {
    detectBackend().then((b) => {
      backendRef.current = b;
      patch({
        backend: b,
        gpuAccelerated: b === 'webgpu' || b === 'webgl',
        statusMessage: b === 'canvas-only' ? 'Device too weak for AI' : `Acceleration: ${b.toUpperCase()}`,
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

  const initGfpganModel = useCallback(async () => {
    if (gfpganSessionRef.current) {
      patch({ modelStatus: 'ready', statusMessage: 'GFPGAN model ready' });
      return true;
    }
    if (backendRef.current === 'canvas-only') {
      patch({ modelStatus: 'unsupported', statusMessage: 'Not supported on this device' });
      return false;
    }
    try {
      const ort = await getOrt();
      patch({ modelStatus: 'checking-cache', statusMessage: 'Checking GFPGAN cache…' });
      let modelData = await getCachedModel(GFPGAN_CACHE_KEY);
      if (!modelData) {
        patch({ modelStatus: 'downloading', downloadProgress: 0, statusMessage: 'Downloading GFPGAN model…' });
        modelData = await downloadModelFromURL(GFPGAN_MODEL_URL, (pct) =>
          patch({ downloadProgress: pct, statusMessage: `Downloading GFPGAN… ${pct}%` }),
        );
        await cacheModel(modelData, GFPGAN_CACHE_KEY);
      }
      patch({ modelStatus: 'loading', statusMessage: 'Loading GFPGAN model…' });
      const session = await ort.InferenceSession.create(modelData, {
        executionProviders: getProviders(),
      });
      gfpganSessionRef.current = session;
      patch({ modelStatus: 'ready', statusMessage: 'GFPGAN model ready' });
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('GFPGAN init error:', msg, err);
      patch({ modelStatus: 'error', statusMessage: `GFPGAN failed: ${msg}` });
      return false;
    }
  }, [patch, getOrt, getProviders]);

  const inferGfpganFace = useCallback(
    async (faceCanvas: HTMLCanvasElement, ort: any): Promise<HTMLCanvasElement> => {
      const session = gfpganSessionRef.current!;
      const size = GFPGAN_INPUT_SIZE;
      const inputCanvas = document.createElement('canvas');
      inputCanvas.width = size;
      inputCanvas.height = size;
      const inCtx = inputCanvas.getContext('2d')!;
      inCtx.drawImage(faceCanvas, 0, 0, size, size);
      const imgData = inCtx.getImageData(0, 0, size, size);

      const input = new Float32Array(3 * size * size);
      for (let i = 0; i < size * size; i++) {
        input[i] = (imgData.data[i * 4] / 255.0 - 0.5) / 0.5;
        input[size * size + i] = (imgData.data[i * 4 + 1] / 255.0 - 0.5) / 0.5;
        input[2 * size * size + i] = (imgData.data[i * 4 + 2] / 255.0 - 0.5) / 0.5;
      }

      const tensor = new ort.Tensor('float32', input, [1, 3, size, size]);
      const results = await session.run({ [session.inputNames[0]]: tensor });
      const outputData = results[session.outputNames[0]].data as Float32Array;

      const outCanvas = document.createElement('canvas');
      outCanvas.width = size;
      outCanvas.height = size;
      const outCtx = outCanvas.getContext('2d')!;
      const outImgData = outCtx.createImageData(size, size);
      for (let i = 0; i < size * size; i++) {
        outImgData.data[i * 4] = Math.min(255, Math.max(0, Math.round((outputData[i] * 0.5 + 0.5) * 255)));
        outImgData.data[i * 4 + 1] = Math.min(255, Math.max(0, Math.round((outputData[size * size + i] * 0.5 + 0.5) * 255)));
        outImgData.data[i * 4 + 2] = Math.min(255, Math.max(0, Math.round((outputData[2 * size * size + i] * 0.5 + 0.5) * 255)));
        outImgData.data[i * 4 + 3] = 255;
      }
      outCtx.putImageData(outImgData, 0, 0);
      return outCanvas;
    },
    [],
  );

  const enhance = useCallback(
    async (imgSrc: string): Promise<string | null> => {
      patch({ isProcessing: true, processingProgress: 0, step: 'idle', facesDetected: 0 });
      try {
        const ort = await getOrt();
        const img = await loadImage(imgSrc);

        if (img.naturalWidth > MAX_FACE_ENHANCE_RESOLUTION || img.naturalHeight > MAX_FACE_ENHANCE_RESOLUTION) {
          patch({ step: 'error', statusMessage: 'Image too large for face enhancement (max 4096px)' });
          return null;
        }

        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0);

        // Detect faces
        patch({ step: 'detecting-faces', statusMessage: 'Detecting faces…', processingProgress: 10 });
        const faces = await detectFaces(canvas);

        if (faces.length === 0) {
          patch({ step: 'no-faces', facesDetected: 0, statusMessage: 'No faces detected in image' });
          return null;
        }

        patch({ facesDetected: faces.length, statusMessage: `Found ${faces.length} face(s)`, processingProgress: 20 });

        // Load GFPGAN
        const ready = await initGfpganModel();
        if (!ready) return null;

        // Enhance each face
        patch({ step: 'enhancing-faces', statusMessage: `Enhancing ${faces.length} face(s)…`, processingProgress: 40 });

        for (let i = 0; i < faces.length; i++) {
          const face = faces[i];
          patch({ statusMessage: `Enhancing face ${i + 1}/${faces.length}…`, processingProgress: 40 + Math.round((i / faces.length) * 40) });

          const pad = Math.round(Math.max(face.width, face.height) * 0.15);
          const fx = Math.max(0, face.x - pad);
          const fy = Math.max(0, face.y - pad);
          const fw = Math.min(canvas.width - fx, face.width + pad * 2);
          const fh = Math.min(canvas.height - fy, face.height + pad * 2);

          const faceCrop = document.createElement('canvas');
          faceCrop.width = fw;
          faceCrop.height = fh;
          const faceCtx = faceCrop.getContext('2d')!;
          faceCtx.drawImage(canvas, fx, fy, fw, fh, 0, 0, fw, fh);

          try {
            const enhanced = await inferGfpganFace(faceCrop, ort);

            patch({ step: 'blending', statusMessage: `Blending face ${i + 1}/${faces.length}…` });

            const blendCanvas = document.createElement('canvas');
            blendCanvas.width = fw;
            blendCanvas.height = fh;
            const blendCtx = blendCanvas.getContext('2d')!;
            blendCtx.drawImage(enhanced, 0, 0, fw, fh);

            const feather = Math.min(fw, fh) * 0.15;
            ctx.save();
            ctx.beginPath();
            const rx = fw / 2 - feather;
            const ry = fh / 2 - feather;
            ctx.ellipse(fx + fw / 2, fy + fh / 2, rx, ry, 0, 0, Math.PI * 2);
            ctx.clip();
            ctx.drawImage(blendCanvas, fx, fy, fw, fh);
            ctx.restore();
          } catch (err) {
            console.warn(`Face ${i + 1} enhancement failed:`, err);
          }
        }

        patch({ step: 'complete', statusMessage: `Enhanced ${faces.length} face(s) successfully`, processingProgress: 100 });
        return canvas.toDataURL('image/png');
      } catch (err) {
        console.error('Face enhance error:', err);
        patch({ step: 'error', statusMessage: 'Error during face enhancement' });
        return null;
      } finally {
        patch({ isProcessing: false });
      }
    },
    [patch, getOrt, initGfpganModel, inferGfpganFace],
  );

  const preloadModel = useCallback(async () => {
    await initGfpganModel();
  }, [initGfpganModel]);

  return { ...state, enhance, preloadModel };
}
