import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2025-08-27.basil',
});

serve(async (req) => {
  const signature = req.headers.get('stripe-signature');
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

  if (!signature || !webhookSecret) {
    console.error('Missing signature or webhook secret');
    return new Response('Webhook Error', { status: 400 });
  }

  try {
    const body = await req.text();
    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    
    console.log('Webhook event received:', event.type);

    // Handle successful payment
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      
      console.log('Processing completed checkout session:', session.id);
      console.log('Metadata:', session.metadata);

      if (session.payment_status === 'paid' && session.metadata) {
        const { user_id, credits_amount } = session.metadata;
        
        if (!user_id || !credits_amount) {
          console.error('Missing metadata:', session.metadata);
          return new Response('Missing metadata', { status: 400 });
        }

        // Use service role to add credits
        const supabaseAdmin = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        console.log(`Adding ${credits_amount} credits to user ${user_id}`);

        // Call add_user_credits function
        const { data, error } = await supabaseAdmin.rpc('add_user_credits', {
          user_id_param: user_id,
          amount_param: parseInt(credits_amount)
        });

        if (error) {
          console.error('Error adding credits:', error);
          return new Response('Error adding credits', { status: 500 });
        }

        console.log('Credits added successfully:', data);

        // Log transaction for audit
        const { error: logError } = await supabaseAdmin
          .from('security_audit_log')
          .insert({
            event_type: 'credits_purchased',
            user_id: user_id,
            target_table: 'user_credits',
            details: {
              credits_amount: parseInt(credits_amount),
              stripe_session_id: session.id,
              amount_paid: session.amount_total,
              currency: session.currency,
              payment_status: session.payment_status,
              timestamp: new Date().toISOString()
            }
          });

        if (logError) {
          console.error('Error logging transaction:', logError);
        }
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(
      `Webhook Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      { status: 400 }
    );
  }
});
