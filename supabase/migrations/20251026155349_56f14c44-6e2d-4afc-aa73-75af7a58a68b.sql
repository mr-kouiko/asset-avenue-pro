-- Create table for storing uploaded files (including drafts)
CREATE TABLE IF NOT EXISTS public.uploaded_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  preview_url TEXT,
  thumbnail_url TEXT,
  is_watermarked BOOLEAN DEFAULT false,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.uploaded_files ENABLE ROW LEVEL SECURITY;

-- Creators can view their own uploaded files
CREATE POLICY "Creators can view their own uploaded files"
ON public.uploaded_files
FOR SELECT
USING (
  auth.uid() = user_id 
  AND (has_role(auth.uid(), 'creator'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
);

-- Creators can insert their own uploaded files
CREATE POLICY "Creators can insert their own uploaded files"
ON public.uploaded_files
FOR INSERT
WITH CHECK (
  auth.uid() = user_id 
  AND (has_role(auth.uid(), 'creator'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
);

-- Creators can update their own uploaded files
CREATE POLICY "Creators can update their own uploaded files"
ON public.uploaded_files
FOR UPDATE
USING (
  auth.uid() = user_id 
  AND (has_role(auth.uid(), 'creator'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
);

-- Creators can delete their own uploaded files
CREATE POLICY "Creators can delete their own uploaded files"
ON public.uploaded_files
FOR DELETE
USING (
  auth.uid() = user_id 
  AND (has_role(auth.uid(), 'creator'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
);

-- Create trigger for updated_at
CREATE TRIGGER update_uploaded_files_updated_at
BEFORE UPDATE ON public.uploaded_files
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster queries
CREATE INDEX idx_uploaded_files_user_status ON public.uploaded_files(user_id, status);
CREATE INDEX idx_uploaded_files_created_at ON public.uploaded_files(created_at DESC);