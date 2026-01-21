import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SupportTicketRequest {
  email: string;
  subject: string;
  message: string;
  userId?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const resendApiKey = Deno.env.get('RESEND_API_KEY');

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { email, subject, message, userId }: SupportTicketRequest = await req.json();

    console.log('Processing support ticket:', { email, subject, userId });

    // Get admin user IDs to create notifications
    const { data: adminRoles } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'admin');

    // Create notifications for all admins
    if (adminRoles && adminRoles.length > 0) {
      const notifications = adminRoles.map(admin => ({
        user_id: admin.user_id,
        type: 'support',
        title: `New Support Ticket: ${subject}`,
        message: `From: ${email}`,
        link: '/admin?tab=support'
      }));

      const { error: notifError } = await supabase
        .from('notifications')
        .insert(notifications);

      if (notifError) {
        console.error('Error creating admin notifications:', notifError);
      }
    }

    // Send email notification if Resend is configured
    if (resendApiKey) {
      try {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${resendApiKey}`,
          },
          body: JSON.stringify({
            from: 'VisuStock Support <noreply@visustock.com>',
            to: ['admin@visustock.com'],
            subject: `[Support Ticket] ${subject}`,
            html: `
              <h2>New Support Ticket</h2>
              <p><strong>From:</strong> ${email}</p>
              <p><strong>Subject:</strong> ${subject}</p>
              <p><strong>User ID:</strong> ${userId || 'Guest'}</p>
              <hr />
              <h3>Message:</h3>
              <p>${message.replace(/\n/g, '<br />')}</p>
            `,
          }),
        });

        if (!res.ok) {
          const errorText = await res.text();
          console.error('Resend API error:', errorText);
        }
      } catch (emailError) {
        console.error('Email sending failed:', emailError);
      }
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Support ticket submitted' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing support ticket:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
