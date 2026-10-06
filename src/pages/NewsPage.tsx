import React, { useState, useMemo, useEffect } from 'react';
import { useStore } from '../context/StoreContext';
import { formatDate, formatRelativeTime } from '../utils/formatters';
import { extractPromoCode } from '../utils/promoCode';
import { NewsItem } from '../types';
import {
  Calendar,
  ArrowRight,
  Tag,
  Sparkles,
  Share2,
  Clock,
  AlertTriangle,
  Heart,
  Bookmark,
  BookOpen,
  Search,
  X,
  Flame,
  Gamepad2,
  CheckCircle2,
  ChevronRight,
  ShieldCheck,
  TrendingUp,
  Filter,
  Copy,
  Check,
  Zap,
  Radio,
  Bell
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { NewsDetailModal } from '../components/news/NewsDetailModal';

type NewsCategoryKey = 'all' | 'saved' | 'offers' | 'game-updates' | 'announcements' | 'maintenance';

interface CategoryOption {
  key: NewsCategoryKey;
  label: string;
  icon: string;
}

const CATEGORIES: CategoryOption[] = [
  { key: 'all', label: 'All', icon: '⚡' },
  { key: 'offers', label: 'Deals', icon: '🔥' },
  { key: 'game-updates', label: 'Patches', icon: '🎮' },
  { key: 'announcements', label: 'News', icon: '📢' },
  { key: 'saved', label: 'Saved', icon: '🔖' },
  { key: 'maintenance', label: 'Status', icon: '🛠️' },
];

const normalizeCatKey = (cat: string): 'announcements' | 'offers' | 'game-updates' | 'maintenance' => {
  if (!cat) return 'announcements';
  const c = cat.toLowerCase().trim().replace(/[\s_]+/g, '-');
  if (c === 'offers' || c.includes('offer') || c.includes('promo') || c.includes('deal') || c.includes('discount') || c.includes('sale')) return 'offers';
  if (c === 'maintenance' || c.includes('maint') || c.includes('service') || c.includes('pause') || c.includes('outage')) return 'maintenance';
  if (c === 'game-updates' || c.includes('game') || c.includes('patch') || c.includes('update') || c.includes('event')) return 'game-updates';
  return 'announcements';
};

export const NewsPage: React.FC = () => {
  const { news, activeProducts, setSelectedProductId, setCurrentTab, showToast } = useStore();
  const [selectedCategory, setSelectedCategory] = useState<NewsCategoryKey>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeArticle, setActiveArticle] = useState<NewsItem | null>(null);
  
  // Local interaction states with persistent defaults
  const [likedArticles, setLikedArticles] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('ghn_news_likes');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [bookmarkedArticles, setBookmarkedArticles] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('ghn_news_bookmarks');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Reset page-level modal and search query on unmount
  useEffect(() => {
    return () => {
      setActiveArticle(null);
      setSearchQuery('');
      setCopiedCode(null);
    };
  }, []);

  // Sync to local storage
  useEffect(() => {
    try {
      localStorage.setItem('ghn_news_likes', JSON.stringify(likedArticles));
    } catch {}
  }, [likedArticles]);

  useEffect(() => {
    try {
      localStorage.setItem('ghn_news_bookmarks', JSON.stringify(bookmarkedArticles));
    } catch {}
  }, [bookmarkedArticles]);

  // Filter published news
  const publishedNews = useMemo(() => {
    return news.filter((n) => n.published !== false);
  }, [news]);

  // Saved articles count
  const savedCount = useMemo(() => {
    return publishedNews.filter((n) => bookmarkedArticles[n.id]).length;
  }, [publishedNews, bookmarkedArticles]);

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: publishedNews.length,
      saved: savedCount,
      offers: 0,
      'game-updates': 0,
      announcements: 0,
      maintenance: 0,
    };
    publishedNews.forEach((item) => {
      const catKey = normalizeCatKey(item.category);
      if (counts[catKey] !== undefined) {
        counts[catKey]++;
      }
    });
    return counts;
  }, [publishedNews, savedCount]);

  // Filtered news with search and category
  const filteredNews = useMemo(() => {
    let list = publishedNews;

    if (selectedCategory === 'saved') {
      list = list.filter((item) => bookmarkedArticles[item.id]);
    } else if (selectedCategory !== 'all') {
      list = list.filter((item) => {
        const catKey = normalizeCatKey(item.category);
        return catKey === selectedCategory;
      });
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((item) => {
        return (
          item.title.toLowerCase().includes(q) ||
          (item.summary && item.summary.toLowerCase().includes(q)) ||
          (item.description && item.description.toLowerCase().includes(q)) ||
          (item.category && item.category.toLowerCase().includes(q))
        );
      });
    }

    return list;
  }, [publishedNews, selectedCategory, searchQuery, bookmarkedArticles]);

  // Top trending / featured article (highest likes or first published)
  const featuredArticle = useMemo(() => {
    if (selectedCategory !== 'all' || searchQuery.trim() || publishedNews.length === 0) return null;
    return publishedNews[0];
  }, [publishedNews, selectedCategory, searchQuery]);

  // Non-featured articles for the feed list
  const feedArticles = useMemo(() => {
    if (featuredArticle && selectedCategory === 'all' && !searchQuery.trim()) {
      return filteredNews.slice(1);
    }
    return filteredNews;
  }, [filteredNews, featuredArticle, selectedCategory, searchQuery]);

  // Filtered visible categories (only active or selected ones to prevent cut-off)
  const visibleCategories = useMemo(() => {
    return CATEGORIES.filter((cat) => {
      if (cat.key === 'all') return true;
      const count = categoryCounts[cat.key] ?? 0;
      return count > 0 || selectedCategory === cat.key;
    });
  }, [categoryCounts, selectedCategory]);

  // Helper for category badge styling
  const getCategoryBadgeStyle = (category: string) => {
    const catKey = normalizeCatKey(category);
    if (catKey === 'offers') {
      return {
        label: 'Offer & Promo',
        bg: 'bg-rose-50 text-rose-600 border-rose-200/80',
        pill: 'bg-rose-600 text-white',
        icon: Tag,
      };
    }
    if (catKey === 'maintenance') {
      return {
        label: 'Maintenance',
        bg: 'bg-amber-50 text-amber-700 border-amber-200',
        pill: 'bg-amber-600 text-white',
        icon: AlertTriangle,
      };
    }
    if (catKey === 'game-updates') {
      return {
        label: 'Game Patch',
        bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        pill: 'bg-emerald-600 text-white',
        icon: Sparkles,
      };
    }
    return {
      label: 'Announcement',
      bg: 'bg-violet-50 text-violet-700 border-violet-200/80',
      pill: 'bg-violet-600 text-white',
      icon: Clock,
    };
  };

  // Get working promo code if article mentions one
  const getArticlePromoCode = (item: NewsItem): string | null => {
    const text = `${item.title} ${item.description || ''} ${item.summary || ''} ${item.content || ''}`;
    return extractPromoCode(text);
  };

  // Check if article has redeem/promo code
  const hasPromoCode = (item: NewsItem) => {
    return getArticlePromoCode(item) !== null;
  };

  // Fast promo copy handler
  const handleQuickCopyPromo = (code: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    showToast('success', 'Promo Code Copied!', `Voucher code "${code}" is ready to use in Shop.`);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  // Handle Share link
  const handleShare = (item: NewsItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (navigator.share) {
      navigator.share({
        title: item.title,
        text: item.description || item.summary,
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(`${item.title} - ${window.location.href}`);
      showToast('success', 'Link Copied', 'News story link copied to clipboard.');
    }
  };

  const handleLike = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const isLiked = likedArticles[id];
    setLikedArticles(prev => ({ ...prev, [id]: !isLiked }));
    setLikeCounts(prev => ({
      ...prev,
      [id]: (prev[id] ?? 24) + (isLiked ? -1 : 1)
    }));
    showToast('success', isLiked ? 'Like Removed' : 'Article Liked', 'Thank you for your feedback!');
  };

  const handleBookmark = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const isBookmarked = bookmarkedArticles[id];
    setBookmarkedArticles(prev => ({ ...prev, [id]: !isBookmarked }));
    showToast(
      'success',
      isBookmarked ? 'Bookmark Removed' : 'Article Saved',
      isBookmarked ? 'Removed from saved reads.' : 'Saved to your reading list.'
    );
  };

  // Calculate read time
  const getReadTime = (content?: string) => {
    if (!content) return '2 min read';
    const words = content.split(/\s+/).length;
    const minutes = Math.max(1, Math.ceil(words / 160));
    return `${minutes} min read`;
  };

  // If an article is currently selected, render the in-page mobile Article View
  if (activeArticle) {
    return (
      <NewsDetailModal
        article={activeArticle}
        onClose={() => {
          setActiveArticle(null);
          try {
            window.scrollTo({ top: 0, behavior: 'instant' });
          } catch {}
        }}
        onSelectArticle={(article) => {
          setActiveArticle(article);
          try {
            window.scrollTo({ top: 0, behavior: 'instant' });
          } catch {}
        }}
        likedArticles={likedArticles}
        bookmarkedArticles={bookmarkedArticles}
        likeCounts={likeCounts}
        onToggleLike={handleLike}
        onToggleBookmark={handleBookmark}
        allNews={publishedNews}
        activeProducts={activeProducts}
        onNavigateToProduct={(productId) => {
          setSelectedProductId(productId);
          setCurrentTab('product_detail');
          try {
            window.scrollTo({ top: 0, behavior: 'smooth' });
          } catch {}
        }}
        showToast={showToast}
      />
    );
  }

  return (
    <div className="w-full bg-transparent font-sans pb-1 select-none space-y-2">
      
      {/* ========================================================================= */}
      {/* 1. NATIVE MOBILE APP HEADER & INSTANT SEARCH BAR                          */}
      {/* ========================================================================= */}
      <section className="w-full max-w-7xl mx-auto px-2 sm:px-2 pt-1 sm:pt-1.5">
        <div className="bg-white border border-slate-200/90 rounded-3xl p-3 sm:p-3.5 shadow-2xs space-y-2.5">
          {/* Top Row: Title + Live Activity Indicator */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-2xl bg-gradient-to-tr from-violet-600 via-indigo-600 to-blue-600 text-white flex items-center justify-center shadow-xs">
                <Flame size={16} />
              </div>
              <div>
                <h1 className="text-sm sm:text-base font-black text-slate-900 tracking-tight leading-tight">
                  Gaming News &amp; Deals
                </h1>
                <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium">
                  Patch notes, redeem codes, offers &amp; top-up alerts
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-black bg-emerald-50 border border-emerald-200/80 text-emerald-700 px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-2xs">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Live Feed</span>
              </span>
            </div>
          </div>

          {/* Search Input Bar with Clear Button */}
          <div className="relative">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search redeem codes, Free Fire updates, offers..."
              className="w-full bg-slate-50 border border-slate-200/80 focus:bg-white focus:border-violet-600 rounded-2xl pl-9.5 pr-8 py-2 text-xs text-slate-900 font-semibold focus:outline-hidden focus:ring-2 focus:ring-violet-500/15 transition-all placeholder:text-slate-400 placeholder:truncate truncate shadow-2xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 2. MOBILE APP CATEGORY SEGMENTED TABS (PERFECT FULL-WIDTH FIT - NO CUT-OFF) */}
      {/* ========================================================================= */}
      <section className="w-full max-w-7xl mx-auto px-2 sm:px-2">
        <div className="w-full bg-white border border-slate-200/90 p-1 rounded-2xl shadow-2xs flex items-center gap-1">
          {visibleCategories.map((cat, catIdx) => {
            const isSelected = selectedCategory === cat.key;
            const count = categoryCounts[cat.key] ?? 0;

            return (
              <button
                key={`news-cat-${cat.key || catIdx}-${catIdx}`}
                type="button"
                onClick={() => setSelectedCategory(cat.key)}
                className={`flex-1 h-8 rounded-xl text-[11px] sm:text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1 whitespace-nowrap active:scale-95 ${
                  isSelected
                    ? 'bg-gradient-to-r from-violet-600 to-blue-600 text-white shadow-xs'
                    : 'bg-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <span className="text-[11px] sm:text-xs leading-none">{cat.icon}</span>
                <span className="truncate">{cat.label}</span>
                {count > 0 && (
                  <span
                    className={`text-[9px] font-mono px-1.5 py-0.2 rounded-full font-black leading-none shrink-0 ${
                      isSelected
                        ? 'bg-white/25 text-white'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. FEATURED / BREAKING STORY (MOBILE APP HERO CARD)                        */}
      {/* ========================================================================= */}
      {featuredArticle && (
        <section className="w-full max-w-7xl mx-auto px-2 sm:px-2">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => setActiveArticle(featuredArticle)}
            className="group relative bg-white border border-slate-200/80 hover:border-violet-400 rounded-3xl overflow-hidden shadow-2xs hover:shadow-xs transition-all cursor-pointer active:scale-[0.99] flex flex-col"
          >
            {/* Hero Image Container */}
            <div className="relative w-full aspect-[16/9] max-h-[195px] sm:max-h-[220px] bg-slate-950 overflow-hidden">
              <img
                src={featuredArticle.image || featuredArticle.image_url || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&auto=format&fit=crop&q=80'}
                alt={featuredArticle.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                loading="lazy"
                decoding="async"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&auto=format&fit=crop&q=80';
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/30 to-transparent" />

              {/* Top Badges */}
              <div className="absolute top-3 left-3 flex items-center gap-1.5 z-10 flex-wrap">
                <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-violet-600 text-white shadow-xs flex items-center gap-1">
                  <Flame size={12} className="animate-pulse" />
                  <span>TOP STORY</span>
                </span>
                {hasPromoCode(featuredArticle) && (
                  <button
                    type="button"
                    onClick={(e) => handleQuickCopyPromo(getArticlePromoCode(featuredArticle)!, e)}
                    className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-400 hover:bg-amber-300 text-amber-950 shadow-xs flex items-center gap-1 transition-all active:scale-95 cursor-pointer border border-amber-300"
                    title="Tap to copy code"
                  >
                    {copiedCode === getArticlePromoCode(featuredArticle) ? (
                      <>
                        <Check size={11} className="text-amber-950" />
                        <span>COPIED!</span>
                      </>
                    ) : (
                      <>
                        <Copy size={11} className="text-amber-950" />
                        <span>CODE: {getArticlePromoCode(featuredArticle)}</span>
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* Action Buttons: Bookmark & Share */}
              <div className="absolute top-3 right-3 flex items-center gap-1.5 z-10">
                <button
                  type="button"
                  onClick={(e) => handleBookmark(featuredArticle.id, e)}
                  className={`w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-md transition-all shadow-xs cursor-pointer ${
                    bookmarkedArticles[featuredArticle.id]
                      ? 'bg-violet-600 text-white'
                      : 'bg-black/50 hover:bg-black/70 text-white'
                  }`}
                  aria-label="Bookmark article"
                >
                  <Bookmark size={13} className={bookmarkedArticles[featuredArticle.id] ? 'fill-current' : ''} />
                </button>
                <button
                  type="button"
                  onClick={(e) => handleShare(featuredArticle, e)}
                  className="w-8 h-8 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center backdrop-blur-md transition-all shadow-xs cursor-pointer"
                  aria-label="Share article"
                >
                  <Share2 size={13} />
                </button>
              </div>

              {/* Over-Image Title & Meta on bottom */}
              <div className="absolute bottom-3 left-3 right-3 text-white space-y-1.5 z-10">
                <div className="flex items-center gap-2 text-[10px] text-slate-300 font-medium">
                  <span className="px-2 py-0.5 rounded-md bg-white/20 backdrop-blur-md font-bold text-white">
                    {featuredArticle.category || 'Store Update'}
                  </span>
                  <span>•</span>
                  <span>{formatRelativeTime(featuredArticle.createdAt)}</span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <BookOpen size={10} />
                    <span>{getReadTime(featuredArticle.content || featuredArticle.summary)}</span>
                  </span>
                </div>
                <h2 className="text-base sm:text-lg font-black text-white leading-tight line-clamp-2 drop-shadow-xs group-hover:text-violet-200 transition-colors">
                  {featuredArticle.title}
                </h2>
              </div>
            </div>

            {/* Bottom Strip: Snippet & Read CTA */}
            <div className="p-3 sm:p-3.5 bg-white flex items-center justify-between gap-3">
              <p className="text-xs text-slate-600 font-medium line-clamp-1 flex-1">
                {featuredArticle.summary || featuredArticle.description}
              </p>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={(e) => handleLike(featuredArticle.id, e)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
                    likedArticles[featuredArticle.id]
                      ? 'bg-rose-50 text-rose-600 border border-rose-200'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <Heart size={12} className={likedArticles[featuredArticle.id] ? 'fill-current text-rose-500' : ''} />
                  <span>{likeCounts[featuredArticle.id] ?? 24}</span>
                </button>
                <span className="inline-flex items-center gap-1 text-xs font-black text-violet-600 group-hover:translate-x-0.5 transition-transform">
                  <span>Read</span>
                  <ChevronRight size={14} className="stroke-[2.5]" />
                </span>
              </div>
            </div>
          </motion.div>
        </section>
      )}

      {/* ========================================================================= */}
      {/* 4. NEWS CARDS FEED LIST (NATIVE MOBILE BENTO CARDS)                       */}
      {/* ========================================================================= */}
      <section className="w-full max-w-7xl mx-auto px-2 sm:px-2 space-y-2 sm:space-y-2">
        {/* Section sub-title if showing featured */}
        {featuredArticle && feedArticles.length > 0 && (
          <div className="flex items-center justify-between pt-1">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <TrendingUp size={13} className="text-violet-600" />
              <span>Latest Updates &amp; Stories</span>
            </h3>
            <span className="text-[10px] font-bold text-slate-400">
              {feedArticles.length} articles
            </span>
          </div>
        )}

        {feedArticles.length === 0 ? (
          <div className="py-12 px-6 text-center bg-white border border-slate-200/80 rounded-3xl shadow-2xs flex flex-col items-center justify-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center text-xl shadow-2xs">
              {selectedCategory === 'saved' ? '🔖' : '📰'}
            </div>
            <h3 className="text-sm font-black text-slate-900">
              {selectedCategory === 'saved'
                ? 'No Saved Articles'
                : searchQuery
                ? 'No Matches Found'
                : 'No Updates Found'}
            </h3>
            <p className="text-xs text-slate-500 font-medium max-w-xs leading-relaxed">
              {selectedCategory === 'saved'
                ? 'Tap the bookmark icon on any article to save it here for fast reading later.'
                : searchQuery
                ? `No articles match "${searchQuery}". Try a different keyword.`
                : 'New gaming news, updates, and promos will appear here.'}
            </p>
            {(selectedCategory !== 'all' || searchQuery) && (
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory('all');
                  setSearchQuery('');
                }}
                className="mt-1 px-3.5 py-1.5 rounded-xl bg-violet-50 text-violet-700 text-xs font-bold hover:bg-violet-100 transition-colors cursor-pointer"
              >
                Clear Filters &amp; View All
              </button>
            )}
          </div>
        ) : (
          feedArticles.map((item, idx) => {
            const badgeStyle = getCategoryBadgeStyle(item.category);
            const BadgeIcon = badgeStyle.icon;
            const isBookmarked = bookmarkedArticles[item.id];
            const isLiked = likedArticles[item.id];
            const totalLikes = (likeCounts[item.id] ?? 24);
            const promoCode = getArticlePromoCode(item);
            const isVoucher = promoCode !== null;

            return (
              <motion.article
                key={`news-article-${item.id || idx}-${idx}`}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => setActiveArticle(item)}
                className="bg-white border border-slate-200/80 hover:border-violet-300 rounded-3xl p-3 sm:p-3.5 shadow-2xs hover:shadow-xs transition-all cursor-pointer group active:scale-[0.99] flex flex-col space-y-2.5"
              >
                {/* Header Row: Category Badge + Promo Code + Date + Read Time */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[9.5px] font-black uppercase tracking-wider border flex items-center gap-1 shrink-0 ${badgeStyle.bg}`}
                    >
                      <BadgeIcon size={10} />
                      <span>{badgeStyle.label}</span>
                    </span>

                    {isVoucher && promoCode && (
                      <button
                        type="button"
                        onClick={(e) => handleQuickCopyPromo(promoCode, e)}
                        className="px-2 py-0.5 rounded-full bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 text-[9.5px] font-black uppercase tracking-wider shrink-0 flex items-center gap-1 cursor-pointer transition-all active:scale-95"
                        title="Tap to copy promo code"
                      >
                        {copiedCode === promoCode ? (
                          <>
                            <Check size={10} className="text-amber-800" />
                            <span>COPIED</span>
                          </>
                        ) : (
                          <>
                            <Flame size={10} className="text-amber-600" />
                            <span>CODE: {promoCode}</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-medium shrink-0">
                    <span className="flex items-center gap-1">
                      <Clock size={10} />
                      <span>{getReadTime(item.content || item.summary)}</span>
                    </span>
                    <span>•</span>
                    <span>{formatRelativeTime(item.createdAt)}</span>
                  </div>
                </div>

                {/* Middle: Horizontal Layout with Thumbnail on right */}
                <div className="flex gap-3 items-start">
                  <div className="flex-1 min-w-0 space-y-1">
                    <h2 className="text-xs sm:text-sm font-black text-slate-900 leading-snug line-clamp-2 group-hover:text-violet-600 transition-colors">
                      {item.title}
                    </h2>
                    <p className="text-[11px] sm:text-xs text-slate-500 font-medium line-clamp-2 leading-relaxed">
                      {item.summary || item.description}
                    </p>
                  </div>

                  {/* Thumbnail */}
                  <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-2xl overflow-hidden bg-slate-950 shrink-0 border border-slate-200/80 shadow-2xs relative">
                    <img
                      src={item.image || item.image_url || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=400&auto=format&fit=crop&q=80'}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                      decoding="async"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=400&auto=format&fit=crop&q=80';
                      }}
                    />
                  </div>
                </div>

                {/* Footer Action Bar */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={(e) => handleLike(item.id, e)}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer border ${
                        isLiked
                          ? 'bg-rose-50 text-rose-600 border-rose-200'
                          : 'bg-slate-50 text-slate-600 border-slate-200/60 hover:bg-slate-100'
                      }`}
                    >
                      <Heart size={12} className={isLiked ? 'fill-current text-rose-500' : ''} />
                      <span>{totalLikes}</span>
                    </button>

                    <button
                      type="button"
                      onClick={(e) => handleBookmark(item.id, e)}
                      className={`p-1.5 rounded-full transition-all cursor-pointer border ${
                        isBookmarked
                          ? 'bg-violet-50 text-violet-600 border-violet-200'
                          : 'bg-slate-50 text-slate-500 border-slate-200/60 hover:bg-slate-100'
                      }`}
                      title={isBookmarked ? 'Remove bookmark' : 'Save article'}
                    >
                      <Bookmark size={12} className={isBookmarked ? 'fill-current' : ''} />
                    </button>

                    <button
                      type="button"
                      onClick={(e) => handleShare(item, e)}
                      className="p-1.5 rounded-full bg-slate-50 text-slate-500 border border-slate-200/60 hover:bg-slate-100 transition-all cursor-pointer"
                      title="Share article"
                    >
                      <Share2 size={12} />
                    </button>
                  </div>

                  <span className="inline-flex items-center gap-1 text-[11px] font-black text-violet-600 group-hover:text-violet-700">
                    <span>Read Full Story</span>
                    <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
                  </span>
                </div>
              </motion.article>
            );
          })
        )}
      </section>
    </div>
  );
};

export default NewsPage;
