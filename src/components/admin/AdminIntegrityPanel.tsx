import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Database, 
  FileWarning, 
  HardDrive,
  Play,
  RefreshCw,
  Settings,
  Shield,
  Trash2,
  UserPlus,
  XCircle,
  Info,
  Archive
} from "lucide-react";
import { useIntegrityScanner, IntegrityIssue, IntegrityScan } from "@/hooks/useIntegrityScanner";
import { formatDistanceToNow } from "date-fns";

export function AdminIntegrityPanel() {
  const {
    scans,
    issues,
    config,
    stats,
    isLoading,
    isScanning,
    triggerScan,
    updateIssue,
    updateConfig,
    refetch
  } = useIntegrityScanner();

  const [selectedIssue, setSelectedIssue] = useState<IntegrityIssue | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [reassignUserId, setReassignUserId] = useState("");
  const [showConfigDialog, setShowConfigDialog] = useState(false);

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" /> Critical</Badge>;
      case 'warning':
        return <Badge variant="secondary" className="gap-1 bg-yellow-100 text-yellow-800"><AlertTriangle className="h-3 w-3" /> Warning</Badge>;
      default:
        return <Badge variant="outline" className="gap-1"><Info className="h-3 w-3" /> Info</Badge>;
    }
  };

  const getIssueTypeIcon = (type: string) => {
    switch (type) {
      case 'orphaned_file':
        return <FileWarning className="h-4 w-4 text-orange-500" />;
      case 'broken_record':
        return <Database className="h-4 w-4 text-red-500" />;
      case 'stuck_upload':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const getIssueTypeLabel = (type: string) => {
    switch (type) {
      case 'orphaned_file':
        return 'Orphaned File';
      case 'broken_record':
        return 'Broken Record';
      case 'stuck_upload':
        return 'Stuck Upload';
      default:
        return type;
    }
  };

  const handleResolveIssue = (action: string) => {
    if (!selectedIssue) return;
    
    updateIssue({
      issueId: selectedIssue.id,
      status: 'resolved',
      action,
      notes: resolutionNotes
    });
    
    setSelectedIssue(null);
    setResolutionNotes("");
  };

  const handleIgnoreIssue = () => {
    if (!selectedIssue) return;
    
    updateIssue({
      issueId: selectedIssue.id,
      status: 'ignored',
      action: 'ignored',
      notes: resolutionNotes
    });
    
    setSelectedIssue(null);
    setResolutionNotes("");
  };

  const formatScanDuration = (ms: number | null) => {
    if (!ms) return '-';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Issues</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Shield className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-orange-500">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Orphaned Files</p>
                <p className="text-2xl font-bold text-orange-600">{stats.orphaned}</p>
              </div>
              <FileWarning className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-red-500">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Broken Records</p>
                <p className="text-2xl font-bold text-red-600">{stats.broken}</p>
              </div>
              <Database className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-yellow-500">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Stuck Uploads</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.stuck}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-destructive">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Critical</p>
                <p className="text-2xl font-bold text-destructive">{stats.critical}</p>
              </div>
              <XCircle className="h-8 w-8 text-destructive" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button 
            onClick={() => triggerScan()} 
            disabled={isScanning}
            className="gap-2"
          >
            {isScanning ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            {isScanning ? 'Scanning...' : 'Run Manual Scan'}
          </Button>
          
          <Button variant="outline" onClick={() => refetch()} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
        
        <Button variant="outline" onClick={() => setShowConfigDialog(true)} className="gap-2">
          <Settings className="h-4 w-4" />
          Scanner Settings
        </Button>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="issues">
        <TabsList>
          <TabsTrigger value="issues" className="gap-2">
            <AlertTriangle className="h-4 w-4" />
            Open Issues ({stats.total})
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <Archive className="h-4 w-4" />
            Scan History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="issues" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Active Integrity Issues</CardTitle>
              <CardDescription>
                Files and records requiring attention. All actions are logged and reversible.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {issues && issues.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Severity</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>File/Record</TableHead>
                      <TableHead>Age</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {issues.map((issue) => (
                      <TableRow key={issue.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getIssueTypeIcon(issue.issue_type)}
                            <span className="text-sm">{getIssueTypeLabel(issue.issue_type)}</span>
                          </div>
                        </TableCell>
                        <TableCell>{getSeverityBadge(issue.severity)}</TableCell>
                        <TableCell className="max-w-xs truncate">{issue.description}</TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div className="font-medium truncate max-w-[200px]">{issue.file_name || '-'}</div>
                            {issue.bucket_name && (
                              <div className="text-muted-foreground text-xs">{issue.bucket_name}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {issue.age_hours ? `${issue.age_hours}h` : '-'}
                        </TableCell>
                        <TableCell>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => setSelectedIssue(issue)}
                          >
                            Resolve
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12">
                  <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
                  <p className="text-muted-foreground">No integrity issues detected</p>
                  <p className="text-sm text-muted-foreground mt-1">All files and records are synchronized</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Scan History</CardTitle>
              <CardDescription>
                Record of all integrity scans, both scheduled and manual
              </CardDescription>
            </CardHeader>
            <CardContent>
              {scans && scans.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Started</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Trigger</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Orphaned</TableHead>
                      <TableHead>Broken</TableHead>
                      <TableHead>Stuck</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {scans.map((scan) => (
                      <TableRow key={scan.id}>
                        <TableCell>
                          <div className="text-sm">
                            {formatDistanceToNow(new Date(scan.started_at), { addSuffix: true })}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={
                              scan.status === 'completed' ? 'default' : 
                              scan.status === 'failed' ? 'destructive' : 'secondary'
                            }
                          >
                            {scan.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {scan.triggered_by === 'cron' ? 'Scheduled' : 'Manual'}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatScanDuration(scan.scan_duration_ms)}</TableCell>
                        <TableCell>{scan.orphaned_files_count}</TableCell>
                        <TableCell>{scan.broken_records_count}</TableCell>
                        <TableCell>{scan.stuck_uploads_count}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <HardDrive className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No scans have been performed yet</p>
                  <Button className="mt-4" onClick={() => triggerScan()}>
                    Run First Scan
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Issue Resolution Dialog */}
      <Dialog open={!!selectedIssue} onOpenChange={() => setSelectedIssue(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedIssue && getIssueTypeIcon(selectedIssue.issue_type)}
              Resolve Issue
            </DialogTitle>
            <DialogDescription>
              Choose an action to resolve this integrity issue. All actions are logged.
            </DialogDescription>
          </DialogHeader>

          {selectedIssue && (
            <div className="space-y-4">
              <div className="bg-muted p-3 rounded-lg space-y-2">
                <div className="flex items-center gap-2">
                  {getSeverityBadge(selectedIssue.severity)}
                  <span className="text-sm font-medium">{getIssueTypeLabel(selectedIssue.issue_type)}</span>
                </div>
                <p className="text-sm">{selectedIssue.description}</p>
                {selectedIssue.file_name && (
                  <p className="text-xs text-muted-foreground">File: {selectedIssue.file_name}</p>
                )}
                {selectedIssue.file_path && (
                  <p className="text-xs text-muted-foreground truncate">Path: {selectedIssue.file_path}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Resolution Notes (optional)</Label>
                <Textarea
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="Add notes about this resolution..."
                  rows={3}
                />
              </div>

              {selectedIssue.issue_type === 'orphaned_file' && (
                <div className="space-y-2">
                  <Label>Reassign to User ID (optional)</Label>
                  <Input
                    value={reassignUserId}
                    onChange={(e) => setReassignUserId(e.target.value)}
                    placeholder="Enter seller user ID to reassign..."
                  />
                </div>
              )}
            </div>
          )}

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={handleIgnoreIssue}
              className="gap-2"
            >
              <XCircle className="h-4 w-4" />
              Ignore
            </Button>
            
            {selectedIssue?.issue_type === 'orphaned_file' && reassignUserId && (
              <Button
                variant="secondary"
                onClick={() => handleResolveIssue('reassigned')}
                className="gap-2"
              >
                <UserPlus className="h-4 w-4" />
                Reassign
              </Button>
            )}
            
            {selectedIssue?.issue_type === 'stuck_upload' && (
              <Button
                variant="secondary"
                onClick={() => handleResolveIssue('reprocessed')}
                className="gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Mark Reprocessed
              </Button>
            )}
            
            <Button
              onClick={() => handleResolveIssue('marked_resolved')}
              className="gap-2"
            >
              <CheckCircle className="h-4 w-4" />
              Mark Resolved
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Scanner Config Dialog */}
      <Dialog open={showConfigDialog} onOpenChange={setShowConfigDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Scanner Configuration</DialogTitle>
            <DialogDescription>
              Configure the automatic integrity scanner settings
            </DialogDescription>
          </DialogHeader>

          {config && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Enable Automatic Scanning</Label>
                  <p className="text-sm text-muted-foreground">Run scheduled integrity checks</p>
                </div>
                <Switch
                  checked={config.enabled}
                  onCheckedChange={(enabled) => updateConfig({ enabled })}
                />
              </div>

              <div className="space-y-2">
                <Label>Scan Interval (minutes)</Label>
                <Input
                  type="number"
                  value={config.scan_interval_minutes}
                  onChange={(e) => updateConfig({ scan_interval_minutes: parseInt(e.target.value) })}
                  min={15}
                  max={1440}
                />
                <p className="text-xs text-muted-foreground">
                  How often the scanner runs (min: 15, max: 1440)
                </p>
              </div>

              <div className="space-y-2">
                <Label>Stuck Upload Timeout (hours)</Label>
                <Input
                  type="number"
                  value={config.stuck_upload_timeout_hours}
                  onChange={(e) => updateConfig({ stuck_upload_timeout_hours: parseInt(e.target.value) })}
                  min={1}
                  max={168}
                />
                <p className="text-xs text-muted-foreground">
                  Flag uploads as stuck after this many hours
                </p>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Notify on Critical Issues</Label>
                  <p className="text-sm text-muted-foreground">Alert when critical issues are found</p>
                </div>
                <Switch
                  checked={config.notify_on_critical}
                  onCheckedChange={(notify_on_critical) => updateConfig({ notify_on_critical })}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfigDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
