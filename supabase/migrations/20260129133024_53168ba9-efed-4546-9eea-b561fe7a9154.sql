-- Create watermark_exports table for tracking exported video previews
CREATE TABLE public.watermark_exports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    video_id UUID NOT NULL REFERENCES public.content_files(id) ON DELETE CASCADE,
    admin_id UUID NOT NULL,
    exported_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    platform TEXT NOT NULL DEFAULT 'bulk_export',
    format TEXT NOT NULL DEFAULT 'mp4',
    file_hash TEXT,
    export_batch_id UUID NOT NULL,
    file_name TEXT,
    file_size BIGINT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (video_id, export_batch_id)
);

-- Create index for faster lookups
CREATE INDEX idx_watermark_exports_video_id ON public.watermark_exports(video_id);
CREATE INDEX idx_watermark_exports_admin_id ON public.watermark_exports(admin_id);
CREATE INDEX idx_watermark_exports_batch_id ON public.watermark_exports(export_batch_id);
CREATE INDEX idx_watermark_exports_exported_at ON public.watermark_exports(exported_at DESC);

-- Enable RLS
ALTER TABLE public.watermark_exports ENABLE ROW LEVEL SECURITY;

-- Admin-only access policies
CREATE POLICY "Admin can view all exports"
ON public.watermark_exports
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin can insert exports"
ON public.watermark_exports
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin can delete exports"
ON public.watermark_exports
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Function to get unexported watermarked video previews
CREATE OR REPLACE FUNCTION public.get_unexported_watermarked_previews()
RETURNS TABLE (
    id UUID,
    submission_id UUID,
    file_name TEXT,
    preview_path TEXT,
    file_size BIGINT,
    created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Verify admin access
    IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
        RAISE EXCEPTION 'Access denied: Admin role required';
    END IF;
    
    RETURN QUERY
    SELECT 
        cf.id,
        cf.submission_id,
        cf.file_name,
        cf.preview_path,
        cf.file_size,
        cf.created_at
    FROM public.content_files cf
    WHERE cf.file_type LIKE 'video%'
    AND cf.preview_path IS NOT NULL
    AND cf.preview_path != ''
    AND (cf.metadata->>'isWatermarked')::boolean = true
    AND NOT EXISTS (
        SELECT 1 FROM public.watermark_exports we 
        WHERE we.video_id = cf.id
    )
    ORDER BY cf.created_at DESC;
END;
$$;

-- Function to log bulk export
CREATE OR REPLACE FUNCTION public.log_watermark_export(
    p_video_ids UUID[],
    p_batch_id UUID,
    p_platform TEXT DEFAULT 'bulk_export',
    p_format TEXT DEFAULT 'mp4'
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_count INTEGER := 0;
    v_video_id UUID;
BEGIN
    -- Verify admin access
    IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
        RAISE EXCEPTION 'Access denied: Admin role required';
    END IF;
    
    -- Insert export records for each video
    FOREACH v_video_id IN ARRAY p_video_ids
    LOOP
        INSERT INTO public.watermark_exports (
            video_id,
            admin_id,
            export_batch_id,
            platform,
            format,
            file_name,
            file_size,
            file_hash
        )
        SELECT 
            cf.id,
            auth.uid(),
            p_batch_id,
            p_platform,
            p_format,
            cf.file_name,
            cf.file_size,
            cf.file_hash
        FROM public.content_files cf
        WHERE cf.id = v_video_id
        ON CONFLICT (video_id, export_batch_id) DO NOTHING;
        
        v_count := v_count + 1;
    END LOOP;
    
    -- Log security event
    PERFORM public.log_security_event(
        'admin_bulk_export',
        jsonb_build_object(
            'batch_id', p_batch_id,
            'video_count', v_count,
            'platform', p_platform,
            'format', p_format
        )
    );
    
    RETURN v_count;
END;
$$;

-- Function to get export history summary
CREATE OR REPLACE FUNCTION public.get_watermark_export_history()
RETURNS TABLE (
    export_batch_id UUID,
    admin_id UUID,
    exported_at TIMESTAMP WITH TIME ZONE,
    platform TEXT,
    video_count BIGINT,
    total_size BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Verify admin access
    IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
        RAISE EXCEPTION 'Access denied: Admin role required';
    END IF;
    
    RETURN QUERY
    SELECT 
        we.export_batch_id,
        we.admin_id,
        MIN(we.exported_at) as exported_at,
        we.platform,
        COUNT(*) as video_count,
        COALESCE(SUM(we.file_size), 0) as total_size
    FROM public.watermark_exports we
    GROUP BY we.export_batch_id, we.admin_id, we.platform
    ORDER BY MIN(we.exported_at) DESC;
END;
$$;