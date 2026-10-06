import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useStore } from '../context/StoreContext';
import { formatNPR, formatDate, formatRelativeTime } from '../utils/formatters';
import { Banner } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import {
  Flame,
  ArrowRight,
  Gamepad2,
  Smartphone,
  Monitor,
  Gamepad,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Gift,
  Newspaper,
  Calendar,
  CheckCircle2,
  Tag,
  Ticket,
  ShieldCheck,
  Zap,
  Lock,
  Headphones,
  QrCode,
  Wallet,
  Phone,
  MessageCircle,
} from 'lucide-react';
import { ReviewSlider } from '../components/reviews/ReviewSlider';
import { SpecialOffersSection } from '../components/common/SpecialOffersSection';
import { preloadProductImages } from '../utils/imagePreloader';
import { handleImageError, getSafeGameImage } from '../utils/imageFallback';

// Exactly 5 Master R2 Banners for Unx Games
export interface MasterBannerItem {
  id: string;
  type: 'hero';
  title: string;
  productId: string;
  actionTarget?: string;
  image: string;
  mobileImage: string;
  sortOrder: number;
  offerTitle: string;
  offerSubtitle: string;
}

export const MASTER_BANNERS: MasterBannerItem[] = [
  {
    id: 'banner-free-fire',
    type: 'hero',
    title: 'Free Fire',
    productId: 'prod-free-fire',
    image: 'https://pub-f5b49392d8cb47b0b42800e81d2216c0.r2.dev/Banners/free%20fire%20Banner.png',
    mobileImage: 'https://pub-f5b49392d8cb47b0b42800e81d2216c0.r2.dev/Banners/free%20fire%20Banner.png',
    sortOrder: 1,
    offerTitle: '🔥 Special Top-Up Offers',
    offerSubtitle: 'Best Price • Instant Delivery',
  },
  {
    id: 'banner-pubg',
    type: 'hero',
    title: 'PUBG',
    productId: 'prod-pubg-mobile',
    image: 'https://pub-f5b49392d8cb47b0b42800e81d2216c0.r2.dev/Banners/Pubg%20banner.png',
    mobileImage: 'https://pub-f5b49392d8cb47b0b42800e81d2216c0.r2.dev/Banners/Pubg%20banner.png',
    sortOrder: 2,
    offerTitle: '🎮 PUBG UC Offers',
    offerSubtitle: 'Instant UC Top-Up',
  },
  {
    id: 'banner-roblox',
    type: 'hero',
    title: 'Roblox',
    productId: 'prod-roblox-robux',
    image: 'https://pub-f5b49392d8cb47b0b42800e81d2216c0.r2.dev/Banners/Roblox%20banner.png',
    mobileImage: 'https://pub-f5b49392d8cb47b0b42800e81d2216c0.r2.dev/Banners/Roblox%20banner.png',
    sortOrder: 3,
    offerTitle: '⚡ Roblox Robux Deals',
    offerSubtitle: 'Fast & Secure Delivery',
  },
  {
    id: 'banner-mobile-legends',
    type: 'hero',
    title: 'Mobile Legends',
    productId: 'prod-mobile-legends',
    image: 'https://pub-f5b49392d8cb47b0b42800e81d2216c0.r2.dev/Banners/Mobile%20legend%20banner.png',
    mobileImage: 'https://pub-f5b49392d8cb47b0b42800e81d2216c0.r2.dev/Banners/Mobile%20legend%20banner.png',
    sortOrder: 4,
    offerTitle: '💎 Mobile Legends Diamonds',
    offerSubtitle: 'Special Top-Up Price',
  },
  {
    id: 'banner-steam-wallet',
    type: 'hero',
    title: 'Steam Wallet',
    productId: 'prod-steam-wallet',
    image: 'https://pub-f5b49392d8cb47b0b42800e81d2216c0.r2.dev/Banners/Stem%20Wallte%20banner.png',
    mobileImage: 'https://pub-f5b49392d8cb47b0b42800e81d2216c0.r2.dev/Banners/Stem%20Wallte%20banner.png',
    sortOrder: 5,
    offerTitle: '🎮 Steam Wallet Offers',
    offerSubtitle: 'Instant Gift Card Delivery',
  },
];

// Helper to resolve offer details for any banner
export const getBannerOfferDetails = (banner?: Partial<MasterBannerItem> | Banner | null) => {
  if (!banner) {
    return {
      title: '🔥 Special Top-Up Offers',
      subtitle: 'Best Price • Instant Delivery',
    };
  }
  const title = ((banner as any).title || '').toLowerCase();
  const id = ((banner as any).id || '').toLowerCase();

  if (title.includes('free fire') || id.includes('free-fire') || id.includes('freefire')) {
    return {
      title: '🔥 Special Top-Up Offers',
      subtitle: 'Best Price • Instant Delivery',
    };
  }
  if (title.includes('pubg') || id.includes('pubg')) {
    return {
      title: '🎮 PUBG UC Offers',
      subtitle: 'Instant UC Top-Up',
    };
  }
  if (title.includes('roblox') || id.includes('roblox')) {
    return {
      title: '⚡ Roblox Robux Deals',
      subtitle: 'Fast & Secure Delivery',
    };
  }
  if (title.includes('mobile legend') || title.includes('mlbb') || id.includes('mobile-legend')) {
    return {
      title: '💎 Mobile Legends Diamonds',
      subtitle: 'Special Top-Up Price',
    };
  }
  if (title.includes('steam') || id.includes('steam')) {
    return {
      title: '🎮 Steam Wallet Offers',
      subtitle: 'Instant Gift Card Delivery',
    };
  }

  return {
    title: (banner as any).offerTitle || ((banner as any).title ? `⚡ ${(banner as any).title} Offers` : '🔥 Special Gaming Offers'),
    subtitle: (banner as any).offerSubtitle || 'Fast & Secure Delivery',
  };
};

