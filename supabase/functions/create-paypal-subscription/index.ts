import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PAYPAL_API_URL = Deno.env.get('PAYPAL_SANDBOX') === 'true' 
  ? 'https://api-m.sandbox.paypal.com'
  : 'https://api-m.paypal.com';

// Subscription plans configuration
const SUBSCRIPTION_PLANS = {
  monthly_30: { credits: 30, monthlyPrice: 20600, name: '30 Credits Monthly' },
  monthly_60: { credits: 60, monthlyPrice: 37900, name: '60 Credits Monthly' },
  monthly_100: { credits: 100, monthlyPrice: 59900, name: '100 Credits Monthly' },
  monthly_200: { credits: 200, monthlyPrice: 109900, name: '200 Credits Monthly' },
};

async function getPayPalAccessToken(): Promise<string> {
  const clientId = Deno.env.get('PAYPAL_CLIENT_ID');
  const clientSecret = Deno.env.get('PAYPAL_CLIENT_SECRET');
  
  if (!clientId || !clientSecret) {
    throw new Error('PayPal credentials not configured');
  }

  const auth = btoa(`${clientId}:${clientSecret}`);
  
  const response = await fetch(`${PAYPAL_API_URL}/v1/oauth2/token`, {
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

async function createOrGetProduct(accessToken: string, planType: string): Promise<string> {
  const plan = SUBSCRIPTION_PLANS[planType as keyof typeof SUBSCRIPTION_PLANS];
  
  // Create a product for this subscription
  const productPayload = {
    name: `VisuStock ${plan.name}`,
    description: `${plan.credits} credits per month subscription`,
    type: 'SERVICE',
    category: 'SOFTWARE',
  };

  const response = await fetch(`${PAYPAL_API_URL}/v1/catalogs/products`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'PayPal-Request-Id': `product-${planType}-${Date.now()}`,
    },
    body: JSON.stringify(productPayload),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('PayPal product creation error:', error);
    throw new Error('Failed to create PayPal product');
  }

  const data = await response.json();
  console.log('Created PayPal product:', data.id);
  return data.id;
}

async function createBillingPlan(
  accessToken: string, 
  productId: string, 
  planType: string,
  isYearly: boolean
): Promise<string> {
  const plan = SUBSCRIPTION_PLANS[planType as keyof typeof SUBSCRIPTION_PLANS];
  
  // Calculate price (yearly gets 16% discount)
  const yearlyTotal = Math.round(plan.monthlyPrice * 12 * 0.84);
  const monthlyAmount = isYearly ? Math.round(yearlyTotal / 12) : plan.monthlyPrice;
  const priceInDollars = (monthlyAmount / 100).toFixed(2);

  const billingPlanPayload = {
    product_id: productId,
    name: `${plan.name} - ${isYearly ? 'Yearly' : 'Monthly'} Plan`,
    description: `${plan.credits} credits per month`,
    status: 'ACTIVE',
    billing_cycles: [
      {
        frequency: {
          interval_unit: isYearly ? 'YEAR' : 'MONTH',
          interval_count: 1,
        },
        tenure_type: 'REGULAR',
        sequence: 1,
        total_cycles: 0, // Infinite
        pricing_scheme: {
          fixed_price: {
            value: isYearly ? (yearlyTotal / 100).toFixed(2) : priceInDollars,
            currency_code: 'USD',
          },
        },
      },
    ],
    payment_preferences: {
      auto_bill_outstanding: true,
      setup_fee: {
        value: '0',
        currency_code: 'USD',
      },
      setup_fee_failure_action: 'CONTINUE',
      payment_failure_threshold: 3,
    },
  };

  const response = await fetch(`${PAYPAL_API_URL}/v1/billing/plans`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'PayPal-Request-Id': `plan-${planType}-${isYearly ? 'yearly' : 'monthly'}-${Date.now()}`,
    },
    body: JSON.stringify(billingPlanPayload),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('PayPal billing plan creation error:', error);
    throw new Error('Failed to create PayPal billing plan');
  }

  const data = await response.json();
  console.log('Created PayPal billing plan:', data.id);
  return data.id;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('create-paypal-subscription: Function started');

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
    const { plan_type, is_yearly = false, success_url, cancel_url } = body;

    if (!plan_type || !SUBSCRIPTION_PLANS[plan_type as keyof typeof SUBSCRIPTION_PLANS]) {
      throw new Error('Invalid plan type');
    }

    const plan = SUBSCRIPTION_PLANS[plan_type as keyof typeof SUBSCRIPTION_PLANS];
    console.log('Creating subscription for plan:', plan_type, 'yearly:', is_yearly);

    // Get PayPal access token
    const accessToken = await getPayPalAccessToken();

    // Create product and billing plan
    const productId = await createOrGetProduct(accessToken, plan_type);
    const billingPlanId = await createBillingPlan(accessToken, productId, plan_type, is_yearly);

    // Create subscription
    const subscriptionPayload = {
      plan_id: billingPlanId,
      subscriber: {
        name: {
          given_name: user.user_metadata?.first_name || 'Customer',
          surname: user.user_metadata?.last_name || '',
        },
        email_address: user.email,
      },
      application_context: {
        brand_name: 'VisuStock',
        locale: 'en-US',
        shipping_preference: 'NO_SHIPPING',
        user_action: 'SUBSCRIBE_NOW',
        payment_method: {
          payer_selected: 'PAYPAL',
          payee_preferred: 'IMMEDIATE_PAYMENT_REQUIRED',
        },
        return_url: success_url || `${req.headers.get('origin')}/subscription-success`,
        cancel_url: cancel_url || `${req.headers.get('origin')}/packages-pricing`,
      },
      custom_id: JSON.stringify({
        user_id: user.id,
        plan_type,
        is_yearly,
        credits_per_month: plan.credits,
      }),
    };

    const subscriptionResponse = await fetch(`${PAYPAL_API_URL}/v1/billing/subscriptions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'PayPal-Request-Id': `sub-${user.id}-${Date.now()}`,
      },
      body: JSON.stringify(subscriptionPayload),
    });

    if (!subscriptionResponse.ok) {
      const error = await subscriptionResponse.text();
      console.error('PayPal subscription creation error:', error);
      throw new Error('Failed to create PayPal subscription');
    }

    const subscriptionData = await subscriptionResponse.json();
    console.log('PayPal subscription created:', subscriptionData.id);

    // Find the approval URL
    const approvalUrl = subscriptionData.links.find((link: any) => link.rel === 'approve')?.href;

    return new Response(
      JSON.stringify({
        subscription_id: subscriptionData.id,
        approval_url: approvalUrl,
        status: subscriptionData.status,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in create-paypal-subscription:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
