-- SEO Co-Pilot Tables
-- =====================

-- 1. SEO Metadata Table - Stores optimized SEO content for pages
CREATE TABLE public.seo_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_type TEXT NOT NULL CHECK (page_type IN ('homepage', 'category', 'product', 'static')),
  page_id UUID, -- FK to content_submissions or categories (nullable for static/homepage)
  page_path TEXT NOT NULL UNIQUE,
  
  -- Optimized SEO fields
  seo_title TEXT,
  seo_description TEXT,
  seo_h1 TEXT,
  seo_content TEXT, -- Enhanced page content (markdown)
  internal_links JSONB DEFAULT '[]'::jsonb, -- [{anchor: '', url: '', context: ''}]
  faq_schema JSONB DEFAULT '[]'::jsonb, -- [{question: '', answer: ''}]
  
  -- Version control
  version INTEGER DEFAULT 1,
  previous_version JSONB, -- Stores last version for revert
  
  -- Metadata
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  optimized_by UUID,
  optimization_mode TEXT DEFAULT 'suggestion' CHECK (optimization_mode IN ('suggestion', 'auto'))
);

-- 2. SEO Scans Table - Track scan history and results
CREATE TABLE public.seo_scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_type TEXT NOT NULL CHECK (scan_type IN ('manual', 'scheduled')),
  scope TEXT NOT NULL CHECK (scope IN ('single', 'category', 'marketplace')),
  scope_filter TEXT, -- category slug or page path for targeted scans
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  
  -- Results
  pages_scanned INTEGER DEFAULT 0,
  issues_found INTEGER DEFAULT 0,
  average_score NUMERIC(5,2),
  results JSONB DEFAULT '[]'::jsonb, -- Detailed scan results per page
  error_message TEXT,
  
  -- Credit tracking
  credits_estimated INTEGER DEFAULT 0,
  credits_used INTEGER DEFAULT 0,
  admin_id UUID NOT NULL,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

-- 3. SEO Audit Log Table - Detailed logging of all SEO actions
CREATE TABLE public.seo_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL,
  action_type TEXT NOT NULL CHECK (action_type IN ('scan', 'analyze', 'optimize', 'apply', 'revert', 'preview')),
  page_path TEXT,
  page_id UUID,
  scan_id UUID REFERENCES public.seo_scans(id),
  
  -- Action details
  before_state JSONB,
  after_state JSONB,
  changes_summary TEXT,
  
  -- Credit tracking
  credits_used INTEGER DEFAULT 0,
  
  -- Metadata
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_seo_metadata_page_path ON public.seo_metadata(page_path);
CREATE INDEX idx_seo_metadata_page_type ON public.seo_metadata(page_type);
CREATE INDEX idx_seo_metadata_active ON public.seo_metadata(is_active) WHERE is_active = true;
CREATE INDEX idx_seo_scans_admin ON public.seo_scans(admin_id);
CREATE INDEX idx_seo_scans_status ON public.seo_scans(status);
CREATE INDEX idx_seo_audit_log_admin ON public.seo_audit_log(admin_id);
CREATE INDEX idx_seo_audit_log_created ON public.seo_audit_log(created_at DESC);

-- Enable RLS
ALTER TABLE public.seo_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seo_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seo_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Admin only access
CREATE POLICY "Admin full access to seo_metadata" ON public.seo_metadata
  FOR ALL USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role access to seo_metadata" ON public.seo_metadata
  FOR ALL USING (current_setting('role'::text) = 'service_role'::text)
  WITH CHECK (current_setting('role'::text) = 'service_role'::text);

CREATE POLICY "Admin full access to seo_scans" ON public.seo_scans
  FOR ALL USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role access to seo_scans" ON public.seo_scans
  FOR ALL USING (current_setting('role'::text) = 'service_role'::text)
  WITH CHECK (current_setting('role'::text) = 'service_role'::text);

CREATE POLICY "Admin full access to seo_audit_log" ON public.seo_audit_log
  FOR ALL USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role access to seo_audit_log" ON public.seo_audit_log
  FOR ALL USING (current_setting('role'::text) = 'service_role'::text)
  WITH CHECK (current_setting('role'::text) = 'service_role'::text);

-- Trigger for updated_at
CREATE TRIGGER update_seo_metadata_updated_at
  BEFORE UPDATE ON public.seo_metadata
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to get active SEO metadata for prerender
CREATE OR REPLACE FUNCTION public.get_seo_metadata(path_param TEXT)
RETURNS TABLE(
  seo_title TEXT,
  seo_description TEXT,
  seo_h1 TEXT,
  seo_content TEXT,
  internal_links JSONB,
  faq_schema JSONB
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT 
    seo_title,
    seo_description,
    seo_h1,
    seo_content,
    internal_links,
    faq_schema
  FROM public.seo_metadata
  WHERE page_path = path_param
  AND is_active = true
  LIMIT 1;
$$;