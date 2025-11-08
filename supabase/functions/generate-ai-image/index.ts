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
    const { prompt } = await req.json();
    
    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'Prompt is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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

    // Check generation count
    console.log('Checking generation count for user:', user.id);
    const { count, error: countError } = await supabaseClient
      .from('ai_image_generations')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    if (countError) {
      console.error('Error checking generation count:', countError);
      throw countError;
    }

    console.log('Current generation count:', count);

    if (count !== null && count >= 5) {
      console.log('Generation limit reached for user:', user.id);
      return new Response(
        JSON.stringify({ 
          error: 'limit_reached',
          message: "Vous avez utilisé vos 5 générations d'images IA gratuites. Abonnez-vous pour continuer."
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Call Lovable AI Gateway for image generation
    console.log('Calling Lovable AI (google/gemini-2.5-flash-image-preview) with prompt:', prompt.substring(0, 50) + '...');
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-image-preview',
        messages: [
          { role: 'user', content: prompt }
        ],
        modalities: ['image', 'text']
      }),
    });

    console.log('Lovable AI response status:', response.status);

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'rate_limited', message: 'Trop de requêtes. Veuillez réessayer plus tard.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'quota_exceeded', message: 'Crédits Lovable AI insuffisants ou dépassés.' }),
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

    console.log('Image generated successfully, storing record...');
    // Store generation record
    const { error: insertError } = await supabaseClient
      .from('ai_image_generations')
      .insert({
        user_id: user.id,
        prompt: prompt,
        image_url: imageUrl
      });

    if (insertError) {
      console.error('Error storing generation:', insertError);
    } else {
      console.log('Generation record stored successfully');
    }

    return new Response(
      JSON.stringify({ imageUrl, remainingGenerations: 4 - (count || 0) }),
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
