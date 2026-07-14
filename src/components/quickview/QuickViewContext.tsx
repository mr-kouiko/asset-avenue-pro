import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';

export interface QuickViewItem {
  id: string;
  slug?: string;
  title: string;
  author: string;
  type: 'photo' | 'video' | 'audio' | 'pdf' | 'ebook' | 'vfx';
  price: number;
  thumbnail: string;
  videoUrl?: string;
  audioUrl?: string;
}

interface QuickViewCtx {
  isOpen: boolean;
  items: QuickViewItem[];
  index: number;
  current: QuickViewItem | null;
  open: (items: QuickViewItem[], startIndex: number) => void;
  close: () => void;
  next: () => void;
  prev: () => void;
  goTo: (index: number) => void;
}

const Ctx = createContext<QuickViewCtx | null>(null);

const ASSET_PARAM = 'asset';

export const QuickViewProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<QuickViewItem[]>([]);
  const [index, setIndex] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const skipUrlSyncRef = useRef(false);

  const current = items[index] ?? null;

  const syncUrl = useCallback((slugOrId: string | null) => {
    skipUrlSyncRef.current = true;
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (slugOrId) next.set(ASSET_PARAM, slugOrId);
      else next.delete(ASSET_PARAM);
      return next;
    }, { replace: false });
    // release flag on next tick
    queueMicrotask(() => { skipUrlSyncRef.current = false; });
  }, [setSearchParams]);

  const open = useCallback((list: QuickViewItem[], startIndex: number) => {
    if (!list.length) return;
    const safe = Math.max(0, Math.min(startIndex, list.length - 1));
    setItems(list);
    setIndex(safe);
    setIsOpen(true);
    const key = list[safe].slug || list[safe].id;
    syncUrl(key);
  }, [syncUrl]);

  const close = useCallback(() => {
    if (!isOpen) return;
    setIsOpen(false);
    syncUrl(null);
  }, [isOpen, syncUrl]);

  const goTo = useCallback((i: number) => {
    setIndex(prev => {
      const next = Math.max(0, Math.min(i, items.length - 1));
      const key = items[next]?.slug || items[next]?.id;
      if (key) syncUrl(key);
      return next;
    });
  }, [items, syncUrl]);

  const next = useCallback(() => goTo(index + 1), [goTo, index]);
  const prev = useCallback(() => goTo(index - 1), [goTo, index]);

  // React to browser back/forward removing/changing ?asset=
  useEffect(() => {
    if (skipUrlSyncRef.current) return;
    const asset = searchParams.get(ASSET_PARAM);
    if (!asset && isOpen) {
      setIsOpen(false);
      return;
    }
    if (asset && isOpen) {
      const i = items.findIndex(it => (it.slug || it.id) === asset);
      if (i >= 0 && i !== index) setIndex(i);
    }
  }, [searchParams, isOpen, items, index]);

  const value = useMemo<QuickViewCtx>(() => ({
    isOpen, items, index, current, open, close, next, prev, goTo,
  }), [isOpen, items, index, current, open, close, next, prev, goTo]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

export const useQuickView = () => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useQuickView must be used inside QuickViewProvider');
  return ctx;
};
