import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PaymentRequest {
  cart_items: Array<{
    submission_id: string;
    price: number;
    license_id?: string;
  }>;
  success_url: string;
  cancel_url: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    // Get authenticated user
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Authentication required" }),
        { status: 401, headers: corsHeaders }
      );
    }

    // SÉCURISÉ: Récupère les clés Stripe depuis les secrets Edge Functions
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY") || "";
    
    if (!stripeSecretKey) {
      return new Response(
        JSON.stringify({ error: "Stripe configuration missing" }),
        { status: 500, headers: corsHeaders }
      );
    }

    // Initialize Stripe
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2023-10-16",
    });

    const { cart_items, success_url, cancel_url }: PaymentRequest = await req.json();

    if (!cart_items || cart_items.length === 0) {
      return new Response(
        JSON.stringify({ error: "Cart is empty" }),
        { status: 400, headers: corsHeaders }
      );
    }

    console.log("Processing payment for", cart_items.length, "items");

    // SÉCURISÉ: Utilise un taux de commission par défaut (peut être configuré via les secrets)
    const commissionRate = parseFloat(Deno.env.get("COMMISSION_RATE") || "0.15"); // 15% default

    // Get submission details and validate sellers have Stripe accounts
    const submissionIds = cart_items.map(item => item.submission_id);
    const { data: submissions, error: submissionsError } = await supabaseService
      .from('content_submissions')
      .select(`
        id,
        title,
        price,
        creator_id,
        profiles!content_submissions_creator_id_fkey(display_name)
      `)
      .in('id', submissionIds)
      .eq('status', 'approved');

    if (submissionsError || !submissions) {
      return new Response(
        JSON.stringify({ error: "Failed to fetch submissions" }),
        { status: 500, headers: corsHeaders }
      );
    }

    // Get seller Stripe accounts
    const sellerIds = submissions.map(s => s.creator_id);
    const { data: stripeAccounts, error: accountsError } = await supabaseService
      .from('stripe_accounts')
      .select('user_id, stripe_account_id, charges_enabled')
      .in('user_id', sellerIds);

    if (accountsError) {
      return new Response(
        JSON.stringify({ error: "Failed to fetch seller accounts" }),
        { status: 500, headers: corsHeaders }
      );
    }

    // Validate all sellers have valid Stripe accounts
    const accountMap = new Map(stripeAccounts?.map(acc => [acc.user_id, acc]) || []);
    
    for (const submission of submissions) {
      const account = accountMap.get(submission.creator_id);
      if (!account || !account.charges_enabled) {
        return new Response(
          JSON.stringify({ 
            error: `Seller for "${submission.title}" doesn't have a valid payment setup` 
          }),
          { status: 400, headers: corsHeaders }
        );
      }
    }

    // Check if customer exists
    let customerId: string | undefined;
    const customers = await stripe.customers.list({ email: user.email!, limit: 1 });
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }

    // Group items by seller to create separate payments
    const paymentsByseller = new Map<string, {
      account_id: string;
      items: typeof cart_items;
      total: number;
    }>();

    for (const cartItem of cart_items) {
      const submission = submissions.find(s => s.id === cartItem.submission_id);
      if (!submission) continue;

      const account = accountMap.get(submission.creator_id)!;
      const sellerId = submission.creator_id;

      if (!paymentsBySeller.has(sellerId)) {
        paymentsBySeller.set(sellerId, {
          account_id: account.stripe_account_id,
          items: [],
          total: 0
        });
      }

      const sellerPayment = paymentsBySeller.get(sellerId)!;
      sellerPayment.items.push(cartItem);
      sellerPayment.total += cartItem.price * 100; // Convert to cents
    }

    // For now, we'll handle only single seller purchases
    // Multi-seller purchases would need multiple checkout sessions
    if (paymentsBySeller.size > 1) {
      return new Response(
        JSON.stringify({ 
          error: "Multi-seller purchases not yet supported. Please purchase from one seller at a time." 
        }),
        { status: 400, headers: corsHeaders }
      );
    }

    const [sellerId, sellerPayment] = Array.from(paymentsBySeller.entries())[0];
    const totalAmount = sellerPayment.total;
    const commissionAmount = Math.round(totalAmount * commissionRate);
    const sellerAmount = totalAmount - commissionAmount;

    console.log("Payment details:", {
      totalAmount,
      commissionAmount,
      sellerAmount,
      sellerId,
      account_id: sellerPayment.account_id
    });

    // Create line items
    const lineItems = sellerPayment.items.map(cartItem => {
      const submission = submissions.find(s => s.id === cartItem.submission_id)!;
      return {
        price_data: {
          currency: 'eur',
          product_data: {
            name: submission.title,
            metadata: {
              submission_id: cartItem.submission_id,
              seller_id: sellerId,
              license_id: cartItem.license_id || ''
            }
          },
          unit_amount: cartItem.price * 100, // Convert to cents
        },
        quantity: 1,
      };
    });

    // Create Stripe Checkout session with Connect
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email!,
      line_items: lineItems,
      mode: 'payment',
      success_url,
      cancel_url,
      payment_intent_data: {
        application_fee_amount: commissionAmount,
        transfer_data: {
          destination: sellerPayment.account_id,
        },
        metadata: {
          buyer_id: user.id,
          seller_id: sellerId,
          commission_amount: commissionAmount.toString(),
          total_amount: totalAmount.toString(),
        }
      },
      metadata: {
        buyer_id: user.id,
        seller_id: sellerId,
        submission_ids: sellerPayment.items.map(item => item.submission_id).join(','),
      }
    }, {
      stripeAccount: sellerPayment.account_id
    });

    console.log("Created checkout session:", session.id);

    return new Response(
      JSON.stringify({ 
        checkout_url: session.url,
        session_id: session.id
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error creating marketplace payment:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: corsHeaders }
    );
  }
});