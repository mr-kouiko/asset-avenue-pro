import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  AlertTriangle, CheckCircle, XCircle, Eye, RefreshCw,
  Shield, Bot, User, Search, ScanLine
} from "lucide-react";

type StatusFilter = 'all' | 'pending_review' | 'pending_scan' | 'scan_failed' | 'approved_ai' | 'approved_ai_assisted';

const STATUS_COLORS: Record<string, string> = {
  pending_review: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  pending_scan: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  scan_failed: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  approved: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  approved_ai: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  approved_ai_assisted: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
  rejected: 'bg-red-200 text-red-900 dark:bg-red-900/50 dark:text-red-200',
};

const DECLARATION_LABELS: Record<string, { label: string; icon: React.ReactNode }> = {
  fully_ai_generated: { label: 'Fully AI', icon: <Bot className="h-3 w-3" /> },
  ai_assisted: { label: 'AI Assisted', icon: <Bot className="h-3 w-3" /> },
  no_ai_used: { label: 'No AI', icon: <User className="h-3 w-3" /> },
};

export const AdminModerationQueue = () => {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending_review');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({});
  const queryClient = useQueryClient();

  // Fetch submissions needing review
  const { data: submissions, isLoading } = useQuery({
    queryKey: ['moderation-queue', statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('content_submissions')
        .select('id, title, status, ai_declaration, created_at, creator_id, admin_notes, rejection_reason')
        .order('created_at', { ascending: false })
        .limit(50);

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      } else {
        query = query.in('status', ['pending_review', 'pending_scan', 'scan_failed', 'approved_ai', 'approved_ai_assisted']);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch detection results for expanded submission
  const { data: detectionResults } = useQuery({
    queryKey: ['detection-results', expandedId],
    queryFn: async () => {
      if (!expandedId) return null;
      const { data, error } = await supabase
        .from('detection_results')
        .select('*')
        .eq('content_submission_id', expandedId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!expandedId,
  });

  // Fetch creator profile for expanded submission
  const expandedSubmission = submissions?.find(s => s.id === expandedId);
  const { data: creatorProfile } = useQuery({
    queryKey: ['creator-profile', expandedSubmission?.creator_id],
    queryFn: async () => {
      if (!expandedSubmission?.creator_id) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('display_name, store_name, creator_integrity_score, creator_mismatch_count')
        .eq('user_id', expandedSubmission.creator_id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!expandedSubmission?.creator_id,
  });

  // Update submission status
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status: string; notes?: string }) => {
      const { error } = await supabase
        .from('content_submissions')
        .update({
          status,
          admin_notes: notes || null,
          approved_at: status.startsWith('approved') ? new Date().toISOString() : null,
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Status updated');
      queryClient.invalidateQueries({ queryKey: ['moderation-queue'] });
    },
    onError: (err) => toast.error(`Error: ${err.message}`),
  });

  // Re-scan mutation
  const rescanMutation = useMutation({
    mutationFn: async (submissionId: string) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/scan-content`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ submissionId }),
        }
      );

      if (!response.ok) {
        const err = await response.text();
        throw new Error(err);
      }
      return response.json();
    },
    onSuccess: (data) => {
      toast.success(`Re-scan complete: ${data.status}`);
      queryClient.invalidateQueries({ queryKey: ['moderation-queue'] });
      queryClient.invalidateQueries({ queryKey: ['detection-results'] });
    },
    onError: (err) => toast.error(`Scan error: ${err.message}`),
  });

  const getScoreColor = (score: number) => {
    if (score < 0.55) return 'text-green-600';
    if (score < 0.70) return 'text-amber-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Shield className="h-5 w-5" />
          AI Moderation Queue
        </h2>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Flagged</SelectItem>
            <SelectItem value="pending_review">Pending Review</SelectItem>
            <SelectItem value="pending_scan">Pending Scan</SelectItem>
            <SelectItem value="scan_failed">Scan Failed</SelectItem>
            <SelectItem value="approved_ai">Approved (AI)</SelectItem>
            <SelectItem value="approved_ai_assisted">Approved (AI Assisted)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Loading queue...</div>
      ) : !submissions?.length ? (
        <Card className="p-8 text-center text-muted-foreground">
          <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
          <p>No items in this queue</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {submissions.map((sub) => (
            <Card key={sub.id} className="overflow-hidden">
              <div
                className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => setExpandedId(expandedId === sub.id ? null : sub.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Eye className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="font-medium truncate">{sub.title}</span>
                    <Badge className={`shrink-0 ${STATUS_COLORS[sub.status] || 'bg-muted'}`}>
                      {sub.status.replace(/_/g, ' ')}
                    </Badge>
                    {sub.ai_declaration && DECLARATION_LABELS[sub.ai_declaration] && (
                      <Badge variant="outline" className="shrink-0 flex items-center gap-1">
                        {DECLARATION_LABELS[sub.ai_declaration].icon}
                        {DECLARATION_LABELS[sub.ai_declaration].label}
                      </Badge>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground ml-2">
                    {new Date(sub.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {expandedId === sub.id && (
                <CardContent className="border-t bg-muted/20 space-y-4">
                  {/* Creator Info */}
                  {creatorProfile && (
                    <div className="flex items-center gap-4 p-3 rounded-lg bg-background border">
                      <div>
                        <p className="font-medium">{creatorProfile.display_name || creatorProfile.store_name || 'Unknown'}</p>
                        <div className="flex gap-3 text-sm">
                          <span className="flex items-center gap-1">
                            <Shield className="h-3 w-3" />
                            Integrity: <strong className={creatorProfile.creator_integrity_score < 50 ? 'text-red-600' : creatorProfile.creator_integrity_score < 75 ? 'text-amber-600' : 'text-green-600'}>
                              {creatorProfile.creator_integrity_score}/100
                            </strong>
                          </span>
                          <span className="flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            Mismatches: <strong className={creatorProfile.creator_mismatch_count >= 3 ? 'text-red-600' : ''}>
                              {creatorProfile.creator_mismatch_count}
                            </strong>
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Detection Results */}
                  {detectionResults && detectionResults.length > 0 ? (
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold flex items-center gap-1">
                        <ScanLine className="h-4 w-4" /> Detection Results
                      </h4>
                      {detectionResults.map((dr: any) => (
                        <div key={dr.id} className="p-3 rounded-lg border bg-background text-sm space-y-2">
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            <div>
                              <span className="text-muted-foreground">Score:</span>{' '}
                              <strong className={getScoreColor(dr.detection_score)}>
                                {(dr.detection_score * 100).toFixed(1)}%
                              </strong>
                            </div>
                            <div>
                              <span className="text-muted-foreground">AI:</span>{' '}
                              <strong>{dr.ai_score ? `${(dr.ai_score * 100).toFixed(0)}%` : 'N/A'}</strong>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Deepfake:</span>{' '}
                              <strong>{dr.deepfake_score ? `${(dr.deepfake_score * 100).toFixed(0)}%` : 'N/A'}</strong>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Model:</span>{' '}
                              <span>{dr.model_used}</span>
                            </div>
                          </div>
                          {dr.reasoning && (
                            <p className="text-muted-foreground italic">{dr.reasoning}</p>
                          )}
                          {dr.indicators && dr.indicators.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {dr.indicators.map((ind: string, i: number) => (
                                <Badge key={i} variant="secondary" className="text-xs">{ind}</Badge>
                              ))}
                            </div>
                          )}
                          <div className="text-xs text-muted-foreground">
                            {dr.detection_status} • {new Date(dr.created_at).toLocaleString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No detection results yet</p>
                  )}

                  {/* Admin Actions */}
                  <div className="space-y-3 pt-2">
                    <Textarea
                      placeholder="Admin notes..."
                      value={adminNotes[sub.id] || ''}
                      onChange={(e) => setAdminNotes(prev => ({ ...prev, [sub.id]: e.target.value }))}
                      className="min-h-[60px]"
                    />
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => updateStatusMutation.mutate({ id: sub.id, status: 'approved', notes: adminNotes[sub.id] })}
                      >
                        <CheckCircle className="h-3 w-3 mr-1" /> Approve (Human)
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => updateStatusMutation.mutate({ id: sub.id, status: 'approved_ai', notes: adminNotes[sub.id] })}
                      >
                        <Bot className="h-3 w-3 mr-1" /> Label as AI
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => updateStatusMutation.mutate({ id: sub.id, status: 'approved_ai_assisted', notes: adminNotes[sub.id] })}
                      >
                        <Bot className="h-3 w-3 mr-1" /> Label AI-Assisted
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => updateStatusMutation.mutate({ id: sub.id, status: 'rejected', notes: adminNotes[sub.id] })}
                      >
                        <XCircle className="h-3 w-3 mr-1" /> Reject
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => rescanMutation.mutate(sub.id)}
                        disabled={rescanMutation.isPending}
                      >
                        <RefreshCw className={`h-3 w-3 mr-1 ${rescanMutation.isPending ? 'animate-spin' : ''}`} />
                        Re-scan
                      </Button>
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
