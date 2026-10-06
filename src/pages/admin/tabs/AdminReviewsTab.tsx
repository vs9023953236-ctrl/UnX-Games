import React, { useState, useMemo, useEffect } from 'react';
import { useStore } from '../../../context/StoreContext';
import { useAuth } from '../../../context/AuthContext';
import { Review } from '../../../types';
import { formatTimeAgo, formatDate, formatDisplayOrderId, cleanLocation } from '../../../utils/formatters';
import {
  Star,
  Search,
  Filter,
  Eye,
  EyeOff,
  Trash2,
  CheckCircle2,
  ShieldCheck,
  Gamepad2,
  ExternalLink,
  MessageSquare,
  AlertCircle,
  ThumbsUp,
  Sparkles,
  TrendingUp,
  Bot,
  Settings,
  Zap,
  RefreshCw,
  Wand2,
  Check,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ModalPortal } from '../../../components/common/ModalPortal';

export const AdminReviewsTab: React.FC = () => {
  const {
    reviews,
    orders,
    toggleReviewStatus,
    updateReview,
    deleteReview,
    setAdminSelectedOrderId,
    setAdminTab,
    showToast,
    generateAiReviewReply,
    previewAiReviewReply,
    batchAiAutoReplyReviews,
    getReviewSettings,
    updateReviewSettings,
  } = useStore();
  const { currentUser } = useAuth();

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'hidden'>('all');
  const [ratingFilter, setRatingFilter] = useState<string>('all');
  const [selectedProductFilter, setSelectedProductFilter] = useState<string>('all');
  const [reviewToDelete, setReviewToDelete] = useState<Review | null>(null);
  const [reviewToReply, setReviewToReply] = useState<Review | null>(null);
  const [replyText, setReplyText] = useState<string>('');
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [isSavingReply, setIsSavingReply] = useState<boolean>(false);

  // AI State & Settings
  const [isGeneratingAi, setIsGeneratingAi] = useState<boolean>(false);
  const [selectedTone, setSelectedTone] = useState<string>('professional');
  const [isBatchRunning, setIsBatchRunning] = useState<boolean>(false);
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [aiSettings, setAiSettings] = useState<{
    autoReplyEnabled: boolean;
    replyTone: string;
    signature: string;
    minRatingToReply: number;
  }>({
    autoReplyEnabled: true,
    replyTone: 'professional',
    signature: '— Unx Games Team 🎮',
    minRatingToReply: 1,
  });
  const [isSavingSettings, setIsSavingSettings] = useState<boolean>(false);

  // Load AI Settings on Mount
  useEffect(() => {
    let isMounted = true;
    getReviewSettings().then((s) => {
      if (isMounted && s) {
        setAiSettings({
          autoReplyEnabled: s.autoReplyEnabled ?? true,
          replyTone: s.replyTone || 'professional',
          signature: s.signature || '— Unx Games Team 🎮',
          minRatingToReply: s.minRatingToReply || 1,
        });
        setSelectedTone(s.replyTone || 'professional');
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  // Admin credentials for audit logs
  const adminInfo = currentUser
    ? {
        uid: currentUser.uid,
        name: currentUser.name || 'Admin',
        email: currentUser.email,
      }
    : undefined;

  // Aggregate Metrics
  const totalReviews = reviews.length;
  const publishedCount = reviews.filter((r) => r.status !== 'hidden').length;
  const hiddenCount = reviews.filter((r) => r.status === 'hidden').length;
  const unrepliedCount = reviews.filter((r) => !r.adminReply || r.adminReply.trim().length === 0).length;
  const avgRating =
    totalReviews > 0
      ? (reviews.reduce((acc, r) => acc + (r.rating || 5), 0) / totalReviews).toFixed(1)
      : '5.0';

  const fiveStarCount = reviews.filter((r) => (r.rating || 5) === 5).length;
  const fiveStarPct = totalReviews > 0 ? Math.round((fiveStarCount / totalReviews) * 100) : 100;

  // Unique products present in reviews
  const uniqueProducts = useMemo(() => {
    const set = new Set<string>();
    reviews.forEach((r) => {
      if (r.productName) set.add(r.productName);
    });
    return Array.from(set);
  }, [reviews]);

  // Filtered reviews
  const filteredReviews = useMemo(() => {
    return reviews.filter((rev) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesUser = (rev.userName || '').toLowerCase().includes(q);
        const matchesProduct = (rev.productName || '').toLowerCase().includes(q);
        const matchesOrder = (rev.orderId || '').toLowerCase().includes(q);
        const matchesComment = (rev.comment || '').toLowerCase().includes(q);
        if (!matchesUser && !matchesProduct && !matchesOrder && !matchesComment) return false;
      }

      // Status
      if (statusFilter === 'published' && rev.status === 'hidden') return false;
      if (statusFilter === 'hidden' && rev.status !== 'hidden') return false;

      // Rating
      if (ratingFilter !== 'all') {
        const targetRating = parseInt(ratingFilter, 10);
        if (Math.round(rev.rating || 5) !== targetRating) return false;
      }

      // Product
      if (selectedProductFilter !== 'all' && rev.productName !== selectedProductFilter) {
        return false;
      }

      return true;
    });
  }, [reviews, searchQuery, statusFilter, ratingFilter, selectedProductFilter]);

  const [togglingReviews, setTogglingReviews] = useState<Set<string>>(new Set());

  const handleToggleStatus = async (review: Review) => {
    if (togglingReviews.has(review.id)) return;
    const newStatus = review.status === 'hidden' ? 'published' : 'hidden';
    setTogglingReviews((prev) => new Set(prev).add(review.id));
    try {
      await toggleReviewStatus(review.id, newStatus, adminInfo);
    } finally {
      setTogglingReviews((prev) => {
        const next = new Set(prev);
        next.delete(review.id);
        return next;
      });
    }
  };

  const handleConfirmDelete = async () => {
    if (!reviewToDelete) return;
    setIsDeleting(true);
    await deleteReview(reviewToDelete.id, adminInfo);
    setIsDeleting(false);
    setReviewToDelete(null);
  };

  const handleOpenReply = (rev: Review) => {
    setReviewToReply(rev);
    setReplyText(rev.adminReply || '');
  };

  const handleGenerateAiForModal = async () => {
    if (!reviewToReply) return;
    setIsGeneratingAi(true);
    try {
      const res = await previewAiReviewReply(
        {
          userName: reviewToReply.userName,
          productName: reviewToReply.productName,
          packageName: reviewToReply.packageName,
          rating: reviewToReply.rating,
          comment: reviewToReply.comment,
          isVerifiedBuyer: reviewToReply.isVerifiedBuyer,
          userLocation: reviewToReply.userLocation,
        },
        selectedTone
      );
      if (res && res.success && res.replyText) {
        setReplyText(res.replyText);
        showToast('success', 'AI Reply Generated ✨', 'Review the text and click Publish.');
      } else {
        showToast('error', 'AI Generation Notice', 'Could not generate reply preview.');
      }
    } catch {
      showToast('error', 'Generation Error', 'Failed to generate AI response.');
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const handleQuickAiReply = async (rev: Review) => {
    setIsGeneratingAi(true);
    try {
      await generateAiReviewReply(rev.id, aiSettings.replyTone || 'professional', adminInfo);
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const handleBatchAutoReply = async () => {
    if (unrepliedCount === 0) {
      showToast('info', 'All Caught Up! 🎉', 'Every customer review already has an official response.');
      return;
    }
    if (!window.confirm(`Auto-generate professional AI replies for all ${unrepliedCount} unanswered reviews?`)) {
      return;
    }
    setIsBatchRunning(true);
    try {
      await batchAiAutoReplyReviews(aiSettings.replyTone, false, adminInfo);
    } finally {
      setIsBatchRunning(false);
    }
  };

  const handleSaveSettings = async () => {
    setIsSavingSettings(true);
    try {
      await updateReviewSettings(aiSettings);
      setShowSettingsModal(false);
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleSaveReply = async () => {
    if (!reviewToReply) return;
    setIsSavingReply(true);
    await updateReview(
      reviewToReply.id,
      { adminReply: replyText.trim() || undefined, adminReplyAt: replyText.trim() ? new Date().toISOString() : undefined },
      adminInfo
    );
    setIsSavingReply(false);
    setReviewToReply(null);
  };

  const handleRemoveReply = async () => {
    if (!reviewToReply) return;
    setIsSavingReply(true);
    await updateReview(
      reviewToReply.id,
      { adminReply: undefined, adminReplyAt: undefined },
      adminInfo
    );
    setIsSavingReply(false);
    setReviewToReply(null);
  };

  const handleViewOrder = (orderId?: string) => {
    if (!orderId) {
      showToast('info', 'No Order Linked', 'This review has no associated order record.');
      return;
    }
    const matched = orders.find(
      (o) =>
        o.id === orderId ||
        o.orderCode === orderId ||
        o.order_code === orderId ||
        o.orderNumber === orderId
    );
    setAdminSelectedOrderId(matched ? matched.id : orderId);
    setAdminTab('order_detail');
  };

  return (
    <div className="w-full space-y-6">
      {/* Top Header */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-amber-600 text-xs font-bold uppercase tracking-wider mb-1">
            <Star size={16} className="fill-amber-400 text-amber-400" />
            <span>Store Feedback &amp; Ratings</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2">
            <span>Customer Reviews &amp; AI Auto-Reply</span>
            <span className="inline-flex items-center gap-1 text-[11px] font-extrabold bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-2.5 py-0.5 rounded-full shadow-2xs">
              <Bot size={12} /> AI Active
            </span>
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Monitor, moderate, and auto-reply to gamer reviews with Gemini-powered official responses.
          </p>
        </div>

        {/* Header Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
          {/* AI Settings Button */}
          <button
            onClick={() => setShowSettingsModal(true)}
            className="px-3 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Configure AI Auto-Reply Behavior"
          >
            <Settings size={14} className="text-slate-500" />
            <span>AI Settings</span>
          </button>

          {/* Batch Auto Reply Button */}
          <button
            onClick={handleBatchAutoReply}
            disabled={isBatchRunning || unrepliedCount === 0}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            title="Auto-reply to all unreplied customer reviews"
          >
            <Zap size={14} className={isBatchRunning ? 'animate-bounce' : ''} />
            <span>{isBatchRunning ? 'AI Replying...' : `Auto-Reply (${unrepliedCount})`}</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Total Reviews
          </span>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-black text-slate-900 font-mono">{totalReviews}</span>
            <span className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <MessageSquare size={16} />
            </span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-1">
          <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider block">
            Average Score
          </span>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-black text-amber-600 font-mono flex items-center gap-1">
              {avgRating} <Star size={18} className="fill-amber-400 text-amber-400 inline" />
            </span>
            <span className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Sparkles size={16} />
            </span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-1">
          <span className="text-[10px] font-bold text-purple-600 uppercase tracking-wider block">
            AI Auto-Reply
          </span>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-black text-purple-600 font-mono">
              {aiSettings.autoReplyEnabled ? 'ON' : 'OFF'}
            </span>
            <span className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold text-xs">
              <Bot size={16} />
            </span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-1">
          <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">
            Pending / Replied
          </span>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-black text-slate-900 font-mono">
              {totalReviews - unrepliedCount} <span className="text-xs text-amber-600 font-semibold">({unrepliedCount} new)</span>
            </span>
            <span className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 size={16} />
            </span>
          </div>
        </div>
      </div>

      {/* AI Auto-Reply Banner Announcement */}
      {aiSettings.autoReplyEnabled && (
        <div className="bg-gradient-to-r from-purple-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-4 border border-purple-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-400/30 text-purple-300 flex items-center justify-center shrink-0">
              <Wand2 size={20} className="text-purple-300 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-xs sm:text-sm font-bold text-purple-100">
                  Instant AI Auto-Reply is Enabled
                </h4>
                <span className="text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.2 rounded-full">
                  Tone: {aiSettings.replyTone.toUpperCase()}
                </span>
              </div>
              <p className="text-[11px] text-purple-200/75">
                Every newly submitted verified customer review automatically receives a tailored, professional response branded as <em>{aiSettings.signature}</em>.
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowSettingsModal(true)}
            className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all border border-white/20 shrink-0 cursor-pointer"
          >
            Customize Tone &amp; Signature
          </button>
        </div>
      )}

      {/* Filters & Search Toolbar */}
      <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search Bar */}
          <div className="flex-1 relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by customer name, order ID, product, or review text..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-indigo-500 focus:bg-white transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600"
              >
                Clear
              </button>
            )}
          </div>

          {/* Status Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                statusFilter === 'all'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All ({reviews.length})
            </button>
            <button
              onClick={() => setStatusFilter('published')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                statusFilter === 'published'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Published ({publishedCount})
            </button>
            <button
              onClick={() => setStatusFilter('hidden')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                statusFilter === 'hidden'
                  ? 'bg-amber-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Hidden ({hiddenCount})
            </button>
          </div>
        </div>

        {/* Secondary Filter Row: Rating & Game Filter */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">
              Rating:
            </span>
            {['all', '5', '4', '3', '2', '1'].map((r, rIdx) => (
              <button
                key={`rating-filter-${r}-${rIdx}`}
                onClick={() => setRatingFilter(r)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  ratingFilter === r
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {r === 'all' ? 'All Stars' : `${r} ★`}
              </button>
            ))}
          </div>

          {uniqueProducts.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Game:
              </span>
              <select
                value={selectedProductFilter}
                onChange={(e) => setSelectedProductFilter(e.target.value)}
                className="px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 focus:outline-hidden"
              >
                <option value="all">All Games ({uniqueProducts.length})</option>
                {uniqueProducts.map((p, pIdx) => (
                  <option key={`game-prod-${p}-${pIdx}`} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Reviews List */}
      <div className="space-y-3">
        {filteredReviews.length === 0 ? (
          <div className="py-16 text-center bg-white border border-slate-200 rounded-3xl p-8 shadow-xs space-y-3">
            <Star size={36} className="mx-auto text-slate-300" />
            <h3 className="text-sm font-bold text-slate-800">No reviews found</h3>
            <p className="text-xs text-slate-500 max-w-xs mx-auto">
              No customer reviews matched your search keywords or filter criteria.
            </p>
          </div>
        ) : (
          filteredReviews.map((rev, idx) => {
            const isHidden = rev.status === 'hidden';
            return (
              <div
                key={`admin-review-${rev.id || idx}-${idx}`}
                className={`bg-white border rounded-2xl p-4 sm:p-5 shadow-xs transition-all flex flex-col gap-3.5 ${
                  isHidden
                    ? 'border-amber-200/80 bg-amber-50/20'
                    : 'border-slate-200 hover:border-indigo-300'
                }`}
              >
                {/* Review Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs overflow-hidden shrink-0">
                      {rev.userPhoto ? (
                        <img
                          src={rev.userPhoto}
                          alt={rev.userName}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        rev.userName?.charAt(0).toUpperCase() || 'U'
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs sm:text-sm font-bold text-slate-900">
                          {rev.userName}
                        </span>
                        <span className="text-[10px]" title="Nepal Gamer">🇳🇵</span>
                        {rev.isVerifiedBuyer !== false && (
                          <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded-md">
                            <ShieldCheck size={10} className="text-emerald-600" />
                            Verified Purchase
                          </span>
                        )}
                        {isHidden && (
                          <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded-md">
                            <EyeOff size={10} />
                            Hidden from Storefront
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 pt-0.5 font-mono">
                        {rev.userLocation && <span>📍 {cleanLocation(rev.userLocation)}</span>}
                        <span>·</span>
                        <span>UID: {rev.userId.slice(0, 10)}</span>
                        <span>·</span>
                        <span>{formatTimeAgo(rev.createdAt)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Rating Stars & Action Buttons */}
                  <div className="flex items-center justify-between sm:justify-end gap-2.5 border-t sm:border-t-0 pt-2 sm:pt-0">
                    <div className="flex items-center gap-1 bg-amber-50 border border-amber-200/80 px-2.5 py-1 rounded-xl">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={`rev-star-${rev.id || idx}-${s}`}
                          size={13}
                          className={
                            s <= (rev.rating || 5)
                              ? 'fill-amber-400 text-amber-400'
                              : 'fill-slate-200 text-slate-200'
                          }
                        />
                      ))}
                      <span className="text-xs font-black font-mono text-amber-800 ml-1">
                        {rev.rating}.0
                      </span>
                    </div>

                    {/* Quick AI Reply Button (if no reply exists) */}
                    {!rev.adminReply && (
                      <button
                        onClick={() => handleQuickAiReply(rev)}
                        disabled={isGeneratingAi}
                        className="p-2 rounded-xl bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                        title="Generate instant AI response"
                      >
                        <Sparkles size={14} />
                        <span className="hidden sm:inline">AI Reply</span>
                      </button>
                    )}

                    {/* Visibility Toggle Button */}
                    <button
                      disabled={togglingReviews.has(rev.id)}
                      onClick={() => handleToggleStatus(rev)}
                      className={`p-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                        isHidden
                          ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                          : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
                      }`}
                      title={isHidden ? 'Publish this review' : 'Hide this review from customer storefront'}
                    >
                      {togglingReviews.has(rev.id) ? (
                        <RefreshCw size={14} className="animate-spin" />
                      ) : isHidden ? (
                        <Eye size={14} />
                      ) : (
                        <EyeOff size={14} />
                      )}
                      <span className="hidden sm:inline">{togglingReviews.has(rev.id) ? 'Updating...' : isHidden ? 'Publish' : 'Hide'}</span>
                    </button>

                    {/* Reply / Official Response Button */}
                    <button
                      onClick={() => handleOpenReply(rev)}
                      className="p-2 rounded-xl bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                      title="Add or edit store reply"
                    >
                      <MessageSquare size={14} />
                      <span className="hidden sm:inline">{rev.adminReply ? 'Edit Reply' : 'Reply'}</span>
                    </button>

                    {/* Delete Review Button */}
                    <button
                      onClick={() => setReviewToDelete(rev)}
                      className="p-2 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200 transition-colors cursor-pointer"
                      title="Delete review record"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Product & Order Context Pill */}
                {(() => {
                  const linkedOrder = orders.find(
                    (o) =>
                      o.id === rev.orderId ||
                      o.orderCode === rev.orderId ||
                      o.order_code === rev.orderId ||
                      o.orderNumber === rev.orderId
                  );
                  const displayOrderCode = linkedOrder
                    ? formatDisplayOrderId(linkedOrder)
                    : rev.orderId
                    ? formatDisplayOrderId(rev.orderId)
                    : '';

                  return (
                    <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 border border-slate-200/80 p-2.5 rounded-xl text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        {rev.productImage ? (
                          <img
                            src={rev.productImage}
                            alt={rev.productName}
                            className="w-7 h-7 rounded-lg object-cover border border-slate-200 shrink-0"
                          />
                        ) : (
                          <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                            <Gamepad2 size={14} />
                          </div>
                        )}
                        <div className="min-w-0 truncate">
                          <span className="font-bold text-slate-800">{rev.productName}</span>
                          {rev.packageName && (
                            <span className="text-slate-500 text-[11px] font-medium ml-1.5">
                              ({rev.packageName})
                            </span>
                          )}
                        </div>
                      </div>

                      {rev.orderId && (
                        <button
                          onClick={() => handleViewOrder(linkedOrder?.id || rev.orderId)}
                          className="text-[11px] font-mono font-bold text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-1 cursor-pointer shrink-0"
                        >
                          <span>Order #{displayOrderCode}</span>
                          <ExternalLink size={12} />
                        </button>
                      )}
                    </div>
                  );
                })()}

                {/* Customer Comment Text */}
                <div className="bg-white border border-slate-100 p-3 rounded-xl space-y-2">
                  <p className="text-xs text-slate-700 leading-relaxed font-medium">
                    &ldquo;{rev.comment}&rdquo;
                  </p>

                  {/* Existing Admin Reply */}
                  {rev.adminReply && (
                    <div className="bg-gradient-to-r from-purple-50/90 to-indigo-50/80 border border-purple-200/80 rounded-xl p-3 space-y-1.5 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="w-5 h-5 rounded-md bg-purple-600 text-white flex items-center justify-center text-[10px] font-black">
                            G
                          </span>
                          <span className="text-[11px] font-black text-purple-900 flex items-center gap-1">
                            Unx Games
                            <span className="text-[9px] font-bold text-purple-700 bg-purple-100/90 px-1.5 py-0.2 rounded-md border border-purple-300/60">
                              Official Response
                            </span>
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {rev.adminReplyAt && (
                            <span className="text-[10px] text-purple-600/75 font-mono">
                              {formatTimeAgo(rev.adminReplyAt)}
                            </span>
                          )}
                          <button
                            onClick={() => handleOpenReply(rev)}
                            className="text-[10px] text-purple-700 font-bold hover:underline cursor-pointer"
                          >
                            Edit
                          </button>
                        </div>
                      </div>
                      <p className="text-xs text-slate-800 font-medium leading-relaxed pl-6.5">
                        {rev.adminReply}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* AI Settings Modal */}
      {showSettingsModal && (
        <ModalPortal isOpen={showSettingsModal} onClose={() => !isSavingSettings && setShowSettingsModal(false)} zIndex={99999}>
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
            <div
              className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs"
              onClick={() => !isSavingSettings && setShowSettingsModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-3xl p-5 sm:p-6 max-w-md w-full shadow-2xl border border-slate-200 relative z-10 space-y-4 my-auto"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center font-black text-sm shadow-xs">
                    <Bot size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900">
                      AI Auto-Reply Configuration
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Customize how Gemini automatically responds to customer ratings.
                    </p>
                  </div>
                </div>
              </div>

              {/* Toggle Switch */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-purple-50/60 border border-purple-200/80">
                <div>
                  <h4 className="text-xs font-bold text-purple-950">Auto-Reply on Submission</h4>
                  <p className="text-[10px] text-purple-700 font-medium">
                    Automatically create professional store replies when a review is submitted.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={aiSettings.autoReplyEnabled}
                    onChange={(e) =>
                      setAiSettings({ ...aiSettings, autoReplyEnabled: e.target.checked })
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                </label>
              </div>

              {/* Tone Selection */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">AI Response Tone</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'professional', label: '👔 Professional', desc: 'Courteous & formal' },
                    { id: 'gamer', label: '🎮 Gamer Friendly', desc: 'Upbeat & enthusiastic' },
                    { id: 'vip', label: '💎 VIP Concierge', desc: 'Premium & luxurious' },
                    { id: 'empathetic', label: '🤝 Empathetic & Caring', desc: 'Warm & helpful' },
                  ].map((t, idx) => (
                    <button
                      key={`reply-tone-${t.id || idx}-${idx}`}
                      type="button"
                      onClick={() => setAiSettings({ ...aiSettings, replyTone: t.id })}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        aiSettings.replyTone === t.id
                          ? 'border-purple-600 bg-purple-50 text-purple-950 font-bold'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className="text-xs font-bold">{t.label}</div>
                      <div className="text-[10px] text-slate-500 font-normal">{t.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Signature */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Brand Signature</label>
                <input
                  type="text"
                  value={aiSettings.signature}
                  onChange={(e) => setAiSettings({ ...aiSettings, signature: e.target.value })}
                  placeholder="— Unx Games Team 🎮"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-900 focus:outline-hidden focus:border-purple-600"
                />
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  disabled={isSavingSettings}
                  onClick={() => setShowSettingsModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSavingSettings}
                  onClick={handleSaveSettings}
                  className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Check size={14} />
                  <span>{isSavingSettings ? 'Saving...' : 'Save Settings'}</span>
                </button>
              </div>
            </motion.div>
          </div>
        </ModalPortal>
      )}

      {/* Admin Reply Modal */}
      {reviewToReply && (
        <ModalPortal isOpen={Boolean(reviewToReply)} onClose={() => !isSavingReply && setReviewToReply(null)} zIndex={99999}>
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
            <div
              className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs"
              onClick={() => !isSavingReply && setReviewToReply(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-3xl p-5 sm:p-6 max-w-lg w-full shadow-2xl border border-slate-200 relative z-10 space-y-4 max-h-[90vh] overflow-y-auto my-auto"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center font-black text-sm shadow-xs">
                    GHN
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                      <span>Reply as Unx Games</span>
                      <span className="text-[10px] font-bold bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-md">
                        Official Store
                      </span>
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Replying to <strong className="text-slate-700">{reviewToReply.userName}</strong> ({reviewToReply.productName})
                    </p>
                  </div>
                </div>
              </div>

              {/* Customer Comment Preview */}
              <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl space-y-1">
                <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
                  <span>Customer Review ({reviewToReply.rating}★):</span>
                  <span>{formatTimeAgo(reviewToReply.createdAt)}</span>
                </div>
                <p className="text-xs text-slate-700 italic">
                  &ldquo;{reviewToReply.comment}&rdquo;
                </p>
              </div>

              {/* AI Generator Bar */}
              <div className="p-3 bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200/80 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-purple-900 flex items-center gap-1.5">
                    <Sparkles size={14} className="text-purple-600" />
                    <span>Gemini AI Auto-Composer</span>
                  </span>
                  <div className="flex items-center gap-1">
                    {['professional', 'gamer', 'vip', 'empathetic'].map((t, tIdx) => (
                      <button
                        key={`reply-modal-tone-${t}-${tIdx}`}
                        type="button"
                        onClick={() => setSelectedTone(t)}
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                          selectedTone === t
                            ? 'bg-purple-600 text-white'
                            : 'bg-white/80 text-purple-800 hover:bg-white'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  type="button"
                  disabled={isGeneratingAi}
                  onClick={handleGenerateAiForModal}
                  className="w-full py-2 px-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs disabled:opacity-50"
                >
                  <Wand2 size={13} className={isGeneratingAi ? 'animate-spin' : ''} />
                  <span>{isGeneratingAi ? 'Generating response...' : 'Generate AI Reply'}</span>
                </button>
              </div>

              {/* Quick Template Presets */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    Quick Templates
                  </span>
                  <span className="text-[10px] text-slate-400">Click to insert</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {[
                    {
                      label: '🎮 Fast Delivery Thanks',
                      text: "Thank you for choosing Unx Games! We're thrilled to provide you with fast & instant delivery. Happy gaming! 🎮",
                    },
                    {
                      label: '⚡ 5-Star Appreciation',
                      text: "Thank you for the wonderful 5-star rating! Providing 100% genuine top-ups for Nepali gamers is our priority.",
                    },
                    {
                      label: '🤝 24/7 Live Support Care',
                      text: "Thank you for your valuable feedback! If you ever need assistance, our 24/7 support is always here to help.",
                    },
                    {
                      label: '💎 Loyalty & Discounts',
                      text: "We truly appreciate your trust in Unx Games! Stay tuned for more special offers and diamond discounts.",
                    },
                  ].map((preset, pIdx) => (
                    <button
                      key={pIdx}
                      type="button"
                      onClick={() => setReplyText(preset.text)}
                      className="text-left p-2 rounded-xl bg-slate-50 hover:bg-purple-50 hover:border-purple-200 border border-slate-200/80 text-[11px] text-slate-700 font-medium transition-colors cursor-pointer leading-snug"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Response Textarea */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span>Official Reply Message *</span>
                  <span className="text-[10px] text-slate-400 font-normal">
                    Branded as Unx Games
                  </span>
                </label>
                <textarea
                  rows={4}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Thank you for choosing Unx Games! We're glad to deliver your order quickly. Happy gaming! 🎮"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:bg-white focus:outline-hidden focus:border-purple-600 transition-all resize-none font-medium leading-relaxed"
                />
              </div>

              {/* Modal Actions */}
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
                {reviewToReply.adminReply && (
                  <button
                    type="button"
                    disabled={isSavingReply}
                    onClick={handleRemoveReply}
                    className="py-2.5 px-3.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-xs transition-colors cursor-pointer border border-rose-200 disabled:opacity-50"
                  >
                    Remove Reply
                  </button>
                )}
                <button
                  type="button"
                  disabled={isSavingReply}
                  onClick={() => setReviewToReply(null)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSavingReply || !replyText.trim()}
                  onClick={handleSaveReply}
                  className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  <Sparkles size={14} />
                  <span>{isSavingReply ? 'Publishing...' : 'Publish as Unx Games'}</span>
                </button>
              </div>
            </motion.div>
          </div>
        </ModalPortal>
      )}

      {/* Delete Confirmation Modal */}
      {reviewToDelete && (
        <ModalPortal isOpen={Boolean(reviewToDelete)} onClose={() => !isDeleting && setReviewToDelete(null)} zIndex={99999}>
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs"
              onClick={() => !isDeleting && setReviewToDelete(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-200 relative z-10 space-y-4 text-center my-auto"
            >
              <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto text-xl">
                <Trash2 size={24} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Delete Customer Review?</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Are you sure you want to permanently delete the review by{' '}
                  <span className="font-bold text-slate-700">{reviewToDelete.userName}</span> for{' '}
                  <span className="font-bold text-slate-700">{reviewToDelete.productName}</span>?
                </p>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => setReviewToDelete(null)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={handleConfirmDelete}
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isDeleting ? 'Deleting...' : 'Yes, Delete'}
                </button>
              </div>
            </motion.div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
};

export default AdminReviewsTab;