export const HomePage: React.FC = () => {
  const {
    activeProducts,
    setSelectedProductId,
    setCurrentTab,
    news,
    banners,
    handleBannerClick,
    categories,
    reviews,
    isLoadingProducts,
    isLoadingNews,
  } = useStore();

  const dynamicAvgRating = useMemo(() => {
    if (!reviews || reviews.length === 0) return '5.0';
    const sum = reviews.reduce((acc, r) => acc + (r.rating || 5), 0);
    return (sum / reviews.length).toFixed(1);
  }, [reviews]);

  const dynamicReviewsCount = reviews ? reviews.length : 0;

  // Active Hero Banners: Strictly use the 5 Master R2 Banners in exact order
  const activeHeroBanners = useMemo(() => {
    const valid = banners.filter(
      (b) => b.status === 'active' && b.image && b.image.includes('pub-f5b49392d8cb47b0b42800e81d2216c0.r2.dev/Banners')
    );
    if (valid.length === 5) {
      return [...valid].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    }
    return MASTER_BANNERS;
  }, [banners]);

  // Category Filter State
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  // Recently Visited Products state
  const [recentlyVisited, setRecentlyVisited] = useState<any[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('ghn_recently_visited');
      if (stored) {
        const ids: string[] = JSON.parse(stored);
        const list = Array.from(new Set(ids))
          .map((id) => activeProducts.find((p) => p.id === id))
          .filter((p): p is any => !!p);
        setRecentlyVisited(list);
      }
    } catch (e) {
      console.warn('Failed to load recently visited products', e);
    }
  }, [activeProducts]);

  // Preload top catalogue products during idle time
  useEffect(() => {
    if (activeProducts && activeProducts.length > 0) {
      preloadProductImages(activeProducts, 10);
    }
  }, [activeProducts]);

  // --- Hero Slider State & Touch Handlers ---
  const [heroIndex, setHeroIndex] = useState<number>(0);
  const [heroDirection, setHeroDirection] = useState<number>(1);
  const [isHeroPaused, setIsHeroPaused] = useState<boolean>(false);
  const heroTouchStartX = useRef<number | null>(null);
  const heroTouchStartY = useRef<number | null>(null);

  // Preload all 5 banner images to ensure instant, zero-flicker transitions
  useEffect(() => {
    activeHeroBanners.forEach((b) => {
      if (b.image) {
        const img = new Image();
        img.src = b.image;
      }
      if ((b as any).mobileImage) {
        const img = new Image();
        img.src = (b as any).mobileImage;
      }
    });
  }, [activeHeroBanners]);

  // Page Visibility API: Pause auto-play when tab is in background, resume when active
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setIsHeroPaused(true);
      } else {
        setIsHeroPaused(false);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const nextHeroSlide = () => {
    if (activeHeroBanners.length === 0) return;
    setHeroDirection(1);
    setHeroIndex((prev) => (prev + 1) % activeHeroBanners.length);
  };

  const prevHeroSlide = () => {
    if (activeHeroBanners.length === 0) return;
    setHeroDirection(-1);
    setHeroIndex((prev) => (prev === 0 ? activeHeroBanners.length - 1 : prev - 1));
  };

  // Auto-slide Hero Carousel every 4.5s with timer reset on manual interaction
  useEffect(() => {
    if (isHeroPaused || activeHeroBanners.length === 0) return;
    const interval = setInterval(() => {
      setHeroDirection(1);
      setHeroIndex((prev) => (prev + 1) % activeHeroBanners.length);
    }, 4500);
    return () => clearInterval(interval);
  }, [isHeroPaused, activeHeroBanners.length, heroIndex]);

  // Product Navigation
  const handleProductClick = (productId: string) => {
    setSelectedProductId(productId);
    setCurrentTab('product_detail');
    try {
      const mainEl = document.getElementById('app-main-content') || document.querySelector('main');
      if (mainEl) mainEl.scrollTo({ top: 0, behavior: 'instant' });
    } catch {}
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  // Resolve dynamic active product for hero slide or fallback
  const getProductForHero = (productId: string) => {
    return activeProducts.find((p) => p.id === productId) || null;
  };

  // Category scroll ref & Popular Top-Ups scroll ref
  const categoryScrollRef = useRef<HTMLDivElement>(null);
  const popularScrollRef = useRef<HTMLDivElement>(null);
  const popularProducts = useMemo(() => {
    return activeProducts
      .filter((p) => p.category !== 'Offer' && p.category !== 'Special Offers')
      .slice(0, 8);
  }, [activeProducts]);

  const getCategoryIcon = (iconName?: string) => {
    switch ((iconName || '').toLowerCase()) {
      case 'smartphone':
        return <Smartphone size={14} />;
      case 'monitor':
        return <Monitor size={14} />;
      case 'gamepad':
        return <Gamepad size={14} />;
      case 'gamepad2':
        return <Gamepad2 size={14} />;
      case 'ticket':
        return <Ticket size={14} />;
      case 'sparkles':
      case 'crown':
        return <Sparkles size={14} />;
      case 'gift':
        return <Gift size={14} />;
      default:
        return <Flame size={14} />;
    }
  };

  // Filtered All Products
  const filteredProducts = useMemo(() => {
    const valid = activeProducts.filter((p) => p.category !== 'Offer' && p.category !== 'Special Offers');
    if (selectedCategory === 'All') return valid;
    const q = selectedCategory.toLowerCase();
    return valid.filter((p) => {
      return (
        p.category === selectedCategory ||
        p.categoryId === selectedCategory ||
        p.category_id === selectedCategory ||
        p.categoryName?.toLowerCase() === q ||
        p.categorySlug?.toLowerCase() === q ||
        (q === 'mobile' && (p.categoryId === 'cat-mobile' || p.categorySlug === 'mobile' || p.category?.toLowerCase().includes('mobile'))) ||
        (q === 'pc' && (p.categoryId === 'cat-pc' || p.categorySlug === 'pc-console' || p.categorySlug === 'pc' || p.category?.toLowerCase().includes('pc'))) ||
        (q === 'console' && (p.categoryId === 'cat-console' || p.categorySlug === 'console' || p.category?.toLowerCase().includes('console'))) ||
        (q === 'gift cards' && (p.categoryId === 'cat-giftcards' || p.categorySlug === 'gift-cards' || p.category?.toLowerCase().includes('gift'))) ||
        (q === 'game vouchers' && (p.categoryId === 'cat-vouchers' || p.categorySlug === 'vouchers' || p.category?.toLowerCase().includes('voucher'))) ||
        (q === 'memberships' && (p.categoryId === 'cat-subscriptions' || p.categorySlug === 'subscriptions' || p.category?.toLowerCase().includes('membership') || p.category?.toLowerCase().includes('nitro')))
      );
    });
  }, [activeProducts, selectedCategory]);

  // Published News for Preview (2-3 items)
  const previewNews = useMemo(() => {
    return news.filter((n) => n.published).slice(0, 3);
  }, [news]);

  // Touch event handlers for Hero Slider with horizontal dominance check
  const handleHeroTouchStart = (e: React.TouchEvent) => {
    setIsHeroPaused(true);
    heroTouchStartX.current = e.touches[0].clientX;
    heroTouchStartY.current = e.touches[0].clientY;
  };

  const handleHeroTouchEnd = (e: React.TouchEvent) => {
    if (heroTouchStartX.current === null || activeHeroBanners.length === 0) {
      setIsHeroPaused(false);
      return;
    }
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const diffX = heroTouchStartX.current - touchEndX;
    const diffY = (heroTouchStartY.current ?? touchEndY) - touchEndY;

    if (Math.abs(diffX) > 35 && Math.abs(diffX) > Math.abs(diffY)) {
      if (diffX > 0) {
        nextHeroSlide();
      } else {
        prevHeroSlide();
      }
    }
    heroTouchStartX.current = null;
    heroTouchStartY.current = null;
    setIsHeroPaused(false);
  };

  const safeHeroIndex = heroIndex % (activeHeroBanners.length || 1);
  const currentHeroBanner = activeHeroBanners[safeHeroIndex] || activeHeroBanners[0];
  const currentOffer = getBannerOfferDetails(currentHeroBanner);

  return (
    <div className="w-full bg-transparent font-sans space-y-2 sm:space-y-2 select-none">

      {/* ========================================================================= */}
      {/* HERO PRODUCT/BANNER SLIDER — 5 MASTER R2 BANNERS                          */}
      {/* ========================================================================= */}
      <section className="max-w-7xl mx-auto px-2 sm:px-2">
        <div
          id="hero-banner-carousel"
          className="relative w-full rounded-2xl sm:rounded-3xl overflow-hidden aspect-[16/9] sm:aspect-[2.3/1] md:aspect-[2.5/1] shadow-xl bg-[#0F0B1E] border border-red-500/35 ring-1 ring-white/15 group cursor-pointer select-none transition-all duration-300 hover:shadow-red-500/20 hover:border-red-500/60"
          onMouseEnter={() => setIsHeroPaused(true)}
          onMouseLeave={() => setIsHeroPaused(false)}
          onTouchStart={handleHeroTouchStart}
          onTouchEnd={handleHeroTouchEnd}
          onClick={() => {
            if (currentHeroBanner) {
              const target = (currentHeroBanner as any).productId || currentHeroBanner.actionTarget;
              if (target) {
                setSelectedProductId(target);
                setCurrentTab('product_detail');
                try {
                  const mainEl = document.getElementById('app-main-content') || document.querySelector('main');
                  if (mainEl) mainEl.scrollTo({ top: 0, behavior: 'instant' });
                } catch {}
                window.scrollTo({ top: 0, behavior: 'instant' });
              } else {
                handleBannerClick(currentHeroBanner as Banner);
              }
            }
          }}
        >
          {/* Animated Slide with Smooth Horizontal Transition */}
          <AnimatePresence mode="popLayout" custom={heroDirection}>
            <motion.div
              key={currentHeroBanner?.id || `hero-${safeHeroIndex}`}
              custom={heroDirection}
              variants={{
                enter: (direction: number) => ({
                  x: direction > 0 ? '100%' : '-100%',
                  opacity: 0.8,
                }),
                center: {
                  x: 0,
                  opacity: 1,
                },
                exit: (direction: number) => ({
                  x: direction > 0 ? '-100%' : '100%',
                  opacity: 0.8,
                }),
              }}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{
                x: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
                opacity: { duration: 0.35, ease: 'easeInOut' },
              }}
              className="absolute inset-0 w-full h-full select-none"
            >
              <img
                src={
                  ((currentHeroBanner as any)?.mobileImage && typeof window !== 'undefined' && window.innerWidth < 640
                    ? (currentHeroBanner as any).mobileImage
                    : null) ||
                  currentHeroBanner?.image ||
                  'https://pub-f5b49392d8cb47b0b42800e81d2216c0.r2.dev/Banners/free%20fire%20Banner.png'
                }
                alt={currentHeroBanner?.title || 'Unx Games Banner'}
                loading="eager"
                fetchPriority="high"
                decoding="async"
                onError={(e) => handleImageError(e, currentHeroBanner?.title || 'Unx Games')}
                className="w-full h-full object-cover object-center block pointer-events-none transition-transform duration-700 group-hover:scale-[1.02]"
              />
            </motion.div>
          </AnimatePresence>

          {/* Vignette Gradients for Text Legibility & Depth */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-transparent to-transparent pointer-events-none" />

          {/* Top-Left Official Tag */}
          <div className="absolute top-2.5 left-2.5 sm:top-3.5 sm:left-4 z-20 pointer-events-none">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-md border border-red-400/40 text-red-200 text-[10px] sm:text-xs font-black uppercase tracking-wider shadow-lg">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.9)]" />
              <Sparkles size={11} className="text-amber-400 fill-amber-400" />
              <span>OFFICIAL PARTNER</span>
            </div>
          </div>

          {/* Top-Right Instant Delivery Tag */}
          <div className="absolute top-2.5 right-2.5 sm:top-3.5 sm:right-4 z-20 pointer-events-none">
            <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-md border border-amber-400/30 text-amber-300 text-[10px] sm:text-xs font-black uppercase tracking-wider shadow-lg">
              <Zap size={11} className="fill-amber-400 text-amber-400" />
              <span>5-15 MIN DELIVERY</span>
            </div>
          </div>

          {/* Offer Text & Polished Interactive CTA Button (Bottom-Left) */}
          <div className="absolute bottom-3 left-2.5 sm:bottom-4 sm:left-4 z-20 max-w-[80%] sm:max-w-[70%] md:max-w-[62%]">
            <motion.div
              key={`offer-${safeHeroIndex}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.1, ease: 'easeOut' }}
              className="inline-flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 bg-black/80 backdrop-blur-md px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl sm:rounded-2xl border border-red-500/45 shadow-[0_6px_24px_rgba(0,0,0,0.8),0_0_20px_rgba(239,68,68,0.35)]"
            >
              <div className="flex flex-col min-w-0">
                <span className="text-xs sm:text-sm md:text-base font-black text-white tracking-tight leading-tight drop-shadow-sm line-clamp-1">
                  {currentOffer.title}
                </span>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] sm:text-xs font-semibold text-red-200 tracking-wide leading-tight line-clamp-1">
                    {currentOffer.subtitle}
                  </span>
                  <span className="hidden md:inline-flex items-center gap-1 text-[9px] font-black text-amber-300 bg-amber-400/15 px-1.5 py-0.5 rounded border border-amber-400/25">
                    100% Safe UID
                  </span>
                </div>
              </div>

              {/* Polished Interactive CTA Button */}
              <button
                type="button"
                id={`hero-cta-btn-${safeHeroIndex}`}
                onClick={(e) => {
                  e.stopPropagation();
                  if (currentHeroBanner) {
                    const target = (currentHeroBanner as any).productId || currentHeroBanner.actionTarget;
                    if (target) {
                      setSelectedProductId(target);
                      setCurrentTab('product_detail');
                      try {
                        const mainEl = document.getElementById('app-main-content') || document.querySelector('main');
                        if (mainEl) mainEl.scrollTo({ top: 0, behavior: 'instant' });
                      } catch {}
                      window.scrollTo({ top: 0, behavior: 'instant' });
                    } else {
                      handleBannerClick(currentHeroBanner as Banner);
                    }
                  }
                }}
                className="self-start sm:self-auto h-7 sm:h-8.5 px-3 sm:px-4 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-extrabold text-white bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 hover:shadow-lg hover:shadow-violet-600/40 active:scale-95 transition-all duration-200 flex items-center gap-1.5 shrink-0 shadow-md border border-white/20 cursor-pointer"
              >
                <span>Top Up Now</span>
                <ArrowRight size={12} className="stroke-[2.5]" />
              </button>
            </motion.div>
          </div>

          {/* Desktop Hover Navigation Arrows */}
          <button
            type="button"
            id="hero-prev-btn"
            onClick={(e) => {
              e.stopPropagation();
              prevHeroSlide();
            }}
            className="hidden sm:flex absolute left-3 top-1/2 -translate-y-1/2 w-9.5 h-9.5 rounded-full bg-black/65 hover:bg-gradient-to-r hover:from-violet-600 hover:to-indigo-600 text-white items-center justify-center backdrop-blur-md transition-all duration-200 opacity-0 group-hover:opacity-100 z-20 cursor-pointer border border-white/25 shadow-xl active:scale-90"
            aria-label="Previous Slide"
          >
            <ChevronLeft size={20} className="stroke-[2.5]" />
          </button>
          <button
            type="button"
            id="hero-next-btn"
            onClick={(e) => {
              e.stopPropagation();
              nextHeroSlide();
            }}
            className="hidden sm:flex absolute right-3 top-1/2 -translate-y-1/2 w-9.5 h-9.5 rounded-full bg-black/65 hover:bg-gradient-to-r hover:from-violet-600 hover:to-indigo-600 text-white items-center justify-center backdrop-blur-md transition-all duration-200 opacity-0 group-hover:opacity-100 z-20 cursor-pointer border border-white/25 shadow-xl active:scale-90"
            aria-label="Next Slide"
          >
            <ChevronRight size={20} className="stroke-[2.5]" />
          </button>

          {/* 5-Slide Pagination Indicator Pills & Counter (Bottom-Right) */}
          <div className="absolute bottom-3 right-2.5 sm:bottom-4 sm:right-4 z-20 flex items-center gap-1.5 sm:gap-2 bg-black/70 backdrop-blur-md px-2.5 py-1.5 rounded-full border border-white/25 shadow-lg">
            <span className="text-[10px] font-black text-violet-200 font-mono tracking-wider mr-0.5 hidden xs:inline">
              0{safeHeroIndex + 1} / 0{activeHeroBanners.length}
            </span>
            {activeHeroBanners.map((slide, idx) => (
              <button
                key={`hero-dot-${slide.id || idx}-${idx}`}
                type="button"
                id={`hero-dot-${idx}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setHeroDirection(idx >= safeHeroIndex ? 1 : -1);
                  setHeroIndex(idx);
                }}
                className={`rounded-full transition-all duration-300 cursor-pointer ${
                  safeHeroIndex === idx
                    ? 'w-5 sm:w-6 h-1.5 sm:h-2 bg-gradient-to-r from-violet-500 via-indigo-500 to-cyan-400 shadow-[0_0_12px_rgba(124,58,237,0.9)]'
                    : 'w-1.5 sm:w-2 h-1.5 sm:h-2 bg-white/40 hover:bg-white/80'
                }`}
                aria-label={`Slide ${idx + 1}`}
              />
            ))}
          </div>

          {/* Subtle Continuous Autoplay Progress Bar */}
          <div className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-white/10 z-20 overflow-hidden">
            <motion.div
              key={`progress-${safeHeroIndex}-${isHeroPaused}`}
              initial={{ width: '0%' }}
              animate={{ width: isHeroPaused ? '0%' : '100%' }}
              transition={{ duration: 4.5, ease: 'linear' }}
              className="h-full bg-gradient-to-r from-violet-500 via-indigo-500 to-cyan-400 shadow-[0_0_8px_rgba(124,58,237,0.8)]"
            />
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 4. CATEGORY SECTION ("Explore Games" Single-Row Horizontal Slider)        */}
      {/* ========================================================================= */}
      <section className="max-w-7xl mx-auto px-2 sm:px-2 space-y-2 sm:space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm sm:text-base font-extrabold text-[#171329] tracking-tight">
              Explore Games
            </h2>
            <p className="text-[11px] text-[#5B5870] font-medium -mt-0.5">
              Select your game category
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                categoryScrollRef.current?.scrollBy({ left: -200, behavior: 'smooth' });
              }}
              className="w-7 h-7 rounded-xl bg-white border border-slate-200 text-[#5B5870] hover:text-[#171329] hover:bg-slate-100 flex items-center justify-center transition-colors shadow-xs cursor-pointer active:scale-95"
              aria-label="Scroll categories left"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              type="button"
              onClick={() => {
                categoryScrollRef.current?.scrollBy({ left: 200, behavior: 'smooth' });
              }}
              className="w-7 h-7 rounded-xl bg-white border border-slate-200 text-[#5B5870] hover:text-[#171329] hover:bg-slate-100 flex items-center justify-center transition-colors shadow-xs cursor-pointer active:scale-95"
              aria-label="Scroll categories right"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>

        {/* Single-row horizontal slider with exactly 3 items visible at once on mobile */}
        <div
          ref={categoryScrollRef}
          className="flex flex-nowrap items-center gap-2 overflow-x-auto py-1 scrollbar-none snap-x snap-mandatory scroll-smooth"
        >
          <button
            type="button"
            onClick={() => setSelectedCategory('All')}
            className={`h-9 px-2 rounded-xl text-[11px] sm:text-xs font-bold transition-all flex items-center justify-center gap-1.5 w-[calc((100%-16px)/3)] min-w-[calc((100%-16px)/3)] max-w-[calc((100%-16px)/3)] shrink-0 snap-start cursor-pointer active:scale-95 sm:w-auto sm:min-w-0 sm:max-w-none sm:px-3.5 sm:shrink-0 ${
              selectedCategory === 'All'
                ? 'bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 text-white shadow-xs border border-violet-600'
                : 'bg-white border border-slate-200/90 text-slate-600 hover:border-violet-300 hover:text-violet-900 shadow-2xs'
            }`}
          >
            <Gamepad2 size={13} className={`shrink-0 ${selectedCategory === 'All' ? 'text-white' : 'text-violet-600'}`} />
            <span className="truncate">All Games</span>
          </button>

          {categories.filter((c) => c.active !== false).map((cat, idx) => {
            const isSelected = selectedCategory === cat.name || selectedCategory === cat.id || selectedCategory === cat.slug;
            const Icon = getCategoryIcon(cat.icon || (cat as any).icon_url);
            return (
              <button
                key={`cat-${cat.id || idx}-${idx}`}
                type="button"
                onClick={() => setSelectedCategory(cat.name)}
                className={`h-9 px-2 rounded-xl text-[11px] sm:text-xs font-bold transition-all flex items-center justify-center gap-1.5 w-[calc((100%-16px)/3)] min-w-[calc((100%-16px)/3)] max-w-[calc((100%-16px)/3)] shrink-0 snap-start cursor-pointer active:scale-95 sm:w-auto sm:min-w-0 sm:max-w-none sm:px-3.5 sm:shrink-0 ${
                  isSelected
                    ? 'bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 text-white shadow-xs border border-violet-600'
                    : 'bg-white border border-slate-200/90 text-slate-600 hover:border-violet-300 hover:text-violet-900 shadow-2xs'
                }`}
              >
                <span className={`shrink-0 ${isSelected ? 'text-white' : 'text-violet-600'}`}>{Icon}</span>
                <span className="truncate">{cat.name}</span>
              </button>
            );
          })}

          {categories.length === 0 && (
            <>
              {[
                { id: 'Mobile', label: 'Mobile Games', icon: 'Smartphone' },
                { id: 'PC', label: 'PC & Console', icon: 'Monitor' },
                { id: 'Gift Cards', label: 'Gift Cards', icon: 'Gift' },
                { id: 'Console', label: 'Console Games', icon: 'Gamepad' },
                { id: 'Game Vouchers', label: 'Game Vouchers', icon: 'Ticket' },
                { id: 'Memberships', label: 'Memberships', icon: 'Sparkles' },
              ].map((cat, idx) => {
                const isSelected = selectedCategory === cat.id;
                const Icon = getCategoryIcon(cat.icon);
                return (
                  <button
                    key={`fallback-cat-${cat.id || idx}-${idx}`}
                    type="button"
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`h-9 px-2 rounded-xl text-[11px] sm:text-xs font-bold transition-all flex items-center justify-center gap-1.5 w-[calc((100%-16px)/3)] min-w-[calc((100%-16px)/3)] max-w-[calc((100%-16px)/3)] shrink-0 snap-start cursor-pointer active:scale-95 sm:w-auto sm:min-w-0 sm:max-w-none sm:px-3.5 sm:shrink-0 ${
                      isSelected
                        ? 'bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 text-white shadow-xs border border-violet-600'
                        : 'bg-white border border-slate-200/90 text-slate-600 hover:border-violet-300 hover:text-violet-900 shadow-2xs'
                    }`}
                  >
                    <span className={`shrink-0 ${isSelected ? 'text-white' : 'text-violet-600'}`}>{Icon}</span>
                    <span className="truncate">{cat.label}</span>
                  </button>
                );
              })}
            </>
          )}
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 5. FEATURED / POPULAR PRODUCTS ("Popular Top-Ups" Carousel)               */}
      {/* ========================================================================= */}
      <section className="max-w-7xl mx-auto px-2 sm:px-2 space-y-2 sm:space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Flame size={18} className="text-amber-500 fill-amber-500 animate-pulse" />
            <h2 className="text-sm sm:text-base font-extrabold text-[#171329] tracking-tight">
              Popular Top-Ups
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  popularScrollRef.current?.scrollBy({ left: -240, behavior: 'smooth' });
                }}
                className="w-7 h-7 rounded-xl bg-white border border-slate-200 text-[#5B5870] hover:text-[#171329] hover:bg-slate-100 flex items-center justify-center transition-colors shadow-xs cursor-pointer active:scale-95"
                aria-label="Scroll left"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                type="button"
                onClick={() => {
                  popularScrollRef.current?.scrollBy({ left: 240, behavior: 'smooth' });
                }}
                className="w-7 h-7 rounded-xl bg-white border border-slate-200 text-[#5B5870] hover:text-[#171329] hover:bg-slate-100 flex items-center justify-center transition-colors shadow-xs cursor-pointer active:scale-95"
                aria-label="Scroll right"
              >
                <ChevronRight size={14} />
              </button>
            </div>
            <button
              type="button"
              onClick={() => setCurrentTab('shop')}
              className="text-xs font-extrabold text-violet-600 hover:text-violet-700 flex items-center gap-0.5 cursor-pointer ml-1"
            >
              <span>View All</span>
              <ArrowRight size={13} />
            </button>
          </div>
        </div>

        {/* Horizontal Carousel with roomy, unclipped cards */}
        <div
          ref={popularScrollRef}
          className="flex gap-2 sm:gap-3 md:gap-4 overflow-x-auto py-1.5 scrollbar-none snap-x snap-mandatory"
        >
          {isLoadingProducts ? (
            Array.from({ length: 4 }).map((_, idx) => (
              <div
                key={`popular-skeleton-${idx}`}
                className="w-[calc((100%-16px)/3)] sm:w-[calc((100%-24px)/3)] md:w-[calc((100%-32px)/3)] shrink-0 snap-start bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-2xs flex flex-col animate-pulse"
              >
                <div className="relative aspect-square w-full bg-slate-100 flex items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-slate-200/60" />
                </div>
                <div className="p-1.5 sm:p-2.5 flex-1 flex flex-col justify-between space-y-2">
                  <div className="space-y-1.5">
                    <div className="h-2 w-1/3 bg-slate-200 rounded" />
                    <div className="h-3 w-2/3 bg-slate-200 rounded" />
                    <div className="h-2 w-1/2 bg-slate-200 rounded" />
                  </div>
                  <div className="pt-1 sm:pt-1.5 border-t border-slate-100 flex items-center justify-between gap-1">
                    <div className="space-y-1 flex-1">
                      <div className="h-2 w-1/4 bg-slate-200 rounded" />
                      <div className="h-3 w-1/2 bg-slate-200 rounded" />
                    </div>
                    <div className="w-5.5 h-5.5 sm:w-7 sm:h-7 rounded-lg sm:rounded-xl bg-slate-200 shrink-0" />
                  </div>
                </div>
              </div>
            ))
          ) : (
            popularProducts.map((product, idx) => (
              <div
                key={`popular-${product.id || idx}-${idx}`}
                onClick={() => handleProductClick(product.id)}
                className="w-[calc((100%-16px)/3)] sm:w-[calc((100%-24px)/3)] md:w-[calc((100%-32px)/3)] shrink-0 snap-start bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-2xs hover:shadow-md hover:border-violet-500/40 transition-all group cursor-pointer flex flex-col active:scale-[0.98]"
              >
                {/* Product Image Box */}
                <div className="relative aspect-square w-full bg-gradient-to-b from-[#1C1736] to-[#120F24] overflow-hidden border-b border-slate-100/90 flex items-center justify-center">
                  <img
                    src={getSafeGameImage(product)}
                    alt={product.name}
                    loading={idx < 6 ? 'eager' : 'lazy'}
                    fetchPriority={idx < 6 ? 'high' : 'auto'}
                    decoding="async"
                    onError={(e) => handleImageError(e, product.name)}
                    className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500 gpu-layer"
                    style={{
                      transform: 'translate3d(0, 0, 0)',
                      backfaceVisibility: 'hidden',
                      imageRendering: '-webkit-optimize-contrast',
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent pointer-events-none" />

                  {/* Badge Top Left */}
                  {product.badge && (
                    <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-gradient-to-r from-violet-600 via-indigo-600 to-pink-500 text-white text-[8px] font-black uppercase tracking-wider shadow-xs border border-white/20">
                      {product.badge.replace(/[^a-zA-Z0-9 ]/g, '') || 'HOT'}
                    </span>
                  )}

                  {/* Out of Stock Overlay Pill */}
                  {product.inStock === false && (
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center p-1">
                      <span className="bg-rose-600 text-white font-extrabold px-1.5 py-0.5 rounded text-[8px] uppercase tracking-wider shadow-xs text-center">
                        Out of Stock
                      </span>
                    </div>
                  )}
                </div>

                {/* Card Footer Details */}
                <div className="p-1.5 sm:p-2.5 flex-1 flex flex-col justify-between space-y-1 sm:space-y-1.5">
                  <div>
                    <span className="text-[8px] sm:text-[10px] font-black text-violet-600 uppercase tracking-wider block truncate">
                      {product.gameName}
                    </span>
                    <h3 className="text-[10px] sm:text-xs font-black text-[#171329] leading-tight line-clamp-1 group-hover:text-violet-600 transition-colors mt-0.5" title={product.name}>
                      {product.name}
                    </h3>
                    <p className="text-[8px] sm:text-[10px] text-[#8A879A] font-bold truncate mt-0.5">
                      {product.packageName || 'Instant Delivery'}
                    </p>
                  </div>

                  {/* Price & Action Button */}
                  <div className="pt-1 sm:pt-1.5 border-t border-slate-100 flex items-center justify-between gap-1">
                    <div className="min-w-0 flex-1">
                      <span className="text-[7px] sm:text-[9px] text-slate-400 font-extrabold block uppercase tracking-wider leading-none">Starts at</span>
                      <span className="text-[9px] sm:text-xs font-black font-mono text-[#171329] truncate block mt-0.5">
                        {formatNPR(product.price)}
                      </span>
                    </div>
                    <div className="w-5.5 h-5.5 sm:w-7 sm:h-7 rounded-lg sm:rounded-xl bg-violet-50 group-hover:bg-violet-600 text-violet-600 group-hover:text-white flex items-center justify-center transition-colors shrink-0 shadow-3xs">
                      <ArrowRight size={10} className="sm:hidden" />
                      <ArrowRight size={13} className="hidden sm:block" />
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 6. ALL PRODUCTS SECTION (Clean 2-Column Mobile Grid)                      */}
      {/* ========================================================================= */}
      <section className="max-w-7xl mx-auto px-2 sm:px-2 space-y-2 sm:space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Gamepad2 size={18} className="text-violet-600" />
            <h2 className="text-sm sm:text-base font-extrabold text-[#171329] tracking-tight">
              All Top-Up Products
            </h2>
          </div>
          <span className="text-xs text-slate-500 font-bold">
            {filteredProducts.length} Products
          </span>
        </div>

        {/* 2-Column Product Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5 sm:gap-3">
          {isLoadingProducts ? (
            Array.from({ length: 10 }).map((_, idx) => (
              <div
                key={`all-skeleton-${idx}`}
                className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs flex flex-col animate-pulse"
              >
                <div className="relative aspect-square w-full bg-slate-100 flex items-center justify-center">
                  <div className="w-16 h-16 rounded-full bg-slate-200/60" />
                </div>
                <div className="p-2.5 sm:p-3 flex-1 flex flex-col justify-between space-y-2">
                  <div className="space-y-1.5">
                    <div className="h-2 w-1/3 bg-slate-200 rounded" />
                    <div className="h-3 w-2/3 bg-slate-200 rounded" />
                    <div className="h-2 w-1/2 bg-slate-200 rounded" />
                  </div>
                  <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between gap-1.5">
                    <div className="space-y-1 flex-1">
                      <div className="h-2 w-1/4 bg-slate-200 rounded" />
                      <div className="h-3.5 w-1/2 bg-slate-200 rounded" />
                    </div>
                    <div className="w-7 h-7 rounded-xl bg-slate-200 shrink-0" />
                  </div>
                </div>
              </div>
            ))
          ) : (
            filteredProducts.map((product, idx) => (
              <div
                key={`all-prod-${product.id || idx}-${idx}`}
                onClick={() => handleProductClick(product.id)}
                className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs hover:shadow-md hover:border-violet-500/40 transition-all group cursor-pointer flex flex-col active:scale-[0.98]"
              >
                {/* Product Image Area */}
                <div className="relative aspect-square w-full bg-gradient-to-b from-[#1C1736] to-[#120F24] overflow-hidden border-b border-slate-100/90 flex items-center justify-center">
                  <img
                    src={getSafeGameImage(product)}
                    alt={product.name}
                    loading={idx < 8 ? 'eager' : 'lazy'}
                    fetchPriority={idx < 8 ? 'high' : 'auto'}
                    decoding="async"
                    onError={(e) => handleImageError(e, product.name)}
                    className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500 gpu-layer"
                    style={{
                      transform: 'translate3d(0, 0, 0)',
                      backfaceVisibility: 'hidden',
                      imageRendering: '-webkit-optimize-contrast',
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent pointer-events-none" />

                  {/* Badge Top Left */}
                  {product.badge && (
                    <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-gradient-to-r from-violet-600 via-indigo-600 to-pink-500 text-white text-[9px] font-bold uppercase tracking-wider shadow-xs border border-white/20">
                      {product.badge.replace(/[^a-zA-Z0-9 ]/g, '') || 'HOT'}
                    </span>
                  )}

                  {/* Out of stock Overlay */}
                  {product.inStock === false && (
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center p-1.5">
                      <span className="bg-rose-600 text-white font-bold px-2 py-0.5 rounded text-[9px] uppercase tracking-wider shadow-xs text-center">
                        Out of Stock
                      </span>
                    </div>
                  )}
                </div>

                {/* Card Footer Details */}
                <div className="p-2.5 sm:p-3 flex-1 flex flex-col justify-between space-y-1.5">
                  <div>
                    <span className="text-[10px] font-extrabold text-violet-600 uppercase tracking-wider block truncate">
                      {product.gameName}
                    </span>
                    <h3 className="text-xs sm:text-sm font-extrabold text-[#171329] leading-tight line-clamp-1 group-hover:text-violet-600 transition-colors mt-0.5" title={product.name}>
                      {product.name}
                    </h3>
                    <p className="text-[10px] text-[#8A879A] font-medium truncate mt-0.5">
                      {product.packageName || 'Instant Delivery'}
                    </p>
                  </div>

                  {/* Price & Action Button */}
                  <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between gap-1.5">
                    <div className="min-w-0 flex-1">
                      <span className="text-[9px] text-slate-400 font-bold block uppercase tracking-wider leading-none">Starts at</span>
                      <span className="text-xs sm:text-sm font-extrabold font-mono text-[#171329] truncate block mt-0.5">
                        {formatNPR(product.price)}
                      </span>
                    </div>
                    <div className="w-7 h-7 rounded-xl bg-violet-50 group-hover:bg-violet-600 text-violet-600 group-hover:text-white flex items-center justify-center transition-colors shrink-0 shadow-2xs">
                      <ArrowRight size={13} />
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}

          {!isLoadingProducts && filteredProducts.length === 0 && (
            <div className="col-span-full py-10 text-center bg-white border border-slate-200/80 rounded-2xl p-6 text-slate-500 text-xs font-bold shadow-xs">
              No products found in this category.
            </div>
          )}
        </div>
      </section>



      {/* ========================================================================= */}
      {/* 7.5 SPECIAL OFFERS CAROUSEL (Separate Independent Section)                */}
      {/* ========================================================================= */}
      <SpecialOffersSection />

      {/* ========================================================================= */}
      {/* 8. CUSTOMER REVIEWS (Compact Section)                                    */}
      {/* ========================================================================= */}
      <section className="max-w-7xl mx-auto px-2 sm:px-2">
        <ReviewSlider />
      </section>

      {/* ========================================================================= */}
      {/* 9. NEWS / STORE UPDATES (Compact Cards Preview)                           */}
      {/* ========================================================================= */}
      {isLoadingNews ? (
        <section className="max-w-7xl mx-auto px-2 sm:px-2 space-y-2 sm:space-y-2 animate-pulse">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Newspaper size={16} className="text-slate-300" />
              <div className="h-4 w-32 bg-slate-200 rounded" />
            </div>
            <div className="h-3 w-12 bg-slate-200 rounded" />
          </div>

          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, idx) => (
              <div
                key={`news-skeleton-${idx}`}
                className="bg-white border border-[#E5E4EE] rounded-2xl p-3 sm:p-3.5 flex items-center gap-3"
              >
                {/* News Thumbnail Skeleton */}
                <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-xl bg-slate-100 shrink-0 border border-slate-100" />

                {/* News Meta & Title Skeleton */}
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-12 bg-slate-200 rounded" />
                    <div className="h-2.5 w-16 bg-slate-200 rounded" />
                  </div>
                  <div className="h-3.5 w-2/3 bg-slate-200 rounded" />
                  <div className="h-3 w-1/2 bg-slate-200 rounded" />
                </div>
                <div className="w-6 h-6 rounded-lg bg-slate-100 shrink-0" />
              </div>
            ))}
          </div>
        </section>
      ) : previewNews.length > 0 ? (
        <section className="max-w-7xl mx-auto px-2 sm:px-2 space-y-2 sm:space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Newspaper size={16} className="text-violet-600" />
              <h2 className="text-sm sm:text-base font-bold text-[#171329] tracking-tight">
                Latest Updates
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setCurrentTab('news')}
              className="text-xs font-bold text-violet-600 hover:text-violet-700 flex items-center gap-0.5 cursor-pointer"
            >
              <span>View All</span>
              <ArrowRight size={12} />
            </button>
          </div>

          <div className="space-y-2">
            {previewNews.map((item, idx) => (
              <div
                key={`home-news-${item.id || idx}-${idx}`}
                onClick={() => setCurrentTab('news')}
                className="bg-white border border-[#E5E4EE] rounded-2xl p-3 sm:p-3.5 shadow-[0_1px_3px_rgba(23,19,41,0.05)] hover:border-violet-500/40 transition-all cursor-pointer flex items-center gap-3 group active:scale-[0.99]"
              >
                {/* News Thumbnail */}
                <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-xl bg-[#F3F4F8] overflow-hidden shrink-0 border border-[#E5E4EE]">
                  <img
                    src={item.image}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>

                {/* News Meta & Title */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-1.5 py-0.2 rounded-md text-[9px] font-bold uppercase tracking-wider ${
                      item.category === 'Offer'
                        ? 'bg-violet-50 text-violet-700 border border-violet-100'
                        : item.category === 'Announcement'
                        ? 'bg-blue-50 text-blue-600 border border-blue-100'
                        : 'bg-emerald-50 text-[#16A34A] border border-emerald-100'
                    }`}>
                      {item.category}
                    </span>
                    <span className="text-[10px] text-[#8A879A] flex items-center gap-1 font-medium">
                      <Calendar size={10} />
                      <span>{formatRelativeTime(item.createdAt)}</span>
                    </span>
                  </div>

                  <h3 className="text-xs font-bold text-[#171329] group-hover:text-violet-600 truncate transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-[11px] text-[#5B5870] font-medium line-clamp-1 mt-0.5">
                    {item.description}
                  </p>
                </div>

                <div className="w-6 h-6 rounded-lg bg-[#F3F4F8] text-[#8A879A] group-hover:bg-violet-50 group-hover:text-violet-600 flex items-center justify-center transition-colors shrink-0">
                  <ArrowRight size={12} />
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {/* ========================================================================= */}
      {/* RECENTLY VISITED PRODUCTS SLIDER — 1 Line 3 Products                      */}
      {/* ========================================================================= */}
      {recentlyVisited.length > 0 && (
        <section className="max-w-7xl mx-auto px-2 sm:px-2 space-y-2 sm:space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-[#16A34A] text-xs">●</span>
              <h2 className="text-sm sm:text-base font-bold text-[#171329] tracking-tight">
                Recently Visited
              </h2>
            </div>
            {recentlyVisited.length > 3 && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    const el = document.getElementById('recent_visited_slider_bottom');
                    el?.scrollBy({ left: -240, behavior: 'smooth' });
                  }}
                  className="w-7 h-7 rounded-xl bg-white border border-[#E5E4EE] text-[#5B5870] hover:text-[#171329] flex items-center justify-center transition-all shadow-xs active:scale-90 cursor-pointer"
                >
                  <ChevronLeft size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const el = document.getElementById('recent_visited_slider_bottom');
                    el?.scrollBy({ left: 240, behavior: 'smooth' });
                  }}
                  className="w-7 h-7 rounded-xl bg-white border border-[#E5E4EE] text-[#5B5870] hover:text-[#171329] flex items-center justify-center transition-all shadow-xs active:scale-90 cursor-pointer"
                >
                  <ChevronRight size={13} />
                </button>
              </div>
            )}
          </div>

          <div
            id="recent_visited_slider_bottom"
            className={
              recentlyVisited.length <= 3
                ? "grid grid-cols-3 gap-2 sm:gap-3.5"
                : "flex gap-2 sm:gap-3.5 overflow-x-auto py-1 scrollbar-none snap-x snap-mandatory"
            }
          >
            {recentlyVisited.map((product, idx) => (
              <div
                key={`recent-prod-${product.id || idx}-${idx}`}
                onClick={() => handleProductClick(product.id)}
                className={`bg-white border border-[#E5E4EE] rounded-2xl overflow-hidden shadow-xs hover:border-violet-500/40 transition-all cursor-pointer flex flex-col active:scale-[0.98] group ${
                  recentlyVisited.length > 3
                    ? 'w-[calc((100%-16px)/3)] sm:w-[calc((100%-28px)/3)] shrink-0 snap-start'
                    : 'w-full'
                }`}
              >
                {/* Image */}
                <div className="relative aspect-square w-full bg-gradient-to-b from-[#1C1736] to-[#120F24] overflow-hidden border-b border-slate-100 flex items-center justify-center">
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                  />
                  {product.inStock === false && (
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-[1px] flex items-center justify-center">
                      <span className="bg-rose-600 text-white font-bold text-[8px] px-1.5 py-0.5 rounded uppercase tracking-wider">
                        OOS
                      </span>
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="p-1.5 sm:p-2.5 flex-1 flex flex-col justify-between space-y-1">
                  <div className="min-w-0">
                    <span className="text-[8px] sm:text-[9px] font-bold text-violet-600 uppercase tracking-wider block truncate">
                      {product.gameName}
                    </span>
                    <h3 className="text-[10px] sm:text-xs font-bold text-[#171329] leading-tight truncate group-hover:text-violet-600 transition-colors">
                      {product.name}
                    </h3>
                  </div>

                  <div className="pt-1 border-t border-[#E5E4EE] flex items-center justify-between gap-1">
                    <span className="text-[10px] sm:text-xs font-mono font-bold text-[#171329] truncate">
                      {formatNPR(product.price)}
                    </span>
                    <span className="text-[8px] sm:text-[9px] font-bold text-violet-600 group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5 shrink-0">
                      <span>View</span>
                      <ArrowRight size={8} className="stroke-[3]" />
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ========================================================================= */}
      {/* 9. ACCEPTED PAYMENT METHODS & 3-STEP TOP-UP (Native Mobile App Hub)       */}
      {/* ========================================================================= */}
      <section className="max-w-7xl mx-auto px-2 sm:px-2 space-y-2 sm:space-y-2 font-sans">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-xs">
              <Wallet size={16} />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black text-slate-900 tracking-tight leading-tight">
                Official Nepal Payment Rails
              </h2>
              <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium">
                Pay direct in NPR with zero surcharge &amp; instant verification
              </p>
            </div>
          </div>
          <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Instant Auto-Verify</span>
          </span>
        </div>

        {/* 4 Payment Channel Cards in Clean Mobile Bento Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
          {/* eSewa */}
          <div className="bg-white border border-slate-200/80 hover:border-emerald-500/60 rounded-3xl p-3 shadow-2xs hover:shadow-xs transition-all group flex flex-col justify-between space-y-2 active:scale-[0.98]">
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-2xl bg-[#60BB46] text-white flex items-center justify-center font-black text-[11px] shadow-xs tracking-tight">
                eS
              </div>
              <span className="text-[9px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200/70 px-2 py-0.5 rounded-full">
                0% Fee
              </span>
            </div>
            <div>
              <div className="flex items-center gap-1">
                <h3 className="text-xs sm:text-sm font-black text-slate-900">eSewa Wallet</h3>
                <CheckCircle2 size={12} className="text-[#60BB46] fill-[#60BB46]/10" />
              </div>
              <p className="text-[10px] text-slate-500 font-medium mt-0.5 leading-tight">
                Scan QR or Send to 9768914027
              </p>
            </div>
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] font-bold">
              <span className="text-emerald-700">Instant</span>
              <span className="text-slate-400 font-mono">2-5 Min Auto</span>
            </div>
          </div>

          {/* Khalti */}
          <div className="bg-white border border-slate-200/80 hover:border-purple-500/60 rounded-3xl p-3 shadow-2xs hover:shadow-xs transition-all group flex flex-col justify-between space-y-2 active:scale-[0.98]">
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-2xl bg-[#5C2D91] text-white flex items-center justify-center font-black text-[11px] shadow-xs tracking-tight">
                Kh
              </div>
              <span className="text-[9px] font-black uppercase tracking-wider bg-purple-50 text-purple-700 border border-purple-200/70 px-2 py-0.5 rounded-full">
                1-Tap Pay
              </span>
            </div>
            <div>
              <div className="flex items-center gap-1">
                <h3 className="text-xs sm:text-sm font-black text-slate-900">Khalti App</h3>
                <CheckCircle2 size={12} className="text-[#5C2D91] fill-[#5C2D91]/10" />
              </div>
              <p className="text-[10px] text-slate-500 font-medium mt-0.5 leading-tight">
                Direct Merchant QR &amp; App Pay
              </p>
            </div>
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] font-bold">
              <span className="text-purple-700">0% Fee</span>
              <span className="text-slate-400 font-mono">Fast Settlement</span>
            </div>
          </div>

          {/* Mobile Banking / Fonepay */}
          <div className="bg-white border border-slate-200/80 hover:border-red-500/60 rounded-3xl p-3 shadow-2xs hover:shadow-xs transition-all group flex flex-col justify-between space-y-2 active:scale-[0.98]">
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-red-600 to-rose-500 text-white flex items-center justify-center shadow-xs">
                <QrCode size={18} />
              </div>
              <span className="text-[9px] font-black uppercase tracking-wider bg-red-50 text-red-700 border border-red-200/70 px-2 py-0.5 rounded-full">
                30+ Banks
              </span>
            </div>
            <div>
              <div className="flex items-center gap-1">
                <h3 className="text-xs sm:text-sm font-black text-slate-900">Fonepay &amp; Banking</h3>
                <CheckCircle2 size={12} className="text-red-600 fill-red-600/10" />
              </div>
              <p className="text-[10px] text-slate-500 font-medium mt-0.5 leading-tight">
                NIC Asia, Nabil, Global IME &amp; more
              </p>
            </div>
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] font-bold">
              <span className="text-red-700">All Banks</span>
              <span className="text-slate-400 font-mono">QR Transfer</span>
            </div>
          </div>

          {/* IME Pay & ConnectIPS */}
          <div className="bg-white border border-slate-200/80 hover:border-pink-500/60 rounded-3xl p-3 shadow-2xs hover:shadow-xs transition-all group flex flex-col justify-between space-y-2 active:scale-[0.98]">
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-2xl bg-[#E11D48] text-white flex items-center justify-center font-black text-[10px] shadow-xs tracking-tight">
                IME
              </div>
              <span className="text-[9px] font-black uppercase tracking-wider bg-pink-50 text-pink-700 border border-pink-200/70 px-2 py-0.5 rounded-full">
                IPS Safe
              </span>
            </div>
            <div>
              <div className="flex items-center gap-1">
                <h3 className="text-xs sm:text-sm font-black text-slate-900">IME Pay / IPS</h3>
                <CheckCircle2 size={12} className="text-[#E11D48] fill-[#E11D48]/10" />
              </div>
              <p className="text-[10px] text-slate-500 font-medium mt-0.5 leading-tight">
                Digital Wallet &amp; ConnectIPS Direct
              </p>
            </div>
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] font-bold">
              <span className="text-pink-700">0% Surcharge</span>
              <span className="text-slate-400 font-mono">Direct Connect</span>
            </div>
          </div>
        </div>

        {/* 3-Step Instant Top-Up Process Carousel Capsule */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white rounded-3xl p-3.5 sm:p-4 shadow-sm border border-slate-700/50">
          <div className="flex items-center justify-between mb-3 border-b border-white/10 pb-2">
            <div className="flex items-center gap-1.5">
              <span className="text-xs">🇳🇵</span>
              <span className="text-xs font-black uppercase tracking-wider text-slate-200">
                How Instant Top-Up Works
              </span>
            </div>
            <span className="text-[10px] font-bold text-amber-300 flex items-center gap-1">
              <span>⚡ Automated 24/7</span>
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center relative">
            {/* Step 1 */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-2.5 flex flex-col items-center justify-between space-y-1">
              <div className="w-6 h-6 rounded-full bg-gradient-to-r from-red-600 to-orange-500 text-white font-black text-[10px] flex items-center justify-center shadow-xs">
                1
              </div>
              <span className="font-bold text-[10.5px] sm:text-xs text-white leading-tight">
                Select &amp; Enter UID
              </span>
              <span className="text-[9px] text-slate-400 font-medium leading-none">
                Zero password needed
              </span>
            </div>

            {/* Step 2 */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-2.5 flex flex-col items-center justify-between space-y-1">
              <div className="w-6 h-6 rounded-full bg-gradient-to-r from-red-600 to-rose-500 text-white font-black text-[10px] flex items-center justify-center shadow-xs">
                2
              </div>
              <span className="font-bold text-[10.5px] sm:text-xs text-white leading-tight">
                Scan QR &amp; Pay
              </span>
              <span className="text-[9px] text-slate-400 font-medium leading-none">
                eSewa, Khalti, Fonepay
              </span>
            </div>

            {/* Step 3 */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-2.5 flex flex-col items-center justify-between space-y-1">
              <div className="w-6 h-6 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-black text-[10px] flex items-center justify-center shadow-xs">
                3
              </div>
              <span className="font-bold text-[10.5px] sm:text-xs text-white leading-tight">
                In-Game in 3 Mins!
              </span>
              <span className="text-[9px] text-emerald-300 font-medium leading-none">
                Direct to Player ID
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 10. WHY GAMERS CHOOSE US (High-Density Mobile Bento + Live Social Proof)   */}
      {/* ========================================================================= */}
      <section className="max-w-7xl mx-auto px-2 sm:px-2 space-y-2 sm:space-y-2 font-sans">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-2xl bg-gradient-to-tr from-violet-600 via-indigo-600 to-blue-500 text-white flex items-center justify-center shadow-xs">
              <ShieldCheck size={16} />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black text-slate-900 tracking-tight leading-tight">
                Why Gamers Choose Us
              </h2>
              <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium">
                Nepal's premier gaming top-up store trusted by 25,000+ players
              </p>
            </div>
          </div>
          <span className="text-[10px] sm:text-xs font-black text-violet-700 bg-violet-50 border border-violet-200 px-2.5 py-1 rounded-full flex items-center gap-1 shadow-2xs">
            <span>⭐ {dynamicAvgRating} Rating</span>
          </span>
        </div>

        {/* 4 Rich Mobile Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
          {/* Card 1: Fast Delivery */}
          <div className="bg-white border border-slate-200/80 hover:border-amber-400 rounded-3xl p-3 sm:p-3.5 space-y-2 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between active:scale-[0.98]">
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center shadow-2xs">
                <Zap size={16} />
              </div>
              <span className="text-[9px] font-black uppercase tracking-wider text-amber-700 bg-amber-50 border border-amber-200/70 px-2 py-0.5 rounded-full">
                Avg 3.4 Mins
              </span>
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-black text-slate-900">
                3-5 Mins Delivery
              </h3>
              <p className="text-[10px] text-slate-500 font-medium mt-0.5 leading-snug">
                Automated order processing directly to your game Player UID 24/7.
              </p>
            </div>
            <div className="pt-2 border-t border-slate-100 flex items-center gap-1 text-[10px] font-bold text-amber-600">
              <span>⚡ 99.4% Orders on Time</span>
            </div>
          </div>

          {/* Card 2: 100% Genuine */}
          <div className="bg-white border border-slate-200/80 hover:border-emerald-400 rounded-3xl p-3 sm:p-3.5 space-y-2 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between active:scale-[0.98]">
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-500 text-white flex items-center justify-center shadow-2xs">
                <CheckCircle2 size={16} />
              </div>
              <span className="text-[9px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200/70 px-2 py-0.5 rounded-full">
                Zero Ban Risk
              </span>
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-black text-slate-900">
                100% Ban-Safe
              </h3>
              <p className="text-[10px] text-slate-500 font-medium mt-0.5 leading-snug">
                Official publisher authorized diamond &amp; voucher top-up channels.
              </p>
            </div>
            <div className="pt-2 border-t border-slate-100 flex items-center gap-1 text-[10px] font-bold text-emerald-600">
              <span>🛡️ Never Ask For Password</span>
            </div>
          </div>

          {/* Card 3: Encrypted 256-Bit */}
          <div className="bg-white border border-slate-200/80 hover:border-blue-400 rounded-3xl p-3 sm:p-3.5 space-y-2 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between active:scale-[0.98]">
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-600 text-white flex items-center justify-center shadow-2xs">
                <Lock size={15} />
              </div>
              <span className="text-[9px] font-black uppercase tracking-wider text-blue-700 bg-blue-50 border border-blue-200/70 px-2 py-0.5 rounded-full">
                NPR Pricing
              </span>
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-black text-slate-900">
                Zero Card Hassle
              </h3>
              <p className="text-[10px] text-slate-500 font-medium mt-0.5 leading-snug">
                Pay in Nepali Rupees with local wallets. No foreign dollar cards required.
              </p>
            </div>
            <div className="pt-2 border-t border-slate-100 flex items-center gap-1 text-[10px] font-bold text-blue-600">
              <span>🔒 256-Bit SSL Encrypted</span>
            </div>
          </div>

          {/* Card 4: 24/7 Support */}
          <div className="bg-white border border-slate-200/80 hover:border-violet-400 rounded-3xl p-3 sm:p-3.5 space-y-2 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between active:scale-[0.98]">
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-600 text-white flex items-center justify-center shadow-2xs">
                <Headphones size={16} />
              </div>
              <span className="text-[9px] font-black uppercase tracking-wider text-violet-700 bg-violet-50 border border-violet-200/70 px-2 py-0.5 rounded-full">
                24/7 Live
              </span>
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-black text-slate-900">
                Gamer Support
              </h3>
              <p className="text-[10px] text-slate-500 font-medium mt-0.5 leading-snug">
                Friendly Nepali gamer support on WhatsApp &amp; live tickets 24/7.
              </p>
            </div>
            <div className="pt-2 border-t border-slate-100 flex items-center gap-1 text-[10px] font-bold text-violet-600">
              <span>💬 2-Min WhatsApp Response</span>
            </div>
          </div>
        </div>

        {/* Live Social Proof Stats Strip */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-3.5 sm:p-4 shadow-2xs">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
            <div className="pt-1 sm:pt-0">
              <span className="text-base sm:text-lg font-black text-violet-600 font-mono block">
                50,000+
              </span>
              <span className="text-[9.5px] text-slate-500 font-bold uppercase tracking-wider">
                Top-Ups Completed
              </span>
            </div>
            <div className="pt-2 sm:pt-0 sm:pl-3">
              <span className="text-base sm:text-lg font-black text-emerald-600 font-mono block">
                3.4 Mins
              </span>
              <span className="text-[9.5px] text-slate-500 font-bold uppercase tracking-wider">
                Average Delivery Time
              </span>
            </div>
            <div className="pt-2 sm:pt-0 sm:pl-3">
              <span className="text-base sm:text-lg font-black text-violet-600 font-mono block">
                {dynamicAvgRating} / 5.0
              </span>
              <span className="text-[9.5px] text-slate-500 font-bold uppercase tracking-wider">
                {dynamicReviewsCount > 0 ? `${dynamicReviewsCount} Verified Reviews` : 'Verified Customer Reviews'}
              </span>
            </div>
            <div className="pt-2 sm:pt-0 sm:pl-3">
              <span className="text-base sm:text-lg font-black text-teal-600 font-mono block">
                100%
              </span>
              <span className="text-[9.5px] text-slate-500 font-bold uppercase tracking-wider">
                Safe &amp; Official
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 11. QUICK SUPPORT & COMPANY REGISTRATION FOOTER CARD                      */}
      {/* ========================================================================= */}
      <section className="max-w-7xl mx-auto px-2 sm:px-2 pb-2">
        <div className="bg-gradient-to-r from-violet-700 via-indigo-600 to-blue-600 rounded-3xl p-4 sm:p-5 text-white shadow-md shadow-violet-600/15 space-y-3 relative overflow-hidden">
          {/* Subtle background glow */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-300 animate-ping" />
                <span className="text-xs font-black uppercase tracking-wider text-white/90">
                  Instant Support Hotline
                </span>
              </div>
              <h3 className="text-sm sm:text-base font-black text-white">
                Need Fast Help with Top-Up or Verification?
              </h3>
              <p className="text-[11px] text-white/80 font-medium">
                Live Nepali gamer support 24/7 on WhatsApp &amp; phone for rapid assistance.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 shrink-0">
              <a
                href="https://wa.me/9779768914027"
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2.5 rounded-2xl bg-white hover:bg-emerald-50 text-emerald-700 hover:text-emerald-800 text-xs font-black flex items-center gap-1.5 shadow-md shadow-black/10 transition-all active:scale-95 cursor-pointer border border-emerald-100/80"
              >
                <MessageCircle size={15} className="text-emerald-600 fill-emerald-500/20" />
                <span>WhatsApp Live</span>
              </a>

              <a
                href="tel:9768914027"
                className="px-4 py-2.5 rounded-2xl bg-slate-950/80 hover:bg-slate-950 text-white text-xs font-black flex items-center gap-1.5 shadow-md shadow-black/15 transition-all active:scale-95 cursor-pointer border border-white/20"
              >
                <Phone size={13} className="text-amber-400" />
                <span>Call Us</span>
              </a>
            </div>
          </div>

          {/* Legal / Company Footnote */}
          <div className="pt-2.5 border-t border-white/20 flex flex-col sm:flex-row items-center justify-between gap-2 text-[10px] text-white/80 relative z-10 font-medium">
            <div className="flex items-center gap-1.5">
              <ShieldCheck size={13} className="text-white" />
              <span>© Unx Games By intraX Pvt Ltd • Registered in Nepal 🇳🇵</span>
            </div>
            <div className="flex items-center gap-3 font-mono text-[9.5px]">
              <span>Fast Settlement</span>
              <span>•</span>
              <span>100% Ban-Free</span>
              <span>•</span>
              <span>Nepal Gateway</span>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
};
export default MASTER_BANNERS;
