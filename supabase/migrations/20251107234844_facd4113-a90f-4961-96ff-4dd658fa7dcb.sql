-- Create ai_image_generations table for tracking AI image generation usage
CREATE TABLE IF NOT EXISTS public.ai_image_generations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  prompt TEXT NOT NULL,
  image_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.ai_image_generations ENABLE ROW LEVEL SECURITY;

-- Users can view their own generations
CREATE POLICY "Users can view their own AI image generations"
ON public.ai_image_generations
FOR SELECT
USING (auth.uid() = user_id);

-- Users can create their own generations
CREATE POLICY "Users can create their own AI image generations"
ON public.ai_image_generations
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Add index for faster queries
CREATE INDEX idx_ai_image_generations_user_id ON public.ai_image_generations(user_id);
CREATE INDEX idx_ai_image_generations_created_at ON public.ai_image_generations(created_at);