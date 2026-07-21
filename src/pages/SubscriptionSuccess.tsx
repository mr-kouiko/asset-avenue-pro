import { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, Loader2, XCircle, Infinity, Sparkles } from 'lucide-react';
import { usePayPalSubscription, SUBSCRIPTION_PLANS } from '@/hooks/usePayPalSubscription';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSEO } from "@/hooks/useSEO";

const SubscriptionSuccess = () => {
  useSEO({ title: "Subscription Successful", description: "Your VisuStock Infinity subscription is active.", noindex: true });
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { activateSubscription } = usePayPalSubscription();
  const activationAttempted = useRef(false);
  
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [periodEnd, setPeriodEnd] = useState('');
  const [error, setError] = useState('');

  const content = {
    fr: {
      loading: 'Activation de votre abonnement...',
      success: 'Abonnement Infinity Activé !',
      successDesc: 'Bienvenue dans VisuStock Infinity ! Profitez d\'un accès illimité.',
      accessUntil: 'Accès jusqu\'au',
      unlimited: 'Téléchargements illimités',
      error: 'Erreur d\'Activation',
      errorDesc: 'Nous n\'avons pas pu activer votre abonnement.',
      goToMarketplace: 'Explorer le Marketplace',
      goToDashboard: 'Mon Tableau de Bord',
      goToPricing: 'Retour aux Tarifs',
      tryAgain: 'Réessayer',
    },
    en: {
      loading: 'Activating your subscription...',
      success: 'Infinity Subscription Activated!',
      successDesc: 'Welcome to VisuStock Infinity! Enjoy unlimited access.',
      accessUntil: 'Access until',
      unlimited: 'Unlimited downloads',
      error: 'Activation Error',
      errorDesc: 'We couldn\'t activate your subscription.',
      goToMarketplace: 'Explore Marketplace',
      goToDashboard: 'My Dashboard',
      goToPricing: 'Back to Pricing',
      tryAgain: 'Try Again',
    },
  };

  const t = content[language as 'en' | 'fr'] ?? content.en;

  useEffect(() => {
    // Prevent double activation
    if (activationAttempted.current) return;
    activationAttempted.current = true;

    // PayPal Orders API returns 'token' parameter (the order ID)
    const orderId = searchParams.get('token');
    
    if (!orderId) {
      setStatus('error');
      setError('No order ID found in URL');
      return;
    }

    const activate = async () => {
      try {
        console.log('Activating Infinity subscription for order:', orderId);
        const result = await activateSubscription(orderId);
        
        if (result?.success) {
          setStatus('success');
          setPeriodEnd(result.period_end || '');
        } else {
          // Check if already processed
          if (result?.already_processed) {
            setStatus('success');
            setPeriodEnd(result.period_end || '');
          } else {
            setStatus('error');
            setError('Failed to activate subscription');
          }
        }
      } catch (err) {
        console.error('Activation error:', err);
        setStatus('error');
        setError(err instanceof Error ? err.message : 'Unknown error');
      }
    };

    activate();
  }, [searchParams, activateSubscription]);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="min-h-screen bg-background">
      
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
                  <div className="h-20 w-20 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center mx-auto">
                    <Infinity className="h-12 w-12 text-white" />
                  </div>
                  <Sparkles className="h-6 w-6 text-yellow-500 absolute top-0 right-1/3 animate-pulse" />
                </div>
                
                <div className="space-y-2">
                  <h2 className="text-3xl font-bold text-foreground">{t.success}</h2>
                  <p className="text-lg text-muted-foreground">{t.successDesc}</p>
                </div>

                <div className="bg-primary/10 rounded-lg p-6 space-y-4">
                  <div className="flex items-center justify-center gap-2">
                    <CheckCircle className="h-6 w-6 text-green-500" />
                    <span className="text-xl font-bold text-primary">
                      {t.unlimited}
                    </span>
                  </div>
                  
                  {periodEnd && (
                    <p className="text-muted-foreground">
                      {t.accessUntil}: <span className="font-semibold">{formatDate(periodEnd)}</span>
                    </p>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                  <Button onClick={() => navigate('/marketplace')} size="lg">
                    {t.goToMarketplace}
                  </Button>
                  <Button 
                    onClick={() => navigate('/dashboard')} 
                    variant="outline" 
                    size="lg"
                  >
                    {t.goToDashboard}
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
