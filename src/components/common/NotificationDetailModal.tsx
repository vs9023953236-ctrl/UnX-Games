import React, { useState } from 'react';
import { formatDate, formatTimeAgo, formatDisplayOrderId, getOrderAccountShortLabel } from '../../utils/formatters';
import { extractPromoCode } from '../../utils/promoCode';
import {
  X,
  Bell,
  CheckCircle2,
  ShieldCheck,
  AlertCircle,
  Sparkles,
  Clock,
  Zap,
  Package,
  ArrowRight,
  Trash2,
  Share2,
  Copy,
  Check,
  MessageCircle,
  ExternalLink,
  ReceiptText
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useStore } from '../../context/StoreContext';

interface NotificationDetailModalProps {
  notification: any | null;
  onClose: () => void;
  onTrackOrder?: (orderId: string) => void;
  onDelete?: (id: string) => void;
}

export const NotificationDetailModal: React.FC<NotificationDetailModalProps> = ({
  notification,
  onClose,
  onTrackOrder,
  onDelete,
}) => {
  const { showToast, orders, setCurrentTab } = useStore();
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  if (!notification) return null;

  // Extract order code from title/message or notification orderId
  const extractedOrderCode = (() => {
    const combined = `${notification.title || ''} ${notification.message || ''} ${notification.orderId || ''} ${notification.order_id || ''}`;
    const match = combined.match(/(?:UNX|GHN|ORD)-[A-Z0-9]{3,14}/i);
    return match ? match[0].toUpperCase() : null;
  })();

  const rawOrderId = notification.orderId || notification.order_id || extractedOrderCode;

  // Attached order if present
  const attachedOrder = orders.find((o) => {
    const oId = String(o.id || '').trim();
    const oCode = String(o.order_code || o.orderCode || o.orderNumber || '').trim().toUpperCase();
    if (extractedOrderCode && oCode === extractedOrderCode) return true;
    if (rawOrderId) {
      const target = String(rawOrderId).trim();
      if (oId === target || oCode === target.toUpperCase()) return true;
    }
    return false;
  }) || (rawOrderId ? orders.find((o) => {
    const oId = String(o.id || '');
    const oCode = String(o.order_code || o.orderCode || o.orderNumber || '');
    const target = String(rawOrderId);
    return (oId && target.includes(oId)) || (oCode && target.includes(oCode));
  }) : null);

  const displayOrderCode = attachedOrder
    ? formatDisplayOrderId(attachedOrder)
    : (extractedOrderCode || (rawOrderId ? formatDisplayOrderId(rawOrderId) : ''));

  const contentLower = `${notification.title} ${notification.message || ''}`.toLowerCase();
  const isGameRelated = contentLower.includes('diamond') || contentLower.includes('uc') || contentLower.includes('free fire') || contentLower.includes('pubg') || contentLower.includes('package') || contentLower.includes('game') || contentLower.includes('topup') || contentLower.includes('top up');
  const isWalletRelated = contentLower.includes('wallet') || contentLower.includes('balance') || contentLower.includes('deposit') || contentLower.includes('esewa') || contentLower.includes('khalti') || contentLower.includes('cashback');
  const isSupportRelated = contentLower.includes('support') || contentLower.includes('inquiry') || contentLower.includes('ticket') || contentLower.includes('help');

  const getTypeConfig = (type: string) => {
    switch (type) {
      case 'order_completed':
      case 'delivered':
        return {
          icon: <CheckCircle2 size={24} className="text-emerald-600 fhd-vector" />,
          bg: 'bg-emerald-50 border-emerald-200 text-emerald-700',
          badge: 'ORDER DELIVERED',
          badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
          accentGradient: 'from-emerald-500 to-teal-600',
        };
      case 'payment_verified':
        return {
          icon: <ShieldCheck size={24} className="text-orange-600 fhd-vector" />,
          bg: 'bg-orange-50 border-orange-200 text-orange-700',
          badge: 'PAYMENT VERIFIED',
          badgeColor: 'bg-orange-100 text-orange-800 border-orange-300',
          accentGradient: 'from-red-600 to-orange-600',
        };
      case 'payment_rejected':
        return {
          icon: <AlertCircle size={24} className="text-rose-600 fhd-vector" />,
          bg: 'bg-rose-50 border-rose-200 text-rose-700',
          badge: 'ACTION REQUIRED',
          badgeColor: 'bg-rose-100 text-rose-800 border-rose-300',
          accentGradient: 'from-rose-500 to-red-600',
        };
      case 'announcement':
      case 'promo':
        return {
          icon: <Sparkles size={24} className="text-amber-600 fhd-vector" />,
          bg: 'bg-amber-50 border-amber-200 text-amber-700',
          badge: 'SPECIAL OFFER',
          badgeColor: 'bg-amber-100 text-amber-800 border-amber-300',
          accentGradient: 'from-amber-500 to-orange-600',
        };
      case 'order_processing':
        return {
          icon: <Clock size={24} className="text-sky-600 fhd-vector" />,
          bg: 'bg-sky-50 border-sky-200 text-sky-700',
          badge: 'PROCESSING TOP-UP',
          badgeColor: 'bg-sky-100 text-sky-800 border-sky-300',
          accentGradient: 'from-sky-500 to-red-600',
        };
      default:
        return {
          icon: <Zap size={24} className="text-violet-600 fhd-vector" />,
          bg: 'bg-violet-50 border-violet-200 text-violet-700',
          badge: 'SYSTEM UPDATE',
          badgeColor: 'bg-violet-100 text-violet-800 border-violet-300',
          accentGradient: 'from-violet-600 via-indigo-600 to-blue-600',
        };
    }
  };

  const config = getTypeConfig(notification.type);

  // Extract coupon/promo code if present
  const extractedCode = (() => {
    const text = `${notification.title} ${notification.message || ''}`;
    return extractPromoCode(text);
  })();

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    showToast('success', 'Promo Code Copied!', `Code "${code}" copied to clipboard.`);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator
        .share({
          title: notification.title,
          text: notification.message,
          url: window.location.href,
        })
        .catch(() => {});
    } else {
      navigator.clipboard.writeText(`${notification.title}\n${notification.message}`);
      showToast('success', 'Copied to Clipboard', 'Notification details copied.');
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-3.5 sm:p-4 select-none overflow-hidden">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
      />

      {/* Main FHD Reader Modal Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        transition={{ type: 'spring', damping: 28, stiffness: 340 }}
        className="relative w-full max-w-md bg-white border border-slate-200/90 rounded-3xl shadow-[0_20px_60px_-12px_rgba(23,19,41,0.22)] flex flex-col overflow-hidden text-slate-900 z-10 fhd-crisp"
      >
        {/* Top Accent Strip */}
        <div className={`h-1.5 w-full bg-gradient-to-r ${config.accentGradient}`} />

        {/* Modal Header */}
        <div className="px-4 py-3 bg-slate-50/90 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <span
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border shadow-2xs ${config.badgeColor}`}
            >
              {config.badge}
            </span>
            <span className="text-[10px] text-slate-500 font-bold">
              {formatTimeAgo(notification.createdAt)}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleShare}
              className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer border border-slate-200/60"
              title="Share alert"
            >
              <Share2 size={14} className="fhd-vector" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-500 transition-colors cursor-pointer border border-slate-200/60"
              title="Close reader"
            >
              <X size={15} className="fhd-vector" />
            </button>
          </div>
        </div>

        {/* Main Body Content */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto max-h-[70vh]">
          {/* Title & Icon Header */}
          <div className="flex items-start gap-3.5">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border shadow-xs ${config.bg}`}
            >
              {config.icon}
            </div>

            <div className="space-y-1 min-w-0 flex-1">
              <h3 className="text-base font-black text-slate-900 tracking-tight leading-snug">
                {notification.title}
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                Received on {formatDate(notification.createdAt)}
              </p>
            </div>
          </div>

          {/* Detailed Message Text Card */}
          <div className="bg-slate-50/90 border border-slate-200/80 rounded-2xl p-4 space-y-2">
            <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-medium whitespace-pre-line">
              {notification.message}
            </p>
          </div>

          {/* Promo Code Copy Card if detected */}
          {extractedCode && (
            <div className="p-3.5 bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 rounded-2xl flex items-center justify-between gap-3 shadow-2xs">
              <div className="space-y-0.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-red-700">
                  Exclusive Promo Code
                </span>
                <div className="font-mono font-black text-sm text-red-900">
                  {extractedCode}
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleCopyCode(extractedCode)}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95 ${
                  copiedCode === extractedCode
                    ? 'bg-emerald-600 text-white'
                    : 'bg-red-600 hover:bg-red-700 text-white'
                }`}
              >
                {copiedCode === extractedCode ? (
                  <>
                    <Check size={13} className="fhd-vector" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy size={13} className="fhd-vector" />
                    <span>Copy Code</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Attached Order Live Card */}
          {(attachedOrder || rawOrderId || displayOrderCode) && (
            <div className="p-3.5 bg-white border border-red-200 rounded-2xl space-y-3 shadow-xs">
              <div className="flex items-center justify-between border-b border-red-50 pb-2">
                <div className="flex items-center gap-1.5">
                  <ReceiptText size={15} className="text-red-600 fhd-vector" />
                  <span className="text-xs font-black text-slate-800">
                    Order #{displayOrderCode || formatDisplayOrderId(attachedOrder || rawOrderId)}
                  </span>
                </div>
                {attachedOrder && (
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    {attachedOrder.orderStatus.toUpperCase()}
                  </span>
                )}
              </div>

              {attachedOrder && (
                <div className="text-[11px] text-slate-600 space-y-1 font-medium">
                  <div>Game: <strong className="text-slate-800">{attachedOrder.productName}</strong></div>
                  <div>Package: <strong className="text-slate-800">{attachedOrder.packageName}</strong></div>
                  <div>{getOrderAccountShortLabel(attachedOrder)}: <span className="font-mono font-bold text-slate-800">{attachedOrder.gameUserId}</span></div>
                </div>
              )}

              <button
                type="button"
                onClick={() => {
                  if (onTrackOrder) {
                    const trackTarget = attachedOrder 
                      ? (attachedOrder.order_code || attachedOrder.orderCode || attachedOrder.id)
                      : (displayOrderCode || rawOrderId);
                    onTrackOrder(trackTarget);
                  }
                  onClose();
                }}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 hover:from-violet-700 hover:to-indigo-700 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-xs active:scale-95 transition-all cursor-pointer"
              >
                <Package size={14} className="fhd-vector" />
                <span>Open Live Order Tracking</span>
                <ArrowRight size={13} className="fhd-vector" />
              </button>
            </div>
          )}

          {/* Quick Deep Link Actions when no direct order is attached */}
          {!notification.orderId && (isGameRelated || isWalletRelated || isSupportRelated) && (
            <div className="pt-1">
              {isGameRelated && (
                <button
                  type="button"
                  onClick={() => {
                    setCurrentTab('shop');
                    onClose();
                  }}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 hover:from-violet-700 hover:to-indigo-700 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-xs active:scale-95 transition-all cursor-pointer"
                >
                  <Zap size={14} className="fhd-vector text-amber-300" />
                  <span>Explore Gaming Top-Ups &amp; Offers</span>
                  <ArrowRight size={13} className="fhd-vector" />
                </button>
              )}

              {isWalletRelated && !isGameRelated && (
                <button
                  type="button"
                  onClick={() => {
                    setCurrentTab('profile');
                    onClose();
                  }}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 hover:from-violet-700 hover:to-indigo-700 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-xs active:scale-95 transition-all cursor-pointer"
                >
                  <Zap size={14} className="fhd-vector text-amber-300" />
                  <span>Open Wallet &amp; Add Balance</span>
                  <ArrowRight size={13} className="fhd-vector" />
                </button>
              )}

              {isSupportRelated && !isGameRelated && !isWalletRelated && (
                <button
                  type="button"
                  onClick={() => {
                    setCurrentTab('contact');
                    onClose();
                  }}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 hover:from-violet-700 hover:to-indigo-700 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-xs active:scale-95 transition-all cursor-pointer"
                >
                  <MessageCircle size={14} className="fhd-vector text-amber-300" />
                  <span>Contact 24/7 Customer Support</span>
                  <ArrowRight size={13} className="fhd-vector" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2 shrink-0">
          {onDelete && (
            <button
              type="button"
              onClick={() => {
                onDelete(notification.id);
                onClose();
              }}
              className="px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer border border-rose-200/70"
            >
              <Trash2 size={13} className="fhd-vector" />
              <span>Delete Alert</span>
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="ml-auto px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-black text-xs transition-all cursor-pointer active:scale-95"
          >
            Done / Close
          </button>
        </div>
      </motion.div>
    </div>
  );
};
