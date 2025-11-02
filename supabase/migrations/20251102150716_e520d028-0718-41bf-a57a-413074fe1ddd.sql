-- Create table for storing file upload metadata with R2 support
CREATE TABLE IF NOT EXISTS public.file_uploads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  file_type TEXT NOT NULL,
  storage_location TEXT NOT NULL CHECK (storage_location IN ('supabase', 'r2')),
  public_url TEXT NOT NULL,
  bucket_name TEXT,
  file_path TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.file_uploads ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own uploads
CREATE POLICY "Users can view their own file uploads" 
ON public.file_uploads 
FOR SELECT 
USING (auth.uid() = user_id);

-- Policy: Users can insert their own uploads
CREATE POLICY "Users can insert their own file uploads" 
ON public.file_uploads 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own uploads
CREATE POLICY "Users can update their own file uploads" 
ON public.file_uploads 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Policy: Users can delete their own uploads
CREATE POLICY "Users can delete their own file uploads" 
ON public.file_uploads 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_file_uploads_updated_at
BEFORE UPDATE ON public.file_uploads
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster queries
CREATE INDEX idx_file_uploads_user_id ON public.file_uploads(user_id);
CREATE INDEX idx_file_uploads_storage_location ON public.file_uploads(storage_location);
CREATE INDEX idx_file_uploads_created_at ON public.file_uploads(created_at DESC);