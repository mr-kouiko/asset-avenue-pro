import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Wallet, Loader2, ExternalLink } from "lucide-react";

type PayoutRow = {
  id: string;
  seller_id: string;
  amount: number;
  paypal_email: string;
  status: string;
  earnings_count: number;
  created_at: string;
  paid_at: string | null;
  rejection_reason: string | null;
  paypal_payout_batch_id: string | null;
  admin_notes: string | null;
  seller_email?: string;
  seller_name?: string;
};

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(n || 0));

const statusBadge: Record<string, string> = {
  pending: "bg-yellow-500/15 text-yellow-700",
  approved: "bg-blue-500/15 text-blue-700",
  paid: "bg-green-500/15 text-green-700",
  rejected: "bg-red-500/15 text-red-700",
};

export const AdminPayoutsPanel = () => {
  const [rows, setRows] = useState<PayoutRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("pending");
  const [actionRow, setActionRow] = useState<PayoutRow | null>(null);
  const [action, setAction] = useState<"pay" | "reject" | null>(null);
  const [batchId, setBatchId] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data: payoutsData } = await supabase
      .from("payout_requests")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);

    const list = (payoutsData ?? []) as PayoutRow[];

    // Enrich with seller info
    const sellerIds = [...new Set(list.map((r) => r.seller_id))];
    if (sellerIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, email")
        .in("user_id", sellerIds);
      const map = new Map((profiles ?? []).map((p) => [p.user_id, p]));
      list.forEach((r) => {
        const p = map.get(r.seller_id);
        r.seller_name = p?.display_name || "Unknown";
        r.seller_email = p?.email || "";
      });
    }

    setRows(list);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const totalPending = rows
    .filter((r) => r.status === "pending")
    .reduce((s, r) => s + Number(r.amount), 0);
  const totalPaid = rows.filter((r) => r.status === "paid").reduce((s, r) => s + Number(r.amount), 0);

  const filtered = rows.filter((r) => (tab === "all" ? true : r.status === tab));

  const submitAction = async () => {
    if (!actionRow || !action) return;
    setSubmitting(true);

    if (action === "pay") {
      const { error } = await supabase.rpc("admin_mark_payout_paid", {
        p_request_id: actionRow.id,
        p_paypal_batch_id: batchId || null,
        p_admin_notes: notes || null,
      });
      if (error) {
        toast.error(error.message);
        setSubmitting(false);
        return;
      }
      toast.success("Payout marked as paid");
    } else {
      if (!notes || notes.length < 5) {
        toast.error("Please provide a rejection reason");
        setSubmitting(false);
        return;
      }
      const { error } = await supabase.rpc("admin_reject_payout", {
        p_request_id: actionRow.id,
        p_reason: notes,
      });
      if (error) {
        toast.error(error.message);
        setSubmitting(false);
        return;
      }
      toast.success("Payout rejected; earnings released back to seller");
    }

    setSubmitting(false);
    setActionRow(null);
    setAction(null);
    setBatchId("");
    setNotes("");
    load();
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" />
            Seller payouts
          </CardTitle>
          <CardDescription>
            Process withdrawal requests from sellers. Pay them via PayPal, then mark as paid here.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border p-4">
              <div className="text-xs text-muted-foreground">Pending payout requests</div>
              <div className="text-2xl font-bold">{fmt(totalPending)}</div>
            </div>
            <div className="rounded-lg border p-4">
              <div className="text-xs text-muted-foreground">Lifetime paid out</div>
              <div className="text-2xl font-bold">{fmt(totalPaid)}</div>
            </div>
          </div>

          <Tabs value={tab} onValueChange={setTab}>
            <TabsList>
              <TabsTrigger value="pending">Pending ({rows.filter((r) => r.status === "pending").length})</TabsTrigger>
              <TabsTrigger value="paid">Paid</TabsTrigger>
              <TabsTrigger value="rejected">Rejected</TabsTrigger>
              <TabsTrigger value="all">All</TabsTrigger>
            </TabsList>

            <TabsContent value={tab} className="mt-4">
              {filtered.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center border border-dashed rounded-md">
                  No {tab === "all" ? "" : tab} payout requests.
                </p>
              ) : (
                <div className="border rounded-md divide-y">
                  {filtered.map((r) => (
                    <div key={r.id} className="p-4 space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-semibold">{fmt(r.amount)} · {r.earnings_count} sales</div>
                          <div className="text-sm text-muted-foreground">
                            <span className="font-medium text-foreground">{r.seller_name}</span> ({r.seller_email})
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            PayPal: <a
                              href={`https://www.paypal.com/myaccount/transfer/homepage/pay?email=${encodeURIComponent(r.paypal_email)}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-primary hover:underline inline-flex items-center gap-1"
                            >
                              {r.paypal_email}
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Requested {new Date(r.created_at).toLocaleString("en-US")}
                            {r.paid_at && ` · Paid ${new Date(r.paid_at).toLocaleString("en-US")}`}
                          </div>
                          {r.rejection_reason && (
                            <div className="text-xs text-red-600 mt-1">Rejected: {r.rejection_reason}</div>
                          )}
                          {r.paypal_payout_batch_id && (
                            <div className="text-xs text-muted-foreground">PayPal batch: {r.paypal_payout_batch_id}</div>
                          )}
                        </div>
                        <Badge className={statusBadge[r.status] ?? ""} variant="secondary">
                          {r.status}
                        </Badge>
                      </div>

                      {r.status === "pending" && (
                        <div className="flex gap-2 pt-2">
                          <Button
                            size="sm"
                            onClick={() => {
                              setActionRow(r);
                              setAction("pay");
                            }}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-1" />
                            Mark as paid
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setActionRow(r);
                              setAction("reject");
                            }}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Reject
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Dialog open={!!actionRow} onOpenChange={(o) => !o && setActionRow(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{action === "pay" ? "Mark payout as paid" : "Reject payout request"}</DialogTitle>
            <DialogDescription>
              {action === "pay"
                ? `Confirm you've sent ${actionRow ? fmt(actionRow.amount) : ""} via PayPal to ${actionRow?.paypal_email}.`
                : "The earnings will be released back to the seller's available balance."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            {action === "pay" && (
              <div className="space-y-2">
                <label className="text-sm font-medium">PayPal batch ID (optional)</label>
                <Input
                  placeholder="e.g. 4D5K7..."
                  value={batchId}
                  onChange={(e) => setBatchId(e.target.value)}
                />
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                {action === "reject" ? "Rejection reason (visible to seller)" : "Internal notes (optional)"}
              </label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={action === "reject" ? "Explain why this payout was rejected" : "Any internal notes"}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setActionRow(null)} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={submitAction} disabled={submitting} variant={action === "reject" ? "destructive" : "default"}>
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {action === "pay" ? "Confirm paid" : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
