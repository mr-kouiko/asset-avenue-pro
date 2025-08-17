import { Header } from "@/components/Header";
import { Navigation } from "@/components/Navigation";
import { Card } from "@/components/ui/card";

const CookiePolicy = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <Navigation />
      
      <div className="container py-8 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Politique des cookies</h1>
          <p className="text-muted-foreground">
            Dernière mise à jour : 15 janvier 2024
          </p>
        </div>

        <div className="space-y-8">
          <Card className="p-8">
            <h2 className="text-2xl font-bold mb-4">Introduction</h2>
            <p className="text-muted-foreground">
              Nous utilisons des cookies et des technologies similaires sur notre site web pour fournir de meilleurs services 
              et améliorer votre expérience utilisateur. Cette politique explique comment les cookies sont utilisés, 
              les raisons de leur utilisation et les options qui s'offrent à vous concernant leur gestion.
            </p>
          </Card>

          <Card className="p-8">
            <h2 className="text-2xl font-bold mb-4">Que sont les cookies ?</h2>
            <p className="text-muted-foreground">
              Les cookies sont de petits fichiers texte stockés sur votre appareil lorsque vous visitez notre site web. 
              Ces fichiers mémorisent vos paramètres et préférences pour offrir une expérience de navigation fluide et efficace. 
              Ils sont également utilisés pour recueillir des informations spécifiques sur la façon dont vous interagissez avec le site.
            </p>
          </Card>

          <Card className="p-8">
            <h2 className="text-2xl font-bold mb-4">Pourquoi utilisons-nous des cookies ?</h2>
            <p className="text-muted-foreground mb-4">
              Nous utilisons des cookies à plusieurs fins, notamment :
            </p>
            <ul className="list-disc list-inside space-y-3 text-muted-foreground">
              <li>
                <strong>Prestation de services et facilité d'utilisation :</strong> Les cookies nous aident à mémoriser vos préférences, 
                comme les paramètres de langue, et facilitent l'accès aux fonctionnalités essentielles comme la connexion et 
                le téléchargement d'images ou de vidéos.
              </li>
              <li>
                <strong>Analyse des performances et amélioration du site :</strong> Nous utilisons des cookies pour collecter 
                des données sur la façon dont les utilisateurs interagissent avec le site, comme les pages les plus visitées 
                ou le temps passé sur diverses pages. Ces données nous aident à améliorer le site web et nos services.
              </li>
              <li>
                <strong>Publicités personnalisées :</strong> Nous pouvons utiliser des cookies pour diffuser des publicités 
                adaptées à vos intérêts. Ces données sont utilisées pour fournir des publicités qui vous sont plus pertinentes.
              </li>
              <li>
                <strong>Communication et interaction utilisateur :</strong> Les cookies aident à faciliter l'interaction entre 
                les utilisateurs et les services, comme le chat en direct ou la mémorisation des demandes précédentes.
              </li>
            </ul>
          </Card>

          <Card className="p-8">
            <h2 className="text-2xl font-bold mb-4">Types de cookies que nous utilisons</h2>
            <div className="space-y-4 text-muted-foreground">
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Cookies nécessaires</h3>
                <p>
                  Ces cookies sont essentiels au fonctionnement du site web et ne peuvent pas être désactivés par les utilisateurs. 
                  Sans eux, les services de base comme la connexion ou l'achat ne peuvent pas être fournis.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Cookies d'analyse et de performance</h3>
                <p>
                  Utilisés pour analyser l'utilisation du site et améliorer votre expérience en nous fournissant des informations 
                  liées aux performances.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Cookies fonctionnels</h3>
                <p>
                  Utilisés pour offrir des fonctionnalités améliorées et personnaliser les services, comme mémoriser vos préférences 
                  ou améliorer les performances basées sur les interactions passées avec le site.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Cookies publicitaires</h3>
                <p>
                  Utilisés pour suivre le comportement des utilisateurs en ligne afin d'afficher des publicités personnalisées.
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-8">
            <h2 className="text-2xl font-bold mb-4">Comment gérer les cookies</h2>
            <p className="text-muted-foreground mb-4">
              Vous pouvez contrôler l'utilisation des cookies via les paramètres de votre navigateur. Vous pouvez refuser 
              ou supprimer les cookies, mais veuillez noter que la désactivation de certains types peut affecter votre expérience 
              sur le site et limiter les fonctionnalités disponibles.
            </p>
            <div className="space-y-2 text-muted-foreground">
              <p><strong>Chrome :</strong> Paramètres → Avancé → Confidentialité et sécurité → Cookies</p>
              <p><strong>Firefox :</strong> Préférences → Vie privée et sécurité → Cookies et données de site</p>
              <p><strong>Safari :</strong> Préférences → Confidentialité → Cookies et données de site web</p>
              <p><strong>Edge :</strong> Paramètres → Cookies et autorisations de site</p>
            </div>
          </Card>

          <Card className="p-8">
            <h2 className="text-2xl font-bold mb-4">Modifications de la politique des cookies</h2>
            <p className="text-muted-foreground">
              Nous pouvons mettre à jour cette politique de temps en temps pour refléter les changements dans notre utilisation 
              des cookies ou pour répondre aux exigences légales. Il est conseillé de consulter cette page régulièrement 
              pour rester informé des dernières mises à jour.
            </p>
          </Card>

          <Card className="p-8">
            <h2 className="text-2xl font-bold mb-4">Nous contacter</h2>
            <p className="text-muted-foreground mb-4">
              Si vous avez des questions ou avez besoin de plus d'informations sur la politique des cookies, 
              vous pouvez nous contacter à :
            </p>
            <div className="text-muted-foreground">
              <p>Email : legal@visustock.com</p>
              <p>Adresse : 123 Rue de la Tech, 75001 Paris, France</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CookiePolicy;