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

export type FaceEnhanceStatus =
  | 'idle'
  | 'downloading-model'
  | 'loading-model'
  | 'model-ready'
  | 'detecting-faces'
  | 'enhancing-faces'
  | 'blending'
  | 'complete'
  | 'no-faces'
  | 'error'
  | 'skipped';

export interface AIUpscalerState {
  modelStatus: ModelStatus;
  downloadProgress: number;
  backend: AccelerationBackend;
  isProcessing: boolean;
  processingProgress: number;
  statusMessage: string;
  gpuAccelerated: boolean;
  faceEnhanceStatus: FaceEnhanceStatus;
  faceModelDownloadProgress: number;
  facesDetected: number;
}

// ── Constants ──────────────────────────────────────────────────────────────
const ESRGAN_MODEL_URL =
  'https://huggingface.co/nicjac/realesrgan-onnx/resolve/main/RealESRGAN_x4plus.onnx';
const GFPGAN_MODEL_URL =
  'https://huggingface.co/facefusion/onnxruntime/resolve/main/gfpgan_1.4.onnx';

const ESRGAN_CACHE_KEY = 'esrgan-model-v1';
const GFPGAN_CACHE_KEY = 'gfpgan-model-v1';
const DB_NAME = 'ai-upscaler-cache';
const DB_STORE = 'models';
const MAX_INPUT_PX = 2000;
const TILE_SIZE = 256;
const TILE_PADDING = 16;
const GFPGAN_INPUT_SIZE = 512; // GFPGAN expects 512×512 face crops
const MAX_FACE_ENHANCE_RESOLUTION = 4096; // skip face enhance above this

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

// ── Resize helper ──────────────────────────────────────────────────────────
function fitToMax(
  w: number,
  h: number,
  maxPx: number,
): { w: number; h: number; scaled: boolean } {
  if (w <= maxPx && h <= maxPx) return { w, h, scaled: false };
  const ratio = Math.min(maxPx / w, maxPx / h);
  return { w: Math.round(w * ratio), h: Math.round(h * ratio), scaled: true };
}

// ── Load image helper ──────────────────────────────────────────────────────
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
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

// ── Face detection ─────────────────────────────────────────────────────────
interface FaceBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

async function detectFaces(canvas: HTMLCanvasElement): Promise<FaceBox[]> {
  // Try browser-native FaceDetector (Chrome 70+)
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
    } catch {
      // FaceDetector failed, try fallback
    }
  }

  // Fallback: skin-tone heuristic face region detection
  return detectFacesFallback(canvas);
}

