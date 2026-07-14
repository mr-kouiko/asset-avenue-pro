import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Store, Save, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";

export const StoreSettingsCard = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [storeName, setStoreName] = useState("");
  const [originalStoreName, setOriginalStoreName] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) fetchStoreName();
  }, [user]);

  const fetchStoreName = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("profiles").select("store_name").eq("user_id", user.id).single();
      if (error) throw error;
      const name = data?.store_name || "";
      setStoreName(name);
      setOriginalStoreName(name);
    } catch (error) {
      console.error("Error fetching store name:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    if (storeName.trim() === originalStoreName) {
      toast.info(t('sd.store.noChanges'));
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles").update({ store_name: storeName.trim() }).eq("user_id", user.id);
      if (error) throw error;
      setOriginalStoreName(storeName.trim());
      toast.success(t('sd.store.saved'));
    } catch (error) {
      console.error("Error updating store name:", error);
      toast.error(t('sd.store.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = storeName.trim() !== originalStoreName;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Store className="h-5 w-5 text-primary" />
          <CardTitle>{t('sd.store.title')}</CardTitle>
        </div>
        <CardDescription>{t('sd.store.desc')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <Label htmlFor="store-name">{t('sd.store.name')}</Label>
              <Input
                id="store-name"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                placeholder={t('sd.store.placeholder')}
                maxLength={100}
              />
              <p className="text-xs text-muted-foreground">{t('sd.store.help')}</p>
            </div>
            <Button onClick={handleSave} disabled={saving || !hasChanges} className="w-full sm:w-auto">
              {saving ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{t('sd.store.saving')}</>
              ) : (
                <><Save className="h-4 w-4 mr-2" />{t('sd.store.save')}</>
              )}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
};
