import React from 'npm:react@18.3.1'
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

interface PurchaseItem {
  title: string
  description?: string
  license_type: string
  price: number
  thumbnail_url?: string
  format?: string
}

interface PurchaseReceiptEmailProps {
  buyer_name: string
  buyer_email: string
  order_id: string
  payment_type: string
  items: PurchaseItem[]
  subtotal: number
  tax: number
  total: number
  currency: string
  transaction_date: string
}

export const PurchaseReceiptEmail = ({
  buyer_name,
  buyer_email,
  order_id,
  payment_type,
  items,
  subtotal,
  tax,
  total,
  currency,
  transaction_date,
}: PurchaseReceiptEmailProps) => {
  const currencySymbol = currency === 'EUR' ? '€' : currency === 'USD' ? '$' : currency
  
  return (
    <Html>
      <Head />
      <Preview>Your VisuStock Purchase Receipt - Order #{order_id.slice(-8).toUpperCase()}</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header with Logo */}
          <Section style={headerSection}>
            <Img
              src="https://kdgfpophpoqugtuvfxqx.supabase.co/storage/v1/object/public/logo%20VisuStock/VISUSTOCK%20NO%20NACKGROUND.png"
              alt="VisuStock"
              style={logoImage}
            />
          </Section>

          {/* Success Banner */}
          <Section style={successBanner}>
            <Text style={successIcon}>✓</Text>
            <Heading style={successTitle}>Purchase Successful!</Heading>
            <Text style={successSubtitle}>
              Thank you for your purchase. Your content is ready to download.
            </Text>
          </Section>

          {/* Invoice Header */}
          <Section style={invoiceHeader}>
            <Text style={invoiceTitle}>YOUR VISUSTOCK INVOICE</Text>
            <Text style={invoiceNumber}>Invoice #{order_id.slice(-8).toUpperCase()}</Text>
          </Section>

          {/* Billing Info */}
          <Section style={billingSection}>
            <Row>
              <Column style={billingColumn}>
                <Text style={billingLabel}>DELIVERED BY</Text>
                <Text style={billingText}>VisuStock</Text>
                <Text style={billingText}>Digital Content Marketplace</Text>
                <Text style={billingText}>support@visustock.com</Text>
              </Column>
              <Column style={billingColumn}>
                <Text style={billingLabel}>BILLED TO</Text>
                <Text style={billingText}>{buyer_name}</Text>
                <Text style={billingText}>{buyer_email}</Text>
              </Column>
            </Row>
          </Section>

          <Hr style={divider} />

          {/* Order Details */}
          <Section style={orderDetailsSection}>
            <Text style={sectionTitle}>ORDER DETAILS</Text>
            <Row style={detailRow}>
              <Column><Text style={detailLabel}>Transaction ID:</Text></Column>
              <Column><Text style={detailValue}>{order_id}</Text></Column>
            </Row>
            <Row style={detailRow}>
              <Column><Text style={detailLabel}>Payment Method:</Text></Column>
              <Column><Text style={detailValue}>{payment_type}</Text></Column>
            </Row>
            <Row style={detailRow}>
              <Column><Text style={detailLabel}>Date:</Text></Column>
              <Column><Text style={detailValue}>{transaction_date}</Text></Column>
            </Row>
          </Section>

          <Hr style={divider} />

          {/* Purchased Items */}
          <Section style={itemsSection}>
            <Text style={sectionTitle}>PURCHASED ITEMS</Text>
            {items.map((item, index) => (
              <Section key={index} style={itemCard}>
                <Row>
                  <Column style={thumbnailColumn}>
                    {item.thumbnail_url ? (
                      <Img src={item.thumbnail_url} alt={item.title} style={thumbnailImage} />
                    ) : (
                      <Section style={thumbnailPlaceholder}>
                        <Text style={thumbnailPlaceholderText}>📷</Text>
                      </Section>
                    )}
                  </Column>
                  <Column style={itemDetailsColumn}>
                    <Text style={itemTitle}>{item.title}</Text>
                    {item.description && (
                      <Text style={itemDescription}>
                        {item.description.length > 80 
                          ? item.description.substring(0, 80) + '...' 
                          : item.description}
                      </Text>
                    )}
                    <Text style={itemMeta}>
                      {item.format && `Format: ${item.format} | `}License: {item.license_type}
                    </Text>
                  </Column>
                  <Column style={priceColumn}>
                    <Text style={itemPrice}>{currencySymbol}{item.price.toFixed(2)}</Text>
                  </Column>
                </Row>
              </Section>
            ))}
          </Section>

          <Hr style={divider} />

          {/* Total Summary */}
          <Section style={totalSection}>
            <Row style={totalRow}>
              <Column><Text style={totalLabel}>Subtotal:</Text></Column>
              <Column><Text style={totalValue}>{currencySymbol}{subtotal.toFixed(2)}</Text></Column>
            </Row>
            <Row style={totalRow}>
              <Column><Text style={totalLabel}>Tax:</Text></Column>
              <Column><Text style={totalValue}>{currencySymbol}{tax.toFixed(2)}</Text></Column>
            </Row>
            <Hr style={totalDivider} />
            <Row style={grandTotalRow}>
              <Column><Text style={grandTotalLabel}>TOTAL:</Text></Column>
              <Column><Text style={grandTotalValue}>{currencySymbol}{total.toFixed(2)}</Text></Column>
            </Row>
          </Section>

          {/* License Activation Notice */}
          <Section style={activationSection}>
            <Text style={activationIcon}>✓</Text>
            <Text style={activationText}>
              Your license is now active and ready to use
            </Text>
          </Section>

          {/* License Summary Section */}
          <Section style={licenseSummarySection}>
            <Text style={sectionTitle}>📜 YOUR LICENSE RIGHTS</Text>
            <Text style={licenseSummaryIntro}>
              Here's a summary of what your license(s) allow:
            </Text>
            
            {items.map((item, index) => {
              const licenseType = item.license_type?.toLowerCase() || 'standard'
              const isStandard = licenseType.includes('standard')
              const isExtended = licenseType.includes('extended')
              const isExclusive = licenseType.includes('exclusive')
              
              return (
                <Section key={index} style={licenseCard}>
                  <Text style={licenseCardTitle}>
                    {item.title} - {item.license_type} License
                  </Text>
                  
                  {isStandard && (
                    <Section>
                      <Text style={licenseRightsTitle}>✅ What you CAN do:</Text>
                      <Text style={licenseRightItem}>• Personal projects & portfolios</Text>
                      <Text style={licenseRightItem}>• Social media posts (non-commercial)</Text>
                      <Text style={licenseRightItem}>• Educational materials</Text>
                      <Text style={licenseRightItem}>• Up to 500,000 copies/views</Text>
                      
                      <Text style={licenseRestrictionsTitle}>❌ What you CANNOT do:</Text>
                      <Text style={licenseRestrictionItem}>• Resell or redistribute the content</Text>
                      <Text style={licenseRestrictionItem}>• Use in products for sale</Text>
                      <Text style={licenseRestrictionItem}>• Transfer license to others</Text>
                    </Section>
                  )}
                  
                  {isExtended && (
                    <Section>
                      <Text style={licenseRightsTitle}>✅ What you CAN do:</Text>
                      <Text style={licenseRightItem}>• All Standard license rights</Text>
                      <Text style={licenseRightItem}>• Commercial advertising & marketing</Text>
                      <Text style={licenseRightItem}>• Products for sale (merchandise, templates)</Text>
                      <Text style={licenseRightItem}>• Unlimited copies/views</Text>
                      <Text style={licenseRightItem}>• Broadcast & streaming</Text>
                      
                      <Text style={licenseRestrictionsTitle}>❌ What you CANNOT do:</Text>
                      <Text style={licenseRestrictionItem}>• Resell the raw file</Text>
                      <Text style={licenseRestrictionItem}>• Claim exclusive ownership</Text>
                    </Section>
                  )}
                  
                  {isExclusive && (
                    <Section>
                      <Text style={licenseRightsTitle}>✅ What you CAN do:</Text>
                      <Text style={licenseRightItem}>• All Extended license rights</Text>
                      <Text style={licenseRightItem}>• Exclusive usage (content removed from sale)</Text>
                      <Text style={licenseRightItem}>• Full commercial rights</Text>
                      <Text style={licenseRightItem}>• Unlimited usage in any project</Text>
                      <Text style={licenseRightItem}>• Modify & create derivative works</Text>
                      
                      <Text style={licenseNote}>
                        🎉 This content is now exclusively yours and has been removed from the marketplace.
                      </Text>
                    </Section>
                  )}
                </Section>
              )
            })}
            
            <Section style={licenseFooter}>
              <Text style={licenseFooterText}>
                For complete license terms and conditions, please review our{' '}
                <Link href="https://visustock.com/en/license-agreement" style={licenseLink}>
                  License Agreement
                </Link>
              </Text>
            </Section>
          </Section>

          {/* Download CTA */}
          <Section style={ctaSection}>
            <Link href="https://visustock.com/dashboard" style={ctaButton}>
              Download Your Files
            </Link>
          </Section>

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerLinks}>
              <Link href="https://visustock.com/terms" style={footerLink}>Terms of Service</Link>
              {' | '}
              <Link href="https://visustock.com/licenses" style={footerLink}>License Agreement</Link>
              {' | '}
              <Link href="https://visustock.com/support" style={footerLink}>Support</Link>
            </Text>
            <Text style={footerText}>
              Thank you for choosing VisuStock!
            </Text>
            <Text style={copyright}>
              © 2025 VisuStock - Premium Digital Content Marketplace
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

export default PurchaseReceiptEmail

// Styles
const main = {
  backgroundColor: '#f4f4f5',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
}

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  maxWidth: '600px',
  borderRadius: '8px',
  overflow: 'hidden',
}

