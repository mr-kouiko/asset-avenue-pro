
# Private Uploads Bucket with Signed URL Pipeline — IMPLEMENTED

## What was done

### 1. Created `generate-signed-url` edge function
- Authenticated endpoint that validates file ownership (path must start with user's ID)
- Returns a 15-minute signed URL using service_role credentials
- Used by the upload hook to access private originals during preview generation

### 2. Updated `proxy-video` edge function
- Detects `content-uploads` bucket URLs and generates signed URLs server-side
- Uses service_role to access private files without exposing credentials to clients
- Maintains CORS proxy functionality for preview generation

### 3. Updated `useEnhancedUpload` hook
- After uploading to `content-uploads`, requests a signed URL via `generate-signed-url`
- Uploads watermarked previews to the **`previews`** bucket (public) instead of `content-uploads`
- Stores the public preview URL in `content_files.preview_path`

### 4. Updated `secure-download` edge function
- Default bucket changed from `original-files` to `content-uploads`
- Uses service_role signed URLs for purchased file access

## Manual steps required

### Create the `previews` bucket (PUBLIC)
Go to Supabase Dashboard → Storage → Create bucket named `previews`, set it as **public**.

### Make `content-uploads` bucket PRIVATE
Go to Supabase Dashboard → Storage → `content-uploads` → Settings → Disable public access.

### Migrate existing preview URLs
Existing `content_files.preview_path` entries pointing to `content-uploads` will break.
Run a migration to copy existing preview files to the `previews` bucket.
