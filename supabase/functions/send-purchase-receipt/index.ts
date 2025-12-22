import React from 'npm:react@18.3.1'
import { Resend } from 'npm:resend@4.0.0'
import { renderAsync } from 'npm:@react-email/components@0.0.22'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { PurchaseReceiptEmail } from './_templates/purchase-receipt.tsx'

const resend = new Resend(Deno.env.get('RESEND_API_KEY') as string)

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
  test_email?: string // Override email for testing
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

    // Fetch buyer profile
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

    // Fetch content details
    const submissionIds = payload.items.map(item => item.submission_id)
    const { data: submissions, error: submissionsError } = await supabaseAdmin
      .from('content_submissions')
      .select('id, title, description')
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

    // Fetch file info for thumbnails and format
    const { data: contentFiles } = await supabaseAdmin
      .from('content_files')
      .select('submission_id, thumbnail_path, file_format, metadata')
      .in('submission_id', submissionIds)

    // Build items array for email
    const emailItems = payload.items.map(item => {
      const submission = submissions?.find(s => s.id === item.submission_id)
      const license = licenses.find(l => l.id === item.license_id)
      const file = contentFiles?.find(f => f.submission_id === item.submission_id)
      
      // Extract format info from metadata
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

    // Calculate totals
    const subtotal = payload.total
    const tax = 0 // No tax for digital goods in this case
    const total = subtotal + tax

    // Render email
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

    // Send email (use test_email override if provided)
    const recipientEmail = payload.test_email || buyerProfile.email
    console.log('Sending receipt to:', recipientEmail, payload.test_email ? '(test override)' : '')

    const { data, error } = await resend.emails.send({
      from: 'VisuStock <noreply@visustock.com>',
      to: [recipientEmail],
      subject: `Your VisuStock Purchase Receipt - Order #${payload.order_id.slice(-8).toUpperCase()}`,
      html,
      reply_to: 'support@visustock.com',
      tags: [
        { name: 'category', value: 'transaction' },
        { name: 'email_type', value: 'purchase_receipt' },
      ],
    })

    if (error) {
      console.error('Failed to send email:', error)
      throw error
    }

    console.log('Purchase receipt email sent:', data)

    return new Response(
      JSON.stringify({ success: true, emailId: data?.id }),
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
