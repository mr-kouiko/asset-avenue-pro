import { useState, useCallback, useEffect, useRef } from 'react';
import { Header } from '@/components/Header';
import { Navigation } from '@/components/Navigation';
import { Footer } from '@/components/Footer';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Search, Camera, Video, Download, ExternalLink, Loader2, X, User } from 'lucide-react';
import { LazyImage } from '@/components/LazyImage';
import { useSEO } from '@/hooks/useSEO';
import { supabase } from '@/integrations/supabase/client';

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

type MediaType = 'photos' | 'videos';

const FreeStockLibrary = () => {
  useSEO({
    title: 'Free Stock Library | Photos & Videos | VisuStock',
    description: 'Browse and download free stock photos and videos powered by Pexels. High-quality media for your creative projects.',
  });

  const [query, setQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [mediaType, setMediaType] = useState<MediaType>('photos');
  const [photos, setPhotos] = useState<PexelsPhoto[]>([]);
  const [videos, setVideos] = useState<PexelsVideo[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalResults, setTotalResults] = useState(0);
  const [selectedPhoto, setSelectedPhoto] = useState<PexelsPhoto | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<PexelsVideo | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const fetchMedia = useCallback(async (searchQuery: string, type: MediaType, pageNum: number, append = false) => {
    setLoading(true);
    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const params = new URLSearchParams({
        query: searchQuery,
        type,
        page: pageNum.toString(),
        per_page: '30',
      });

      const { data, error } = await supabase.functions.invoke('pexels-search', {
        body: null,
        headers: { 'Content-Type': 'application/json' },
      });

      // Use fetch directly since we need query params
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/pexels-search?${params}`,
        {
          headers: {
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
        }
      );

      if (!res.ok) throw new Error('Failed to fetch');
      const result = await res.json();

      if (type === 'photos') {
        const newPhotos = result.photos || [];
        setPhotos(prev => append ? [...prev, ...newPhotos] : newPhotos);
        setTotalResults(result.total_results || 0);
        setHasMore(newPhotos.length === 30);
      } else {
        const newVideos = result.videos || [];
        setVideos(prev => append ? [...prev, ...newVideos] : newVideos);
        setTotalResults(result.total_results || 0);
        setHasMore(newVideos.length === 30);
      }
    } catch (err) {
      console.error('Pexels fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load with curated content
  useEffect(() => {
    fetchMedia('', mediaType, 1);
  }, [mediaType]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setQuery(searchInput);
    setPage(1);
    setPhotos([]);
    setVideos([]);
    fetchMedia(searchInput, mediaType, 1);
  };

  const handleTypeChange = (type: MediaType) => {
    setMediaType(type);
    setPage(1);
    setPhotos([]);
    setVideos([]);
  };

  // Infinite scroll
  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect();

    observerRef.current = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasMore && !loading) {
          const nextPage = page + 1;
          setPage(nextPage);
          fetchMedia(query, mediaType, nextPage, true);
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => observerRef.current?.disconnect();
  }, [hasMore, loading, page, query, mediaType, fetchMedia]);

  const handleDownloadPhoto = (photo: PexelsPhoto) => {
    window.open(photo.src.original, '_blank');
  };

  const handleDownloadVideo = (video: PexelsVideo) => {
    const best = video.video_files.reduce((a, b) => (a.width > b.width ? a : b));
    window.open(best.link, '_blank');
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <Navigation />

      <main className="container py-8">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold mb-3">Free Stock Library</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Browse millions of free photos and videos powered by Pexels. Use them in your projects or enhance them with our AI tools.
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

          {totalResults > 0 && (
            <p className="text-center text-sm text-muted-foreground">
              {totalResults.toLocaleString()} results {query && `for "${query}"`}
            </p>
          )}
        </div>

        {/* Photo Grid */}
        {mediaType === 'photos' && (
          <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4 space-y-4">
            {photos.map((photo) => (
              <div
                key={photo.id}
                className="break-inside-avoid group relative cursor-pointer rounded-lg overflow-hidden border border-border"
                onClick={() => setSelectedPhoto(photo)}
              >
                <div style={{ aspectRatio: `${photo.width}/${photo.height}` }}>
                  <LazyImage
                    src={photo.src.medium}
                    alt={photo.alt || 'Pexels photo'}
                    className="w-full h-full"
                  />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <User className="h-3.5 w-3.5 text-white shrink-0" />
                        <span className="text-white text-xs truncate">{photo.photographer}</span>
                      </div>
                      <Badge variant="secondary" className="text-[10px] shrink-0 bg-white/20 text-white border-0">
                        via Pexels
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Video Grid */}
        {mediaType === 'videos' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {videos.map((video) => (
              <div
                key={video.id}
                className="group relative cursor-pointer rounded-lg overflow-hidden border border-border aspect-video"
                onClick={() => setSelectedVideo(video)}
              >
                <LazyImage
                  src={video.image}
                  alt={`Video by ${video.user.name}`}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-2 left-2">
                  <Badge className="bg-black/60 text-white border-0 text-[10px]">
                    <Video className="h-3 w-3 mr-1" />
                    Video
                  </Badge>
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="absolute bottom-0 left-0 right-0 p-3 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5 text-white" />
                      <span className="text-white text-xs">{video.user.name}</span>
                    </div>
                    <Badge variant="secondary" className="text-[10px] bg-white/20 text-white border-0">
                      via Pexels
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Loading / Load more trigger */}
        {loading && (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}
        {!loading && hasMore && (photos.length > 0 || videos.length > 0) && (
          <div ref={loadMoreRef} className="h-20" />
        )}
        {!loading && !hasMore && (photos.length > 0 || videos.length > 0) && (
          <p className="text-center py-8 text-muted-foreground">No more results</p>
        )}
      </main>

      {/* Photo Preview Modal */}
      <Dialog open={!!selectedPhoto} onOpenChange={() => setSelectedPhoto(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogTitle className="sr-only">Photo Preview</DialogTitle>
          {selectedPhoto && (
            <div className="space-y-4">
              <img
                src={selectedPhoto.src.large2x}
                alt={selectedPhoto.alt || 'Photo preview'}
                className="w-full rounded-lg"
              />
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <p className="font-medium">
                    Photo by{' '}
                    <a
                      href={selectedPhoto.photographer_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      {selectedPhoto.photographer}
                    </a>{' '}
                    <span className="text-muted-foreground">via Pexels</span>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {selectedPhoto.width} × {selectedPhoto.height}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <a href={selectedPhoto.url} target="_blank" rel="noopener noreferrer" className="gap-2">
                      <ExternalLink className="h-4 w-4" />
                      View on Pexels
                    </a>
                  </Button>
                  <Button size="sm" onClick={() => handleDownloadPhoto(selectedPhoto)} className="gap-2">
                    <Download className="h-4 w-4" />
                    Download
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Video Preview Modal */}
      <Dialog open={!!selectedVideo} onOpenChange={() => setSelectedVideo(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogTitle className="sr-only">Video Preview</DialogTitle>
          {selectedVideo && (
            <div className="space-y-4">
              <video
                src={selectedVideo.video_files.find(f => f.quality === 'hd')?.link || selectedVideo.video_files[0]?.link}
                controls
                className="w-full rounded-lg"
                poster={selectedVideo.image}
              />
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <p className="font-medium">
                    Video by{' '}
                    <a
                      href={selectedVideo.user.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      {selectedVideo.user.name}
                    </a>{' '}
                    <span className="text-muted-foreground">via Pexels</span>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {selectedVideo.width} × {selectedVideo.height}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <a href={selectedVideo.url} target="_blank" rel="noopener noreferrer" className="gap-2">
                      <ExternalLink className="h-4 w-4" />
                      View on Pexels
                    </a>
                  </Button>
                  <Button size="sm" onClick={() => handleDownloadVideo(selectedVideo)} className="gap-2">
                    <Download className="h-4 w-4" />
                    Download
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
};

export default FreeStockLibrary;
