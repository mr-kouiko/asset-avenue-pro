import { useState, useRef, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useVideoPreviewGenerator } from '@/hooks/useVideoPreviewGenerator';
import { toast } from 'sonner';
import { Video, Play, Pause, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';

interface VideoFile {
  id: string;
  submission_id: string;
  file_name: string;
  file_path: string;
  file_type: string;
}

type BackfillStatus = 'idle' | 'loading' | 'running' | 'paused' | 'done';

interface ProcessingResult {
  fileId: string;
  fileName: string;
  status: 'success' | 'error';
  error?: string;
}

export const AdminVideoBackfill = () => {
  const [status, setStatus] = useState<BackfillStatus>('idle');
  const [videoFiles, setVideoFiles] = useState<VideoFile[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [results, setResults] = useState<ProcessingResult[]>([]);
  const [currentFileName, setCurrentFileName] = useState('');
  const pauseRef = useRef(false);
  const abortRef = useRef(false);
  const { generate, state: generatorState } = useVideoPreviewGenerator();

  const loadVideosWithoutPreviews = useCallback(async () => {
    setStatus('loading');
    try {
      // Admin direct query — RLS allows admin access
      const { data, error } = await supabase
        .from('content_files')
        .select('id, submission_id, file_name, file_path, file_type')
        .is('preview_path', null)
        .eq('is_original', true)
        .in('file_type', ['video', 'video/mp4', 'video/quicktime', 'video/webm', 'video/mov'])
        .limit(1000);

      if (error) throw error;

      // Also check by file extension for files with wrong file_type
      const { data: extData, error: extError } = await supabase
        .from('content_files')
        .select('id, submission_id, file_name, file_path, file_type')
        .is('preview_path', null)
        .eq('is_original', true)
        .or('file_name.ilike.%.mp4,file_name.ilike.%.mov,file_name.ilike.%.webm')
        .limit(1000);

      if (extError) throw extError;

      // Merge and deduplicate
      const allFiles = [...(data || []), ...(extData || [])];
      const uniqueMap = new Map<string, VideoFile>();
      allFiles.forEach(f => uniqueMap.set(f.id, f));
      const unique = Array.from(uniqueMap.values());

      // Filter to only approved submissions
      const submissionIds = [...new Set(unique.map(f => f.submission_id))];
      const { data: approvedSubs } = await supabase
        .from('content_submissions')
        .select('id')
        .in('id', submissionIds)
        .eq('status', 'approved');

      const approvedIds = new Set((approvedSubs || []).map(s => s.id));
      const filtered = unique.filter(f => approvedIds.has(f.submission_id));

      setVideoFiles(filtered);
      setCurrentIndex(0);
      setResults([]);
      setStatus('idle');
      toast.success(`Found ${filtered.length} videos without previews`);
    } catch (err) {
      console.error('Failed to load videos:', err);
      toast.error('Failed to load videos');
      setStatus('idle');
    }
  }, []);

  const processOneVideo = async (file: VideoFile): Promise<ProcessingResult> => {
    try {
      setCurrentFileName(file.file_name);
      console.log(`[Backfill] Processing: ${file.file_name}`);

      // Generate watermarked preview using the existing generator
      const blob = await generate({ url: file.file_path });

      // Upload to previews bucket
      const ext = blob.type.includes('mp4') ? 'mp4' : 'webm';
      const previewPath = `${file.submission_id}/${file.id}_preview.${ext}`;
      
      const { error: uploadError } = await supabase.storage
        .from('previews')
        .upload(previewPath, blob, {
          contentType: blob.type,
          upsert: true,
        });

      if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('previews')
        .getPublicUrl(previewPath);

      // Update content_files record
      const { error: updateError } = await supabase
        .from('content_files')
        .update({ preview_path: urlData.publicUrl })
        .eq('id', file.id);

      if (updateError) throw new Error(`DB update failed: ${updateError.message}`);

      console.log(`[Backfill] ✅ Done: ${file.file_name}`);
      return { fileId: file.id, fileName: file.file_name, status: 'success' };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      console.error(`[Backfill] ❌ Failed: ${file.file_name}`, msg);
      return { fileId: file.id, fileName: file.file_name, status: 'error', error: msg };
    }
  };

  const startBackfill = async () => {
    if (videoFiles.length === 0) {
      toast.error('No videos to process. Load videos first.');
      return;
    }

    setStatus('running');
    pauseRef.current = false;
    abortRef.current = false;

    for (let i = currentIndex; i < videoFiles.length; i++) {
      if (abortRef.current) break;

      // Check for pause
      while (pauseRef.current && !abortRef.current) {
        await new Promise(r => setTimeout(r, 500));
      }
      if (abortRef.current) break;

      setCurrentIndex(i);
      const result = await processOneVideo(videoFiles[i]);
      setResults(prev => [...prev, result]);

      // Small delay between videos to avoid overloading the browser
      await new Promise(r => setTimeout(r, 2000));
    }

    setStatus('done');
    setCurrentFileName('');
    const successCount = results.filter(r => r.status === 'success').length + 
      (abortRef.current ? 0 : 1); // approximate
    toast.success(`Backfill complete. Check results below.`);
  };

  const pauseBackfill = () => {
    pauseRef.current = true;
    setStatus('paused');
  };

  const resumeBackfill = () => {
    pauseRef.current = false;
    setStatus('running');
  };

  const stopBackfill = () => {
    abortRef.current = true;
    pauseRef.current = false;
    setStatus('idle');
  };

  const successCount = results.filter(r => r.status === 'success').length;
  const errorCount = results.filter(r => r.status === 'error').length;
  const overallProgress = videoFiles.length > 0 
    ? Math.round((results.length / videoFiles.length) * 100) 
    : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Video className="h-5 w-5" />
          Video Preview Backfill
        </CardTitle>
        <CardDescription>
          Generate watermarked previews for videos that are currently showing "Video processing".
          This runs in your browser using Canvas + MediaRecorder.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Controls */}
        <div className="flex flex-wrap gap-3">
          <Button 
            onClick={loadVideosWithoutPreviews} 
            disabled={status === 'running' || status === 'loading'}
            variant="outline"
          >
            {status === 'loading' ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Loading...</>
            ) : (
              'Scan for missing previews'
            )}
          </Button>

          {videoFiles.length > 0 && status !== 'running' && status !== 'paused' && (
            <Button onClick={startBackfill}>
              <Play className="h-4 w-4 mr-2" />
              Start Backfill ({videoFiles.length - currentIndex} remaining)
            </Button>
          )}

          {status === 'running' && (
            <Button onClick={pauseBackfill} variant="secondary">
              <Pause className="h-4 w-4 mr-2" />
              Pause
            </Button>
          )}

          {status === 'paused' && (
            <>
              <Button onClick={resumeBackfill}>
                <Play className="h-4 w-4 mr-2" />
                Resume
              </Button>
              <Button onClick={stopBackfill} variant="destructive">
                Stop
              </Button>
            </>
          )}

          {status === 'running' && (
            <Button onClick={stopBackfill} variant="destructive" size="sm">
              Stop
            </Button>
          )}
        </div>

        {/* Stats */}
        {videoFiles.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-muted rounded-lg">
              <div className="text-2xl font-bold">{videoFiles.length}</div>
              <div className="text-xs text-muted-foreground">Total Videos</div>
            </div>
            <div className="text-center p-3 bg-muted rounded-lg">
              <div className="text-2xl font-bold text-green-600">{successCount}</div>
              <div className="text-xs text-muted-foreground">Completed</div>
            </div>
            <div className="text-center p-3 bg-muted rounded-lg">
              <div className="text-2xl font-bold text-red-600">{errorCount}</div>
              <div className="text-xs text-muted-foreground">Failed</div>
            </div>
            <div className="text-center p-3 bg-muted rounded-lg">
              <div className="text-2xl font-bold">{videoFiles.length - results.length}</div>
              <div className="text-xs text-muted-foreground">Remaining</div>
            </div>
          </div>
        )}

        {/* Overall progress */}
        {(status === 'running' || status === 'paused' || status === 'done') && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Overall progress</span>
              <span>{overallProgress}%</span>
            </div>
            <Progress value={overallProgress} />
          </div>
        )}

        {/* Current video progress */}
        {status === 'running' && currentFileName && (
          <div className="p-4 border rounded-lg bg-muted/50 space-y-2">
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm font-medium">Processing: {currentFileName}</span>
            </div>
            <Progress value={generatorState.progress} />
            <div className="text-xs text-muted-foreground">
              Stage: {generatorState.stage} • {generatorState.progress}%
            </div>
          </div>
        )}

        {/* Recent results */}
        {results.length > 0 && (
          <div className="space-y-2 max-h-60 overflow-y-auto">
            <h4 className="text-sm font-medium">Recent results</h4>
            {[...results].reverse().slice(0, 20).map((r, i) => (
              <div key={i} className="flex items-center gap-2 text-sm p-2 rounded bg-muted/30">
                {r.status === 'success' ? (
                  <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0" />
                )}
                <span className="truncate flex-1">{r.fileName}</span>
                {r.error && (
                  <Badge variant="destructive" className="text-xs">{r.error.substring(0, 40)}</Badge>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Warning */}
        <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg text-sm">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-yellow-800 dark:text-yellow-200">Important notes:</p>
              <ul className="list-disc list-inside text-yellow-700 dark:text-yellow-300 mt-1 space-y-1">
                <li>Keep this tab open — processing happens in the browser</li>
                <li>Each video plays in real-time for watermark baking (a 30s video takes ~30s)</li>
                <li>You can pause/resume at any time</li>
                <li>Failed videos can be retried by running backfill again</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
