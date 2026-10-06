import React, { useState, useEffect, useMemo } from 'react';
import { NewsItem, Product } from '../../types';
import { formatDate } from '../../utils/formatters';
import { extractPromoCode } from '../../utils/promoCode';
import {
  X,
  Calendar,
  Sparkles,
  Gamepad2,
  ArrowRight,
  CheckCircle2,
  Copy,
  Check,
  ChevronLeft,
  MessageCircle,
  ShieldCheck,
  Flame,
  Zap,
  BookOpen,
  Share2,
  Heart,
  Bookmark
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useStore } from '../../context/StoreContext';

interface NewsDetailModalProps {
  article: NewsItem | null;
  onClose: () => void;
  onNavigateToProduct: (productId: string) => void;
  onToggleLike: (articleId: string, e: React.MouseEvent) => void;
  onToggleBookmark: (articleId: string, e: React.MouseEvent) => void;
  isLiked?: boolean;
  isBookmarked?: boolean;
  totalLikes?: number;
  likedArticles?: Record<string, boolean>;
  bookmarkedArticles?: Record<string, boolean>;
  likeCounts?: Record<string, number>;
  onSelectArticle: (article: NewsItem) => void;
  allNews?: NewsItem[];
  activeProducts?: Product[];
  showToast?: any;
}

