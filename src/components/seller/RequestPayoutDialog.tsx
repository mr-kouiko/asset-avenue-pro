import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
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
      toast.error("Please enter a valid PayPal email");
      return;
    }
    if (availableAmount < MIN_PAYOUT) {
      toast.error(`Minimum payout is $${MIN_PAYOUT}`);
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

    // Save PayPal email for next time
    if (user) {
      await supabase.from("profiles").update({ paypal_email: paypalEmail }).eq("user_id", user.id);
    }

    toast.success("Payout request submitted! We'll process it within 3-5 business days.");
    onOpenChange(false);
    onSuccess();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request payout</DialogTitle>
          <DialogDescription>
            Withdraw your available earnings to your PayPal account. Minimum payout: ${MIN_PAYOUT}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="rounded-lg bg-muted p-4">
            <div className="text-sm text-muted-foreground">Available to withdraw</div>
            <div className="text-2xl font-bold">${availableAmount.toFixed(2)}</div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="paypal-email">PayPal email</Label>
            <Input
              id="paypal-email"
              type="email"
              placeholder="you@example.com"
              value={paypalEmail}
              onChange={(e) => setPaypalEmail(e.target.value)}
              disabled={submitting}
            />
            <p className="text-xs text-muted-foreground">
              Make sure this email is associated with an active PayPal account.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={submitting || availableAmount < MIN_PAYOUT}>
            {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Request ${availableAmount.toFixed(2)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
