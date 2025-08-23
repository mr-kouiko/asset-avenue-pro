import { Header } from "@/components/Header";
import { Navigation } from "@/components/Navigation";
import { Card } from "@/components/ui/card";

const PrivacyPolicyEN = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <Navigation />
      
      <div className="container py-8 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Privacy Policy</h1>
          <p className="text-muted-foreground">
            Last updated: January 15, 2024
          </p>
        </div>

        <div className="space-y-8">
          <Card className="p-8">
            <h2 className="text-2xl font-bold mb-4">Introduction</h2>
            <p className="text-muted-foreground">
              VisuStock is committed to protecting your privacy and personal data. This privacy policy 
              explains how we collect, use, store and protect your information when you use 
              our creative content platform.
            </p>
          </Card>

          <Card className="p-8">
            <h2 className="text-2xl font-bold mb-4">Data Collected</h2>
            <div className="space-y-4 text-muted-foreground">
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Registration Data</h3>
                <ul className="list-disc list-inside space-y-1">
                  <li>First and last name</li>
                  <li>Email address</li>
                  <li>Password (encrypted)</li>
                  <li>Optional profile information</li>
                </ul>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Usage Data</h3>
                <ul className="list-disc list-inside space-y-1">
                  <li>Pages visited and time spent</li>
                  <li>Browsing history</li>
                  <li>Content interactions</li>
                  <li>Preferences and settings</li>
                </ul>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Technical Data</h3>
                <ul className="list-disc list-inside space-y-1">
                  <li>IP address</li>
                  <li>Browser type and version</li>
                  <li>Operating system</li>
                  <li>Cookie data</li>
                </ul>
              </div>
            </div>
          </Card>

          <Card className="p-8">
            <h2 className="text-2xl font-bold mb-4">Data Usage</h2>
            <p className="text-muted-foreground mb-4">We use your data to:</p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li>Provide and improve our services</li>
              <li>Manage your account and transactions</li>
              <li>Personalize your experience</li>
              <li>Communicate with you (support, newsletters)</li>
              <li>Ensure platform security</li>
              <li>Comply with our legal obligations</li>
              <li>Analyze usage and performance</li>
            </ul>
          </Card>

          <Card className="p-8">
            <h2 className="text-2xl font-bold mb-4">Data Sharing</h2>
            <div className="space-y-4 text-muted-foreground">
              <p>We never sell your personal data. We may share your information with:</p>
              <ul className="list-disc list-inside space-y-2">
                <li>Our service providers (payment, hosting, analytics)</li>
                <li>Legal authorities if required by law</li>
                <li>In case of merger or acquisition (after notification)</li>
              </ul>
              <p className="mt-4">
                All our partners are required to respect the confidentiality of your data and use it 
                only for specified purposes.
              </p>
            </div>
          </Card>

          <Card className="p-8">
            <h2 className="text-2xl font-bold mb-4">Data Security</h2>
            <p className="text-muted-foreground mb-4">We implement appropriate security measures:</p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li>Encryption of sensitive data (SSL/TLS)</li>
              <li>Secure authentication</li>
              <li>Restricted access to personal data</li>
              <li>Monitoring and intrusion detection</li>
              <li>Regular and secure backups</li>
              <li>Staff training on data protection</li>
            </ul>
          </Card>

          <Card className="p-8">
            <h2 className="text-2xl font-bold mb-4">Your Rights</h2>
            <p className="text-muted-foreground mb-4">
              In accordance with GDPR, you have the following rights:
            </p>
            <div className="space-y-3 text-muted-foreground">
              <p><strong>Right of access:</strong> Obtain a copy of your personal data</p>
              <p><strong>Right to rectification:</strong> Correct inaccurate data</p>
              <p><strong>Right to erasure:</strong> Request deletion of your data</p>
              <p><strong>Right to portability:</strong> Retrieve your data in a structured format</p>
              <p><strong>Right to object:</strong> Object to the processing of your data</p>
              <p><strong>Right to restriction:</strong> Request limitation of processing</p>
            </div>
            <p className="text-muted-foreground mt-4">
              To exercise these rights, contact us at legal@visustock.com
            </p>
          </Card>

          <Card className="p-8">
            <h2 className="text-2xl font-bold mb-4">Data Retention</h2>
            <p className="text-muted-foreground">
              We retain your personal data only for the time necessary for the purposes for which it was collected:
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground mt-4">
              <li>Account data: As long as your account is active + 3 years after deletion</li>
              <li>Transaction data: 10 years (accounting obligations)</li>
              <li>Support data: 3 years after resolution</li>
              <li>Analytics data: 2 years maximum</li>
            </ul>
          </Card>

          <Card className="p-8">
            <h2 className="text-2xl font-bold mb-4">International Transfers</h2>
            <p className="text-muted-foreground">
              Your data may be transferred to countries outside the European Union only with appropriate 
              safeguards (standard contractual clauses, European Commission adequacy decisions).
            </p>
          </Card>

          <Card className="p-8">
            <h2 className="text-2xl font-bold mb-4">Modifications</h2>
            <p className="text-muted-foreground">
              We may update this privacy policy to reflect changes in our practices 
              or for other operational, legal or regulatory reasons. We will notify you of any important changes 
              by email or via our website.
            </p>
          </Card>

          <Card className="p-8">
            <h2 className="text-2xl font-bold mb-4">Contact</h2>
            <p className="text-muted-foreground mb-4">
              For any questions regarding this privacy policy or your personal data:
            </p>
            <div className="text-muted-foreground">
              <p>Email: legal@visustock.com</p>
              <p>Data Protection Officer: dpo@visustock.com</p>
              <p>Address: 123 Rue de la Tech, 75001 Paris, France</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicyEN;