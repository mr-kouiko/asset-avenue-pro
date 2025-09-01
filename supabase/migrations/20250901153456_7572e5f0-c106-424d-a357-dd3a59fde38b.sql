-- Add AI settings to platform_settings table
ALTER TABLE public.platform_settings 
ADD COLUMN ai_auto_generate_enabled boolean NOT NULL DEFAULT true,
ADD COLUMN ai_provider text NOT NULL DEFAULT 'deepseek',
ADD COLUMN ai_model text NOT NULL DEFAULT 'deepseek-chat';