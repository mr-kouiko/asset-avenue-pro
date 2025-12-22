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
  Row,
  Column,
  Hr,
} from 'npm:@react-email/components@0.0.22'
import * as React from 'npm:react@18.3.1'

interface SoldItem {
  title: string;
  license_type: string;
  price: number;
  thumbnail_url?: string;
}

interface SellerNotificationProps {
  seller_name: string;
  buyer_name: string;
  items: SoldItem[];
  total_amount: number;
  commission_amount: number;
  seller_earnings: number;
  currency: string;
  transaction_date: string;
  order_id: string;
}

export const SellerNotificationEmail = ({
  seller_name = 'Creator',
  buyer_name = 'A customer',
  items = [],
  total_amount = 0,
  commission_amount = 0,
  seller_earnings = 0,
  currency = 'EUR',
  transaction_date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
  order_id = '',
}: SellerNotificationProps) => {
  const currencySymbol = currency === 'USD' ? '$' : '€';
  
  return (
    <Html>
      <Head />
      <Preview>🎉 You made a sale on VisuStock! {currencySymbol}{seller_earnings.toFixed(2)} earned</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={headerSection}>
            <Img
              src="https://kdgfpophpoqugtuvfxqx.supabase.co/storage/v1/object/public/logo%20VisuStock/VISUSTOCK%20NO%20NACKGROUND.png"
              alt="VisuStock"
              style={logoImage}
            />
          </Section>
          
          {/* Success Banner */}
          <Section style={successBanner}>
            <Text style={successIcon}>🎉</Text>
            <Heading style={successTitle}>You Made a Sale!</Heading>
            <Text style={successSubtitle}>
              Congratulations, {seller_name}! Someone just purchased your content.
            </Text>
          </Section>

          {/* Earnings Summary */}
          <Section style={earningsSection}>
            <Text style={earningsLabel}>Your Earnings</Text>
            <Text style={earningsAmount}>{currencySymbol}{seller_earnings.toFixed(2)}</Text>
            <Text style={earningsNote}>
              (After {currencySymbol}{commission_amount.toFixed(2)} platform fee)
            </Text>
          </Section>

          <Hr style={divider} />

          {/* Order Details */}
          <Section style={detailsSection}>
            <Heading style={sectionTitle}>Sale Details</Heading>
            
            <Row style={detailRow}>
              <Column style={detailLabel}>Buyer:</Column>
              <Column style={detailValue}>{buyer_name}</Column>
            </Row>
            
            <Row style={detailRow}>
              <Column style={detailLabel}>Order ID:</Column>
              <Column style={detailValue}>{order_id}</Column>
            </Row>
            
            <Row style={detailRow}>
              <Column style={detailLabel}>Date:</Column>
              <Column style={detailValue}>{transaction_date}</Column>
            </Row>
          </Section>

          <Hr style={divider} />

          {/* Sold Items */}
          <Section style={itemsSection}>
            <Heading style={sectionTitle}>Items Sold</Heading>
            
            {items.map((item, index) => (
              <Section key={index} style={itemCard}>
                <Row>
                  <Column style={itemThumbnailCol}>
                    {item.thumbnail_url ? (
                      <Img
                        src={item.thumbnail_url}
                        alt={item.title}
                        style={itemThumbnail}
                      />
                    ) : (
                      <Section style={itemPlaceholder}>
                        <Text style={itemPlaceholderText}>📷</Text>
                      </Section>
                    )}
                  </Column>
                  <Column style={itemDetailsCol}>
                    <Text style={itemTitle}>{item.title}</Text>
                    <Text style={itemLicense}>{item.license_type} License</Text>
                  </Column>
                  <Column style={itemPriceCol}>
                    <Text style={itemPrice}>{currencySymbol}{item.price.toFixed(2)}</Text>
                  </Column>
                </Row>
              </Section>
            ))}
          </Section>

          <Hr style={divider} />

          {/* Summary */}
          <Section style={summarySection}>
            <Row style={summaryRow}>
              <Column style={summaryLabel}>Sale Total:</Column>
              <Column style={summaryValue}>{currencySymbol}{total_amount.toFixed(2)}</Column>
            </Row>
            <Row style={summaryRow}>
              <Column style={summaryLabel}>Platform Fee (15%):</Column>
              <Column style={summaryValueMuted}>-{currencySymbol}{commission_amount.toFixed(2)}</Column>
            </Row>
            <Row style={summaryRowTotal}>
              <Column style={summaryLabelTotal}>Your Earnings:</Column>
              <Column style={summaryValueTotal}>{currencySymbol}{seller_earnings.toFixed(2)}</Column>
            </Row>
          </Section>

          {/* CTA */}
          <Section style={ctaSection}>
            <Link href="https://visustock.com/seller-dashboard" style={ctaButton}>
              View Your Dashboard
            </Link>
          </Section>

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerText}>
              Thank you for being a VisuStock creator!<br />
              Your earnings will be available for payout according to our payment schedule.
            </Text>
            <Text style={footerLinks}>
              <Link href="https://visustock.com/seller-dashboard" style={footerLink}>Dashboard</Link>
              {' • '}
              <Link href="https://visustock.com/support" style={footerLink}>Support</Link>
              {' • '}
              <Link href="https://visustock.com/terms" style={footerLink}>Terms</Link>
            </Text>
            <Text style={copyright}>
              © {new Date().getFullYear()} VisuStock - Premium Digital Marketplace
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export default SellerNotificationEmail;

// Styles
const main = {
  backgroundColor: '#f4f4f5',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Ubuntu, sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  maxWidth: '600px',
  borderRadius: '8px',
  overflow: 'hidden',
  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
};

const headerSection = {
  backgroundColor: '#18181b',
  padding: '24px',
  textAlign: 'center' as const,
};

const logoImage = {
  width: '160px',
  height: 'auto',
  margin: '0 auto',
};

const successBanner = {
  backgroundColor: '#10b981',
  padding: '32px 24px',
  textAlign: 'center' as const,
};

const successIcon = {
  fontSize: '48px',
  margin: '0 0 8px',
};

const successTitle = {
  color: '#ffffff',
  fontSize: '28px',
  fontWeight: 'bold',
  margin: '0 0 8px',
};

const successSubtitle = {
  color: 'rgba(255, 255, 255, 0.9)',
  fontSize: '16px',
  margin: '0',
  lineHeight: '1.5',
};

const earningsSection = {
  padding: '32px 24px',
  textAlign: 'center' as const,
  backgroundColor: '#fafafa',
};

const earningsLabel = {
  color: '#71717a',
  fontSize: '14px',
  margin: '0 0 8px',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
};

const earningsAmount = {
  color: '#10b981',
  fontSize: '48px',
  fontWeight: 'bold',
  margin: '0',
  lineHeight: '1',
};

const earningsNote = {
  color: '#a1a1aa',
  fontSize: '14px',
  margin: '8px 0 0',
};

const divider = {
  borderColor: '#e4e4e7',
  margin: '0',
};

const detailsSection = {
  padding: '24px',
};

const sectionTitle = {
  color: '#18181b',
  fontSize: '18px',
  fontWeight: '600',
  margin: '0 0 16px',
};

const detailRow = {
  marginBottom: '8px',
};

const detailLabel = {
  color: '#71717a',
  fontSize: '14px',
  width: '120px',
};

const detailValue = {
  color: '#18181b',
  fontSize: '14px',
  fontWeight: '500',
};

const itemsSection = {
  padding: '24px',
  backgroundColor: '#fafafa',
};

const itemCard = {
  backgroundColor: '#ffffff',
  borderRadius: '8px',
  padding: '12px',
  marginBottom: '12px',
  border: '1px solid #e4e4e7',
};

const itemThumbnailCol = {
  width: '60px',
  verticalAlign: 'top' as const,
};

const itemThumbnail = {
  width: '50px',
  height: '50px',
  borderRadius: '4px',
  objectFit: 'cover' as const,
};

const itemPlaceholder = {
  width: '50px',
  height: '50px',
  backgroundColor: '#e4e4e7',
  borderRadius: '4px',
  textAlign: 'center' as const,
  lineHeight: '50px',
};

const itemPlaceholderText = {
  margin: '0',
  fontSize: '20px',
  lineHeight: '50px',
};

const itemDetailsCol = {
  verticalAlign: 'top' as const,
  paddingLeft: '8px',
};

const itemTitle = {
  color: '#18181b',
  fontSize: '14px',
  fontWeight: '600',
  margin: '0 0 4px',
};

const itemLicense = {
  color: '#71717a',
  fontSize: '12px',
  margin: '0',
};

const itemPriceCol = {
  width: '80px',
  textAlign: 'right' as const,
  verticalAlign: 'middle' as const,
};

const itemPrice = {
  color: '#18181b',
  fontSize: '16px',
  fontWeight: '600',
  margin: '0',
};

const summarySection = {
  padding: '24px',
};

const summaryRow = {
  marginBottom: '8px',
};

const summaryLabel = {
  color: '#71717a',
  fontSize: '14px',
};

const summaryValue = {
  color: '#18181b',
  fontSize: '14px',
  textAlign: 'right' as const,
};

const summaryValueMuted = {
  color: '#a1a1aa',
  fontSize: '14px',
  textAlign: 'right' as const,
};

const summaryRowTotal = {
  borderTop: '2px solid #e4e4e7',
  paddingTop: '12px',
  marginTop: '12px',
};

const summaryLabelTotal = {
  color: '#18181b',
  fontSize: '16px',
  fontWeight: '600',
};

const summaryValueTotal = {
  color: '#10b981',
  fontSize: '20px',
  fontWeight: 'bold',
  textAlign: 'right' as const,
};

const ctaSection = {
  padding: '8px 24px 32px',
  textAlign: 'center' as const,
};

const ctaButton = {
  backgroundColor: '#10b981',
  borderRadius: '8px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: '600',
  textDecoration: 'none',
  display: 'inline-block',
  padding: '14px 32px',
};

const footer = {
  backgroundColor: '#fafafa',
  padding: '24px',
  textAlign: 'center' as const,
  borderTop: '1px solid #e4e4e7',
};

const footerText = {
  color: '#71717a',
  fontSize: '14px',
  lineHeight: '1.6',
  margin: '0 0 16px',
};

const footerLinks = {
  margin: '0 0 16px',
  fontSize: '14px',
};

const footerLink = {
  color: '#10b981',
  textDecoration: 'none',
};

const copyright = {
  color: '#a1a1aa',
  fontSize: '12px',
  margin: '0',
};
