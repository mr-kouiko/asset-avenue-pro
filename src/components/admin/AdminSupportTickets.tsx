import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { MessageSquare, Clock, CheckCircle, XCircle, AlertTriangle, Eye } from "lucide-react";
import { toast } from "sonner";

interface Ticket {
  id: string;
  email: string;
  subject: string;
  message: string;
  status: string;
  priority: string | null;
  admin_notes: string | null;
  created_at: string | null;
  updated_at: string | null;
  resolved_at: string | null;
}

export const AdminSupportTickets = () => {
  const queryClient = useQueryClient();
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const { data: tickets, isLoading } = useQuery({
    queryKey: ['admin-support-tickets'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('support_tickets')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Ticket[];
    }
  });

  const updateTicketMutation = useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status: string; notes?: string }) => {
      const updates: any = { 
        status,
        updated_at: new Date().toISOString()
      };
      
      if (notes !== undefined) {
        updates.admin_notes = notes;
      }
      
      if (status === 'resolved') {
        updates.resolved_at = new Date().toISOString();
      }
      
      const { error } = await supabase
        .from('support_tickets')
        .update(updates)
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-support-tickets'] });
      toast.success('Ticket updated successfully');
      setSelectedTicket(null);
    },
    onError: () => {
      toast.error('Failed to update ticket');
    }
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open': return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'in_progress': return <AlertTriangle className="h-4 w-4 text-blue-500" />;
      case 'resolved': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'closed': return <XCircle className="h-4 w-4 text-gray-500" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      open: "destructive",
      in_progress: "default",
      resolved: "secondary",
      closed: "outline"
    };
    return <Badge variant={variants[status] || "outline"}>{status.replace('_', ' ')}</Badge>;
  };

  const getPriorityBadge = (priority: string | null) => {
    if (!priority) return null;
    const colors: Record<string, string> = {
      low: "bg-gray-100 text-gray-700",
      medium: "bg-yellow-100 text-yellow-700",
      high: "bg-orange-100 text-orange-700",
      urgent: "bg-red-100 text-red-700"
    };
    return <Badge className={colors[priority] || ""}>{priority}</Badge>;
  };

  const filteredTickets = tickets?.filter(ticket => 
    filterStatus === 'all' || ticket.status === filterStatus
  );

  const handleUpdateTicket = (status: string) => {
    if (!selectedTicket) return;
    updateTicketMutation.mutate({
      id: selectedTicket.id,
      status,
      notes: adminNotes || selectedTicket.admin_notes || undefined
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Support Tickets
        </CardTitle>
        <CardDescription>
          Manage customer support requests
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
              <SelectItem value="all">All Tickets</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
          <Badge variant="outline">
            {filteredTickets?.length || 0} tickets
          </Badge>
        </div>

        {isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto" />
          </div>
        ) : !filteredTickets?.length ? (
          <div className="text-center py-8 text-muted-foreground">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No support tickets found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredTickets.map((ticket) => (
              <div key={ticket.id} className="flex items-start justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    {getStatusIcon(ticket.status)}
                    <h4 className="font-medium">{ticket.subject}</h4>
                    {getStatusBadge(ticket.status)}
                    {getPriorityBadge(ticket.priority)}
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                    {ticket.message}
                  </p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>{ticket.email}</span>
                    <span>{new Date(ticket.created_at || '').toLocaleDateString()}</span>
                  </div>
                </div>
                
                <Dialog>
                  <DialogTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        setSelectedTicket(ticket);
                        setAdminNotes(ticket.admin_notes || '');
                      }}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>{ticket.subject}</DialogTitle>
                      <DialogDescription>
                        From: {ticket.email} • {new Date(ticket.created_at || '').toLocaleString()}
                      </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-4 py-4">
                      <div>
                        <h4 className="font-medium mb-2">Message</h4>
                        <p className="text-sm text-muted-foreground bg-muted p-4 rounded-lg">
                          {ticket.message}
                        </p>
                      </div>
                      
                      <div>
                        <h4 className="font-medium mb-2">Admin Notes</h4>
                        <Textarea
                          value={adminNotes}
                          onChange={(e) => setAdminNotes(e.target.value)}
                          placeholder="Add internal notes..."
                          rows={3}
                        />
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleUpdateTicket('in_progress')}
                          disabled={updateTicketMutation.isPending}
                        >
                          Mark In Progress
                        </Button>
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => handleUpdateTicket('resolved')}
                          disabled={updateTicketMutation.isPending}
                        >
                          Mark Resolved
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleUpdateTicket('closed')}
                          disabled={updateTicketMutation.isPending}
                        >
                          Close Ticket
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
