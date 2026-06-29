import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Receipt, Download, RefreshCw, FileText } from "lucide-react";
import { downloadInvoice, type InvoiceData } from "@/utils/invoiceGenerator";

type Order = {
  id: string;
  paypal_order_id: string;
  order_type: string;
  amount: number;
  currency: string;
  status: string;
  pack_type: string | null;
  credits_amount: number | null;
  cart_items: any;
  created_at: string;
  processed_at: string | null;
};

const fmt = (n: number, currency = "USD") =>
  new Intl.NumberFormat("en-US", { style: "currency", currency }).format(Number(n || 0));

const statusBadge: Record<string, string> = {
  completed: "bg-green-500/15 text-green-700 dark:text-green-400",
  processing: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400",
  pending: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400",
  refunded: "bg-red-500/15 text-red-700 dark:text-red-400",
};

const orderTypeLabel: Record<string, string> = {
  marketplace: "Marketplace",
  infinity: "Infinity Subscription",
  credits: "Credit Pack",
  videoai_credits: "Video AI Credits",
};

export const BuyerInvoices = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("paypal_orders")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(100);
    setOrders((data ?? []) as Order[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const handleDownload = async (order: Order) => {
    // Resolve item titles for marketplace orders
    let items: { title: string; price: number }[] = [];
    if (order.order_type === "marketplace" && Array.isArray(order.cart_items)) {
      const ids = order.cart_items.map((i: any) => i.submission_id).filter(Boolean);
      if (ids.length > 0) {
        const { data: subs } = await supabase
          .from("content_submissions")
          .select("id, title")
          .in("id", ids);
        const titleMap = new Map((subs ?? []).map((s) => [s.id, s.title]));
        items = order.cart_items.map((i: any) => ({
          title: titleMap.get(i.submission_id) || "Marketplace item",
          price: Number(i.price ?? 0),
        }));
      }
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name, email")
      .eq("user_id", user!.id)
      .maybeSingle();

    const invoiceData: InvoiceData = {
      orderId: order.id,
      paypalOrderId: order.paypal_order_id,
      date: order.processed_at || order.created_at,
      buyerName: profile?.display_name || user?.email || "Customer",
      buyerEmail: profile?.email || user?.email || "",
      items,
      subtotal: Number(order.amount),
      total: Number(order.amount),
      currency: order.currency || "USD",
      orderType: order.order_type,
      packType: order.pack_type,
      creditsAmount: order.credits_amount,
    };

    downloadInvoice(invoiceData);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-primary" />
            Invoices & receipts
          </CardTitle>
          <CardDescription>
            Download PDF receipts for your purchases. Click "Download invoice" then save as PDF from the print dialog.
          </CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={load} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </CardHeader>
      <CardContent>
        {orders.length === 0 ? (
          <div className="text-center py-12 border border-dashed rounded-md">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">No purchases yet.</p>
          </div>
        ) : (
          <div className="border rounded-md divide-y">
            {orders.map((o) => (
              <div key={o.id} className="flex items-center justify-between gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold">{fmt(Number(o.amount), o.currency)}</span>
                    <Badge className={statusBadge[o.status] ?? ""} variant="secondary">
                      {o.status}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {orderTypeLabel[o.order_type] ?? o.order_type}
                    {o.credits_amount ? ` · ${o.credits_amount} credits` : ""}
                    {Array.isArray(o.cart_items) && o.cart_items.length > 0
                      ? ` · ${o.cart_items.length} item${o.cart_items.length > 1 ? "s" : ""}`
                      : ""}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {new Date(o.created_at).toLocaleString("en-US")} · #{o.id.slice(0, 8).toUpperCase()}
                  </div>
                </div>
                {o.status === "completed" && (
                  <Button size="sm" variant="outline" onClick={() => handleDownload(o)} className="gap-2 shrink-0">
                    <Download className="h-4 w-4" />
                    Invoice
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