const headerSection = {
  backgroundColor: '#1a1a2e',
  padding: '24px',
  textAlign: 'center' as const,
}

const logoImage = {
  width: '180px',
  height: 'auto',
  margin: '0 auto',
}

const successBanner = {
  backgroundColor: '#10b981',
  padding: '32px 24px',
  textAlign: 'center' as const,
}

const successIcon = {
  fontSize: '48px',
  color: '#ffffff',
  margin: '0 0 12px',
}

const successTitle = {
  color: '#ffffff',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '0 0 8px',
}

const successSubtitle = {
  color: '#d1fae5',
  fontSize: '16px',
  margin: '0',
}

const invoiceHeader = {
  padding: '24px',
  textAlign: 'center' as const,
  backgroundColor: '#f9fafb',
}

const invoiceTitle = {
  color: '#374151',
  fontSize: '14px',
  fontWeight: 'bold',
  letterSpacing: '1px',
  margin: '0 0 4px',
}

const invoiceNumber = {
  color: '#6b7280',
  fontSize: '14px',
  margin: '0',
}

const billingSection = {
  padding: '24px',
}

const billingColumn = {
  width: '50%',
  verticalAlign: 'top' as const,
}

const billingLabel = {
  color: '#9ca3af',
  fontSize: '11px',
  fontWeight: 'bold',
  letterSpacing: '1px',
  margin: '0 0 8px',
}

