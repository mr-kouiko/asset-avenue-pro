import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AdminNotificationRequest {
  type: 'content_report' | 'support_ticket' | 'new_seller' | 'system';
  submission_id?: string;
  reason?: string;
  details?: string;
  reporter_email?: string;
  title?: string;
  message?: string;
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
    const request: AdminNotificationRequest = await req.json();

    console.log('Processing admin notification:', request);

    // Get admin user IDs
    const { data: adminRoles } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'admin');

    if (!adminRoles || adminRoles.length === 0) {
      console.log('No admin users found');
      return new Response(
        JSON.stringify({ success: true, message: 'No admins to notify' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let notificationTitle = '';
    let notificationMessage = '';
    let notificationLink = '/admin';

    // Build notification based on type
    switch (request.type) {
      case 'content_report':
        // Get content title
        let contentTitle = 'Unknown content';
        if (request.submission_id) {
          const { data: submission } = await supabase
            .from('content_submissions')
            .select('title')
            .eq('id', request.submission_id)
            .single();
          contentTitle = submission?.title || 'Unknown content';
        }

        const reasonLabels: Record<string, string> = {
          copyright: 'Copyright Infringement',
          inappropriate: 'Inappropriate Content',
          misleading: 'Misleading Preview',
          spam: 'Spam or Scam',
          other: 'Other Issue'
        };

        notificationTitle = `🚩 Content Reported: ${contentTitle}`;
        notificationMessage = `Reason: ${reasonLabels[request.reason || 'other']}${request.reporter_email ? ` | Reporter: ${request.reporter_email}` : ''}`;
        notificationLink = '/admin?tab=reports';
        break;

      case 'support_ticket':
        notificationTitle = request.title || '💬 New Support Ticket';
        notificationMessage = request.message || '';
        notificationLink = '/admin?tab=support';
        break;

      case 'new_seller':
        notificationTitle = '🎉 New Seller Registration';
        notificationMessage = request.message || 'A new seller has registered';
        notificationLink = '/admin?tab=vendors';
        break;

      case 'system':
      default:
        notificationTitle = request.title || '📢 System Notification';
        notificationMessage = request.message || '';
        break;
    }

    // Create notifications for all admins
    const notifications = adminRoles.map(admin => ({
      user_id: admin.user_id,
      type: 'report' as const,
      title: notificationTitle,
      message: notificationMessage,
      link: notificationLink
    }));

    const { error: notifError } = await supabase
      .from('notifications')
      .insert(notifications);

    if (notifError) {
      console.error('Error creating admin notifications:', notifError);
      throw notifError;
    }

    // Send email notification for critical items
    if (resendApiKey && (request.type === 'content_report')) {
      try {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${resendApiKey}`,
          },
          body: JSON.stringify({
            from: 'VisuStock <noreply@visustock.com>',
            to: ['admin@visustock.com'],
            subject: notificationTitle,
            html: `
              <h2>${notificationTitle}</h2>
              <p>${notificationMessage}</p>
              ${request.details ? `<h3>Additional Details:</h3><p>${request.details}</p>` : ''}
              <hr />
              <p><a href="https://asset-avenue-pro.lovable.app${notificationLink}">View in Admin Dashboard</a></p>
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

    console.log(`Created ${notifications.length} admin notifications`);

    return new Response(
      JSON.stringify({ success: true, notified: notifications.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing admin notification:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
