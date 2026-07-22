import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShoppingBag, RefreshCw, PlayCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

export const AdminGoogleMerchant = () => {
  const qc = useQueryClient();
  const [running, setRunning] = useState<string | null>(null);

  const { data: logs } = useQuery({
    queryKey: ["gms-log"],
    queryFn: async () => {
      const { data } = await supabase
        .from("google_merchant_sync_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      return data ?? [];
    },
  });

  const { data: queueCount } = useQuery({
    queryKey: ["gms-queue"],
    queryFn: async () => {
      const { count } = await supabase
        .from("merchant_sync_queue")
        .select("id", { count: "exact", head: true })
        .is("processed_at", null);
      return count ?? 0;
    },
  });

  const sync = useMutation({
    mutationFn: async (mode: "full" | "queue" | "dryrun") => {
      setRunning(mode);
      const { data, error } = await supabase.functions.invoke("sync-google-merchant", { body: { mode } });
      if (error) throw error;
      return { mode, data };
    },
    onSuccess: ({ mode, data }: any) => {
      if (mode === "dryrun") {
        toast.success(`Dry run: ${data.eligible} eligible • token ${data.tokenOk ? "OK" : "FAIL"}`);
        console.log("[GMC dryrun]", data);
      } else {
        toast.success(`Sync done: considered ${data.considered ?? "?"} • uploaded ${data.uploaded} • deleted ${data.deleted} • failed ${data.failed}`);
        if (data.errors?.length) console.error("[GMC errors]", data.errors);
      }
      qc.invalidateQueries({ queryKey: ["gms-log"] });
      qc.invalidateQueries({ queryKey: ["gms-queue"] });
    },
    onError: (e: any) => toast.error(`Sync failed: ${e.message}`),
    onSettled: () => setRunning(null),
  });

  const successCount = logs?.filter((l) => l.status === "success").length ?? 0;
  const errorCount = logs?.filter((l) => l.status === "error").length ?? 0;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5" />
            Google Merchant Center
          </CardTitle>
          <CardDescription>
            Sync approved premium products to Google for free listings across Search, Images, and the Shopping tab.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 border rounded-lg">
              <div className="text-xs text-muted-foreground">Pending in queue</div>
              <div className="text-2xl font-semibold">{queueCount}</div>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="text-xs text-muted-foreground">Recent successes</div>
              <div className="text-2xl font-semibold text-green-600">{successCount}</div>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="text-xs text-muted-foreground">Recent errors</div>
              <div className="text-2xl font-semibold text-red-600">{errorCount}</div>
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            <Button
              onClick={() => sync.mutate("queue")}
              disabled={sync.isPending}
              variant="outline"
              className="gap-2"
            >
              {running === "queue" ? <RefreshCw className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />}
              Process pending queue
            </Button>
            <Button
              onClick={() => sync.mutate("full")}
              disabled={sync.isPending}
              className="gap-2"
            >
              {running === "full" ? <RefreshCw className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Sync all approved products
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent sync events</CardTitle>
          <CardDescription>Last 50 events</CardDescription>
        </CardHeader>
        <CardContent>
          {!logs?.length ? (
            <p className="text-sm text-muted-foreground">No sync events yet.</p>
          ) : (
            <div className="space-y-1">
              {logs.map((l) => (
                <div key={l.id} className="flex items-start justify-between p-2 border-b text-sm gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge variant={l.status === "success" ? "default" : "destructive"}>{l.status}</Badge>
                      <span className="font-mono text-xs">{l.action}</span>
                      <span className="text-muted-foreground text-xs">
                        {formatDistanceToNow(new Date(l.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    {l.error && (
                      <div className="text-xs text-red-600 mt-1 break-all">{l.error}</div>
                    )}
                    {l.submission_id && (
                      <div className="text-xs text-muted-foreground font-mono mt-0.5">{l.submission_id}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
