import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, FileArchive, RefreshCw, Video, Clock, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface UnexportedPreview {
  id: string;
  submission_id: string;
  file_name: string;
  preview_path: string;
  file_size: number;
  created_at: string;
}

interface ExportHistory {
  export_batch_id: string;
  admin_id: string;
  exported_at: string;
  platform: string;
  video_count: number;
  total_size: number;
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const AdminBulkExport = () => {
  const queryClient = useQueryClient();
  const [isExporting, setIsExporting] = useState(false);

  // Fetch unexported previews count
  const { data: unexportedPreviews, isLoading: loadingPreviews, refetch: refetchPreviews } = useQuery({
    queryKey: ['admin-unexported-previews'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_unexported_watermarked_previews');
      if (error) throw error;
      return (data as UnexportedPreview[]) || [];
    }
  });

  // Fetch export history
  const { data: exportHistory, isLoading: loadingHistory, refetch: refetchHistory } = useQuery({
    queryKey: ['admin-export-history'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_watermark_export_history');
      if (error) throw error;
      return (data as ExportHistory[]) || [];
    }
  });

  // Bulk export mutation - processes in batches of 25 to avoid timeout
  const exportMutation = useMutation({
    mutationFn: async () => {
      setIsExporting(true);
      
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        throw new Error('Not authenticated');
      }

      // Export in batch of 25 videos max to avoid CPU timeout
      const response = await supabase.functions.invoke('bulk-export-watermarks', {
        body: { platform: 'admin_dashboard', format: 'mp4', batchSize: 25 }
      });

      if (response.error) {
        throw new Error(response.error.message || 'Export failed');
      }

      // Check if we got a JSON response (no new videos) or a blob (ZIP file)
      const contentType = response.data?.constructor?.name;
      
      if (contentType === 'Blob' || response.data instanceof Blob) {
        // It's a ZIP file - trigger download
        const blob = response.data as Blob;
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        a.download = `watermarked-previews-${timestamp}.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        // Check remaining count from headers (if available via data attributes)
        return { success: true, isZip: true, count: 25 };
      } else {
        // It's a JSON response
        return response.data;
      }
    },
    onSuccess: (result) => {
      if (result?.count === 0) {
        toast.info('No new watermarked previews to export');
      } else if (result?.isZip) {
        const remainingCount = (unexportedCount || 0) - 25;
        if (remainingCount > 0) {
          toast.success(`Batch exported! ${remainingCount} videos remaining. Click again to export more.`);
        } else {
          toast.success('Export complete! ZIP file downloaded.');
        }
      } else {
        toast.success('Export complete!');
      }
      
      // Refresh data
      queryClient.invalidateQueries({ queryKey: ['admin-unexported-previews'] });
      queryClient.invalidateQueries({ queryKey: ['admin-export-history'] });
      refetchPreviews();
      refetchHistory();
    },
    onError: (error: Error) => {
      toast.error(`Export failed: ${error.message}`);
    },
    onSettled: () => {
      setIsExporting(false);
    }
  });

  const totalUnexportedSize = unexportedPreviews?.reduce((acc, p) => acc + (p.file_size || 0), 0) || 0;
  const unexportedCount = unexportedPreviews?.length || 0;

  return (
    <div className="space-y-6">
      {/* Export Action Card */}
      <Card className="border-l-4 border-l-primary">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileArchive className="h-5 w-5" />
            Bulk Export Watermarked Previews
          </CardTitle>
          <CardDescription>
            Export all new watermarked video previews that haven't been exported yet. Each export generates a single ZIP file.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">{unexportedCount}</div>
                <div className="text-sm text-muted-foreground">Vidéos à exporter</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold">{formatFileSize(totalUnexportedSize)}</div>
                <div className="text-sm text-muted-foreground">Taille estimée</div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  refetchPreviews();
                  refetchHistory();
                }}
                disabled={loadingPreviews || loadingHistory}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loadingPreviews ? 'animate-spin' : ''}`} />
                Actualiser
              </Button>
              
              <Button
                onClick={() => exportMutation.mutate()}
                disabled={isExporting || unexportedCount === 0}
                className="min-w-[200px]"
              >
                {isExporting ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Export en cours...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Exporter en ZIP ({Math.min(unexportedCount, 25)}/{unexportedCount})
                  </>
                )}
              </Button>
            </div>
          </div>
          
          {unexportedCount === 0 && !loadingPreviews && (
            <div className="mt-4 p-4 bg-muted/50 rounded-lg flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span className="text-sm text-muted-foreground">
                Toutes les vidéos watermarkées ont été exportées. Ajoutez de nouveaux contenus pour déclencher un nouvel export.
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pending Videos Preview */}
      {unexportedCount > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Video className="h-5 w-5" />
              Vidéos en attente d'export
            </CardTitle>
            <CardDescription>
              Liste des {unexportedCount} vidéos watermarkées qui seront incluses dans le prochain export
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-h-[300px] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom du fichier</TableHead>
                    <TableHead>Taille</TableHead>
                    <TableHead>Date d'ajout</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {unexportedPreviews?.slice(0, 20).map((preview) => (
                    <TableRow key={preview.id}>
                      <TableCell className="font-medium max-w-[300px] truncate">
                        {preview.file_name}
                      </TableCell>
                      <TableCell>{formatFileSize(preview.file_size || 0)}</TableCell>
                      <TableCell>
                        {format(new Date(preview.created_at), 'dd/MM/yyyy HH:mm')}
                      </TableCell>
                    </TableRow>
                  ))}
                  {unexportedCount > 20 && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground">
                        ... et {unexportedCount - 20} autres vidéos
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Export History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Historique des exports
          </CardTitle>
          <CardDescription>
            Liste des exports précédents avec le nombre de vidéos exportées
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingHistory ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : exportHistory && exportHistory.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Batch ID</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Plateforme</TableHead>
                  <TableHead>Vidéos</TableHead>
                  <TableHead>Taille totale</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {exportHistory.map((history) => (
                  <TableRow key={history.export_batch_id}>
                    <TableCell className="font-mono text-xs">
                      {history.export_batch_id.substring(0, 8)}...
                    </TableCell>
                    <TableCell>
                      {format(new Date(history.exported_at), 'dd/MM/yyyy HH:mm')}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{history.platform}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{history.video_count} vidéos</Badge>
                    </TableCell>
                    <TableCell>{formatFileSize(history.total_size || 0)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Aucun export effectué pour le moment</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
