import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Navigation } from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Download, ArrowRight, Home, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface PurchasedItem {
  id: string;
  title: string;
  type: string;
}

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const purchaseType = searchParams.get('type') || 'content'; // 'content' or 'credits'
  const [loading, setLoading] = useState(true);
  const [purchases, setPurchases] = useState<PurchasedItem[]>([]);
  const [creditsAdded, setCreditsAdded] = useState<number | null>(null);

  useEffect(() => {
    const fetchPurchases = async () => {
      try {
        // Fetch user's recent downloads (purchases)
        const { data: downloads, error } = await supabase
          .from('downloads')
          .select(`
            id,
            submission_id,
            content_submissions (
              id,
              title
            )
          `)
          .order('created_at', { ascending: false })
          .limit(5);

        if (!error && downloads) {
          const items: PurchasedItem[] = downloads.map((d: any) => ({
            id: d.submission_id,
            title: d.content_submissions?.title || 'Contenu acheté',
            type: 'content'
          }));
          setPurchases(items);
        }
      } catch (err) {
        console.error('Error fetching purchases:', err);
      } finally {
        setTimeout(() => setLoading(false), 1500);
      }
    };

    fetchPurchases();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <Navigation />
        
      <div className="container py-16">
        <div className="max-w-2xl mx-auto text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-6" />
          <h1 className="text-2xl font-bold mb-4">Confirmation du paiement...</h1>
          <p className="text-muted-foreground">
            Nous vérifions votre paiement. Veuillez patienter.
          </p>
        </div>
      </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <Navigation />
      
      <div className="container py-16">
        <div className="max-w-2xl mx-auto">
          <Card className="text-center">
            <CardHeader className="pb-6">
              <div className="flex justify-center mb-6">
                <div className="h-20 w-20 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="h-12 w-12 text-green-600" />
                </div>
              </div>
              <CardTitle className="text-3xl text-green-600 mb-2">
                Paiement réussi !
              </CardTitle>
              <p className="text-muted-foreground text-lg">
                Votre achat a été traité avec succès
              </p>
            </CardHeader>
            
            <CardContent className="space-y-6">
              <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                {purchaseType === 'credits' || creditsAdded ? (
                  <>
                    <h3 className="font-semibold text-green-800 mb-2">
                      Vos crédits ont été ajoutés !
                    </h3>
                    <p className="text-green-700 text-sm mb-3">
                      Vous pouvez maintenant générer des images avec l'IA.
                      {creditsAdded && ` ${creditsAdded} crédits ont été ajoutés à votre compte.`}
                    </p>
                  </>
                ) : (
                  <>
                    <h3 className="font-semibold text-green-800 mb-2">
                      Votre contenu est maintenant disponible
                    </h3>
                    <p className="text-green-700 text-sm mb-3">
                      Vous pouvez télécharger votre contenu depuis votre tableau de bord acheteur.
                      Un email de confirmation a été envoyé à votre adresse.
                    </p>
                  </>
                )}
                
                {purchases.length > 0 && (
                  <div className="mt-4 text-left">
                    <h4 className="font-medium text-green-800 mb-2 text-sm">Vos achats :</h4>
                    <ul className="space-y-1">
                      {purchases.map((item) => (
                        <li key={item.id} className="flex items-center gap-2 text-green-700 text-sm">
                          <CheckCircle className="h-3 w-3" />
                          <span>{item.title}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {sessionId && (
                  <p className="text-xs text-green-600 mt-3 pt-3 border-t border-green-200">
                    ID de transaction : {sessionId.slice(-8)}
                  </p>
                )}
              </div>

              <div className="space-y-4">
                {purchaseType === 'credits' || creditsAdded ? (
                  <>
                    <Button size="lg" className="w-full" asChild>
                      <Link to="/ai-image-generator">
                        <ArrowRight className="h-4 w-4 mr-2" />
                        Générer des images IA
                      </Link>
                    </Button>
                    
                    <div className="flex gap-3">
                      <Button variant="outline" className="flex-1" asChild>
                        <Link to="/buy-credits">
                          <ArrowRight className="h-4 w-4 mr-2" />
                          Acheter plus de crédits
                        </Link>
                      </Button>
                      
                      <Button variant="outline" className="flex-1" asChild>
                        <Link to="/">
                          <Home className="h-4 w-4 mr-2" />
                          Retour à l'accueil
                        </Link>
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <Button size="lg" className="w-full" asChild>
                      <Link to="/buyer-dashboard">
                        <Download className="h-4 w-4 mr-2" />
                        Accéder à mes téléchargements
                      </Link>
                    </Button>
                    
                    <div className="flex gap-3">
                      <Button variant="outline" className="flex-1" asChild>
                        <Link to="/marketplace">
                          <ArrowRight className="h-4 w-4 mr-2" />
                          Continuer mes achats
                        </Link>
                      </Button>
                      
                      <Button variant="outline" className="flex-1" asChild>
                        <Link to="/">
                          <Home className="h-4 w-4 mr-2" />
                          Retour à l'accueil
                        </Link>
                      </Button>
                    </div>
                  </>
                )}
              </div>

              <div className="text-xs text-muted-foreground border-t pt-4">
                <p>
                  Une question sur votre commande ? 
                  <Link to="/support" className="text-primary hover:underline ml-1">
                    Contactez notre support
                  </Link>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccess;