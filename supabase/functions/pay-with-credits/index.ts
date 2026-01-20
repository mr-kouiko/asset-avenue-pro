import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CartItem {
  submission_id: string;
  price: number;
  license_id?: string;
}

interface CreditPaymentRequest {
  cart_items: CartItem[];
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[PAY-WITH-CREDITS] Starting credit payment processing');

    // Initialize Supabase clients
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Client for auth (using user's token)
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
    
    // Admin client for database operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false }
    });

    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authorization required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: userData, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !userData.user) {
      console.error('[PAY-WITH-CREDITS] Auth error:', authError);
      return new Response(JSON.stringify({ error: 'Invalid authentication' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const user = userData.user;
    console.log('[PAY-WITH-CREDITS] User authenticated:', user.id);

    // Parse request body
    const body: CreditPaymentRequest = await req.json();
    const { cart_items } = body;

    if (!cart_items || cart_items.length === 0) {
      return new Response(JSON.stringify({ error: 'No items provided' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('[PAY-WITH-CREDITS] Processing', cart_items.length, 'items');

    // Calculate total credits needed (1 credit = $1)
    const totalCreditsNeeded = cart_items.reduce((sum, item) => sum + (item.price || 0), 0);
    console.log('[PAY-WITH-CREDITS] Total credits needed:', totalCreditsNeeded);

    // Get user's current credit balance
    const { data: creditData, error: creditError } = await supabaseAdmin
      .from('user_credits')
      .select('credits_balance')
      .eq('user_id', user.id)
      .maybeSingle();

    if (creditError) {
      console.error('[PAY-WITH-CREDITS] Error fetching credits:', creditError);
      return new Response(JSON.stringify({ error: 'Failed to fetch credit balance' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const currentBalance = creditData?.credits_balance || 0;
    console.log('[PAY-WITH-CREDITS] Current balance:', currentBalance);

    // Check if user has enough credits
    if (currentBalance < totalCreditsNeeded) {
      return new Response(JSON.stringify({ 
        error: 'Insufficient credits',
        required: totalCreditsNeeded,
        available: currentBalance
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Validate that all submissions exist
    const submissionIds = cart_items.map(item => item.submission_id);
    const { data: submissions, error: fetchError } = await supabaseAdmin
      .from('content_submissions')
      .select('id, title, creator_id')
      .in('id', submissionIds);

    if (fetchError) {
      console.error('[PAY-WITH-CREDITS] Error fetching submissions:', fetchError);
      return new Response(JSON.stringify({ error: 'Failed to validate items' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!submissions || submissions.length !== submissionIds.length) {
      return new Response(JSON.stringify({ error: 'Some items are no longer available' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Deduct credits using the existing RPC function
    const { data: deductResult, error: deductError } = await supabaseAdmin
      .rpc('deduct_user_credit', {
        user_id_param: user.id,
        cost_param: totalCreditsNeeded
      });

    if (deductError || deductResult === false) {
      console.error('[PAY-WITH-CREDITS] Error deducting credits:', deductError);
      return new Response(JSON.stringify({ error: 'Failed to deduct credits' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('[PAY-WITH-CREDITS] Credits deducted successfully');

    // Create download records for each item
    const downloadRecords = [];
    const errors = [];

    for (const item of cart_items) {
      // Check if download already exists
      const { data: existingDownload } = await supabaseAdmin
        .from('downloads')
        .select('id')
        .eq('user_id', user.id)
        .eq('submission_id', item.submission_id)
        .maybeSingle();

      if (existingDownload) {
        console.log('[PAY-WITH-CREDITS] Download already exists for:', item.submission_id);
        downloadRecords.push({ submission_id: item.submission_id, status: 'already_exists' });
        continue;
      }

      // Find the license UUID if license_id is provided as a string type
      let licenseUuid = null;
      if (item.license_id) {
        const { data: licenseData } = await supabaseAdmin
          .from('licenses')
          .select('id')
          .eq('type', item.license_id)
          .maybeSingle();
        
        if (licenseData) {
          licenseUuid = licenseData.id;
        }
      }

      // Create new download record
      const { data: newDownload, error: insertError } = await supabaseAdmin
        .from('downloads')
        .insert({
          user_id: user.id,
          submission_id: item.submission_id,
          license_id: licenseUuid,
          expires_at: null, // Credit purchases don't expire
        })
        .select('id')
        .single();

      if (insertError) {
        console.error('[PAY-WITH-CREDITS] Error creating download:', insertError);
        errors.push({ submission_id: item.submission_id, error: insertError.message });
      } else {
        console.log('[PAY-WITH-CREDITS] Created download record:', newDownload.id);
        downloadRecords.push({ submission_id: item.submission_id, status: 'created', id: newDownload.id });
      }
    }

    // Get updated credit balance
    const { data: updatedCreditData } = await supabaseAdmin
      .from('user_credits')
      .select('credits_balance')
      .eq('user_id', user.id)
      .single();

    const newBalance = updatedCreditData?.credits_balance || 0;

    const success = errors.length === 0;
    console.log('[PAY-WITH-CREDITS] Payment completed', success ? 'successfully' : 'with errors');
    console.log('[PAY-WITH-CREDITS] New balance:', newBalance);

    return new Response(JSON.stringify({
      success,
      message: success
        ? `Payment successful! ${totalCreditsNeeded} credits deducted.`
        : 'Some items could not be processed',
      credits_used: totalCreditsNeeded,
      new_balance: newBalance,
      downloads: downloadRecords,
      errors: errors.length > 0 ? errors : undefined
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[PAY-WITH-CREDITS] Unexpected error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'An unexpected error occurred' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
