import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { RotateCcw, ZoomIn, Move } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TEMPLATE_PRESETS, TemplatePreset } from './templates';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assetUrl: string;
  assetType: 'image' | 'video';
  title?: string;
}

interface Transform { scale: number; x: number; y: number; }

const DEFAULT_TRANSFORM: Transform = { scale: 1, x: 0, y: 0 };

export function PreviewTemplateModal({ open, onOpenChange, assetUrl, assetType, title }: Props) {
  const [templateId, setTemplateId] = useState(TEMPLATE_PRESETS[0].id);
  const [showSafe, setShowSafe] = useState(true);
  const [transform, setTransform] = useState<Transform>(DEFAULT_TRANSFORM);
  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number } | null>(null);

  const template: TemplatePreset =
    TEMPLATE_PRESETS.find((t) => t.id === templateId) ?? TEMPLATE_PRESETS[0];

  // Reset when template or asset changes
  useEffect(() => {
    setTransform(DEFAULT_TRANSFORM);
  }, [templateId, assetUrl]);

  // Load natural size (for cover-fit math)
  useEffect(() => {
    if (!open || !assetUrl) return;
    let cancelled = false;
    if (assetType === 'image') {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => { if (!cancelled) setNaturalSize({ w: img.naturalWidth, h: img.naturalHeight }); };
      img.src = assetUrl;
    } else {
      const v = document.createElement('video');
      v.crossOrigin = 'anonymous';
      v.preload = 'metadata';
      v.onloadedmetadata = () => { if (!cancelled) setNaturalSize({ w: v.videoWidth, h: v.videoHeight }); };
      v.src = assetUrl;
    }
    return () => { cancelled = true; };
  }, [open, assetUrl, assetType]);

  // Stage sizing — fit template into visible area
  const stageWrapRef = useRef<HTMLDivElement>(null);
  const [stageSize, setStageSize] = useState({ w: 600, h: 400 });
  useEffect(() => {
    if (!open) return;
    const measure = () => {
      const el = stageWrapRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const pad = 16;
      const maxW = Math.max(200, rect.width - pad);
      const maxH = Math.max(200, rect.height - pad);
      const ratio = template.width / template.height;
      let w = maxW;
      let h = w / ratio;
      if (h > maxH) { h = maxH; w = h * ratio; }
      setStageSize({ w: Math.round(w), h: Math.round(h) });
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (stageWrapRef.current) ro.observe(stageWrapRef.current);
    return () => ro.disconnect();
  }, [open, template]);

  // Cover-fit base size for the asset inside the template
  const baseAssetSize = useMemo(() => {
    if (!naturalSize) return { w: stageSize.w, h: stageSize.h };
    const templateRatio = stageSize.w / stageSize.h;
    const assetRatio = naturalSize.w / naturalSize.h;
    // cover
    if (assetRatio > templateRatio) {
      return { h: stageSize.h, w: stageSize.h * assetRatio };
    }
    return { w: stageSize.w, h: stageSize.w / assetRatio };
  }, [naturalSize, stageSize]);

  // Drag handling
  const dragState = useRef<{ startX: number; startY: number; ox: number; oy: number } | null>(null);
  const onPointerDown = (e: React.PointerEvent) => {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragState.current = { startX: e.clientX, startY: e.clientY, ox: transform.x, oy: transform.y };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragState.current) return;
    const dx = e.clientX - dragState.current.startX;
    const dy = e.clientY - dragState.current.startY;
    setTransform((t) => ({ ...t, x: dragState.current!.ox + dx, y: dragState.current!.oy + dy }));
  };
  const onPointerUp = (e: React.PointerEvent) => {
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    dragState.current = null;
  };

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setTransform((t) => {
      const next = Math.min(5, Math.max(0.5, t.scale + (e.deltaY < 0 ? 0.1 : -0.1)));
      return { ...t, scale: next };
    });
  }, []);

  const reset = () => setTransform(DEFAULT_TRANSFORM);

  const grouped = useMemo(() => {
    const g: Record<string, TemplatePreset[]> = {};
    TEMPLATE_PRESETS.forEach((p) => { (g[p.group] ||= []).push(p); });
    return g;
  }, []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl w-[96vw] h-[92vh] p-0 gap-0 overflow-hidden flex flex-col">
        <DialogHeader className="px-4 md:px-6 py-3 border-b shrink-0">
          <DialogTitle className="text-base md:text-lg">Preview in Template</DialogTitle>
          <DialogDescription className="text-xs md:text-sm">
            Visualize {title ? `“${title}”` : 'this asset'} inside common formats. Pan & zoom to adjust — nothing is saved.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 flex flex-col md:flex-row">
          {/* Template list */}
          <aside className="md:w-64 md:border-r border-b md:border-b-0 shrink-0 bg-muted/30">
            <ScrollArea className="h-40 md:h-full">
              <div className="p-3 space-y-4">
                {Object.entries(grouped).map(([group, list]) => (
                  <div key={group}>
                    <div className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold px-1 mb-1">{group}</div>
                    <div className="flex flex-col gap-1">
                      {list.map((t) => (
                        <button
                          key={t.id}
                          onClick={() => setTemplateId(t.id)}
                          className={cn(
                            'text-left px-2 py-1.5 rounded-md text-sm transition-colors border border-transparent',
                            t.id === templateId
                              ? 'bg-primary text-primary-foreground'
                              : 'hover:bg-accent hover:text-accent-foreground'
                          )}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="truncate">{t.label}</span>
                            <span className={cn('text-[10px] tabular-nums opacity-70')}>
                              {t.width}×{t.height}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </aside>

          {/* Stage */}
          <div className="flex-1 min-w-0 min-h-0 flex flex-col">
            <div ref={stageWrapRef} className="flex-1 min-h-0 flex items-center justify-center bg-[repeating-conic-gradient(hsl(var(--muted))_0%_25%,transparent_0%_50%)] bg-[length:24px_24px] p-4 overflow-hidden">
              <div
                className="relative bg-black rounded-md shadow-2xl overflow-hidden touch-none select-none"
                style={{ width: stageSize.w, height: stageSize.h }}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
                onWheel={onWheel}
              >
                {/* Asset layer */}
                <div
                  className="absolute top-1/2 left-1/2"
                  style={{
                    width: baseAssetSize.w,
                    height: baseAssetSize.h,
                    transform: `translate(-50%, -50%) translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
                    transformOrigin: 'center center',
                  }}
                >
                  {assetType === 'image' ? (
                    <img
                      src={assetUrl}
                      alt={title || 'Preview'}
                      draggable={false}
                      className="w-full h-full object-cover pointer-events-none"
                      onContextMenu={(e) => e.preventDefault()}
                    />
                  ) : (
                    <video
                      src={assetUrl}
                      autoPlay
                      loop
                      muted
                      playsInline
                      className="w-full h-full object-cover pointer-events-none"
                    />
                  )}
                </div>

                {/* Safe area overlays */}
                {showSafe && template.safeAreas?.map((sa, i) => (
                  <div
                    key={i}
                    className={cn(
                      'absolute pointer-events-none border-2 border-dashed flex items-end justify-start p-1',
                      sa.kind === 'avoid'
                        ? 'border-destructive/80 bg-destructive/10'
                        : 'border-primary/80 bg-primary/5'
                    )}
                    style={{
                      left: `${sa.x * 100}%`,
                      top: `${sa.y * 100}%`,
                      width: `${sa.w * 100}%`,
                      height: `${sa.h * 100}%`,
                    }}
                  >
                    <span className="text-[10px] font-medium px-1 py-0.5 rounded bg-background/90 text-foreground">
                      {sa.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Controls */}
            <div className="border-t p-3 md:p-4 space-y-3 bg-background shrink-0">
              <div className="flex flex-wrap items-center gap-3 md:gap-4">
                <Badge variant="secondary" className="gap-1">
                  <span className="font-mono">{template.width}×{template.height}</span>
                </Badge>
                <div className="flex items-center gap-2 flex-1 min-w-[180px] max-w-sm">
                  <ZoomIn className="h-4 w-4 text-muted-foreground shrink-0" />
                  <Slider
                    value={[transform.scale]}
                    min={0.5}
                    max={5}
                    step={0.05}
                    onValueChange={(v) => setTransform((t) => ({ ...t, scale: v[0] }))}
                  />
                  <span className="text-xs tabular-nums w-10 text-right text-muted-foreground">
                    {transform.scale.toFixed(1)}×
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Switch id="safe" checked={showSafe} onCheckedChange={setShowSafe} />
                  <Label htmlFor="safe" className="text-xs md:text-sm cursor-pointer">Safe areas</Label>
                </div>
                <Button variant="outline" size="sm" onClick={reset} className="gap-1">
                  <RotateCcw className="h-3.5 w-3.5" /> Reset
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                <Move className="h-3 w-3" />
                Drag to reposition • Scroll or use the slider to zoom • Preview only, nothing is saved.
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
