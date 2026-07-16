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

async function getPayPalAccessToken(): Promise<string> {
  const clientId = Deno.env.get('PAYPAL_CLIENT_ID');
  const clientSecret = Deno.env.get('PAYPAL_CLIENT_SECRET');
  const apiUrl = getPayPalApiUrl();
  
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
    throw new Error('Failed to get PayPal access token');
  }

  const data = await response.json();
  return data.access_token;
}

// Calculate subscription period dates
function calculateSubscriptionPeriod(isYearly: boolean): { start: string; end: string; nextBilling: string } {
  const now = new Date();
  const start = now.toISOString();
  
  const end = new Date(now);
  if (isYearly) {
    end.setFullYear(end.getFullYear() + 1);
  } else {
    end.setMonth(end.getMonth() + 1);
  }
  
  return {
    start,
    end: end.toISOString(),
    nextBilling: end.toISOString(),
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('capture-paypal-order: Function started');

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

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    console.log('User authenticated:', user.id);

    // Get order ID from request
    const { order_id } = await req.json();
    if (!order_id) {
      throw new Error('Order ID is required');
    }

    console.log('Capturing PayPal order:', order_id);

    // ============ IDEMPOTENCY CHECK ============
    const { data: existingOrder, error: checkError } = await supabaseAdmin
      .from('paypal_orders')
      .select('*')
      .eq('paypal_order_id', order_id)
      .maybeSingle();

    if (checkError) {
      console.error('Error checking existing order:', checkError);
    }

    if (existingOrder && existingOrder.status === 'completed') {
      console.log('Order already processed, returning cached result:', order_id);
      return new Response(
        JSON.stringify({
          success: true,
          order_id: order_id,
          status: 'COMPLETED',
          order_type: existingOrder.order_type,
          already_processed: true,
          credits: existingOrder.credits_amount,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get PayPal access token and capture order
    const apiUrl = getPayPalApiUrl();
    const accessToken = await getPayPalAccessToken();

    const captureResponse = await fetch(`${apiUrl}/v2/checkout/orders/${order_id}/capture`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    // Handle already captured orders
    if (captureResponse.status === 422) {
      const errorData = await captureResponse.json();
      console.log('PayPal 422 response:', JSON.stringify(errorData));
      
      if (existingOrder) {
        return new Response(
          JSON.stringify({
            success: true,
            order_id: order_id,
            status: 'COMPLETED',
            order_type: existingOrder.order_type,
            already_processed: true,
            credits: existingOrder.credits_amount,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    if (!captureResponse.ok) {
      const error = await captureResponse.text();
      console.error('PayPal capture error:', error);
      throw new Error('Failed to capture PayPal order');
    }

    const captureData = await captureResponse.json();
    console.log('PayPal order captured:', captureData.status);

    if (captureData.status !== 'COMPLETED') {
      throw new Error(`Order capture failed with status: ${captureData.status}`);
    }

    // Parse custom data from the order
    const purchaseUnit = captureData.purchase_units[0];
    const captureInfo = purchaseUnit.payments?.captures?.[0];
    const customId = captureInfo?.custom_id || purchaseUnit.custom_id || '{}';
    const customData = JSON.parse(customId);
    
    console.log('Order custom data:', customData);

    const orderAmount = parseFloat(purchaseUnit.amount.value);
    const currency = purchaseUnit.amount.currency_code;
    const orderType = customData.order_type || 'marketplace';

    // ============ RECORD ORDER BEFORE PROCESSING ============
    const { error: insertOrderError } = await supabaseAdmin
      .from('paypal_orders')
      .upsert({
        paypal_order_id: order_id,
        user_id: user.id,
        order_type: orderType,
        amount: orderAmount,
        currency: currency,
        status: 'processing',
        credits_amount: (orderType === 'credits' || orderType === 'videoai_credits') ? parseInt(customData.credits) : null,
        pack_type: customData.pack || (orderType === 'infinity' ? (customData.is_yearly ? 'infinity_yearly' : 'infinity_monthly') : null),
        cart_items: customData.cart_items || null,
      }, { 
        onConflict: 'paypal_order_id',
        ignoreDuplicates: false 
      });

    if (insertOrderError) {
      console.error('Error inserting order record:', insertOrderError);
    }

    // ============ PROCESS BY ORDER TYPE ============
    
    if (orderType === 'infinity') {
      // ============ INFINITY SUBSCRIPTION (HYBRID APPROACH) ============
      const isYearly = customData.is_yearly || false;
      const period = calculateSubscriptionPeriod(isYearly);
      
      console.log('Activating Infinity subscription:', { isYearly, period });

      // Cancel any existing active subscription first
      await supabaseAdmin
        .from('user_subscriptions')
        .update({ status: 'cancelled' })
        .eq('user_id', user.id)
        .eq('status', 'active');

      // Create new internal subscription record
      const { error: subError } = await supabaseAdmin
        .from('user_subscriptions')
        .insert({
          user_id: user.id,
          paypal_subscription_id: `ORDER_${order_id}`, // Use order ID as reference
          plan_type: 'infinity',
          status: 'active',
          is_yearly: isYearly,
          credits_per_month: -1, // Unlimited
          monthly_price: isYearly ? 79 : 89,
          current_period_start: period.start,
          current_period_end: period.end,
          next_billing_date: period.nextBilling,
        });

      if (subError) {
        console.error('Error creating subscription:', subError);
        throw new Error('Failed to activate subscription');
      }

      // Update order status
      await supabaseAdmin
        .from('paypal_orders')
        .update({ 
          status: 'completed',
          processed_at: new Date().toISOString()
        })
        .eq('paypal_order_id', order_id);

      // Log to audit
      await supabaseAdmin.from('security_audit_log').insert({
        event_type: 'infinity_subscription_activated',
        user_id: user.id,
        target_table: 'user_subscriptions',
        details: {
          paypal_order_id: order_id,
          plan_type: 'infinity',
          is_yearly: isYearly,
          amount_paid: orderAmount,
          currency: currency,
          period_start: period.start,
          period_end: period.end,
          timestamp: new Date().toISOString()
        }
      });

      console.log('Infinity subscription activated successfully');

      return new Response(
        JSON.stringify({
          success: true,
          order_id: order_id,
          status: captureData.status,
          order_type: 'infinity',
          subscription_activated: true,
          period_end: period.end,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else if (orderType === 'credits') {
      // ============ CREDITS PURCHASE ============
      const creditsAmount = parseInt(customData.credits);
      const { error } = await supabaseAdmin.rpc('add_user_credits', {
        user_id_param: user.id,
        amount_param: creditsAmount
      });

      if (error) {
        console.error('Error adding credits:', error);
        throw new Error('Failed to add credits');
      }

      console.log('Credits added successfully:', creditsAmount);

      await supabaseAdmin
        .from('paypal_orders')
        .update({ 
          status: 'completed',
          processed_at: new Date().toISOString()
        })
        .eq('paypal_order_id', order_id);

      await supabaseAdmin.from('security_audit_log').insert({
        event_type: 'credits_purchased_paypal',
        user_id: user.id,
        target_table: 'user_credits',
        details: {
          credits_amount: creditsAmount,
          pack_type: customData.pack,
          paypal_order_id: order_id,
          amount_paid: orderAmount,
          currency: currency,
          timestamp: new Date().toISOString()
        }
      });

      return new Response(
        JSON.stringify({
          success: true,
          order_id: order_id,
          status: captureData.status,
          order_type: 'credits',
          credits: creditsAmount,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else if (orderType === 'videoai_credits') {
      // ============ VIDEOAI CREDITS PURCHASE (Pond5-style) ============
      const creditsAmount = parseInt(customData.credits);
      const { error } = await supabaseAdmin.rpc('add_videoai_credits', {
        p_user_id: user.id,
        p_amount: creditsAmount,
        p_type: 'purchase',
        p_reason: `paypal_${customData.pack}`,
        p_paypal_order_id: order_id,
        p_pack_id: customData.pack,
      });

      if (error) {
        console.error('Error adding VideoAI credits:', error);
        throw new Error('Failed to add VideoAI credits');
      }

      await supabaseAdmin
        .from('paypal_orders')
        .update({
          status: 'completed',
          processed_at: new Date().toISOString(),
          pack_type: `videoai_${customData.pack}`,
        })
        .eq('paypal_order_id', order_id);

      await supabaseAdmin.from('security_audit_log').insert({
        event_type: 'videoai_credits_purchased_paypal',
        user_id: user.id,
        target_table: 'videoai_credits',
        details: {
          credits_amount: creditsAmount,
          pack_type: customData.pack,
          paypal_order_id: order_id,
          amount_paid: orderAmount,
          currency: currency,
          timestamp: new Date().toISOString()
        }
      });

      return new Response(
        JSON.stringify({
          success: true,
          order_id: order_id,
          status: captureData.status,
          order_type: 'videoai_credits',
          credits: creditsAmount,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else if (orderType === 'seller_registration') {
      // ============ SELLER REGISTRATION ============
      const targetUserId = customData.user_id || user.id;

      const { error: roleError } = await supabaseAdmin
        .from('user_roles')
        .upsert(
          { user_id: targetUserId, role: 'creator' },
          { onConflict: 'user_id,role', ignoreDuplicates: true }
        );

      if (roleError) {
        console.error('Error upserting creator role:', roleError);
        throw new Error('Failed to grant creator role');
      }

      await supabaseAdmin
        .from('paypal_orders')
        .update({
          status: 'completed',
          processed_at: new Date().toISOString(),
        })
        .eq('paypal_order_id', order_id);

      await supabaseAdmin.from('security_audit_log').insert({
        event_type: 'seller_registration_paypal',
        user_id: targetUserId,
        target_table: 'user_roles',
        details: {
          paypal_order_id: order_id,
          amount_paid: orderAmount,
          currency: currency,
          timestamp: new Date().toISOString(),
        },
      });

      console.log('Seller registration completed for user:', targetUserId);

      return new Response(
        JSON.stringify({
          success: true,
          order_id: order_id,
          status: captureData.status,
          order_type: 'seller_registration',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else {
      // ============ MARKETPLACE PURCHASE ============
      const cartItems = customData.cart_items || [];
      const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      
      for (const item of cartItems) {
        const { data: existingDownload } = await supabaseAdmin
          .from('downloads')
          .select('id')
          .eq('user_id', user.id)
          .eq('submission_id', item.submission_id)
          .maybeSingle();

        if (!existingDownload) {
          let licenseUuid = null;
          if (item.license_id) {
            if (uuidPattern.test(String(item.license_id))) {
              licenseUuid = item.license_id;
            } else {
              const { data: licenseData, error: licenseError } = await supabaseAdmin
                .from('licenses')
                .select('id')
                .eq('type', item.license_id)
                .maybeSingle();
              if (licenseError) {
                console.error('License lookup failed:', licenseError);
              }
              licenseUuid = licenseData?.id || null;
            }
          }

          const { error: downloadInsertError } = await supabaseAdmin.from('downloads').insert({
            user_id: user.id,
            submission_id: item.submission_id,
            license_id: licenseUuid,
            expires_at: null,
          });

          if (downloadInsertError) {
            console.error('Failed to create download record:', downloadInsertError);
            throw new Error('Failed to create download access');
          }
        }
      }

      console.log('Download records created for', cartItems.length, 'items');

      await supabaseAdmin
        .from('paypal_orders')
        .update({ 
          status: 'completed',
          processed_at: new Date().toISOString()
        })
        .eq('paypal_order_id', order_id);

      await supabaseAdmin.from('security_audit_log').insert({
        event_type: 'marketplace_purchase_paypal',
        user_id: user.id,
        target_table: 'downloads',
        details: {
          items_count: cartItems.length,
          paypal_order_id: order_id,
          amount_paid: orderAmount,
          currency: currency,
          timestamp: new Date().toISOString()
        }
      });

      // Fetch current commission rate (default 40% to platform if missing)
      const { data: settings } = await supabaseAdmin
        .from('platform_settings')
        .select('commission_rate')
        .limit(1)
        .maybeSingle();
      const commissionRate = Number(settings?.commission_rate ?? 0.40);

      // Send seller notifications + record per-item earnings ledger
      const sellerItems = new Map<string, { items: typeof cartItems, total: number }>();
      
      for (const item of cartItems) {
        const { data: submission } = await supabaseAdmin
          .from('content_submissions')
          .select('creator_id, price')
          .eq('id', item.submission_id)
          .single();
        
        if (submission?.creator_id) {
          const sellerId = submission.creator_id;
          const itemPrice = Number(item.price ?? submission.price ?? 0);
          
          if (!sellerItems.has(sellerId)) {
            sellerItems.set(sellerId, { items: [], total: 0 });
          }
          
          const sellerData = sellerItems.get(sellerId)!;
          sellerData.items.push({ ...item, price: itemPrice });
          sellerData.total += itemPrice;

          // Record earnings ledger row (idempotent via unique index on order+submission)
          const commissionAmount = +(itemPrice * commissionRate).toFixed(2);
          const netAmount = +(itemPrice - commissionAmount).toFixed(2);
          await supabaseAdmin.from('seller_earnings').upsert({
            seller_id: sellerId,
            buyer_id: user.id,
            submission_id: item.submission_id,
            paypal_order_id: order_id,
            source: 'marketplace',
            gross_amount: itemPrice,
            commission_rate: commissionRate,
            commission_amount: commissionAmount,
            net_amount: netAmount,
            currency: currency,
            status: 'pending',
          }, { onConflict: 'paypal_order_id,submission_id', ignoreDuplicates: true });
        }
      }

      for (const [sellerId, data] of sellerItems) {
        try {
          const notificationPayload = {
            seller_id: sellerId,
            buyer_id: user.id,
            order_id: order_id,
            items: data.items.map(item => ({
              submission_id: item.submission_id,
              license_id: item.license_id,
              price: item.price,
            })),
            total_amount: data.total,
            currency: currency,
          };

          await fetch(
            `${Deno.env.get('SUPABASE_URL')}/functions/v1/send-seller-notification`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(notificationPayload),
            }
          );
        } catch (emailError) {
          console.error('Failed to send seller notification:', emailError);
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          order_id: order_id,
          status: captureData.status,
          order_type: 'marketplace',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('Error in capture-paypal-order:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
