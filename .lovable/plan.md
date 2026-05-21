## Root cause

The Render FFmpeg encoder produces single-frame 0.03s 3840×2160 MP4s because the scale/fps filter chain in `docker/ffmpeg-api/server.js` is malformed and the validator that should catch it is bypassed.

### Bug 1 — broken fps filter expression (primary cause of 1-frame output)

In `server.js` line 356:

```js
const scaleExpr = `scale=-2:'min(${resolution},ih)':flags=lanczos,fps=fps='min(${MAX_FPS},source_fps)'`;
```

`source_fps` is **not a valid variable** inside the `fps` filter expression evaluator. The expression evaluates to `0` (or NaN), so `fps=0` is passed to libx264. With `-vsync` unset and CFR encoding at 0 fps, ffmpeg writes exactly one frame, then `-t 60` immediately satisfies, producing a ~0.03s file. Because `scale=-2:'min(720,ih)'` is chained *after* an invalid filter, ffmpeg in some libavfilter versions silently drops it for the source raw frame too — hence the 3840×2160 output we see (no scaling applied to the single frame that does make it through, codec just wraps the raw avframe → `wrapped_avframe` behavior in ffprobe).

### Bug 2 — validator never fires for the broken case

`validateOutput()` at line 115 checks `dur < 2` → rejects. **But it never runs in production** because:

- `MAX_RETRIES = 1` (line 287), and the loop runs `for (attempt = 0; attempt < MAX_RETRIES; …)`. So validation runs exactly once.
- When validation fails, `throw new Error(...)` → 500 → the edge function should reject. ✅ This part works in isolation.
- However, observed corrupted previews are **still being uploaded**. This means either (a) the broken output is large enough OR `dur ≥ 2` per ffprobe metadata (single wrapped frame can report container duration = 60s from `-t 60` even though only 1 frame exists), bypassing the duration gate; or (b) the call path that produced them was the **older `batch-backfill-previews` path** whose only check is `videoBytes.length < 200 * 1024` and a header-based `x-preview-duration < 2` — both trivially passable for a 4K wrapped frame.

In fact a single 4K H.264 keyframe routinely sits 80–250 KB, which is exactly the observed size range. The 200 KB threshold misses about half of them. There is **no frame-count check**, **no resolution check**, **no codec_name check** in either pipeline.

### Bug 3 — no observability wiring on success path

`preview_status/preview_attempts/preview_failure_reason/preview_last_error` are NULL across all 810 rows because:

- `generate-video-preview` only writes `preview_status: 'preview_available'` on success (line 215) and never touches `preview_attempts`, `preview_failure_reason`, `preview_last_error`, or `preview_last_attempt_at` on failure paths.
- `batch-backfill-previews` does persist these on failure, but never increments or resets them on success or before an attempt starts.

---

## Fixes

### A. Fix the encoder (`docker/ffmpeg-api/server.js`)

1. Replace the broken filter chain with a sane explicit one:
   ```js
   const targetH = `min(${resolution}\\,ih)`;
   const scaleExpr = `scale=-2:'${targetH}':flags=lanczos`;
   // separate fps filter using a valid form:
   const fpsExpr = `fps=fps='min(${MAX_FPS},${MAX_FPS})'`; // capped CFR; or just `fps=${MAX_FPS}`
   ```
   Use `fps=30` (or detect probed input fps via `ffprobe -show_streams r_frame_rate` and pass `Math.min(30, sourceFps)` from JS). `source_fps` as an expression variable does not exist.

2. Add explicit `-vsync cfr` and `-r 30` output flags as a belt-and-braces against pathological filter graphs:
   ```
   '-r', '30', '-vsync', 'cfr'
   ```

3. Add explicit output stream mapping so filter_complex output is unambiguous: label the chain end `[vout]` and add `-map "[vout]"`.

### B. Harden `validateOutput()` (same file)

Add these rejection rules before returning `ok:true`:

- `codec_name !== 'h264'` → reject (`wrong_codec`)
- `nb_read_frames < fps * minDurationSec` via `ffprobe -count_frames -select_streams v:0 -show_entries stream=nb_read_frames` → reject if `< 30` (`single_frame_output`)
- `width > 2 * resolution` or `height > resolution + 8` → reject (`scaling_failed`)
- `format.tags.encoder` containing `wrapped_avframe` OR `vstream.codec_name === 'wrapped_avframe'` → reject (`wrapped_avframe_output`)
- bump min size floor `20 KB → 250 KB` for full-length 720p
- existing duration `< 3` (raise from 2)

Return the rejection reason in `attemptLogs` and bubble it via the 500 response body.

### C. Mirror the validation in `generate-video-preview` edge function

Even though Render now validates, the edge function must double-check before upload (defense in depth):

- After `previewBytes = …`, run a lightweight magic-byte check (MP4 `ftyp` box present, `moov` atom present, file > 250 KB).
- Read the `X-Preview-Frame-Count` / `X-Preview-Width` / `X-Preview-Height` headers we will add to Render's response and reject if `frameCount < 30` or `width > 2*resolution`.
- On rejection, do **not** upload, do **not** flip `preview_status` to `preview_available`. Instead update the row with the new failure fields (see D).

### D. Wire real observability into `generate-video-preview`

Wrap every `fail(...)` and the success path to persist on `content_files` when `contentFileId` is provided:

```ts
async function recordOutcome(contentFileId, outcome) {
  await supabase.from('content_files').update({
    preview_status: outcome.ok ? 'preview_available' : 'preview_failed',
    preview_failure_reason: outcome.reason ?? null,
    preview_last_error: outcome.message?.slice(0, 500) ?? null,
    preview_last_attempt_at: new Date().toISOString(),
    preview_attempts: supabase.rpc ? undefined : undefined, // use raw SQL below
  }).eq('id', contentFileId);
  // increment attempts atomically:
  await supabase.rpc('increment_preview_attempts', { _id: contentFileId });
}
```

Add a small SQL helper:
```sql
create or replace function public.increment_preview_attempts(_id uuid)
returns void language sql as $$
  update public.content_files
  set preview_attempts = coalesce(preview_attempts, 0) + 1
  where id = _id;
$$;
```

Call `recordOutcome` from every `fail()` exit and from the success path.

### E. Stop the DB trigger from auto-promoting bad rows

The existing trigger that flips `status='processing_preview' → 'approved'` when `preview_path` becomes non-null must additionally require `preview_status = 'preview_available'`. (Otherwise a successful storage upload of a corrupted file from the old pipeline can still promote the submission.) Migration:

```sql
-- pseudo: locate trigger function used by content_files preview promotion
-- modify guard:  IF NEW.preview_path IS NOT NULL AND NEW.preview_status = 'preview_available'
```

---

## Migration impact

- One new function `increment_preview_attempts(uuid)`.
- One trigger function update to require `preview_status = 'preview_available'`.
- No data changes — legacy 154 corrupt rows stay untouched until the recovery phase (out of scope per instructions).

## How future corrupt previews are prevented permanently

1. **Encoder cannot emit single-frame**: fixed fps filter + `-r 30 -vsync cfr` + valid filter labels means libx264 receives a real frame stream.
2. **Render-side validator** rejects with `frame_count`, `codec_name`, `wrapped_avframe`, `scaling_failed`, raised size/duration floors.
3. **Edge-function validator** re-checks frame count + dimensions via response headers before upload — Render compromise alone cannot pollute the bucket.
4. **DB trigger** refuses to flip `status='approved'` unless `preview_status='preview_available'`.
5. **Observability columns** are now written on every attempt; admin panel `AdminFailedPreviews` immediately surfaces regressions instead of NULL.

---

## Files changed

- `docker/ffmpeg-api/server.js` — filter chain fix, hardened `validateOutput`, new response headers (`X-Preview-Frame-Count`, `X-Preview-Width`, `X-Preview-Height`, `X-Preview-Codec`).
- `supabase/functions/generate-video-preview/index.ts` — header-based validation, `recordOutcome` helper, failure persistence.
- New migration: `increment_preview_attempts` RPC + trigger guard for `preview_status`.

No frontend, no marketplace, no fallback URL logic touched.