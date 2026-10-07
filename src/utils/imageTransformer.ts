/**
 * High-Performance Automated Image Transformation & Modern Format Utility
 * Supports browser capability detection for AVIF & WebP formats,
 * responsive srcset generation, and automated server-side transformation.
 */

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

// In-memory cache for format support detection
let isAvifSupportedCache: boolean | null = null;
let isWebpSupportedCache: boolean | null = null;

/**
 * Detects whether the current browser supports AVIF format.
 */
export function supportsAvif(): boolean {
  if (typeof window === 'undefined' || typeof document === 'undefined') return false;
  if (isAvifSupportedCache !== null) return isAvifSupportedCache;

  try {
    const elem = document.createElement('canvas');
    if (elem.getContext && elem.getContext('2d')) {
      isAvifSupportedCache = elem.toDataURL('image/avif').indexOf('data:image/avif') === 0;
    } else {
      isAvifSupportedCache = false;
    }
  } catch {
    isAvifSupportedCache = false;
  }

  return isAvifSupportedCache;
}

/**
 * Detects whether the current browser supports WebP format.
 */
export function supportsWebp(): boolean {
  if (typeof window === 'undefined' || typeof document === 'undefined') return false;
  if (isWebpSupportedCache !== null) return isWebpSupportedCache;

  try {
    const elem = document.createElement('canvas');
    if (elem.getContext && elem.getContext('2d')) {
      isWebpSupportedCache = elem.toDataURL('image/webp').indexOf('data:image/webp') === 0;
    } else {
      isWebpSupportedCache = true; // Modern browsers fallback
    }
  } catch {
    isWebpSupportedCache = true;
  }

  return isWebpSupportedCache;
}

export interface ImageSources {
  avifUrl: string;
  webpUrl: string;
  fallbackUrl: string;
  preferredUrl: string;
  avifSrcSet: string;
  webpSrcSet: string;
  fallbackSrcSet: string;
}

/**
 * Generates automated transformed URLs for AVIF, WebP, and fallback formats.
 */
export function getOptimizedImageSources(
  url: string,
  targetWidth?: number,
  quality = 80
): ImageSources {
  if (!url || typeof url !== 'string') {
    return {
      avifUrl: url || '',
      webpUrl: url || '',
      fallbackUrl: url || '',
      preferredUrl: url || '',
      avifSrcSet: '',
      webpSrcSet: '',
      fallbackSrcSet: '',
    };
  }

  // Data URIs and SVGs don't require external transformation
  if (url.startsWith('data:') || url.endsWith('.svg') || url.includes('.svg?')) {
    return {
      avifUrl: url,
      webpUrl: url,
      fallbackUrl: url,
      preferredUrl: url,
      avifSrcSet: '',
      webpSrcSet: '',
      fallbackSrcSet: '',
    };
  }

  let avifUrl = url;
  let webpUrl = url;
  let fallbackUrl = url;

  // 1. Unsplash Dynamic Image API Optimization
  if (url.includes('images.unsplash.com')) {
    try {
      const parsedAvif = new URL(url);
      parsedAvif.searchParams.set('auto', 'format');
      parsedAvif.searchParams.set('fm', 'avif');
      parsedAvif.searchParams.set('fit', 'crop');
      parsedAvif.searchParams.set('q', String(quality));
      if (targetWidth) parsedAvif.searchParams.set('w', String(targetWidth));
      avifUrl = parsedAvif.toString();

      const parsedWebp = new URL(url);
      parsedWebp.searchParams.set('auto', 'format');
      parsedWebp.searchParams.set('fm', 'webp');
      parsedWebp.searchParams.set('fit', 'crop');
      parsedWebp.searchParams.set('q', String(quality));
      if (targetWidth) parsedWebp.searchParams.set('w', String(targetWidth));
      webpUrl = parsedWebp.toString();

      const parsedFallback = new URL(url);
      parsedFallback.searchParams.set('auto', 'format');
      parsedFallback.searchParams.set('fit', 'crop');
      parsedFallback.searchParams.set('q', String(quality));
      if (targetWidth) parsedFallback.searchParams.set('w', String(targetWidth));
      fallbackUrl = parsedFallback.toString();
    } catch {
      // Keep defaults
    }
  } else if (url.startsWith('http://') || url.startsWith('https://')) {
    // 2. Automated Server Transformation Proxy (/api/image/transform)
    const encodedUrl = encodeURIComponent(url);
    const widthParam = targetWidth ? `&w=${targetWidth}` : '';
    const qualParam = `&q=${quality}`;

    avifUrl = `/api/image/transform?url=${encodedUrl}&fmt=avif${widthParam}${qualParam}`;
    webpUrl = `/api/image/transform?url=${encodedUrl}&fmt=webp${widthParam}${qualParam}`;
    fallbackUrl = `/api/image/transform?url=${encodedUrl}&fmt=jpeg${widthParam}${qualParam}`;
  }

  // Determine preferred format based on browser capability
  let preferredUrl = fallbackUrl;
  if (supportsAvif()) {
    preferredUrl = avifUrl;
  } else if (supportsWebp()) {
    preferredUrl = webpUrl;
  }

  // Generate responsive 1x and 2x srcsets for retina screens
  const generateSrcSet = (fmtUrl: string, width?: number) => {
    if (!width) return '';
    if (fmtUrl.includes('/api/image/transform')) {
      const doubleWidth = Math.min(width * 2, 1920);
      const url2x = fmtUrl.replace(`&w=${width}`, `&w=${doubleWidth}`);
      return `${fmtUrl} 1x, ${url2x} 2x`;
    }
    return '';
  };

  return {
    avifUrl,
    webpUrl,
    fallbackUrl,
    preferredUrl,
    avifSrcSet: generateSrcSet(avifUrl, targetWidth),
    webpSrcSet: generateSrcSet(webpUrl, targetWidth),
    fallbackSrcSet: generateSrcSet(fallbackUrl, targetWidth),
  };
}
