
-- Add draft_id column to uploaded_files to link files to content_submissions drafts
ALTER TABLE public.uploaded_files 
ADD COLUMN IF NOT EXISTS draft_id uuid REFERENCES public.content_submissions(id) ON DELETE CASCADE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_uploaded_files_draft_id ON public.uploaded_files(draft_id);

-- Create index for user + status queries
CREATE INDEX IF NOT EXISTS idx_uploaded_files_user_status ON public.uploaded_files(user_id, status);
