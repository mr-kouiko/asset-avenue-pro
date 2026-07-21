import { useState, useCallback, useEffect, useRef } from 'react';
import { Navigation } from '@/components/Navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Search, Camera, Video, Download, ExternalLink, Loader2, User, Music, FileText } from 'lucide-react';
import { LazyImage } from '@/components/LazyImage';
import { ContentCard } from '@/components/ContentCard';
import { PexelsCard } from '@/components/PexelsCard';
import type { PexelsItem } from '@/hooks/usePexelsSearch';
import { useSEO } from '@/hooks/useSEO';
import { useFreeContent, FreeItem } from '@/hooks/useFreeContent';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { AuthModal } from '@/components/AuthModal';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PexelsPhoto {
  id: number;
  width: number;
  height: number;
  url: string;
  photographer: string;
  photographer_url: string;
  src: {
    original: string;
    large2x: string;
    large: string;
    medium: string;
    small: string;
    portrait: string;
    landscape: string;
    tiny: string;
  };
  alt: string;
}

interface PexelsVideo {
  id: number;
  width: number;
  height: number;
  url: string;
  image: string;
  user: { name: string; url: string };
  video_files: { id: number; quality: string; file_type: string; link: string; width: number; height: number }[];
}

type MediaType = 'all' | 'photos' | 'videos';

interface UnifiedItem {
  source: 'pexels' | 'visustock';
  type: 'photo' | 'video' | 'audio' | 'pdf' | 'ebook';
  id: string;
  thumbnail: string;
  title: string;
  author: string;
  authorUrl?: string;
  originalUrl?: string;
  pexelsPhoto?: PexelsPhoto;
  pexelsVideo?: PexelsVideo;
  visustockItem?: FreeItem;
}

