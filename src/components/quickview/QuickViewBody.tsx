import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, ShoppingCart, ExternalLink, Loader2, ZoomIn, Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useProductDetail } from '@/hooks/useProductDetail';
import { useCart } from '@/hooks/useCart';
import { useLikes } from '@/hooks/useLikes';
import { LazyImage } from '@/components/LazyImage';
import { VideoWatermark } from '@/components/VideoWatermark';
import { SocialShare } from '@/components/SocialShare';
import { QuickViewItem, useQuickView } from './QuickViewContext';

interface Props { item: QuickViewItem; }

const formatBytes = (bytes?: number) => {
  if (!bytes) return '—';
  const mb = bytes / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${(bytes / 1024).toFixed(0)} KB`;
};

const MediaView = ({ item, product }: { item: QuickViewItem; product: any }) => {
  const [zoomed, setZoomed] = useState(false);

  const preview = product?.previewUrl;
  const primaryFile = product?.files?.[0];
  const mediaType = product?.type || item.type;

  if (mediaType === 'video' || mediaType === 'vfx') {
    const src = preview || item.videoUrl || primaryFile?.file_path;
    const containerRef = useRef<HTMLDivElement>(null);
    const requestFullscreen = () => {
      const el = containerRef.current as any;
      if (!el) return;
      const fn = el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen;
      if (fn) fn.call(el);
    };
    return (
      <div
        ref={containerRef}
        className="relative w-full h-full flex items-center justify-center bg-black rounded-lg overflow-hidden group"
      >
        {src ? (
          <>
            <video
              key={src}
              src={src}
              controls
              controlsList="nodownload noplaybackrate nofullscreen"
              disablePictureInPicture
              onContextMenu={(e) => e.preventDefault()}
              autoPlay={false}
              playsInline
              className="max-w-full max-h-full object-contain"
              poster={item.thumbnail}
            />
            <VideoWatermark size="large" />
            <button
              type="button"
              onClick={requestFullscreen}
              aria-label="Fullscreen"
              title="Fullscreen"
              className="absolute bottom-3 right-3 z-30 bg-black/70 hover:bg-black text-white rounded-md p-2 backdrop-blur transition shadow-lg"
            >
              <Maximize2 className="h-4 w-4" />
            </button>
          </>
        ) : (
          <img src={item.thumbnail} alt={item.title} className="max-w-full max-h-full object-contain" />
        )}
      </div>
    );
  }

  if (mediaType === 'audio') {
    const src = preview || item.audioUrl;
    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-6 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-lg p-8">
        <img
          src={item.thumbnail}
          alt={item.title}
          className="w-48 h-48 md:w-64 md:h-64 rounded-lg shadow-2xl object-cover"
        />
        {src ? (
          <audio key={src} src={src} controls className="w-full max-w-xl" />
        ) : (
          <p className="text-sm text-muted-foreground">Audio preview unavailable</p>
        )}
      </div>
    );
  }

  if (mediaType === 'ebook' || mediaType === 'pdf') {
    return (
      <div className="w-full h-full flex items-center justify-center bg-muted/30 rounded-lg p-6">
        <img
          src={item.thumbnail}
          alt={item.title}
          className="max-h-full max-w-full object-contain shadow-2xl rounded"
        />
      </div>
    );
  }

  // photo / vector / fallback
  const src = preview || item.thumbnail;
  return (
    <div
      className="relative w-full h-full flex items-center justify-center bg-muted/30 rounded-lg overflow-hidden cursor-zoom-in"
      onClick={() => setZoomed(z => !z)}
    >
      <img
        src={src}
        alt={item.title}
        className={`transition-transform duration-200 ${zoomed ? 'scale-150 cursor-zoom-out' : 'max-w-full max-h-full object-contain'}`}
      />
      <div className="absolute bottom-3 right-3 bg-background/80 backdrop-blur px-2 py-1 rounded text-xs flex items-center gap-1 pointer-events-none">
        <ZoomIn className="h-3 w-3" /> Click to {zoomed ? 'reset' : 'zoom'}
      </div>
    </div>
  );
};

export const QuickViewBody = ({ item }: Props) => {
  const idForFetch = item.slug || item.id;
  const { product, loading } = useProductDetail(idForFetch);
  const { addToCart } = useCart();
  const { hasUserLiked, toggleLike } = useLikes();
  const { open, items } = useQuickView();

  const liked = hasUserLiked(item.id);
  const productPath = item.slug ? `/products/${item.slug}` : `/product/${item.id}`;

  const primaryFile = product?.files?.[0];
  const meta = primaryFile?.metadata || {};

  const specs = useMemo(() => {
    const arr: Array<[string, string]> = [];
    if (primaryFile?.file_size) arr.push(['Size', formatBytes(primaryFile.file_size)]);
    if (primaryFile?.file_type) arr.push(['Format', String(primaryFile.file_type).toUpperCase()]);
    if (meta.width && meta.height) arr.push(['Dimensions', `${meta.width}×${meta.height}`]);
    if (meta.duration) arr.push(['Duration', `${Math.round(Number(meta.duration))}s`]);
    if (product?.category?.name) arr.push(['Category', product.category.name]);
    if (product?.uploadDate) arr.push(['Uploaded', new Date(product.uploadDate).toLocaleDateString()]);
    return arr;
  }, [primaryFile, meta, product]);

  const strip = items.slice(0, 12);

  return (
    <div className="grid md:grid-cols-[minmax(0,1fr)_360px] gap-4 md:gap-6 h-full overflow-hidden">
      {/* Media */}
      <div className="min-h-[45vh] md:min-h-0 md:h-full">
        <MediaView item={item} product={product} />
      </div>

      {/* Sidebar */}
      <aside className="flex flex-col overflow-y-auto pr-1 gap-4">
        <div>
          <div className="flex items-start justify-between gap-2">
            <h2 className="text-xl font-semibold leading-tight">
              {product?.title || item.title}
            </h2>
            <Button
              variant="ghost"
              size="icon"
              aria-label={liked ? 'Unlike' : 'Like'}
              onClick={() => toggleLike(item.id)}
            >
              <Heart className="h-5 w-5" fill={liked ? 'currentColor' : 'none'} />
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            by {product?.author || item.author}
          </p>
        </div>

        {product?.description && (
          <p className="text-sm text-foreground/80 line-clamp-4">{product.description}</p>
        )}

        {/* Price + actions */}
        <div className="flex items-center gap-2">
          <div className="text-2xl font-bold flex-1">
            {(item.price ?? 0) === 0 ? 'Free' : `$${(product?.price ?? item.price).toFixed?.(2) ?? item.price}`}
          </div>
          <Button
            onClick={() =>
              addToCart({
                id: item.id,
                submissionId: item.id,
                title: item.title,
                author: item.author,
                price: item.price ?? 0,
                type: item.type,
                thumbnail: item.thumbnail,
                videoUrl: item.videoUrl,
                audioUrl: item.audioUrl,
                licenseId: 'standard',
              })
            }
            className="gap-2"
          >
            <ShoppingCart className="h-4 w-4" />
            Add to cart
          </Button>
        </div>

        <Button asChild variant="outline" className="w-full gap-2">
          <Link to={productPath}>
            <ExternalLink className="h-4 w-4" />
            View full page
          </Link>
        </Button>

        {loading && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" /> Loading details…
          </div>
        )}

        {/* Specs */}
        {specs.length > 0 && (
          <div className="border-t pt-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
              Details
            </h3>
            <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-sm">
              {specs.map(([k, v]) => (
                <div key={k} className="contents">
                  <dt className="text-muted-foreground">{k}</dt>
                  <dd className="text-foreground font-medium truncate">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}

        {/* Tags */}
        {product?.tags?.length ? (
          <div className="border-t pt-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
              Keywords
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {product.tags.slice(0, 20).map((tag: string) => (
                <Badge key={tag} variant="secondary" className="text-[11px] font-normal">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        ) : null}

        {/* Share */}
        <div className="border-t pt-3">
          <SocialShare
            url={typeof window !== 'undefined' ? `${window.location.origin}${productPath}` : productPath}
            title={item.title}
            description={product?.description || ''}
          />
        </div>

        {/* More from this browse */}
        {strip.length > 1 && (
          <div className="border-t pt-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
              More in this browse
            </h3>
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
              {strip.map((s, i) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => open(items, items.findIndex(x => x.id === s.id))}
                  className={`shrink-0 w-20 h-20 rounded overflow-hidden border-2 ${
                    s.id === item.id ? 'border-primary' : 'border-transparent hover:border-border'
                  }`}
                  aria-label={s.title}
                >
                  <img src={s.thumbnail} alt={s.title} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>
        )}
      </aside>
    </div>
  );
};
