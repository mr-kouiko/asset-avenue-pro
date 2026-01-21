import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface SupportTicket {
  id: string;
  user_id: string | null;
  email: string;
  subject: string;
  message: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
}

interface TicketInput {
  email: string;
  subject: string;
  message: string;
}

export const useSupportTickets = () => {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchUserTickets = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('support_tickets')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTickets((data || []) as SupportTicket[]);
    } catch (error) {
      console.error('Error fetching tickets:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const submitTicket = useCallback(async (input: TicketInput): Promise<boolean> => {
    setSubmitting(true);
    try {
      // Create ticket in database
      const { error: ticketError } = await supabase
        .from('support_tickets')
        .insert({
          user_id: user?.id || null,
          email: input.email,
          subject: input.subject,
          message: input.message
        });

      if (ticketError) throw ticketError;

      // Send email notification to admin via edge function
      const { error: emailError } = await supabase.functions.invoke('submit-support-ticket', {
        body: {
          email: input.email,
          subject: input.subject,
          message: input.message,
          userId: user?.id
        }
      });

      if (emailError) {
        console.error('Email notification failed:', emailError);
        // Don't fail the whole operation if email fails
      }

      toast.success('Support ticket submitted successfully');
      return true;
    } catch (error) {
      console.error('Error submitting ticket:', error);
      toast.error('Failed to submit support ticket');
      return false;
    } finally {
      setSubmitting(false);
    }
  }, [user]);

  // Admin functions
  const fetchAllTickets = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('support_tickets')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTickets((data || []) as SupportTicket[]);
    } catch (error) {
      console.error('Error fetching all tickets:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateTicketStatus = useCallback(async (
    ticketId: string, 
    status: SupportTicket['status'],
    adminNotes?: string
  ): Promise<boolean> => {
    try {
      const updateData: any = { 
        status, 
        updated_at: new Date().toISOString() 
      };
      
      if (adminNotes !== undefined) {
        updateData.admin_notes = adminNotes;
      }
      
      if (status === 'resolved') {
        updateData.resolved_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('support_tickets')
        .update(updateData)
        .eq('id', ticketId);

      if (error) throw error;

      setTickets(prev => prev.map(t => 
        t.id === ticketId ? { ...t, ...updateData } : t
      ));

      toast.success('Ticket updated');
      return true;
    } catch (error) {
      console.error('Error updating ticket:', error);
      toast.error('Failed to update ticket');
      return false;
    }
  }, []);

  return {
    tickets,
    loading,
    submitting,
    fetchUserTickets,
    fetchAllTickets,
    submitTicket,
    updateTicketStatus
  };
};
