import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const CREDIT_PACKS = {
  'starter': { credits: 10, price_id: 'price_1SRVH3E1WmLZlNfP1532VaTg' },
  'pro': { credits: 50, price_id: 'price_1SRVIyE1WmLZlNfPzw44un7D' },
  'premium': { credits: 100, price_id: 'price_1SRVNSE1WmLZlNfP7STJnmwg' },
  'ultimate': { credits: 500, price_id: 'price_1SRVNSE1WmLZlNfP7STJnmwg' }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('create-credits-payment: Function started');

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

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user?.email) {
      throw new Error('User not authenticated');
    }

    console.log('User authenticated:', user.id);

    // Get pack from request
    const { pack } = await req.json();
    if (!pack || !CREDIT_PACKS[pack as keyof typeof CREDIT_PACKS]) {
      throw new Error('Invalid pack selected');
    }

    const selectedPack = CREDIT_PACKS[pack as keyof typeof CREDIT_PACKS];
    console.log('Selected pack:', pack, selectedPack);

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2025-08-27.basil',
    });

    // Check if customer exists
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      console.log('Existing customer found:', customerId);
    } else {
      console.log('No existing customer, will create at checkout');
    }

    // Create checkout session
    const origin = req.headers.get('origin') || 'http://localhost:5173';
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [{
        price: selectedPack.price_id,
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${origin}/payment-success?session_id={CHECKOUT_SESSION_ID}&type=credits`,
      cancel_url: `${origin}/buy-credits?canceled=true`,
      metadata: {
        user_id: user.id,
        credits_amount: selectedPack.credits.toString(),
        pack_type: pack
      }
    });

    console.log('Checkout session created:', session.id);

    return new Response(
      JSON.stringify({ url: session.url, sessionId: session.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in create-credits-payment:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
