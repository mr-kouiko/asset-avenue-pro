import { Navigation } from "@/components/Navigation";
import { Card } from "@/components/ui/card";
import { useSEO } from "@/hooks/useSEO";

const CookiePolicyEN = () => {
  useSEO({
    title: "Cookie Policy",
    description: "Understand which cookies VisuStock uses, why we use them and how you can control them in your browser preferences.",
  });
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="container py-8 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Cookie Policy</h1>
          <p className="text-muted-foreground">
            Last updated: January 15, 2026
          </p>
        </div>

        <div className="space-y-8">
          <Card className="p-8">
            <h2 className="text-2xl font-bold mb-4">Introduction</h2>
            <p className="text-muted-foreground">
              We use cookies and similar technologies on our website to provide better services 
              and improve your user experience. This policy explains how cookies are used, 
              the reasons for their use and the options available to you regarding their management.
            </p>
          </Card>

          <Card className="p-8">
            <h2 className="text-2xl font-bold mb-4">What are cookies?</h2>
            <p className="text-muted-foreground">
              Cookies are small text files stored on your device when you visit our website. 
              These files remember your settings and preferences to provide a smooth and efficient browsing experience. 
              They are also used to collect specific information about how you interact with the site.
            </p>
          </Card>

          <Card className="p-8">
            <h2 className="text-2xl font-bold mb-4">Why do we use cookies?</h2>
            <p className="text-muted-foreground mb-4">
              We use cookies for several purposes, including:
            </p>
            <ul className="list-disc list-inside space-y-3 text-muted-foreground">
              <li>
                <strong>Service delivery and ease of use:</strong> Cookies help us remember your preferences, 
                such as language settings, and facilitate access to essential features like login and 
                downloading images or videos.
              </li>
              <li>
                <strong>Performance analysis and site improvement:</strong> We use cookies to collect 
                data on how users interact with the site, such as most visited pages 
                or time spent on various pages. This data helps us improve the website and our services.
              </li>
              <li>
                <strong>Personalized advertising:</strong> We may use cookies to display advertisements 
                tailored to your interests. This data is used to provide more relevant advertisements.
              </li>
              <li>
                <strong>Communication and user interaction:</strong> Cookies help facilitate interaction between 
                users and services, such as live chat or remembering previous requests.
              </li>
            </ul>
          </Card>

          <Card className="p-8">
            <h2 className="text-2xl font-bold mb-4">Types of cookies we use</h2>
            <div className="space-y-4 text-muted-foreground">
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Necessary cookies</h3>
                <p>
                  These cookies are essential for the website to function and cannot be disabled by users. 
                  Without them, basic services like login or purchase cannot be provided.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Analytics and performance cookies</h3>
                <p>
                  Used to analyze site usage and improve your experience by providing us with information 
                  related to performance.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Functional cookies</h3>
                <p>
                  Used to offer enhanced functionality and personalize services, such as remembering your preferences 
                  or improving performance based on past interactions with the site.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Advertising cookies</h3>
                <p>
                  Used to track online user behavior in order to display personalized advertisements.
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-8">
            <h2 className="text-2xl font-bold mb-4">How to manage cookies</h2>
            <p className="text-muted-foreground mb-4">
              You can control cookie usage through your browser settings. You can refuse 
              or delete cookies, but please note that disabling certain types may affect your experience 
              on the site and limit available functionality.
            </p>
            <div className="space-y-2 text-muted-foreground">
              <p><strong>Chrome:</strong> Settings → Advanced → Privacy and security → Cookies</p>
              <p><strong>Firefox:</strong> Preferences → Privacy & Security → Cookies and Site Data</p>
              <p><strong>Safari:</strong> Preferences → Privacy → Cookies and website data</p>
              <p><strong>Edge:</strong> Settings → Cookies and site permissions</p>
            </div>
          </Card>

          <Card className="p-8">
            <h2 className="text-2xl font-bold mb-4">Cookie policy modifications</h2>
            <p className="text-muted-foreground">
              We may update this policy from time to time to reflect changes in our cookie usage 
              or to meet legal requirements. It is recommended to check this page regularly 
              to stay informed of the latest updates.
            </p>
          </Card>

          <Card className="p-8">
            <h2 className="text-2xl font-bold mb-4">Contact us</h2>
            <p className="text-muted-foreground mb-4">
              If you have questions or need more information about the cookie policy, 
              you can contact us at:
            </p>
            <div className="text-muted-foreground">
              <p>Email: contact@visustock.com</p>
              <p>Address: 27 Place de la Madeleine, 75008 Paris, France</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CookiePolicyEN;