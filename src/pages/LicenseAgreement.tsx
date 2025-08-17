import { Header } from "@/components/Header";
import { Navigation } from "@/components/Navigation";
import { Card } from "@/components/ui/card";

const LicenseAgreement = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <Navigation />
      
      <div className="container py-8 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Accord de licence</h1>
          <p className="text-muted-foreground">
            Dernière mise à jour : 15 janvier 2024
          </p>
        </div>

        <div className="space-y-8">
          <Card className="p-8">
            <h2 className="text-2xl font-bold mb-4">Introduction</h2>
            <p className="text-muted-foreground">
              Cet accord de licence définit les conditions d'utilisation des contenus créatifs (photos, vidéos, illustrations, audio) 
              achetés sur la plateforme VisuStock. En téléchargeant un contenu, vous acceptez ces termes et conditions.
            </p>
          </Card>

          <Card className="p-8">
            <h2 className="text-2xl font-bold mb-4">Licence Standard</h2>
            <div className="space-y-4 text-muted-foreground">
              <h3 className="text-lg font-semibold text-foreground">Droits accordés</h3>
              <p>La licence standard vous autorise à :</p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Utiliser le contenu dans des projets commerciaux et non commerciaux</li>
                <li>Modifier, recadrer, retoucher le contenu selon vos besoins</li>
                <li>Utiliser le contenu sur des sites web, réseaux sociaux, supports imprimés</li>
                <li>Intégrer le contenu dans des produits dérivés (livres, magazines, brochures)</li>
                <li>Utiliser le contenu dans des campagnes publicitaires</li>
              </ul>
              
              <h3 className="text-lg font-semibold text-foreground mt-6">Limitations</h3>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Maximum 500 000 impressions par projet</li>
                <li>Utilisation limitée à un seul client/projet par licence</li>
                <li>Interdiction de revendre le contenu tel quel</li>
                <li>Interdiction de créer des produits concurrents (banques d'images)</li>
              </ul>
            </div>
          </Card>

          <Card className="p-8">
            <h2 className="text-2xl font-bold mb-4">Licence Étendue</h2>
            <div className="space-y-4 text-muted-foreground">
              <h3 className="text-lg font-semibold text-foreground">Droits supplémentaires</h3>
              <p>En plus des droits de la licence standard, la licence étendue permet :</p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Utilisation illimitée en termes d'impressions</li>
                <li>Utilisation pour la création de produits à la revente (t-shirts, mugs, posters)</li>
                <li>Utilisation dans des templates et modèles numériques</li>
                <li>Distribution électronique illimitée</li>
                <li>Utilisation dans des applications mobiles et logiciels</li>
              </ul>
              
              <h3 className="text-lg font-semibold text-foreground mt-6">Restrictions maintenues</h3>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Interdiction de revendre le contenu brut</li>
                <li>Pas d'utilisation pour créer des banques d'images concurrentes</li>
                <li>Respect des droits des personnes représentées</li>
              </ul>
            </div>
          </Card>

          <Card className="p-8">
            <h2 className="text-2xl font-bold mb-4">Licence Éditoriale</h2>
            <div className="space-y-4 text-muted-foreground">
              <p>
                Certains contenus sont disponibles uniquement sous licence éditoriale, restreignant leur utilisation à :
              </p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Articles de presse et journalisme</li>
                <li>Contenus éducatifs et informatifs</li>
                <li>Documentaires et reportages</li>
                <li>Utilisations non commerciales</li>
              </ul>
              <p className="mt-4">
                <strong>Interdictions :</strong> Utilisation commerciale, publicité, promotion de produits ou services.
              </p>
            </div>
          </Card>

          <Card className="p-8">
            <h2 className="text-2xl font-bold mb-4">Restrictions générales</h2>
            <div className="space-y-4 text-muted-foreground">
              <h3 className="text-lg font-semibold text-foreground">Utilisations interdites</h3>
              <ul className="list-disc list-inside space-y-1">
                <li>Présentation des personnes sous un jour négatif ou offensant</li>
                <li>Promotion de contenus illégaux, discriminatoires ou haineux</li>
                <li>Utilisation pour des sites pour adultes ou du contenu pornographique</li>
                <li>Création de fausses identités ou de profils frauduleux</li>
                <li>Utilisation dans des contextes politiques sensibles sans autorisation</li>
                <li>Reproduction ou distribution du contenu à des tiers non autorisés</li>
              </ul>
            </div>
          </Card>

          <Card className="p-8">
            <h2 className="text-2xl font-bold mb-4">Droits des modèles et propriétés</h2>
            <div className="space-y-4 text-muted-foreground">
              <p>
                Les contenus incluant des personnes identifiables ou des propriétés privées sont accompagnés 
                d'autorisations appropriées. Cependant :
              </p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>L'utilisation commerciale peut nécessiter des autorisations supplémentaires</li>
                <li>Certaines utilisations sensibles peuvent être restreintes</li>
                <li>Le respect de la dignité des personnes représentées est obligatoire</li>
              </ul>
            </div>
          </Card>

          <Card className="p-8">
            <h2 className="text-2xl font-bold mb-4">Attribution</h2>
            <div className="space-y-4 text-muted-foreground">
              <p>
                L'attribution n'est généralement pas requise, mais est appréciée. Si vous choisissez d'attribuer :
              </p>
              <p className="bg-muted p-4 rounded-lg font-mono text-sm">
                "Photo/Illustration par [Nom de l'auteur] via VisuStock"
              </p>
              <p>
                L'attribution peut être requise pour certains contenus sous licence Creative Commons.
              </p>
            </div>
          </Card>

          <Card className="p-8">
            <h2 className="text-2xl font-bold mb-4">Durée et résiliation</h2>
            <div className="space-y-4 text-muted-foreground">
              <p>
                Les licences sont perpétuelles, ce qui signifie que vous pouvez utiliser le contenu indéfiniment 
                tant que vous respectez les termes de cet accord.
              </p>
              <p>
                VisuStock se réserve le droit de résilier une licence en cas de violation grave des termes d'utilisation.
              </p>
            </div>
          </Card>

          <Card className="p-8">
            <h2 className="text-2xl font-bold mb-4">Responsabilité</h2>
            <div className="space-y-4 text-muted-foreground">
              <p>
                VisuStock garantit que les contenus sont libres de droits pour les utilisations autorisées par la licence. 
                Cependant :
              </p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>L'utilisateur est responsable de l'usage qu'il fait du contenu</li>
                <li>VisuStock ne peut être tenu responsable des utilisations non conformes</li>
                <li>En cas de réclamation de tiers, VisuStock s'engage à défendre les droits du licencié</li>
              </ul>
            </div>
          </Card>

          <Card className="p-8">
            <h2 className="text-2xl font-bold mb-4">Modifications</h2>
            <p className="text-muted-foreground">
              Cet accord peut être modifié pour refléter les évolutions légales ou commerciales. 
              Les modifications n'affectent pas les licences déjà accordées avant la date de modification.
            </p>
          </Card>

          <Card className="p-8">
            <h2 className="text-2xl font-bold mb-4">Contact</h2>
            <p className="text-muted-foreground mb-4">
              Pour toute question concernant cet accord de licence :
            </p>
            <div className="text-muted-foreground">
              <p>Email : legal@visustock.com</p>
              <p>Service licences : licenses@visustock.com</p>
              <p>Adresse : 123 Rue de la Tech, 75001 Paris, France</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default LicenseAgreement;