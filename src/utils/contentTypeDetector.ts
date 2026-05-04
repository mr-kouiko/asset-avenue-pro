/**
 * Centralized product content type detection.
 *
 * Detects whether an uploaded file is one of:
 *   image | video | audio | ebook | vector | vfx | other
 *
 * Detection priority:
 *   1) File extension (most reliable for vector/vfx specific formats)
 *   2) MIME type
 *   3) Archive (.zip) inspection — peek at entry names to decide if it's a VFX pack
 *   4) Heuristics on file name
 *
 * If we cannot confidently classify, we return 'other' so the seller can
 * confirm manually.
 */

import { unzip } from 'fflate';

export type DetectedProductType =
  | 'image'
  | 'video'
  | 'audio'
  | 'ebook'
  | 'vector'
  | 'vfx'
  | 'other';

const EXT_IMAGE = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'tiff'];
const EXT_VIDEO = ['mp4', 'mov', 'avi', 'mkv', 'webm', 'm4v'];
const EXT_AUDIO = ['mp3', 'wav', 'aac', 'ogg', 'flac', 'm4a'];
const EXT_EBOOK = ['pdf', 'epub'];
const EXT_VECTOR = ['svg', 'ai', 'eps', 'cdr'];
// VFX-specific extensions that signal motion graphics / compositing assets
const EXT_VFX_DIRECT = [
  'aep',     // After Effects project
  'prproj',  // Premiere project
  'cube',    // LUT
  'mogrt',   // Motion Graphics Template
  'fcpxml',  // Final Cut
  'drp',     // DaVinci Resolve
];
const EXT_ARCHIVE = ['zip', 'rar', '7z'];

// Keywords (filename / zip entries) that strongly suggest a VFX product
const VFX_KEYWORDS = [
  'vfx', 'overlay', 'overlays', 'transition', 'transitions',
  'lut', 'luts', 'preset', 'presets', 'lower-third', 'lowerthird',
  'lightleak', 'light-leak', 'light leak', 'glitch', 'fire',
  'smoke', 'particle', 'explosion', 'spark', 'bokeh',
  'motion-graphic', 'motion graphic', 'mograph',
  'after-effects', 'after effects', 'premiere',
];

// Tag suggestions per type / keyword match
const TAG_HINTS: Record<string, string[]> = {
  cinematic: ['cinematic'],
  glitch: ['glitch', 'distortion'],
  fire: ['fire', 'flame'],
  smoke: ['smoke', 'fog'],
  light: ['light leak', 'cinematic'],
  transition: ['transition'],
  lut: ['lut', 'color grading'],
  overlay: ['overlay', 'compositing'],
  particle: ['particles', 'fx'],
  bokeh: ['bokeh', 'blur'],
  explosion: ['explosion', 'fx'],
  spark: ['sparks', 'fx'],
  alpha: ['alpha channel', 'transparent'],
  drone: ['drone', 'aerial'],
  slow: ['slow motion'],
};

export interface DetectionResult {
  type: DetectedProductType;
  confidence: 'high' | 'medium' | 'low';
  reason: string;
  tags: string[];
}

const getExt = (name: string): string => {
  const m = name.toLowerCase().match(/\.([a-z0-9]+)$/);
  return m ? m[1] : '';
};

const matchesAny = (haystack: string, needles: string[]): string | null => {
  const lower = haystack.toLowerCase();
  for (const n of needles) {
    if (lower.includes(n)) return n;
  }
  return null;
};

/**
 * Generate auto-tags based on file name + detected type.
 */
