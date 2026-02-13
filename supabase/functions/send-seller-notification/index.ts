import React from 'npm:react@18.3.1'
import nodemailer from 'npm:nodemailer@6.9.12'
import { renderAsync } from 'npm:@react-email/components@0.0.22'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { SellerNotificationEmail } from './_templates/seller-notification.tsx'

const transporter = nodemailer.createTransport({
  host: Deno.env.get('SMTP_HOST'),
  port: Number(Deno.env.get('SMTP_PORT') || '587'),
  secure: false,
  auth: {
    user: Deno.env.get('SMTP_USER'),
    pass: Deno.env.get('SMTP_PASS'),
  },
})

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
  test_email?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders })
  }

  try {
    const payload: SellerNotificationRequest = await req.json()
    console.log('Seller notification request:', JSON.stringify(payload))

    if (!payload.seller_id || !payload.items || payload.items.length === 0) {
      throw new Error('Missing required fields: seller_id, items')
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

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

    const { data: buyerProfile } = await supabaseAdmin
      .from('profiles')
      .select('display_name')
      .eq('user_id', payload.buyer_id)
      .single()

    const buyerName = buyerProfile?.display_name || 'A customer'

    const submissionIds = payload.items.map(item => item.submission_id)
    const { data: submissions, error: submissionsError } = await supabaseAdmin
      .from('content_submissions')
      .select('id, title')
      .in('id', submissionIds)

    if (submissionsError) {
      console.error('Failed to fetch submissions:', submissionsError)
    }

    const licenseIds = payload.items.filter(item => item.license_id).map(item => item.license_id)
    let licenses: { id: string; name: string }[] = []
    if (licenseIds.length > 0) {
      const { data: licenseData } = await supabaseAdmin
        .from('licenses')
        .select('id, name')
        .in('id', licenseIds)
      licenses = licenseData || []
    }

    const { data: contentFiles } = await supabaseAdmin
      .from('content_files')
      .select('submission_id, thumbnail_path')
      .in('submission_id', submissionIds)
      .not('thumbnail_path', 'is', null)

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

    const commissionRate = 0.20
    const commissionAmount = payload.total_amount * commissionRate
    const sellerEarnings = payload.total_amount - commissionAmount

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

    const recipientEmail = payload.test_email || sellerProfile.email
    console.log('Sending to:', recipientEmail, payload.test_email ? '(test override)' : '')
    
    const info = await transporter.sendMail({
      from: 'VisuStock <contact@visustock.com>',
      to: recipientEmail,
      subject: `🎉 You made a sale! +€${sellerEarnings.toFixed(2)} earned`,
      html,
      replyTo: 'support@visustock.com',
    })

    console.log('Seller notification email sent:', info.messageId)

    return new Response(
      JSON.stringify({ success: true, messageId: info.messageId }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    )
  } catch (error) {
    console.error('Error in send-seller-notification:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    )
  }
})
