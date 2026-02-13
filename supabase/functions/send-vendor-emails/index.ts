import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import nodemailer from 'npm:nodemailer@6.9.12';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const transporter = nodemailer.createTransport({
  host: Deno.env.get('SMTP_HOST'),
  port: Number(Deno.env.get('SMTP_PORT') || '587'),
  secure: false,
  auth: {
    user: Deno.env.get('SMTP_USER'),
    pass: Deno.env.get('SMTP_PASS'),
  },
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseKey);

interface VendorEmailRequest {
  userId: string;
  email: string;
  displayName: string;
  storeName?: string;
  emailType: 'confirmation' | 'admin_notification' | 'welcome';
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, email, displayName, storeName, emailType }: VendorEmailRequest = await req.json();

    if (!userId || !email || !displayName || !emailType) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(JSON.stringify({ error: 'Invalid email format' }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log(`Processing ${emailType} email for user:`, { userId, email, displayName, storeName });

    if (emailType === 'confirmation') {
      const confirmationHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Bienvenue sur VisuStock - Compte Vendeur</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { text-align: center; padding: 30px 0; border-bottom: 3px solid #FF6B35; }
            .logo { font-size: 32px; font-weight: bold; color: #FF6B35; margin-bottom: 10px; }
            .content { padding: 30px 0; }
            .welcome-box { background: linear-gradient(135deg, #FF6B35 0%, #F7931E 100%); color: white; padding: 25px; border-radius: 10px; text-align: center; margin: 20px 0; }
            .button { display: inline-block; background: #FF6B35; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }
            .footer { border-top: 1px solid #ddd; padding: 20px 0; text-align: center; color: #666; font-size: 14px; }
            .checklist { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .checklist li { margin: 8px 0; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">📸 VisuStock</div>
            <p>Plateforme de contenus visuels premium</p>
          </div>
          <div class="content">
            <div class="welcome-box">
              <h1>🎉 Bienvenue ${displayName}!</h1>
              <p>Votre compte vendeur VisuStock est maintenant activé</p>
            </div>
            <p>Félicitations ! Votre inscription en tant que créateur sur VisuStock a été confirmée avec succès.</p>
            ${storeName ? `<p><strong>Nom de votre boutique :</strong> ${storeName}</p>` : ''}
            <div class="checklist">
              <h3>✅ Prochaines étapes :</h3>
              <ul>
                <li>📤 Commencez à télécharger vos premiers contenus</li>
                <li>🏷️ Ajoutez des tags et descriptions détaillées</li>
                <li>💰 Définissez vos prix et licences</li>
                <li>📊 Suivez vos ventes dans votre tableau de bord</li>
              </ul>
            </div>
            <div style="text-align: center;">
              <a href="https://visustock.com/seller-dashboard" class="button">🚀 Accéder au Dashboard Vendeur</a>
            </div>
            <p><strong>Besoin d'aide ?</strong><br>Notre équipe est là pour vous accompagner.</p>
          </div>
          <div class="footer">
            <p><strong>VisuStock Team</strong><br>📧 support@visustock.com<br>🌐 <a href="https://visustock.com">visustock.com</a></p>
            <p style="margin-top: 20px; font-size: 12px; color: #999;">Cet email a été envoyé automatiquement.</p>
          </div>
        </body>
        </html>
      `;

      const confirmationResult = await transporter.sendMail({
        from: "VisuStock <contact@visustock.com>",
        to: email,
        subject: "🎉 Bienvenue sur VisuStock - Votre compte vendeur est activé !",
        html: confirmationHtml,
        replyTo: "support@visustock.com",
        headers: { 'X-Priority': '1', 'Importance': 'High' },
      });

      console.log("Confirmation email sent:", confirmationResult.messageId);

      const adminHtml = `
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"><title>Nouveau vendeur inscrit</title></head>
        <body style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #FF6B35, #F7931E); color: white; padding: 20px; border-radius: 10px; text-align: center;">
            <h1>🔔 Nouveau Vendeur Inscrit</h1>
          </div>
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #FF6B35;">
            <h3>📋 Détails :</h3>
            <ul>
              <li><strong>Nom :</strong> ${displayName}</li>
              <li><strong>Email :</strong> ${email}</li>
              <li><strong>ID :</strong> ${userId}</li>
              ${storeName ? `<li><strong>Boutique :</strong> ${storeName}</li>` : ''}
              <li><strong>Date :</strong> ${new Date().toLocaleString('fr-FR')}</li>
            </ul>
          </div>
        </body>
        </html>
      `;

      const adminResult = await transporter.sendMail({
        from: "VisuStock Admin <contact@visustock.com>",
        to: "contact@visustock.com",
        subject: `🔔 Nouveau vendeur inscrit: ${displayName}`,
        html: adminHtml,
      });

      console.log("Admin notification sent:", adminResult.messageId);

      return new Response(JSON.stringify({ 
        success: true, 
        confirmationMessageId: confirmationResult.messageId,
        adminMessageId: adminResult.messageId 
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });

    } else if (emailType === 'welcome') {
      const welcomeHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Bienvenue sur VisuStock</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { text-align: center; padding: 30px 0; border-bottom: 3px solid #FF6B35; }
            .logo { font-size: 32px; font-weight: bold; color: #FF6B35; margin-bottom: 10px; }
            .content { padding: 30px 0; }
            .welcome-box { background: linear-gradient(135deg, #FF6B35 0%, #F7931E 100%); color: white; padding: 25px; border-radius: 10px; text-align: center; margin: 20px 0; }
            .button { display: inline-block; background: #FF6B35; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }
            .footer { border-top: 1px solid #ddd; padding: 20px 0; text-align: center; color: #666; font-size: 14px; }
            .features { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .features li { margin: 8px 0; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">📸 VisuStock</div>
            <p>Plateforme de contenus visuels premium</p>
          </div>
          <div class="content">
            <div class="welcome-box">
              <h1>🎉 Bienvenue ${displayName}!</h1>
              <p>Votre compte VisuStock est maintenant activé</p>
            </div>
            <p>Merci de rejoindre la communauté VisuStock !</p>
            <div class="features">
              <h3>🌟 Découvrez nos fonctionnalités :</h3>
              <ul>
                <li>🔍 Explorez notre marketplace de contenus uniques</li>
                <li>📥 Téléchargez vos achats immédiatement</li>
                <li>📊 Suivez vos achats dans votre dashboard</li>
                <li>🎨 Accédez à du contenu exclusif de qualité professionnelle</li>
              </ul>
            </div>
            <div style="text-align: center;">
              <a href="https://visustock.com/marketplace" class="button">🛒 Découvrir le Marketplace</a>
            </div>
            <p><strong>Envie de devenir vendeur ?</strong><br>
            <a href="https://visustock.com/auth/seller" style="background: #28a745; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">🎨 Devenir Vendeur</a></p>
          </div>
          <div class="footer">
            <p><strong>VisuStock Team</strong><br>📧 support@visustock.com<br>🌐 <a href="https://visustock.com">visustock.com</a></p>
            <p style="margin-top: 20px; font-size: 12px; color: #999;">Cet email a été envoyé automatiquement.</p>
          </div>
        </body>
        </html>
      `;

      const welcomeResult = await transporter.sendMail({
        from: "VisuStock <contact@visustock.com>",
        to: email,
        subject: "🎉 Bienvenue sur VisuStock - Découvrez notre marketplace !",
        html: welcomeHtml,
        replyTo: "support@visustock.com",
        headers: { 'X-Priority': '1', 'Importance': 'High' },
      });

      console.log("Welcome email sent:", welcomeResult.messageId);

      return new Response(JSON.stringify({ 
        success: true, 
        messageId: welcomeResult.messageId 
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });

    } else {
      return new Response(JSON.stringify({ error: "Invalid email type" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

  } catch (error: any) {
    console.error("Error in send-vendor-emails function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
