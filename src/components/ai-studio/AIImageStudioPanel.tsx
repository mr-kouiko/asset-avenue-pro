import { useCallback, useEffect, useState } from "react";
import { Sparkles, Loader2, Download, ImageIcon, Wand2, Scissors, Maximize2, Palette, Sun, RefreshCw, ShoppingCart, CreditCard } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { applyImageWatermark, triggerDownload } from "@/utils/imageWatermark";
import { useDirectPurchase } from "@/hooks/useDirectPurchase";
import { useSecureDownload } from "@/hooks/useSecureDownload";

type Action = "prompt" | "remove-bg" | "expand" | "change-bg" | "change-mood" | "change-color";
type Source = "pexels" | "internal";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  imageUrl: string;
  filenameBase?: string;
  source?: Source;
  productId?: string;
}

const ACTIONS: { id: Action; label: string; icon: any; needsPrompt: boolean; placeholder?: string }[] = [
  { id: "prompt", label: "Type to edit", icon: Wand2, needsPrompt: true, placeholder: "Describe the edit — e.g. 'add a rainbow in the sky'" },
  { id: "remove-bg", label: "Remove background", icon: Scissors, needsPrompt: false },
  { id: "expand", label: "Expand image", icon: Maximize2, needsPrompt: false },
  { id: "change-bg", label: "Change background", icon: ImageIcon, needsPrompt: true, placeholder: "New background — e.g. 'a sunlit beach at golden hour'" },
  { id: "change-mood", label: "Change mood", icon: Sun, needsPrompt: true, placeholder: "New mood — e.g. 'moody cinematic night, neon lights'" },
  { id: "change-color", label: "Change color", icon: Palette, needsPrompt: true, placeholder: "New palette — e.g. 'warm autumn tones' or 'teal & orange'" },
];

const LICENSES = [
  { id: "standard", name: "Standard", price: 15, desc: "Web & social use" },
  { id: "extended", name: "Extended", price: 45, desc: "Commercial products" },
  { id: "exclusive", name: "Exclusive", price: 299, desc: "Exclusive rights" },
];

interface ProductInfo {
  title: string;
  author: string;
  price: number | null;
  type: string;
  thumbnail?: string;
  contentFileId?: string;
}

