/**
 * Helpers to detect intrinsic pixel dimensions of an image or video
 * from a public URL, so we can persist them and drive orientation filters
 * by aspect ratio rather than tags.
 *
 * All functions resolve to `null` on any failure (CORS, decode error, timeout).
 * Callers must treat dimensions as best-effort.
 */

export interface MediaDimensions {
  width: number;
  height: number;
}

export { getSvgDimensions } from './svgUtils';

const TIMEOUT_MS = 8000;

export async function getImageDimensions(url: string): Promise<MediaDimensions | null> {
  if (!url) return null;
  return new Promise((resolve) => {
    const img = new Image();
    let done = false;
    const finish = (val: MediaDimensions | null) => {
      if (done) return;
      done = true;
      resolve(val);
    };
    const timer = setTimeout(() => finish(null), TIMEOUT_MS);
    img.onload = () => {
      clearTimeout(timer);
      const w = img.naturalWidth || img.width;
      const h = img.naturalHeight || img.height;
      finish(w > 0 && h > 0 ? { width: w, height: h } : null);
    };
    img.onerror = () => {
      clearTimeout(timer);
      finish(null);
    };
    img.crossOrigin = 'anonymous';
    img.src = url;
  });
}

export async function getVideoDimensions(url: string): Promise<MediaDimensions | null> {
  if (!url) return null;
  return new Promise((resolve) => {
    const video = document.createElement('video');
    let done = false;
    const finish = (val: MediaDimensions | null) => {
      if (done) return;
      done = true;
      try { video.src = ''; } catch { /* noop */ }
      resolve(val);
    };
    const timer = setTimeout(() => finish(null), TIMEOUT_MS);
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;
    video.crossOrigin = 'anonymous';
    video.onloadedmetadata = () => {
      clearTimeout(timer);
      const w = video.videoWidth;
      const h = video.videoHeight;
      finish(w > 0 && h > 0 ? { width: w, height: h } : null);
    };
    video.onerror = () => {
      clearTimeout(timer);
      finish(null);
    };
    video.src = url;
  });
}
