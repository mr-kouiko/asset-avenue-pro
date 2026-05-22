import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  AlertTriangle, CheckCircle, XCircle, Eye, RefreshCw,
  Shield, Bot, User, ScanLine, FileDown, FileQuestion
} from "lucide-react";

type StatusFilter = 'needs_review' | 'pending_review' | 'ai_assisted' | 'rejected' | 'all';

// Statuses that are NOT visible on the public marketplace and require admin attention.
const NEEDS_REVIEW_STATUSES = [
  'pending_review', 'pending_scan', 'scan_failed',
  'approved_ai', 'approved_ai_assisted', 'rejected_ai_assisted',
];
const AI_ASSISTED_STATUSES = ['approved_ai', 'approved_ai_assisted', 'rejected_ai_assisted'];
const REJECTED_STATUSES = ['rejected', 'rejected_ai_assisted'];
const ALL_REVIEWABLE = [
  'pending_review', 'pending_scan', 'scan_failed',
  'approved_ai', 'approved_ai_assisted',
  'rejected', 'rejected_ai_assisted',
];

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

function getMediaType(fileType: string): 'image' | 'video' | 'audio' | 'other' {
  if (fileType.startsWith('image/')) return 'image';
  if (fileType.startsWith('video/')) return 'video';
  if (fileType.startsWith('audio/')) return 'audio';
  return 'other';
}

function MediaPreview({ file, large = false }: { file: { file_type: string; file_path: string; preview_path?: string | null; thumbnail_path?: string | null; file_name: string }; large?: boolean }) {
  const mediaType = getMediaType(file.file_type);
  const src = file.preview_path || file.file_path;
  const imgSrc = file.thumbnail_path || file.preview_path || file.file_path;

  if (mediaType === 'image') {
    return (
      <img
        src={imgSrc}
        alt={file.file_name}
        className={`rounded-lg object-contain bg-muted ${large ? 'max-h-[70vh] w-full' : 'max-h-48 w-full'}`}
        loading="lazy"
      />
    );
  }

  if (mediaType === 'video') {
    return (
      <video
        src={src}
        controls
        className={`rounded-lg bg-black ${large ? 'max-h-[70vh] w-full' : 'max-h-48 w-full'}`}
        preload="metadata"
      />
    );
  }

  if (mediaType === 'audio') {
    return (
      <div className="p-4 rounded-lg bg-muted flex flex-col items-center gap-2">
        <FileQuestion className="h-8 w-8 text-muted-foreground" />
        <span className="text-sm text-muted-foreground truncate max-w-full">{file.file_name}</span>
        <audio src={src} controls className="w-full" preload="metadata" />
      </div>
    );
  }

  return (
    <div className="p-6 rounded-lg bg-muted flex flex-col items-center gap-2">
      <FileDown className="h-10 w-10 text-muted-foreground" />
      <span className="text-sm font-medium truncate max-w-full">{file.file_name}</span>
      <span className="text-xs text-muted-foreground">{file.file_type}</span>
    </div>
  );
}