const billingText = {
  color: '#374151',
  fontSize: '14px',
  margin: '0 0 4px',
}

const divider = {
  borderColor: '#e5e7eb',
  margin: '0',
}

const orderDetailsSection = {
  padding: '24px',
}

const sectionTitle = {
  color: '#374151',
  fontSize: '14px',
  fontWeight: 'bold',
  letterSpacing: '0.5px',
  margin: '0 0 16px',
}

const detailRow = {
  marginBottom: '8px',
}

const detailLabel = {
  color: '#6b7280',
  fontSize: '14px',
  margin: '0',
}

const detailValue = {
  color: '#1f2937',
  fontSize: '14px',
  margin: '0',
  textAlign: 'right' as const,
}

const itemsSection = {
  padding: '24px',
}

const itemCard = {
  backgroundColor: '#f9fafb',
  borderRadius: '8px',
  padding: '16px',
  marginBottom: '12px',
}

const thumbnailColumn = {
  width: '80px',
  verticalAlign: 'top' as const,
}

const thumbnailImage = {
  width: '70px',
  height: '70px',
  borderRadius: '6px',
  objectFit: 'cover' as const,
}

const thumbnailPlaceholder = {
  width: '70px',
  height: '70px',
  borderRadius: '6px',
  backgroundColor: '#e5e7eb',
  textAlign: 'center' as const,
}

const thumbnailPlaceholderText = {
  fontSize: '24px',
  lineHeight: '70px',
  margin: '0',
}

const itemDetailsColumn = {
  verticalAlign: 'top' as const,
  paddingLeft: '12px',
}

const itemTitle = {
  color: '#1f2937',
  fontSize: '15px',
  fontWeight: 'bold',
  margin: '0 0 4px',
}

const itemDescription = {
  color: '#6b7280',
  fontSize: '13px',
  margin: '0 0 6px',
  lineHeight: '1.4',
}

