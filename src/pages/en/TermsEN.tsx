import { Header } from "@/components/Header";
import { Navigation } from "@/components/Navigation";
import { Card } from "@/components/ui/card";

const TermsEN = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <Navigation />
      
      <div className="container py-8 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Terms of Service</h1>
          <p className="text-muted-foreground">
            Last updated: January 15, 2026
          </p>
        </div>

        <div className="space-y-8">
          <Card className="p-8">
            <h2 className="text-2xl font-bold mb-4">1. Purpose</h2>
            <p className="text-muted-foreground mb-4">
              These Terms of Service (hereinafter "ToS") govern the use of the VisuStock platform, 
              a marketplace for digital creative content (photos, videos, illustrations, audio) accessible at visustock.com.
            </p>
            <p className="text-muted-foreground">
              Use of the platform implies full acceptance of these ToS by the user.
            </p>
          </Card>

          <Card className="p-8">
            <h2 className="text-2xl font-bold mb-4">2. Definitions</h2>
            <div className="space-y-3 text-muted-foreground">
              <p><strong>Platform:</strong> The VisuStock website and its associated services</p>
              <p><strong>User:</strong> Any natural or legal person using the platform</p>
              <p><strong>Creator/Seller:</strong> User who sells their creations on the platform</p>
              <p><strong>Buyer:</strong> User who purchases content on the platform</p>
              <p><strong>Content:</strong> Any creative element (photo, video, illustration, audio) offered on the platform</p>
            </div>
          </Card>

          <Card className="p-8">
            <h2 className="text-2xl font-bold mb-4">3. Registration and User Account</h2>
            <div className="space-y-4 text-muted-foreground">
              <p>
                Registration on the platform is free and open to any adult or minor with parental authorization.
              </p>
              <p>
                Users commit to providing accurate information and keeping it up to date. They are responsible for the confidentiality 
                of their login credentials.
              </p>
              <p>
                VisuStock reserves the right to suspend or delete any account in case of violation of these ToS.
              </p>
            </div>
          </Card>

          <Card className="p-8">
            <h2 className="text-2xl font-bold mb-4">4. Services Offered</h2>
            <div className="space-y-4 text-muted-foreground">
              <h3 className="text-lg font-semibold text-foreground">4.1 For Buyers</h3>
              <ul className="list-disc list-inside space-y-2">
                <li>Search and browse the catalog</li>
                <li>Purchase and download content</li>
                <li>License management</li>
                <li>Customer support</li>
              </ul>
              
              <h3 className="text-lg font-semibold text-foreground">4.2 For Creators</h3>
              <ul className="list-disc list-inside space-y-2">
                <li>Upload and sell creations</li>
                <li>Portfolio management</li>
                <li>Performance tracking</li>
                <li>Revenue management</li>
              </ul>
            </div>
          </Card>

          <Card className="p-8">
            <h2 className="text-2xl font-bold mb-4">5. User Obligations</h2>
            <div className="space-y-4 text-muted-foreground">
              <h3 className="text-lg font-semibold text-foreground">5.1 General Obligations</h3>
              <ul className="list-disc list-inside space-y-2">
                <li>Respect applicable laws</li>
                <li>Not infringe on third-party rights</li>
                <li>Not use the platform for illegal purposes</li>
                <li>Maintain confidentiality of their credentials</li>
              </ul>
              
              <h3 className="text-lg font-semibold text-foreground">5.2 Creator Obligations</h3>
              <ul className="list-disc list-inside space-y-2">
                <li>Own the rights to uploaded content</li>
                <li>Provide professional quality content</li>
                <li>Respect community standards</li>
                <li>Not upload illegal content or content violating copyrights</li>
              </ul>
            </div>
          </Card>

          <Card className="p-8">
            <h2 className="text-2xl font-bold mb-4">6. Intellectual Property</h2>
            <p className="text-muted-foreground mb-4">
              Creators retain their copyright on uploaded content. VisuStock obtains a 
              non-exclusive license to host, display and distribute this content.
            </p>
            <p className="text-muted-foreground">
              The platform, its design elements, source code and brand are protected by 
              VisuStock's intellectual property rights.
            </p>
          </Card>

          <Card className="p-8">
            <h2 className="text-2xl font-bold mb-4">7. Pricing and Payment</h2>
            <div className="space-y-4 text-muted-foreground">
              <p>
                Prices are displayed in euros including tax. Payments are secure and processed by our trusted partners.
              </p>
              <p>
                VisuStock takes a commission on each sale, the rate of which is communicated to creators upon registration.
              </p>
              <p>
                Refunds are only possible in case of technical failure preventing download within 30 days of purchase.
              </p>
            </div>
          </Card>

          <Card className="p-8">
            <h2 className="text-2xl font-bold mb-4">8. Liability</h2>
            <p className="text-muted-foreground mb-4">
              VisuStock makes its best efforts to ensure platform availability and security, 
              but cannot guarantee uninterrupted operation.
            </p>
            <p className="text-muted-foreground">
              VisuStock's liability is limited to direct damages and cannot exceed the amount of concerned transactions 
              over the last 12 months.
            </p>
          </Card>

          <Card className="p-8">
            <h2 className="text-2xl font-bold mb-4">9. Termination</h2>
            <p className="text-muted-foreground mb-4">
              Users can delete their account at any time from their personal space.
            </p>
            <p className="text-muted-foreground">
              VisuStock may suspend or delete an account in case of ToS violation, after formal notice remains without effect.
            </p>
          </Card>

          <Card className="p-8">
            <h2 className="text-2xl font-bold mb-4">10. ToS Modifications</h2>
            <p className="text-muted-foreground">
              VisuStock reserves the right to modify these ToS at any time. Users will be notified 
              by email of important modifications. Continued use constitutes acceptance of the new terms.
            </p>
          </Card>

          <Card className="p-8">
            <h2 className="text-2xl font-bold mb-4">11. Applicable Law and Jurisdiction</h2>
            <p className="text-muted-foreground">
              These ToS are governed by French law. In case of dispute, the courts of Paris have sole jurisdiction, 
              except for contrary legal provisions.
            </p>
          </Card>

          <Card className="p-8">
            <h2 className="text-2xl font-bold mb-4">12. Contact</h2>
            <p className="text-muted-foreground">
              For any questions regarding these ToS, you can contact us at:
            </p>
            <div className="mt-4 text-muted-foreground">
              <p>Email: legal@visustock.com</p>
              <p>Address: 123 Rue de la Tech, 75001 Paris, France</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default TermsEN;