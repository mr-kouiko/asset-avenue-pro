## Goal

Permanently remove the 253 video products whose preview file is a legacy client-generated MediaRecorder output (the ones that show `0:00` in the player). None of them have any sales, so deletion is safe.

## Scope (verified via DB query)

- 253 `content_files` rows where `file_type` is a video AND `preview_path` does NOT match the canonical server pattern `/previews/<submission_uuid>/<file_uuid>_preview.mp4`.
- 0 of them are tied to any transaction — safe to hard-delete.
- All corresponding `content_submissions` rows will be deleted too (1 submission per file).

## What gets deleted

For each of the 253 affected submissions:

1. `content_files` rows (original + any derivative rows for that submission)
2. `content_submissions` row
3. `product_translations` rows (FK to submission)
4. `content_likes`, `user_favorites`, `reviews`, `content_reports` rows pointing to the submission
5. `detection_results` rows for the submission
6. `seller_earnings` — none exist (no sales), so nothing to remove
7. Storage files in the `previews` / `uploads` buckets at the broken `preview_path` (best-effort cleanup; original `file_path` in `private-videos` left alone unless you want it gone too)

## How it runs

A new admin-only edge function `purge-broken-video-products`:

- Re-runs the same detection query (canonical regex) to build the kill list.
- Refuses to delete any submission that has a row in `transactions` (defense-in-depth, even though current count is 0).
- Deletes child rows first, then the submission, inside a single transactional RPC for safety.
- Returns `{ scanned, deletedSubmissions, deletedFiles, skippedWithSales, storageDeleted }`.
- Supports `dryRun: true` so you can preview the exact list before pulling the trigger.

A new section in `AdminVideoBackfill.tsx` ("Step 0 — Purge broken video products") with:

- "Preview list" button (dry run) → shows count and sample titles
- "Delete permanently" button (with a confirm dialog typing `DELETE`)

## Technical notes

- New SQL function `public.delete_submission_cascade(submission_id uuid)` — SECURITY DEFINER, admin-only, deletes child rows in correct FK order and the submission itself.
- Edge function loops with batches of 25, calls the RPC, also issues `supabase.storage.from('previews').remove([...])` / `uploads` for each broken `preview_path`.
- No change to backfill or watermark logic.
- Sitemaps / SEO: deleted submissions will naturally drop out of the next sitemap rebuild; nothing else to do.

## Out of scope

- Original video files in the `private-videos` bucket. Tell me if you want those wiped too (they belong to the same sellers, so they can re-upload cleanly).
- The audit/backfill flow stays in place for the future — it just won't have anything to fix after the purge.

## Deliverable

After you approve and run it once with dry-run off, the 253 broken products are gone, marketplace no longer shows any `0:00` videos, and the legacy MediaRecorder paths are permanently retired.
