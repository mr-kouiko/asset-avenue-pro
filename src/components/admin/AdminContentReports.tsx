import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Flag, Clock, CheckCircle, XCircle, Eye, AlertTriangle, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

interface Report {
  id: string;
  submission_id: string;
  reporter_id: string | null;
  reporter_email: string | null;
  reason: string;
  details: string | null;
  status: string;
  admin_notes: string | null;
  created_at: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  content_submissions?: {
    title: string;
    slug: string | null;
  };
}

export const AdminContentReports = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const { data: reports, isLoading } = useQuery({
    queryKey: ['admin-content-reports'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('content_reports')
        .select(`
          *,
          content_submissions(title, slug)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Report[];
    }
  });

  const updateReportMutation = useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status: string; notes?: string }) => {
      const updates: any = { 
        status,
        reviewed_at: new Date().toISOString(),
        reviewed_by: user?.id
      };
      
      if (notes !== undefined) {
        updates.admin_notes = notes;
      }
      
      const { error } = await supabase
        .from('content_reports')
        .update(updates)
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-content-reports'] });
      toast.success('Report updated successfully');
      setSelectedReport(null);
    },
    onError: () => {
      toast.error('Failed to update report');
    }
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'reviewing': return <AlertTriangle className="h-4 w-4 text-blue-500" />;
      case 'resolved': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'dismissed': return <XCircle className="h-4 w-4 text-gray-500" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pending: "destructive",
      reviewing: "default",
      resolved: "secondary",
      dismissed: "outline"
    };
    return <Badge variant={variants[status] || "outline"}>{status}</Badge>;
  };

  const getReasonBadge = (reason: string) => {
    const colors: Record<string, string> = {
      copyright: "bg-red-100 text-red-700",
      inappropriate: "bg-orange-100 text-orange-700",
      misleading: "bg-yellow-100 text-yellow-700",
      spam: "bg-purple-100 text-purple-700",
      other: "bg-gray-100 text-gray-700"
    };
    return <Badge className={colors[reason] || "bg-gray-100 text-gray-700"}>{reason}</Badge>;
  };

  const filteredReports = reports?.filter(report => 
    filterStatus === 'all' || report.status === filterStatus
  );

  const handleUpdateReport = (status: string) => {
    if (!selectedReport) return;
    updateReportMutation.mutate({
      id: selectedReport.id,
      status,
      notes: adminNotes || selectedReport.admin_notes || undefined
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Flag className="h-5 w-5" />
          Content Reports
        </CardTitle>
        <CardDescription>
          Review flagged content from users
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Filter */}
        <div className="flex items-center gap-4 mb-6">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Reports</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="reviewing">Reviewing</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="dismissed">Dismissed</SelectItem>
            </SelectContent>
          </Select>
          <Badge variant="outline">
            {filteredReports?.length || 0} reports
          </Badge>
        </div>

        {isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto" />
          </div>
        ) : !filteredReports?.length ? (
          <div className="text-center py-8 text-muted-foreground">
            <Flag className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No content reports found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredReports.map((report) => (
              <div key={report.id} className="flex items-start justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    {getStatusIcon(report.status)}
                    <h4 className="font-medium">
                      {report.content_submissions?.title || 'Unknown Content'}
                    </h4>
                    {getStatusBadge(report.status)}
                    {getReasonBadge(report.reason)}
                  </div>
                  {report.details && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                      {report.details}
                    </p>
                  )}
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>Reported by: {report.reporter_email || 'Anonymous'}</span>
                    <span>{new Date(report.created_at || '').toLocaleDateString()}</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {report.content_submissions?.slug && (
                    <Button variant="outline" size="sm" asChild>
                      <Link to={`/products/${report.content_submissions.slug}`} target="_blank">
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                    </Button>
                  )}
                  
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          setSelectedReport(report);
                          setAdminNotes(report.admin_notes || '');
                        }}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Review
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Review Report</DialogTitle>
                        <DialogDescription>
                          Content: {report.content_submissions?.title || 'Unknown'} • Reported: {new Date(report.created_at || '').toLocaleString()}
                        </DialogDescription>
                      </DialogHeader>
                      
                      <div className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <h4 className="font-medium mb-2">Reason</h4>
                            {getReasonBadge(report.reason)}
                          </div>
                          <div>
                            <h4 className="font-medium mb-2">Reporter</h4>
                            <p className="text-sm text-muted-foreground">
                              {report.reporter_email || 'Anonymous'}
                            </p>
                          </div>
                        </div>
                        
                        {report.details && (
                          <div>
                            <h4 className="font-medium mb-2">Details</h4>
                            <p className="text-sm text-muted-foreground bg-muted p-4 rounded-lg">
                              {report.details}
                            </p>
                          </div>
                        )}
                        
                        <div>
                          <h4 className="font-medium mb-2">Admin Notes</h4>
                          <Textarea
                            value={adminNotes}
                            onChange={(e) => setAdminNotes(e.target.value)}
                            placeholder="Add review notes..."
                            rows={3}
                          />
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleUpdateReport('reviewing')}
                            disabled={updateReportMutation.isPending}
                          >
                            Mark Reviewing
                          </Button>
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => handleUpdateReport('resolved')}
                            disabled={updateReportMutation.isPending}
                          >
                            Resolve (Take Action)
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleUpdateReport('dismissed')}
                            disabled={updateReportMutation.isPending}
                          >
                            Dismiss
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
