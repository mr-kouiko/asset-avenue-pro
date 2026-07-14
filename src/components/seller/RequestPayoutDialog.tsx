import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const MIN_PAYOUT = 50;

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  availableAmount: number;
  onSuccess: () => void;
}

export const RequestPayoutDialog = ({ open, onOpenChange, availableAmount, onSuccess }: Props) => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [paypalEmail, setPaypalEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open || !user) return;
    supabase
      .from("profiles")
      .select("paypal_email")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.paypal_email) setPaypalEmail(data.paypal_email);
      });
  }, [open, user]);

  const submit = async () => {
    if (!paypalEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(paypalEmail)) {
      toast.error(t('sd.payout.invalidEmail'));
      return;
    }
    if (availableAmount < MIN_PAYOUT) {
      toast.error(t('sd.payout.minError').replace('{min}', String(MIN_PAYOUT)));
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.rpc("request_seller_payout", {
      p_paypal_email: paypalEmail,
      p_min_amount: MIN_PAYOUT,
    });
    setSubmitting(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    if (user) {
      await supabase.from("profiles").update({ paypal_email: paypalEmail }).eq("user_id", user.id);
    }

    toast.success(t('sd.payout.submitted'));
    onOpenChange(false);
    onSuccess();
  };

  const amountStr = `$${availableAmount.toFixed(2)}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('sd.payout.title')}</DialogTitle>
          <DialogDescription>
            {t('sd.payout.desc').replace('{min}', String(MIN_PAYOUT))}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="rounded-lg bg-muted p-4">
            <div className="text-sm text-muted-foreground">{t('sd.payout.available')}</div>
            <div className="text-2xl font-bold">{amountStr}</div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="paypal-email">{t('sd.payout.email')}</Label>
            <Input
              id="paypal-email"
              type="email"
              placeholder={t('sd.payout.emailPlaceholder')}
              value={paypalEmail}
              onChange={(e) => setPaypalEmail(e.target.value)}
              disabled={submitting}
            />
            <p className="text-xs text-muted-foreground">{t('sd.payout.emailHelp')}</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            {t('sd.payout.cancel')}
          </Button>
          <Button onClick={submit} disabled={submitting || availableAmount < MIN_PAYOUT}>
            {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {t('sd.payout.request').replace('{amount}', amountStr)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
