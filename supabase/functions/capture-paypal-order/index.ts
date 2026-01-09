import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PAYPAL_API_URL = Deno.env.get('PAYPAL_SANDBOX') === 'true' 
  ? 'https://api-m.sandbox.paypal.com'
  : 'https://api-m.paypal.com';

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
    // Check if this order has already been processed
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

    // Get PayPal access token
    const accessToken = await getPayPalAccessToken();

    // Capture the order
    const captureResponse = await fetch(`${PAYPAL_API_URL}/v2/checkout/orders/${order_id}/capture`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    // Handle already captured orders (PayPal returns 422 for duplicate captures)
    if (captureResponse.status === 422) {
      const errorData = await captureResponse.json();
      console.log('PayPal 422 response:', JSON.stringify(errorData));
      
      // If already captured, treat as success if we have a record
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

    // ============ RECORD ORDER BEFORE PROCESSING ============
    // Insert or update order record to prevent duplicates
    const { error: insertOrderError } = await supabaseAdmin
      .from('paypal_orders')
      .upsert({
        paypal_order_id: order_id,
        user_id: user.id,
        order_type: customData.order_type || 'marketplace',
        amount: orderAmount,
        currency: currency,
        status: 'processing',
        credits_amount: customData.order_type === 'credits' ? parseInt(customData.credits) : null,
        pack_type: customData.pack || null,
        cart_items: customData.cart_items || null,
      }, { 
        onConflict: 'paypal_order_id',
        ignoreDuplicates: false 
      });

    if (insertOrderError) {
      console.error('Error inserting order record:', insertOrderError);
      // Continue anyway - the order was captured successfully
    }

    // Process based on order type
    if (customData.order_type === 'credits') {
      // Add credits to user
      const creditsAmount = parseInt(customData.credits);
      const { data, error } = await supabaseAdmin.rpc('add_user_credits', {
        user_id_param: user.id,
        amount_param: creditsAmount
      });

      if (error) {
        console.error('Error adding credits:', error);
        throw new Error('Failed to add credits');
      }

      console.log('Credits added successfully:', creditsAmount);

      // Update order status to completed
      await supabaseAdmin
        .from('paypal_orders')
        .update({ 
          status: 'completed',
          processed_at: new Date().toISOString()
        })
        .eq('paypal_order_id', order_id);

      // Log transaction to audit log
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
    } else {
      // Marketplace purchase - create download records
      const cartItems = customData.cart_items || [];
      
      for (const item of cartItems) {
        // Check if download already exists (additional idempotency)
        const { data: existingDownload } = await supabaseAdmin
          .from('downloads')
          .select('id')
          .eq('user_id', user.id)
          .eq('submission_id', item.submission_id)
          .maybeSingle();

        if (!existingDownload) {
          await supabaseAdmin.from('downloads').insert({
            user_id: user.id,
            submission_id: item.submission_id,
            license_id: item.license_id,
            expires_at: null, // No expiration for purchased content
          });
        }
      }

      console.log('Download records created for', cartItems.length, 'items');

      // Update order status to completed
      await supabaseAdmin
        .from('paypal_orders')
        .update({ 
          status: 'completed',
          processed_at: new Date().toISOString()
        })
        .eq('paypal_order_id', order_id);

      // Log transaction to audit log
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

      // Send seller notification emails for each unique seller
      const sellerItems = new Map<string, { items: typeof cartItems, total: number }>();
      
      // Group items by seller
      for (const item of cartItems) {
        // Fetch seller_id from submission
        const { data: submission } = await supabaseAdmin
          .from('content_submissions')
          .select('creator_id, price')
          .eq('id', item.submission_id)
          .single();
        
        if (submission?.creator_id) {
          const sellerId = submission.creator_id;
          const itemPrice = item.price || submission.price || 0;
          
          if (!sellerItems.has(sellerId)) {
            sellerItems.set(sellerId, { items: [], total: 0 });
          }
          
          const sellerData = sellerItems.get(sellerId)!;
          sellerData.items.push({ ...item, price: itemPrice });
          sellerData.total += itemPrice;
        }
      }

      // Send notification to each seller
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

          const response = await fetch(
            `${Deno.env.get('SUPABASE_URL')}/functions/v1/send-seller-notification`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(notificationPayload),
            }
          );

          const result = await response.json();
          console.log('Seller notification sent to:', sellerId, result);
        } catch (emailError) {
          console.error('Failed to send seller notification:', emailError);
          // Don't throw - email failure shouldn't block purchase
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