export const generateAutoTags = (
  fileName: string,
  type: DetectedProductType,
  extraSources: string[] = []
): string[] => {
  const tags = new Set<string>();
  const haystack = [fileName, ...extraSources].join(' ').toLowerCase();

  for (const [keyword, hints] of Object.entries(TAG_HINTS)) {
    if (haystack.includes(keyword)) hints.forEach(t => tags.add(t));
  }

  // Type-based defaults
  switch (type) {
    case 'vfx':
      tags.add('vfx');
      tags.add('motion graphics');
      break;
    case 'vector':
      tags.add('vector');
      tags.add('scalable');
      break;
    case 'ebook':
      tags.add('ebook');
      break;
  }

  return Array.from(tags).slice(0, 8);
};

/**
 * Inspect a zip file's central directory (entry names only) to decide
 * whether it represents a VFX pack.
 */
const inspectZip = (file: File): Promise<{ entries: string[] }> => {
  return new Promise((resolve) => {
    // Limit: only read first 25 MB of the zip for the directory scan.
    // The central directory is at the end, but most small/medium zips
    // are fully readable. For large zips fflate can still parse if we
    // pass the full buffer; cap to 200 MB to avoid OOM on huge archives.
    const MAX = 200 * 1024 * 1024;
    const slice = file.size > MAX ? file.slice(0, MAX) : file;
    slice.arrayBuffer().then((buf) => {
      try {
        unzip(new Uint8Array(buf), (err, unzipped) => {
          if (err || !unzipped) {
            resolve({ entries: [] });
            return;
          }
          resolve({ entries: Object.keys(unzipped) });
        });
      } catch {
        resolve({ entries: [] });
      }
    }).catch(() => resolve({ entries: [] }));
  });
};

/**
 * Main entry: classify a File.
 *
 * NOTE: Async because zip inspection is async. For non-archive files this
 * resolves synchronously (microtask).
 */
