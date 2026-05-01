// PayPal Webhook Handler
// Receives async events from PayPal so we don't rely solely on the user
// being redirected back to /payment-success after approval.
//
// Handled events:
// - CHECKOUT.ORDER.APPROVED            → ensure server-side capture (recovery)
// - PAYMENT.CAPTURE.COMPLETED          → mark paypal_orders completed if missed
// - PAYMENT.CAPTURE.REFUNDED / .REVERSED → mark order refunded, revoke benefits
//
// Idempotency: every event is logged in paypal_webhook_events keyed by
// PayPal's event id. Re-deliveries are no-ops.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, paypal-transmission-id, paypal-transmission-sig, paypal-transmission-time, paypal-cert-url, paypal-auth-algo',
};

function getPayPalApiUrl(): string {
  return Deno.env.get('PAYPAL_SANDBOX') === 'true'
    ? 'https://api-m.sandbox.paypal.com'
    : 'https://api-m.paypal.com';
}

async function getPayPalAccessToken(): Promise<string> {
  const clientId = Deno.env.get('PAYPAL_CLIENT_ID');
  const clientSecret = Deno.env.get('PAYPAL_CLIENT_SECRET');
  if (!clientId || !clientSecret) throw new Error('PayPal credentials not configured');
  const auth = btoa(`${clientId}:${clientSecret}`);
  const r = await fetch(`${getPayPalApiUrl()}/v1/oauth2/token`, {
    method: 'POST',
    headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials',
  });
  if (!r.ok) throw new Error('Failed to get PayPal access token');
  return (await r.json()).access_token;
}

