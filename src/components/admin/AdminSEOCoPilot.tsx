import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { 
  Search, 
  Play, 
  Zap, 
  History, 
  AlertTriangle, 
  CheckCircle,
  Clock,
  TrendingUp,
  FileText,
  Globe,
  Loader2,
  Eye,
  RotateCcw,
  Coins
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SEOPageAnalysis } from "./SEOPageAnalysis";
import { SEOAuditLog } from "./SEOAuditLog";

interface ScanResult {
  pagePath: string;
  pageType: string;
  pageId?: string;
  score: number;
  issues: SEOIssue[];
  currentMeta: {
    title: string;
    description: string;
    h1: string;
    contentLength: number;
    hasSchema: boolean;
    internalLinks: number;
  };
}

interface SEOIssue {
  type: string;
  severity: 'high' | 'medium' | 'low';
  message: string;
  recommendation: string;
  impact: number;
}

export function AdminSEOCoPilot() {
  const [activeTab, setActiveTab] = useState("scan");
  const [scope, setScope] = useState<"single" | "category" | "marketplace">("marketplace");
  const [scopeFilter, setScopeFilter] = useState("");
  const [autoApplyMode, setAutoApplyMode] = useState(false);
  const [selectedPage, setSelectedPage] = useState<ScanResult | null>(null);
  const queryClient = useQueryClient();

  // Fetch categories for scope filter
  const { data: categories } = useQuery({
    queryKey: ["seo-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name, slug")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  // Fetch user credits
  const { data: credits } = useQuery({
    queryKey: ["user-credits"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { credits_balance: 0 };
      
      const { data, error } = await supabase
        .from("user_credits")
        .select("credits_balance")
        .eq("user_id", user.id)
        .single();
      
      if (error) return { credits_balance: 0 };
      return data;
    },
  });

  // Fetch recent scans
  const { data: recentScans, isLoading: scansLoading } = useQuery({
    queryKey: ["seo-scans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("seo_scans")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
  });

  // Get latest scan results
  const latestScan = recentScans?.[0];
  const scanResults: ScanResult[] = (latestScan?.results as unknown as ScanResult[]) || [];

  // Run scan mutation
  const runScanMutation = useMutation({
    mutationFn: async () => {
      // First create a scan record
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const estimatedCredits = scope === "single" ? 1 : scope === "category" ? 20 : 100;
      
      const { data: scanRecord, error: scanError } = await supabase
        .from("seo_scans")
        .insert({
          scan_type: "manual",
          scope,
          scope_filter: scopeFilter || null,
          status: "pending",
          credits_estimated: estimatedCredits,
          admin_id: user.id,
        })
        .select()
        .single();

      if (scanError) throw scanError;

      // Call the analyze edge function
      const { data, error } = await supabase.functions.invoke("seo-analyze", {
        body: { scope, scopeFilter, scanId: scanRecord.id },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success(`Scan complete: ${data.pagesScanned} pages analyzed, ${data.totalIssues} issues found`);
      queryClient.invalidateQueries({ queryKey: ["seo-scans"] });
      queryClient.invalidateQueries({ queryKey: ["user-credits"] });
    },
    onError: (error: Error) => {
      toast.error(`Scan failed: ${error.message}`);
    },
  });

  // Bulk optimize mutation
  const bulkOptimizeMutation = useMutation({
    mutationFn: async (pagesToOptimize: ScanResult[]) => {
      const results: { success: boolean; pagePath: string; error?: string }[] = [];
      
      for (const page of pagesToOptimize) {
        try {
          const { data, error } = await supabase.functions.invoke("seo-optimize", {
            body: {
              pagePath: page.pagePath,
              pageType: page.pageType,
              pageId: page.pageId,
              currentMeta: page.currentMeta,
              issues: page.issues,
            },
          });

          if (error) {
            results.push({ success: false, pagePath: page.pagePath, error: error.message });
          } else if (data?.optimizations && autoApplyMode) {
            // Auto-apply the optimizations
            const { error: applyError } = await supabase.functions.invoke("seo-apply", {
              body: {
                pagePath: page.pagePath,
                pageType: page.pageType,
                pageId: page.pageId,
                optimizations: data.optimizations,
                action: "apply",
                mode: "full",
              },
            });
            
            results.push({ 
              success: !applyError, 
              pagePath: page.pagePath, 
              error: applyError?.message 
            });
          } else {
            results.push({ success: true, pagePath: page.pagePath });
          }
        } catch (err: any) {
          results.push({ success: false, pagePath: page.pagePath, error: err.message });
        }
      }
      
      return results;
    },
    onSuccess: (results) => {
      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;
      
      if (failed === 0) {
        toast.success(`Successfully optimized ${successful} pages!`);
      } else {
        toast.warning(`Optimized ${successful} pages, ${failed} failed`);
      }
      
      queryClient.invalidateQueries({ queryKey: ["user-credits"] });
      queryClient.invalidateQueries({ queryKey: ["seo-scans"] });
    },
    onError: (error: Error) => {
      toast.error(`Bulk optimization failed: ${error.message}`);
    },
  });

  // Calculate estimated credits
  const getEstimatedCredits = () => {
    if (scope === "single") return 1;
    if (scope === "category") return 20;
    return 100;
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-500";
    if (score >= 60) return "text-yellow-500";
    return "text-red-500";
  };

  const getScoreBadge = (score: number) => {
    if (score >= 80) return "default";
    if (score >= 60) return "secondary";
    return "destructive";
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "high": return "destructive";
      case "medium": return "secondary";
      default: return "outline";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with credits */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Search className="h-6 w-6 text-primary" />
            SEO Co-Pilot
          </h2>
          <p className="text-muted-foreground">
            AI-powered SEO analysis and optimization for your marketplace
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-muted px-4 py-2 rounded-lg">
            <Coins className="h-4 w-4 text-yellow-500" />
            <span className="font-medium">{credits?.credits_balance || 0} credits</span>
          </div>
          <div className="flex items-center gap-2">
            <Switch 
              id="auto-apply" 
              checked={autoApplyMode} 
              onCheckedChange={setAutoApplyMode} 
            />
            <Label htmlFor="auto-apply">Auto-apply mode</Label>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="scan" className="flex items-center gap-2">
            <Search className="h-4 w-4" />
            Scan & Analyze
          </TabsTrigger>
          <TabsTrigger value="results" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Results
          </TabsTrigger>
          <TabsTrigger value="optimize" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Optimize
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Audit Log
          </TabsTrigger>
        </TabsList>

        {/* Scan Tab */}
        <TabsContent value="scan" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Run SEO Scan
              </CardTitle>
              <CardDescription>
                Analyze pages for SEO issues and optimization opportunities
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Scan Scope</Label>
                  <Select value={scope} onValueChange={(v: any) => setScope(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="single">Single Page</SelectItem>
                      <SelectItem value="category">Category</SelectItem>
                      <SelectItem value="marketplace">Full Marketplace</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {scope === "single" && (
                  <div className="space-y-2">
                    <Label>Page Path</Label>
                    <Input 
                      placeholder="/products/example-slug"
                      value={scopeFilter}
                      onChange={(e) => setScopeFilter(e.target.value)}
                    />
                  </div>
                )}

                {scope === "category" && (
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select value={scopeFilter} onValueChange={setScopeFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories?.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Estimated Credits</Label>
                  <div className="flex items-center gap-2 h-10 px-3 bg-muted rounded-md">
                    <Coins className="h-4 w-4 text-yellow-500" />
                    <span className="font-medium">{getEstimatedCredits()}</span>
                    <span className="text-muted-foreground text-sm">credits</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button 
                  onClick={() => runScanMutation.mutate()}
                  disabled={runScanMutation.isPending || (scope === "single" && !scopeFilter) || (scope === "category" && !scopeFilter)}
                >
                  {runScanMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Scanning...
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      Run Scan
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          {latestScan && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <FileText className="h-8 w-8 text-primary" />
                    <div>
                      <p className="text-2xl font-bold">{latestScan.pages_scanned}</p>
                      <p className="text-sm text-muted-foreground">Pages Scanned</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <AlertTriangle className="h-8 w-8 text-yellow-500" />
                    <div>
                      <p className="text-2xl font-bold">{latestScan.issues_found}</p>
                      <p className="text-sm text-muted-foreground">Issues Found</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <TrendingUp className={`h-8 w-8 ${getScoreColor(latestScan.average_score || 0)}`} />
                    <div>
                      <p className="text-2xl font-bold">{Math.round(latestScan.average_score || 0)}%</p>
                      <p className="text-sm text-muted-foreground">Avg. Score</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <Clock className="h-8 w-8 text-muted-foreground" />
                    <div>
                      <p className="text-2xl font-bold">
                        {latestScan.completed_at 
                          ? new Date(latestScan.completed_at).toLocaleDateString()
                          : "Running..."}
                      </p>
                      <p className="text-sm text-muted-foreground">Last Scan</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* Results Tab */}
        <TabsContent value="results" className="space-y-4">
          {selectedPage ? (
            <SEOPageAnalysis 
              page={selectedPage} 
              onBack={() => setSelectedPage(null)}
              autoApplyMode={autoApplyMode}
            />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Scan Results</CardTitle>
                <CardDescription>
                  {scanResults.length > 0 
                    ? `${scanResults.length} pages analyzed` 
                    : "Run a scan to see results"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {scansLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : scanResults.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No scan results yet. Run a scan to analyze your pages.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {scanResults.map((result, index) => (
                      <div 
                        key={index}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                        onClick={() => setSelectedPage(result)}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">{result.pagePath}</span>
                            <Badge variant="outline">{result.pageType}</Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>{result.issues.length} issues</span>
                            <span>•</span>
                            <span>Content: {result.currentMeta.contentLength} chars</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex gap-1">
                            {result.issues.filter(i => i.severity === 'high').length > 0 && (
                              <Badge variant="destructive">
                                {result.issues.filter(i => i.severity === 'high').length} High
                              </Badge>
                            )}
                            {result.issues.filter(i => i.severity === 'medium').length > 0 && (
                              <Badge variant="secondary">
                                {result.issues.filter(i => i.severity === 'medium').length} Med
                              </Badge>
                            )}
                          </div>
                          <Badge variant={getScoreBadge(result.score)} className="min-w-[60px] justify-center">
                            {Math.round(result.score)}%
                          </Badge>
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Optimize Tab */}
        <TabsContent value="optimize" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-yellow-500" />
                Bulk Optimization
              </CardTitle>
              <CardDescription>
                Optimize multiple pages at once
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-yellow-500" />
                  <div>
                    <p className="font-medium">Pages with high-severity issues</p>
                    <p className="text-sm text-muted-foreground">
                      {scanResults.filter(r => r.issues.some(i => i.severity === 'high')).length} pages need attention
                    </p>
                  </div>
                  <Button 
                    className="ml-auto" 
                    disabled={scanResults.length === 0 || bulkOptimizeMutation.isPending}
                    onClick={() => {
                      const highSeverityPages = scanResults.filter(r => r.issues.some(i => i.severity === 'high'));
                      if (highSeverityPages.length === 0) {
                        toast.info("No pages with high-severity issues to optimize");
                        return;
                      }
                      bulkOptimizeMutation.mutate(highSeverityPages);
                    }}
                  >
                    {bulkOptimizeMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Optimizing...
                      </>
                    ) : (
                      <>
                        <Zap className="h-4 w-4 mr-2" />
                        Optimize All ({scanResults.filter(r => r.issues.some(i => i.severity === 'high')).length * 2} credits)
                      </>
                    )}
                  </Button>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-medium mb-4">Priority Queue</h4>
                  <div className="space-y-2">
                    {scanResults
                      .filter(r => r.issues.some(i => i.severity === 'high'))
                      .slice(0, 5)
                      .map((result, index) => (
                        <div key={index} className="flex items-center justify-between p-3 border rounded">
                          <div>
                            <p className="font-medium">{result.pagePath}</p>
                            <p className="text-sm text-muted-foreground">
                              Score: {Math.round(result.score)}% • {result.issues.length} issues
                            </p>
                          </div>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => {
                              setSelectedPage(result);
                              setActiveTab("results");
                            }}
                          >
                            Optimize
                          </Button>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history">
          <SEOAuditLog />
        </TabsContent>
      </Tabs>
    </div>
  );
}