export const NewsDetailModal: React.FC<NewsDetailModalProps> = ({
  article,
  onClose,
  onNavigateToProduct,
  onToggleLike,
  onToggleBookmark,
  isLiked,
  isBookmarked,
  totalLikes,
  likedArticles,
  bookmarkedArticles,
  likeCounts,
  onSelectArticle,
  allNews,
  activeProducts,
}) => {
  const { products, news, showToast } = useStore();
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  const resolvedIsLiked = isLiked ?? (article ? Boolean(likedArticles?.[article.id]) : false);
  const resolvedIsBookmarked = isBookmarked ?? (article ? Boolean(bookmarkedArticles?.[article.id]) : false);
  const resolvedLikes = totalLikes ?? (article ? (likeCounts?.[article.id] || 24) : 24);

  // Scroll to top when article is mounted or changes
  useEffect(() => {
    try {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    } catch {}
  }, [article?.id]);

  // Estimate reading time
  const readingTime = useMemo(() => {
    if (!article) return '2 min read';
    const text = `${article.title} ${article.description || ''} ${article.summary || ''} ${article.content || ''}`;
    const words = text.trim().split(/\s+/).length;
    const minutes = Math.max(1, Math.ceil(words / 180));
    return `${minutes} min read`;
  }, [article]);

  // Detect related product
  const relatedProduct: Product | undefined = useMemo(() => {
    if (!article || !products || products.length === 0) return undefined;
    const searchTarget = `${article.title} ${article.description || ''} ${article.content || ''} ${article.category}`.toLowerCase();

    return products.find((p) => {
      const gName = (p.gameName || '').toLowerCase();
      const pName = (p.name || '').toLowerCase();
      return (
        (gName.length > 2 && searchTarget.includes(gName)) ||
        (pName.length > 3 && searchTarget.includes(pName))
      );
    });
  }, [article, products]);

  // Related articles
  const relatedArticles = useMemo(() => {
    if (!article) return [];
    return news
      .filter((n) => n.id !== article.id && n.published !== false)
      .slice(0, 3);
  }, [article, news]);

  // Extract promo code if mentioned in the article
  const promoCode = useMemo(() => {
    if (!article) return null;
    const fullText = `${article.title} ${article.description || ''} ${article.summary || ''} ${article.content || ''}`;
    return extractPromoCode(fullText);
  }, [article]);

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    showToast('success', 'Promo Code Copied!', `Code "${code}" copied to clipboard.`);
    setTimeout(() => setCopiedCode(null), 3000);
  };

  const handleCopyLink = () => {
    if (!article) return;
    const url = window.location.href;
    navigator.clipboard.writeText(`${article.title} - ${url}`);
    setCopiedLink(true);
    showToast('success', 'Link Copied!', 'Article link copied to clipboard.');
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleShare = () => {
    if (!article) return;
    if (navigator.share) {
      navigator
        .share({
          title: article.title,
          text: article.description || article.summary || article.title,
          url: window.location.href,
        })
        .catch(() => {
          setShowShareModal(true);
        });
    } else {
      setShowShareModal(true);
    }
  };

  const handleWhatsAppShare = () => {
    if (!article) return;
    const text = encodeURIComponent(
      `🎮 *${article.title}*\n\n${article.description || article.summary || ''}\n\nRead more on Unx Games: ${window.location.href}`
    );
    showToast('info', 'Opening WhatsApp', 'Redirecting to share news update...');
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const handleContactStoreDesk = () => {
    if (!article) return;
    const text = encodeURIComponent(
      `Hello Unx Games Team Desk! 🎮\nI have an inquiry regarding this news update: *${article.title}*`
    );
    showToast('success', 'Contacting Store Desk', 'Opening official Unx Games support desk...');
    window.open(`https://wa.me/9779768914027?text=${text}`, '_blank');
  };

  if (!article) return null;

  // Split content into clean paragraphs
  const paragraphs = (article.content || article.description || article.summary || '')
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  const heroImage =
    article.image ||
    article.image_url ||
    'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1200&auto=format&fit=crop&q=80';

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 12 }}
      transition={{ duration: 0.2 }}
      className="w-full max-w-7xl mx-auto px-2 sm:px-2 pt-1 sm:pt-2 pb-6 space-y-2 sm:space-y-2 font-sans select-none"
     
    >
      {/* 1. Sleek Mobile App Navigation Header Bar */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-2.5 sm:p-3 shadow-2xs flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onClose}
          className="h-8.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-800 font-black text-xs flex items-center gap-1.5 transition-all cursor-pointer border border-slate-200/70"
          aria-label="Back to news"
        >
          <ChevronLeft size={16} className="stroke-[2.5]" />
          <span>Back to News</span>
        </button>

        <div className="flex items-center gap-1.5">
          <span className="px-2.5 py-1 rounded-full text-[10px] sm:text-[11px] font-black uppercase tracking-wider bg-violet-50 text-violet-700 border border-violet-200/80 truncate shadow-2xs">
            {article.category || 'News'}
          </span>
        </div>
      </div>

      {/* 2. Main Article Content Container */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-3.5 sm:p-5 shadow-2xs space-y-4 sm:space-y-5">
        {/* Featured Hero Image */}
        <div className="relative w-full aspect-[16/9] sm:aspect-[21/9] rounded-2xl overflow-hidden bg-slate-900 shadow-md border border-slate-200/80">
          <img
            src={heroImage}
            alt={article.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-950/10 to-transparent" />

          {/* Over-Image Info */}
          <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between text-white text-xs z-10">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="px-2 py-0.5 rounded-lg bg-black/60 backdrop-blur-md text-[10px] sm:text-xs font-bold flex items-center gap-1 border border-white/15">
                <Calendar size={11} className="text-orange-300" />
                <span>{formatDate(article.createdAt)}</span>
              </span>
              <span className="px-2 py-0.5 rounded-lg bg-black/60 backdrop-blur-md text-[10px] sm:text-xs font-bold flex items-center gap-1 border border-white/15">
                <BookOpen size={11} className="text-orange-300" />
                <span>{readingTime}</span>
              </span>
            </div>

            <span className="px-2 py-0.5 rounded-md bg-emerald-500/90 text-white text-[9px] sm:text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-xs">
              <ShieldCheck size={11} />
              <span>Verified</span>
            </span>
          </div>
        </div>

        {/* Article Title & Publisher Card */}
        <div className="space-y-3">
          <h1 className="text-base sm:text-xl lg:text-2xl font-black text-slate-900 tracking-tight leading-snug">
            {article.title}
          </h1>

          {/* Author / Store Desk Info Bar */}
          <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center text-white shadow-xs font-black text-xs">
                GH
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs sm:text-sm font-black text-slate-900">
                    {article.author || 'Unx Games Team'}
                  </span>
                  <CheckCircle2 size={13} className="text-violet-600 fill-red-100" />
                </div>
                <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium">
                  Official Game Store Desk • Nepal
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleContactStoreDesk}
              className="px-2.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs flex items-center gap-1 transition-colors border border-emerald-200 cursor-pointer shrink-0 active:scale-95"
              title="Contact Store Desk on WhatsApp"
            >
              <MessageCircle size={14} className="text-emerald-600 fill-emerald-100" />
              <span className="hidden sm:inline">Store Desk</span>
            </button>
          </div>
        </div>

        {/* Highlights & Summary */}
        {(article.summary || article.description) && (
          <div className="p-3.5 sm:p-4 rounded-2xl bg-violet-50/70 border border-violet-100 text-violet-950 shadow-2xs space-y-1.5">
            <div className="flex items-center gap-1.5 text-violet-700 text-xs font-black uppercase tracking-wider">
              <Sparkles size={14} />
              <span>Highlights &amp; Summary</span>
            </div>
            <p className="text-xs sm:text-sm font-semibold leading-relaxed text-violet-900/90">
              {article.summary || article.description}
            </p>
          </div>
        )}

        {/* Promo Code Card (If detected) */}
        {promoCode && (
          <div className="p-3.5 sm:p-4 rounded-2xl bg-rose-50/80 border border-rose-200/90 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-rose-950">
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5 text-rose-700 text-xs font-black uppercase tracking-wider">
                <Flame size={14} />
                <span>Exclusive Promo Voucher</span>
              </div>
              <p className="text-xs text-rose-900/80 font-medium">
                Use this discount code during checkout on Unx Games.
              </p>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="px-3 py-1.5 rounded-xl bg-white border border-rose-300 font-mono font-black text-xs sm:text-sm tracking-wider text-rose-700 shadow-2xs select-all">
                {promoCode}
              </div>
              <button
                type="button"
                onClick={() => handleCopyCode(promoCode)}
                className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
              >
                {copiedCode === promoCode ? (
                  <>
                    <Check size={13} />
                    <span>COPIED</span>
                  </>
                ) : (
                  <>
                    <Copy size={13} />
                    <span>COPY</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Article Paragraphs */}
        <div className="space-y-3.5 text-slate-700 text-xs sm:text-sm leading-relaxed p-3.5 sm:p-4 bg-slate-50/60 rounded-2xl border border-slate-200/70">
          {paragraphs.map((para, idx) => (
            <p
              key={idx}
              className={idx === 0 ? 'font-medium text-slate-800 text-[13px] sm:text-sm leading-relaxed' : ''}
            >
              {para}
            </p>
          ))}
        </div>

        {/* 100% Genuine Top-Up Guarantee */}
        <div className="p-3 sm:p-3.5 rounded-2xl bg-emerald-50/80 border border-emerald-200/80 text-emerald-950 flex items-center gap-3 shadow-2xs">
          <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <Zap size={16} />
          </div>
          <div className="min-w-0">
            <h4 className="text-xs sm:text-sm font-black text-emerald-900">
              100% Genuine In-Game Top-Up Guarantee
            </h4>
            <p className="text-[10px] sm:text-[11px] text-emerald-800/80 font-medium">
              Direct player UID credits via verified official distributors. Zero bans, 24/7 delivery with eSewa &amp; Khalti.
            </p>
          </div>
        </div>

        {/* Contextual Game Top-Up CTA (If detected) */}
        {relatedProduct && (
          <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-violet-50 via-indigo-50/50 to-violet-50 border-2 border-violet-200 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-13 h-13 rounded-xl overflow-hidden bg-slate-900 shrink-0 border border-violet-200 shadow-xs">
                <img
                  src={relatedProduct.image}
                  alt={relatedProduct.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="min-w-0 space-y-0.5">
                <span className="text-[9px] text-violet-700 font-black uppercase tracking-wider block truncate">
                  Featured Top-Up In This News
                </span>
                <h4 className="text-xs sm:text-sm font-black truncate text-slate-900">
                  {relatedProduct.name}
                </h4>
                <span className="text-[11px] text-amber-600 font-bold flex items-center gap-1">
                  <span>⚡ Instant 5-15 Min Delivery • eSewa &amp; Khalti</span>
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                onClose();
                onNavigateToProduct(relatedProduct.id);
              }}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 hover:from-violet-700 hover:to-indigo-700 text-white font-black text-xs shrink-0 transition-transform active:scale-95 shadow-md shadow-violet-600/25 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Gamepad2 size={14} />
              <span>Top Up Now</span>
              <ArrowRight size={13} />
            </button>
          </div>
        )}

        {/* Was this article helpful? Reaction & Share */}
        <div className="p-3 sm:p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs">
          <span className="font-bold text-slate-700 text-[11px] sm:text-xs">
            Was this update helpful?
          </span>
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={(e) => onToggleLike(article.id, e)}
              className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer border ${
                resolvedIsLiked
                  ? 'bg-rose-50 text-rose-600 border-rose-200 shadow-2xs'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <Heart size={13} className={resolvedIsLiked ? 'fill-current text-rose-500' : ''} />
              <span>{resolvedIsLiked ? 'Liked ✓' : 'Helpful'}</span>
              <span className="font-mono text-[10px] text-slate-400">({resolvedLikes})</span>
            </button>

            <button
              type="button"
              onClick={handleWhatsAppShare}
              className="flex-1 sm:flex-initial px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <MessageCircle size={13} className="text-emerald-600" />
              <span>WhatsApp</span>
            </button>
          </div>
        </div>

        {/* Related Updates List */}
        {relatedArticles.length > 0 && (
          <div className="pt-2 space-y-2.5 border-t border-slate-100">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-violet-600" />
              <span>More Updates from Unx Games</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {relatedArticles.map((rel, relIdx) => (
                <div
                  key={`news-related-${rel.id || relIdx}-${relIdx}`}
                  onClick={() => onSelectArticle(rel)}
                  className="p-2.5 rounded-2xl bg-slate-50 hover:bg-violet-50/40 border border-slate-200/80 hover:border-violet-300 shadow-2xs flex flex-col justify-between cursor-pointer transition-all group active:scale-98"
                >
                  <div className="w-full aspect-[16/9] rounded-xl overflow-hidden bg-slate-900 mb-2 relative">
                    <img
                      src={rel.image || rel.image_url}
                      alt={rel.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <div className="space-y-1">
                    <h5 className="text-[11px] font-black text-slate-900 line-clamp-2 group-hover:text-violet-600 transition-colors leading-snug">
                      {rel.title}
                    </h5>
                    <div className="flex items-center justify-between text-[9px] text-slate-400 font-medium">
                      <span>{formatDate(rel.createdAt)}</span>
                      <span className="text-violet-600 font-bold group-hover:underline flex items-center gap-0.5">
                        Read <ArrowRight size={9} />
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bottom Back Button */}
        <div className="pt-2">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 font-black text-xs uppercase tracking-wider cursor-pointer transition-all border border-slate-200/90 active:scale-[0.99] flex items-center justify-center gap-1.5"
          >
            <ChevronLeft size={15} />
            <span>Back to All News</span>
          </button>
        </div>
      </div>

      {/* Share Options Popup Modal */}
      <AnimatePresence>
        {showShareModal && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowShareModal(false)}
              className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs"
            />
            <motion.div
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              className="relative w-full sm:max-w-sm bg-white rounded-t-3xl sm:rounded-3xl p-4 shadow-2xl border border-slate-200 z-10 space-y-3"
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-1.5 text-slate-900 font-black text-xs sm:text-sm">
                  <Share2 size={15} className="text-violet-600" />
                  <span>Share News Update</span>
                </div>
                <button
                  onClick={() => setShowShareModal(false)}
                  className="w-6 h-6 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500"
                >
                  <X size={14} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  onClick={() => {
                    handleWhatsAppShare();
                    setShowShareModal(false);
                  }}
                  className="p-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 font-bold text-xs flex items-center gap-2 cursor-pointer transition-colors"
                >
                  <MessageCircle size={16} className="text-emerald-600" />
                  <span>WhatsApp</span>
                </button>

                <button
                  onClick={() => {
                    handleCopyLink();
                    setShowShareModal(false);
                  }}
                  className="p-2.5 rounded-xl bg-violet-50 hover:bg-violet-100 border border-violet-200 text-violet-800 font-bold text-xs flex items-center gap-2 cursor-pointer transition-colors"
                >
                  {copiedLink ? <Check size={16} className="text-violet-600" /> : <Copy size={16} className="text-violet-600" />}
                  <span>{copiedLink ? 'Copied!' : 'Copy Link'}</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

