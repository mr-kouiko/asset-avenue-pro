import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

type ReportReason = 'copyright' | 'inappropriate' | 'misleading' | 'spam' | 'other';
type ReportStatus = 'pending' | 'reviewing' | 'resolved' | 'dismissed';

interface ContentReport {
  id: string;
  reporter_id: string | null;
  reporter_email: string | null;
  submission_id: string;
  reason: ReportReason;
  details: string | null;
  status: ReportStatus;
  reviewed_by: string | null;
  admin_notes: string | null;
  reviewed_at: string | null;
  created_at: string;
  content_title?: string;
}

interface ReportInput {
  submission_id: string;
  reason: ReportReason;
  details?: string;
  email?: string;
}

export const useContentReports = () => {
  const { user } = useAuth();
  const [reports, setReports] = useState<ContentReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const submitReport = useCallback(async (input: ReportInput): Promise<boolean> => {
    setSubmitting(true);
    try {
      // Create report in database
      const { error: reportError } = await supabase
        .from('content_reports')
        .insert({
          reporter_id: user?.id || null,
          reporter_email: input.email || user?.email || null,
          submission_id: input.submission_id,
          reason: input.reason,
          details: input.details || null
        });

      if (reportError) throw reportError;

      // Notify admin via edge function
      const { error: notifyError } = await supabase.functions.invoke('send-admin-notification', {
        body: {
          type: 'content_report',
          submission_id: input.submission_id,
          reason: input.reason,
          details: input.details,
          reporter_email: input.email || user?.email
        }
      });

      if (notifyError) {
        console.error('Admin notification failed:', notifyError);
      }

      toast.success('Report submitted. Thank you for helping keep our community safe.');
      return true;
    } catch (error) {
      console.error('Error submitting report:', error);
      toast.error('Failed to submit report');
      return false;
    } finally {
      setSubmitting(false);
    }
  }, [user]);

  // Admin functions
  const fetchAllReports = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('content_reports')
        .select(`
          *,
          content_submissions (title)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const reportsWithTitles = (data || []).map((r: any) => ({
        ...r,
        content_title: r.content_submissions?.title || 'Unknown'
      }));

      setReports(reportsWithTitles);
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateReportStatus = useCallback(async (
    reportId: string,
    status: ReportStatus,
    adminNotes?: string
  ): Promise<boolean> => {
    if (!user) return false;

    try {
      const updateData: any = {
        status,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString()
      };

      if (adminNotes !== undefined) {
        updateData.admin_notes = adminNotes;
      }

      const { error } = await supabase
        .from('content_reports')
        .update(updateData)
        .eq('id', reportId);

      if (error) throw error;

      setReports(prev => prev.map(r => 
        r.id === reportId ? { ...r, ...updateData } : r
      ));

      toast.success('Report updated');
      return true;
    } catch (error) {
      console.error('Error updating report:', error);
      toast.error('Failed to update report');
      return false;
    }
  }, [user]);

  const getPendingReportsCount = useCallback(async (): Promise<number> => {
    try {
      const { count, error } = await supabase
        .from('content_reports')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      if (error) throw error;
      return count || 0;
    } catch (error) {
      console.error('Error getting pending reports count:', error);
      return 0;
    }
  }, []);

  return {
    reports,
    loading,
    submitting,
    submitReport,
    fetchAllReports,
    updateReportStatus,
    getPendingReportsCount
  };
};
