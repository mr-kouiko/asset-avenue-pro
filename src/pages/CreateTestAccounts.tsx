import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { User, ShieldCheck, ShoppingCart } from 'lucide-react';

export const CreateTestAccounts = () => {
  const [creating, setCreating] = useState(false);

  const testAccounts = [
    {
      email: 'seller@example.com',
      password: 'seller123!',
      role: 'creator',
      displayName: 'Test Seller',
      storeName: 'Test Creator Store',
      icon: User,
      color: 'bg-blue-500'
    },
    {
      email: 'buyer@example.com', 
      password: 'buyer123!',
      role: 'client',
      displayName: 'Test Buyer',
      storeName: null,
      icon: ShoppingCart,
      color: 'bg-green-500'
    }
  ];

  const createAccount = async (account: typeof testAccounts[0]) => {
    try {
      console.log(`Creating account for ${account.email}...`);
      
      const { data, error } = await supabase.auth.signUp({
        email: account.email,
        password: account.password,
        options: {
          data: {
            role: account.role,
            first_name: account.displayName,
            store_name: account.storeName
          },
          emailRedirectTo: `${window.location.origin}/`
        }
      });

      if (error) {
        if (error.message.includes('already registered')) {
          toast.info(`Compte ${account.email} existe déjà`);
          return true;
        }
        throw error;
      }

      if (data.user) {
        toast.success(`Compte ${account.email} créé avec succès`);
        return true;
      }

      return false;
    } catch (error) {
      console.error(`Error creating ${account.email}:`, error);
      toast.error(`Erreur lors de la création de ${account.email}`);
      return false;
    }
  };

  const createAllAccounts = async () => {
    setCreating(true);
    
    try {
      const results = await Promise.all(
        testAccounts.map(account => createAccount(account))
      );
      
      const successCount = results.filter(Boolean).length;
      
      if (successCount === testAccounts.length) {
        toast.success('Tous les comptes de test ont été créés avec succès !');
      } else {
        toast.error(`Seulement ${successCount}/${testAccounts.length} comptes créés`);
      }
    } catch (error) {
      console.error('Error creating test accounts:', error);
      toast.error('Erreur lors de la création des comptes');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">Créer les comptes de test</h1>
        <p className="text-muted-foreground">
          Créez automatiquement les comptes de test pour la marketplace
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        {testAccounts.map((account) => {
          const Icon = account.icon;
          return (
            <Card key={account.email} className="relative">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${account.color} text-white`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  {account.displayName}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <p><strong>Email:</strong> {account.email}</p>
                  <p><strong>Mot de passe:</strong> {account.password}</p>
                  <p><strong>Rôle:</strong> 
                    <Badge variant={account.role === 'creator' ? 'default' : 'secondary'} className="ml-2">
                      {account.role === 'creator' ? 'Vendeur/Créateur' : 'Acheteur'}
                    </Badge>
                  </p>
                  {account.storeName && (
                    <p><strong>Boutique:</strong> {account.storeName}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="text-center">
        <Button 
          onClick={createAllAccounts}
          disabled={creating}
          size="lg"
          className="min-w-[200px]"
        >
          {creating ? (
            <>
              <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
              Création en cours...
            </>
          ) : (
            <>
              <ShieldCheck className="h-5 w-5 mr-2" />
              Créer tous les comptes
            </>
          )}
        </Button>
      </div>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="text-lg">Instructions importantes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
            <h4 className="font-semibold mb-2 text-blue-900 dark:text-blue-100">
              🔐 Comptes créés automatiquement :
            </h4>
            <ul className="space-y-1 text-sm text-blue-800 dark:text-blue-200">
              <li><strong>kouiko@gmail.com</strong> : Admin (existant)</li>
              <li><strong>seller@example.com</strong> : Créateur/Vendeur</li>
              <li><strong>buyer@example.com</strong> : Acheteur/Client</li>
            </ul>
          </div>
          
          <div className="bg-green-50 dark:bg-green-950 p-4 rounded-lg">
            <h4 className="font-semibold mb-2 text-green-900 dark:text-green-100">
              ✅ Accès selon les rôles :
            </h4>
            <ul className="space-y-1 text-sm text-green-800 dark:text-green-200">
              <li><strong>Admin</strong> : Accès à /admin, /seller-dashboard, /buyer-dashboard</li>
              <li><strong>Seller</strong> : Accès à /seller-dashboard, /upload</li>
              <li><strong>Buyer</strong> : Accès à /buyer-dashboard, marketplace</li>
            </ul>
          </div>
          
          <div className="bg-yellow-50 dark:bg-yellow-950 p-4 rounded-lg">
            <h4 className="font-semibold mb-2 text-yellow-900 dark:text-yellow-100">
              ⚠️ Sécurité renforcée :
            </h4>
            <ul className="space-y-1 text-sm text-yellow-800 dark:text-yellow-200">
              <li>• Paramètres Stripe gérés via les secrets sécurisés</li>
              <li>• Accès aux données sensibles audité et loggé</li>
              <li>• Policies RLS strictes sur toutes les tables</li>
              <li>• Authentification requise pour tous les paiements</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};