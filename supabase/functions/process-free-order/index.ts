import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FreeOrderItem {
  submission_id: string;
  license_id?: string;
}

interface FreeOrderRequest {
  cart_items: FreeOrderItem[];
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[PROCESS-FREE-ORDER] Starting free order processing');

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
      console.error('[PROCESS-FREE-ORDER] Auth error:', authError);
      return new Response(JSON.stringify({ error: 'Invalid authentication' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const user = userData.user;
    console.log('[PROCESS-FREE-ORDER] User authenticated:', user.id);

    // Parse request body
    const body: FreeOrderRequest = await req.json();
    const { cart_items } = body;

    if (!cart_items || cart_items.length === 0) {
      return new Response(JSON.stringify({ error: 'No items provided' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('[PROCESS-FREE-ORDER] Processing', cart_items.length, 'free items');

    // Validate that all items are actually free (price = 0)
    const submissionIds = cart_items.map(item => item.submission_id);
    const { data: submissions, error: fetchError } = await supabaseAdmin
      .from('content_submissions')
      .select('id, price, title, creator_id')
      .in('id', submissionIds);

    if (fetchError) {
      console.error('[PROCESS-FREE-ORDER] Error fetching submissions:', fetchError);
      return new Response(JSON.stringify({ error: 'Failed to validate items' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Verify all items are free
    const nonFreeItems = submissions?.filter(s => s.price && s.price > 0) || [];
    if (nonFreeItems.length > 0) {
      console.error('[PROCESS-FREE-ORDER] Non-free items detected:', nonFreeItems);
      return new Response(JSON.stringify({ 
        error: 'Some items are not free and require payment',
        items: nonFreeItems.map(i => i.title)
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

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
        console.log('[PROCESS-FREE-ORDER] Download already exists for:', item.submission_id);
        downloadRecords.push({ submission_id: item.submission_id, status: 'already_exists' });
        continue;
      }

      // Create new download record
      const { data: newDownload, error: insertError } = await supabaseAdmin
        .from('downloads')
        .insert({
          user_id: user.id,
          submission_id: item.submission_id,
          license_id: item.license_id || null,
          expires_at: null, // Free downloads don't expire
        })
        .select('id')
        .single();

      if (insertError) {
        console.error('[PROCESS-FREE-ORDER] Error creating download:', insertError);
        errors.push({ submission_id: item.submission_id, error: insertError.message });
      } else {
        console.log('[PROCESS-FREE-ORDER] Created download record:', newDownload.id);
        downloadRecords.push({ submission_id: item.submission_id, status: 'created', id: newDownload.id });
      }
    }

    // Send confirmation email (optional - reusing existing email function pattern)
    try {
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('email, display_name')
        .eq('user_id', user.id)
        .single();

      if (profile?.email) {
        // You could invoke send-purchase-receipt here for free items if desired
        console.log('[PROCESS-FREE-ORDER] User email:', profile.email);
      }
    } catch (emailError) {
      console.warn('[PROCESS-FREE-ORDER] Could not fetch profile for email:', emailError);
    }

    console.log('[PROCESS-FREE-ORDER] Free order completed successfully');

    return new Response(JSON.stringify({
      success: true,
      message: 'Free items have been added to your downloads',
      downloads: downloadRecords,
      errors: errors.length > 0 ? errors : undefined
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[PROCESS-FREE-ORDER] Unexpected error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'An unexpected error occurred' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
