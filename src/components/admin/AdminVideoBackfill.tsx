import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Video, Play, AlertTriangle, CheckCircle, Loader2, Eye, Server } from 'lucide-react';

interface BackfillResponse {
  dryRun?: boolean;
  totalFound?: number;
  videos?: { id: string; fileName: string; submissionId: string }[];
  processed?: number;
  succeeded?: number;
  failed?: number;
  errors?: { fileId: string; fileName: string; error: string }[];
  successes?: string[];
  message?: string;
  error?: string;
}

type JobStatus = 'idle' | 'running' | 'done' | 'error';

export const AdminVideoBackfill = () => {
  const [status, setStatus] = useState<JobStatus>('idle');
  const [dryRun, setDryRun] = useState(true);
  const [maxVideos, setMaxVideos] = useState(50);
  const [result, setResult] = useState<BackfillResponse | null>(null);

  const runBackfill = async () => {
    setStatus('running');
    setResult(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('You must be logged in');
        setStatus('error');
        return;
      }

      const response = await supabase.functions.invoke('batch-backfill-previews', {
        body: { dryRun, maxVideos, batchSize: 5 },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Edge function call failed');
      }

      const data = response.data as BackfillResponse;
      setResult(data);

      if (data.error) {
        toast.error(data.error);
        setStatus('error');
      } else if (data.dryRun) {
        toast.success(`Dry run: found ${data.totalFound} videos to process`);
        setStatus('done');
      } else {
        toast.success(`Backfill complete: ${data.succeeded} succeeded, ${data.failed} failed`);
        setStatus('done');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      toast.error(`Backfill failed: ${msg}`);
      setResult({ error: msg });
      setStatus('error');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Server className="h-5 w-5" />
          Server-Side Video Preview Backfill
        </CardTitle>
        <CardDescription>
          Generate watermarked 720p previews for videos missing preview_path.
          Processing runs entirely on the server via FFmpeg — no browser involvement.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Controls */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch id="dry-run" checked={dryRun} onCheckedChange={setDryRun} />
            <Label htmlFor="dry-run">Dry Run (preview only)</Label>
          </div>

          <div className="flex items-center gap-2">
            <Label htmlFor="max-videos">Max videos:</Label>
            <select
              id="max-videos"
              value={maxVideos}
              onChange={(e) => setMaxVideos(Number(e.target.value))}
              className="rounded border border-input bg-background px-3 py-1.5 text-sm"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>

          <Button onClick={runBackfill} disabled={status === 'running'}>
            {status === 'running' ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Processing...</>
            ) : dryRun ? (
              <><Eye className="h-4 w-4 mr-2" /> Preview Missing Videos</>
            ) : (
              <><Play className="h-4 w-4 mr-2" /> Start Backfill</>
            )}
          </Button>
        </div>

        {/* Results */}
        {result && !result.error && (
          <div className="space-y-4">
            {/* Dry run results */}
            {result.dryRun && (
              <div className="p-4 border rounded-lg bg-muted/50">
                <p className="font-medium mb-2">
                  Found {result.totalFound} videos without previews
                </p>
                {result.videos && result.videos.length > 0 && (
                  <div className="max-h-48 overflow-y-auto space-y-1">
                    {result.videos.map((v) => (
                      <div key={v.id} className="flex items-center gap-2 text-sm p-1.5 rounded bg-muted/30">
                        <Video className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                        <span className="truncate">{v.fileName}</span>
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-sm text-muted-foreground mt-2">
                  Turn off "Dry Run" and click "Start Backfill" to process these videos.
                </p>
              </div>
            )}

            {/* Processing results */}
            {!result.dryRun && result.processed !== undefined && (
              <>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <div className="text-2xl font-bold">{result.processed}</div>
                    <div className="text-xs text-muted-foreground">Processed</div>
                  </div>
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{result.succeeded}</div>
                    <div className="text-xs text-muted-foreground">Succeeded</div>
                  </div>
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <div className="text-2xl font-bold text-red-600">{result.failed}</div>
                    <div className="text-xs text-muted-foreground">Failed</div>
                  </div>
                </div>

                {/* Successes */}
                {result.successes && result.successes.length > 0 && (
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    <h4 className="text-sm font-medium text-green-700">Succeeded</h4>
                    {result.successes.map((name, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm p-1.5 rounded bg-green-50 dark:bg-green-900/20">
                        <CheckCircle className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                        <span className="truncate">{name}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Errors */}
                {result.errors && result.errors.length > 0 && (
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    <h4 className="text-sm font-medium text-red-700">Failed</h4>
                    {result.errors.map((err, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm p-2 rounded bg-red-50 dark:bg-red-900/20">
                        <AlertTriangle className="h-3.5 w-3.5 text-red-500 flex-shrink-0" />
                        <span className="truncate flex-1">{err.fileName}</span>
                        <Badge variant="destructive" className="text-xs">{err.error?.substring(0, 50)}</Badge>
                      </div>
                    ))}
                  </div>
                )}

                {(result.failed ?? 0) > 0 && (
                  <p className="text-sm text-muted-foreground">
                    Failed videos can be retried by running the backfill again.
                  </p>
                )}
              </>
            )}

            {result.message && (
              <p className="text-sm text-muted-foreground">{result.message}</p>
            )}
          </div>
        )}

        {/* Error state */}
        {result?.error && (
          <div className="p-4 border border-destructive rounded-lg bg-destructive/10">
            <p className="text-sm text-destructive font-medium">{result.error}</p>
          </div>
        )}

        {/* Info */}
        <div className="p-3 bg-muted/50 border rounded-lg text-sm text-muted-foreground">
          <div className="flex items-start gap-2">
            <Server className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-foreground">How it works:</p>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>Videos are processed server-side via your FFmpeg API</li>
                <li>Each video is scaled to 720p with a centered watermark overlay</li>
                <li>Processed in parallel batches of 5 for speed</li>
                <li>Edge function timeout: ~150s — process up to 50 videos per run</li>
                <li>Run multiple times to process all remaining videos</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