export function AIImageStudioPanel({ open, onOpenChange, imageUrl, filenameBase = "visustock-edit", source = "internal", productId }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [action, setAction] = useState<Action>("prompt");
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [creditsLeft, setCreditsLeft] = useState<number | null>(null);
  const [licenseOwned, setLicenseOwned] = useState(false);
  const [productInfo, setProductInfo] = useState<ProductInfo | null>(null);
  const [purchaseOpen, setPurchaseOpen] = useState(false);
  const [selectedLicense, setSelectedLicense] = useState("standard");

  const { createDirectPayment, payWithCredits, canPayWithCreditsForItem, getItemTotal, userCredits, loading: purchaseLoading } = useDirectPurchase();
  const { secureDownload, isProcessing: downloadingOriginal } = useSecureDownload();

  const current = ACTIONS.find((a) => a.id === action)!;
  const fallbackProductInfo: ProductInfo | null = productId
    ? {
        title: filenameBase.replace(/[-_]/g, " ") || "VisuStock image",
        author: "Creator",
        price: null,
        type: "photo",
        thumbnail: imageUrl,
      }
    : null;
  const resolvedProductInfo = productInfo ?? fallbackProductInfo;

  const refreshLicense = useCallback(async () => {
    if (source !== "internal" || !user || !productId) {
      setLicenseOwned(false);
      return;
    }
    const { data, error } = await supabase
      .from("downloads")
      .select("id")
      .eq("user_id", user.id)
      .eq("submission_id", productId)
      .limit(1);
    if (error) {
      console.warn("License ownership check failed:", error);
      setLicenseOwned(false);
      return;
    }
    setLicenseOwned((data?.length ?? 0) > 0);
  }, [source, user, productId]);

  // Load product info + license ownership when panel opens (internal only)
  useEffect(() => {
    if (!open || source !== "internal" || !productId) {
      setProductInfo(null);
      setLicenseOwned(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const [subRes, filesRes] = await Promise.all([
        supabase.from("content_submissions").select("title, price, creator_id").eq("id", productId).maybeSingle(),
        supabase.from("content_files").select("id, file_type, thumbnail_path, is_original").eq("submission_id", productId),
      ]);
      if (cancelled) return;
      const sub: any = subRes.data;
      const files = (filesRes.data || []) as Array<{ id: string; file_type?: string | null; thumbnail_path?: string | null; is_original?: boolean | null }>;
      const originalFile = files.find((file) => file.is_original) || files[0];
      if (sub) {
        let author = "Creator";
        if (sub.creator_id) {
          const { data: profile } = await supabase.from("profiles").select("display_name, store_name").eq("user_id", sub.creator_id).maybeSingle();
          author = profile?.display_name || profile?.store_name || "Creator";
        }
        const fileType = String(originalFile?.file_type || "").toLowerCase();
        const type = fileType.includes("svg") || fileType.includes("vector")
          ? "vector"
          : fileType.includes("image")
            ? "photo"
            : fileType || "photo";
        if (!cancelled) {
          setProductInfo({
            title: sub.title,
            author,
            price: sub.price,
            type,
            thumbnail: originalFile?.thumbnail_path || imageUrl,
            contentFileId: originalFile?.id,
          });
        }
      }
      await refreshLicense();
    })();
    return () => { cancelled = true; };
  }, [open, source, productId, refreshLicense]);

  const shouldWatermark = source === "internal" && !licenseOwned;

  const run = async () => {
    if (!user) {
      toast({ title: "Sign in required", description: "Please sign in to use AI editing.", variant: "destructive" });
      return;
    }
    if (current.needsPrompt && !prompt.trim() && action === "prompt") {
      toast({ title: "Prompt required", description: "Describe the edit you want.", variant: "destructive" });
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("ai-edit-image", {
        body: { action, imageUrl, prompt: prompt.trim() || undefined },
      });
      if (error) throw error;
      if (!data?.imageUrl) throw new Error("No image returned");
      setResult(data.imageUrl);
      if (typeof data.creditsRemaining === "number") setCreditsLeft(data.creditsRemaining);
      toast({ title: "Edit ready", description: "Preview your AI-edited image below." });
    } catch (e: any) {
      toast({ title: "Edit failed", description: e?.message || "AI edit failed", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const download = async () => {
    if (!result) return;
    setDownloading(true);
    try {
      let blob: Blob;
      if (shouldWatermark) {
        blob = await applyImageWatermark(result);
      } else {
        const res = await fetch(result, { credentials: "omit" });
        if (!res.ok) throw new Error("Could not fetch edited image");
        blob = await res.blob();
      }
      triggerDownload(blob, `${filenameBase}-${Date.now()}.png`);
    } catch (e: any) {
      toast({ title: "Download failed", description: e?.message || "Could not prepare file", variant: "destructive" });
    } finally {
      setDownloading(false);
    }
  };

  const downloadOriginal = async () => {
    if (!productInfo?.contentFileId) {
      toast({ title: "Original unavailable", description: "Could not locate the original file.", variant: "destructive" });
      return;
    }
    await secureDownload(productInfo.contentFileId, productInfo.title);
  };

  const reset = () => {
    setResult(null);
    setPrompt("");
  };

  // Purchase flow
  const buildItem = () => {
    if (!resolvedProductInfo || !productId) return null;
    return {
      submission_id: productId,
      title: resolvedProductInfo.title,
      author: resolvedProductInfo.author,
      price: resolvedProductInfo.price,
      license_id: selectedLicense,
      type: resolvedProductInfo.type,
      thumbnail: resolvedProductInfo.thumbnail,
    };
  };

  const handlePayPal = async () => {
    const item = buildItem();
    if (!item) {
      toast({ title: "Purchase unavailable", description: "Could not identify this product.", variant: "destructive" });
      return;
    }
    // PayPal redirects the browser — user returns via /payment-success
    await createDirectPayment(item, selectedLicense);
  };

  const handleCredits = async () => {
    const item = buildItem();
    if (!item) {
      toast({ title: "Purchase unavailable", description: "Could not identify this product.", variant: "destructive" });
      return;
    }
    const result = await payWithCredits(item, selectedLicense);
    if (result?.success) {
      setPurchaseOpen(false);
      // Refresh license ownership so the download section updates immediately
      await refreshLicense();
    }
  };

  const purchaseItem = buildItem();
  const total = purchaseItem ? getItemTotal(purchaseItem, selectedLicense) : 0;
  const canCredits = purchaseItem ? canPayWithCreditsForItem(purchaseItem, selectedLicense) : false;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" /> Studio AI image
            </SheetTitle>
            <SheetDescription>
              Edit this image with AI. Each edit costs 1 credit.
              {creditsLeft !== null && ` • ${creditsLeft} credits remaining`}
            </SheetDescription>
          </SheetHeader>

          <div className="mt-4 space-y-4">
            {(() => {
              const needsWatermark = source === "internal" && !licenseOwned;
              const noSave = {
                onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
                onDragStart: (e: React.DragEvent) => e.preventDefault(),
                draggable: false,
                style: { WebkitUserSelect: "none", userSelect: "none", WebkitTouchCallout: "none" } as React.CSSProperties,
              };
              const wmOverlay = needsWatermark ? (
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 overflow-hidden"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(
                      `<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220' viewBox='0 0 220 220'><defs><pattern id='vs' patternUnits='userSpaceOnUse' width='220' height='110' patternTransform='rotate(-30 110 55)'><text x='0' y='70' fill='rgba(255,255,255,0.38)' font-family='system-ui,-apple-system,sans-serif' font-size='20' font-weight='700' letter-spacing='0.12em' style='text-shadow:0 1px 3px rgba(0,0,0,0.45)'>VISUSTOCK</text></pattern></defs><rect width='100%' height='100%' fill='url(%23vs)'/></svg>`
                    )}")`,
                    backgroundSize: "220px 220px",
                  }}
                />
              ) : null;
              return (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Original</div>
                    <div className="relative aspect-square rounded-md overflow-hidden bg-muted/30 border">
                      <img src={imageUrl} alt="Original" className="w-full h-full object-contain" crossOrigin="anonymous" {...noSave} />
                      {wmOverlay}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Result</div>
                    <div className="relative aspect-square rounded-md overflow-hidden bg-muted/30 border flex items-center justify-center">
                      {loading ? (
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      ) : result ? (
                        <>
                          <img src={result} alt="Result" className="w-full h-full object-contain" {...noSave} />
                          {wmOverlay}
                        </>
                      ) : (
                        <span className="text-xs text-muted-foreground">Preview</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}

            <Tabs value={action} onValueChange={(v) => { setAction(v as Action); setResult(null); }}>
              <TabsList className="grid grid-cols-3 h-auto">
                {ACTIONS.slice(0, 3).map((a) => (
                  <TabsTrigger key={a.id} value={a.id} className="text-xs gap-1 py-2">
                    <a.icon className="h-3.5 w-3.5" /> {a.label}
                  </TabsTrigger>
                ))}
              </TabsList>
              <TabsList className="grid grid-cols-3 h-auto mt-1">
                {ACTIONS.slice(3).map((a) => (
                  <TabsTrigger key={a.id} value={a.id} className="text-xs gap-1 py-2">
                    <a.icon className="h-3.5 w-3.5" /> {a.label}
                  </TabsTrigger>
                ))}
              </TabsList>

              {ACTIONS.map((a) => (
                <TabsContent key={a.id} value={a.id} className="mt-4 space-y-3">
                  {a.needsPrompt && (
                    <Textarea
                      placeholder={a.placeholder}
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      rows={3}
                    />
                  )}
                  <div className="flex gap-2">
                    <Button onClick={run} disabled={loading} className="flex-1 gap-2">
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                      {loading ? "Generating…" : "Generate (1 credit)"}
                    </Button>
                    {result && (
                      <Button variant="outline" onClick={reset} title="Reset">
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </TabsContent>
              ))}
            </Tabs>

            {result && (
              <div className="space-y-2">
                <Button onClick={download} disabled={downloading} variant="secondary" className="w-full gap-2">
                  {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                  {shouldWatermark ? "Download watermarked remix" : "Download unwatermarked remix"}
                </Button>
                {!shouldWatermark && source === "internal" && productInfo?.contentFileId && (
                  <Button onClick={downloadOriginal} disabled={downloadingOriginal} variant="outline" className="w-full gap-2">
                    {downloadingOriginal ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                    Download original
                  </Button>
                )}
                {shouldWatermark && productId && (
                  <Button onClick={() => setPurchaseOpen(true)} className="w-full gap-2">
                    <ShoppingCart className="h-4 w-4" />
                    Buy license & download
                  </Button>
                )}
              </div>
            )}

            {!result && shouldWatermark && productId && (
              <Button onClick={() => setPurchaseOpen(true)} className="w-full gap-2">
                <ShoppingCart className="h-4 w-4" />
                Buy license & download
              </Button>
            )}

            {shouldWatermark && (
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Downloads are watermarked with the VisuStock logo. To use edited assets commercially without watermark,{" "}
                {productId ? (
                  <button
                    type="button"
                    onClick={() => setPurchaseOpen(true)}
                    className="underline text-primary hover:opacity-80"
                  >
                    purchase the original license
                  </button>
                ) : (
                  "purchase the original license"
                )}
                .
              </p>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* License purchase dialog — opens on top of the panel */}
      <Dialog open={purchaseOpen} onOpenChange={setPurchaseOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Purchase license</DialogTitle>
            <DialogDescription>
              {resolvedProductInfo?.title ? `Choose a license for "${resolvedProductInfo.title}".` : "Choose a license."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            {LICENSES.map((l) => (
              <button
                key={l.id}
                type="button"
                onClick={() => setSelectedLicense(l.id)}
                className={`w-full text-left rounded-md border p-3 transition ${
                  selectedLicense === l.id ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">{l.name}</div>
                    <div className="text-xs text-muted-foreground">{l.desc}</div>
                  </div>
                  <div className="text-sm font-semibold">${l.price}</div>
                </div>
              </button>
            ))}
          </div>

          {purchaseItem && (
            <div className="flex items-center justify-between text-sm border-t pt-3">
              <span className="text-muted-foreground">Total</span>
              <span className="font-semibold">${total}</span>
            </div>
          )}

          <DialogFooter className="flex-col gap-2 sm:flex-col sm:space-x-0">
            {canCredits && (
              <Button onClick={handleCredits} disabled={purchaseLoading} className="w-full gap-2" variant="secondary">
                {purchaseLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                Pay with credits ({userCredits} available)
              </Button>
            )}
            <Button onClick={handlePayPal} disabled={purchaseLoading} className="w-full gap-2">
              {purchaseLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShoppingCart className="h-4 w-4" />}
              Pay ${total} with PayPal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

interface TriggerProps {
  imageUrl: string;
  filenameBase?: string;
  source?: Source;
  productId?: string;
  className?: string;
  size?: "sm" | "default" | "lg";
  variant?: "default" | "outline" | "secondary" | "ghost";
  label?: string;
}

export function AIImageStudioTrigger({
  imageUrl,
  filenameBase,
  source = "internal",
  productId,
  className,
  size = "sm",
  variant = "secondary",
  label = "Edit with AI",
}: TriggerProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        type="button"
        size={size}
        variant={variant}
        className={`gap-2 ${className || ""}`}
        onClick={(e) => { e.stopPropagation(); setOpen(true); }}
      >
        <Sparkles className="h-4 w-4" /> {label}
      </Button>
      {open && (
        <AIImageStudioPanel
          open={open}
          onOpenChange={setOpen}
          imageUrl={imageUrl}
          filenameBase={filenameBase}
          source={source}
          productId={productId}
        />
      )}
    </>
  );
}
