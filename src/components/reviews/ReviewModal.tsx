import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useStore } from '../../context/StoreContext';
import { Star, X, Sparkles, MessageSquare, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatDisplayOrderId, cleanLocation } from '../../utils/formatters';
import { ModalPortal } from '../common/ModalPortal';

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId?: string;
  productId?: string;
  defaultProductName?: string;
  defaultPackageName?: string;
  defaultProductImage?: string;
}

export const ReviewModal: React.FC<ReviewModalProps> = ({
  isOpen,
  onClose,
  orderId,
  productId,
  defaultProductName = 'Free Fire Diamonds',
  defaultPackageName,
  defaultProductImage,
}) => {
  const { currentUser } = useAuth();
  const { addReview, products, orders, showToast, setCurrentTab } = useStore();

  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [productName, setProductName] = useState<string>(defaultProductName);
  const [packageName, setPackageName] = useState<string>(defaultPackageName || '');
  const [productImage, setProductImage] = useState<string | undefined>(defaultProductImage);
  const [comment, setComment] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Sync state with props when modal opens or props change
  useEffect(() => {
    if (isOpen) {
      setProductName(defaultProductName || 'Free Fire Diamonds');
      setPackageName(defaultPackageName || '');
      setProductImage(defaultProductImage);
      setRating(5);
      setHoverRating(0);
      setComment('');
    }
  }, [isOpen, defaultProductName, defaultPackageName, defaultProductImage]);

  // Find matching order in store to get canonical display code and real data
  const linkedOrder = useMemo(() => {
    if (!orderId) return null;
    return (
      orders.find(
        (o) =>
          o.id === orderId ||
          o.orderCode === orderId ||
          o.order_code === orderId ||
          o.orderNumber === orderId
      ) || null
    );
  }, [orderId, orders]);

  const displayOrderCode = useMemo(() => {
    if (linkedOrder) return formatDisplayOrderId(linkedOrder);
    if (orderId) return formatDisplayOrderId(orderId);
    return '';
  }, [linkedOrder, orderId]);

  // Quick tags
  const quickTags = [
    '⚡ Super Fast Delivery (Under 2 Mins)',
    '🇳🇵 eSewa / Khalti QR Smooth',
    '💎 100% Genuine Top-Up',
    '💬 Great Admin Support',
    '🔥 Best Rates in Nepal',
  ];

  if (!isOpen) return null;

  const handleAddTag = (tag: string) => {
    if (comment.includes(tag)) return;
    setComment((prev) => (prev ? `${prev} • ${tag}` : tag));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentUser) {
      showToast('error', 'Login Required', 'Please log in to submit your gamer review.');
      onClose();
      setCurrentTab('login');
      return;
    }

    if (!comment.trim()) {
      showToast('error', 'Review Required', 'Please share a few words about your top-up experience.');
      return;
    }

    let matchedProductId = productId || linkedOrder?.productId;
    let matchedProductImage = productImage || linkedOrder?.productImage || defaultProductImage;
    if (!matchedProductId) {
      const match = products.find(
        (p) =>
          p.name.toLowerCase() === productName.toLowerCase() ||
          p.gameName.toLowerCase() === productName.toLowerCase() ||
          productName.toLowerCase().includes(p.name.toLowerCase())
      );
      if (match) {
        matchedProductId = match.id;
        matchedProductImage = matchedProductImage || match.image;
      }
    }

    const rawLocation =
      (currentUser as any)?.location ||
      (currentUser as any)?.userLocation ||
      linkedOrder?.userLocation ||
      linkedOrder?.customerLocation ||
      'Nepal';
    const sanitizedLocation = cleanLocation(rawLocation);

    setIsSubmitting(true);
    try {
      await addReview({
        orderId: linkedOrder?.id || orderId || undefined,
        userId: currentUser.uid,
        userName: currentUser.name || 'Nepali Gamer',
        userPhoto:
          currentUser.photoURL ||
          `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(currentUser.uid || currentUser.name || 'Gamer')}`,
        productId: matchedProductId,
        productName: productName.trim() || linkedOrder?.productName || 'Game Top-Up',
        packageName: packageName.trim() || linkedOrder?.packageName || undefined,
        productImage: matchedProductImage,
        rating,
        comment: comment.trim(),
        isVerifiedBuyer: true,
        userLocation: sanitizedLocation,
      });
      setIsSubmitting(false);
      setComment('');
      showToast('success', 'Review Submitted', 'Thank you for rating your gaming top-up!');
      onClose();
    } catch {
      setIsSubmitting(false);
    }
  };

  const getRatingLabel = (r: number) => {
    switch (r) {
      case 5:
        return '⭐⭐⭐⭐⭐ Super Fast & Outstanding!';
      case 4:
        return '⭐⭐⭐⭐ Great Experience!';
      case 3:
        return '⭐⭐⭐ Good Service';
      case 2:
        return '⭐⭐ Could be Faster';
      default:
        return '⭐ Needs Improvement';
    }
  };

  return (
    <ModalPortal isOpen={isOpen} onClose={onClose} zIndex={99999}>
      <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 z-[99999]">
        <div className="fixed inset-0 -z-10" onClick={onClose} />

        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 24 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 24 }}
          transition={{ type: 'spring', damping: 26, stiffness: 320 }}
          className="w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200/90 relative flex flex-col max-h-[92vh] sm:max-h-[88vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Mobile Handle */}
          <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mt-2.5 mb-0.5 sm:hidden shrink-0" />

          {/* Form Scrollable Content */}
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
            <div className="p-4 sm:p-5 pt-3 space-y-3.5 overflow-y-auto flex-1 custom-scrollbar">
              {/* Order / Product Summary Card with Close Button on the Right */}
              <div className="bg-violet-50/80 border border-violet-100 rounded-2xl p-3 flex items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {productImage ? (
                    <img
                      src={productImage}
                      alt={productName}
                      className="w-11 h-11 rounded-xl object-cover border border-violet-200 shrink-0 bg-white"
                    />
                  ) : (
                    <div className="w-11 h-11 rounded-xl bg-violet-100 text-violet-600 flex items-center justify-center font-black text-lg shrink-0">
                      🎮
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-extrabold text-violet-700 uppercase tracking-wider block">
                      Verified Purchase
                    </span>
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900 truncate">{productName}</h4>
                    {packageName && (
                      <p className="text-[11px] text-slate-500 font-medium truncate">{packageName}</p>
                    )}
                  </div>
                </div>

                {/* Close Button Inside the Card */}
                <button
                  type="button"
                  onClick={onClose}
                  className="w-8 h-8 rounded-xl bg-white hover:bg-violet-100/70 text-slate-400 hover:text-slate-700 border border-violet-200/70 flex items-center justify-center transition-all shadow-2xs active:scale-95 cursor-pointer shrink-0"
                  title="Close"
                >
                  <X size={16} className="stroke-[2.5]" />
                </button>
              </div>

              {/* Star Rating Picker */}
              <div className="bg-slate-50/90 border border-slate-200/80 rounded-2xl p-3.5 sm:p-4 text-center space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">Rate Your Experience</label>
                <div className="flex items-center justify-center gap-2 py-0.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      type="button"
                      key={`rate-star-btn-${star}`}
                      onClick={() => {
                        setRating(star);
                        setHoverRating(0);
                      }}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      className="p-1.5 text-slate-200 hover:scale-125 active:scale-95 transition-transform cursor-pointer focus:outline-hidden touch-manipulation"
                    >
                      <Star
                        size={28}
                        className={`transition-colors ${
                          (hoverRating || rating) >= star
                            ? 'fill-amber-400 text-amber-400 drop-shadow-xs'
                            : 'fill-slate-200 text-slate-300'
                        }`}
                      />
                    </button>
                  ))}
                </div>
                <p className="text-xs font-bold text-violet-700 h-4 transition-all">
                  {getRatingLabel(hoverRating || rating)}
                </p>
              </div>

              {/* Quick Compliment Tags */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-slate-500 block">Quick Feedback Tags (Click to add)</span>
                <div className="flex flex-wrap gap-1.5">
                  {quickTags.map((tag, tIdx) => (
                    <button
                      key={`quick-tag-${tag}-${tIdx}`}
                      type="button"
                      onClick={() => handleAddTag(tag)}
                      className="text-[10px] font-bold bg-slate-100 hover:bg-violet-50 hover:text-violet-700 text-slate-700 px-2.5 py-1 rounded-lg border border-slate-200 transition-colors cursor-pointer active:scale-95"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Feedback Textarea */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <MessageSquare size={14} className="text-violet-600" />
                  <span>Your Review &amp; Comments</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="How fast was the diamond/UC top-up? How was the eSewa / Khalti QR payment?"
                  className="w-full bg-slate-50 border border-slate-200 focus:border-violet-600 focus:bg-white rounded-xl p-3 text-xs font-medium text-slate-900 focus:outline-hidden transition-all resize-none"
                />
              </div>

              {/* User Confirmation Info */}
              <div className="flex items-center justify-between px-1 text-[11px] text-slate-500 pt-1">
                <span className="flex items-center gap-1 text-emerald-600 font-bold">
                  <ShieldCheck size={13} className="text-emerald-500" />
                  Verified Nepali Buyer Review
                </span>
                <span>Posting as <strong>{currentUser?.name || 'Gamer'}</strong></span>
              </div>
            </div>

            {/* Fixed Action Footer */}
            <div className="p-3.5 sm:p-4 bg-slate-50 border-t border-slate-100 flex gap-2.5 shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !comment.trim()}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-violet-600 via-indigo-600 to-fuchsia-600 hover:from-violet-700 hover:to-indigo-700 active:scale-[0.98] text-white font-bold text-xs shadow-md shadow-violet-200 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                <Sparkles size={14} className="text-amber-300" />
                <span>{isSubmitting ? 'Posting...' : 'Submit Review'}</span>
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </ModalPortal>
  );
};

export default ReviewModal;

