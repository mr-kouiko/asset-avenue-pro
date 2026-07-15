import { Navigation } from "@/components/Navigation";
import { Card } from "@/components/ui/card";
import { useSEO } from "@/hooks/useSEO";

const PrivacyPolicyEN = () => {
  useSEO({
    title: "Privacy Policy",
    description: "Learn how VisuStock collects, uses and protects your personal data, including GDPR rights and cookie practices.",
  });
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navigation />
      
      <div className="container py-8 max-w-4xl flex-1">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Privacy Policy</h1>
          <p className="text-muted-foreground">
            Last updated: March 11, 2026
          </p>
        </div>

        <div className="space-y-8">
          <Card className="p-8">
            <h2 className="text-2xl font-bold mb-4">Introduction</h2>
            <p className="text-muted-foreground">
              VisuStock is committed to protecting your privacy and personal data. This privacy policy 
              explains how we collect, use, store and protect your information when you use 
              our creative content marketplace platform.
            </p>
          </Card>

          <Card className="p-8">
            <h2 className="text-2xl font-bold mb-4">Data We Collect</h2>
            <div className="space-y-4 text-muted-foreground">
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Account Data</h3>
                <ul className="list-disc list-inside space-y-1">
                  <li>Email address (used for authentication and communication)</li>
                  <li>Username / display name</li>
                  <li>Password (stored securely via Supabase Auth, never in plaintext)</li>
                  <li>Optional profile information (avatar, store name, country)</li>
                  <li>PayPal email (for sellers receiving payouts)</li>
                </ul>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Login & Session Data</h3>
                <ul className="list-disc list-inside space-y-1">
                  <li>Authentication tokens (JWT, managed by Supabase Auth)</li>
                  <li>Login timestamps and session duration</li>
                  <li>OAuth provider data if you sign in with Google</li>
                </ul>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Usage Data</h3>
                <ul className="list-disc list-inside space-y-1">
                  <li>Pages visited and time spent</li>
                  <li>Search queries and content interactions</li>
                  <li>Purchase and download history</li>
                  <li>Uploaded content metadata</li>
                </ul>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Technical Data</h3>
                <ul className="list-disc list-inside space-y-1">
                  <li>IP address</li>
                  <li>Browser type and version</li>
                  <li>Operating system</li>
                  <li>Device information</li>
                </ul>
              </div>
            </div>
          </Card>

          <Card className="p-8">
            <h2 className="text-2xl font-bold mb-4">Why We Collect Your Data</h2>
            <p className="text-muted-foreground mb-4">We use your data to:</p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li>Create and manage your account</li>
              <li>Authenticate your identity and secure your sessions</li>
              <li>Process purchases and manage transactions</li>
              <li>Pay sellers for their content sales</li>
              <li>Personalize your browsing experience</li>
              <li>Communicate with you (support, order confirmations, platform updates)</li>
              <li>Prevent fraud and ensure platform security</li>
              <li>Comply with legal and accounting obligations</li>
              <li>Improve and optimize platform performance</li>
            </ul>
          </Card>

          <Card className="p-8">
            <h2 className="text-2xl font-bold mb-4">How We Store & Protect Your Data</h2>
            <div className="space-y-4 text-muted-foreground">
              <p>Your data is stored securely using the following measures:</p>
              <ul className="list-disc list-inside space-y-2">
                <li>All data is hosted on Supabase infrastructure with encryption at rest and in transit (SSL/TLS)</li>
                <li>Passwords are hashed using industry-standard algorithms — we never store plaintext passwords</li>
                <li>Authentication uses secure JWT tokens with automatic expiry</li>
                <li>Row-Level Security (RLS) policies ensure users can only access their own data</li>
                <li>Original uploaded content is stored in private storage buckets, inaccessible to the public</li>
                <li>Signed URLs with 15-minute expiry are used for temporary access during processing</li>
                <li>Service role keys are never exposed to the client</li>
                <li>Regular security audits and integrity scans are performed</li>
              </ul>
            </div>
          </Card>

          <Card className="p-8">
            <h2 className="text-2xl font-bold mb-4">Data Sharing</h2>
            <div className="space-y-4 text-muted-foreground">
              <p>We never sell your personal data. We may share your information with:</p>
              <ul className="list-disc list-inside space-y-2">
                <li>Payment processors (PayPal) for transaction processing</li>
                <li>Supabase for hosting and database services</li>
                <li>Legal authorities if required by law</li>
              </ul>
              <p className="mt-4">
                All our partners are contractually required to respect the confidentiality of your data and 
                use it only for specified purposes.
              </p>
            </div>
          </Card>

          <Card className="p-8">
            <h2 className="text-2xl font-bold mb-4">Your Rights</h2>
            <p className="text-muted-foreground mb-4">
              In accordance with GDPR and applicable data protection laws, you have the following rights:
            </p>
            <div className="space-y-3 text-muted-foreground">
              <p><strong>Right of access:</strong> Request a copy of all personal data we hold about you</p>
              <p><strong>Right to rectification:</strong> Correct inaccurate or outdated personal data</p>
              <p><strong>Right to erasure:</strong> Request deletion of your account and associated data</p>
              <p><strong>Right to portability:</strong> Receive your data in a structured, machine-readable format</p>
              <p><strong>Right to object:</strong> Object to the processing of your data for specific purposes</p>
              <p><strong>Right to restriction:</strong> Request limitation of how we process your data</p>
            </div>
            <p className="text-muted-foreground mt-4">
              <strong>Account deletion:</strong> You can delete your account at any time from your dashboard settings. 
              Upon deletion, we will remove your personal data within 30 days, except where retention is required by law.
            </p>
            <p className="text-muted-foreground mt-2">
              To exercise any of these rights, contact us at <strong>contact@visustock.com</strong>
            </p>
          </Card>

          <Card className="p-8">
            <h2 className="text-2xl font-bold mb-4">Data Retention</h2>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li>Account data: retained while your account is active, deleted within 30 days of account deletion</li>
              <li>Transaction data: 10 years (accounting and tax obligations)</li>
              <li>Support data: 3 years after resolution</li>
              <li>Security audit logs: 2 years</li>
            </ul>
          </Card>

          <Card className="p-8">
            <h2 className="text-2xl font-bold mb-4">Cookies</h2>
            <p className="text-muted-foreground">
              We use essential cookies for authentication and session management. 
              We do not use third-party advertising or tracking cookies. 
              For more details, see our <a href="/cookie-policy" className="text-primary hover:underline">Cookie Policy</a>.
            </p>
          </Card>

          <Card className="p-8">
            <h2 className="text-2xl font-bold mb-4">Changes to This Policy</h2>
            <p className="text-muted-foreground">
              We may update this privacy policy to reflect changes in our practices or for legal reasons. 
              We will notify you of significant changes by email or via a notice on our platform.
            </p>
          </Card>

          <Card className="p-8">
            <h2 className="text-2xl font-bold mb-4">Contact</h2>
            <div className="text-muted-foreground">
              <p>For any questions regarding this privacy policy or your personal data:</p>
              <p className="mt-2">Email: <strong>contact@visustock.com</strong></p>
              <p>Address: 27 Place de la Madeleine, 75008 Paris, France</p>
            </div>
          </Card>
        </div>
      </div>

    </div>
  );
};

export default PrivacyPolicyEN;
