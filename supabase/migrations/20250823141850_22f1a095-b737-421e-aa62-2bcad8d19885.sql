-- Create uploads storage bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('uploads', 'uploads', true);

-- Create contents table to store file URLs and metadata
CREATE TABLE public.contents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category_id UUID REFERENCES public.categories(id),
  price NUMERIC(10,2) DEFAULT 0,
  tags TEXT[] DEFAULT '{}',
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  thumbnail_url TEXT,
  preview_url TEXT,
  is_watermarked BOOLEAN DEFAULT false,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on contents table
ALTER TABLE public.contents ENABLE ROW LEVEL SECURITY;

-- RLS policies for contents table
CREATE POLICY "Users can create their own content" 
ON public.contents 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own content" 
ON public.contents 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own content" 
ON public.contents 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own content" 
ON public.contents 
FOR DELETE 
USING (auth.uid() = user_id);

CREATE POLICY "Public can view published content" 
ON public.contents 
FOR SELECT 
USING (status = 'published');

-- Admins can view and manage all content
CREATE POLICY "Admins can manage all content" 
ON public.contents 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS policies for uploads bucket
CREATE POLICY "Users can upload their own files" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own files" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own files" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own files" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Public can view published files
CREATE POLICY "Public can view files in uploads bucket" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'uploads');

-- Update trigger for contents table
CREATE TRIGGER update_contents_updated_at
BEFORE UPDATE ON public.contents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();