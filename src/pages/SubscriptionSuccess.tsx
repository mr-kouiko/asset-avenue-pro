import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Header } from '@/components/Header';
import { CheckCircle, Loader2, XCircle, CreditCard, Sparkles } from 'lucide-react';
import { usePayPalSubscription, SUBSCRIPTION_PLANS } from '@/hooks/usePayPalSubscription';
import { useLanguage } from '@/contexts/LanguageContext';

const SubscriptionSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { activateSubscription } = usePayPalSubscription();
  
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [creditsAdded, setCreditsAdded] = useState(0);
  const [planType, setPlanType] = useState('');
  const [error, setError] = useState('');

  const content = {
    fr: {
      loading: 'Activation de votre abonnement...',
      success: 'Abonnement Activé !',
      successDesc: 'Votre abonnement a été activé avec succès.',
      creditsAdded: 'crédits ajoutés à votre compte',
      plan: 'Plan',
      monthly: 'mensuel',
      yearly: 'annuel',
      error: 'Erreur d\'Activation',
      errorDesc: 'Nous n\'avons pas pu activer votre abonnement.',
      goToMarketplace: 'Aller au Marketplace',
      goToAI: 'Générer des Images AI',
      goToPricing: 'Retour aux Tarifs',
      tryAgain: 'Réessayer',
    },
    en: {
      loading: 'Activating your subscription...',
      success: 'Subscription Activated!',
      successDesc: 'Your subscription has been successfully activated.',
      creditsAdded: 'credits added to your account',
      plan: 'Plan',
      monthly: 'monthly',
      yearly: 'yearly',
      error: 'Activation Error',
      errorDesc: 'We couldn\'t activate your subscription.',
      goToMarketplace: 'Go to Marketplace',
      goToAI: 'Generate AI Images',
      goToPricing: 'Back to Pricing',
      tryAgain: 'Try Again',
    },
  };

  const t = content[language];

  useEffect(() => {
    const subscriptionId = searchParams.get('subscription_id');
    const baToken = searchParams.get('ba_token');
    const token = searchParams.get('token');
    
    // PayPal returns subscription_id in the URL
    const paypalSubscriptionId = subscriptionId || baToken || token;

    if (!paypalSubscriptionId) {
      setStatus('error');
      setError('No subscription ID found in URL');
      return;
    }

    const activate = async () => {
      try {
        const result = await activateSubscription(paypalSubscriptionId);
        
        if (result?.success) {
          setStatus('success');
          setCreditsAdded(result.credits_added || 0);
          setPlanType(result.subscription?.plan_type || '');
        } else {
          setStatus('error');
          setError('Failed to activate subscription');
        }
      } catch (err) {
        console.error('Activation error:', err);
        setStatus('error');
        setError(err instanceof Error ? err.message : 'Unknown error');
      }
    };

    activate();
  }, [searchParams, activateSubscription]);

  const getPlanName = (type: string) => {
    const plan = SUBSCRIPTION_PLANS[type as keyof typeof SUBSCRIPTION_PLANS];
    return plan?.name || type;
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container max-w-2xl mx-auto py-20 px-4">
        <Card className="shadow-lg">
          <CardContent className="p-8">
            {status === 'loading' && (
              <div className="text-center space-y-6">
                <Loader2 className="h-16 w-16 animate-spin text-primary mx-auto" />
                <h2 className="text-2xl font-bold text-foreground">{t.loading}</h2>
                <p className="text-muted-foreground">Please wait while we confirm your payment...</p>
              </div>
            )}

            {status === 'success' && (
              <div className="text-center space-y-6">
                <div className="relative">
                  <CheckCircle className="h-20 w-20 text-green-500 mx-auto" />
                  <Sparkles className="h-6 w-6 text-yellow-500 absolute top-0 right-1/3 animate-pulse" />
                </div>
                
                <div className="space-y-2">
                  <h2 className="text-3xl font-bold text-foreground">{t.success}</h2>
                  <p className="text-lg text-muted-foreground">{t.successDesc}</p>
                </div>

                <div className="bg-primary/10 rounded-lg p-6 space-y-4">
                  <div className="flex items-center justify-center gap-2">
                    <CreditCard className="h-6 w-6 text-primary" />
                    <span className="text-2xl font-bold text-primary">
                      {creditsAdded} {t.creditsAdded}
                    </span>
                  </div>
                  
                  {planType && (
                    <p className="text-muted-foreground">
                      {t.plan}: <span className="font-semibold">{getPlanName(planType)}</span>
                    </p>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                  <Button onClick={() => navigate('/marketplace')} size="lg">
                    {t.goToMarketplace}
                  </Button>
                  <Button 
                    onClick={() => navigate('/ai-image-generator')} 
                    variant="outline" 
                    size="lg"
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    {t.goToAI}
                  </Button>
                </div>
              </div>
            )}

            {status === 'error' && (
              <div className="text-center space-y-6">
                <XCircle className="h-20 w-20 text-destructive mx-auto" />
                
                <div className="space-y-2">
                  <h2 className="text-3xl font-bold text-foreground">{t.error}</h2>
                  <p className="text-lg text-muted-foreground">{t.errorDesc}</p>
                  {error && (
                    <p className="text-sm text-destructive bg-destructive/10 p-3 rounded">
                      {error}
                    </p>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                  <Button onClick={() => navigate('/packages-pricing')} size="lg">
                    {t.goToPricing}
                  </Button>
                  <Button 
                    onClick={() => window.location.reload()} 
                    variant="outline" 
                    size="lg"
                  >
                    {t.tryAgain}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SubscriptionSuccess;
