import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, referenceImage } = await req.json();
    
    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'Prompt is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const hasReference = typeof referenceImage === 'string' && referenceImage.startsWith('data:image/');

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Get authenticated user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check user credits using the service role client
    console.log('Checking user credits for user:', user.id);
    
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: creditsData, error: creditsError } = await serviceClient
      .from('user_credits')
      .select('credits_balance')
      .eq('user_id', user.id)
      .single();

    if (creditsError && creditsError.code !== 'PGRST116') { // PGRST116 = not found
      console.error('Error checking user credits:', creditsError);
      throw creditsError;
    }

    const currentBalance = creditsData?.credits_balance ?? 0;
    console.log('Current credit balance:', currentBalance);

    if (currentBalance < 1) {
      console.log('Insufficient credits for user:', user.id);
      return new Response(
        JSON.stringify({ 
          error: 'insufficient_credits',
          message: "Crédits insuffisants pour générer une image. Veuillez acheter des crédits pour continuer.",
          current_balance: currentBalance
        }),
        { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Call Lovable AI Gateway for image generation
    console.log('Calling Lovable AI (google/gemini-2.5-flash-image)', hasReference ? 'with reference image' : 'text-only', 'prompt:', prompt.substring(0, 50) + '...');

    const userContent: any[] = [{ type: 'text', text: prompt }];
    if (hasReference) {
      userContent.push({ type: 'image_url', image_url: { url: referenceImage } });
    }

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-image',
        messages: [
          { role: 'user', content: userContent }
        ],
        modalities: ['image', 'text']
      }),
    });

    console.log('Lovable AI response status:', response.status);

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'rate_limited', message: 'Limite de requêtes atteinte. Veuillez réessayer dans quelques instants.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'payment_required', message: 'Crédits Lovable AI insuffisants. Veuillez recharger votre compte workspace.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error('Lovable AI error:', response.status, errorText);
      throw new Error('Lovable AI gateway error');
    }

    const data = await response.json();
    console.log('Lovable AI response data (truncated):', JSON.stringify(data).substring(0, 200));

    // Extract base64 image data URL from Lovable AI response
    const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url as string | undefined;
    
    if (!imageUrl || typeof imageUrl !== 'string' || !imageUrl.startsWith('data:')) {
      console.error('No image in Lovable AI response. Full response:', JSON.stringify(data));
      throw new Error('No image generated');
    }

    console.log('Image generated successfully, deducting credit...');
    
    // Deduct credit using service role
    const { data: deductResult, error: deductError } = await serviceClient
      .rpc('deduct_user_credit', { 
        user_id_param: user.id,
        cost_param: 1 
      });

    if (deductError || !deductResult) {
      console.error('Error deducting credit:', deductError);
      // Still return image but log the error
    } else {
      console.log('Credit deducted successfully');
    }
    
    // Store generation record for history
    const { error: insertError } = await supabaseClient
      .from('ai_image_generations')
      .insert({
        user_id: user.id,
        prompt: prompt,
        image_url: imageUrl
      });

    if (insertError) {
      console.error('Error storing generation history:', insertError);
    }

    // Get updated balance
    const { data: updatedCredits } = await serviceClient
      .from('user_credits')
      .select('credits_balance')
      .eq('user_id', user.id)
      .single();

    return new Response(
      JSON.stringify({ 
        imageUrl, 
        creditsRemaining: updatedCredits?.credits_balance ?? (currentBalance - 1)
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in generate-ai-image function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
