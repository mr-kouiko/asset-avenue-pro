import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase with service role
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Use secure environment variables from Supabase secrets
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY") || "";
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET") || "";
    
    if (!stripeSecretKey) {
      return new Response(
        JSON.stringify({ error: "Stripe configuration missing" }),
        { status: 500, headers: corsHeaders }
      );
    }

    // Initialize Stripe
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2023-10-16",
    });

    const signature = req.headers.get("stripe-signature");

    if (!signature || !webhookSecret) {
      console.error("Missing signature or webhook secret");
      return new Response("Missing signature", { status: 400 });
    }

    const body = await req.text();
    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error("Webhook signature verification failed:", err);
      return new Response("Invalid signature", { status: 400 });
    }

    console.log("Processing webhook:", event.type, event.id);

    switch (event.type) {
      case 'account.updated': {
        const account = event.data.object as Stripe.Account;
        
        // Update Stripe account status in database
        const { error } = await supabase
          .from('stripe_accounts')
          .update({
            charges_enabled: account.charges_enabled,
            payouts_enabled: account.payouts_enabled,
            onboarding_completed: account.details_submitted,
            requirements: account.requirements,
            updated_at: new Date().toISOString()
          })
          .eq('stripe_account_id', account.id);

        if (error) {
          console.error("Failed to update account:", error);
        } else {
          console.log("Updated account:", account.id);
        }
        break;
      }

      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        
        // Get session to extract metadata
        const sessions = await stripe.checkout.sessions.list({
          payment_intent: paymentIntent.id,
          limit: 1
        });

        if (sessions.data.length === 0) {
          console.log("No session found for payment intent:", paymentIntent.id);
          break;
        }

        const session = sessions.data[0];
        const buyerId = session.metadata?.buyer_id;
        const sellerId = session.metadata?.seller_id;
        const submissionIds = session.metadata?.submission_ids?.split(',') || [];

        if (!buyerId || !sellerId || submissionIds.length === 0) {
          console.error("Missing metadata in session:", session.id);
          break;
        }

        const totalAmount = paymentIntent.amount;
        const commissionAmount = paymentIntent.application_fee_amount || 0;
        const sellerAmount = totalAmount - commissionAmount;

        // Create transaction record
        const { error: transactionError } = await supabase
          .from('transactions')
          .insert({
            stripe_payment_intent_id: paymentIntent.id,
            buyer_id: buyerId,
            seller_id: sellerId,
            stripe_account_id: paymentIntent.transfer_data?.destination || '',
            submission_id: submissionIds[0], // For now, single submission
            amount_total: totalAmount,
            amount_seller: sellerAmount,
            amount_commission: commissionAmount,
            currency: paymentIntent.currency,
            status: 'succeeded',
            payment_method_types: paymentIntent.payment_method_types,
            metadata: {
              session_id: session.id,
              submission_ids: submissionIds
            }
          });

        if (transactionError) {
          console.error("Failed to create transaction:", transactionError);
          break;
        }

        // Create download records for each submission
        for (const submissionId of submissionIds) {
          const { error: downloadError } = await supabase
            .from('downloads')
            .insert({
              user_id: buyerId,
              submission_id: submissionId,
              license_id: null, // TODO: Extract from line items
              expires_at: null // Permanent access for purchased content
            });

          if (downloadError) {
            console.error("Failed to create download record:", downloadError);
          }
        }

        console.log("Successfully processed payment:", paymentIntent.id);
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        
        // Update transaction status
        const { error } = await supabase
          .from('transactions')
          .update({ 
            status: 'failed',
            updated_at: new Date().toISOString()
          })
          .eq('stripe_payment_intent_id', paymentIntent.id);

        if (error) {
          console.error("Failed to update failed payment:", error);
        }
        break;
      }

      case 'payout.paid': {
        const payout = event.data.object as Stripe.Payout;
        
        // Update payout status
        const { error } = await supabase
          .from('payouts')
          .update({ 
            status: 'paid',
            arrival_date: new Date(payout.arrival_date * 1000).toISOString(),
            method: payout.method,
            updated_at: new Date().toISOString()
          })
          .eq('stripe_payout_id', payout.id);

        if (error) {
          console.error("Failed to update payout:", error);
        }
        break;
      }

      case 'payout.failed': {
        const payout = event.data.object as Stripe.Payout;
        
        // Update payout status
        const { error } = await supabase
          .from('payouts')
          .update({ 
            status: 'failed',
            updated_at: new Date().toISOString()
          })
          .eq('stripe_payout_id', payout.id);

        if (error) {
          console.error("Failed to update failed payout:", error);
        }
        break;
      }

      default:
        console.log("Unhandled webhook event:", event.type);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200
    });

  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});