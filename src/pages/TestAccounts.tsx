import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Copy, User, Shield, Store } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useSEO } from "@/hooks/useSEO";

const TestAccounts = () => {
  useSEO({ title: "Test Accounts", description: "Internal test accounts.", noindex: true });
  const { toast } = useToast();

  const testAccounts = [
    {
      email: "kouiko@gmail.com",
      password: "123456",
      role: "admin",
      description: "Compte administrateur principal",
      icon: Shield,
      color: "destructive"
    },
    {
      email: "seller@example.com", 
      password: "123456",
      role: "creator",
      description: "Compte vendeur/créateur de test",
      icon: Store,
      color: "default"
    },
    {
      email: "buyer@example.com",
      password: "123456", 
      role: "client",
      description: "Compte acheteur de test",
      icon: User,
      color: "secondary"
    }
  ];

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copié !",
      description: "L'information a été copiée dans le presse-papier."
    });
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="container max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Comptes de test VisuStock</h1>
          <p className="text-muted-foreground">
            Utilisez ces comptes pour tester les différents rôles et fonctionnalités de la plateforme.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {testAccounts.map((account, index) => {
            const IconComponent = account.icon;
            return (
              <Card key={index} className="relative">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <IconComponent className="h-5 w-5" />
                      <CardTitle className="text-lg">{account.role === "admin" ? "Admin" : account.role === "creator" ? "Vendeur" : "Acheteur"}</CardTitle>
                    </div>
                    <Badge variant={account.color as any}>
                      {account.role}
                    </Badge>
                  </div>
                  <CardDescription>
                    {account.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Email:</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(account.email)}
                        className="h-auto p-1"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                    <p className="text-sm bg-muted p-2 rounded font-mono">{account.email}</p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Mot de passe:</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(account.password)}
                        className="h-auto p-1"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                    <p className="text-sm bg-muted p-2 rounded font-mono">{account.password}</p>
                  </div>

                  <div className="pt-2">
                    <h4 className="text-sm font-medium mb-2">Accès autorisé:</h4>
                    <div className="text-xs text-muted-foreground space-y-1">
                      {account.role === "admin" && (
                        <>
                          <p>• /admin (Dashboard administrateur)</p>
                          <p>• /seller-dashboard (Dashboard vendeur)</p>
                          <p>• /buyer-dashboard (Dashboard acheteur)</p>
                          <p>• Toutes les fonctionnalités</p>
                        </>
                      )}
                      {account.role === "creator" && (
                        <>
                          <p>• /seller-dashboard (Dashboard vendeur)</p>
                          <p>• /upload (Téléverser du contenu)</p>
                          <p>• Vendre des créations</p>
                        </>
                      )}
                      {account.role === "client" && (
                        <>
                          <p>• /buyer-dashboard (Dashboard acheteur)</p>
                          <p>• /dashboard (Dashboard général)</p>
                          <p>• Acheter du contenu</p>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Instructions de test</CardTitle>
            <CardDescription>
              Comment tester les différentes fonctionnalités
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 text-sm">
              <div>
                <h4 className="font-medium mb-2">1. Connexion</h4>
                <p className="text-muted-foreground">
                  Utilisez les identifiants ci-dessus pour vous connecter via /auth ou le modal de connexion.
                </p>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">2. Test de rôles</h4>
                <ul className="text-muted-foreground list-disc list-inside space-y-1">
                  <li><strong>Admin:</strong> Peut accéder à toutes les pages, y compris /admin</li>
                  <li><strong>Creator:</strong> Peut téléverser du contenu et accéder au dashboard vendeur</li>
                  <li><strong>Client:</strong> Peut acheter du contenu et accéder au dashboard acheteur</li>
                </ul>
              </div>

              <div>
                <h4 className="font-medium mb-2">3. Inscription de nouveaux utilisateurs</h4>
                <p className="text-muted-foreground">
                  Les nouveaux utilisateurs reçoivent automatiquement le rôle "client" et un email de bienvenue.
                  Les vendeurs reçoivent un email de confirmation spécifique.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TestAccounts;