import React, { useState, useEffect, useRef, useMemo } from 'react';
import { isImagePreloaded, getBlurPlaceholder, preloadImage } from '../../utils/imagePreloader';

/**
 * Optimizes external image URLs (e.g. Unsplash, Cloudinary) to request modern formats (WebP/AVIF)
 * and properly-sized dimensions to drastically reduce network payload.
 */
export function optimizeImageUrl(url: string, targetWidth?: number): string {
  if (!url || typeof url !== 'string') return url;

  // Unsplash dynamic resizing & compression
  if (url.includes('images.unsplash.com')) {
    try {
      const parsed = new URL(url);
      parsed.searchParams.set('auto', 'format');
      parsed.searchParams.set('fit', 'crop');
      parsed.searchParams.set('q', '75');
      if (targetWidth) {
        parsed.searchParams.set('w', String(targetWidth));
      } else if (!parsed.searchParams.has('w')) {
        parsed.searchParams.set('w', '600');
      }
      return parsed.toString();
    } catch {
      return url;
    }
  }

  return url;
}

export interface AppImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  className?: string;
  containerClassName?: string;
  aspectRatio?: string; // e.g. "1/1", "16/9", "4/3"
  fallbackIcon?: React.ReactNode;
  fallbackSrc?: string;
  priority?: boolean;
  targetWidth?: number;
  enableBlurUp?: boolean;
  blurPlaceholder?: string;
  category?: string;
}

export const AppImage: React.FC<AppImageProps> = ({
  src,
  alt,
  className = '',
  containerClassName = '',
  aspectRatio,
  fallbackIcon,
  fallbackSrc = '/free-fire.webp',
  priority = false,
  targetWidth,
  enableBlurUp = true,
  blurPlaceholder,
  category,
  ...props
}) => {
  const optimizedSrc = useMemo(() => optimizeImageUrl(src, targetWidth), [src, targetWidth]);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  // Instant state if already preloaded in memory
  const alreadyPreloaded = isImagePreloaded(optimizedSrc);

  const [shouldLoad, setShouldLoad] = useState<boolean>(() => priority || alreadyPreloaded);
  const [loaded, setLoaded] = useState<boolean>(() => alreadyPreloaded);
  const [currentSrc, setCurrentSrc] = useState<string>(optimizedSrc);
  const [hasError, setHasError] = useState<boolean>(false);

  // Generate lightweight blur placeholder data URI
  const placeholder = useMemo(() => {
    if (blurPlaceholder) return blurPlaceholder;
    return getBlurPlaceholder(src, `${category || ''} ${alt}`);
  }, [blurPlaceholder, src, category, alt]);

  // Synchronize when src changes
  useEffect(() => {
    const nextSrc = optimizeImageUrl(src, targetWidth);
    setCurrentSrc(nextSrc);
    setHasError(false);

    if (isImagePreloaded(nextSrc)) {
      setLoaded(true);
      setShouldLoad(true);
    } else {
      setLoaded(false);
      if (priority) {
        setShouldLoad(true);
      }
    }
  }, [src, targetWidth, priority]);

  // IntersectionObserver for lazy viewport detection
  useEffect(() => {
    if (shouldLoad || priority) return;
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      setShouldLoad(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setShouldLoad(true);
            observer.disconnect();
          }
        });
      },
      {
        rootMargin: '200px 0px',
        threshold: 0.01,
      }
    );

    const el = containerRef.current;
    if (el) {
      observer.observe(el);
    }

    return () => {
      observer.disconnect();
    };
  }, [shouldLoad, priority]);

  const handleError = () => {
    if (!hasError && fallbackSrc && currentSrc !== fallbackSrc) {
      setCurrentSrc(fallbackSrc);
    } else {
      setHasError(true);
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden bg-slate-900/20 ${containerClassName}`}
      style={aspectRatio ? { aspectRatio } : undefined}
    >
      {/* 1. Blur-Up Placeholder Layer with Smooth Cross-Fade */}
      {enableBlurUp && !hasError && (
        <div
          aria-hidden="true"
          className={`absolute inset-0 bg-cover bg-center pointer-events-none transition-opacity duration-500 ease-out z-0 ${
            loaded ? 'opacity-0' : 'opacity-100'
          }`}
          style={{
            backgroundImage: `url("${placeholder}")`,
            filter: 'blur(12px)',
            transform: 'scale(1.1)',
            willChange: 'opacity, filter',
          }}
        />
      )}

      {/* 2. Micro Shimmer Glow during active network loading */}
      {!loaded && !hasError && (
        <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/5 to-white/0 animate-pulse pointer-events-none z-[1]" />
      )}

      {/* 3. Fallback Display if image fails to load entirely */}
      {hasError ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/60 text-slate-400 p-2 text-center text-xs z-10">
          {fallbackIcon || <span className="text-xl">🎮</span>}
          <span className="text-[10px] mt-1 font-bold opacity-75 truncate max-w-full px-1">{alt}</span>
        </div>
      ) : shouldLoad ? (
        <img
          ref={imgRef}
          src={currentSrc}
          alt={alt}
          loading={priority ? 'eager' : 'lazy'}
          fetchPriority={priority ? 'high' : 'auto'}
          decoding="async"
          onLoad={() => {
            setLoaded(true);
            preloadImage(currentSrc);
          }}
          onError={handleError}
          className={`w-full h-full object-cover transition-all duration-500 ease-out relative z-[2] ${
            loaded ? 'opacity-100 filter-none scale-100' : 'opacity-0 filter blur-[4px] scale-[1.03]'
          } ${className}`}
          style={{
            transform: 'translate3d(0, 0, 0)',
            backfaceVisibility: 'hidden',
            imageRendering: '-webkit-optimize-contrast' as any,
            willChange: 'opacity, transform, filter',
            ...props.style,
          }}
          {...props}
        />
      ) : null}
    </div>
  );
};

export default AppImage;
