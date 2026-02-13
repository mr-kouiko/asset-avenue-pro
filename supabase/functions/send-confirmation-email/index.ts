import React from 'npm:react@18.3.1'
import { Webhook } from 'https://esm.sh/standardwebhooks@1.0.0'
import nodemailer from 'npm:nodemailer@6.9.12'
import { renderAsync } from 'npm:@react-email/components@0.0.22'
import { ConfirmationEmail } from './_templates/confirmation-email.tsx'

const hookSecret = Deno.env.get('SEND_EMAIL_HOOK_SECRET') as string

const transporter = nodemailer.createTransport({
  host: Deno.env.get('SMTP_HOST'),
  port: Number(Deno.env.get('SMTP_PORT') || '587'),
  secure: false, // STARTTLS
  auth: {
    user: Deno.env.get('SMTP_USER'),
    pass: Deno.env.get('SMTP_PASS'),
  },
})

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders })
  }

  try {
    const clientIP = req.headers.get('x-forwarded-for') || 'unknown';
    console.log(`Email request from IP: ${clientIP}`);

    const payload = await req.text()
    const headers = Object.fromEntries(req.headers)
    
    if (!payload || payload.trim() === '') {
      console.error('Empty payload received')
      return new Response(JSON.stringify({ error: 'Invalid request payload' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }
    
    console.log('Processing email webhook')
    
    let webhookData;
    if (hookSecret) {
      const wh = new Webhook(hookSecret)
      webhookData = wh.verify(payload, headers) as {
        user: { email: string }
        email_data: {
          token: string
          token_hash: string
          redirect_to: string
          email_action_type: string
          site_url: string
        }
      }
    } else {
      webhookData = JSON.parse(payload)
    }

    if (!webhookData?.user?.email || !webhookData?.email_data) {
      console.error('Missing required webhook data')
      return new Response(JSON.stringify({ error: 'Invalid webhook data' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    const {
      user,
      email_data: { token, token_hash, redirect_to, email_action_type },
    } = webhookData

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(user.email)) {
      console.error(`Invalid email format: ${user.email}`)
      return new Response(JSON.stringify({ error: 'Invalid email format' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    console.log('Processing confirmation email for user')

    const html = await renderAsync(
      React.createElement(ConfirmationEmail, {
        supabase_url: Deno.env.get('SUPABASE_URL') ?? '',
        token,
        token_hash,
        redirect_to: redirect_to || `${Deno.env.get('SITE_URL')}/dashboard`,
        email_action_type,
        user_email: user.email,
      })
    )

    const info = await transporter.sendMail({
      from: 'VisuStock <contact@visustock.com>',
      to: user.email,
      subject: '📸 Confirmez votre inscription sur VisuStock',
      html,
      replyTo: 'support@visustock.com',
      headers: {
        'X-Priority': '1',
        'X-MSMail-Priority': 'High',
        'Importance': 'High',
      },
    })

    console.log('Email sent successfully:', info.messageId)

    return new Response(
      JSON.stringify({ success: true, messageId: info.messageId }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    )
  } catch (error) {
    console.error('Error in send-confirmation-email function:', error)
    
    return new Response(
      JSON.stringify({
        error: {
          message: error.message,
          details: error.toString(),
        },
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    )
  }
})
