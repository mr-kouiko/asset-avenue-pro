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
      const { data, error } = await supabase
        .from('platform_settings')
        .select('*')
        .single();

      if (error) throw error;
      setSettings(data);
    } catch (error) {
      console.error('Error fetching platform settings:', error);
      toast.error('Erreur lors du chargement des paramètres');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;

    try {
      setSaving(true);
      const { error } = await supabase
        .from('platform_settings')
        .update({
          stripe_publishable_key: settings.stripe_publishable_key,
          stripe_secret_key: settings.stripe_secret_key,
          stripe_webhook_secret: settings.stripe_webhook_secret,
          commission_rate: settings.commission_rate,
          stripe_application_fee_rate: settings.stripe_application_fee_rate
        })
        .eq('id', settings.id);

      if (error) throw error;
      toast.success('Paramètres Stripe mis à jour avec succès');
    } catch (error) {
      console.error('Error updating settings:', error);
      toast.error('Erreur lors de la mise à jour');
    } finally {
      setSaving(false);
    }
  };

  const maskKey = (key: string | null, showLength = 8) => {
    if (!key) return '';
    if (key.length <= showLength) return key;
    return key.substring(0, showLength) + '•'.repeat(key.length - showLength);
  };

  if (loading) {
    return <div>Chargement des paramètres...</div>;
  }

  if (!settings) {
    return <div>Aucun paramètre trouvé</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Paramètres Stripe</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSave} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="publishable_key">Clé Publishable Stripe</Label>
              <Input
                id="publishable_key"
                placeholder="pk_live_..."
                value={settings.stripe_publishable_key || ''}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    stripe_publishable_key: e.target.value
                  })
                }
              />
              <p className="text-sm text-muted-foreground">
                Clé publique Stripe (commence par pk_)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="secret_key">Clé Secrète Stripe</Label>
              <div className="relative">
                <Input
                  id="secret_key"
                  type={showSecretKey ? 'text' : 'password'}
                  placeholder="sk_live_..."
                  value={showSecretKey ? settings.stripe_secret_key || '' : maskKey(settings.stripe_secret_key)}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      stripe_secret_key: e.target.value
                    })
                  }
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowSecretKey(!showSecretKey)}
                >
                  {showSecretKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Clé secrète Stripe (commence par sk_)
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="webhook_secret">Secret du Webhook Stripe (Optionnel)</Label>
            <div className="relative">
              <Input
                id="webhook_secret"
                type={showWebhookSecret ? 'text' : 'password'}
                placeholder="whsec_..."
                value={showWebhookSecret ? settings.stripe_webhook_secret || '' : maskKey(settings.stripe_webhook_secret)}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    stripe_webhook_secret: e.target.value
                  })
                }
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3"
                onClick={() => setShowWebhookSecret(!showWebhookSecret)}
              >
                {showWebhookSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Secret pour vérifier les webhooks Stripe
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="commission_rate">Taux de Commission (%)</Label>
              <Input
                id="commission_rate"
                type="number"
                step="0.01"
                min="0"
                max="1"
                value={settings.commission_rate}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    commission_rate: parseFloat(e.target.value)
                  })
                }
              />
              <p className="text-sm text-muted-foreground">
                Ex: 0.15 pour 15% de commission
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="stripe_fee_rate">Frais Stripe (%)</Label>
              <Input
                id="stripe_fee_rate"
                type="number"
                step="0.001"
                min="0"
                max="1"
                value={settings.stripe_application_fee_rate}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    stripe_application_fee_rate: parseFloat(e.target.value)
                  })
                }
              />
              <p className="text-sm text-muted-foreground">
                Ex: 0.029 pour 2.9% de frais Stripe
              </p>
            </div>
          </div>

          <Button type="submit" disabled={saving}>
            {saving ? 'Enregistrement...' : 'Enregistrer les paramètres'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};