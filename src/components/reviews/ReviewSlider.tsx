import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useStore } from '../../context/StoreContext';
import { useAuth } from '../../context/AuthContext';
import { formatTimeAgo, cleanLocation } from '../../utils/formatters';
import {
  Star,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Gamepad2,
  ThumbsUp,
  Quote,
  ShoppingBag,
  ExternalLink,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const ReviewSlider: React.FC = () => {
  const { reviews, products, openReviews, openProduct, showToast } = useStore();
  const { currentUser } = useAuth();

  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [direction, setDirection] = useState<number>(1);
  const [likedReviews, setLikedReviews] = useState<Record<string, boolean>>({});
  const touchStartX = useRef<number | null>(null);

  // Filter only published reviews
  const visibleReviews = useMemo(() => {
    return reviews.filter((r) => r.status !== 'hidden');
  }, [reviews]);

  // Aggregate Rating stats from real database data
  const totalReviewsCount = visibleReviews.length;
  const avgRating =
    totalReviewsCount > 0
      ? (visibleReviews.reduce((acc, r) => acc + (r.rating || 5), 0) / totalReviewsCount).toFixed(1)
      : '5.0';

  // Auto-play swipe every 6 seconds if not paused and more than 1 review
  useEffect(() => {
    if (isPaused || visibleReviews.length <= 1) return;
    const interval = setInterval(() => {
      setDirection(1);
      setCurrentIndex((prev) => (prev + 1) % visibleReviews.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [isPaused, visibleReviews.length]);

  const handlePrev = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setIsPaused(true);
    setDirection(-1);
    setCurrentIndex((prev) => (prev === 0 ? visibleReviews.length - 1 : prev - 1));
  };

  const handleNext = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setIsPaused(true);
    setDirection(1);
    setCurrentIndex((prev) => (prev + 1) % visibleReviews.length);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    setIsPaused(true);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX.current - touchEndX;
    if (Math.abs(diff) > 35) {
      if (diff > 0) {
        handleNext();
      } else {
        handlePrev();
      }
    }
    touchStartX.current = null;
  };

  const toggleLike = (reviewId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setLikedReviews((prev) => {
      const next = !prev[reviewId];
      if (next) {
        showToast('success', 'Helpful 👍', 'Marked review as helpful.');
      }
      return { ...prev, [reviewId]: next };
    });
  };

  if (visibleReviews.length === 0) {
    return null;
  }

  const currentReview = visibleReviews[currentIndex] || visibleReviews[0];
  const isCurrentLiked = likedReviews[currentReview.id || String(currentIndex)];

  // Normalized review properties supporting both camelCase and snake_case
  const authorName = currentReview.userName || (currentReview as any).user_name || 'Valued Customer';
  const authorPhoto = currentReview.userPhoto || (currentReview as any).user_photo || '';
  const authorLocation = currentReview.userLocation || (currentReview as any).user_location || '';
  const prodName = currentReview.productName || (currentReview as any).product_name || '';
  const pkgName = currentReview.packageName || (currentReview as any).package_name || '';
  const prodId = currentReview.productId || (currentReview as any).product_id;
  const replyText = currentReview.adminReply || (currentReview as any).admin_reply || null;
  const replyTime = currentReview.adminReplyAt || (currentReview as any).admin_reply_at || (currentReview as any).replied_at || null;
  const ratingValue = Number(currentReview.rating) || 5;
  const commentText = currentReview.comment || '';
  const reviewTime = currentReview.createdAt || (currentReview as any).created_at;

  // Match review with product for direct quick navigation
  const matchingProduct = products.find(
    (p) =>
      p.id === prodId ||
      (prodName && p.name.toLowerCase().includes(prodName.toLowerCase()))
  );

  const slideVariants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 24 : -24,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (dir: number) => ({
      x: dir > 0 ? -24 : 24,
      opacity: 0,
    }),
  };

  return (
    <section
      className="w-full space-y-2.5 select-none"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      aria-label="Verified Customer Reviews"
    >
      {/* Header Row: Title, Trust Score & Actions */}
      <div className="flex items-center justify-between gap-2 px-1">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h2 className="text-sm sm:text-base font-black text-slate-900 tracking-tight flex items-center gap-1.5">
              <span>Customer Reviews</span>
            </h2>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-50 text-red-700 text-[10px] font-extrabold border border-red-200/80 shrink-0">
              <Sparkles size={11} className="text-red-600" />
              Verified Gamers
            </span>
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <div className="flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={`summary-star-${s}`}
                  size={12}
                  className={
                    s <= Math.round(Number(avgRating))
                      ? 'fill-amber-400 text-amber-400'
                      : 'fill-slate-200 text-slate-200'
                  }
                />
              ))}
            </div>
            <span className="text-xs font-black text-slate-900 font-mono">{avgRating}</span>
            <span className="text-[11px] text-slate-300 font-bold">·</span>
            <span className="text-[11px] text-slate-500 font-semibold truncate">
              {totalReviewsCount} {totalReviewsCount === 1 ? 'Review' : 'Reviews'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* View All Button */}
          <button
            type="button"
            onClick={() => openReviews()}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 active:scale-95 text-red-700 text-xs font-black border border-red-200/80 transition-all cursor-pointer shadow-2xs group"
          >
            <span>View All</span>
            <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
          </button>

          {/* Navigation Arrows */}
          {visibleReviews.length > 1 && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handlePrev}
                className="w-7 h-7 rounded-xl bg-white hover:bg-slate-100 border border-slate-200/90 text-slate-600 flex items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-90"
                aria-label="Previous Review"
              >
                <ChevronLeft size={15} />
              </button>
              <button
                type="button"
                onClick={handleNext}
                className="w-7 h-7 rounded-xl bg-white hover:bg-slate-100 border border-slate-200/90 text-slate-600 flex items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-90"
                aria-label="Next Review"
              >
                <ChevronRight size={15} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Review Card Slider with Polished Look */}
      <div className="relative overflow-hidden">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={`review-slide-${currentReview.id || currentIndex}-${currentIndex}`}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="bg-white border border-slate-200/90 rounded-3xl p-4 sm:p-5 shadow-xs hover:border-red-300/80 transition-all space-y-3 relative overflow-hidden"
          >
            {/* Ambient subtle decorative glow */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-red-100/40 via-orange-50/20 to-transparent rounded-full pointer-events-none -mr-8 -mt-8 blur-lg" />

            {/* Top Row: User Avatar, Name, Verified Badge & Star Rating */}
            <div className="flex items-start justify-between gap-3 relative z-10">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-red-100 to-rose-100 border border-red-200/80 text-red-700 font-black text-sm flex items-center justify-center overflow-hidden shrink-0 shadow-2xs">
                  {authorPhoto ? (
                    <img
                      src={authorPhoto}
                      alt={authorName}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    authorName?.charAt(0).toUpperCase() || 'G'
                  )}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs sm:text-sm font-black text-slate-900 truncate">
                      {authorName}
                    </span>
                    <span className="text-xs" title="Nepal Gamer">🇳🇵</span>
                    <span className="inline-flex items-center gap-0.5 text-[9px] font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded-md shrink-0">
                      <ShieldCheck size={10} className="text-emerald-600 shrink-0" />
                      Verified Buyer
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-0.5 font-mono">
                    {authorLocation && <span>📍 {cleanLocation(authorLocation)}</span>}
                    {authorLocation && <span>·</span>}
                    <span>{formatTimeAgo(reviewTime)}</span>
                  </div>
                </div>
              </div>

              {/* Star Rating Badge */}
              <div className="flex items-center gap-1 bg-amber-50 border border-amber-200/80 px-2 py-1 rounded-xl shrink-0 shadow-2xs">
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={`card-star-${currentReview.id || currentIndex}-${s}`}
                      size={11}
                      className={
                        s <= ratingValue
                          ? 'fill-amber-400 text-amber-400'
                          : 'fill-slate-200 text-slate-200'
                      }
                    />
                  ))}
                </div>
                <span className="text-xs font-black font-mono text-amber-900 ml-0.5">
                  {ratingValue}.0
                </span>
              </div>
            </div>

            {/* Product / Package Context Pill */}
            {(prodName || pkgName) && (
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div
                  onClick={() => {
                    if (matchingProduct) {
                      openProduct(matchingProduct.id);
                    } else if (prodId) {
                      openReviews(prodId);
                    }
                  }}
                  className="inline-flex items-center gap-1.5 bg-slate-50 hover:bg-red-50/70 border border-slate-200/80 hover:border-red-200 px-2.5 py-1 rounded-xl text-[11px] font-bold text-slate-700 max-w-full transition-all cursor-pointer group"
                >
                  <Gamepad2 size={12} className="text-red-600 shrink-0 group-hover:scale-110 transition-transform" />
                  <span className="text-slate-900 truncate font-black group-hover:text-red-700">
                    {prodName}
                  </span>
                  {pkgName && (
                    <>
                      <span className="text-slate-300 font-normal">·</span>
                      <span className="text-slate-500 font-semibold truncate">
                        {pkgName}
                      </span>
                    </>
                  )}
                  <ExternalLink size={10} className="text-slate-400 group-hover:text-red-600 ml-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>

                {visibleReviews.length > 1 && (
                  <span className="text-[10px] font-mono text-slate-400 font-bold px-1.5 py-0.5 rounded-md bg-slate-50 border border-slate-100 shrink-0">
                    {currentIndex + 1} of {visibleReviews.length}
                  </span>
                )}
              </div>
            )}

            {/* Customer Review Comment */}
            <div className="relative pl-3.5 border-l-2 border-red-300/80 py-0.5">
              <p className="text-xs sm:text-sm text-slate-800 leading-relaxed font-medium">
                &ldquo;{commentText}&rdquo;
              </p>
            </div>

            {/* Official Unx Games Reply (If present) */}
            {replyText && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-r from-red-50/95 via-orange-50/80 to-red-50/70 border border-red-200/90 rounded-2xl p-3 sm:p-3.5 space-y-1.5 shadow-2xs"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-md bg-red-600 text-white flex items-center justify-center text-[10px] font-black shadow-2xs">
                      G
                    </span>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-black text-red-900">
                        Unx Games
                      </span>
                      <span className="inline-flex items-center gap-0.5 text-[9px] font-extrabold text-red-700 bg-red-100/90 px-1.5 py-0.2 rounded-md border border-red-300/60">
                        <Sparkles size={10} className="text-red-600" />
                        Official Response
                      </span>
                    </div>
                  </div>
                  {replyTime && (
                    <span className="text-[10px] text-red-600/80 font-mono">
                      {formatTimeAgo(replyTime)}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-800 leading-relaxed font-medium pl-6.5">
                  {replyText}
                </p>
              </motion.div>
            )}

            {/* Card Footer: Delivery Status, Helpful Button & Read More */}
            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-100 font-mono">
              <span className="text-emerald-700 font-bold flex items-center gap-1">
                <CheckCircle2 size={12} className="text-emerald-600" />
                Delivered &amp; Verified
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={(e) => toggleLike(currentReview.id || String(currentIndex), e)}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95 ${
                    isCurrentLiked
                      ? 'bg-red-100 text-red-800 border border-red-300'
                      : 'bg-slate-100/80 hover:bg-slate-200 text-slate-600'
                  }`}
                >
                  <ThumbsUp size={11} className={isCurrentLiked ? 'fill-red-700 text-red-700' : ''} />
                  <span>{isCurrentLiked ? 'Helpful (1)' : 'Helpful'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => openReviews(currentReview.productId)}
                  className="text-red-600 hover:text-red-800 font-bold hover:underline cursor-pointer flex items-center gap-0.5 font-sans text-xs"
                >
                  <span>More</span>
                  <ArrowRight size={11} />
                </button>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Interactive Pagination Indicator Pills */}
      {visibleReviews.length > 1 && (
        <div className="flex items-center justify-center gap-1.5 pt-0.5">
          {visibleReviews.slice(0, 10).map((rev, idx) => (
            <button
              key={`review-slider-dot-${rev.id || idx}-${idx}`}
              type="button"
              onClick={() => {
                setIsPaused(true);
                setDirection(idx > currentIndex ? 1 : -1);
                setCurrentIndex(idx);
              }}
              className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                currentIndex === idx
                  ? 'w-6 bg-red-600 shadow-2xs'
                  : 'w-1.5 bg-slate-200 hover:bg-slate-300'
              }`}
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>
      )}
    </section>
  );
};
