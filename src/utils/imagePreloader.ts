/**
 * High-Performance Image Preloader & Blur-Up Memory Cache Engine
 * Provides:
 * - Lazy loading with intersection observation & pre-warming
 * - Ultra-lightweight SVG blur-up placeholders for product art
 * - In-memory preloaded cache tracking to prevent image flicker
 * - Smooth GPU cross-fading for all product shop cards
 */

const CRITICAL_APP_ASSETS = [
  // App Branding & Logos
  'https://pub-f5b49392d8cb47b0b42800e81d2216c0.r2.dev/App%20Logo/unx.png',
  '/logo.png',
  '/free-fire.webp',

  // Official R2 Banners
  'https://pub-f5b49392d8cb47b0b42800e81d2216c0.r2.dev/Banners/free%20fire%20Banner.png',
  'https://pub-f5b49392d8cb47b0b42800e81d2216c0.r2.dev/Banners/Pubg%20banner.png',
  'https://pub-f5b49392d8cb47b0b42800e81d2216c0.r2.dev/Banners/Roblox%20banner.png',
  'https://pub-f5b49392d8cb47b0b42800e81d2216c0.r2.dev/Banners/Mobile%20legend%20banner.png',
  'https://pub-f5b49392d8cb47b0b42800e81d2216c0.r2.dev/Banners/Stem%20Wallte%20banner.png',
];

// In-memory set of verified loaded images
const preloadedCache = new Set<string>();

/**
 * Checks if a specific image URL is already loaded and ready in browser memory.
 */
export function isImagePreloaded(url?: string | null): boolean {
  if (!url || typeof window === 'undefined') return false;
  return preloadedCache.has(url);
}

/**
 * Preload a single image with Promise resolution.
 */
export function preloadImage(url: string, priority: 'high' | 'low' = 'low'): Promise<boolean> {
  if (typeof window === 'undefined' || !url) return Promise.resolve(false);
  if (preloadedCache.has(url)) return Promise.resolve(true);

  return new Promise((resolve) => {
    try {
      const img = new Image();
      if (priority === 'high') {
        img.fetchPriority = 'high';
      }
      img.decoding = 'async';
      img.onload = () => {
        preloadedCache.add(url);
        resolve(true);
      };
      img.onerror = () => {
        resolve(false);
      };
      img.src = url;

      if (img.complete && img.naturalWidth > 0) {
        preloadedCache.add(url);
        resolve(true);
      }
    } catch {
      resolve(false);
    }
  });
}

/**
 * Preloads an array of image URLs into browser memory cache.
 */
export function preloadImages(urls: string[], priority: 'high' | 'low' = 'high'): void {
  if (typeof window === 'undefined') return;

  urls.forEach((url) => {
    if (!url || preloadedCache.has(url)) return;

    try {
      const img = new Image();
      if (priority === 'high') {
        img.fetchPriority = 'high';
      }
      img.decoding = 'async';
      img.onload = () => {
        preloadedCache.add(url);
      };
      img.src = url;
    } catch {
      // Ignore preloader errors
    }
  });
}

/**
 * Generates an ultra-lightweight SVG blur-up placeholder data URI.
 * Renders instantaneously (<300 bytes) with customized gaming gradients matching the game theme.
 */
