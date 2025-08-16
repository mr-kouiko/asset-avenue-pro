import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper logging function for enhanced debugging
const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-CHECKOUT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Create Supabase client using the anon key for user authentication
  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("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");
    if (!stripeKey) throw new Error("Stripe key is not set");
    logStep("Stripe key verified");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    logStep("Authorization header found");

    const token = authHeader.replace("Bearer ", "");
    logStep("Authenticating user with token");
    
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const { priceId, successUrl, cancelUrl } = await req.json();
    logStep("Request body parsed", { priceId, successUrl, cancelUrl });

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
    
    // Check if customer exists
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Found existing customer", { customerId });
    } else {
      logStep("No customer found, will create during checkout");
    }

    // Define pricing based on priceId
    let lineItems;
    if (priceId === 'yearly-plan') {
      lineItems = [
        {
          price_data: {
            currency: "usd",
            product_data: { 
              name: "StockMarket Infinity - Plan Annuel",
              description: "Accès illimité aux photos et vecteurs avec licence d'utilisation standard"
            },
            unit_amount: 3900, // $39/month billed yearly ($468/year)
            recurring: { interval: "year" },
          },
          quantity: 1,
        },
      ];
    } else {
      lineItems = [
        {
          price_data: {
            currency: "usd",
            product_data: { 
              name: "StockMarket Infinity - Plan Mensuel",
              description: "Accès illimité aux photos et vecteurs avec licence d'utilisation standard"
            },
            unit_amount: 3900, // $39/month
            recurring: { interval: "month" },
          },
          quantity: 1,
        },
      ];
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: lineItems,
      mode: "subscription",
      success_url: successUrl || `${req.headers.get("origin")}/dashboard?subscription=success`,
      cancel_url: cancelUrl || `${req.headers.get("origin")}/infinity?subscription=cancelled`,
      metadata: {
        user_id: user.id,
        plan_type: priceId === 'yearly-plan' ? 'yearly' : 'monthly'
      }
    });

    logStep("Checkout session created", { sessionId: session.id, url: session.url });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in create-checkout", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});