function detectFacesFallback(canvas: HTMLCanvasElement): FaceBox[] {
  const ctx = canvas.getContext('2d')!;
  const w = canvas.width;
  const h = canvas.height;

  // Work on a downscaled version for speed
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

  // Create skin-tone mask
  const mask = new Uint8Array(sw * sh);
  for (let i = 0; i < sw * sh; i++) {
    const r = data[i * 4];
    const g = data[i * 4 + 1];
    const b = data[i * 4 + 2];
    // Simple skin-tone detection in RGB space
    if (
      r > 95 && g > 40 && b > 20 &&
      r > g && r > b &&
      Math.abs(r - g) > 15 &&
      r - b > 15 &&
      r < 250 && g < 230 && b < 210
    ) {
      mask[i] = 1;
    }
  }

  // Find connected regions (simple flood-fill approach)
  const visited = new Uint8Array(sw * sh);
  const regions: FaceBox[] = [];

  for (let y = 0; y < sh; y++) {
    for (let x = 0; x < sw; x++) {
      const idx = y * sw + x;
      if (mask[idx] && !visited[idx]) {
        // BFS to find connected component
        let minX = x, maxX = x, minY = y, maxY = y;
        let count = 0;
        const queue: number[] = [idx];
        visited[idx] = 1;

        while (queue.length > 0) {
          const ci = queue.pop()!;
          const cx = ci % sw;
          const cy = Math.floor(ci / sw);
          minX = Math.min(minX, cx);
          maxX = Math.max(maxX, cx);
          minY = Math.min(minY, cy);
          maxY = Math.max(maxY, cy);
          count++;

          // Check 4 neighbors
          for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
            const nx = cx + dx;
            const ny = cy + dy;
            if (nx >= 0 && nx < sw && ny >= 0 && ny < sh) {
              const ni = ny * sw + nx;
              if (mask[ni] && !visited[ni]) {
                visited[ni] = 1;
                queue.push(ni);
              }
            }
          }
        }

        // Filter: must be large enough to be a face and roughly square-ish
        const regionW = maxX - minX;
        const regionH = maxY - minY;
        const aspect = regionW / (regionH || 1);
        const area = count;
        const minFaceArea = (sw * sh) * 0.005; // at least 0.5% of image

        if (area > minFaceArea && aspect > 0.4 && aspect < 2.5 && regionW > 15 && regionH > 15) {
          // Add padding and convert back to original coordinates
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

  // Merge overlapping boxes and limit to top 5
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
      // Check overlap
      const overlapX = Math.max(0, Math.min(box.x + box.width, b.x + b.width) - Math.max(box.x, b.x));
      const overlapY = Math.max(0, Math.min(box.y + box.height, b.y + b.height) - Math.max(box.y, b.y));
      if (overlapX > 0 && overlapY > 0) {
        const nx = Math.min(box.x, b.x);
        const ny = Math.min(box.y, b.y);
        box = {
          x: nx,
          y: ny,
          width: Math.max(box.x + box.width, b.x + b.width) - nx,
          height: Math.max(box.y + box.height, b.y + b.height) - ny,
        };
        used.add(j);
      }
    }
    merged.push(box);
  }

  return merged;
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
    faceEnhanceStatus: 'idle',
    faceModelDownloadProgress: 0,
    facesDetected: 0,
  });

  const esrganSessionRef = useRef<any>(null);
  const gfpganSessionRef = useRef<any>(null);
  const backendRef = useRef<AccelerationBackend>('cpu');
  const ortRef = useRef<any>(null);

  const patch = useCallback(
    (p: Partial<AIUpscalerState>) => setState((s) => ({ ...s, ...p })),
    [],
  );

  // Detect backend on mount
  useEffect(() => {
    detectBackend().then((b) => {
      backendRef.current = b;
      console.log("AI backend:", b);
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

  // ── Get ORT module ────────────────────────────────────────────────────
  const getOrt = useCallback(async () => {
    if (ortRef.current) return ortRef.current;
    const ort = await import('onnxruntime-web');
    ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@latest/dist/';
    ortRef.current = ort;
    return ort;
  }, []);

  // ── Get execution providers ────────────────────────────────────────────
  const getProviders = useCallback((): string[] => {
    const providers: string[] = [];
    if (backendRef.current === 'webgpu') providers.push('webgpu');
    if (backendRef.current === 'webgl') providers.push('webgl');
    providers.push('wasm');
    return providers;
  }, []);

  // ── Load ESRGAN model ─────────────────────────────────────────────────
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

      console.log("ESRGAN model loading...");
      patch({ modelStatus: 'loading', statusMessage: 'Loading ESRGAN model…' });
      const session = await ort.InferenceSession.create(modelData, {
        executionProviders: getProviders(),
      });

      esrganSessionRef.current = session;
      console.log("ESRGAN model loaded");
      patch({ modelStatus: 'ready', statusMessage: 'ESRGAN model ready' });
      return true;
    } catch (err) {
      console.error('ESRGAN init error:', err);
      patch({ modelStatus: 'error', statusMessage: 'ESRGAN model failed to load' });
      return false;
    }
  }, [patch, getOrt, getProviders]);

  // ── Load GFPGAN model ─────────────────────────────────────────────────
  const initGfpganModel = useCallback(async () => {
    if (gfpganSessionRef.current) {
      patch({ faceEnhanceStatus: 'model-ready' });
      return true;
    }
    if (backendRef.current === 'canvas-only') {
      patch({ faceEnhanceStatus: 'skipped', statusMessage: 'Face enhancement not supported on this device' });
      return false;
    }

    try {
      const ort = await getOrt();

      patch({ faceEnhanceStatus: 'downloading-model', faceModelDownloadProgress: 0, statusMessage: 'Checking GFPGAN cache…' });
      let modelData = await getCachedModel(GFPGAN_CACHE_KEY);

      if (!modelData) {
        patch({ statusMessage: 'Downloading GFPGAN model…' });
        modelData = await downloadModelFromURL(GFPGAN_MODEL_URL, (pct) =>
          patch({ faceModelDownloadProgress: pct, statusMessage: `Downloading GFPGAN… ${pct}%` }),
        );
        await cacheModel(modelData, GFPGAN_CACHE_KEY);
      }

      patch({ faceEnhanceStatus: 'loading-model', statusMessage: 'Loading GFPGAN model…' });
      const session = await ort.InferenceSession.create(modelData, {
        executionProviders: getProviders(),
      });

      gfpganSessionRef.current = session;
      patch({ faceEnhanceStatus: 'model-ready', statusMessage: 'GFPGAN model ready' });
      return true;
    } catch (err) {
      console.error('GFPGAN init error:', err);
      patch({ faceEnhanceStatus: 'error', statusMessage: 'GFPGAN model failed to load – skipping face enhancement' });
      return false;
    }
  }, [patch, getOrt, getProviders]);

  // ── ESRGAN inference on a single tile ──────────────────────────────────
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
      const inputName = session.inputNames[0];
      const results = await session.run({ [inputName]: tensor });
      const outputName = session.outputNames[0];
      return results[outputName].data as Float32Array;
    },
    [],
  );

  // ── GFPGAN inference on a face crop ────────────────────────────────────
  const inferGfpganFace = useCallback(
    async (faceCanvas: HTMLCanvasElement, ort: any): Promise<HTMLCanvasElement> => {
      const session = gfpganSessionRef.current!;
      const size = GFPGAN_INPUT_SIZE;

      // Resize face crop to 512×512
      const inputCanvas = document.createElement('canvas');
      inputCanvas.width = size;
      inputCanvas.height = size;
      const inCtx = inputCanvas.getContext('2d')!;
      inCtx.drawImage(faceCanvas, 0, 0, size, size);
      const imgData = inCtx.getImageData(0, 0, size, size);

      // Build CHW tensor normalised to [-1, 1]
      const input = new Float32Array(3 * size * size);
      for (let i = 0; i < size * size; i++) {
        input[i] = (imgData.data[i * 4] / 255.0 - 0.5) / 0.5;
        input[size * size + i] = (imgData.data[i * 4 + 1] / 255.0 - 0.5) / 0.5;
        input[2 * size * size + i] = (imgData.data[i * 4 + 2] / 255.0 - 0.5) / 0.5;
      }

      const tensor = new ort.Tensor('float32', input, [1, 3, size, size]);
      const inputName = session.inputNames[0];
      const results = await session.run({ [inputName]: tensor });
      const outputName = session.outputNames[0];
      const outputData = results[outputName].data as Float32Array;

      // Convert back to canvas
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

  // ── Face enhancement pipeline ─────────────────────────────────────────
  const enhanceFaces = useCallback(
    async (canvasDataUrl: string): Promise<string> => {
      const ort = await getOrt();
      const img = await loadImage(canvasDataUrl);

      // Safety check: skip if image is too large
      if (img.naturalWidth > MAX_FACE_ENHANCE_RESOLUTION || img.naturalHeight > MAX_FACE_ENHANCE_RESOLUTION) {
        patch({ faceEnhanceStatus: 'skipped', statusMessage: 'Image too large for face enhancement — skipped' });
        return canvasDataUrl;
      }

      // Create canvas from image
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);

      // Detect faces
      patch({ faceEnhanceStatus: 'detecting-faces', statusMessage: 'Detecting faces…' });
      const faces = await detectFaces(canvas);

      if (faces.length === 0) {
        patch({ faceEnhanceStatus: 'no-faces', facesDetected: 0, statusMessage: 'No faces detected — skipping enhancement' });
        return canvasDataUrl;
      }

      patch({ facesDetected: faces.length, statusMessage: `Found ${faces.length} face(s)` });

      // Load GFPGAN model
      const gfpganReady = await initGfpganModel();
      if (!gfpganReady) return canvasDataUrl;

      // Enhance each face
      patch({ faceEnhanceStatus: 'enhancing-faces', statusMessage: `Enhancing ${faces.length} face(s)…` });

      for (let i = 0; i < faces.length; i++) {
        const face = faces[i];
        patch({ statusMessage: `Enhancing face ${i + 1}/${faces.length}…` });

        // Extract face region with padding
        const pad = Math.round(Math.max(face.width, face.height) * 0.15);
        const fx = Math.max(0, face.x - pad);
        const fy = Math.max(0, face.y - pad);
        const fw = Math.min(canvas.width - fx, face.width + pad * 2);
        const fh = Math.min(canvas.height - fy, face.height + pad * 2);

        // Create face crop canvas
        const faceCrop = document.createElement('canvas');
        faceCrop.width = fw;
        faceCrop.height = fh;
        const faceCtx = faceCrop.getContext('2d')!;
        faceCtx.drawImage(canvas, fx, fy, fw, fh, 0, 0, fw, fh);

        try {
          // Run GFPGAN on the face crop
          const enhanced = await inferGfpganFace(faceCrop, ort);

          // Blend enhanced face back
          patch({ faceEnhanceStatus: 'blending', statusMessage: `Blending face ${i + 1}/${faces.length}…` });

          // Create a feathered mask for smooth blending
          const blendCanvas = document.createElement('canvas');
          blendCanvas.width = fw;
          blendCanvas.height = fh;
          const blendCtx = blendCanvas.getContext('2d')!;

          // Scale enhanced (512×512) back to original face crop size
          blendCtx.drawImage(enhanced, 0, 0, fw, fh);

          // Apply with globalAlpha for smooth blending at edges
          // Center region: full strength; edges: feathered
          const feather = Math.min(fw, fh) * 0.15;
          const gradient = ctx.createRadialGradient(
            fx + fw / 2, fy + fh / 2, Math.min(fw, fh) * 0.2,
            fx + fw / 2, fy + fh / 2, Math.min(fw, fh) * 0.5,
          );
          gradient.addColorStop(0, 'rgba(255,255,255,1)');
          gradient.addColorStop(1, 'rgba(255,255,255,0)');

          // Draw enhanced face with clipping for smooth edges
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

      patch({ faceEnhanceStatus: 'complete', statusMessage: `Enhanced ${faces.length} face(s) successfully` });
      return canvas.toDataURL('image/png');
    },
    [patch, getOrt, initGfpganModel, inferGfpganFace],
  );

  // ── ESRGAN tiled upscale ──────────────────────────────────────────────
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

      console.log("Running ESRGAN inference...");
      for (let ty = 0; ty < tilesY; ty++) {
        for (let tx = 0; tx < tilesX; tx++) {
          const sx = tx * TILE_SIZE;
          const sy = ty * TILE_SIZE;
          const sw = Math.min(TILE_SIZE + TILE_PADDING, fit.w - sx);
          const sh = Math.min(TILE_SIZE + TILE_PADDING, fit.h - sy);

          const tileData = srcCtx.getImageData(sx, sy, sw, sh);
          const outputData = await inferEsrganTile(tileData, ort);

          const ow = sw * outScale;
          const oh = sh * outScale;

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
            statusMessage: `AI upscaling tile ${processed}/${totalTiles}…`,
          });
        }
      }
      console.log("ESRGAN inference finished");

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

  // ── Main upscale entry point ──────────────────────────────────────────
  const upscale = useCallback(
    async (
      imgSrc: string,
      scale: number,
      mode: UpscaleMode,
      sharpness: number,
      faceEnhance: boolean = false,
    ): Promise<string | null> => {
      patch({ isProcessing: true, processingProgress: 0, faceEnhanceStatus: 'idle', facesDetected: 0 });

      try {
        let result: string;

        if (mode === 'fast') {
          patch({ statusMessage: 'Fast upscaling…' });
          const img = await loadImage(imgSrc);
          result = canvasUpscale(img, scale, sharpness);
          patch({ statusMessage: 'Upscale complete!', processingProgress: 100 });
        } else {
          // AI mode – ESRGAN
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

        // Face enhancement step (if enabled)
        if (faceEnhance) {
          patch({ statusMessage: 'Starting face enhancement…' });
          result = await enhanceFaces(result!);
        }

        return result!;
      } catch (err) {
        console.error('Upscale error:', err);
        patch({ statusMessage: 'Error during processing' });
        return null;
      } finally {
        patch({ isProcessing: false });
      }
    },
    [initEsrganModel, aiUpscale, enhanceFaces, patch],
  );

  // ── Preload models ────────────────────────────────────────────────────
  const preloadModel = useCallback(async () => {
    await initEsrganModel();
  }, [initEsrganModel]);

  const preloadFaceModel = useCallback(async () => {
    await initGfpganModel();
  }, [initGfpganModel]);

  return { ...state, upscale, preloadModel, preloadFaceModel, initModel: initEsrganModel };
}
