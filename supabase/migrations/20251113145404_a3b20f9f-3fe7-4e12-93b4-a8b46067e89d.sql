-- Create product_translations table for storing all translations
CREATE TABLE IF NOT EXISTS public.product_translations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.content_submissions(id) ON DELETE CASCADE,
  language text NOT NULL,
  title text,
  description text,
  tags jsonb DEFAULT '[]'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE (product_id, language)
);

-- Enable RLS
ALTER TABLE public.product_translations ENABLE ROW LEVEL SECURITY;

-- Everyone can read translations
CREATE POLICY "Everyone can view translations"
  ON public.product_translations
  FOR SELECT
  USING (true);

-- Service role can manage translations
CREATE POLICY "Service role can manage translations"
  ON public.product_translations
  FOR ALL
  USING (current_setting('role'::text) = 'service_role'::text)
  WITH CHECK (current_setting('role'::text) = 'service_role'::text);

-- Creators can insert/update translations for their products
CREATE POLICY "Creators can manage their product translations"
  ON public.product_translations
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.content_submissions cs
      WHERE cs.id = product_translations.product_id
      AND cs.creator_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.content_submissions cs
      WHERE cs.id = product_translations.product_id
      AND cs.creator_id = auth.uid()
    )
  );

-- Create index for faster lookups
CREATE INDEX idx_product_translations_lookup ON public.product_translations(product_id, language);

-- Trigger to update updated_at
CREATE TRIGGER update_product_translations_updated_at
  BEFORE UPDATE ON public.product_translations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();