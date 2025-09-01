import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AISettings {
  ai_auto_generate_enabled: boolean;
  ai_provider: string;
  ai_model: string;
}

export const useAISettings = () => {
  const [settings, setSettings] = useState<AISettings | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('platform_settings')
        .select('ai_auto_generate_enabled, ai_provider, ai_model')
        .single();

      if (error) throw error;
      setSettings(data);
    } catch (error) {
      console.error('Error fetching AI settings:', error);
      // Default fallback settings
      setSettings({
        ai_auto_generate_enabled: true,
        ai_provider: 'deepseek',
        ai_model: 'deepseek-chat'
      });
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async (newSettings: Partial<AISettings>) => {
    setLoading(true);
    try {
      // Get the first settings record (there should only be one)
      const { data: currentSettings, error: fetchError } = await supabase
        .from('platform_settings')
        .select('id')
        .single();

      if (fetchError) throw fetchError;

      const { error } = await supabase
        .from('platform_settings')
        .update(newSettings)
        .eq('id', currentSettings.id);

      if (error) throw error;
      
      setSettings(prev => prev ? { ...prev, ...newSettings } : null);
      toast.success('Paramètres IA mis à jour avec succès');
    } catch (error) {
      console.error('Error updating AI settings:', error);
      toast.error('Erreur lors de la mise à jour des paramètres IA');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  return {
    settings,
    loading,
    updateSettings,
    refreshSettings: fetchSettings
  };
};