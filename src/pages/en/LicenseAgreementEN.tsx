import { Header } from "@/components/Header";
import { Navigation } from "@/components/Navigation";
import { Card } from "@/components/ui/card";

const LicenseAgreementEN = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <Navigation />
      
      <div className="container py-8 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">License Agreement</h1>
          <p className="text-muted-foreground">
            Last updated: January 15, 2024
          </p>
        </div>

        <div className="space-y-8">
          <Card className="p-8">
            <h2 className="text-2xl font-bold mb-4">Introduction</h2>
            <p className="text-muted-foreground">
              This license agreement defines the terms of use for creative content (photos, videos, illustrations, audio) 
              purchased on the VisuStock platform. By downloading content, you accept these terms and conditions.
            </p>
          </Card>

          <Card className="p-8">
            <h2 className="text-2xl font-bold mb-4">Standard License</h2>
            <div className="space-y-4 text-muted-foreground">
              <h3 className="text-lg font-semibold text-foreground">Rights granted</h3>
              <p>The standard license allows you to:</p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Use content in commercial and non-commercial projects</li>
                <li>Modify, crop, retouch content according to your needs</li>
                <li>Use content on websites, social networks, printed materials</li>
                <li>Integrate content into derivative products (books, magazines, brochures)</li>
                <li>Use content in advertising campaigns</li>
              </ul>
              
              <h3 className="text-lg font-semibold text-foreground mt-6">Limitations</h3>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Maximum 500,000 impressions per project</li>
                <li>Usage limited to one client/project per license</li>
                <li>Prohibition to resell content as is</li>
                <li>Prohibition to create competing products (stock photo libraries)</li>
              </ul>
            </div>
          </Card>

          <Card className="p-8">
            <h2 className="text-2xl font-bold mb-4">Extended License</h2>
            <div className="space-y-4 text-muted-foreground">
              <h3 className="text-lg font-semibold text-foreground">Additional rights</h3>
              <p>In addition to standard license rights, the extended license allows:</p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Unlimited usage in terms of impressions</li>
                <li>Usage for creating products for resale (t-shirts, mugs, posters)</li>
                <li>Usage in digital templates and models</li>
                <li>Unlimited electronic distribution</li>
                <li>Usage in mobile applications and software</li>
              </ul>
              
              <h3 className="text-lg font-semibold text-foreground mt-6">Maintained restrictions</h3>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Prohibition to resell raw content</li>
                <li>No usage for creating competing stock libraries</li>
                <li>Respect for rights of represented persons</li>
              </ul>
            </div>
          </Card>

          <Card className="p-8">
            <h2 className="text-2xl font-bold mb-4">Editorial License</h2>
            <div className="space-y-4 text-muted-foreground">
              <p>
                Certain content is available only under editorial license, restricting their use to:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>News articles and journalism</li>
                <li>Educational and informational content</li>
                <li>Documentaries and reports</li>
                <li>Non-commercial uses</li>
              </ul>
              <p className="mt-4">
                <strong>Prohibitions:</strong> Commercial use, advertising, promotion of products or services.
              </p>
            </div>
          </Card>

          <Card className="p-8">
            <h2 className="text-2xl font-bold mb-4">General Restrictions</h2>
            <div className="space-y-4 text-muted-foreground">
              <h3 className="text-lg font-semibold text-foreground">Prohibited uses</h3>
              <ul className="list-disc list-inside space-y-1">
                <li>Presenting people in a negative or offensive light</li>
                <li>Promoting illegal, discriminatory or hateful content</li>
                <li>Use for adult sites or pornographic content</li>
                <li>Creating false identities or fraudulent profiles</li>
                <li>Use in sensitive political contexts without authorization</li>
                <li>Reproduction or distribution of content to unauthorized third parties</li>
              </ul>
            </div>
          </Card>

          <Card className="p-8">
            <h2 className="text-2xl font-bold mb-4">Model and Property Rights</h2>
            <div className="space-y-4 text-muted-foreground">
              <p>
                Content including identifiable persons or private properties are accompanied 
                by appropriate authorizations. However:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Commercial use may require additional authorizations</li>
                <li>Certain sensitive uses may be restricted</li>
                <li>Respecting the dignity of represented persons is mandatory</li>
              </ul>
            </div>
          </Card>

          <Card className="p-8">
            <h2 className="text-2xl font-bold mb-4">Attribution</h2>
            <div className="space-y-4 text-muted-foreground">
              <p>
                Attribution is generally not required, but is appreciated. If you choose to attribute:
              </p>
              <p className="bg-muted p-4 rounded-lg font-mono text-sm">
                "Photo/Illustration by [Author Name] via VisuStock"
              </p>
              <p>
                Attribution may be required for certain content under Creative Commons license.
              </p>
            </div>
          </Card>

          <Card className="p-8">
            <h2 className="text-2xl font-bold mb-4">Duration and Termination</h2>
            <div className="space-y-4 text-muted-foreground">
              <p>
                Licenses are perpetual, meaning you can use content indefinitely 
                as long as you respect the terms of this agreement.
              </p>
              <p>
                VisuStock reserves the right to terminate a license in case of serious violation of terms of use.
              </p>
            </div>
          </Card>

          <Card className="p-8">
            <h2 className="text-2xl font-bold mb-4">Liability</h2>
            <div className="space-y-4 text-muted-foreground">
              <p>
                VisuStock guarantees that content is rights-free for uses authorized by the license. 
                However:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>The user is responsible for their use of the content</li>
                <li>VisuStock cannot be held liable for non-compliant uses</li>
                <li>In case of third-party claims, VisuStock commits to defending the licensee's rights</li>
              </ul>
            </div>
          </Card>

          <Card className="p-8">
            <h2 className="text-2xl font-bold mb-4">Modifications</h2>
            <p className="text-muted-foreground">
              This agreement may be modified to reflect legal or commercial developments. 
              Modifications do not affect licenses already granted before the modification date.
            </p>
          </Card>

          <Card className="p-8">
            <h2 className="text-2xl font-bold mb-4">Contact</h2>
            <p className="text-muted-foreground mb-4">
              For any questions regarding this license agreement:
            </p>
            <div className="text-muted-foreground">
              <p>Email: legal@visustock.com</p>
              <p>License service: licenses@visustock.com</p>
              <p>Address: 123 Rue de la Tech, 75001 Paris, France</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default LicenseAgreementEN;