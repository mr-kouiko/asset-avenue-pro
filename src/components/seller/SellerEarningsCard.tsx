import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { DollarSign, Clock, CheckCircle2, Wallet, TrendingUp, RefreshCw } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

type Summary = {
  pending_amount: number;
  available_amount: number;
  paid_amount: number;
  refunded_amount: number;
  lifetime_gross: number;
  total_orders: number;
  currency: string;
};

type EarningRow = {
  id: string;
  gross_amount: number;
  net_amount: number;
  commission_amount: number;
  status: string;
  created_at: string;
  submission_id: string | null;
};

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(n || 0));

const statusVariant: Record<string, string> = {
  pending: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400",
  available: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
  paid: "bg-green-500/15 text-green-700 dark:text-green-400",
  refunded: "bg-red-500/15 text-red-700 dark:text-red-400",
};

export const SellerEarningsCard = () => {
  const { user } = useAuth();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [recent, setRecent] = useState<EarningRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const [{ data: sum }, { data: rows }] = await Promise.all([
      supabase.rpc("get_seller_earnings_summary", { p_seller_id: user.id }),
      supabase
        .from("seller_earnings")
        .select("id, gross_amount, net_amount, commission_amount, status, created_at, submission_id")
        .eq("seller_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10),
    ]);
    if (sum && Array.isArray(sum) && sum[0]) setSummary(sum[0] as Summary);
    if (rows) setRecent(rows as EarningRow[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" />
            Earnings
          </CardTitle>
          <CardDescription>
            Your share of every sale (60% to you, 40% platform fee)
          </CardDescription>
        </div>
        <button
          onClick={load}
          className="text-muted-foreground hover:text-foreground transition"
          aria-label="Refresh earnings"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary tiles */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Tile
            icon={<Clock className="h-4 w-4" />}
            label="Pending"
            value={fmt(summary?.pending_amount ?? 0)}
            tone="yellow"
          />
          <Tile
            icon={<CheckCircle2 className="h-4 w-4" />}
            label="Available"
            value={fmt(summary?.available_amount ?? 0)}
            tone="blue"
          />
          <Tile
            icon={<DollarSign className="h-4 w-4" />}
            label="Paid out"
            value={fmt(summary?.paid_amount ?? 0)}
            tone="green"
          />
          <Tile
            icon={<TrendingUp className="h-4 w-4" />}
            label="Lifetime gross"
            value={fmt(summary?.lifetime_gross ?? 0)}
            tone="muted"
          />
        </div>

        {/* Recent earnings */}
        <div>
          <h4 className="text-sm font-semibold mb-3">Recent sales</h4>
          {recent.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center border border-dashed rounded-md">
              No sales yet. Once buyers purchase your content, your earnings will appear here.
            </p>
          ) : (
            <div className="border rounded-md divide-y">
              {recent.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between gap-3 p-3 text-sm"
                >
                  <div className="flex flex-col min-w-0">
                    <span className="font-medium">
                      {fmt(r.net_amount)}{" "}
                      <span className="text-xs text-muted-foreground font-normal">
                        net (gross {fmt(r.gross_amount)} − fee {fmt(r.commission_amount)})
                      </span>
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(r.created_at).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                  <Badge className={statusVariant[r.status] ?? ""} variant="secondary">
                    {r.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>

        {summary && summary.refunded_amount > 0 && (
          <p className="text-xs text-muted-foreground">
            Refunded to date: {fmt(summary.refunded_amount)}
          </p>
        )}
      </CardContent>
    </Card>
  );
};

const Tile = ({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: "yellow" | "blue" | "green" | "muted";
}) => {
  const tones: Record<string, string> = {
    yellow: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
    blue: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
    green: "bg-green-500/10 text-green-700 dark:text-green-400",
    muted: "bg-muted text-foreground",
  };
  return (
    <div className="rounded-lg border p-3">
      <div
        className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${tones[tone]}`}
      >
        {icon}
        {label}
      </div>
      <div className="mt-2 text-xl font-bold">{value}</div>
    </div>
  );
};