export const detectProductType = async (
  file: File
): Promise<DetectionResult> => {
  const ext = getExt(file.name);
  const mime = (file.type || '').toLowerCase();
  const name = file.name;

  // 1) Explicit extensions first (most reliable)
  if (EXT_VECTOR.includes(ext)) {
    return {
      type: 'vector',
      confidence: 'high',
      reason: `Vector format (.${ext})`,
      tags: generateAutoTags(name, 'vector'),
    };
  }
  if (EXT_VFX_DIRECT.includes(ext)) {
    return {
      type: 'vfx',
      confidence: 'high',
      reason: `VFX project / asset (.${ext})`,
      tags: generateAutoTags(name, 'vfx'),
    };
  }
  if (EXT_EBOOK.includes(ext) || mime === 'application/pdf' || mime === 'application/epub+zip') {
    return {
      type: 'ebook',
      confidence: 'high',
      reason: `Document (.${ext || mime})`,
      tags: generateAutoTags(name, 'ebook'),
    };
  }
  if (EXT_AUDIO.includes(ext) || mime.startsWith('audio/')) {
    return {
      type: 'audio',
      confidence: 'high',
      reason: 'Audio file',
      tags: generateAutoTags(name, 'audio'),
    };
  }
  if (EXT_VIDEO.includes(ext) || mime.startsWith('video/')) {
    // Filename hint for VFX-style video (overlay, transition, alpha…)
    const vfxHit = matchesAny(name, VFX_KEYWORDS);
    if (vfxHit) {
      return {
        type: 'vfx',
        confidence: 'medium',
        reason: `Video filename hints at VFX ("${vfxHit}")`,
        tags: generateAutoTags(name, 'vfx'),
      };
    }
    return {
      type: 'video',
      confidence: 'high',
      reason: 'Standard video',
      tags: generateAutoTags(name, 'video'),
    };
  }
  if (EXT_IMAGE.includes(ext) || mime.startsWith('image/')) {
    if (ext === 'svg') {
      return {
        type: 'vector',
        confidence: 'high',
        reason: 'SVG vector',
        tags: generateAutoTags(name, 'vector'),
      };
    }
    return {
      type: 'image',
      confidence: 'high',
      reason: 'Static image',
      tags: generateAutoTags(name, 'image'),
    };
  }

  // 2) Archive — peek inside
  const isZip =
    ext === 'zip' || mime === 'application/zip' || mime === 'application/x-zip-compressed';
  const isRar = ext === 'rar' || mime.includes('rar');

  if (isRar) {
    // We can't easily inspect rar in browser → assume VFX (existing convention).
    return {
      type: 'vfx',
      confidence: 'medium',
      reason: 'RAR archive (assumed VFX pack)',
      tags: generateAutoTags(name, 'vfx'),
    };
  }

  if (isZip) {
    const { entries } = await inspectZip(file);
    if (entries.length === 0) {
      return {
        type: 'other',
        confidence: 'low',
        reason: 'Could not inspect archive contents',
        tags: [],
      };
    }

    const exts = entries.map(getExt);
    const joined = entries.join(' ').toLowerCase();
    const hasVfxExt = exts.some((e) => EXT_VFX_DIRECT.includes(e));
    const vfxKeywordHit = matchesAny(joined, VFX_KEYWORDS) || matchesAny(name, VFX_KEYWORDS);
    const hasVideoEntries = exts.some((e) => EXT_VIDEO.includes(e));
    const hasImageEntries = exts.some((e) => EXT_IMAGE.includes(e));
    const hasVectorEntries = exts.some((e) => EXT_VECTOR.includes(e));
    const hasAudioEntries = exts.some((e) => EXT_AUDIO.includes(e));
    const hasEbookEntries = exts.some((e) => EXT_EBOOK.includes(e));

    if (hasVfxExt || (vfxKeywordHit && (hasVideoEntries || hasImageEntries))) {
      return {
        type: 'vfx',
        confidence: 'high',
        reason: hasVfxExt
          ? 'Archive contains VFX project files'
          : `Archive matches VFX pack ("${vfxKeywordHit}")`,
        tags: generateAutoTags(name, 'vfx', entries),
      };
    }
    if (hasVectorEntries && !hasVideoEntries && !hasAudioEntries) {
      return {
        type: 'vector',
        confidence: 'medium',
        reason: 'Archive of vector files',
        tags: generateAutoTags(name, 'vector', entries),
      };
    }
    if (hasEbookEntries && !hasVideoEntries && !hasAudioEntries) {
      return {
        type: 'ebook',
        confidence: 'medium',
        reason: 'Archive of documents',
        tags: generateAutoTags(name, 'ebook', entries),
      };
    }
    if (hasAudioEntries && !hasVideoEntries && !hasImageEntries) {
      return {
        type: 'audio',
        confidence: 'medium',
        reason: 'Archive of audio files',
        tags: generateAutoTags(name, 'audio', entries),
      };
    }
    if (hasImageEntries && !hasVideoEntries && !hasAudioEntries) {
      return {
        type: 'image',
        confidence: 'medium',
        reason: 'Archive of images',
        tags: generateAutoTags(name, 'image', entries),
      };
    }

    // Unclear archive — fall back to VFX if filename hints, else other
    if (vfxKeywordHit) {
      return {
        type: 'vfx',
        confidence: 'low',
        reason: `Archive name matches VFX ("${vfxKeywordHit}")`,
        tags: generateAutoTags(name, 'vfx', entries),
      };
    }
    return {
      type: 'other',
      confidence: 'low',
      reason: 'Mixed archive — manual confirmation required',
      tags: [],
    };
  }

  // 3) Unknown
  return {
    type: 'other',
    confidence: 'low',
    reason: 'Unknown file type',
    tags: [],
  };
};

/**
 * Map a DetectedProductType to the marketplace category name used in the
 * `categories` table (matched case-insensitively in callers).
 */
export const detectedTypeToCategoryName: Record<DetectedProductType, string | null> = {
  image: 'photo',
  video: 'video',
  audio: 'audio',
  ebook: 'ebook',
  vector: 'vector',
  vfx: 'visual effects',
  other: null,
};
