import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
  Img,
} from 'npm:@react-email/components@0.0.22'
import * as React from 'npm:react@18.3.1'

interface ConfirmationEmailProps {
  supabase_url: string
  email_action_type: string
  redirect_to: string
  token_hash: string
  token: string
  user_email: string
}

export const ConfirmationEmail = ({
  token_hash,
  supabase_url,
  email_action_type,
  redirect_to,
  user_email,
}: ConfirmationEmailProps) => (
  <Html>
    <Head />
    <Preview>Confirmez votre inscription sur VisuStock</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoSection}>
          <Text style={logo}>📸 VisuStock</Text>
          <Text style={tagline}>Plateforme de contenus visuels premium</Text>
        </Section>
        
        <Section style={welcomeSection}>
          <Heading style={h1}>Bienvenue !</Heading>
          <Text style={welcomeText}>
            Cliquez sur le bouton ci-dessous pour confirmer votre inscription et commencer à utiliser VisuStock.
          </Text>
        </Section>

        <Section style={buttonSection}>
          <Link
            href={`${supabase_url}/auth/v1/verify?token=${token_hash}&type=${email_action_type}&redirect_to=${redirect_to}`}
            style={button}
          >
            Confirmer mon inscription
          </Link>
        </Section>

        <Section style={helpSection}>
          <Text style={helpText}>
            Si le bouton ne fonctionne pas, copiez et collez ce lien dans votre navigateur :
          </Text>
          <Text style={linkText}>
            {`${supabase_url}/auth/v1/verify?token=${token_hash}&type=${email_action_type}&redirect_to=${redirect_to}`}
          </Text>
        </Section>

        <Section style={footer}>
          <Text style={footerText}>
            <strong>Équipe VisuStock</strong><br />
            📧 support@visustock.com<br />
            🌐 visustock.com
          </Text>
          <Text style={disclaimer}>
            Si vous n'avez pas créé de compte VisuStock, vous pouvez ignorer cet email en toute sécurité.
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export default ConfirmationEmail

// Styles
const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
}

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
  maxWidth: '600px',
}

const logoSection = {
  padding: '32px 32px 0',
  textAlign: 'center' as const,
}

const logo = {
  fontSize: '32px',
  fontWeight: 'bold',
  color: '#FF6B35',
  margin: '0 0 8px',
  lineHeight: '1.2',
}

const tagline = {
  fontSize: '16px',
  color: '#666666',
  margin: '0 0 32px',
  lineHeight: '1.4',
}

const welcomeSection = {
  padding: '0 32px',
  textAlign: 'center' as const,
}

const h1 = {
  color: '#1a1a1a',
  fontSize: '28px',
  fontWeight: 'bold',
  margin: '0 0 16px',
  lineHeight: '1.3',
}

const welcomeText = {
  color: '#666666',
  fontSize: '16px',
  lineHeight: '1.6',
  margin: '0 0 32px',
}

const buttonSection = {
  padding: '0 32px',
  textAlign: 'center' as const,
}

const button = {
  backgroundColor: '#FF6B35',
  borderRadius: '8px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '16px 32px',
  margin: '0 0 32px',
  cursor: 'pointer',
}

const helpSection = {
  padding: '0 32px',
  marginTop: '32px',
}

const helpText = {
  color: '#666666',
  fontSize: '14px',
  lineHeight: '1.5',
  margin: '0 0 8px',
}

const linkText = {
  color: '#FF6B35',
  fontSize: '14px',
  lineHeight: '1.5',
  wordBreak: 'break-all' as const,
  margin: '0 0 24px',
}

const footer = {
  borderTop: '1px solid #e6e6e6',
  padding: '32px 32px 0',
  textAlign: 'center' as const,
}

const footerText = {
  color: '#666666',
  fontSize: '14px',
  lineHeight: '1.5',
  margin: '0 0 16px',
}

const disclaimer = {
  color: '#999999',
  fontSize: '12px',
  lineHeight: '1.4',
  margin: '0',
}