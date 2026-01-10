import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  History, 
  Search, 
  Zap, 
  Check, 
  RotateCcw, 
  Eye,
  Loader2,
  Coins
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

export function SEOAuditLog() {
  const { data: auditLogs, isLoading } = useQuery({
    queryKey: ["seo-audit-log"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("seo_audit_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

  const getActionIcon = (action: string) => {
    switch (action) {
      case "scan":
        return <Search className="h-4 w-4" />;
      case "analyze":
        return <Search className="h-4 w-4" />;
      case "optimize":
        return <Zap className="h-4 w-4 text-yellow-500" />;
      case "apply":
        return <Check className="h-4 w-4 text-green-500" />;
      case "revert":
        return <RotateCcw className="h-4 w-4 text-orange-500" />;
      case "preview":
        return <Eye className="h-4 w-4 text-blue-500" />;
      default:
        return <History className="h-4 w-4" />;
    }
  };

  const getActionColor = (action: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (action) {
      case "apply":
        return "default";
      case "optimize":
        return "secondary";
      case "revert":
        return "destructive";
      default:
        return "outline";
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          SEO Audit Log
        </CardTitle>
        <CardDescription>
          Complete history of all SEO actions and changes
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!auditLogs || auditLogs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No audit logs yet. Actions will appear here.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {auditLogs.map((log) => (
              <div 
                key={log.id} 
                className="flex items-start gap-4 p-4 border rounded-lg hover:bg-muted/30 transition-colors"
              >
                <div className="p-2 bg-muted rounded-lg">
                  {getActionIcon(log.action_type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant={getActionColor(log.action_type)}>
                      {log.action_type}
                    </Badge>
                    {log.page_path && (
                      <span className="text-sm font-medium truncate">
                        {log.page_path}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {log.changes_summary || `${log.action_type} action performed`}
                  </p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                    <span>
                      {format(new Date(log.created_at), "MMM d, yyyy 'at' HH:mm")}
                    </span>
                    {log.credits_used > 0 && (
                      <span className="flex items-center gap-1">
                        <Coins className="h-3 w-3 text-yellow-500" />
                        {log.credits_used} credits
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
