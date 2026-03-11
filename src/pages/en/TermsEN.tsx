import { Header } from "@/components/Header";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Card } from "@/components/ui/card";

const TermsEN = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <Navigation />
      
      <div className="container py-8 max-w-4xl flex-1">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Terms & Conditions</h1>
          <p className="text-muted-foreground">
            Last updated: March 11, 2026
          </p>
        </div>

        <div className="space-y-8">
          <Card className="p-8">
            <h2 className="text-2xl font-bold mb-4">1. Acceptance of Terms</h2>
            <p className="text-muted-foreground mb-4">
              By accessing or using VisuStock ("the Platform"), you agree to be bound by these Terms & Conditions. 
              If you do not agree, you must not use the Platform.
            </p>
            <p className="text-muted-foreground">
              VisuStock is a marketplace for digital creative content (photos, videos, illustrations, audio, ebooks) 
              accessible at visustock.com.
            </p>
          </Card>

          <Card className="p-8">
            <h2 className="text-2xl font-bold mb-4">2. Account Responsibilities</h2>
            <div className="space-y-4 text-muted-foreground">
              <p>When you create an account, you agree to:</p>
              <ul className="list-disc list-inside space-y-2">
                <li>Provide accurate and up-to-date information</li>
                <li>Keep your login credentials confidential and secure</li>
                <li>Be responsible for all activity under your account</li>
                <li>Notify us immediately of any unauthorized access</li>
                <li>Not share your account or transfer it to another person</li>
              </ul>
              <p>
                You must be at least 18 years old (or have parental consent) to create an account. 
                VisuStock reserves the right to suspend or delete any account that violates these terms.
              </p>
            </div>
          </Card>

          <Card className="p-8">
            <h2 className="text-2xl font-bold mb-4">3. Acceptable Use</h2>
            <div className="space-y-4 text-muted-foreground">
              <h3 className="text-lg font-semibold text-foreground">You agree NOT to:</h3>
              <ul className="list-disc list-inside space-y-2">
                <li>Upload content that infringes on third-party intellectual property rights</li>
                <li>Use the platform for any illegal or fraudulent purpose</li>
                <li>Attempt to gain unauthorized access to other accounts or platform systems</li>
                <li>Upload malicious code, viruses, or harmful content</li>
                <li>Scrape, crawl, or bulk-download content without authorization</li>
                <li>Circumvent watermarks, DRM, or other content protection mechanisms</li>
                <li>Resell or redistribute purchased content beyond the scope of your license</li>
                <li>Harass, abuse, or threaten other users</li>
                <li>Use automated tools to create fake accounts or manipulate platform metrics</li>
              </ul>
              <h3 className="text-lg font-semibold text-foreground mt-4">For Creators/Sellers:</h3>
              <ul className="list-disc list-inside space-y-2">
                <li>You must own or have proper licenses for all content you upload</li>
                <li>Content must meet platform quality standards</li>
                <li>AI-generated content must be properly declared</li>
                <li>You must not upload illegal, harmful, or rights-infringing content</li>
              </ul>
            </div>
          </Card>

          <Card className="p-8">
            <h2 className="text-2xl font-bold mb-4">4. Intellectual Property</h2>
            <p className="text-muted-foreground mb-4">
              Creators retain their copyright on uploaded content. By uploading content to VisuStock, you grant 
              us a non-exclusive license to host, display, watermark, and distribute that content on the platform.
            </p>
            <p className="text-muted-foreground">
              The platform itself — its design, source code, branding, and features — is the intellectual 
              property of VisuStock and is protected by applicable laws.
            </p>
          </Card>

          <Card className="p-8">
            <h2 className="text-2xl font-bold mb-4">5. Purchases & Payments</h2>
            <div className="space-y-4 text-muted-foreground">
              <p>Prices are displayed in the applicable currency. Payments are processed securely via PayPal.</p>
              <p>VisuStock takes a commission on each sale, disclosed to creators during registration.</p>
              <p>
                Refunds are available only in the case of technical failure preventing download, 
                and must be requested within 30 days of purchase.
              </p>
              <p>
                Credit purchases are non-refundable once credits have been used.
              </p>
            </div>
          </Card>

          <Card className="p-8">
            <h2 className="text-2xl font-bold mb-4">6. Limitation of Liability</h2>
            <div className="space-y-4 text-muted-foreground">
              <p>
                VisuStock is provided "as is" without warranties of any kind. We make our best efforts to ensure 
                availability and security but cannot guarantee uninterrupted or error-free operation.
              </p>
              <p><strong>VisuStock shall not be liable for:</strong></p>
              <ul className="list-disc list-inside space-y-2">
                <li>Indirect, incidental, or consequential damages</li>
                <li>Loss of profits, data, or business opportunities</li>
                <li>Content uploaded by users (creators are solely responsible)</li>
                <li>Third-party service interruptions (payment processors, hosting)</li>
                <li>Unauthorized access due to user negligence (e.g., shared passwords)</li>
              </ul>
              <p>
                Our total liability is limited to the amount of transactions you have made on the platform 
                in the preceding 12 months.
              </p>
            </div>
          </Card>

          <Card className="p-8">
            <h2 className="text-2xl font-bold mb-4">7. Termination</h2>
            <p className="text-muted-foreground mb-4">
              You can delete your account at any time from your dashboard settings.
            </p>
            <p className="text-muted-foreground">
              VisuStock may suspend or terminate your account if you violate these terms, after providing 
              notice where practicable. Upon termination, your right to use the platform ceases immediately.
            </p>
          </Card>

          <Card className="p-8">
            <h2 className="text-2xl font-bold mb-4">8. Changes to These Terms</h2>
            <p className="text-muted-foreground">
              VisuStock reserves the right to update these Terms & Conditions at any time. 
              We will notify users of material changes by email or via a notice on the platform. 
              Continued use of the platform after changes constitutes acceptance of the updated terms. 
              If you disagree with changes, you must stop using the platform and delete your account.
            </p>
          </Card>

          <Card className="p-8">
            <h2 className="text-2xl font-bold mb-4">9. Governing Law</h2>
            <p className="text-muted-foreground">
              These terms are governed by French law. In case of dispute, the courts of Paris shall have 
              exclusive jurisdiction, except where mandatory consumer protection laws apply.
            </p>
          </Card>

          <Card className="p-8">
            <h2 className="text-2xl font-bold mb-4">10. Contact</h2>
            <div className="text-muted-foreground">
              <p>For any questions regarding these terms:</p>
              <p className="mt-2">Email: <strong>contact@visustock.com</strong></p>
              <p>Address: 27 Place de la Madeleine, 75008 Paris, France</p>
            </div>
          </Card>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default TermsEN;
