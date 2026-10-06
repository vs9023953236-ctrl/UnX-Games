import React, { useState, useMemo } from 'react';
import { useStore } from '../context/StoreContext';
import { useAuth } from '../context/AuthContext';
import { ReviewModal } from '../components/reviews/ReviewModal';
import { formatTimeAgo, cleanLocation, formatDisplayOrderId } from '../utils/formatters';
import {
  ArrowLeft,
  Star,
  ShieldCheck,
  CheckCircle2,
  Gamepad2,
  Sparkles,
  Search,
  X,
  UserCheck,
  ThumbsUp,
  Share2,
  Zap,
  ShoppingBag,
  Award,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const ReviewsPage: React.FC = () => {
  const {
    reviews,
    products,
    selectedProductId,
    setSelectedProductId,
    setCurrentTab,
    goBack,
    getUserOrders,
    showToast,
  } = useStore();
  const { currentUser } = useAuth();

  const [ratingFilter, setRatingFilter] = useState<'all' | '5' | '4' | '3' | '2' | '1'>('all');
  
  // Selected product context if opened for a specific game
  const targetProduct = useMemo(() => {
    if (!selectedProductId) return null;
    return products.find((p) => p.id === selectedProductId) || null;
  }, [products, selectedProductId]);

  const [selectedGameFilter, setSelectedGameFilter] = useState<string>(() => {
    if (selectedProductId) {
      const found = products.find((p) => p.id === selectedProductId);
      if (found) return found.name;
    }
    return 'all';
  });

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'newest' | 'highest' | 'lowest' | 'has_reply'>('newest');
  const [isReviewModalOpen, setIsReviewModalOpen] = useState<boolean>(false);
  const [likedReviews, setLikedReviews] = useState<Record<string, boolean>>({});

  // Reset page-level modals and search query on unmount
  React.useEffect(() => {
    return () => {
      setIsReviewModalOpen(false);
      setSearchQuery('');
    };
  }, []);

  // List of unique games from existing reviews
  const availableGameNames = useMemo(() => {
    const names = new Set<string>();
    reviews.forEach((r) => {
      if (r.productName) names.add(r.productName);
    });
    return Array.from(names);
  }, [reviews]);

  // Base reviews (exclude hidden reviews from customers unless authored by current user)
  const baseReviews = useMemo(() => {
    return reviews.filter((r) => {
      if (r.status === 'hidden' && r.userId !== currentUser?.uid) return false;
      return true;
    });
  }, [reviews, currentUser?.uid]);

  // Filter reviews strictly based on game filter, star rating, search query, and sort
  const filteredReviews = useMemo(() => {
    let list = [...baseReviews];

    // Filter by Game
    if (selectedGameFilter !== 'all') {
      const gFilter = selectedGameFilter.toLowerCase();
      list = list.filter((r) => {
        const pName = (r.productName || '').toLowerCase();
        return pName.includes(gFilter) || gFilter.includes(pName);
      });
    }

    // Filter by Star Rating
    if (ratingFilter !== 'all') {
      const targetStar = parseInt(ratingFilter, 10);
      list = list.filter((r) => Math.round(r.rating || 5) === targetStar);
    }

    // Filter by Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (r) =>
          r.userName.toLowerCase().includes(q) ||
          (r.comment || '').toLowerCase().includes(q) ||
          (r.productName || '').toLowerCase().includes(q) ||
          (r.packageName || '').toLowerCase().includes(q) ||
          (r.adminReply || '').toLowerCase().includes(q)
      );
    }

    // Sort
    list.sort((a, b) => {
      if (sortBy === 'newest') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (sortBy === 'highest') {
        return (b.rating || 5) - (a.rating || 5);
      }
      if (sortBy === 'lowest') {
        return (a.rating || 5) - (b.rating || 5);
      }
      if (sortBy === 'has_reply') {
        const aHas = a.adminReply ? 1 : 0;
        const bHas = b.adminReply ? 1 : 0;
        if (bHas !== aHas) return bHas - aHas;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      return 0;
    });

    return list;
  }, [baseReviews, selectedGameFilter, ratingFilter, searchQuery, sortBy]);

  // Aggregate Rating Calculations from real database data for the active game filter (or all)
  const activeScopeReviews = useMemo(() => {
    if (selectedGameFilter === 'all') return baseReviews;
    const gFilter = selectedGameFilter.toLowerCase();
    return baseReviews.filter((r) => {
      const pName = (r.productName || '').toLowerCase();
      return pName.includes(gFilter) || gFilter.includes(pName);
    });
  }, [baseReviews, selectedGameFilter]);

  const totalReviewsCount = activeScopeReviews.length;
  const avgRating =
    totalReviewsCount > 0
      ? (activeScopeReviews.reduce((sum, r) => sum + (r.rating || 5), 0) / totalReviewsCount).toFixed(1)
      : '5.0';

  const starCounts = useMemo(() => {
    const counts: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    activeScopeReviews.forEach((r) => {
      const star = Math.min(5, Math.max(1, Math.round(r.rating || 5)));
      counts[star] = (counts[star] || 0) + 1;
    });
    return counts;
  }, [activeScopeReviews]);

  // Check verified order eligibility for the current user
  const userOrders = currentUser ? getUserOrders(currentUser.uid, currentUser.email) : [];
  const eligibleCompletedOrder = useMemo(() => {
    if (!currentUser) return null;
    if (targetProduct) {
      return userOrders.find((o) => {
        const oPName = (o.productName || '').toLowerCase();
        const tPName = (targetProduct?.name || '').toLowerCase();
        const matchesId = Boolean(targetProduct?.id && o.productId === targetProduct.id);
        const matchesName = Boolean(tPName && oPName && (oPName.includes(tPName) || tPName.includes(oPName)));
        const isDone = o.orderStatus === 'completed' || o.orderStatus === 'delivered' || o.status === 'completed' || o.status === 'delivered';
        return (matchesId || matchesName) && isDone;
      });
    }
    // If viewing global reviews, find any completed order
    return userOrders.find((o) => o.orderStatus === 'completed' || o.orderStatus === 'delivered');
  }, [userOrders, targetProduct, currentUser]);

  // Check if current user already submitted a review
  const userExistingReview = useMemo(() => {
    if (!currentUser) return null;
    if (targetProduct) {
      return baseReviews.find((r) => r.userId === currentUser.uid && r.productId === targetProduct.id);
    }
    return baseReviews.find((r) => r.userId === currentUser.uid);
  }, [currentUser, targetProduct, baseReviews]);

  const handleBack = () => {
    if (targetProduct) {
      setCurrentTab('product_detail');
    } else {
      goBack('home');
    }
  };

  const toggleLike = (reviewId: string) => {
    setLikedReviews((prev) => {
      const next = !prev[reviewId];
      if (next) {
        showToast('success', 'Helpful 👍', 'Marked review as helpful.');
      }
      return { ...prev, [reviewId]: next };
    });
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator
        .share({
          title: 'Unx Games Verified Reviews',
          text: `Check out ${totalReviewsCount}+ verified gaming reviews on Unx Games! Rating: ${avgRating} ★`,
          url: window.location.href,
        })
        .catch(() => {});
    } else {
      navigator.clipboard?.writeText(window.location.href);
      showToast('success', 'Link Copied 📋', 'Reviews link copied to clipboard.');
    }
  };

  return (
    <div className="w-full bg-transparent font-sans pb-1 sm:pb-1.5 px-3 sm:px-3 max-w-2xl mx-auto space-y-3 pt-1 sm:pt-1.5 select-none text-slate-900 selection:bg-red-500 selection:text-white">
      {/* ========================================================================= */}
      {/* 1. APP STORE STYLE COMMUNITY RATING & TRUST SCORE CARD                     */}
      {/* ========================================================================= */}
      <section className="bg-white border border-slate-200/90 rounded-3xl p-4 sm:p-5 shadow-xs relative overflow-hidden">
        {/* Subtle Background Radial Glow */}
        <div className="absolute top-0 right-0 w-36 h-36 bg-gradient-to-bl from-red-100/50 via-orange-50/20 to-transparent rounded-full pointer-events-none -mr-8 -mt-8 blur-xl" />

        {/* Card Header Tag */}
        <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3 mb-3.5 relative">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h1 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wider truncate">
                Community Trust Score
              </h1>
              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-mono font-extrabold text-[10px]">
                <Star size={10} className="fill-amber-400 text-amber-400" />
                {avgRating}
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-medium truncate">
              {selectedGameFilter === 'all'
                ? `100% Verified Nepali Gamers (${totalReviewsCount} Ratings)`
                : `${selectedGameFilter} · ${totalReviewsCount} Ratings`}
            </p>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleShare}
              className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-90 text-slate-600 flex items-center justify-center transition-all cursor-pointer shadow-2xs"
              title="Share Reviews"
            >
              <Share2 size={14} />
            </button>

            {targetProduct && (
              <button
                type="button"
                onClick={() => {
                  setSelectedProductId(targetProduct.id);
                  setCurrentTab('product_detail');
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 text-xs font-black border border-red-200/80 transition-all cursor-pointer shrink-0 active:scale-95"
              >
                <ShoppingBag size={13} />
                <span className="hidden xs:inline">Game</span>
              </button>
            )}

            <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-700 text-[11px] font-extrabold border border-emerald-200/80 shadow-2xs">
              <ShieldCheck size={13} className="text-emerald-600" />
              Verified Top-Ups
            </span>
          </div>
        </div>

        {/* Score & Interactive Star Histogram */}
        <div className="grid grid-cols-12 gap-3.5 items-center relative">
          {/* Left: Giant Score & Stars */}
          <div className="col-span-5 text-center flex flex-col items-center justify-center pr-2 border-r border-slate-100">
            <div className="text-4xl sm:text-5xl font-black text-slate-900 font-mono tracking-tighter flex items-baseline justify-center gap-1">
              <span>{avgRating}</span>
              <span className="text-xs text-slate-400 font-bold font-sans">/ 5</span>
            </div>

            <div className="flex items-center gap-0.5 my-2">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={`avg-summary-star-${s}`}
                  size={15}
                  className={
                    s <= Math.round(Number(avgRating))
                      ? 'fill-amber-400 text-amber-400'
                      : 'fill-slate-200 text-slate-200'
                  }
                />
              ))}
            </div>

            <span className="text-[11px] font-bold text-slate-600 font-mono">
              {totalReviewsCount} {totalReviewsCount === 1 ? 'Rating' : 'Ratings'}
            </span>
          </div>

          {/* Right: Interactive 5-Star Breakdown Bars */}
          <div className="col-span-7 space-y-1.5 pl-1">
            {[5, 4, 3, 2, 1].map((stars) => {
              const count = starCounts[stars] || 0;
              const percentage =
                totalReviewsCount > 0
                  ? Math.round((count / totalReviewsCount) * 100)
                  : stars === 5
                  ? 100
                  : 0;
              const isCurrentFilter = ratingFilter === String(stars);

              return (
                <button
                  key={`breakdown-star-bar-${stars}`}
                  type="button"
                  onClick={() =>
                    setRatingFilter(isCurrentFilter ? 'all' : (String(stars) as any))
                  }
                  className={`w-full flex items-center gap-2 text-[11px] group cursor-pointer transition-all p-1 rounded-xl ${
                    isCurrentFilter
                      ? 'bg-red-50/80 ring-1 ring-red-300'
                      : 'hover:bg-slate-50'
                  }`}
                >
                  <span className="w-5 font-bold text-slate-700 text-right flex items-center justify-end gap-0.5 shrink-0">
                    {stars}{' '}
                    <Star size={10} className="fill-amber-400 text-amber-400 inline" />
                  </span>
                  <div className="flex-1 h-2.5 rounded-full bg-slate-100 overflow-hidden relative shadow-inner">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isCurrentFilter
                          ? 'bg-gradient-to-r from-red-600 to-orange-600'
                          : 'bg-amber-400 group-hover:bg-amber-500'
                      }`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className="w-6 text-[10px] text-slate-400 font-mono text-right font-bold shrink-0">
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Quick Perks Strip */}
        <div className="grid grid-cols-3 gap-2 mt-4 pt-3.5 border-t border-slate-100 text-center">
          <div className="p-2 rounded-2xl bg-slate-50/80 border border-slate-100">
            <Zap size={14} className="text-amber-500 mx-auto mb-1" />
            <div className="text-[11px] font-black text-slate-900">3-5 Min</div>
            <div className="text-[9px] text-slate-400 font-medium">Avg Delivery</div>
          </div>
          <div className="p-2 rounded-2xl bg-slate-50/80 border border-slate-100">
            <ShieldCheck size={14} className="text-emerald-600 mx-auto mb-1" />
            <div className="text-[11px] font-black text-slate-900">100% Safe</div>
            <div className="text-[9px] text-slate-400 font-medium">Official UID</div>
          </div>
          <div className="p-2 rounded-2xl bg-slate-50/80 border border-slate-100">
            <Award size={14} className="text-red-600 mx-auto mb-1" />
            <div className="text-[11px] font-black text-slate-900">24/7 Care</div>
            <div className="text-[9px] text-slate-400 font-medium">Fast Support</div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 2. USER WRITE / EDIT REVIEW CALL-TO-ACTION CARD                            */}
      {/* ========================================================================= */}
      {currentUser ? (
        eligibleCompletedOrder ? (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-slate-950 via-red-950 to-orange-950 text-white rounded-3xl p-4 sm:p-5 shadow-sm shadow-red-950/20 relative overflow-hidden"
          >
            <div className="flex items-center justify-between gap-3 relative z-10">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-11 h-11 rounded-2xl bg-white/15 border border-white/25 flex items-center justify-center text-white shrink-0 shadow-2xs backdrop-blur-md">
                  <Star size={20} className="fill-amber-300 text-amber-300" />
                </div>
                <div className="min-w-0">
                  <span className="inline-flex items-center gap-1 text-[10px] font-black text-amber-300 uppercase tracking-wider">
                    <Sparkles size={11} />
                    {userExistingReview ? 'Feedback Live' : 'Verified Order Ready'}
                  </span>
                  <h3 className="text-xs sm:text-sm font-black text-white leading-tight truncate">
                    {userExistingReview
                      ? 'Update Your Gaming Review'
                      : 'Rate Your Top-Up Experience'}
                  </h3>
                  <p className="text-[11px] text-orange-200 font-medium truncate mt-0.5 font-mono">
                    Order #{formatDisplayOrderId(eligibleCompletedOrder)} ·{' '}
                    {eligibleCompletedOrder.packageName || eligibleCompletedOrder.productName}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsReviewModalOpen(true)}
                className="px-3.5 py-2.5 rounded-2xl bg-white text-red-700 hover:bg-orange-50 active:scale-95 font-black text-xs shadow-md transition-all cursor-pointer shrink-0"
              >
                {userExistingReview ? 'Edit Review' : 'Write Review'}
              </button>
            </div>
          </motion.div>
        ) : (
          <div className="bg-white border border-slate-200/90 rounded-2xl p-3.5 flex items-center justify-between gap-2.5 text-slate-600 shadow-2xs">
            <div className="flex items-center gap-2 min-w-0">
              <ShieldCheck size={16} className="text-red-600 shrink-0" />
              <p className="text-xs font-semibold text-slate-700 truncate">
                Complete any game top-up to unlock verified reviews!
              </p>
            </div>
            <button
              type="button"
              onClick={() => setCurrentTab('shop')}
              className="text-xs font-black text-red-700 hover:text-red-800 bg-red-50 hover:bg-red-100 px-2.5 py-1 rounded-xl transition-all cursor-pointer shrink-0"
            >
              Top-Up Now
            </button>
          </div>
        )
      ) : (
        <div className="bg-white border border-slate-200/90 rounded-2xl p-3.5 flex items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <UserCheck size={18} className="text-red-600 shrink-0" />
            <p className="text-xs text-slate-700 font-semibold truncate">
              Sign in with your account to rate your orders.
            </p>
          </div>
          <button
            onClick={() => setCurrentTab('login')}
            className="text-xs font-black text-white bg-red-600 hover:bg-red-700 px-3 py-1.5 rounded-xl transition-all cursor-pointer shrink-0 shadow-2xs active:scale-95"
          >
            Sign In
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. SEARCH & NATIVE GAME FILTER TABS                                        */}
      {/* ========================================================================= */}
      <section className="space-y-2.5 pt-1">
        {/* Search Input */}
        <div className="relative">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search reviews, gamer names, or games..."
            className="w-full bg-white border border-slate-200 rounded-2xl pl-9 pr-9 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all shadow-2xs font-medium"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Horizontal Game Selector Carousel (Mobile-First) */}
        {availableGameNames.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 -mx-4 px-4 sm:-mx-0 sm:px-0">
            <button
              type="button"
              onClick={() => setSelectedGameFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                selectedGameFilter === 'all'
                  ? 'bg-red-600 text-white shadow-2xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:border-red-200'
              }`}
            >
              <Gamepad2 size={13} />
              <span>All Games</span>
            </button>

            {availableGameNames.map((gName, gIdx) => {
              const isSelected = selectedGameFilter === gName;
              return (
                <button
                  key={`game-filter-${gName}-${gIdx}`}
                  type="button"
                  onClick={() => setSelectedGameFilter(isSelected ? 'all' : gName)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-red-600 text-white shadow-2xs'
                      : 'bg-white border border-slate-200 text-slate-600 hover:border-red-200'
                  }`}
                >
                  <span>{gName}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Star Filter & Sort Row */}
        <div className="flex items-center justify-between gap-2 overflow-x-auto no-scrollbar py-0.5">
          {/* Star Filters */}
          <div className="flex items-center gap-1.5 shrink-0">
            {(['all', '5', '4', '3', '2', '1'] as const).map((chip, cIdx) => {
              const isActive = ratingFilter === chip;
              const count =
                chip === 'all'
                  ? totalReviewsCount
                  : starCounts[parseInt(chip, 10)] || 0;

              return (
                <button
                  key={`star-chip-${chip}-${cIdx}`}
                  onClick={() => setRatingFilter(chip)}
                  className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1 active:scale-95 ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-2xs'
                      : 'bg-white border border-slate-200/90 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span>{chip === 'all' ? 'All Stars' : `${chip} ★`}</span>
                  <span
                    className={`text-[9px] font-mono px-1 rounded-md ${
                      isActive ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Sort Selector */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="text-[11px] font-bold bg-white border border-slate-200 rounded-xl px-2 py-1 text-slate-700 focus:outline-none focus:ring-1 focus:ring-red-500 shrink-0 cursor-pointer shadow-2xs"
          >
            <option value="newest">🕒 Newest</option>
            <option value="highest">⭐ Highest</option>
            <option value="lowest">📉 Lowest</option>
            <option value="has_reply">💬 Official Reply</option>
          </select>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 4. NATIVE MOBILE REVIEW CARDS FEED                                         */}
      {/* ========================================================================= */}
      <section className="space-y-3 pt-1">
        {filteredReviews.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="py-12 text-center bg-white border border-slate-200/90 rounded-3xl p-6 shadow-2xs space-y-3"
          >
            <div className="w-12 h-12 rounded-2xl bg-red-50 border border-red-100 text-red-600 flex items-center justify-center mx-auto shadow-2xs">
              <Star size={24} className="fill-red-200 text-red-600" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900">No reviews match your filters</h3>
              <p className="text-xs text-slate-500 max-w-xs mx-auto mt-1 font-medium">
                {searchQuery
                  ? `No reviews matching "${searchQuery}". Try a different keyword.`
                  : `No reviews found for ${ratingFilter === 'all' ? selectedGameFilter : `${ratingFilter} stars`}.`}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setRatingFilter('all');
                setSelectedGameFilter('all');
                setSearchQuery('');
                setSortBy('newest');
              }}
              className="px-4 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 text-xs font-black transition-all cursor-pointer active:scale-95"
            >
              Reset All Filters
            </button>
          </motion.div>
        ) : (
          <AnimatePresence>
            {filteredReviews.map((rev, revIdx) => {
              const isLiked = likedReviews[rev.id || String(revIdx)];
              const revAuthor = rev.userName || (rev as any).user_name || 'Valued Customer';
              const revPhoto = rev.userPhoto || (rev as any).user_photo;
              const revLocation = rev.userLocation || (rev as any).user_location;
              const revProduct = rev.productName || (rev as any).product_name;
              const revPackage = rev.packageName || (rev as any).package_name;
              const revReply = rev.adminReply || (rev as any).admin_reply;
              const revReplyAt = rev.adminReplyAt || (rev as any).admin_reply_at || (rev as any).replied_at;
              const revRating = Number(rev.rating) || 5;
              const revComment = rev.comment || '';
              const revCreated = rev.createdAt || (rev as any).created_at;

              return (
                <motion.div
                  key={`page-rev-${rev.id || revIdx}-${revIdx}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: Math.min(revIdx * 0.03, 0.3) }}
                  className="bg-white border border-slate-200/90 rounded-3xl p-4 sm:p-5 shadow-xs hover:border-red-200 transition-all space-y-3 relative overflow-hidden"
                >
                  {/* User Header Row */}
                  <div className="flex items-start justify-between gap-3">
                    {/* Avatar & User Details */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-red-100 to-orange-100 border border-orange-200/80 text-red-700 font-black text-sm flex items-center justify-center overflow-hidden shrink-0 shadow-2xs">
                        {revPhoto ? (
                          <img
                            src={revPhoto}
                            alt={revAuthor}
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          revAuthor?.charAt(0).toUpperCase() || 'G'
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs sm:text-sm font-black text-slate-900 truncate">
                            {revAuthor}
                          </span>
                          <span className="text-xs" title="Nepal Gamer">🇳🇵</span>
                          <span className="inline-flex items-center gap-0.5 text-[9px] font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded-md shrink-0">
                            <ShieldCheck size={10} className="text-emerald-600 shrink-0" />
                            Verified Buyer
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-0.5 font-mono">
                          {revLocation && <span>📍 {cleanLocation(revLocation)}</span>}
                          {revLocation && <span>·</span>}
                          <span>{formatTimeAgo(revCreated)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Star Rating Badge */}
                    <div className="flex items-center gap-1 bg-amber-50 border border-amber-200/80 px-2 py-1 rounded-xl shrink-0 shadow-2xs">
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={`rev-item-star-${rev.id || revIdx}-${s}`}
                            size={11}
                            className={
                              s <= revRating
                                ? 'fill-amber-400 text-amber-400'
                                : 'fill-slate-200 text-slate-200'
                            }
                          />
                        ))}
                      </div>
                      <span className="text-xs font-black font-mono text-amber-900 ml-0.5">
                        {revRating}.0
                      </span>
                    </div>
                  </div>

                  {/* Product & Package Context Pill */}
                  {(revProduct || revPackage) && (
                    <div className="inline-flex items-center gap-1.5 bg-slate-50 border border-slate-200/80 px-2.5 py-1 rounded-xl text-[11px] font-bold text-slate-700 max-w-full">
                      <Gamepad2 size={12} className="text-red-600 shrink-0" />
                      <span className="text-slate-900 truncate font-black">
                        {revProduct}
                      </span>
                      {revPackage && (
                        <>
                          <span className="text-slate-300 font-normal">·</span>
                          <span className="text-slate-500 font-semibold truncate">
                            {revPackage}
                          </span>
                        </>
                      )}
                    </div>
                  )}

                  {/* Quoted Customer Comment */}
                  <div className="relative pl-3.5 border-l-2 border-red-300/80 py-0.5">
                    <p className="text-xs sm:text-sm text-slate-800 leading-relaxed font-medium">
                      &ldquo;{revComment}&rdquo;
                    </p>
                  </div>

                  {/* Official Unx Games Store Response */}
                  {revReply && (
                    <motion.div
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-gradient-to-r from-red-50/95 via-orange-50/80 to-amber-50/70 border border-orange-200/90 rounded-2xl p-3 sm:p-3.5 space-y-1.5 shadow-2xs"
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
                        {revReplyAt && (
                          <span className="text-[10px] text-red-600/80 font-mono">
                            {formatTimeAgo(revReplyAt)}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-800 leading-relaxed font-medium pl-6.5">
                        {revReply}
                      </p>
                    </motion.div>
                  )}

                  {/* Bottom Action Row: Delivery status & Helpful button */}
                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-100 font-mono">
                    <span className="text-emerald-700 font-bold flex items-center gap-1">
                      <CheckCircle2 size={12} className="text-emerald-600" />
                      Delivered &amp; Verified
                    </span>

                    <button
                      type="button"
                      onClick={() => toggleLike(rev.id || String(revIdx))}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95 ${
                        isLiked
                          ? 'bg-red-100 text-red-800 border border-red-300'
                          : 'bg-slate-100/80 hover:bg-slate-200 text-slate-600'
                      }`}
                    >
                      <ThumbsUp size={12} className={isLiked ? 'fill-red-700 text-red-700' : ''} />
                      <span>{isLiked ? 'Helpful (1)' : 'Helpful'}</span>
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </section>

      {/* Write Review Modal */}
      <ReviewModal
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        orderId={eligibleCompletedOrder?.id}
        productId={targetProduct?.id || eligibleCompletedOrder?.productId}
        defaultProductName={targetProduct?.name || eligibleCompletedOrder?.productName}
        defaultPackageName={eligibleCompletedOrder?.packageName}
        defaultProductImage={targetProduct?.image || eligibleCompletedOrder?.productImage}
      />
    </div>
  );
};
export default ReviewsPage;
