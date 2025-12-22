import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Store, Save, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export const StoreSettingsCard = () => {
  const { user } = useAuth();
  const [storeName, setStoreName] = useState("");
  const [originalStoreName, setOriginalStoreName] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      fetchStoreName();
    }
  }, [user]);

  const fetchStoreName = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("store_name")
        .eq("user_id", user.id)
        .single();

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
      toast.info("No changes to save");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ store_name: storeName.trim() })
        .eq("user_id", user.id);

      if (error) throw error;

      setOriginalStoreName(storeName.trim());
      toast.success("Store name updated successfully");
    } catch (error) {
      console.error("Error updating store name:", error);
      toast.error("Failed to update store name");
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
          <CardTitle>Store Settings</CardTitle>
        </div>
        <CardDescription>
          Customize your store name that appears on your products
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <Label htmlFor="store-name">Store Name</Label>
              <Input
                id="store-name"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                placeholder="Enter your store name"
                maxLength={100}
              />
              <p className="text-xs text-muted-foreground">
                This name will be displayed on your products in the marketplace
              </p>
            </div>

            <Button 
              onClick={handleSave} 
              disabled={saving || !hasChanges}
              className="w-full sm:w-auto"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
};
