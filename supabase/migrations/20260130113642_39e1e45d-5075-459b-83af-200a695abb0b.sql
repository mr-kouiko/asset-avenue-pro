-- Create table to log integrity scan executions
CREATE TABLE public.integrity_scans (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  started_at timestamp with time zone NOT NULL DEFAULT now(),
  completed_at timestamp with time zone,
  status text NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed')),
  
  -- Scan results summary
  total_storage_files integer DEFAULT 0,
  total_db_records integer DEFAULT 0,
  orphaned_files_count integer DEFAULT 0,
  broken_records_count integer DEFAULT 0,
  stuck_uploads_count integer DEFAULT 0,
  
  -- Execution details
  scan_duration_ms integer,
  error_message text,
  buckets_scanned text[] DEFAULT '{}',
  
  -- Metadata
  triggered_by text DEFAULT 'cron' CHECK (triggered_by IN ('cron', 'manual')),
  admin_id uuid REFERENCES auth.users(id),
  
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create table for individual integrity issues
CREATE TABLE public.integrity_issues (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  scan_id uuid REFERENCES public.integrity_scans(id) ON DELETE CASCADE,
  
  -- Issue classification
  issue_type text NOT NULL CHECK (issue_type IN ('orphaned_file', 'broken_record', 'stuck_upload')),
  severity text NOT NULL DEFAULT 'warning' CHECK (severity IN ('info', 'warning', 'critical')),
  
  -- File/Record details
  file_path text,
  file_name text,
  file_size bigint,
  bucket_name text,
  
  -- Database reference (if exists)
  table_name text,
  record_id uuid,
  user_id uuid,
  
  -- Issue details
  description text NOT NULL,
  detected_at timestamp with time zone NOT NULL DEFAULT now(),
  age_hours integer, -- How long the issue has existed
  
  -- Resolution tracking
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'ignored', 'in_progress')),
  resolved_at timestamp with time zone,
  resolved_by uuid REFERENCES auth.users(id),
  resolution_action text,
  resolution_notes text,
  
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create table for scanner configuration
CREATE TABLE public.integrity_scanner_config (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Scanner settings
  enabled boolean NOT NULL DEFAULT true,
  scan_interval_minutes integer NOT NULL DEFAULT 60,
  stuck_upload_timeout_hours integer NOT NULL DEFAULT 24,
  
  -- Notification settings
  notify_on_critical boolean NOT NULL DEFAULT true,
  admin_email_notifications boolean NOT NULL DEFAULT false,
  
  -- Thresholds
  max_issues_before_alert integer NOT NULL DEFAULT 100,
  
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

-- Insert default configuration
INSERT INTO public.integrity_scanner_config (id, enabled, scan_interval_minutes)
VALUES (gen_random_uuid(), true, 60);

-- Create indexes for performance
CREATE INDEX idx_integrity_scans_status ON public.integrity_scans(status);
CREATE INDEX idx_integrity_scans_started_at ON public.integrity_scans(started_at DESC);
CREATE INDEX idx_integrity_issues_scan_id ON public.integrity_issues(scan_id);
CREATE INDEX idx_integrity_issues_status ON public.integrity_issues(status);
CREATE INDEX idx_integrity_issues_type ON public.integrity_issues(issue_type);
CREATE INDEX idx_integrity_issues_user_id ON public.integrity_issues(user_id);
CREATE INDEX idx_integrity_issues_detected_at ON public.integrity_issues(detected_at DESC);

-- Enable RLS
ALTER TABLE public.integrity_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integrity_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integrity_scanner_config ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Admin only access
CREATE POLICY "Admins can view integrity scans"
ON public.integrity_scans FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert integrity scans"
ON public.integrity_scans FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update integrity scans"
ON public.integrity_scans FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role can manage integrity scans"
ON public.integrity_scans FOR ALL
USING (current_setting('role'::text) = 'service_role'::text);

CREATE POLICY "Admins can view integrity issues"
ON public.integrity_issues FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update integrity issues"
ON public.integrity_issues FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role can manage integrity issues"
ON public.integrity_issues FOR ALL
USING (current_setting('role'::text) = 'service_role'::text);

CREATE POLICY "Admins can view scanner config"
ON public.integrity_scanner_config FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update scanner config"
ON public.integrity_scanner_config FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger to update updated_at
CREATE TRIGGER update_integrity_issues_updated_at
BEFORE UPDATE ON public.integrity_issues
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_integrity_scanner_config_updated_at
BEFORE UPDATE ON public.integrity_scanner_config
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();