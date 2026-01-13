import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { 
  Settings, 
  Save,
  RefreshCw,
  Percent,
  Cpu,
  Zap,
  AlertTriangle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface PlatformSettings {
  id: string;
  commission_rate: number;
  stripe_application_fee_rate: number;
  ai_auto_generate_enabled: boolean;
  ai_provider: string;
  ai_model: string;
}

export const AdminSettings = () => {
  const queryClient = useQueryClient();
  const [commissionRate, setCommissionRate] = useState<string>('15');
  const [stripeFeeRate, setStripeFeeRate] = useState<string>('2.9');
  const [aiEnabled, setAiEnabled] = useState(true);

  const { data: settings, isLoading, refetch } = useQuery({
    queryKey: ['admin-platform-settings'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_get_platform_settings');
      if (error) throw error;
      
      const settingsData = data?.[0] as PlatformSettings;
      if (settingsData) {
        setCommissionRate((settingsData.commission_rate * 100).toString());
        setStripeFeeRate((settingsData.stripe_application_fee_rate * 100).toString());
        setAiEnabled(settingsData.ai_auto_generate_enabled);
      }
      return settingsData;
    }
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (newSettings: Partial<{ commission_rate: number; stripe_application_fee_rate: number }>) => {
      const { data, error } = await supabase.rpc('admin_update_platform_settings', {
        new_commission_rate: newSettings.commission_rate,
        new_stripe_application_fee_rate: newSettings.stripe_application_fee_rate
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Settings updated successfully');
      queryClient.invalidateQueries({ queryKey: ['admin-platform-settings'] });
    },
    onError: (error) => {
      toast.error('Error updating settings');
      console.error(error);
    }
  });

  const handleSaveSettings = () => {
    const commission = parseFloat(commissionRate) / 100;
    const stripeFee = parseFloat(stripeFeeRate) / 100;

    if (isNaN(commission) || commission < 0 || commission > 1) {
      toast.error('Taux de commission invalide (0-100%)');
      return;
    }
    if (isNaN(stripeFee) || stripeFee < 0 || stripeFee > 1) {
      toast.error('Taux Stripe invalide (0-100%)');
      return;
    }

    updateSettingsMutation.mutate({
      commission_rate: commission,
      stripe_application_fee_rate: stripeFee
    });
  };

  const regenerateThumbnails = async () => {
    try {
      toast.loading('Génération des miniatures en cours...');
      const { data, error } = await supabase.functions.invoke('backfill-video-thumbnails', {
        body: {}
      });
      
      if (error) throw error;
      
      toast.success(data.message || `${data.successful} miniature(s) générée(s) avec succès`);
      
      if (data.failed > 0) {
        toast.warning(`${data.failed} échec(s) de génération`);
      }
    } catch (error) {
      console.error('Error regenerating thumbnails:', error);
      toast.error('Erreur lors de la génération des miniatures');
    }
  };

  return (
    <div className="space-y-6">
      {/* Commission Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Percent className="h-5 w-5" />
            Paramètres de commission
          </CardTitle>
          <CardDescription>
            Configurez les taux de commission de la plateforme
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="commission">Taux de commission (%)</Label>
              <Input
                id="commission"
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={commissionRate}
                onChange={(e) => setCommissionRate(e.target.value)}
                placeholder="15"
              />
              <p className="text-xs text-muted-foreground">
                Pourcentage prélevé sur chaque vente
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="stripeFee">Frais Stripe (%)</Label>
              <Input
                id="stripeFee"
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={stripeFeeRate}
                onChange={(e) => setStripeFeeRate(e.target.value)}
                placeholder="2.9"
              />
              <p className="text-xs text-muted-foreground">
                Frais de traitement Stripe
              </p>
            </div>
          </div>
          
          <Button 
            onClick={handleSaveSettings}
            disabled={updateSettingsMutation.isPending}
            className="gap-2"
          >
            {updateSettingsMutation.isPending ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Enregistrer les paramètres
          </Button>
        </CardContent>
      </Card>

      {/* AI Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cpu className="h-5 w-5" />
            Paramètres IA
          </CardTitle>
          <CardDescription>
            Configuration de la génération automatique
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Génération IA automatique</Label>
              <p className="text-sm text-muted-foreground">
                Active la génération automatique de descriptions et tags
              </p>
            </div>
            <Switch
              checked={aiEnabled}
              onCheckedChange={setAiEnabled}
            />
          </div>
          
          {settings && (
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm">
                <strong>Fournisseur:</strong> {settings.ai_provider}
              </p>
              <p className="text-sm">
                <strong>Modèle:</strong> {settings.ai_model}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Maintenance Tools */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Outils de maintenance
          </CardTitle>
          <CardDescription>
            Tâches de maintenance et réparation système
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start justify-between p-4 border rounded-lg">
            <div className="flex-1">
              <h4 className="font-medium mb-1 flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Régénérer les miniatures vidéo
              </h4>
              <p className="text-sm text-muted-foreground">
                Génère des miniatures pour toutes les vidéos sans miniature valide.
              </p>
            </div>
            <Button variant="outline" onClick={regenerateThumbnails}>
              Exécuter
            </Button>
          </div>
          
          <div className="flex items-start justify-between p-4 border rounded-lg bg-muted/50">
            <div className="flex-1">
              <h4 className="font-medium mb-1 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                Vérification de sécurité
              </h4>
              <p className="text-sm text-muted-foreground">
                Analyse les patterns d'accès suspects et les anomalies.
              </p>
            </div>
            <Button 
              variant="outline" 
              onClick={async () => {
                try {
                  await supabase.rpc('check_admin_access_patterns');
                  toast.success('Vérification de sécurité terminée');
                } catch (error) {
                  toast.error('Erreur lors de la vérification');
                }
              }}
            >
              Analyser
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
