import React from 'npm:react@18.3.1'
import nodemailer from 'npm:nodemailer@6.9.12'
import { renderAsync } from 'npm:@react-email/components@0.0.22'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { PurchaseReceiptEmail } from './_templates/purchase-receipt.tsx'

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

interface PurchaseItem {
  submission_id: string
  license_id?: string
  price: number
}

interface PurchaseReceiptRequest {
  user_id: string
  order_id: string
  payment_type: string
  items: PurchaseItem[]
  total: number
  currency: string
  test_email?: string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders })
  }

  try {
    const payload: PurchaseReceiptRequest = await req.json()
    console.log('Purchase receipt request:', JSON.stringify(payload))

    if (!payload.user_id || !payload.items || payload.items.length === 0) {
      throw new Error('Missing required fields: user_id, items')
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data: buyerProfile, error: buyerError } = await supabaseAdmin
      .from('profiles')
      .select('email, display_name')
      .eq('user_id', payload.user_id)
      .single()

    if (buyerError || !buyerProfile) {
      console.error('Failed to fetch buyer profile:', buyerError)
      throw new Error('Buyer profile not found')
    }

    console.log('Buyer found:', buyerProfile.display_name || buyerProfile.email)

    const submissionIds = payload.items.map(item => item.submission_id)
    const { data: submissions, error: submissionsError } = await supabaseAdmin
      .from('content_submissions')
      .select('id, title, description')
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
      .select('submission_id, thumbnail_path, file_format, metadata')
      .in('submission_id', submissionIds)

    const emailItems = payload.items.map(item => {
      const submission = submissions?.find(s => s.id === item.submission_id)
      const license = licenses.find(l => l.id === item.license_id)
      const file = contentFiles?.find(f => f.submission_id === item.submission_id)
      
      let format = file?.file_format?.toUpperCase() || 'Digital'
      if (file?.metadata) {
        const meta = file.metadata as Record<string, any>
        if (meta.width && meta.height) {
          format = `${meta.width}x${meta.height} | ${format}`
        }
      }

      return {
        title: submission?.title || 'Content Item',
        description: submission?.description,
        license_type: license?.name || 'Standard',
        price: item.price,
        thumbnail_url: file?.thumbnail_path || undefined,
        format,
      }
    })

    const subtotal = payload.total
    const tax = 0
    const total = subtotal + tax

    const html = await renderAsync(
      React.createElement(PurchaseReceiptEmail, {
        buyer_name: buyerProfile.display_name || 'Customer',
        buyer_email: buyerProfile.email,
        order_id: payload.order_id,
        payment_type: payload.payment_type || 'Card',
        items: emailItems,
        subtotal,
        tax,
        total,
        currency: payload.currency || 'EUR',
        transaction_date: new Date().toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }),
      })
    )

    const recipientEmail = payload.test_email || buyerProfile.email
    console.log('Sending receipt to:', recipientEmail, payload.test_email ? '(test override)' : '')

    const info = await transporter.sendMail({
      from: 'VisuStock <contact@visustock.com>',
      to: recipientEmail,
      subject: `Your VisuStock Purchase Receipt - Order #${payload.order_id.slice(-8).toUpperCase()}`,
      html,
      replyTo: 'support@visustock.com',
    })

    console.log('Purchase receipt email sent:', info.messageId)

    return new Response(
      JSON.stringify({ success: true, messageId: info.messageId }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    )
  } catch (error) {
    console.error('Error in send-purchase-receipt:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    )
  }
})
