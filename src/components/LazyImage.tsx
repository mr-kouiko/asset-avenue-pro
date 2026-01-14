import { useState, useRef, useEffect, memo } from 'react';
import { cn } from '@/lib/utils';
import defaultThumbnail from '@/assets/default-thumbnail.jpg';

interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  fallbackSrc?: string;
  onLoad?: () => void;
  onError?: () => void;
  priority?: boolean; // For above-the-fold images
}

export const LazyImage: React.FC<LazyImageProps> = memo(({
  src,
  alt,
  className,
  fallbackSrc = defaultThumbnail,
  onLoad,
  onError,
  priority = false,
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isError, setIsError] = useState(false);
  const [isVisible, setIsVisible] = useState(priority); // Priority images load immediately
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    // Skip intersection observer for priority images
    if (priority) return;
    
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { 
        threshold: 0.1,
        rootMargin: '200px' // Start loading 200px before entering viewport
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, [priority]);

  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    setIsError(true);
    onError?.();
  };

  const imageSrc = isError ? fallbackSrc : src;

  return (
    <div ref={imgRef} className={cn("relative overflow-hidden", className)}>
      {/* Loading skeleton - only show if not loaded yet */}
      {!isLoaded && (
        <div className="absolute inset-0 bg-muted animate-pulse" />
      )}
      
      {/* Image - use native loading attribute */}
      {isVisible && (
        <img
          src={imageSrc}
          alt={alt}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          fetchPriority={priority ? "high" : "auto"}
          className={cn(
            "w-full h-full object-cover transition-opacity duration-200",
            isLoaded ? "opacity-100" : "opacity-0"
          )}
          onLoad={handleLoad}
          onError={handleError}
        />
      )}
    </div>
  );
});

LazyImage.displayName = 'LazyImage';