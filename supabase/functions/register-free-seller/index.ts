import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FOUNDING_MEMBER_LIMIT = 100;

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[REGISTER-FREE-SELLER] ${step}${detailsStr}`);
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
    
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Check current seller count
    const { count, error: countError } = await supabaseService
      .from("user_roles")
      .select("*", { count: "exact", head: true })
      .eq("role", "creator");

    if (countError) {
      logStep("Error counting sellers", { error: countError.message });
      throw new Error(`Failed to count sellers: ${countError.message}`);
    }

    const sellerCount = count ?? 0;
    logStep("Current seller count", { sellerCount, limit: FOUNDING_MEMBER_LIMIT });

    // Check if founding member slots are still available
    if (sellerCount >= FOUNDING_MEMBER_LIMIT) {
      logStep("Founding member limit reached", { sellerCount });
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Founding member promotion has ended",
        requiresPayment: true
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Check if user is already a creator
    const { data: existingRole } = await supabaseService
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (existingRole?.role === "creator") {
      logStep("User already a creator", { userId: user.id });
      return new Response(JSON.stringify({ 
        success: false, 
        error: "You are already registered as a seller"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
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

    logStep("User registered as founding member seller", { 
      userId: user.id, 
      spotNumber: sellerCount + 1 
    });

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Congratulations! You are now a Founding Creator!",
      spotNumber: sellerCount + 1
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
