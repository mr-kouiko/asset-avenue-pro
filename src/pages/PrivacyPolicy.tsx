import { Header } from "@/components/Header";
import { Navigation } from "@/components/Navigation";
import { Card } from "@/components/ui/card";

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <Navigation />
      
      <div className="container py-8 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Politique de confidentialité</h1>
          <p className="text-muted-foreground">
            Dernière mise à jour : 15 janvier 2024
          </p>
        </div>

        <div className="space-y-8">
          <Card className="p-8">
            <h2 className="text-2xl font-bold mb-4">Introduction</h2>
            <p className="text-muted-foreground">
              VisuStock s'engage à protéger votre vie privée et vos données personnelles. Cette politique de confidentialité 
              explique comment nous collectons, utilisons, stockons et protégeons vos informations lorsque vous utilisez 
              notre plateforme de contenus créatifs.
            </p>
          </Card>

          <Card className="p-8">
            <h2 className="text-2xl font-bold mb-4">Données collectées</h2>
            <div className="space-y-4 text-muted-foreground">
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Données d'inscription</h3>
                <ul className="list-disc list-inside space-y-1">
                  <li>Nom et prénom</li>
                  <li>Adresse email</li>
                  <li>Mot de passe (crypté)</li>
                  <li>Informations de profil optionnelles</li>
                </ul>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Données d'utilisation</h3>
                <ul className="list-disc list-inside space-y-1">
                  <li>Pages visitées et temps passé</li>
                  <li>Historique de navigation</li>
                  <li>Interactions avec les contenus</li>
                  <li>Préférences et paramètres</li>
                </ul>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Données techniques</h3>
                <ul className="list-disc list-inside space-y-1">
                  <li>Adresse IP</li>
                  <li>Type de navigateur et version</li>
                  <li>Système d'exploitation</li>
                  <li>Données de cookies</li>
                </ul>
              </div>
            </div>
          </Card>

          <Card className="p-8">
            <h2 className="text-2xl font-bold mb-4">Utilisation des données</h2>
            <p className="text-muted-foreground mb-4">Nous utilisons vos données pour :</p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li>Fournir et améliorer nos services</li>
              <li>Gérer votre compte et vos transactions</li>
              <li>Personnaliser votre expérience</li>
              <li>Communiquer avec vous (support, newsletters)</li>
              <li>Assurer la sécurité de la plateforme</li>
              <li>Respecter nos obligations légales</li>
              <li>Analyser l'utilisation et les performances</li>
            </ul>
          </Card>

          <Card className="p-8">
            <h2 className="text-2xl font-bold mb-4">Partage des données</h2>
            <div className="space-y-4 text-muted-foreground">
              <p>Nous ne vendons jamais vos données personnelles. Nous pouvons partager vos informations avec :</p>
              <ul className="list-disc list-inside space-y-2">
                <li>Nos prestataires de services (paiement, hébergement, analytics)</li>
                <li>Les autorités légales si requis par la loi</li>
                <li>En cas de fusion ou acquisition (après notification)</li>
              </ul>
              <p className="mt-4">
                Tous nos partenaires sont tenus de respecter la confidentialité de vos données et de les utiliser 
                uniquement aux fins spécifiées.
              </p>
            </div>
          </Card>

          <Card className="p-8">
            <h2 className="text-2xl font-bold mb-4">Sécurité des données</h2>
            <p className="text-muted-foreground mb-4">Nous mettons en place des mesures de sécurité appropriées :</p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li>Chiffrement des données sensibles (SSL/TLS)</li>
              <li>Authentification sécurisée</li>
              <li>Accès restreint aux données personnelles</li>
              <li>Surveillance et détection des intrusions</li>
              <li>Sauvegardes régulières et sécurisées</li>
              <li>Formation du personnel sur la protection des données</li>
            </ul>
          </Card>

          <Card className="p-8">
            <h2 className="text-2xl font-bold mb-4">Vos droits</h2>
            <p className="text-muted-foreground mb-4">
              Conformément au RGPD, vous disposez des droits suivants :
            </p>
            <div className="space-y-3 text-muted-foreground">
              <p><strong>Droit d'accès :</strong> Obtenir une copie de vos données personnelles</p>
              <p><strong>Droit de rectification :</strong> Corriger les données inexactes</p>
              <p><strong>Droit à l'effacement :</strong> Demander la suppression de vos données</p>
              <p><strong>Droit à la portabilité :</strong> Récupérer vos données dans un format structuré</p>
              <p><strong>Droit d'opposition :</strong> Vous opposer au traitement de vos données</p>
              <p><strong>Droit à la limitation :</strong> Demander la limitation du traitement</p>
            </div>
            <p className="text-muted-foreground mt-4">
              Pour exercer ces droits, contactez-nous à legal@visustock.com
            </p>
          </Card>

          <Card className="p-8">
            <h2 className="text-2xl font-bold mb-4">Conservation des données</h2>
            <p className="text-muted-foreground">
              Nous conservons vos données personnelles uniquement le temps nécessaire aux fins pour lesquelles elles ont été collectées :
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground mt-4">
              <li>Données de compte : Tant que votre compte est actif + 3 ans après suppression</li>
              <li>Données de transaction : 10 ans (obligations comptables)</li>
              <li>Données de support : 3 ans après résolution</li>
              <li>Données analytics : 2 ans maximum</li>
            </ul>
          </Card>

          <Card className="p-8">
            <h2 className="text-2xl font-bold mb-4">Transferts internationaux</h2>
            <p className="text-muted-foreground">
              Vos données peuvent être transférées vers des pays hors de l'Union européenne uniquement avec des garanties 
              appropriées (clauses contractuelles types, décisions d'adéquation de la Commission européenne).
            </p>
          </Card>

          <Card className="p-8">
            <h2 className="text-2xl font-bold mb-4">Modifications</h2>
            <p className="text-muted-foreground">
              Nous pouvons mettre à jour cette politique de confidentialité pour refléter les changements dans nos pratiques 
              ou pour d'autres raisons opérationnelles, légales ou réglementaires. Nous vous informerons de tout changement 
              important par email ou via notre site web.
            </p>
          </Card>

          <Card className="p-8">
            <h2 className="text-2xl font-bold mb-4">Contact</h2>
            <p className="text-muted-foreground mb-4">
              Pour toute question concernant cette politique de confidentialité ou vos données personnelles :
            </p>
            <div className="text-muted-foreground">
              <p>Email : legal@visustock.com</p>
              <p>Délégué à la protection des données : dpo@visustock.com</p>
              <p>Adresse : 123 Rue de la Tech, 75001 Paris, France</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;