function ScoreBar({ label, value, max = 1 }: { label: string; value: number | null | undefined; max?: number }) {
  if (value == null) return null;
  const pct = Math.min((value / max) * 100, 100);
  const color = pct < 55 ? 'bg-green-500' : pct < 70 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono font-medium">{(value * 100).toFixed(1)}%</span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export const AdminModerationQueue = () => {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending_review');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({});
  const [previewModal, setPreviewModal] = useState<{ open: boolean; file: any | null }>({ open: false, file: null });
  const queryClient = useQueryClient();

  // Fetch submissions
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

  // Fetch content files for expanded submission
  const { data: contentFiles } = useQuery({
    queryKey: ['moderation-files', expandedId],
    queryFn: async () => {
      if (!expandedId) return null;
      const { data, error } = await supabase
        .from('content_files')
        .select('id, file_type, file_path, preview_path, thumbnail_path, file_name, file_size, file_format')
        .eq('submission_id', expandedId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!expandedId,
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

  const primaryFile = contentFiles?.[0] || null;

  return (
    <div className="space-y-6">
      {/* Header */}
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
              {/* Collapsed row */}
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

              {/* Expanded detail — two-column layout */}
              {expandedId === sub.id && (
                <CardContent className="border-t bg-muted/20 p-4">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* LEFT COLUMN: Media Preview */}
                    <div className="space-y-3">
                      <h4 className="text-sm font-semibold">Content Preview</h4>
                      {primaryFile ? (
                        <div className="space-y-2">
                          <MediaPreview file={primaryFile} />
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full"
                            onClick={() => setPreviewModal({ open: true, file: primaryFile })}
                          >
                            <Eye className="h-3 w-3 mr-1" /> View Full Size
                          </Button>
                          {contentFiles && contentFiles.length > 1 && (
                            <div className="flex gap-2 overflow-x-auto pt-1">
                              {contentFiles.slice(1).map((f) => (
                                <button
                                  key={f.id}
                                  className="shrink-0 w-16 h-16 rounded border overflow-hidden hover:ring-2 ring-primary transition-all"
                                  onClick={() => setPreviewModal({ open: true, file: f })}
                                >
                                  {getMediaType(f.file_type) === 'image' ? (
                                    <img src={f.thumbnail_path || f.file_path} alt="" className="w-full h-full object-cover" />
                                  ) : (
                                    <div className="w-full h-full bg-muted flex items-center justify-center text-[10px] text-muted-foreground">
                                      {f.file_format}
                                    </div>
                                  )}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="p-8 rounded-lg bg-muted flex flex-col items-center gap-2 text-muted-foreground">
                          <FileQuestion className="h-10 w-10" />
                          <p className="text-sm">No files attached</p>
                        </div>
                      )}
                    </div>

                    {/* RIGHT COLUMN: Details + Actions */}
                    <div className="space-y-4">
                      {/* Creator Info */}
                      {creatorProfile && (
                        <div className="p-3 rounded-lg bg-background border space-y-1">
                          <p className="font-medium text-sm">{creatorProfile.display_name || creatorProfile.store_name || 'Unknown Creator'}</p>
                          <div className="flex gap-4 text-xs">
                            <span className="flex items-center gap-1">
                              <Shield className="h-3 w-3" />
                              Integrity:
                              <strong className={
                                creatorProfile.creator_integrity_score < 50 ? 'text-destructive' :
                                creatorProfile.creator_integrity_score < 75 ? 'text-amber-600' : 'text-green-600'
                              }>
                                {creatorProfile.creator_integrity_score}/100
                              </strong>
                            </span>
                            <span className="flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3" />
                              Mismatches:
                              <strong className={creatorProfile.creator_mismatch_count >= 3 ? 'text-destructive' : ''}>
                                {creatorProfile.creator_mismatch_count}
                              </strong>
                            </span>
                          </div>
                          {sub.ai_declaration && (
                            <div className="text-xs mt-1">
                              Seller declared: <Badge variant="outline" className="text-xs ml-1 inline-flex items-center gap-1">
                                {DECLARATION_LABELS[sub.ai_declaration]?.icon}
                                {DECLARATION_LABELS[sub.ai_declaration]?.label || sub.ai_declaration}
                              </Badge>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Detection Results */}
                      {detectionResults && detectionResults.length > 0 ? (
                        <div className="space-y-2">
                          <h4 className="text-sm font-semibold flex items-center gap-1">
                            <ScanLine className="h-4 w-4" /> Detection Results
                          </h4>
                          {detectionResults.map((dr: any) => (
                            <div key={dr.id} className="p-3 rounded-lg border bg-background text-sm space-y-3">
                              <ScoreBar label="Detection Score" value={dr.detection_score} />
                              <ScoreBar label="AI Score" value={dr.ai_score} />
                              <ScoreBar label="Deepfake Score" value={dr.deepfake_score} />
                              <ScoreBar label="Quality Score" value={dr.quality_score} />
                              <ScoreBar label="Final Confidence" value={dr.final_confidence} />
                              <div className="flex justify-between text-xs text-muted-foreground pt-1 border-t">
                                <span>Model: <strong className="text-foreground">{dr.model_used}</strong></span>
                                <span>{dr.detection_status}</span>
                              </div>
                              {dr.reasoning && (
                                <p className="text-xs text-muted-foreground italic border-l-2 border-muted pl-2">{dr.reasoning}</p>
                              )}
                              {dr.indicators && dr.indicators.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                  {dr.indicators.map((ind: string, i: number) => (
                                    <Badge key={i} variant="secondary" className="text-xs">{ind}</Badge>
                                  ))}
                                </div>
                              )}
                              <div className="text-[10px] text-muted-foreground">
                                {new Date(dr.created_at).toLocaleString()}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">No detection results yet</p>
                      )}

                      {/* Admin Actions */}
                      <div className="space-y-3 pt-2 border-t">
                        <Textarea
                          placeholder="Admin notes..."
                          value={adminNotes[sub.id] || ''}
                          onChange={(e) => setAdminNotes(prev => ({ ...prev, [sub.id]: e.target.value }))}
                          className="min-h-[60px]"
                        />
                        <div className="flex flex-wrap gap-2">
                          <Button size="sm" variant="default" onClick={() => updateStatusMutation.mutate({ id: sub.id, status: 'approved', notes: adminNotes[sub.id] })}>
                            <CheckCircle className="h-3 w-3 mr-1" /> Approve
                          </Button>
                          <Button size="sm" variant="secondary" onClick={() => updateStatusMutation.mutate({ id: sub.id, status: 'approved_ai', notes: adminNotes[sub.id] })}>
                            <Bot className="h-3 w-3 mr-1" /> Label AI
                          </Button>
                          <Button size="sm" variant="secondary" onClick={() => updateStatusMutation.mutate({ id: sub.id, status: 'approved_ai_assisted', notes: adminNotes[sub.id] })}>
                            <Bot className="h-3 w-3 mr-1" /> AI-Assisted
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => updateStatusMutation.mutate({ id: sub.id, status: 'rejected', notes: adminNotes[sub.id] })}>
                            <XCircle className="h-3 w-3 mr-1" /> Reject
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => rescanMutation.mutate(sub.id)} disabled={rescanMutation.isPending}>
                            <RefreshCw className={`h-3 w-3 mr-1 ${rescanMutation.isPending ? 'animate-spin' : ''}`} /> Re-scan
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Full-size preview modal */}
      <Dialog open={previewModal.open} onOpenChange={(open) => setPreviewModal({ open, file: open ? previewModal.file : null })}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>{previewModal.file?.file_name || 'Preview'}</DialogTitle>
          </DialogHeader>
          {previewModal.file && <MediaPreview file={previewModal.file} large />}
        </DialogContent>
      </Dialog>
    </div>
  );
};
