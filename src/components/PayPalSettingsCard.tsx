import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CreditCard, Save, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export const PayPalSettingsCard = () => {
  const { user } = useAuth();
  const [paypalEmail, setPaypalEmail] = useState("");
  const [originalPaypalEmail, setOriginalPaypalEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      fetchPaypalEmail();
    }
  }, [user]);

  const fetchPaypalEmail = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("paypal_email")
        .eq("user_id", user.id)
        .single();

      if (error) throw error;
      
      const email = data?.paypal_email || "";
      setPaypalEmail(email);
      setOriginalPaypalEmail(email);
    } catch (error) {
      console.error("Error fetching PayPal email:", error);
    } finally {
      setLoading(false);
    }
  };

  const validateEmail = (email: string): boolean => {
    if (!email) return true; // Empty is valid (optional field)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSave = async () => {
    if (!user) return;
    
    const trimmedEmail = paypalEmail.trim();
    
    if (trimmedEmail === originalPaypalEmail) {
      toast.info("No changes to save");
      return;
    }

    if (!validateEmail(trimmedEmail)) {
      toast.error("Please enter a valid email address");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ paypal_email: trimmedEmail || null })
        .eq("user_id", user.id);

      if (error) throw error;

      setOriginalPaypalEmail(trimmedEmail);
      toast.success("PayPal email updated successfully");
    } catch (error) {
      console.error("Error updating PayPal email:", error);
      toast.error("Failed to update PayPal email");
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = paypalEmail.trim() !== originalPaypalEmail;
  const isValidEmail = validateEmail(paypalEmail.trim());

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-primary" />
          <CardTitle>PayPal Account</CardTitle>
        </div>
        <CardDescription>
          Enter your PayPal email address to receive payouts from your sales
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
              <Label htmlFor="paypal-email">PayPal Email</Label>
              <div className="relative">
                <Input
                  id="paypal-email"
                  type="email"
                  value={paypalEmail}
                  onChange={(e) => setPaypalEmail(e.target.value)}
                  placeholder="your-email@paypal.com"
                  className={!isValidEmail ? "border-destructive pr-10" : "pr-10"}
                />
                {paypalEmail && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {isValidEmail ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-destructive" />
                    )}
                  </div>
                )}
              </div>
              {!isValidEmail && (
                <p className="text-xs text-destructive">
                  Please enter a valid email address
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                This email will be used to send your earnings from product sales. 
                Make sure it matches your PayPal account.
              </p>
            </div>

            {originalPaypalEmail && (
              <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm text-green-700 dark:text-green-400">
                  PayPal account configured for payouts
                </span>
              </div>
            )}

            <Button 
              onClick={handleSave} 
              disabled={saving || !hasChanges || !isValidEmail}
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
                  Save PayPal Account
                </>
              )}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
};
