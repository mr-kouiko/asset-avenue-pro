/**
 * URL serialization for video filters.
 * Keeps params short so they don't bloat the address bar.
 * Booleans: "1" / "0". Single strings as-is. Arrays comma-joined. Duration "min-max".
 */
import type { VideoFilters } from "@/components/VideoFiltersPanel";

export const DEFAULT_VIDEO_FILTERS: VideoFilters = {
  useCase: [], aiVideos: [], style: [], format: [], effects: [],
  orientation: null, resolution: null, aiGenerated: null, loopable: null,
  withPeople: null, copySpace: null, platform: [], duration: [0, 60],
};

const KEY = {
  useCase: "vf_uc",
  aiVideos: "vf_aiv",
  style: "vf_st",
  format: "vf_fmt",
  effects: "vf_eff",
  platform: "vf_pf",
  orientation: "vf_or",
  resolution: "vf_res",
  aiGenerated: "vf_ai",
  loopable: "vf_loop",
  withPeople: "vf_ppl",
  copySpace: "vf_cs",
  duration: "vf_dur",
} as const;

const arr = (v: string[]) => (v.length ? v.join(",") : null);
const bool = (v: boolean | null) => (v === null ? null : v ? "1" : "0");

export function videoFiltersToParams(f: VideoFilters): Record<string, string> {
  const out: Record<string, string> = {};
  const setIf = (k: string, v: string | null) => { if (v !== null) out[k] = v; };
  setIf(KEY.useCase, arr(f.useCase));
  setIf(KEY.aiVideos, arr(f.aiVideos));
  setIf(KEY.style, arr(f.style));
  setIf(KEY.format, arr(f.format));
  setIf(KEY.effects, arr(f.effects));
  setIf(KEY.platform, arr(f.platform));
  setIf(KEY.orientation, f.orientation);
  setIf(KEY.resolution, f.resolution);
  setIf(KEY.aiGenerated, bool(f.aiGenerated));
  setIf(KEY.loopable, bool(f.loopable));
  setIf(KEY.withPeople, bool(f.withPeople));
  setIf(KEY.copySpace, bool(f.copySpace));
  const [dmin, dmax] = f.duration;
  if (dmin > 0 || dmax < 60) out[KEY.duration] = `${dmin}-${dmax}`;
  return out;
}

const parseArr = (s: string | null) => (s ? s.split(",").filter(Boolean) : []);
const parseBool = (s: string | null): boolean | null =>
  s === "1" ? true : s === "0" ? false : null;

export function videoFiltersFromParams(sp: URLSearchParams): VideoFilters {
  const dur = sp.get(KEY.duration);
  let duration: [number, number] = [0, 60];
  if (dur) {
    const [a, b] = dur.split("-").map(n => parseInt(n, 10));
    if (Number.isFinite(a) && Number.isFinite(b)) duration = [a, b];
  }
  return {
    useCase: parseArr(sp.get(KEY.useCase)),
    aiVideos: parseArr(sp.get(KEY.aiVideos)),
    style: parseArr(sp.get(KEY.style)),
    format: parseArr(sp.get(KEY.format)),
    effects: parseArr(sp.get(KEY.effects)),
    platform: parseArr(sp.get(KEY.platform)),
    orientation: sp.get(KEY.orientation),
    resolution: sp.get(KEY.resolution),
    aiGenerated: parseBool(sp.get(KEY.aiGenerated)),
    loopable: parseBool(sp.get(KEY.loopable)),
    withPeople: parseBool(sp.get(KEY.withPeople)),
    copySpace: parseBool(sp.get(KEY.copySpace)),
    duration,
  };
}

export const VIDEO_FILTER_PARAM_KEYS = Object.values(KEY);
