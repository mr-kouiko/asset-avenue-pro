## Soft-gate Pexels downloads behind authentication

Force visitors to create a free account (or log in) before downloading any Pexels file from `/free-stock-library`. Browsing, previewing and search remain fully open (good for SEO). Only the **Download** action triggers the auth wall.

### User flow

```text
Visitor browses /free-stock-library  → OK, no login needed
Visitor clicks "Download" on a Pexels item:
   ├─ Logged in?  → download starts immediately + tracked in DB
   └─ Not logged → AuthModal opens with message
                   "Create a free account to download"
                   ↓
                   After signup/login → pending download auto-resumes
```

### Changes

**1. `src/pages/FreeStockLibrary.tsx`**
- Import `useAuth` and the existing `AuthModal` component.
- Add state: `showAuthModal`, `pendingDownload` (stores the photo/video the user wanted).
- Replace `handleDownloadPexelsPhoto` / `handleDownloadPexelsVideo`:
  - If `!user` → store the item in `pendingDownload`, open `AuthModal`.
  - If `user` → call new `triggerPexelsDownload()` which:
    1. Logs the download via Edge Function `track-pexels-download` (fire-and-forget).
    2. Opens the file URL (existing behaviour).
- `useEffect` on `user`: if `pendingDownload` exists and user just logged in, auto-resume the download and clear state.
- Add a subtle hint under the Download button when logged out: *"Free account required"*.

**2. New table `pexels_downloads`** (light tracking, real stats — no fake engagement)

| column | type | notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK auth.users | cascade delete |
| pexels_id | bigint | photo or video id |
| media_type | text | 'photo' or 'video' |
| author | text | Pexels photographer/creator name |
| downloaded_at | timestamptz | default now() |

- RLS: users can `INSERT` and `SELECT` their own rows only. Admins can `SELECT` all (via `has_role`).
- Index on `user_id, downloaded_at desc` for the future "my downloads" view.

**3. New Edge Function `track-pexels-download`** (verify_jwt = true)
- Validates the JWT, parses `{ pexelsId, mediaType, author }`, inserts into `pexels_downloads`.
- Returns 204 quickly so the actual file open is never delayed.
- Wrapped in try/catch — a logging failure must never block the download.

**4. `AuthModal` reuse**
- No code change needed. The existing modal already handles signup + Google OAuth. We just open it with the right title/subtitle if those props exist; otherwise we leave the default copy.

### Out of scope (for a follow-up if you want)

- Per-IP anonymous quota (option 3).
- "My downloads" page listing everything from `pexels_downloads` + internal `downloads`.
- Email drip campaign for new signups coming from this funnel.
- Conversion analytics dashboard (signups attributed to free library).

### Why this design

- **SEO preserved**: pages stay public, no login wall on browsing.
- **Real stats**: every Pexels download is tied to a real `user_id` — fits the "no fake engagement stats" rule.
- **Zero PayPal involvement**: it's free, no order needed.
- **Resumable flow**: the user doesn't lose the file they wanted after signing up — big UX win for conversion.
- **Failure-tolerant**: tracking is best-effort; a DB hiccup never blocks the download.
