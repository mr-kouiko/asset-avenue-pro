import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { TestTube, CreditCard } from 'lucide-react';

export const StripeTestModeAlert = () => {
  return (
    <Alert className="border-orange-200 bg-orange-50">
      <TestTube className="h-4 w-4" />
      <AlertDescription className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="outline" className="text-orange-700 border-orange-300">
              MODE TEST
            </Badge>
            <span className="font-medium text-orange-800">
              Stripe est en mode test
            </span>
          </div>
          <p className="text-sm text-orange-700">
            Utilisez les numéros de carte de test Stripe pour tester les paiements. 
            Aucun vrai paiement ne sera traité.
          </p>
        </div>
        <CreditCard className="h-5 w-5 text-orange-600 ml-4" />
      </AlertDescription>
    </Alert>
  );
};

export const StripeTestCards = () => {
  const testCards = [
    { number: '4242 4242 4242 4242', type: 'Visa', description: 'Paiement réussi' },
    { number: '4000 0000 0000 0002', type: 'Visa', description: 'Carte déclinée' },
    { number: '4000 0000 0000 9995', type: 'Visa', description: 'Fonds insuffisants' },
    { number: '4000 0027 6000 3184', type: 'Visa', description: '3D Secure requis' }
  ];

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium text-muted-foreground">
        Cartes de test Stripe :
      </h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
        {testCards.map((card, index) => (
          <div key={index} className="flex justify-between items-center p-2 bg-muted/50 rounded">
            <div>
              <code className="font-mono">{card.number}</code>
              <div className="text-muted-foreground">{card.description}</div>
            </div>
            <Badge variant="outline" className="text-xs">
              {card.type}
            </Badge>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        CVV : n'importe quel nombre à 3 chiffres | Date d'exp : toute date future
      </p>
    </div>
  );
};