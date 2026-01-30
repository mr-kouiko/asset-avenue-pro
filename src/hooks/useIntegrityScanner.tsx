import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface IntegrityScan {
  id: string;
  started_at: string;
  completed_at: string | null;
  status: 'running' | 'completed' | 'failed';
  total_storage_files: number;
  total_db_records: number;
  orphaned_files_count: number;
  broken_records_count: number;
  stuck_uploads_count: number;
  scan_duration_ms: number | null;
  error_message: string | null;
  buckets_scanned: string[];
  triggered_by: 'cron' | 'manual';
  admin_id: string | null;
  created_at: string;
}

export interface IntegrityIssue {
  id: string;
  scan_id: string;
  issue_type: 'orphaned_file' | 'broken_record' | 'stuck_upload';
  severity: 'info' | 'warning' | 'critical';
  file_path: string | null;
  file_name: string | null;
  file_size: number | null;
  bucket_name: string | null;
  table_name: string | null;
  record_id: string | null;
  user_id: string | null;
  description: string;
  detected_at: string;
  age_hours: number | null;
  status: 'open' | 'resolved' | 'ignored' | 'in_progress';
  resolved_at: string | null;
  resolved_by: string | null;
  resolution_action: string | null;
  resolution_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ScannerConfig {
  id: string;
  enabled: boolean;
  scan_interval_minutes: number;
  stuck_upload_timeout_hours: number;
  notify_on_critical: boolean;
  admin_email_notifications: boolean;
  max_issues_before_alert: number;
  updated_at: string;
  updated_by: string | null;
}

export function useIntegrityScanner() {
  const queryClient = useQueryClient();
  const [isScanning, setIsScanning] = useState(false);

  // Fetch recent scans
  const { data: scans, isLoading: scansLoading, refetch: refetchScans } = useQuery({
    queryKey: ['integrity-scans'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('integrity_scans')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(20);
      
      if (error) throw error;
      return data as IntegrityScan[];
    }
  });

  // Fetch open issues
  const { data: issues, isLoading: issuesLoading, refetch: refetchIssues } = useQuery({
    queryKey: ['integrity-issues'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('integrity_issues')
        .select('*')
        .in('status', ['open', 'in_progress'])
        .order('severity', { ascending: false })
        .order('detected_at', { ascending: false });
      
      if (error) throw error;
      return data as IntegrityIssue[];
    }
  });

  // Fetch scanner config
  const { data: config, isLoading: configLoading, refetch: refetchConfig } = useQuery({
    queryKey: ['integrity-scanner-config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('integrity_scanner_config')
        .select('*')
        .limit(1)
        .single();
      
      if (error) throw error;
      return data as ScannerConfig;
    }
  });

  // Trigger manual scan
  const triggerScan = useCallback(async () => {
    setIsScanning(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase.functions.invoke('integrity-scanner', {
        body: { manual: true, admin_id: user?.id }
      });

      if (error) throw error;

      toast.success(`Scan completed: ${data.issues_found} issues found`);
      
      // Refetch data
      await Promise.all([refetchScans(), refetchIssues()]);
      
      return data;
    } catch (error) {
      console.error('Scan failed:', error);
      toast.error('Failed to run integrity scan');
      throw error;
    } finally {
      setIsScanning(false);
    }
  }, [refetchScans, refetchIssues]);

  // Update issue status
  const updateIssueMutation = useMutation({
    mutationFn: async ({ 
      issueId, 
      status, 
      action, 
      notes 
    }: { 
      issueId: string; 
      status: string; 
      action?: string; 
      notes?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const updateData: Record<string, unknown> = {
        status,
        resolution_action: action,
        resolution_notes: notes
      };

      if (status === 'resolved') {
        updateData.resolved_at = new Date().toISOString();
        updateData.resolved_by = user?.id;
      }

      const { error } = await supabase
        .from('integrity_issues')
        .update(updateData)
        .eq('id', issueId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Issue updated');
      queryClient.invalidateQueries({ queryKey: ['integrity-issues'] });
    },
    onError: (error) => {
      toast.error('Failed to update issue');
      console.error(error);
    }
  });

  // Update scanner config
  const updateConfigMutation = useMutation({
    mutationFn: async (updates: Partial<ScannerConfig>) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('integrity_scanner_config')
        .update({
          ...updates,
          updated_by: user?.id
        })
        .eq('id', config?.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Configuration updated');
      queryClient.invalidateQueries({ queryKey: ['integrity-scanner-config'] });
    },
    onError: (error) => {
      toast.error('Failed to update configuration');
      console.error(error);
    }
  });

  // Reassign orphaned file to a seller
  const reassignFile = useCallback(async (issueId: string, filePath: string, targetUserId: string) => {
    try {
      // Create uploaded_files record for the file
      const fileName = filePath.split('/').pop() || 'unknown';
      
      const { error: insertError } = await supabase
        .from('uploaded_files')
        .insert({
          user_id: targetUserId,
          file_name: fileName,
          file_url: filePath,
          file_type: 'unknown',
          file_size: 0,
          status: 'completed'
        });

      if (insertError) throw insertError;

      // Mark issue as resolved
      await updateIssueMutation.mutateAsync({
        issueId,
        status: 'resolved',
        action: 'reassigned',
        notes: `Reassigned to user ${targetUserId}`
      });

      toast.success('File reassigned successfully');
    } catch (error) {
      toast.error('Failed to reassign file');
      console.error(error);
    }
  }, [updateIssueMutation]);

  // Get issue statistics
  const getStats = useCallback(() => {
    if (!issues) return { total: 0, orphaned: 0, broken: 0, stuck: 0, critical: 0 };
    
    return {
      total: issues.length,
      orphaned: issues.filter(i => i.issue_type === 'orphaned_file').length,
      broken: issues.filter(i => i.issue_type === 'broken_record').length,
      stuck: issues.filter(i => i.issue_type === 'stuck_upload').length,
      critical: issues.filter(i => i.severity === 'critical').length
    };
  }, [issues]);

  return {
    // Data
    scans,
    issues,
    config,
    stats: getStats(),
    
    // Loading states
    isLoading: scansLoading || issuesLoading || configLoading,
    isScanning,
    
    // Actions
    triggerScan,
    updateIssue: updateIssueMutation.mutate,
    updateConfig: updateConfigMutation.mutate,
    reassignFile,
    
    // Refetch
    refetch: () => Promise.all([refetchScans(), refetchIssues(), refetchConfig()])
  };
}
