import { Header } from "@/components/Header";
import { Navigation } from "@/components/Navigation";
import { Card } from "@/components/ui/card";

const Terms = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <Navigation />
      
      <div className="container py-8 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Conditions générales d'utilisation</h1>
          <p className="text-muted-foreground">
            Dernière mise à jour : 15 janvier 2024
          </p>
        </div>

        <div className="space-y-8">
          <Card className="p-8">
            <h2 className="text-2xl font-bold mb-4">1. Objet</h2>
            <p className="text-muted-foreground mb-4">
              Les présentes conditions générales d'utilisation (ci-après « CGU ») régissent l'utilisation de la plateforme ArabsStock, 
              une marketplace de contenus créatifs numériques (photos, vidéos, illustrations, audio) accessible à l'adresse arabsstock.com.
            </p>
            <p className="text-muted-foreground">
              L'utilisation de la plateforme implique l'acceptation pleine et entière des présentes CGU par l'utilisateur.
            </p>
          </Card>

          <Card className="p-8">
            <h2 className="text-2xl font-bold mb-4">2. Définitions</h2>
            <div className="space-y-3 text-muted-foreground">
              <p><strong>Plateforme :</strong> Le site web ArabsStock et ses services associés</p>
              <p><strong>Utilisateur :</strong> Toute personne physique ou morale utilisant la plateforme</p>
              <p><strong>Créateur/Vendeur :</strong> Utilisateur qui met en vente ses créations sur la plateforme</p>
              <p><strong>Acheteur :</strong> Utilisateur qui acquiert des contenus sur la plateforme</p>
              <p><strong>Contenu :</strong> Tout élément créatif (photo, vidéo, illustration, audio) proposé sur la plateforme</p>
            </div>
          </Card>

          <Card className="p-8">
            <h2 className="text-2xl font-bold mb-4">3. Inscription et compte utilisateur</h2>
            <div className="space-y-4 text-muted-foreground">
              <p>
                L'inscription sur la plateforme est gratuite et ouverte à toute personne majeure ou mineure avec autorisation parentale.
              </p>
              <p>
                L'utilisateur s'engage à fournir des informations exactes et à les maintenir à jour. Il est responsable de la confidentialité 
                de ses identifiants de connexion.
              </p>
              <p>
                ArabsStock se réserve le droit de suspendre ou supprimer tout compte en cas de violation des présentes CGU.
              </p>
            </div>
          </Card>

          <Card className="p-8">
            <h2 className="text-2xl font-bold mb-4">4. Services proposés</h2>
            <div className="space-y-4 text-muted-foreground">
              <h3 className="text-lg font-semibold text-foreground">4.1 Pour les acheteurs</h3>
              <ul className="list-disc list-inside space-y-2">
                <li>Recherche et navigation dans le catalogue</li>
                <li>Achat et téléchargement de contenus</li>
                <li>Gestion des licences d'utilisation</li>
                <li>Support client</li>
              </ul>
              
              <h3 className="text-lg font-semibold text-foreground">4.2 Pour les créateurs</h3>
              <ul className="list-disc list-inside space-y-2">
                <li>Upload et vente de créations</li>
                <li>Gestion du portefeuille</li>
                <li>Suivi des performances</li>
                <li>Gestion des revenus</li>
              </ul>
            </div>
          </Card>

          <Card className="p-8">
            <h2 className="text-2xl font-bold mb-4">5. Obligations des utilisateurs</h2>
            <div className="space-y-4 text-muted-foreground">
              <h3 className="text-lg font-semibold text-foreground">5.1 Obligations générales</h3>
              <ul className="list-disc list-inside space-y-2">
                <li>Respecter les lois en vigueur</li>
                <li>Ne pas porter atteinte aux droits de tiers</li>
                <li>Ne pas utiliser la plateforme à des fins illégales</li>
                <li>Maintenir la confidentialité de leurs identifiants</li>
              </ul>
              
              <h3 className="text-lg font-semibold text-foreground">5.2 Obligations des créateurs</h3>
              <ul className="list-disc list-inside space-y-2">
                <li>Être propriétaire des droits sur les contenus uploadés</li>
                <li>Fournir des contenus de qualité professionnelle</li>
                <li>Respecter les standards de la communauté</li>
                <li>Ne pas uploader de contenu illégal ou violant les droits d'auteur</li>
              </ul>
            </div>
          </Card>

          <Card className="p-8">
            <h2 className="text-2xl font-bold mb-4">6. Propriété intellectuelle</h2>
            <p className="text-muted-foreground mb-4">
              Les créateurs conservent leurs droits d'auteur sur les contenus uploadés. ArabsStock obtient une licence 
              non-exclusive pour héberger, présenter et distribuer ces contenus.
            </p>
            <p className="text-muted-foreground">
              La plateforme, ses éléments de design, son code source et sa marque sont protégés par les droits de propriété 
              intellectuelle d'ArabsStock.
            </p>
          </Card>

          <Card className="p-8">
            <h2 className="text-2xl font-bold mb-4">7. Tarification et paiement</h2>
            <div className="space-y-4 text-muted-foreground">
              <p>
                Les prix sont affichés en euros TTC. Les paiements sont sécurisés et traités par nos partenaires de confiance.
              </p>
              <p>
                ArabsStock prélève une commission sur chaque vente, dont le taux est communiqué aux créateurs lors de l'inscription.
              </p>
              <p>
                Les remboursements ne sont possibles qu'en cas de défaut technique empêchant le téléchargement dans les 30 jours suivant l'achat.
              </p>
            </div>
          </Card>

          <Card className="p-8">
            <h2 className="text-2xl font-bold mb-4">8. Responsabilité</h2>
            <p className="text-muted-foreground mb-4">
              ArabsStock fait ses meilleurs efforts pour assurer la disponibilité et la sécurité de la plateforme, 
              mais ne peut garantir un fonctionnement sans interruption.
            </p>
            <p className="text-muted-foreground">
              La responsabilité d'ArabsStock est limitée aux dommages directs et ne peut excéder le montant des transactions 
              concernées sur les 12 derniers mois.
            </p>
          </Card>

          <Card className="p-8">
            <h2 className="text-2xl font-bold mb-4">9. Résiliation</h2>
            <p className="text-muted-foreground mb-4">
              L'utilisateur peut supprimer son compte à tout moment depuis son espace personnel.
            </p>
            <p className="text-muted-foreground">
              ArabsStock peut suspendre ou supprimer un compte en cas de violation des CGU, après mise en demeure restée sans effet.
            </p>
          </Card>

          <Card className="p-8">
            <h2 className="text-2xl font-bold mb-4">10. Modifications des CGU</h2>
            <p className="text-muted-foreground">
              ArabsStock se réserve le droit de modifier les présentes CGU à tout moment. Les utilisateurs seront informés 
              par email des modifications importantes. La poursuite de l'utilisation vaut acceptation des nouvelles conditions.
            </p>
          </Card>

          <Card className="p-8">
            <h2 className="text-2xl font-bold mb-4">11. Droit applicable et juridiction</h2>
            <p className="text-muted-foreground">
              Les présentes CGU sont régies par le droit français. En cas de litige, les tribunaux de Paris sont seuls compétents, 
              sauf disposition légale contraire.
            </p>
          </Card>

          <Card className="p-8">
            <h2 className="text-2xl font-bold mb-4">12. Contact</h2>
            <p className="text-muted-foreground">
              Pour toute question relative aux présentes CGU, vous pouvez nous contacter à :
            </p>
            <div className="mt-4 text-muted-foreground">
              <p>Email : legal@arabsstock.com</p>
              <p>Adresse : 123 Rue de la Tech, 75001 Paris, France</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Terms;