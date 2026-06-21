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
  ai_auto_generate_enabled: boolean;
  ai_provider: string;
  ai_model: string;
}

export const AdminSettings = () => {
  const queryClient = useQueryClient();
  const [commissionRate, setCommissionRate] = useState<string>('40');
  const [aiEnabled, setAiEnabled] = useState(true);

  const { data: settings, isLoading } = useQuery({
    queryKey: ['admin-platform-settings'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_get_platform_settings');
      if (error) throw error;

      const settingsData = (data?.[0] as unknown) as PlatformSettings;
      if (settingsData) {
        setCommissionRate((settingsData.commission_rate * 100).toString());
        setAiEnabled(settingsData.ai_auto_generate_enabled);
      }
      return settingsData;
    }
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (newSettings: { commission_rate: number }) => {
      const { data, error } = await supabase.rpc('admin_update_platform_settings', {
        new_commission_rate: newSettings.commission_rate,
      } as any);
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

    if (isNaN(commission) || commission < 0 || commission > 1) {
      toast.error('Invalid commission rate (0-100%)');
      return;
    }

    updateSettingsMutation.mutate({ commission_rate: commission });
  };

  const regenerateThumbnails = async () => {
    toast.info('Server-side video thumbnail regeneration has been removed. Thumbnails are generated in the browser at upload time.');
  };

  return (
    <div className="space-y-6">
      {/* Commission Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Percent className="h-5 w-5" />
            Commission settings
          </CardTitle>
          <CardDescription>
            Configure the platform commission rate (PayPal handles payment processing fees)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="commission">Commission rate (%)</Label>
              <Input
                id="commission"
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={commissionRate}
                onChange={(e) => setCommissionRate(e.target.value)}
                placeholder="40"
              />
              <p className="text-xs text-muted-foreground">
                Percentage taken from each sale (seller receives the rest)
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
            Save settings
          </Button>
        </CardContent>
      </Card>

      {/* AI Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cpu className="h-5 w-5" />
            AI settings
          </CardTitle>
          <CardDescription>
            Automatic generation configuration
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Automatic AI generation</Label>
              <p className="text-sm text-muted-foreground">
                Enables automatic generation of descriptions and tags
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
                <strong>Provider:</strong> {settings.ai_provider}
              </p>
              <p className="text-sm">
                <strong>Model:</strong> {settings.ai_model}
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
            Maintenance tools
          </CardTitle>
          <CardDescription>
            System maintenance and repair tasks
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start justify-between p-4 border rounded-lg">
            <div className="flex-1">
              <h4 className="font-medium mb-1 flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Regenerate Video Thumbnails
              </h4>
              <p className="text-sm text-muted-foreground">
                Generate thumbnails for all videos without valid thumbnails.
              </p>
            </div>
            <Button variant="outline" onClick={regenerateThumbnails}>
              Run
            </Button>
          </div>

          <div className="flex items-start justify-between p-4 border rounded-lg bg-muted/50">
            <div className="flex-1">
              <h4 className="font-medium mb-1 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                Security Check
              </h4>
              <p className="text-sm text-muted-foreground">
                Analyzes suspicious access patterns and anomalies.
              </p>
            </div>
            <Button
              variant="outline"
              onClick={async () => {
                try {
                  await supabase.rpc('check_admin_access_patterns');
                  toast.success('Security check completed');
                } catch (error) {
                  toast.error('Error during security check');
                }
              }}
            >
              Analyze
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
