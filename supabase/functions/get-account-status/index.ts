import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    // Get authenticated user
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Authentication required" }),
        { status: 401, headers: corsHeaders }
      );
    }

    // Use Stripe secret key from environment variables
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY") || "";
    
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

    // Get user's Stripe account from database
    const { data: stripeAccount, error: dbError } = await supabaseService
      .from('stripe_accounts')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (dbError || !stripeAccount) {
      return new Response(
        JSON.stringify({ 
          has_account: false,
          onboarding_completed: false,
          charges_enabled: false,
          payouts_enabled: false
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get latest account status from Stripe
    const account = await stripe.accounts.retrieve(stripeAccount.stripe_account_id);
    
    // Update database with latest status
    const { error: updateError } = await supabaseService
      .from('stripe_accounts')
      .update({
        charges_enabled: account.charges_enabled,
        payouts_enabled: account.payouts_enabled,
        onboarding_completed: account.details_submitted,
        requirements: account.requirements,
        updated_at: new Date().toISOString()
      })
      .eq('stripe_account_id', account.id);

    if (updateError) {
      console.error("Failed to update account status:", updateError);
    }

    // Get transaction stats
    const { data: transactions } = await supabaseService
      .from('transactions')
      .select('amount_seller, status, created_at')
      .eq('seller_id', user.id);

    const totalEarnings = transactions
      ?.filter(t => t.status === 'succeeded')
      .reduce((sum, t) => sum + t.amount_seller, 0) || 0;

    const totalTransactions = transactions?.length || 0;

    // Get recent payouts
    const { data: payouts } = await supabaseService
      .from('payouts')
      .select('*')
      .eq('seller_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5);

    return new Response(
      JSON.stringify({
        has_account: true,
        account_id: account.id,
        onboarding_completed: account.details_submitted,
        charges_enabled: account.charges_enabled,
        payouts_enabled: account.payouts_enabled,
        requirements: account.requirements,
        country: account.country,
        business_type: account.business_type,
        stats: {
          total_earnings: Math.round(totalEarnings / 100), // Convert from cents to euros
          total_transactions: totalTransactions,
          recent_payouts: payouts || []
        }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error getting account status:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: corsHeaders }
    );
  }
});