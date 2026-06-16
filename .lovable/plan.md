# Why only one premium video appears under "All videos"

## Root cause (verified in DB)

I queried `content_submissions` for the video category. Out of ~28 video products:

- **1** video is `approved` AND has a watermarked MP4 preview (`preview_quality = 'preview_available'`)
  - `Couple watching a beautiful golden sunset over the mountains`
- **1** video is `approved` but has NO preview file (`76a3ac54… Active Young Woman Tracking Home Workout`)
- **~26** videos are stuck in `status = 'processing_preview'` (preview never generated)

The marketplace RPC `search_marketplace` (and the project's strict rule) requires every video to have a `preview_available` MP4 before being shown — there is intentionally NO fallback to the original file. So the filter is working correctly; the problem is upstream: previews were never produced for those uploads.

The one `approved`-without-preview row is a separate inconsistency — the DB trigger that forces video status to `processing_preview` until a preview exists didn't run on that legacy row.

## Fix plan

### 1. Backfill missing video previews (primary fix)
Run the existing server-side FFmpeg backfill so the ~26 stuck videos get their 720p watermarked MP4 preview generated. Once each preview lands, the existing DB trigger will auto-promote the submission to `approved` and it will appear in the marketplace.

- Use the admin panel at `AdminVideoBackfill` (component already exists) to enqueue all `processing_preview` videos, OR
- Trigger the Dockerized FFmpeg API endpoint described in `mem://architecture/video-preview-backfill-system` for every stuck submission id.

### 2. Re-sync the one orphan `approved` row
Submission `76a3ac54-5829-48bf-9fad-e6c2d8c80805` is `approved` but has no preview. Two options — pick one:
- (a) Demote it back to `processing_preview` and include it in the backfill run, then let the trigger promote it again when the preview is ready. (Recommended — keeps the "no preview = not visible" guarantee intact.)
- (b) Leave it hidden by the RPC (current behavior) until a preview is generated.

### 3. No code change to filtering
I will NOT relax the "video requires MP4 preview" rule — it's a Core project constraint and the right behavior. The dropdown is working; the catalog just needs its previews built.

## Deliverable for the user
A short message in chat confirming the backfill was triggered (or instructions to click the backfill button in the admin dashboard), plus the expected outcome: once previews finish generating, the "All videos" view will show all ~27 premium videos before the Pexels free layer.

## Technical notes
- Trigger handling status flips: see migration history around `processing_preview` → `approved`.
- Backfill infra: `docker/ffmpeg-api/` (server-side) and `src/components/admin/AdminVideoBackfill.tsx` (UI).
- No frontend or RPC edits are part of this plan.
