import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function getPayPalApiUrl(): string {
  const isSandbox = Deno.env.get('PAYPAL_SANDBOX');
  return isSandbox === 'true' 
    ? 'https://api-m.sandbox.paypal.com'
    : 'https://api-m.paypal.com';
}

// Infinity subscription pricing (in USD)
const INFINITY_PRICING = {
  monthly: 89,  // $89/month
  yearly: 948,  // $79/month × 12 = $948/year
};

async function getPayPalAccessToken(): Promise<string> {
  const clientId = Deno.env.get('PAYPAL_CLIENT_ID');
  const clientSecret = Deno.env.get('PAYPAL_CLIENT_SECRET');
  const apiUrl = getPayPalApiUrl();
  
  console.log('PayPal Config:', { 
    hasClientId: !!clientId, 
    hasSecret: !!clientSecret, 
    apiUrl 
  });
  
  if (!clientId || !clientSecret) {
    throw new Error('PayPal credentials not configured');
  }

  const auth = btoa(`${clientId}:${clientSecret}`);
  
  const response = await fetch(`${apiUrl}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('PayPal auth error:', error);
    throw new Error('Failed to get PayPal access token');
  }

  const data = await response.json();
  return data.access_token;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('create-paypal-order: Function started');

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

    // Get request body
    const body = await req.json();
    const { cart_items, success_url, cancel_url, order_type = 'marketplace' } = body;

    // Calculate total amount based on order type
    let totalAmount = 0;
    let orderDescription = '';
    let currency = 'EUR';

    if (order_type === 'credits') {
      // AI Image credit pack purchase
      const { pack, amount, credits } = body;
      totalAmount = amount;
      orderDescription = `${credits} AI Credits - ${pack} Pack`;
    } else if (order_type === 'videoai_credits') {
      // VideoAI credit pack purchase (Pond5-style)
      const { pack, amount, credits } = body;
      const allowed: Record<string, { credits: number; amount: number }> = {
        starter: { credits: 500, amount: 20 },
        popular: { credits: 2000, amount: 75 },
        pro: { credits: 6000, amount: 220 },
      };
      const ref = allowed[String(pack)];
      if (!ref || Number(credits) !== ref.credits || Number(amount) !== ref.amount) {
        throw new Error('Invalid VideoAI pack');
      }
      currency = 'USD';
      totalAmount = ref.amount;
      orderDescription = `${ref.credits} VideoAI Credits - ${pack} Pack`;
    } else if (order_type === 'infinity') {
      // Infinity subscription via Orders API (hybrid approach)
      const { is_yearly } = body;
      currency = 'USD';
      totalAmount = is_yearly ? INFINITY_PRICING.yearly : INFINITY_PRICING.monthly;
      orderDescription = is_yearly 
        ? 'VisuStock Infinity - Annual Subscription (12 months)'
        : 'VisuStock Infinity - Monthly Subscription';
      
      console.log('Creating Infinity order:', { is_yearly, totalAmount, currency });
    } else {
      // Marketplace purchase
      if (!cart_items || cart_items.length === 0) {
        throw new Error('Cart is empty');
      }

      totalAmount = cart_items.reduce((sum: number, item: any) => sum + (item.price || 0), 0);
      orderDescription = `VisuStock - ${cart_items.length} item(s)`;
    }

    if (totalAmount <= 0) {
      throw new Error('Invalid order amount');
    }

    const apiUrl = getPayPalApiUrl();
    console.log('Creating PayPal order for amount:', totalAmount, currency);

    // Get PayPal access token
    const accessToken = await getPayPalAccessToken();

    // Build custom_id based on order type
    let customId: Record<string, any> = {
      user_id: user.id,
      order_type,
    };

    if (order_type === 'credits') {
      customId.credits = body.credits;
      customId.pack = body.pack;
    } else if (order_type === 'videoai_credits') {
      customId.credits = body.credits;
      customId.pack = body.pack;
    } else if (order_type === 'infinity') {
      customId.is_yearly = body.is_yearly || false;
      customId.plan_type = 'infinity';
    } else {
      customId.cart_items = cart_items;
    }

    // Create PayPal order
    const orderPayload = {
      intent: 'CAPTURE',
      purchase_units: [{
        amount: {
          currency_code: currency,
          value: totalAmount.toFixed(2),
        },
        description: orderDescription,
        custom_id: JSON.stringify(customId),
      }],
      application_context: {
        brand_name: 'VisuStock',
        locale: order_type === 'infinity' ? 'en-US' : 'fr-FR',
        landing_page: 'NO_PREFERENCE',
        user_action: 'PAY_NOW',
        return_url: success_url || `${req.headers.get('origin')}/payment-success`,
        cancel_url: cancel_url || `${req.headers.get('origin')}/cart`,
      },
    };

    const orderResponse = await fetch(`${apiUrl}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'PayPal-Request-Id': `${user.id}-${Date.now()}`,
      },
      body: JSON.stringify(orderPayload),
    });

    if (!orderResponse.ok) {
      const error = await orderResponse.text();
      console.error('PayPal order creation error:', error);
      throw new Error('Failed to create PayPal order');
    }

    const orderData = await orderResponse.json();
    console.log('PayPal order created:', orderData.id);

    // Find the approval URL
    const approvalUrl = orderData.links.find((link: any) => link.rel === 'approve')?.href;

    return new Response(
      JSON.stringify({
        order_id: orderData.id,
        approval_url: approvalUrl,
        status: orderData.status,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in create-paypal-order:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
