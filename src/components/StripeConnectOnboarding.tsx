import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  CreditCard, 
  CheckCircle, 
  AlertCircle, 
  ExternalLink,
  Loader2,
  DollarSign,
  TrendingUp
} from 'lucide-react';
import { useStripeConnect } from '@/hooks/useStripeConnect';

export const StripeConnectOnboarding = () => {
  const { 
    loading, 
    accountStatus, 
    createConnectAccount, 
    refreshAccountStatus,
    isAccountReady,
    canReceivePayments,
    canReceivePayouts
  } = useStripeConnect();
  
  const [accountType, setAccountType] = useState<'express' | 'standard'>('express');

  const handleCreateAccount = async () => {
    await createConnectAccount(accountType);
  };

  const getStatusBadge = () => {
    if (!accountStatus?.has_account) {
      return <Badge variant="secondary">Aucun compte</Badge>;
    }
    
    if (isAccountReady()) {
      return <Badge variant="default">Compte actif</Badge>;
    }
    
    if (accountStatus.onboarding_completed) {
      return <Badge variant="outline">Configuration incomplète</Badge>;
    }
    
    return <Badge variant="destructive">Configuration en cours</Badge>;
  };

  const getRequirementsList = () => {
    if (!accountStatus?.requirements) return null;

    const requirements = accountStatus.requirements;
    const allRequirements = [
      ...(requirements.currently_due || []),
      ...(requirements.eventually_due || []),
      ...(requirements.past_due || [])
    ];

    if (allRequirements.length === 0) return null;

    return (
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-muted-foreground">Informations requises :</h4>
        <ul className="text-sm space-y-1">
          {allRequirements.map((req, index) => (
            <li key={index} className="flex items-center gap-2 text-orange-600">
              <AlertCircle className="h-3 w-3" />
              {req}
            </li>
          ))}
        </ul>
      </div>
    );
  };

  if (!accountStatus) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="ml-2">Chargement du statut du compte...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Account Status Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Compte Stripe Connect
            </CardTitle>
            {getStatusBadge()}
          </div>
          <CardDescription>
            Configurez vos paiements pour recevoir vos revenus de vente
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {!accountStatus.has_account ? (
            /* No Account - Onboarding */
            <div className="space-y-4">
              <div className="text-center py-6">
                <CreditCard className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">Créer votre compte de paiement</h3>
                <p className="text-muted-foreground mb-6">
                  Configurez Stripe Connect pour recevoir les paiements de vos ventes
                </p>
                
                <div className="max-w-xs mx-auto mb-4">
                  <Select value={accountType} onValueChange={(value: 'express' | 'standard') => setAccountType(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="express">Express (Recommandé)</SelectItem>
                      <SelectItem value="standard">Standard</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-2">
                    Express : Configuration rapide et simple
                  </p>
                </div>

                <Button 
                  onClick={handleCreateAccount}
                  disabled={loading}
                  size="lg"
                  className="w-full max-w-xs"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Configuration...
                    </>
                  ) : (
                    <>
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Créer le compte
                    </>
                  )}
                </Button>
              </div>
            </div>
          ) : (
            /* Has Account - Status Display */
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center gap-3 p-3 rounded-lg border">
                  {accountStatus.onboarding_completed ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-orange-500" />
                  )}
                  <div>
                    <p className="text-sm font-medium">Configuration</p>
                    <p className="text-xs text-muted-foreground">
                      {accountStatus.onboarding_completed ? 'Terminée' : 'En cours'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-lg border">
                  {canReceivePayments() ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-red-500" />
                  )}
                  <div>
                    <p className="text-sm font-medium">Paiements</p>
                    <p className="text-xs text-muted-foreground">
                      {canReceivePayments() ? 'Activés' : 'Non activés'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-lg border">
                  {canReceivePayouts() ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-red-500" />
                  )}
                  <div>
                    <p className="text-sm font-medium">Virements</p>
                    <p className="text-xs text-muted-foreground">
                      {canReceivePayouts() ? 'Activés' : 'Non activés'}
                    </p>
                  </div>
                </div>
              </div>

              {getRequirementsList()}

              {!isAccountReady() && (
                <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-orange-500 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-orange-800">
                        Configuration incomplète
                      </p>
                      <p className="text-sm text-orange-700 mt-1">
                        Vous devez finaliser la configuration de votre compte pour recevoir des paiements.
                      </p>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="mt-3"
                        onClick={handleCreateAccount}
                        disabled={loading}
                      >
                        {loading ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <ExternalLink className="h-4 w-4 mr-2" />
                        )}
                        Reprendre la configuration
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={refreshAccountStatus}
                  disabled={loading}
                >
                  Actualiser le statut
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats Card */}
      {accountStatus.has_account && accountStatus.stats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Statistiques de vente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-3 rounded-lg border">
                <DollarSign className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-sm font-medium">Revenus totaux</p>
                  <p className="text-2xl font-bold">
                    {accountStatus.stats.total_earnings.toFixed(2)}€
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-lg border">
                <TrendingUp className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-sm font-medium">Transactions</p>
                  <p className="text-2xl font-bold">
                    {accountStatus.stats.total_transactions}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};