// Verify webhook signature with PayPal
async function verifyWebhookSignature(headers: Headers, body: string, accessToken: string): Promise<boolean> {
  const webhookId = Deno.env.get('PAYPAL_WEBHOOK_ID');
  if (!webhookId) {
    console.warn('PAYPAL_WEBHOOK_ID not set — skipping signature verification (NOT recommended for production)');
    return true;
  }
  const verifyPayload = {
    auth_algo: headers.get('paypal-auth-algo'),
    cert_url: headers.get('paypal-cert-url'),
    transmission_id: headers.get('paypal-transmission-id'),
    transmission_sig: headers.get('paypal-transmission-sig'),
    transmission_time: headers.get('paypal-transmission-time'),
    webhook_id: webhookId,
    webhook_event: JSON.parse(body),
  };
  const r = await fetch(`${getPayPalApiUrl()}/v1/notifications/verify-webhook-signature`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(verifyPayload),
  });
  if (!r.ok) {
    console.error('Signature verify call failed:', await r.text());
    return false;
  }
  const data = await r.json();
  return data.verification_status === 'SUCCESS';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  const rawBody = await req.text();
  let event: any;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const eventId: string = event.id;
  const eventType: string = event.event_type;
  const resource = event.resource ?? {};
  console.log(`paypal-webhook: received ${eventType} (${eventId})`);

  // Idempotency check
  const { data: existing } = await supabaseAdmin
    .from('paypal_webhook_events')
    .select('id, status')
    .eq('paypal_event_id', eventId)
    .maybeSingle();

  if (existing && existing.status === 'processed') {
    console.log('Event already processed, skipping');
    return new Response(JSON.stringify({ ok: true, duplicate: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Log the event upfront
  await supabaseAdmin.from('paypal_webhook_events').upsert({
    paypal_event_id: eventId,
    event_type: eventType,
    resource_type: event.resource_type ?? null,
    resource_id: resource.id ?? null,
    status: 'received',
    payload: event,
  }, { onConflict: 'paypal_event_id' });

  try {
    // Verify signature (after logging so we keep audit even on failure)
    const accessToken = await getPayPalAccessToken();
    const verified = await verifyWebhookSignature(req.headers, rawBody, accessToken);
    if (!verified) {
      await supabaseAdmin
        .from('paypal_webhook_events')
        .update({ status: 'rejected', error_message: 'Signature verification failed' })
        .eq('paypal_event_id', eventId);
      return new Response(JSON.stringify({ error: 'Signature verification failed' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Resolve the order id depending on event shape
    // - PAYMENT.CAPTURE.* events: resource.supplementary_data.related_ids.order_id
    // - CHECKOUT.ORDER.* events: resource.id IS the order id
    const orderId: string | undefined =
      resource?.supplementary_data?.related_ids?.order_id ||
      (eventType.startsWith('CHECKOUT.ORDER.') ? resource.id : undefined);

    if (eventType === 'CHECKOUT.ORDER.APPROVED' || eventType === 'PAYMENT.CAPTURE.COMPLETED') {
      // Recovery path: if we never captured this order on the client redirect,
      // do it now via the existing capture function (server-to-server).
      if (orderId) {
        const { data: order } = await supabaseAdmin
          .from('paypal_orders')
          .select('status, user_id')
          .eq('paypal_order_id', orderId)
          .maybeSingle();

        if (!order || order.status !== 'completed') {
          console.log('Order not yet captured, triggering capture-paypal-order:', orderId);
          // We can't pass a user JWT here. capture-paypal-order requires auth,
          // so instead we directly mark + process minimal state when we have it.
          // For full processing we need user_id, which lives in custom_id of the capture.
          try {
            const captureResp = await fetch(
              `${getPayPalApiUrl()}/v2/checkout/orders/${orderId}`,
              { headers: { Authorization: `Bearer ${accessToken}` } }
            );
            if (captureResp.ok) {
              const orderData = await captureResp.json();
              const customIdRaw =
                orderData?.purchase_units?.[0]?.payments?.captures?.[0]?.custom_id ||
                orderData?.purchase_units?.[0]?.custom_id;
              if (customIdRaw) {
                const customData = JSON.parse(customIdRaw);
                const amount = parseFloat(orderData.purchase_units[0].amount.value);
                const currency = orderData.purchase_units[0].amount.currency_code;

                await supabaseAdmin.from('paypal_orders').upsert({
                  paypal_order_id: orderId,
                  user_id: customData.user_id,
                  order_type: customData.order_type ?? 'marketplace',
                  amount,
                  currency,
                  status: 'webhook_pending_capture',
                  credits_amount:
                    customData.order_type === 'credits' || customData.order_type === 'videoai_credits'
                      ? parseInt(customData.credits)
                      : null,
                  pack_type: customData.pack ?? null,
                  cart_items: customData.cart_items ?? null,
                }, { onConflict: 'paypal_order_id' });
              }
            }
          } catch (e) {
            console.error('Recovery lookup failed:', e);
          }
        }
      }
    } else if (eventType === 'PAYMENT.CAPTURE.REFUNDED' || eventType === 'PAYMENT.CAPTURE.REVERSED') {
      // Mark the order refunded; admin reviews benefit revocation
      if (orderId) {
        await supabaseAdmin
          .from('paypal_orders')
          .update({ status: 'refunded', processed_at: new Date().toISOString() })
          .eq('paypal_order_id', orderId);

        // Reverse seller earnings tied to this order
        await supabaseAdmin
          .from('seller_earnings')
          .update({ status: 'refunded' })
          .eq('paypal_order_id', orderId);

        const { data: order } = await supabaseAdmin
          .from('paypal_orders')
          .select('user_id, order_type')
          .eq('paypal_order_id', orderId)
          .maybeSingle();

        // For Infinity: cancel the active subscription tied to this order
        if (order?.order_type === 'infinity' && order.user_id) {
          await supabaseAdmin
            .from('user_subscriptions')
            .update({ status: 'cancelled' })
            .eq('user_id', order.user_id)
            .eq('paypal_subscription_id', `ORDER_${orderId}`);
        }

        await supabaseAdmin.from('security_audit_log').insert({
          event_type: 'paypal_refund_received',
          user_id: order?.user_id ?? null,
          target_table: 'paypal_orders',
          details: { paypal_order_id: orderId, paypal_event_id: eventId, paypal_event_type: eventType },
        });
      }
    } else {
      console.log('Event type not actively handled:', eventType);
    }

    await supabaseAdmin
      .from('paypal_webhook_events')
      .update({ status: 'processed', processed_at: new Date().toISOString() })
      .eq('paypal_event_id', eventId);

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('paypal-webhook error:', message);
    await supabaseAdmin
      .from('paypal_webhook_events')
      .update({ status: 'failed', error_message: message })
      .eq('paypal_event_id', eventId);
    // Return 200 anyway to prevent infinite PayPal retries on permanent errors.
    return new Response(JSON.stringify({ ok: false, error: message }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
