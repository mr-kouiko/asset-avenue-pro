import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Loader2, RefreshCw, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { useExistingFilesProcessor } from '@/hooks/useExistingFilesProcessor';
import { toast } from 'sonner';

interface ProcessingStats {
  processed: number;
  failed: number;
  skipped: number;
  errors: string[];
}

export const ExistingFilesProcessor = () => {
  const { isProcessing, progress, processAllExistingFiles } = useExistingFilesProcessor();
  const [lastResult, setLastResult] = useState<ProcessingStats | null>(null);

  const handleProcessFiles = async () => {
    try {
      const result = await processAllExistingFiles();
      setLastResult(result);
    } catch (error) {
      console.error('Processing error:', error);
      toast.error('Failed to process existing files');
    }
  };

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Process Existing Files</h3>
            <p className="text-sm text-muted-foreground">
              Generate watermarks and thumbnails for files without them
            </p>
          </div>
          
          <Button 
            onClick={handleProcessFiles}
            disabled={isProcessing}
            className="flex items-center gap-2"
          >
            {isProcessing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            {isProcessing ? 'Processing...' : 'Process Files'}
          </Button>
        </div>

        {isProcessing && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Processing existing files...</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        {lastResult && !isProcessing && (
          <div className="space-y-3">
            <h4 className="font-medium">Last Processing Results:</h4>
            
            <div className="flex flex-wrap gap-2">
              {lastResult.processed > 0 && (
                <Badge variant="default" className="flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" />
                  {lastResult.processed} Processed
                </Badge>
              )}
              
              {lastResult.skipped > 0 && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {lastResult.skipped} Skipped
                </Badge>
              )}
              
              {lastResult.failed > 0 && (
                <Badge variant="destructive" className="flex items-center gap-1">
                  <XCircle className="h-3 w-3" />
                  {lastResult.failed} Failed
                </Badge>
              )}
            </div>

            {lastResult.errors.length > 0 && (
              <div className="space-y-2">
                <h5 className="text-sm font-medium text-destructive">Errors:</h5>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {lastResult.errors.map((error, index) => (
                    <div key={index} className="text-xs text-destructive bg-destructive/10 p-2 rounded">
                      {error}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="text-xs text-muted-foreground">
          <p>This tool will:</p>
          <ul className="list-disc list-inside space-y-1 mt-1">
            <li>Generate watermarked versions for images (30-40% logo size)</li>
            <li>Create thumbnails for all file types</li>
            <li>Generate previews for supported formats</li>
            <li>Skip files that already have watermarks and thumbnails</li>
            <li>Automatically detect MIME types and upload with correct headers</li>
          </ul>
        </div>
      </div>
    </Card>
  );
};