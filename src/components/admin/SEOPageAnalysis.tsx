import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  ArrowLeft, 
  Zap, 
  Eye, 
  Check, 
  RotateCcw, 
  AlertTriangle,
  FileText,
  Link,
  HelpCircle,
  Loader2,
  Coins,
  Code
} from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SEOIssue {
  type: string;
  severity: 'high' | 'medium' | 'low';
  message: string;
  recommendation: string;
  impact: number;
}

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

interface OptimizationResult {
  optimizedTitle: string;
  optimizedDescription: string;
  optimizedH1: string;
  enhancedContent: string;
  internalLinks: Array<{ anchor: string; url: string; context: string }>;
  faq: Array<{ question: string; answer: string }>;
}

interface SEOPageAnalysisProps {
  page: ScanResult;
  onBack: () => void;
  autoApplyMode: boolean;
}

export function SEOPageAnalysis({ page, onBack, autoApplyMode }: SEOPageAnalysisProps) {
  const [optimizations, setOptimizations] = useState<OptimizationResult | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const queryClient = useQueryClient();

  // Generate optimizations mutation
  const generateMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("seo-optimize", {
        body: {
          pagePath: page.pagePath,
          pageType: page.pageType,
          pageId: page.pageId,
          currentMeta: page.currentMeta,
          issues: page.issues,
        },
      });
      if (error) throw error;
      return data.optimizations;
    },
    onSuccess: (data) => {
      setOptimizations(data);
      toast.success("Optimizations generated successfully!");
      queryClient.invalidateQueries({ queryKey: ["user-credits"] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to generate optimizations: ${error.message}`);
    },
  });

  // Preview mutation
  const previewMutation = useMutation({
    mutationFn: async () => {
      if (!optimizations) throw new Error("No optimizations to preview");
      
      const { data, error } = await supabase.functions.invoke("seo-apply", {
        body: {
          pagePath: page.pagePath,
          pageType: page.pageType,
          pageId: page.pageId,
          optimizations,
          action: "preview",
        },
      });
      if (error) throw error;
      return data.html;
    },
    onSuccess: (html) => {
      setPreviewHtml(html);
      setShowPreview(true);
    },
    onError: (error: Error) => {
      toast.error(`Preview failed: ${error.message}`);
    },
  });

  // Apply mutation
  const applyMutation = useMutation({
    mutationFn: async () => {
      if (!optimizations) throw new Error("No optimizations to apply");
      
      const { data, error } = await supabase.functions.invoke("seo-apply", {
        body: {
          pagePath: page.pagePath,
          pageType: page.pageType,
          pageId: page.pageId,
          optimizations,
          action: "apply",
          mode: autoApplyMode ? "auto" : "suggestion",
        },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("SEO optimizations applied successfully!");
      queryClient.invalidateQueries({ queryKey: ["seo-scans"] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to apply optimizations: ${error.message}`);
    },
  });

  // Revert mutation
  const revertMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("seo-apply", {
        body: {
          pagePath: page.pagePath,
          action: "revert",
        },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Reverted to previous version");
      setOptimizations(null);
    },
    onError: (error: Error) => {
      toast.error(`Revert failed: ${error.message}`);
    },
  });

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "high": return "destructive";
      case "medium": return "secondary";
      default: return "outline";
    }
  };

  const getIssueIcon = (type: string) => {
    switch (type) {
      case "title":
      case "description":
      case "h1":
        return <FileText className="h-4 w-4" />;
      case "internal_links":
        return <Link className="h-4 w-4" />;
      case "schema":
        return <Code className="h-4 w-4" />;
      default:
        return <AlertTriangle className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Results
          </Button>
          <Separator orientation="vertical" className="h-6" />
          <div>
            <h3 className="font-semibold">{page.pagePath}</h3>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Badge variant="outline">{page.pageType}</Badge>
              <span>Score: {Math.round(page.score)}%</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => revertMutation.mutate()}
            disabled={revertMutation.isPending}
          >
            {revertMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RotateCcw className="h-4 w-4 mr-2" />
            )}
            Revert
          </Button>
          <Button
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending}
          >
            {generateMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Zap className="h-4 w-4 mr-2" />
                Generate Optimizations
                <Badge variant="secondary" className="ml-2">
                  <Coins className="h-3 w-3 mr-1" />2
                </Badge>
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Current State */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Current State</CardTitle>
            <CardDescription>Current SEO metadata for this page</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Title</label>
              <p className="text-sm mt-1 p-2 bg-muted rounded">{page.currentMeta.title || "Not set"}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Description</label>
              <p className="text-sm mt-1 p-2 bg-muted rounded">{page.currentMeta.description || "Not set"}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">H1</label>
              <p className="text-sm mt-1 p-2 bg-muted rounded">{page.currentMeta.h1 || "Not set"}</p>
            </div>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-3 bg-muted rounded">
                <p className="text-lg font-bold">{page.currentMeta.contentLength}</p>
                <p className="text-xs text-muted-foreground">Content Length</p>
              </div>
              <div className="p-3 bg-muted rounded">
                <p className="text-lg font-bold">{page.currentMeta.internalLinks}</p>
                <p className="text-xs text-muted-foreground">Internal Links</p>
              </div>
              <div className="p-3 bg-muted rounded">
                <p className="text-lg font-bold">{page.currentMeta.hasSchema ? "Yes" : "No"}</p>
                <p className="text-xs text-muted-foreground">Has Schema</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Issues */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Issues Found ({page.issues.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {page.issues.map((issue, index) => (
                <div key={index} className="p-3 border rounded-lg">
                  <div className="flex items-start gap-3">
                    {getIssueIcon(issue.type)}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={getSeverityColor(issue.severity)}>
                          {issue.severity}
                        </Badge>
                        <span className="text-sm font-medium capitalize">{issue.type.replace("_", " ")}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">{issue.message}</p>
                      <p className="text-xs text-primary mt-1">💡 {issue.recommendation}</p>
                    </div>
                    <Badge variant="outline">Impact: {issue.impact}/10</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Optimized Content */}
      {optimizations && (
        <Card className="border-primary/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Zap className="h-5 w-5 text-yellow-500" />
                  AI-Generated Optimizations
                </CardTitle>
                <CardDescription>Review and apply these SEO improvements</CardDescription>
              </div>
              <div className="flex gap-2">
                <Dialog open={showPreview} onOpenChange={setShowPreview}>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      onClick={() => previewMutation.mutate()}
                      disabled={previewMutation.isPending}
                    >
                      {previewMutation.isPending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Eye className="h-4 w-4 mr-2" />
                      )}
                      Preview
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
                    <DialogHeader>
                      <DialogTitle>HTML Preview for Crawlers</DialogTitle>
                      <DialogDescription>
                        This is how search engine bots will see your page
                      </DialogDescription>
                    </DialogHeader>
                    <div className="mt-4">
                      <pre className="p-4 bg-muted rounded-lg overflow-auto text-xs">
                        {previewHtml}
                      </pre>
                    </div>
                  </DialogContent>
                </Dialog>
                <Button
                  onClick={() => applyMutation.mutate()}
                  disabled={applyMutation.isPending}
                >
                  {applyMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4 mr-2" />
                  )}
                  Apply Changes
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Optimized Title</label>
                <p className="text-sm mt-1 p-2 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded">
                  {optimizations.optimizedTitle}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium">Optimized H1</label>
                <p className="text-sm mt-1 p-2 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded">
                  {optimizations.optimizedH1}
                </p>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Optimized Description</label>
              <p className="text-sm mt-1 p-2 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded">
                {optimizations.optimizedDescription}
              </p>
            </div>

            <div>
              <label className="text-sm font-medium">Enhanced Content</label>
              <div className="text-sm mt-1 p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded whitespace-pre-wrap">
                {optimizations.enhancedContent}
              </div>
            </div>

            {optimizations.internalLinks?.length > 0 && (
              <div>
                <label className="text-sm font-medium flex items-center gap-2">
                  <Link className="h-4 w-4" />
                  Internal Links ({optimizations.internalLinks.length})
                </label>
                <div className="mt-2 space-y-2">
                  {optimizations.internalLinks.map((link, index) => (
                    <div key={index} className="p-2 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded text-sm">
                      <a href={link.url} className="font-medium text-primary">{link.anchor}</a>
                      <span className="text-muted-foreground"> → {link.url}</span>
                      <p className="text-xs text-muted-foreground mt-1">{link.context}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {optimizations.faq?.length > 0 && (
              <div>
                <label className="text-sm font-medium flex items-center gap-2">
                  <HelpCircle className="h-4 w-4" />
                  FAQ Schema ({optimizations.faq.length} questions)
                </label>
                <div className="mt-2 space-y-2">
                  {optimizations.faq.map((item, index) => (
                    <div key={index} className="p-3 bg-purple-50 dark:bg-purple-950 border border-purple-200 dark:border-purple-800 rounded">
                      <p className="font-medium text-sm">{item.question}</p>
                      <p className="text-sm text-muted-foreground mt-1">{item.answer}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
