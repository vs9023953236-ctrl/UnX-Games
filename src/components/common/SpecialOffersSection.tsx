import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Flame,
  ChevronLeft,
  ChevronRight,
  Copy,
  Check,
  Sparkles,
  Ticket,
  ArrowRight,
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { handleImageError } from '../../utils/imageFallback';

export interface SpecialOfferItem {
  id: string;
  title: string;
  couponCode: string;
  image: string;
  discountBadge: string;
  description: string;
  targetProductId?: string;
}

export const SPECIAL_OFFERS: SpecialOfferItem[] = [
  {
    id: 'offer-free-fire',
    title: 'FREE FIRE SPECIAL OFFER',
    couponCode: 'FREEFIRE',
    image:
      'https://pub-f5b49392d8cb47b0b42800e81d2216c0.r2.dev/Offers%20Banner/FREE%20FIRE%20SPECIAL%20OFFER.png',
    discountBadge: '10% OFF',
    description: 'Instant discount on all Free Fire diamond top-ups',
    targetProductId: 'prod-free-fire',
  },
  {
    id: 'offer-nepal-vip',
    title: '🇳🇵 NEPAL VIP OFFER',
    couponCode: 'NEPALVIP',
    image:
      'https://pub-f5b49392d8cb47b0b42800e81d2216c0.r2.dev/Offers%20Banner/%F0%9F%87%B3%F0%9F%87%B5%20NEPAL%20VIP%20OFFER.png',
    discountBadge: 'VIP 15% OFF',
    description: 'Exclusive gaming deals for all verified Nepali gamers',
  },
  {
    id: 'offer-festive-gaming',
    title: '🎉 FESTIVE GAMING SALE',
    couponCode: 'FESTIVE20',
    image:
      'https://pub-f5b49392d8cb47b0b42800e81d2216c0.r2.dev/Offers%20Banner/%F0%9F%8E%89%20FESTIVE%20GAMING%20SALE.png',
    discountBadge: 'FESTIVE 20% OFF',
    description: 'Special celebration discount across all top gaming vouchers',
  },
  {
    id: 'offer-unx-games-special',
    title: 'UNX GAMES SPECIAL',
    couponCode: 'GHN10',
    image:
      'https://pub-f5b49392d8cb47b0b42800e81d2216c0.r2.dev/Offers%20Banner/GAME%20HUB%20SPECIAL.png',
    discountBadge: 'FLAT 10% OFF',
    description: 'Special store-wide top-up discount with instant delivery',
  },
  {
    id: 'offer-welcome-ghn',
    title: '🎁 WELCOME TO UNX GAMES',
    couponCode: 'WELCOME50',
    image:
      'https://pub-f5b49392d8cb47b0b42800e81d2216c0.r2.dev/Offers%20Banner/%F0%9F%8E%81%20WELCOME%20TO%20GAME%20HUB%20NEPAL.png',
    discountBadge: 'Rs. 50 OFF',
    description: 'Welcome reward on your top-up order with Unx Games',
  },
];

