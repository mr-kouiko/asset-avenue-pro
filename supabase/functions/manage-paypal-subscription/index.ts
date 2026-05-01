import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PAYPAL_API_URL = Deno.env.get('PAYPAL_SANDBOX') === 'true' 
  ? 'https://api-m.sandbox.paypal.com'
  : 'https://api-m.paypal.com';

async function getPayPalAccessToken(): Promise<string> {
  const clientId = Deno.env.get('PAYPAL_CLIENT_ID');
  const clientSecret = Deno.env.get('PAYPAL_CLIENT_SECRET');
  
  if (!clientId || !clientSecret) {
    throw new Error('PayPal credentials not configured');
  }

  const auth = btoa(`${clientId}:${clientSecret}`);
  
  const response = await fetch(`${PAYPAL_API_URL}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('PayPal auth error:', error);
    throw new Error('Failed to get PayPal access token');
  }

  const data = await response.json();
  return data.access_token;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('manage-paypal-subscription: Function started');

    // Get authenticated user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    console.log('User authenticated:', user.id);

    const body = await req.json();
    const { action, subscription_id, paypal_subscription_id } = body;

    const accessToken = await getPayPalAccessToken();

    switch (action) {
      // NOTE: 'activate' branch removed — Infinity now uses the Orders API
      // (one-time payment) and is activated server-side inside
      // capture-paypal-order. PayPal Subscriptions API is no longer used.

      case 'check': {
        // Check subscription status
        console.log('Checking subscription for user:', user.id);

        const { data: subscription, error: fetchError } = await supabaseAdmin
          .from('user_subscriptions')
          .select('*')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (fetchError) {
          console.error('Error fetching subscription:', fetchError);
          throw new Error('Failed to fetch subscription');
        }

        if (!subscription) {
          return new Response(
            JSON.stringify({ subscribed: false }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Verify with PayPal if needed
        if (subscription.paypal_subscription_id) {
          const subResponse = await fetch(
            `${PAYPAL_API_URL}/v1/billing/subscriptions/${subscription.paypal_subscription_id}`,
            {
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
              },
            }
          );

          if (subResponse.ok) {
            const subData = await subResponse.json();
            
            // Update local status if different
            if (subData.status !== 'ACTIVE' && subscription.status === 'active') {
              await supabaseAdmin
                .from('user_subscriptions')
                .update({ status: subData.status.toLowerCase() })
                .eq('id', subscription.id);
              
              return new Response(
                JSON.stringify({ subscribed: false, status: subData.status }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
              );
            }
          }
        }

        return new Response(
          JSON.stringify({
            subscribed: true,
            subscription: {
              plan_type: subscription.plan_type,
              credits_per_month: subscription.credits_per_month,
              current_period_end: subscription.current_period_end,
              next_billing_date: subscription.next_billing_date,
              is_yearly: subscription.is_yearly,
            },
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'cancel': {
        // Cancel subscription
        console.log('Cancelling subscription:', subscription_id);

        const { data: subscription, error: fetchError } = await supabaseAdmin
          .from('user_subscriptions')
          .select('*')
          .eq('id', subscription_id)
          .eq('user_id', user.id)
          .single();

        if (fetchError || !subscription) {
          throw new Error('Subscription not found');
        }

        // Cancel on PayPal
        const cancelResponse = await fetch(
          `${PAYPAL_API_URL}/v1/billing/subscriptions/${subscription.paypal_subscription_id}/cancel`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ reason: 'User requested cancellation' }),
          }
        );

        if (!cancelResponse.ok && cancelResponse.status !== 204) {
          const error = await cancelResponse.text();
          console.error('PayPal cancel error:', error);
          throw new Error('Failed to cancel subscription on PayPal');
        }

        // Update local status
        await supabaseAdmin
          .from('user_subscriptions')
          .update({ status: 'cancelled' })
          .eq('id', subscription_id);

        console.log('Subscription cancelled successfully');

        return new Response(
          JSON.stringify({ success: true, message: 'Subscription cancelled' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        throw new Error('Invalid action');
    }
  } catch (error) {
    console.error('Error in manage-paypal-subscription:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
