-- Create table to track AI image generations per user
CREATE TABLE IF NOT EXISTS public.ai_image_generations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  prompt text NOT NULL,
  image_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  
  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Enable RLS
ALTER TABLE public.ai_image_generations ENABLE ROW LEVEL SECURITY;

-- Users can view their own generations
CREATE POLICY "Users can view their own AI generations"
  ON public.ai_image_generations
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can insert their own generations
CREATE POLICY "Users can create their own AI generations"
  ON public.ai_image_generations
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_ai_generations_user_id ON public.ai_image_generations(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_generations_created_at ON public.ai_image_generations(created_at DESC);