export const SpecialOffersSection: React.FC = () => {
  const { showToast, banners, setSelectedProductId, setCurrentTab } = useStore();

  const activeOfferBanners = useMemo(() => {
    const fromStore = banners.filter(
      (b) => (b.type === 'offer' || b.id?.includes('offer')) && (b.status === 'active' || !b.status)
    );
    if (fromStore.length > 0) {
      return fromStore.map((b) => ({
        id: b.id,
        title: b.title,
        couponCode: b.buttonText || 'GHN10',
        image: b.image,
        discountBadge: b.badge || 'SPECIAL DEAL',
        description: b.subtitle || 'Special gaming deal from Unx Games',
        targetProductId: b.actionTarget,
      }));
    }
    return SPECIAL_OFFERS;
  }, [banners]);

  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [direction, setDirection] = useState<number>(1);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const copyTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Preload offer images for seamless zero-flicker transitions
  useEffect(() => {
    activeOfferBanners.forEach((offer) => {
      if (offer.image) {
        const img = new Image();
        img.src = offer.image;
      }
    });
  }, [activeOfferBanners]);

  // Pause carousel when tab is in background
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsPaused(document.hidden);
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const nextSlide = () => {
    setDirection(1);
    setCurrentIndex((prev) => (prev + 1) % activeOfferBanners.length);
  };

  const prevSlide = () => {
    setDirection(-1);
    setCurrentIndex((prev) => (prev === 0 ? activeOfferBanners.length - 1 : prev - 1));
  };

  // Autoplay timer (4.5 seconds)
  useEffect(() => {
    if (isPaused || activeOfferBanners.length <= 1) return;
    const timer = setInterval(() => {
      setDirection(1);
      setCurrentIndex((prev) => (prev + 1) % activeOfferBanners.length);
    }, 4500);

    return () => clearInterval(timer);
  }, [isPaused, currentIndex, activeOfferBanners.length]);

  // Touch event handlers for mobile swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    setIsPaused(true);
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) {
      setIsPaused(false);
      return;
    }
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const diffX = touchStartX.current - touchEndX;
    const diffY = (touchStartY.current ?? touchEndY) - touchEndY;

    // Horizontal dominance check
    if (Math.abs(diffX) > 35 && Math.abs(diffX) > Math.abs(diffY)) {
      if (diffX > 0) {
        nextSlide();
      } else {
        prevSlide();
      }
    }
    touchStartX.current = null;
    touchStartY.current = null;
    setIsPaused(false);
  };

  const handleCopyCoupon = (couponCode: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }

    try {
      navigator.clipboard.writeText(couponCode);
      setCopiedCode(couponCode);

      showToast(
        'success',
        '✓ Coupon Copied!',
        `Coupon "${couponCode}" copied. Apply at checkout!`
      );

      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
      copyTimeoutRef.current = setTimeout(() => {
        setCopiedCode(null);
      }, 3000);
    } catch {
      setCopiedCode(couponCode);
      showToast(
        'success',
        '✓ Coupon Copied!',
        `Coupon code: ${couponCode}`
      );
    }
  };

  const handleUseOffer = (offer: SpecialOfferItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    handleCopyCoupon(offer.couponCode);
    if (offer.targetProductId) {
      setSelectedProductId(offer.targetProductId);
      setCurrentTab('product_detail');
    } else {
      setCurrentTab('shop');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const safeIndex = currentIndex % Math.max(1, activeOfferBanners.length);
  const currentOffer = activeOfferBanners[safeIndex] || activeOfferBanners[0];
  const isCurrentCopied = copiedCode === currentOffer.couponCode;

  return (
    <section
      id="special-offers-section"
      className="max-w-7xl mx-auto px-2 sm:px-2 space-y-1.5"
    >
      {/* Sleek Compact Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Flame size={16} className="text-amber-500 fill-amber-500 animate-pulse shrink-0" />
          <h2 className="text-sm sm:text-base font-black text-[#171329] tracking-tight">
            Special Offers
          </h2>
          <span className="hidden xs:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 text-[10px] font-bold border border-amber-200/70 ml-1">
            <Sparkles size={10} className="text-amber-600" />
            <span>{activeOfferBanners.length} Active</span>
          </span>
        </div>

        <button
          type="button"
          onClick={() => setCurrentTab('shop')}
          className="text-xs font-bold text-violet-600 hover:text-violet-700 flex items-center gap-0.5 cursor-pointer"
        >
          <span>View All</span>
          <ArrowRight size={12} />
        </button>
      </div>

      {/* Sleek, Proportionate Banner Container */}
      <div
        id="special-offers-carousel"
        className="relative w-full rounded-2xl sm:rounded-3xl overflow-hidden aspect-[2.35/1] sm:aspect-[2.75/1] md:aspect-[3.2/1] shadow-lg bg-slate-950 border border-slate-800/80 ring-1 ring-white/10 group select-none cursor-pointer transition-all duration-300 hover:shadow-violet-900/20"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onClick={() => handleUseOffer(currentOffer)}
      >
        {/* Animated Slide Transition */}
        <AnimatePresence mode="popLayout" custom={direction}>
          <motion.div
            key={`special-offer-slide-${currentOffer.id || safeIndex}-${safeIndex}`}
            custom={direction}
            variants={{
              enter: (dir: number) => ({
                x: dir > 0 ? '100%' : '-100%',
                opacity: 0.85,
              }),
              center: {
                x: 0,
                opacity: 1,
              },
              exit: (dir: number) => ({
                x: dir > 0 ? '-100%' : '100%',
                opacity: 0.85,
              }),
            }}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              x: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
              opacity: { duration: 0.3, ease: 'easeInOut' },
            }}
            className="absolute inset-0 w-full h-full select-none"
          >
            <img
              src={currentOffer.image}
              alt={currentOffer.title}
              loading="eager"
              fetchPriority="high"
              decoding="async"
              onError={(e) => handleImageError(e, currentOffer.title)}
              className="w-full h-full object-cover object-center block pointer-events-none transition-transform duration-700 group-hover:scale-[1.02]"
              style={{
                transform: 'translate3d(0, 0, 0)',
                backfaceVisibility: 'hidden',
                imageRendering: '-webkit-optimize-contrast',
              }}
            />
          </motion.div>
        </AnimatePresence>

        {/* Soft Depth Vignette */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-transparent pointer-events-none" />

        {/* Top-Left Discount Badge */}
        <div className="absolute top-2 left-2 sm:top-3 sm:left-3.5 z-20 pointer-events-none">
          <div className="inline-flex items-center gap-1 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 text-white text-[9px] sm:text-xs font-black uppercase tracking-wider shadow-md border border-white/20">
            <Sparkles size={10} className="fill-white" />
            <span>{currentOffer.discountBadge || 'SPECIAL DEAL'}</span>
          </div>
        </div>

        {/* Ultra-Clean Single-Row Floating Action Pill (Bottom-Left) */}
        <div className="absolute left-2 bottom-2 sm:left-3.5 sm:bottom-3 z-20 max-w-[85%] sm:max-w-[70%]">
          <motion.div
            key={`coupon-bar-${safeIndex}`}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="inline-flex items-center gap-1.5 sm:gap-2 bg-black/80 backdrop-blur-md px-2 sm:px-3 py-1 sm:py-1.5 rounded-xl sm:rounded-2xl border border-white/20 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Coupon Code Indicator */}
            <div className="flex items-center gap-1 min-w-0 pr-0.5 sm:pr-1">
              <span className="w-5 h-5 sm:w-6 sm:h-6 rounded-lg bg-gradient-to-tr from-violet-600 to-indigo-500 text-white flex items-center justify-center shrink-0">
                <Ticket size={11} className="sm:hidden" />
                <Ticket size={12} className="hidden sm:block" />
              </span>
              <div className="flex flex-col min-w-0">
                <span className="text-[7px] sm:text-[8px] font-bold text-violet-200 uppercase tracking-wider leading-none">
                  Code
                </span>
                <span className="text-[11px] sm:text-xs font-black font-mono text-amber-300 tracking-wide leading-tight truncate">
                  {currentOffer.couponCode}
                </span>
              </div>
            </div>

            {/* Copy Button */}
            <button
              type="button"
              id={`copy-coupon-btn-${safeIndex}`}
              onClick={(e) => handleCopyCoupon(currentOffer.couponCode, e)}
              className={`h-6 sm:h-7 px-2 sm:px-2.5 rounded-lg text-[10px] sm:text-xs font-bold transition-all flex items-center justify-center gap-1 shrink-0 cursor-pointer active:scale-95 border border-white/15 ${
                isCurrentCopied
                  ? 'bg-emerald-600 text-white'
                  : 'bg-violet-600 hover:bg-violet-500 text-white shadow-xs'
              }`}
              title="Click to copy coupon code"
            >
              {isCurrentCopied ? (
                <>
                  <Check size={11} className="stroke-[3]" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy size={11} />
                  <span>Copy</span>
                </>
              )}
            </button>

            {/* Quick Use CTA */}
            <button
              type="button"
              id={`use-offer-btn-${safeIndex}`}
              onClick={(e) => handleUseOffer(currentOffer, e)}
              className="h-6 sm:h-7 px-2 sm:px-2.5 rounded-lg text-[10px] sm:text-xs font-bold text-white bg-white/20 hover:bg-white/30 border border-white/20 transition-all flex items-center justify-center gap-0.5 shrink-0 active:scale-95 cursor-pointer"
              title="Apply coupon & view products"
            >
              <span>Use</span>
              <ArrowRight size={10} />
            </button>
          </motion.div>
        </div>

        {/* Desktop Hover Navigation Arrows */}
        <button
          type="button"
          id="special-offers-prev-btn"
          onClick={(e) => {
            e.stopPropagation();
            prevSlide();
          }}
          className="hidden sm:flex absolute left-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 hover:bg-violet-600 text-white items-center justify-center backdrop-blur-md transition-all duration-200 opacity-0 group-hover:opacity-100 z-20 cursor-pointer border border-white/20 shadow-md active:scale-90"
          aria-label="Previous Offer"
        >
          <ChevronLeft size={16} />
        </button>

        <button
          type="button"
          id="special-offers-next-btn"
          onClick={(e) => {
            e.stopPropagation();
            nextSlide();
          }}
          className="hidden sm:flex absolute right-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 hover:bg-violet-600 text-white items-center justify-center backdrop-blur-md transition-all duration-200 opacity-0 group-hover:opacity-100 z-20 cursor-pointer border border-white/20 shadow-md active:scale-90"
          aria-label="Next Offer"
        >
          <ChevronRight size={16} />
        </button>

        {/* Slide Pagination Indicator Pills (Bottom-Right) */}
        <div className="absolute bottom-2 right-2 sm:bottom-3 sm:right-3.5 z-20 flex items-center gap-1 sm:gap-1.5 bg-black/70 backdrop-blur-md px-2 py-1 rounded-full border border-white/20 shadow-md">
          <span className="text-[9px] font-bold text-amber-200 font-mono mr-0.5 hidden xs:inline">
            {safeIndex + 1}/{activeOfferBanners.length}
          </span>
          {activeOfferBanners.map((slide, idx) => (
            <button
              key={`special-offer-dot-${slide.id || idx}-${idx}`}
              type="button"
              id={`special-offer-dot-${idx}`}
              onClick={(e) => {
                e.stopPropagation();
                setDirection(idx >= safeIndex ? 1 : -1);
                setCurrentIndex(idx);
              }}
              className={`rounded-full transition-all duration-300 cursor-pointer ${
                safeIndex === idx
                  ? 'w-4 sm:w-5 h-1 sm:h-1.5 bg-gradient-to-r from-amber-400 to-rose-500 shadow-xs'
                  : 'w-1 sm:w-1.5 h-1 sm:h-1.5 bg-white/40 hover:bg-white/80'
              }`}
              aria-label={`Offer Slide ${idx + 1}`}
            />
          ))}
        </div>

        {/* Subtle Continuous Autoplay Progress Bar */}
        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-white/10 z-20 overflow-hidden">
          <motion.div
            key={`progress-offers-${safeIndex}-${isPaused}`}
            initial={{ width: '0%' }}
            animate={{ width: isPaused ? '0%' : '100%' }}
            transition={{ duration: 4.5, ease: 'linear' }}
            className="h-full bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500"
          />
        </div>
      </div>
    </section>
  );
};