export function getBlurPlaceholder(url?: string, context?: string): string {
  const text = `${url || ''} ${context || ''}`.toLowerCase();

  let c1 = '#1e1b4b'; // indigo-950
  let c2 = '#312e81'; // indigo-900
  let c3 = '#0f172a'; // slate-900

  if (text.includes('free fire') || text.includes('freefire')) {
    c1 = '#450a0a'; // red-950
    c2 = '#7f1d1d'; // red-900
    c3 = '#18181b'; // zinc-900
  } else if (text.includes('pubg')) {
    c1 = '#422006'; // amber-950
    c2 = '#78350f'; // amber-900
    c3 = '#1c1917'; // stone-900
  } else if (text.includes('roblox')) {
    c1 = '#500724'; // rose-950
    c2 = '#881337'; // rose-900
    c3 = '#171717'; // neutral-900
  } else if (text.includes('mobile legend') || text.includes('mlbb')) {
    c1 = '#082f49'; // sky-950
    c2 = '#0c4a6e'; // sky-900
    c3 = '#0f172a'; // slate-900
  } else if (text.includes('steam')) {
    c1 = '#0f172a'; // slate-900
    c2 = '#1e293b'; // slate-800
    c3 = '#020617'; // slate-950
  } else if (text.includes('gift') || text.includes('voucher') || text.includes('card')) {
    c1 = '#3b0764'; // purple-950
    c2 = '#581c87'; // purple-900
    c3 = '#18181b'; // zinc-900
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" width="40" height="40">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${c1}" />
        <stop offset="50%" stop-color="${c2}" />
        <stop offset="100%" stop-color="${c3}" />
      </linearGradient>
      <filter id="b" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="4" />
      </filter>
    </defs>
    <rect width="40" height="40" fill="url(#g)" filter="url(#b)" />
    <circle cx="20" cy="20" r="12" fill="${c2}" opacity="0.6" filter="url(#b)" />
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg.replace(/\s+/g, ' ').trim())}`;
}

// Map of DOM elements to target preload URLs & callbacks for shared IntersectionObserver
const lazyPreloadMap = new WeakMap<Element, { urls: string[]; priority: 'high' | 'low'; onLoaded?: () => void }>();

// Centralized high-efficiency shared IntersectionObserver instance
let sharedLazyObserver: IntersectionObserver | null = null;

function getSharedLazyObserver(): IntersectionObserver | null {
  if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
    return null;
  }

  if (!sharedLazyObserver) {
    try {
      sharedLazyObserver = new IntersectionObserver(
        (entries, observer) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              const target = entry.target;
              const config = lazyPreloadMap.get(target);
              if (config) {
                config.urls.forEach((url) => {
                  preloadImage(url, config.priority).then((success) => {
                    if (success && config.onLoaded) {
                      config.onLoaded();
                    }
                  });
                });
                lazyPreloadMap.delete(target);
              }
              observer.unobserve(target);
            }
          });
        },
        {
          rootMargin: '250px 0px', // Trigger preloading 250px before entering viewport for seamless instant render
          threshold: 0.01,
        }
      );
    } catch {
      sharedLazyObserver = null;
    }
  }

  return sharedLazyObserver;
}

/**
 * Registers an element to lazily preload image(s) when approaching viewport.
 * If IntersectionObserver is not supported or image is already cached, loads immediately.
 */
export function registerLazyPreloadTarget(
  element: Element | null,
  urlOrUrls: string | string[],
  options: { priority?: 'high' | 'low'; onLoaded?: () => void } = {}
): () => void {
  if (!element || typeof window === 'undefined') return () => {};

  const urls = (Array.isArray(urlOrUrls) ? urlOrUrls : [urlOrUrls]).filter(Boolean);
  if (urls.length === 0) return () => {};

  // If all URLs are already preloaded in memory, invoke callback immediately and skip observing
  const allLoaded = urls.every((u) => preloadedCache.has(u));
  if (allLoaded) {
    if (options.onLoaded) options.onLoaded();
    return () => {};
  }

  const observer = getSharedLazyObserver();
  if (!observer) {
    // Fallback: preload via idle callback if no observer support
    if ('requestIdleCallback' in window) {
      (window as any).requestIdleCallback(() => preloadImages(urls, options.priority || 'low'), { timeout: 2000 });
    } else {
      setTimeout(() => preloadImages(urls, options.priority || 'low'), 300);
    }
    return () => {};
  }

  lazyPreloadMap.set(element, {
    urls,
    priority: options.priority || 'low',
    onLoaded: options.onLoaded,
  });

  observer.observe(element);

  return () => {
    observer.unobserve(element);
    lazyPreloadMap.delete(element);
  };
}

/**
 * Pre-warms non-critical product catalogue images using lazy Intersection Observation.
 * Eagerly preloads only the top critical slots (default: 4) and attaches intersection observers
 * for remaining items to minimize initial network payload.
 */
export function preloadProductImages(
  products: Array<{ image?: string; id?: string; name?: string }>,
  eagerLimit = 4
): void {
  if (typeof window === 'undefined' || !Array.isArray(products)) return;

  const validProducts = products.filter(
    (p) => typeof p.image === 'string' && p.image.length > 0 && !preloadedCache.has(p.image)
  );

  if (validProducts.length === 0) return;

  // 1. Eagerly preload top critical visible items during idle time
  const criticalUrls = validProducts.slice(0, eagerLimit).map((p) => p.image as string);
  if (criticalUrls.length > 0) {
    const warmUpCritical = () => {
      preloadImages(criticalUrls, 'high');
    };
    if ('requestIdleCallback' in window) {
      (window as any).requestIdleCallback(warmUpCritical, { timeout: 1500 });
    } else {
      setTimeout(warmUpCritical, 100);
    }
  }

  // 2. Remaining non-critical products are registered for viewport-based lazy loading
  // to avoid consuming mobile data or stalling the initial page load
  const nonCriticalProducts = validProducts.slice(eagerLimit);
  if (nonCriticalProducts.length > 0 && typeof document !== 'undefined') {
    const queueNonCritical = () => {
      nonCriticalProducts.forEach((p) => {
        if (!p.id || !p.image) return;
        const domEl = document.querySelector(`[data-product-id="${p.id}"]`) || document.querySelector(`#product-${p.id}`);
        if (domEl) {
          registerLazyPreloadTarget(domEl, p.image, { priority: 'low' });
        }
      });
    };

    if ('requestIdleCallback' in window) {
      (window as any).requestIdleCallback(queueNonCritical, { timeout: 3000 });
    } else {
      setTimeout(queueNonCritical, 500);
    }
  }
}

/**
 * Creates a dedicated lazy intersection observer for dynamic DOM components.
 */
export function createLazyImageObserver(
  onIntersect: (target: Element) => void,
  rootMargin = '250px 0px'
): IntersectionObserver | null {
  if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
    return null;
  }

  try {
    return new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            onIntersect(entry.target);
            observer.unobserve(entry.target);
          }
        });
      },
      {
        rootMargin,
        threshold: 0.01,
      }
    );
  } catch {
    return null;
  }
}

/**
 * Bootstraps critical app branding images on startup.
 */
export function initImagePreloader(): void {
  if (typeof window === 'undefined') return;

  const warmUp = () => {
    preloadImages(CRITICAL_APP_ASSETS, 'high');
  };

  if ('requestIdleCallback' in window) {
    (window as any).requestIdleCallback(warmUp, { timeout: 1000 });
  } else {
    setTimeout(warmUp, 100);
  }
}
