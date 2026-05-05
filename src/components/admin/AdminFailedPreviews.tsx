import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { AlertTriangle, RefreshCw, Loader2, RotateCcw } from 'lucide-react';

interface FailedFile {
  id: string;
  file_name: string;
  submission_id: string;
  preview_failure_reason: string | null;
  preview_last_error: string | null;
  preview_attempts: number;
  preview_last_attempt_at: string | null;
}

export const AdminFailedPreviews = () => {
  const [files, setFiles] = useState<FailedFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [retrying, setRetrying] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('content_files')
      .select('id, file_name, submission_id, preview_failure_reason, preview_last_error, preview_attempts, preview_last_attempt_at')
      .eq('preview_status', 'preview_failed')
      .order('preview_last_attempt_at', { ascending: false })
      .limit(200);
    if (error) toast.error(error.message);
    else setFiles((data || []) as FailedFile[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const retry = async (id: string) => {
    setRetrying(id);
    const { error } = await supabase.rpc('retry_failed_preview', { _file_id: id });
    if (error) toast.error(error.message);
    else {
      toast.success('Queued for retry. Run the backfill to process it.');
      setFiles(prev => prev.filter(f => f.id !== id));
    }
    setRetrying(null);
  };

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Failed Video Previews ({files.length})
          </CardTitle>
          <CardDescription>
            Videos whose preview generation failed permanently. Retry to re-queue for the backfill job.
          </CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
        </Button>
      </CardHeader>
      <CardContent>
        {files.length === 0 && !loading && (
          <p className="text-sm text-muted-foreground">No failed previews. 🎉</p>
        )}
        <div className="space-y-2 max-h-[600px] overflow-y-auto">
          {files.map(f => (
            <div key={f.id} className="flex items-start gap-3 p-3 border rounded-lg bg-muted/30">
              <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm truncate">{f.file_name}</span>
                  <Badge variant="destructive" className="text-xs">{f.preview_failure_reason || 'unknown'}</Badge>
                  <Badge variant="outline" className="text-xs">attempts: {f.preview_attempts}</Badge>
                </div>
                {f.preview_last_error && (
                  <p className="text-xs text-muted-foreground mt-1 break-words">{f.preview_last_error}</p>
                )}
                {f.preview_last_attempt_at && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Last attempt: {new Date(f.preview_last_attempt_at).toLocaleString()}
                  </p>
                )}
              </div>
              <Button size="sm" variant="outline" onClick={() => retry(f.id)} disabled={retrying === f.id}>
                {retrying === f.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><RotateCcw className="h-3.5 w-3.5 mr-1" /> Retry</>}
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
