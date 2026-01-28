import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FOUNDING_MEMBER_LIMIT = 100;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseService = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    // Count current sellers (creators)
    const { count, error: countError } = await supabaseService
      .from("user_roles")
      .select("*", { count: "exact", head: true })
      .eq("role", "creator");

    if (countError) {
      throw new Error(`Failed to count sellers: ${countError.message}`);
    }

    const sellerCount = count ?? 0;
    const spotsRemaining = Math.max(0, FOUNDING_MEMBER_LIMIT - sellerCount);
    const isFreeRegistration = sellerCount < FOUNDING_MEMBER_LIMIT;

    return new Response(JSON.stringify({ 
      sellerCount,
      spotsRemaining,
      limit: FOUNDING_MEMBER_LIMIT,
      isFreeRegistration
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
