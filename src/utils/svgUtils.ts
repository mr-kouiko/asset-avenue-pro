/**
 * SVG helpers: safe sanitization + dimension detection (viewBox-aware).
 *
 * Bugs addressed:
 *  - Raw SVG upload is a stored-XSS risk (<script>, on* handlers, foreignObject).
 *  - Reading width/height attributes yields tiny/wrong dimensions when a
 *    viewBox is present; we must read the viewBox first.
 */

import DOMPurify from 'dompurify';

export const MAX_SVG_BYTES = 10 * 1024 * 1024; // 10 MB safety cap
const PARSE_TIMEOUT_MS = 4000;

export interface SvgDimensions {
  width: number;
  height: number;
}

/** Sanitize an SVG string, stripping scripts, foreignObject and event handlers. */
export function sanitizeSvgString(raw: string): string {
  // First pass: DOMPurify with SVG profile.
  let clean = DOMPurify.sanitize(raw, {
    USE_PROFILES: { svg: true, svgFilters: true },
    FORBID_TAGS: ['script', 'foreignObject'],
    FORBID_ATTR: ['onload', 'onerror', 'onclick', 'onmouseover', 'onfocus', 'onblur'],
  }) as unknown as string;

  // Defensive: explicit <script> / event-handler stripping.
  clean = clean
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<foreignObject[\s\S]*?<\/foreignObject>/gi, '')
    .replace(/\son[a-z]+\s*=\s*"[^"]*"/gi, '')
    .replace(/\son[a-z]+\s*=\s*'[^']*'/gi, '');

  // Strip external xlink:href / href (keep only fragment / data: refs)
  clean = clean.replace(/\s(xlink:href|href)\s*=\s*"(?!#|data:)[^"]*"/gi, '');
  clean = clean.replace(/\s(xlink:href|href)\s*=\s*'(?!#|data:)[^']*'/gi, '');

  return clean;
}

/** Read an SVG File → sanitized string (rejects oversized files). */
export async function readAndSanitizeSvg(file: File): Promise<string> {
  if (file.size > MAX_SVG_BYTES) {
    throw new Error(`SVG file too large (>${MAX_SVG_BYTES / 1024 / 1024} MB)`);
  }
  const text = await withTimeout(file.text(), PARSE_TIMEOUT_MS, 'SVG read timeout');
  return sanitizeSvgString(text);
}

/** Build a sanitized SVG File suitable for upload (same name, image/svg+xml). */
export async function buildSanitizedSvgFile(file: File): Promise<File> {
  const clean = await readAndSanitizeSvg(file);
  const blob = new Blob([clean], { type: 'image/svg+xml' });
  return new File([blob], file.name, { type: 'image/svg+xml', lastModified: file.lastModified });
}

/** Parse viewBox (or width/height fallback) from an SVG string. */
export function parseSvgDimensionsFromString(svg: string): SvgDimensions | null {
  try {
    const doc = new DOMParser().parseFromString(svg, 'image/svg+xml');
    const root = doc.documentElement;
    if (!root || root.nodeName.toLowerCase() !== 'svg') return null;

    const viewBox = root.getAttribute('viewBox');
    if (viewBox) {
      const parts = viewBox.trim().split(/[\s,]+/).map(parseFloat);
      if (parts.length === 4 && parts.every((n) => Number.isFinite(n))) {
        const w = parts[2];
        const h = parts[3];
        if (w > 0 && h > 0) return scaleUp(w, h);
      }
    }
    const wAttr = parseFloat(root.getAttribute('width') || '');
    const hAttr = parseFloat(root.getAttribute('height') || '');
    if (Number.isFinite(wAttr) && Number.isFinite(hAttr) && wAttr > 0 && hAttr > 0) {
      return scaleUp(wAttr, hAttr);
    }
    return null;
  } catch {
    return null;
  }
}

/** Fetch + parse dimensions from an SVG URL. */
export async function getSvgDimensions(url: string): Promise<SvgDimensions | null> {
  if (!url) return null;
  try {
    const res = await withTimeout(fetch(url, { credentials: 'omit' }), PARSE_TIMEOUT_MS, 'SVG fetch timeout');
    if (!res.ok) return null;
    const text = await res.text();
    return parseSvgDimensionsFromString(text);
  } catch {
    return null;
  }
}

/** Ensure the working resolution is at least MIN_LONG_SIDE on the longest side. */
function scaleUp(w: number, h: number, minLong = 800): SvgDimensions {
  const longest = Math.max(w, h);
  if (longest >= minLong) return { width: Math.round(w), height: Math.round(h) };
  const factor = minLong / longest;
  return { width: Math.round(w * factor), height: Math.round(h * factor) };
}

function withTimeout<T>(p: Promise<T>, ms: number, msg: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(msg)), ms);
    p.then((v) => { clearTimeout(t); resolve(v); }, (e) => { clearTimeout(t); reject(e); });
  });
}
