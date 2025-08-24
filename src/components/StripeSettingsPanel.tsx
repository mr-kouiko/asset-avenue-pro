import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Eye, EyeOff } from 'lucide-react';

interface PlatformSettings {
  id: string;
  commission_rate: number;
  stripe_application_fee_rate: number;
  stripe_publishable_key: string | null;
  stripe_secret_key: string | null;
  stripe_webhook_secret: string | null;
}

export const StripeSettingsPanel = () => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSecretKey, setShowSecretKey] = useState(false);
  const [showWebhookSecret, setShowWebhookSecret] = useState(false);

  useEffect(() => {
    if (user) {
      fetchSettings();
    }
  }, [user]);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      
      // SÉCURISÉ: Désactivé - Les paramètres Stripe sont maintenant gérés via les secrets Edge Functions
      toast.error('Interface temporairement désactivée - Paramètres gérés via les secrets sécurisés');
      setSettings(null);
    } catch (error) {
      console.error('Error fetching platform settings:', error);
      toast.error('Erreur lors du chargement des paramètres');
      setSettings(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    toast.error('Interface désactivée - Configurez les paramètres via les secrets Edge Functions dans la console Supabase');
  };

  const maskKey = (key: string | null, showLength = 8) => {
    if (!key) return '';
    if (key.length <= showLength) return key;
    return key.substring(0, showLength) + '•'.repeat(key.length - showLength);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Paramètres Stripe - Interface Sécurisée</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-6 border-2 border-warning rounded-lg bg-warning/10">
          <h3 className="font-semibold text-warning-foreground mb-2">
            🔒 Interface temporairement désactivée
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            Pour des raisons de sécurité, les paramètres Stripe sont maintenant gérés via les secrets sécurisés des Edge Functions.
          </p>
          <div className="bg-muted p-4 rounded text-sm">
            <p className="font-medium mb-2">Pour configurer Stripe :</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Allez dans la console Supabase</li>
              <li>Section "Edge Functions" → "Settings"</li>
              <li>Ajoutez les secrets : STRIPE_SECRET_KEY, COMMISSION_RATE</li>
              <li>Les paramètres seront automatiquement utilisés</li>
            </ol>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};