const itemMeta = {
  color: '#9ca3af',
  fontSize: '12px',
  margin: '0',
}

const priceColumn = {
  width: '80px',
  verticalAlign: 'top' as const,
  textAlign: 'right' as const,
}

const itemPrice = {
  color: '#1f2937',
  fontSize: '16px',
  fontWeight: 'bold',
  margin: '0',
}

const totalSection = {
  padding: '24px',
  backgroundColor: '#f9fafb',
}

const totalRow = {
  marginBottom: '8px',
}

const totalLabel = {
  color: '#6b7280',
  fontSize: '14px',
  margin: '0',
}

const totalValue = {
  color: '#374151',
  fontSize: '14px',
  margin: '0',
  textAlign: 'right' as const,
}

const totalDivider = {
  borderColor: '#d1d5db',
  margin: '12px 0',
}

const grandTotalRow = {
  marginTop: '8px',
}

const grandTotalLabel = {
  color: '#1f2937',
  fontSize: '16px',
  fontWeight: 'bold',
  margin: '0',
}

const grandTotalValue = {
  color: '#10b981',
  fontSize: '20px',
  fontWeight: 'bold',
  margin: '0',
  textAlign: 'right' as const,
}

const activationSection = {
  padding: '24px',
  textAlign: 'center' as const,
  backgroundColor: '#ecfdf5',
}

const activationIcon = {
  color: '#10b981',
  fontSize: '24px',
  margin: '0 0 8px',
}

const activationText = {
  color: '#065f46',
  fontSize: '15px',
  fontWeight: '500',
  margin: '0',
}

const ctaSection = {
  padding: '24px',
  textAlign: 'center' as const,
}

const ctaButton = {
  backgroundColor: '#4f46e5',
  borderRadius: '8px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  padding: '14px 32px',
  display: 'inline-block',
}

const footer = {
  padding: '24px',
  textAlign: 'center' as const,
  borderTop: '1px solid #e5e7eb',
}

const footerLinks = {
  fontSize: '13px',
  margin: '0 0 16px',
}

const footerLink = {
  color: '#6b7280',
  textDecoration: 'underline',
}

const footerText = {
  color: '#374151',
  fontSize: '14px',
  fontWeight: '500',
  margin: '0 0 8px',
}

const copyright = {
  color: '#9ca3af',
  fontSize: '12px',
  margin: '0',
}

// License Summary Styles
const licenseSummarySection = {
  padding: '24px',
  backgroundColor: '#fefce8',
  borderTop: '3px solid #eab308',
}

const licenseSummaryIntro = {
  color: '#713f12',
  fontSize: '14px',
  margin: '0 0 16px',
}

const licenseCard = {
  backgroundColor: '#ffffff',
  borderRadius: '8px',
  padding: '16px',
  marginBottom: '12px',
  border: '1px solid #fde68a',
}

const licenseCardTitle = {
  color: '#1f2937',
  fontSize: '15px',
  fontWeight: 'bold',
  margin: '0 0 12px',
  paddingBottom: '8px',
  borderBottom: '1px solid #e5e7eb',
}

const licenseRightsTitle = {
  color: '#166534',
  fontSize: '13px',
  fontWeight: 'bold',
  margin: '0 0 8px',
}

const licenseRightItem = {
  color: '#166534',
  fontSize: '13px',
  margin: '0 0 4px',
  paddingLeft: '4px',
}

const licenseRestrictionsTitle = {
  color: '#991b1b',
  fontSize: '13px',
  fontWeight: 'bold',
  margin: '12px 0 8px',
}

const licenseRestrictionItem = {
  color: '#991b1b',
  fontSize: '13px',
  margin: '0 0 4px',
  paddingLeft: '4px',
}

const licenseNote = {
  color: '#4f46e5',
  fontSize: '13px',
  fontWeight: '500',
  margin: '12px 0 0',
  padding: '8px 12px',
  backgroundColor: '#eef2ff',
  borderRadius: '6px',
}

const licenseFooter = {
  marginTop: '16px',
  padding: '12px',
  backgroundColor: '#ffffff',
  borderRadius: '6px',
  textAlign: 'center' as const,
}

const licenseFooterText = {
  color: '#6b7280',
  fontSize: '13px',
  margin: '0',
}

const licenseLink = {
  color: '#4f46e5',
  textDecoration: 'underline',
  fontWeight: '500',
}