const FreeStockLibrary = () => {
  useSEO({
    title: 'Free Stock Library | Photos & Videos | VisuStock',
    description: 'Browse and download free stock photos and videos. High-quality media from VisuStock creators and Pexels.',
  });

  const navigate = useNavigate();
  const [searchInput, setSearchInput] = useState('');
  const [query, setQuery] = useState('');
  const [mediaType, setMediaType] = useState<MediaType>('all');
  const [pexelsPhotos, setPexelsPhotos] = useState<PexelsPhoto[]>([]);
  const [pexelsVideos, setPexelsVideos] = useState<PexelsVideo[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalResults, setTotalResults] = useState(0);
  const [selectedItem, setSelectedItem] = useState<UnifiedItem | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const { user } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [pendingDownload, setPendingDownload] = useState<
    | { kind: 'photo'; photo: PexelsPhoto }
    | { kind: 'video'; video: PexelsVideo }
    | null
  >(null);

  // Fetch VisuStock free content
  const { content: visustockContent, loading: visustockLoading } = useFreeContent(50);

  const fetchPexels = useCallback(async (searchQuery: string, type: 'photos' | 'videos', pageNum: number, append = false) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        query: searchQuery,
        type,
        page: pageNum.toString(),
        per_page: '30',
      });

      const res = await fetch(
        `https://visustock.com/api/pexels-search?${params}`,
        { headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY } }
      );

      if (!res.ok) throw new Error('Failed to fetch');
      const result = await res.json();

      if (type === 'photos') {
        const newPhotos = result.photos || [];
        setPexelsPhotos(prev => append ? [...prev, ...newPhotos] : newPhotos);
        setTotalResults(prev => append ? prev : (result.total_results || 0));
        setHasMore(newPhotos.length === 30);
      } else {
        const newVideos = result.videos || [];
        setPexelsVideos(prev => append ? [...prev, ...newVideos] : newVideos);
        setTotalResults(prev => append ? prev : (result.total_results || 0));
        setHasMore(newVideos.length === 30);
      }
    } catch (err) {
      console.error('Pexels fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    if (mediaType === 'all' || mediaType === 'photos') {
      fetchPexels('', 'photos', 1);
    }
    if (mediaType === 'videos') {
      fetchPexels('', 'videos', 1);
    }
  }, [mediaType]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setQuery(searchInput);
    setPage(1);
    setPexelsPhotos([]);
    setPexelsVideos([]);
    const pexelType = mediaType === 'videos' ? 'videos' : 'photos';
    fetchPexels(searchInput, pexelType, 1);
  };

  const handleTypeChange = (type: MediaType) => {
    setMediaType(type);
    setPage(1);
    setPexelsPhotos([]);
    setPexelsVideos([]);
  };

  // Infinite scroll
  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect();

    observerRef.current = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasMore && !loading) {
          const nextPage = page + 1;
          setPage(nextPage);
          const pexelType = mediaType === 'videos' ? 'videos' : 'photos';
          fetchPexels(query, pexelType, nextPage, true);
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => observerRef.current?.disconnect();
  }, [hasMore, loading, page, query, mediaType, fetchPexels]);

  // Build unified items
  const unifiedItems: UnifiedItem[] = (() => {
    const items: UnifiedItem[] = [];

    // Add VisuStock free items (filtered by media type and search query)
    const filteredVisustock = visustockContent.filter(item => {
      if (mediaType === 'photos' && item.type !== 'photo') return false;
      if (mediaType === 'videos' && item.type !== 'video') return false;
      if (query) {
        const q = query.toLowerCase();
        return item.title.toLowerCase().includes(q) || item.author.toLowerCase().includes(q);
      }
      return true;
    });

    filteredVisustock.forEach(item => {
      items.push({
        source: 'visustock',
        type: item.type,
        id: `vs-${item.id}`,
        thumbnail: item.thumbnail,
        title: item.title,
        author: item.author,
        visustockItem: item,
      });
    });

    // Add Pexels photos
    if (mediaType !== 'videos') {
      pexelsPhotos.forEach(photo => {
        items.push({
          source: 'pexels',
          type: 'photo',
          id: `px-photo-${photo.id}`,
          thumbnail: photo.src.medium,
          title: photo.alt || 'Pexels photo',
          author: photo.photographer,
          authorUrl: photo.photographer_url,
          originalUrl: photo.url,
          pexelsPhoto: photo,
        });
      });
    }

    // Add Pexels videos
    if (mediaType === 'videos' || mediaType === 'all') {
      pexelsVideos.forEach(video => {
        items.push({
          source: 'pexels',
          type: 'video',
          id: `px-video-${video.id}`,
          thumbnail: video.image,
          title: `Video by ${video.user.name}`,
          author: video.user.name,
          authorUrl: video.user.url,
          originalUrl: video.url,
          pexelsVideo: video,
        });
      });
    }

    // Interleave: put VisuStock items at intervals among Pexels items
    const vsItems = items.filter(i => i.source === 'visustock');
    const pxItems = items.filter(i => i.source === 'pexels');

    if (vsItems.length === 0) return pxItems;
    if (pxItems.length === 0) return vsItems;

    const mixed: UnifiedItem[] = [];
    const interval = Math.max(1, Math.floor(pxItems.length / (vsItems.length + 1)));
    let vsIdx = 0;

    pxItems.forEach((item, i) => {
      mixed.push(item);
      if (vsIdx < vsItems.length && (i + 1) % interval === 0) {
        mixed.push(vsItems[vsIdx]);
        vsIdx++;
      }
    });

    // Append remaining VisuStock items
    while (vsIdx < vsItems.length) {
      mixed.push(vsItems[vsIdx]);
      vsIdx++;
    }

    return mixed;
  })();

  const handleItemClick = (item: UnifiedItem) => {
    if (item.source === 'visustock' && item.visustockItem) {
      // Navigate to product detail for VisuStock items
      navigate(`/product/${item.visustockItem.id}`);
    } else {
      setSelectedItem(item);
    }
  };

  const triggerPhotoDownload = useCallback((photo: PexelsPhoto) => {
    // Fire-and-forget tracking — never block the download
    supabase
      .from('pexels_downloads')
      .insert({
        user_id: user!.id,
        pexels_id: photo.id,
        media_type: 'photo',
        author: photo.photographer,
      })
      .then(({ error }) => {
        if (error) console.warn('[pexels_downloads] tracking failed:', error.message);
      });
    window.open(photo.src.original, '_blank');
  }, [user]);

  const triggerVideoDownload = useCallback((video: PexelsVideo) => {
    const best = video.video_files.reduce((a, b) => (a.width > b.width ? a : b));
    supabase
      .from('pexels_downloads')
      .insert({
        user_id: user!.id,
        pexels_id: video.id,
        media_type: 'video',
        author: video.user.name,
      })
      .then(({ error }) => {
        if (error) console.warn('[pexels_downloads] tracking failed:', error.message);
      });
    window.open(best.link, '_blank');
  }, [user]);

  const handleDownloadPexelsPhoto = (photo: PexelsPhoto) => {
    if (!user) {
      setPendingDownload({ kind: 'photo', photo });
      setShowAuthModal(true);
      toast.info('Create a free account to download');
      return;
    }
    triggerPhotoDownload(photo);
  };

  const handleDownloadPexelsVideo = (video: PexelsVideo) => {
    if (!user) {
      setPendingDownload({ kind: 'video', video });
      setShowAuthModal(true);
      toast.info('Create a free account to download');
      return;
    }
    triggerVideoDownload(video);
  };

  // Resume pending download after the user signs in
  useEffect(() => {
    if (user && pendingDownload) {
      if (pendingDownload.kind === 'photo') {
        triggerPhotoDownload(pendingDownload.photo);
      } else {
        triggerVideoDownload(pendingDownload.video);
      }
      setPendingDownload(null);
      setShowAuthModal(false);
    }
  }, [user, pendingDownload, triggerPhotoDownload, triggerVideoDownload]);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'video': return <Video className="h-3 w-3" />;
      case 'audio': return <Music className="h-3 w-3" />;
      case 'pdf':
      case 'ebook': return <FileText className="h-3 w-3" />;
      default: return <Camera className="h-3 w-3" />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="container py-8">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold mb-3">Free Stock Library</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Browse free content from VisuStock creators and millions of photos &amp; videos from Pexels — all in one place.
          </p>
        </div>

        {/* Search & Filters */}
        <div className="max-w-2xl mx-auto mb-8 space-y-4">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search free stock media..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button type="submit" disabled={loading}>
              Search
            </Button>
          </form>

          <div className="flex items-center justify-center gap-2">
            <Button
              variant={mediaType === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleTypeChange('all')}
            >
              All
            </Button>
            <Button
              variant={mediaType === 'photos' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleTypeChange('photos')}
              className="gap-2"
            >
              <Camera className="h-4 w-4" />
              Photos
            </Button>
            <Button
              variant={mediaType === 'videos' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleTypeChange('videos')}
              className="gap-2"
            >
              <Video className="h-4 w-4" />
              Videos
            </Button>
          </div>

          {(totalResults > 0 || visustockContent.length > 0) && (
            <p className="text-center text-sm text-muted-foreground">
              {visustockContent.length > 0 && (
                <span>{visustockContent.length} VisuStock items</span>
              )}
              {visustockContent.length > 0 && totalResults > 0 && ' + '}
              {totalResults > 0 && (
                <span>{totalResults.toLocaleString()} Pexels results</span>
              )}
              {query && ` for "${query}"`}
            </p>
          )}
        </div>

        {/* Unified Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4">
          {unifiedItems.map((item) => {
            if (item.source === 'visustock' && item.visustockItem) {
              const vs = item.visustockItem;
              return (
                <ContentCard
                  key={item.id}
                  id={vs.id}
                  title={vs.title}
                  author={vs.author}
                  price={vs.price}
                  type={vs.type}
                  thumbnail={vs.thumbnail}
                  videoUrl={vs.videoUrl}
                  likes={vs.likes}
                  downloads={vs.downloads}
                  isLiked={vs.isLiked}
                />
              );
            }

            // Pexels item — normalize to PexelsItem for shared PexelsCard
            if (item.pexelsPhoto) {
              const p = item.pexelsPhoto;
              const pxItem: PexelsItem = {
                id: `pexels-photo-${p.id}`,
                numericId: p.id,
                title: p.alt || 'Pexels Photo',
                photographer: p.photographer,
                photographerUrl: p.photographer_url,
                thumbnail: p.src.medium,
                largeThumbnail: p.src.large2x,
                originalUrl: p.src.original,
                pexelsUrl: p.url,
                type: 'photo',
                width: p.width,
                height: p.height,
                alt: p.alt,
              };
              return <PexelsCard key={item.id} item={pxItem} />;
            }
            if (item.pexelsVideo) {
              const v = item.pexelsVideo;
              const hd = v.video_files.find(f => f.quality === 'hd') || v.video_files[0];
              const pxItem: PexelsItem = {
                id: `pexels-video-${v.id}`,
                numericId: v.id,
                title: `Video by ${v.user.name}`,
                photographer: v.user.name,
                photographerUrl: v.user.url,
                thumbnail: v.image,
                largeThumbnail: v.image,
                originalUrl: hd?.link || '',
                pexelsUrl: v.url,
                type: 'video',
                width: v.width,
                height: v.height,
                videoUrl: hd?.link,
              };
              return <PexelsCard key={item.id} item={pxItem} />;
            }
            return null;
          })}
        </div>


        {/* Loading / Load more trigger */}
        {(loading || visustockLoading) && (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}
        {!loading && hasMore && unifiedItems.length > 0 && (
          <div ref={loadMoreRef} className="h-20" />
        )}
        {!loading && !hasMore && unifiedItems.length > 0 && (
          <p className="text-center py-8 text-muted-foreground">No more results</p>
        )}
      </main>

      {/* Pexels Photo Preview Modal */}
      <Dialog open={!!selectedItem?.pexelsPhoto} onOpenChange={() => setSelectedItem(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogTitle className="sr-only">Photo Preview</DialogTitle>
          {selectedItem?.pexelsPhoto && (
            <div className="space-y-4">
              <img
                src={selectedItem.pexelsPhoto.src.large2x}
                alt={selectedItem.pexelsPhoto.alt || 'Photo preview'}
                className="w-full rounded-lg"
              />
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <p className="font-medium">
                    Photo by{' '}
                    <a href={selectedItem.pexelsPhoto.photographer_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                      {selectedItem.pexelsPhoto.photographer}
                    </a>{' '}
                    <span className="text-muted-foreground">via Pexels</span>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {selectedItem.pexelsPhoto.width} × {selectedItem.pexelsPhoto.height}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <a href={selectedItem.pexelsPhoto.url} target="_blank" rel="noopener noreferrer" className="gap-2">
                      <ExternalLink className="h-4 w-4" />
                      View on Pexels
                    </a>
                  </Button>
                  <div className="flex flex-col items-end gap-1">
                    <Button size="sm" onClick={() => handleDownloadPexelsPhoto(selectedItem.pexelsPhoto!)} className="gap-2">
                      <Download className="h-4 w-4" />
                      Download
                    </Button>
                    {!user && (
                      <span className="text-xs text-muted-foreground">Free account required</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Pexels Video Preview Modal */}
      <Dialog open={!!selectedItem?.pexelsVideo} onOpenChange={() => setSelectedItem(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogTitle className="sr-only">Video Preview</DialogTitle>
          {selectedItem?.pexelsVideo && (
            <div className="space-y-4">
              <video
                src={selectedItem.pexelsVideo.video_files.find(f => f.quality === 'hd')?.link || selectedItem.pexelsVideo.video_files[0]?.link}
                controls
                className="w-full rounded-lg"
                poster={selectedItem.pexelsVideo.image}
              />
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <p className="font-medium">
                    Video by{' '}
                    <a href={selectedItem.pexelsVideo.user.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                      {selectedItem.pexelsVideo.user.name}
                    </a>{' '}
                    <span className="text-muted-foreground">via Pexels</span>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {selectedItem.pexelsVideo.width} × {selectedItem.pexelsVideo.height}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <a href={selectedItem.pexelsVideo.url} target="_blank" rel="noopener noreferrer" className="gap-2">
                      <ExternalLink className="h-4 w-4" />
                      View on Pexels
                    </a>
                  </Button>
                  <div className="flex flex-col items-end gap-1">
                    <Button size="sm" onClick={() => handleDownloadPexelsVideo(selectedItem.pexelsVideo!)} className="gap-2">
                      <Download className="h-4 w-4" />
                      Download
                    </Button>
                    {!user && (
                      <span className="text-xs text-muted-foreground">Free account required</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>


      <AuthModal
        isOpen={showAuthModal}
        onClose={() => {
          setShowAuthModal(false);
          if (!user) setPendingDownload(null);
        }}
      />

    </div>
  );
};

export default FreeStockLibrary;
