import React from 'npm:react@18.3.1'
import { Resend } from 'npm:resend@4.0.0'
import { renderAsync } from 'npm:@react-email/components@0.0.22'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { SellerNotificationEmail } from './_templates/seller-notification.tsx'

const resend = new Resend(Deno.env.get('RESEND_API_KEY') as string)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SaleItem {
  submission_id: string;
  license_id?: string;
  price: number;
}

interface SellerNotificationRequest {
  seller_id: string;
  buyer_id: string;
  order_id: string;
  items: SaleItem[];
  total_amount: number;
  currency: string;
  test_email?: string; // Override email for testing
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders })
  }

  try {
    const payload: SellerNotificationRequest = await req.json()
    console.log('Seller notification request:', JSON.stringify(payload))

    // Validate required fields
    if (!payload.seller_id || !payload.items || payload.items.length === 0) {
      throw new Error('Missing required fields: seller_id, items')
    }

    // Create Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Fetch seller profile
    const { data: sellerProfile, error: sellerError } = await supabaseAdmin
      .from('profiles')
      .select('email, display_name, store_name')
      .eq('user_id', payload.seller_id)
      .single()

    if (sellerError || !sellerProfile) {
      console.error('Failed to fetch seller profile:', sellerError)
      throw new Error('Seller profile not found')
    }

    console.log('Seller found:', sellerProfile.display_name || sellerProfile.store_name)

    // Fetch buyer profile (for display name only)
    const { data: buyerProfile } = await supabaseAdmin
      .from('profiles')
      .select('display_name')
      .eq('user_id', payload.buyer_id)
      .single()

    const buyerName = buyerProfile?.display_name || 'A customer'

    // Fetch content details for each item
    const submissionIds = payload.items.map(item => item.submission_id)
    const { data: submissions, error: submissionsError } = await supabaseAdmin
      .from('content_submissions')
      .select('id, title')
      .in('id', submissionIds)

    if (submissionsError) {
      console.error('Failed to fetch submissions:', submissionsError)
    }

    // Fetch license names
    const licenseIds = payload.items.filter(item => item.license_id).map(item => item.license_id)
    let licenses: { id: string; name: string }[] = []
    if (licenseIds.length > 0) {
      const { data: licenseData } = await supabaseAdmin
        .from('licenses')
        .select('id, name')
        .in('id', licenseIds)
      licenses = licenseData || []
    }

    // Fetch thumbnails for items
    const { data: contentFiles } = await supabaseAdmin
      .from('content_files')
      .select('submission_id, thumbnail_path')
      .in('submission_id', submissionIds)
      .not('thumbnail_path', 'is', null)

    // Build items array for email
    const emailItems = payload.items.map(item => {
      const submission = submissions?.find(s => s.id === item.submission_id)
      const license = licenses.find(l => l.id === item.license_id)
      const file = contentFiles?.find(f => f.submission_id === item.submission_id)
      
      return {
        title: submission?.title || 'Content Item',
        license_type: license?.name || 'Standard',
        price: item.price,
        thumbnail_url: file?.thumbnail_path || undefined,
      }
    })

    // Calculate commission (20%)
    const commissionRate = 0.20
    const commissionAmount = payload.total_amount * commissionRate
    const sellerEarnings = payload.total_amount - commissionAmount

    // Render email template
    const html = await renderAsync(
      React.createElement(SellerNotificationEmail, {
        seller_name: sellerProfile.display_name || sellerProfile.store_name || 'Creator',
        buyer_name: buyerName,
        items: emailItems,
        total_amount: payload.total_amount,
        commission_amount: commissionAmount,
        seller_earnings: sellerEarnings,
        currency: payload.currency || 'EUR',
        transaction_date: new Date().toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        }),
        order_id: payload.order_id,
      })
    )

    // Send email (use test_email override if provided)
    const recipientEmail = payload.test_email || sellerProfile.email
    console.log('Sending to:', recipientEmail, payload.test_email ? '(test override)' : '')
    
    const { data, error } = await resend.emails.send({
      from: 'VisuStock <noreply@visustock.com>',
      to: [recipientEmail],
      subject: `🎉 You made a sale! +€${sellerEarnings.toFixed(2)} earned`,
      html,
      reply_to: 'support@visustock.com',
      tags: [
        { name: 'category', value: 'transaction' },
        { name: 'email_type', value: 'seller_notification' }
      ]
    })

    if (error) {
      console.error('Failed to send email:', error)
      throw error
    }

    console.log('Seller notification email sent:', data)

    return new Response(
      JSON.stringify({ success: true, emailId: data?.id }),
      { 
        status: 200, 
        headers: { 'Content-Type': 'application/json', ...corsHeaders } 
      }
    )
  } catch (error) {
    console.error('Error in send-seller-notification:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500, 
        headers: { 'Content-Type': 'application/json', ...corsHeaders } 
      }
    )
  }
})
