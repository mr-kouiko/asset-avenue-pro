import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Initialize Supabase client
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
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, email, displayName, storeName, emailType }: VendorEmailRequest = await req.json();

    // Basic validation
    if (!userId || !email || !displayName || !emailType) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(JSON.stringify({ error: 'Invalid email format' }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log(`Processing ${emailType} email for user:`, { userId, email, displayName, storeName });

    if (emailType === 'confirmation') {
      // Send confirmation email to vendor (sellers/creators)
      const confirmationHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Bienvenue sur VisuStock - Compte Vendeur</title>
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; 
              line-height: 1.6; 
              color: #333; 
              max-width: 600px; 
              margin: 0 auto; 
              padding: 20px; 
            }
            .header { 
              text-align: center; 
              padding: 30px 0; 
              border-bottom: 3px solid #FF6B35; 
            }
            .logo { 
              font-size: 32px; 
              font-weight: bold; 
              color: #FF6B35; 
              margin-bottom: 10px; 
            }
            .content { 
              padding: 30px 0; 
            }
            .welcome-box { 
              background: linear-gradient(135deg, #FF6B35 0%, #F7931E 100%); 
              color: white; 
              padding: 25px; 
              border-radius: 10px; 
              text-align: center; 
              margin: 20px 0; 
            }
            .button { 
              display: inline-block; 
              background: #FF6B35; 
              color: white; 
              padding: 12px 30px; 
              text-decoration: none; 
              border-radius: 5px; 
              font-weight: bold; 
              margin: 20px 0; 
            }
            .footer { 
              border-top: 1px solid #ddd; 
              padding: 20px 0; 
              text-align: center; 
              color: #666; 
              font-size: 14px; 
            }
            .checklist { 
              background: #f8f9fa; 
              padding: 20px; 
              border-radius: 8px; 
              margin: 20px 0; 
            }
            .checklist li { 
              margin: 8px 0; 
            }
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
              <a href="https://visustock.com/seller-dashboard" class="button">
                🚀 Accéder au Dashboard Vendeur
              </a>
            </div>
            
            <p><strong>Besoin d'aide ?</strong><br>
            Notre équipe est là pour vous accompagner. N'hésitez pas à nous contacter si vous avez des questions.</p>
          </div>
          
          <div class="footer">
            <p><strong>VisuStock Team</strong><br>
            📧 support@visustock.com<br>
            🌐 <a href="https://visustock.com">visustock.com</a></p>
            
            <p style="margin-top: 20px; font-size: 12px; color: #999;">
              Cet email a été envoyé automatiquement. Si vous n'avez pas créé de compte VisuStock, vous pouvez ignorer ce message.
            </p>
          </div>
        </body>
        </html>
      `;

      const confirmationResult = await resend.emails.send({
        from: "VisuStock <noreply@visustock.com>",
        to: [email],
        subject: "🎉 Bienvenue sur VisuStock - Votre compte vendeur est activé !",
        html: confirmationHtml,
        reply_to: "support@visustock.com",
        headers: {
          'X-Priority': '1',
          'X-MSMail-Priority': 'High',
          'Importance': 'High',
        },
        tags: [
          { name: 'category', value: 'auth' },
          { name: 'email_type', value: 'seller_confirmation' }
        ]
      });

      console.log("Confirmation email sent:", confirmationResult);

      // Also send admin notification for new sellers
      const adminHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Nouveau vendeur inscrit - VisuStock</title>
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; 
              line-height: 1.6; 
              color: #333; 
              max-width: 600px; 
              margin: 0 auto; 
              padding: 20px; 
            }
            .header { 
              background: linear-gradient(135deg, #FF6B35 0%, #F7931E 100%); 
              color: white; 
              padding: 20px; 
              border-radius: 10px; 
              text-align: center; 
            }
            .info-box { 
              background: #f8f9fa; 
              padding: 20px; 
              border-radius: 8px; 
              margin: 20px 0; 
              border-left: 4px solid #FF6B35; 
            }
            .button { 
              display: inline-block; 
              background: #FF6B35; 
              color: white; 
              padding: 12px 30px; 
              text-decoration: none; 
              border-radius: 5px; 
              font-weight: bold; 
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>🔔 Nouveau Vendeur Inscrit</h1>
            <p>VisuStock - Notification Admin</p>
          </div>
          
          <div class="info-box">
            <h3>📋 Détails du nouveau vendeur :</h3>
            <ul>
              <li><strong>Nom :</strong> ${displayName}</li>
              <li><strong>Email :</strong> ${email}</li>
              <li><strong>ID Utilisateur :</strong> ${userId}</li>
              ${storeName ? `<li><strong>Nom de boutique :</strong> ${storeName}</li>` : ''}
              <li><strong>Date d'inscription :</strong> ${new Date().toLocaleString('fr-FR')}</li>
            </ul>
          </div>
          
          <p>Un nouveau créateur vient de s'inscrire sur la plateforme VisuStock. Son compte a été automatiquement activé et il peut maintenant commencer à télécharger du contenu.</p>
          
          <p style="font-size: 14px; color: #666; border-top: 1px solid #ddd; padding-top: 20px;">
            Cette notification automatique vous aide à suivre la croissance de votre communauté de créateurs.
          </p>
        </body>
        </html>
      `;

      const adminResult = await resend.emails.send({
        from: "VisuStock Admin <admin@visustock.com>",
        to: ["admin@visustock.com"], // Replace with actual admin email
        subject: `🔔 Nouveau vendeur inscrit: ${displayName}`,
        html: adminHtml,
        reply_to: "noreply@visustock.com"
      });

      console.log("Admin notification sent:", adminResult);

      return new Response(JSON.stringify({ 
        success: true, 
        confirmationResult,
        adminResult 
      }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      });

    } else if (emailType === 'welcome') {
      // Send welcome email to regular buyers/clients
      const welcomeHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Bienvenue sur VisuStock</title>
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; 
              line-height: 1.6; 
              color: #333; 
              max-width: 600px; 
              margin: 0 auto; 
              padding: 20px; 
            }
            .header { 
              text-align: center; 
              padding: 30px 0; 
              border-bottom: 3px solid #FF6B35; 
            }
            .logo { 
              font-size: 32px; 
              font-weight: bold; 
              color: #FF6B35; 
              margin-bottom: 10px; 
            }
            .content { 
              padding: 30px 0; 
            }
            .welcome-box { 
              background: linear-gradient(135deg, #FF6B35 0%, #F7931E 100%); 
              color: white; 
              padding: 25px; 
              border-radius: 10px; 
              text-align: center; 
              margin: 20px 0; 
            }
            .button { 
              display: inline-block; 
              background: #FF6B35; 
              color: white; 
              padding: 12px 30px; 
              text-decoration: none; 
              border-radius: 5px; 
              font-weight: bold; 
              margin: 20px 0; 
            }
            .footer { 
              border-top: 1px solid #ddd; 
              padding: 20px 0; 
              text-align: center; 
              color: #666; 
              font-size: 14px; 
            }
            .features { 
              background: #f8f9fa; 
              padding: 20px; 
              border-radius: 8px; 
              margin: 20px 0; 
            }
            .features li { 
              margin: 8px 0; 
            }
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
            
            <p>Merci de rejoindre la communauté VisuStock ! Vous pouvez maintenant explorer et acheter du contenu premium créé par nos talentueux créateurs.</p>
            
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
              <a href="https://visustock.com/marketplace" class="button">
                🛒 Découvrir le Marketplace
              </a>
            </div>
            
            <p><strong>Envie de devenir vendeur ?</strong><br>
            Vous pouvez également devenir créateur sur notre plateforme et vendre vos propres créations !</p>
            
            <div style="text-align: center; margin: 20px 0;">
              <a href="https://visustock.com/auth/seller" style="background: #28a745; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                🎨 Devenir Vendeur
              </a>
            </div>
          </div>
          
          <div class="footer">
            <p><strong>VisuStock Team</strong><br>
            📧 support@visustock.com<br>
            🌐 <a href="https://visustock.com">visustock.com</a></p>
            
            <p style="margin-top: 20px; font-size: 12px; color: #999;">
              Cet email a été envoyé automatiquement. Si vous n'avez pas créé de compte VisuStock, vous pouvez ignorer ce message.
            </p>
          </div>
        </body>
        </html>
      `;

      const welcomeResult = await resend.emails.send({
        from: "VisuStock <noreply@visustock.com>",
        to: [email],
        subject: "🎉 Bienvenue sur VisuStock - Découvrez notre marketplace !",
        html: welcomeHtml,
        reply_to: "support@visustock.com",
        headers: {
          'X-Priority': '1',
          'X-MSMail-Priority': 'High',
          'Importance': 'High',
        },
        tags: [
          { name: 'category', value: 'auth' },
          { name: 'email_type', value: 'buyer_welcome' }
        ]
      });

      console.log("Welcome email sent:", welcomeResult);

      return new Response(JSON.stringify({ 
        success: true, 
        welcomeResult 
      }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
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