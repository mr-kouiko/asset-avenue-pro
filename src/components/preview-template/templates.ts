export interface SafeArea {
  /** All values are fractions (0-1) of the template width/height. */
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  /** 'safe' = keep content inside; 'avoid' = area covered by UI/text. */
  kind: 'safe' | 'avoid';
}

export interface TemplatePreset {
  id: string;
  label: string;
  group: 'Social' | 'Video' | 'Web';
  width: number;
  height: number;
  /** Background behind the asset (device chrome frame color). */
  bg?: string;
  safeAreas?: SafeArea[];
}

export const TEMPLATE_PRESETS: TemplatePreset[] = [
  {
    id: 'ig-post',
    label: 'Instagram Post',
    group: 'Social',
    width: 1080,
    height: 1080,
  },
  {
    id: 'ig-story',
    label: 'Instagram Story',
    group: 'Social',
    width: 1080,
    height: 1920,
    safeAreas: [
      { x: 0, y: 0, w: 1, h: 250 / 1920, label: 'Profile / header', kind: 'avoid' },
      { x: 0, y: 1 - 350 / 1920, w: 1, h: 350 / 1920, label: 'Reply bar & CTA', kind: 'avoid' },
    ],
  },
  {
    id: 'fb-post',
    label: 'Facebook Post',
    group: 'Social',
    width: 1200,
    height: 630,
  },
  {
    id: 'li-post',
    label: 'LinkedIn Post',
    group: 'Social',
    width: 1200,
    height: 627,
  },
  {
    id: 'yt-thumb',
    label: 'YouTube Thumbnail',
    group: 'Video',
    width: 1280,
    height: 720,
    safeAreas: [
      { x: 1 - 130 / 1280, y: 1 - 60 / 720, w: 130 / 1280, h: 60 / 720, label: 'Duration badge', kind: 'avoid' },
    ],
  },
  {
    id: 'tiktok-cover',
    label: 'TikTok Cover',
    group: 'Social',
    width: 1080,
    height: 1920,
    safeAreas: [
      { x: 0, y: 1 - 500 / 1920, w: 1, h: 500 / 1920, label: 'Caption & actions', kind: 'avoid' },
      { x: 1 - 180 / 1080, y: 0.35, w: 180 / 1080, h: 0.5, label: 'Right action bar', kind: 'avoid' },
    ],
  },
  {
    id: 'pinterest-pin',
    label: 'Pinterest Pin',
    group: 'Social',
    width: 1000,
    height: 1500,
  },
  {
    id: 'x-post',
    label: 'X / Twitter Post',
    group: 'Social',
    width: 1600,
    height: 900,
  },
  {
    id: 'web-hero',
    label: 'Website Hero Banner',
    group: 'Web',
    width: 1920,
    height: 800,
    safeAreas: [
      { x: 0.05, y: 0.15, w: 0.5, h: 0.7, label: 'Headline area', kind: 'safe' },
    ],
  },
  {
    id: 'blog-featured',
    label: 'Blog Featured Image',
    group: 'Web',
    width: 1600,
    height: 900,
  },
];
