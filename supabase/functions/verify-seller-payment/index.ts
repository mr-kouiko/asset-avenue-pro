import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[VERIFY-SELLER-PAYMENT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  const supabaseService = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header provided");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    
    if (!user?.id) {
      throw new Error("User not authenticated");
    }
    
    logStep("User authenticated", { userId: user.id });

    const { session_id } = await req.json();
    if (!session_id) {
      throw new Error("No session_id provided");
    }

    logStep("Verifying session", { session_id });

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Retrieve the checkout session
    const session = await stripe.checkout.sessions.retrieve(session_id);
    
    logStep("Session retrieved", { 
      status: session.payment_status, 
      metadata: session.metadata 
    });

    // Verify payment was successful and it's for the correct user
    if (session.payment_status !== "paid") {
      throw new Error("Payment not completed");
    }

    if (session.metadata?.user_id !== user.id) {
      throw new Error("Session does not belong to this user");
    }

    if (session.metadata?.type !== "seller_registration") {
      throw new Error("Invalid session type");
    }

    // Update user role to creator using service role
    const { error: roleError } = await supabaseService
      .from("user_roles")
      .upsert(
        { user_id: user.id, role: "creator" },
        { onConflict: "user_id" }
      );

    if (roleError) {
      logStep("Error updating role", { error: roleError.message });
      throw new Error(`Failed to update user role: ${roleError.message}`);
    }

    logStep("User role updated to creator", { userId: user.id });

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Seller registration completed successfully" 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
