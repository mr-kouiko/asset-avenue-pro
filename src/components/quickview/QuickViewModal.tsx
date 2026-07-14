import { useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useQuickView } from './QuickViewContext';
import { QuickViewBody } from './QuickViewBody';

export const QuickViewModal = () => {
  const { isOpen, current, index, items, close, next, prev } = useQuickView();
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') { e.preventDefault(); next(); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); prev(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, next, prev]);

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current == null || touchStartY.current == null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    const absX = Math.abs(dx); const absY = Math.abs(dy);
    if (absX > 60 && absX > absY) {
      if (dx < 0) next(); else prev();
    } else if (dy > 90 && absY > absX) {
      close();
    }
    touchStartX.current = null;
    touchStartY.current = null;
  };

  if (!current) return null;

  const canPrev = index > 0;
  const canNext = index < items.length - 1;

  return (
    <Dialog open={isOpen} onOpenChange={(o) => { if (!o) close(); }}>
      <DialogContent
        className="p-0 gap-0 border bg-background w-[96vw] max-w-[1400px] h-[92vh] sm:h-[90vh] rounded-xl overflow-hidden [&>button]:hidden"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <DialogTitle className="sr-only">{current.title}</DialogTitle>
        <DialogDescription className="sr-only">
          Quick preview of {current.title} by {current.author}
        </DialogDescription>

        {/* Prev / Next / Close controls */}
        <div className="absolute top-3 right-3 z-30 flex gap-2">
          <Button
            variant="secondary"
            size="icon"
            aria-label="Close"
            onClick={close}
            className="h-9 w-9 rounded-full shadow"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <Button
          variant="secondary"
          size="icon"
          aria-label="Previous asset"
          disabled={!canPrev}
          onClick={prev}
          className="hidden md:flex absolute left-3 top-1/2 -translate-y-1/2 z-30 h-11 w-11 rounded-full shadow disabled:opacity-40"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <Button
          variant="secondary"
          size="icon"
          aria-label="Next asset"
          disabled={!canNext}
          onClick={next}
          className="hidden md:flex absolute right-3 top-1/2 -translate-y-1/2 z-30 h-11 w-11 rounded-full shadow disabled:opacity-40"
        >
          <ChevronRight className="h-5 w-5" />
        </Button>

        <div className="h-full p-3 md:p-5 overflow-hidden">
          <QuickViewBody key={current.id} item={current} />
        </div>

        {/* Mobile nav bar */}
        <div className="md:hidden absolute bottom-3 left-1/2 -translate-x-1/2 z-30 flex gap-2 bg-background/90 backdrop-blur rounded-full px-2 py-1 border shadow">
          <Button variant="ghost" size="icon" onClick={prev} disabled={!canPrev} aria-label="Previous">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-xs self-center px-2 tabular-nums text-muted-foreground">
            {index + 1} / {items.length}
          </span>
          <Button variant="ghost" size="icon" onClick={next} disabled={!canNext} aria-label="Next">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
