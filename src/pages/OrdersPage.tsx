import React, { useState, useMemo } from 'react';
import { useStore } from '../context/StoreContext';
import { useAuth } from '../context/AuthContext';
import { formatNPR, formatDate, formatDisplayOrderId, getOrderAccountShortLabel } from '../utils/formatters';
import { StatusBadge } from '../components/common/StatusBadge';
import { ReviewModal } from '../components/reviews/ReviewModal';
import { getOfficialGameImage } from '../utils/gameImageHelper';
import { Order } from '../types';
import { api } from '../services/api';
import {
  ReceiptText,
  LogIn,
  Search,
  ChevronRight,
  Star,
  CheckCircle2,
  Sparkles,
  Clock,
  Zap,
  RotateCcw,
  Copy,
  Check,
  MessageCircle,
  Gamepad2,
  X,
  ShieldCheck,
  Wallet,
  XCircle,
  TrendingUp,
  RefreshCw,
  ArrowRight,
  ShieldAlert,
  Flame,
  UserCheck,
  CheckCheck,
  ShoppingBag
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const OrdersPage: React.FC = () => {
  const {
    getUserOrders,
    setSelectedOrderId,
    setSelectedProductId,
    setCurrentTab,
    reviews,
    showToast,
    appSettings,
    cancellationRequests,
    products,
  } = useStore();
  const { currentUser, setRedirectAfterAuth } = useAuth();

  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'completed' | 'refunds' | 'cancelled'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Guest tracking input
  const [guestTrackingInput, setGuestTrackingInput] = useState('');
  const [guestTrackingLoading, setGuestTrackingLoading] = useState(false);

  // Review modal state for specific completed order
  const [reviewOrder, setReviewOrder] = useState<Order | null>(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState<boolean>(false);

  const isMountedRef = React.useRef(true);
  const abortControllerRef = React.useRef<AbortController | null>(null);

  React.useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      setIsReviewModalOpen(false);
      setReviewOrder(null);
      setGuestTrackingLoading(false);
      setSearchQuery('');
      setCopiedId(null);
    };
  }, []);

  const handleGuestTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = guestTrackingInput.trim();
    if (!query) return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setGuestTrackingLoading(true);
    try {
      // First try direct tracking endpoint
      let foundOrder: any = null;
      try {
        const trackRes: any = await api.orders.track(query);
        if (trackRes && trackRes.success && trackRes.order) {
          foundOrder = trackRes.order;
        }
      } catch (_) {}

      if (!isMountedRef.current) return;

      // If not found yet, try multi-field public lookup (order code, player id, email)
      if (!foundOrder) {
        const lookupRes: any = await api.orders.publicLookup({
          orderCode: query,
          playerId: query,
          email: query.includes('@') ? query : undefined,
        });
        if (lookupRes && lookupRes.success && Array.isArray(lookupRes.orders) && lookupRes.orders.length > 0) {
          foundOrder = lookupRes.orders[0];
        }
      }

      if (!isMountedRef.current) return;

      if (foundOrder) {
        setSelectedOrderId(foundOrder.id);
        setCurrentTab('order_detail');
        showToast('success', 'Order Found', `Tracking Order ${formatDisplayOrderId(foundOrder)}`);
      } else {
        showToast('error', 'Order Not Found', 'No order matched that Order ID or Player UID. Please double check your entry.');
      }
    } catch {
      if (isMountedRef.current) {
        showToast('error', 'Error', 'Failed to track order. Please try again.');
      }
    } finally {
      if (isMountedRef.current) {
        setGuestTrackingLoading(false);
      }
    }
  };

  // =========================================================================
  // GUEST VIEW: NATIVE MOBILE GAMING APP CARD WITH INSTANT TRACKING
  // =========================================================================
  if (!currentUser) {
    return (
      <div className="flex-1 flex flex-col justify-center px-3.5 sm:px-6 pt-3 sm:pt-4 pb-3 sm:pb-3 max-w-sm sm:max-w-md mx-auto w-full min-h-[75vh] select-none font-sans">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full space-y-3.5"
        >
          {/* Mobile App Guest Hero Card */}
          <div className="bg-gradient-to-br from-violet-600 via-indigo-600 to-slate-900 text-white rounded-3xl p-5 sm:p-6 shadow-lg shadow-violet-600/20 text-center relative overflow-hidden">
            {/* Ambient Background Lights */}
            <div className="absolute -right-8 -top-8 w-28 h-28 rounded-full bg-white/10 blur-xl pointer-events-none" />
            <div className="absolute -left-6 -bottom-6 w-24 h-24 rounded-full bg-violet-500/20 blur-lg pointer-events-none" />

            <div className="w-14 h-14 rounded-2xl bg-white/15 border border-white/25 flex items-center justify-center text-white mx-auto mb-3 backdrop-blur-md shadow-inner">
              <ReceiptText size={28} />
            </div>

            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 border border-white/30 text-amber-300 font-black text-[10px] uppercase tracking-wider mb-2 backdrop-blur-md">
              <Sparkles size={11} className="fill-amber-300" />
              <span>Live Order Tracker &amp; Receipts</span>
            </span>

            <h2 className="text-lg sm:text-xl font-black tracking-tight text-white">Track Your Top-Up</h2>
            <p className="text-xs text-violet-100/90 mt-1 font-medium leading-relaxed max-w-xs mx-auto">
              Check instant delivery status with your Order ID or Player UID without logging in.
            </p>
          </div>

          {/* Quick Track Input Form */}
          <div className="bg-white border border-slate-200/90 rounded-3xl p-4 sm:p-5 shadow-xs space-y-3.5">
            <form onSubmit={handleGuestTrack} className="space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-700 block">
                  Quick Track Without Login
                </label>
                <span className="text-[10px] font-bold text-violet-600 bg-violet-50 px-2 py-0.5 rounded-md">
                  Instant
                </span>
              </div>

              <div className="relative">
                <input
                  type="text"
                  value={guestTrackingInput}
                  onChange={(e) => setGuestTrackingInput(e.target.value)}
                  placeholder="Enter GHN Order ID (e.g. GHN-4829)..."
                  className="w-full bg-slate-50 border border-slate-300 focus:bg-white focus:border-slate-400 rounded-2xl px-4 py-3 text-xs text-slate-900 font-mono outline-none focus:outline-none focus:ring-0 transition-all shadow-inner"
                />
                <button
                  type="submit"
                  disabled={guestTrackingLoading || !guestTrackingInput.trim()}
                  className="absolute right-1.5 top-1.5 bottom-1.5 px-4 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:opacity-95 active:scale-95 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all shadow-xs"
                >
                  {guestTrackingLoading ? <RefreshCw size={13} className="animate-spin" /> : <Search size={13} />}
                  <span>Track</span>
                </button>
              </div>
              <p className="text-[10px] text-slate-400 font-medium pl-1">
                Tip: You can also search by your game Player ID / UID.
              </p>
            </form>

            <div className="border-t border-slate-100 pt-3.5 space-y-2">
              <button
                type="button"
                onClick={() => {
                  setRedirectAfterAuth('orders');
                  setCurrentTab('login');
                }}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 hover:opacity-95 active:scale-[0.98] text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md shadow-violet-600/20 transition-all cursor-pointer"
              >
                <LogIn size={16} />
                <span>Login to View All Orders</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setRedirectAfterAuth('orders');
                  setCurrentTab('register');
                }}
                className="w-full py-2.5 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200/80 text-slate-800 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-[0.98]"
              >
                <UserCheck size={14} className="text-slate-500" />
                <span>New User? Create Account</span>
              </button>
            </div>
          </div>

          <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400 font-medium text-center">
            <ShieldCheck size={14} className="text-emerald-600" />
            <span>256-Bit SSL Encrypted Nepali Gamer Security</span>
          </div>
        </motion.div>
      </div>
    );
  }

  // =========================================================================
  // LOGGED-IN VIEW: FULL NATIVE GAMING APP ORDER HISTORY & TRACKING
  // =========================================================================
  const userOrders = getUserOrders(currentUser?.id || currentUser?.uid || '', currentUser?.email);

  // Precompute maps for O(1) lookups
  const cancellationMap = useMemo(() => {
    const map = new Map();
    for (const cr of cancellationRequests) {
      if (cr.orderId) map.set(cr.orderId, cr);
    }
    return map;
  }, [cancellationRequests]);

  const reviewMapByOrder = useMemo(() => {
    const map = new Map();
    for (const r of reviews) {
      if (r.orderId) map.set(r.orderId, r);
    }
    return map;
  }, [reviews]);

  const reviewMapByUserProduct = useMemo(() => {
    const map = new Map();
    if (!currentUser?.uid) return map;
    for (const r of reviews) {
      if (r.userId === currentUser.uid && r.productId) {
        const rName = (r.productName || '').toLowerCase();
        if (rName) {
          map.set(`${r.userId}_${r.productId}_${rName}`, r);
        }
      }
    }
    return map;
  }, [reviews, currentUser?.uid]);

  // Check if an order is refund-related
  const isRefundOrder = (order: Order) => {
    const hasCancelReq = cancellationMap.has(order.id);
    return (
      hasCancelReq ||
      order.cancellationStatus === 'requested' ||
      order.cancellationStatus === 'approved' ||
      order.cancellationStatus === 'rejected' ||
      (Boolean(order.refundStatus) && order.refundStatus !== 'not_applicable')
    );
  };

  // User Stats
  const activeOrdersList = userOrders.filter((o) => {
    const s = (o.orderStatus || '').toLowerCase();
    return s === 'pending_payment' || s === 'payment_verification' || s === 'processing' || s === 'payment_verified';
  });

  const completedOrdersList = userOrders.filter((o) => {
    const s = (o.orderStatus || '').toLowerCase();
    return s === 'completed' || s === 'delivered';
  });

  const totalSpentNPR = useMemo(() => {
    return completedOrdersList.reduce((acc, o) => acc + (Number(o.amount) || 0), 0);
  }, [completedOrdersList]);

  // Tab counts
  const counts = useMemo(() => {
    return {
      all: userOrders.length,
      active: activeOrdersList.length,
      completed: completedOrdersList.length,
      cancelled: userOrders.filter((o) => {
        const s = (o.orderStatus || '').toLowerCase();
        return s === 'cancelled' || s === 'rejected';
      }).length,
      refunds: userOrders.filter(isRefundOrder).length,
    };
  }, [userOrders, activeOrdersList, completedOrdersList, cancellationRequests]);

  // Filtered orders
  const filteredOrders = useMemo(() => {
    return userOrders
      .filter((order) => {
        if (activeTab === 'all') return true;
        if (activeTab === 'refunds') return isRefundOrder(order);
        const status = (order.orderStatus || '').toLowerCase();
        if (activeTab === 'active') {
          return (
            status === 'pending_payment' ||
            status === 'payment_verification' ||
            status === 'processing' ||
            status === 'payment_verified'
          );
        }
        if (activeTab === 'completed') {
          return status === 'completed' || status === 'delivered';
        }
        if (activeTab === 'cancelled') {
          return status === 'cancelled' || status === 'rejected';
        }
        return true;
      })
      .filter((order) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        const displayCode = formatDisplayOrderId(order).toLowerCase();
        return (
          displayCode.includes(q) ||
          (order.id && order.id.toLowerCase().includes(q)) ||
          (order.order_code && order.order_code.toLowerCase().includes(q)) ||
          (order.productName && order.productName.toLowerCase().includes(q)) ||
          (order.gameUserId && String(order.gameUserId).toLowerCase().includes(q)) ||
          (order.packageName && order.packageName.toLowerCase().includes(q))
        );
      });
  }, [userOrders, activeTab, searchQuery, cancellationRequests]);

  const handleOrderClick = (orderId: string) => {
    setSelectedOrderId(orderId);
    setCurrentTab('order_detail');
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  };

  const handleOpenReview = (e: React.MouseEvent, order: Order) => {
    e.stopPropagation();
    setReviewOrder(order);
    setIsReviewModalOpen(true);
  };

  const handleCopy = (e: React.MouseEvent, text: string, type: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedId(text);
    showToast('success', 'Copied!', `${type} copied to clipboard.`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleReorder = (e: React.MouseEvent, order: Order) => {
    e.stopPropagation();
    let targetProductId = order.productId;
    if (!targetProductId) {
      const match = products.find(p => 
        (p.name && order.productName && p.name.toLowerCase() === order.productName.toLowerCase()) ||
        (p.gameName && order.productName && p.gameName.toLowerCase() === order.productName.toLowerCase()) ||
        (order.productName && p.name && order.productName.toLowerCase().includes(p.name.toLowerCase()))
      );
      if (match) targetProductId = match.id;
    }
    if (targetProductId) {
      setSelectedProductId(targetProductId);
      setCurrentTab('product_detail');
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    } else {
      setCurrentTab('shop');
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    }
  };

  // WhatsApp direct support for order
  const getWhatsAppSupportUrl = (order: Order) => {
    const phone = appSettings?.supportPhone || '9768914027';
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const displayCode = formatDisplayOrderId(order);
    const msg = encodeURIComponent(
      `Hi Unx Games Support! I need assistance with my Order ${displayCode} for ${order.productName || 'Game Top-Up'}.`
    );
    return `https://wa.me/${cleanPhone}?text=${msg}`;
  };

  // Order Step Tracker Progress Helper
  const getOrderStepProgress = (status: string) => {
    const s = (status || '').toLowerCase();
    if (s === 'completed' || s === 'delivered') return 3; // Finished
    if (s === 'processing' || s === 'payment_verified') return 2; // In Progress
    if (s === 'payment_verification' || s === 'pending_payment') return 1; // Verification
    return 0; // Cancelled
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-2 sm:px-2 pt-1 sm:pt-1.5 pb-1 space-y-2 font-sans select-none antialiased">
      
      {/* ========================================================================= */}
      {/* 1. NATIVE MOBILE APP TOP SUMMARY & GAMER WALLET OVERVIEW                  */}
      {/* ========================================================================= */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-3.5 sm:p-4.5 shadow-xs space-y-3">
        {/* Top User Greeting / Metrics Bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-600 text-white flex items-center justify-center shadow-xs">
              <ReceiptText size={20} />
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-black text-slate-900 leading-tight">
                Order History &amp; Tracking
              </h1>
              <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium">
                Live delivery status, vouchers &amp; receipts
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                setSelectedProductId(null);
                setCurrentTab('shop');
              }}
              className="px-3 py-1.5 rounded-xl bg-violet-50 hover:bg-violet-100 text-violet-700 text-xs font-black flex items-center gap-1 transition-colors border border-violet-200/80 cursor-pointer shadow-2xs active:scale-95"
            >
              <Gamepad2 size={13} />
              <span>New Top-Up</span>
            </button>
          </div>
        </div>

        {/* 3 Mobile KPI Stats Cards (Interactive Quick Filters) */}
        <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-100">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            aria-pressed={activeTab === 'all'}
            className={`min-h-12 p-2.5 rounded-2xl border text-center transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 ${
              activeTab === 'all'
                ? 'bg-violet-50/90 border-violet-300 ring-2 ring-violet-500/20 shadow-xs'
                : 'bg-slate-50/80 border-slate-100 hover:bg-slate-100/80'
            }`}
          >
            <span className={`text-[10px] font-bold block uppercase tracking-wider ${
              activeTab === 'all' ? 'text-violet-700' : 'text-slate-500'
            }`}>
              Total Orders
            </span>
            <span className={`text-sm sm:text-base font-black font-mono ${
              activeTab === 'all' ? 'text-violet-900' : 'text-slate-900'
            }`}>
              {userOrders.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab(activeTab === 'active' ? 'all' : 'active')}
            aria-pressed={activeTab === 'active'}
            className={`min-h-12 p-2.5 rounded-2xl border text-center transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 ${
              activeTab === 'active'
                ? 'bg-amber-100/90 border-amber-400 ring-2 ring-amber-500/20 text-amber-950 shadow-xs'
                : counts.active > 0
                ? 'bg-amber-50/80 border-amber-200 text-amber-900 hover:bg-amber-100/70'
                : 'bg-slate-50/80 border-slate-100 text-slate-700 hover:bg-slate-100/80'
            }`}
          >
            <span className="text-[10px] font-bold block uppercase tracking-wider flex items-center justify-center gap-1">
              {counts.active > 0 && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />}
              <span>In Progress</span>
            </span>
            <span className="text-sm sm:text-base font-black font-mono">
              {counts.active}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab(activeTab === 'completed' ? 'all' : 'completed')}
            aria-pressed={activeTab === 'completed'}
            className={`min-h-12 p-2.5 rounded-2xl border text-center transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 ${
              activeTab === 'completed'
                ? 'bg-emerald-100/90 border-emerald-400 ring-2 ring-emerald-500/20 text-emerald-950 shadow-xs'
                : 'bg-emerald-50/80 border-emerald-100 text-emerald-900 hover:bg-emerald-100/70'
            }`}
          >
            <span className="text-[10px] font-bold block uppercase tracking-wider">
              Delivered
            </span>
            <span className="text-sm sm:text-base font-black font-mono">
              {counts.completed}
            </span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative pt-0.5">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Game, Order ID or Player UID..."
            aria-label="Search orders by game, order ID, or player ID"
            className="h-12 w-full rounded-2xl border border-slate-200/80 bg-slate-50 pl-10 pr-12 text-sm font-medium text-slate-900 shadow-2xs transition-all placeholder:truncate placeholder:text-slate-400 focus:border-slate-400 focus:bg-white outline-none focus:outline-none focus:ring-0"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              aria-label="Clear order search"
              className="absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 cursor-pointer items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 outline-none focus:outline-none"
            >
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. ORDER CARDS LIST (NATIVE MOBILE GAMING APP CARDS)                       */}
      {/* ========================================================================= */}
      <div className="space-y-3">
        {filteredOrders.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-white border border-slate-200/90 rounded-3xl p-8 text-center space-y-3.5 shadow-2xs"
          >
            <div className="w-16 h-16 rounded-3xl bg-violet-50 text-violet-600 flex items-center justify-center mx-auto text-2xl shadow-inner border border-violet-100/60">
              📦
            </div>
            <div className="space-y-1">
              <h3 className="text-sm sm:text-base font-black text-slate-900">
                {activeTab === 'refunds'
                  ? 'No Refund Records Found'
                  : activeTab === 'active'
                  ? 'No Active Orders Right Now'
                  : activeTab !== 'all'
                  ? `No ${activeTab} orders`
                  : searchQuery
                  ? 'No Orders Matched Your Search'
                  : 'No orders placed yet'}
              </h3>
              <p className="text-xs text-slate-500 font-medium max-w-xs mx-auto leading-relaxed">
                {activeTab === 'active'
                  ? 'All your top-ups have been verified and credited successfully!'
                  : 'Top up Free Fire, PUBG Mobile, MLBB with instant 5-min Nepal delivery!'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setSelectedProductId(null);
                setCurrentTab('shop');
              }}
              className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 hover:opacity-95 text-white font-black text-xs inline-flex items-center gap-1.5 shadow-md shadow-violet-600/25 active:scale-95 transition-all cursor-pointer"
            >
              <Gamepad2 size={14} />
              <span>Browse Games &amp; Top-Ups</span>
            </button>
          </motion.div>
        ) : (
          filteredOrders.map((order, idx) => {
            const isCompleted = order.orderStatus === 'completed' || order.orderStatus === 'delivered';
            const isProcessing = order.orderStatus === 'processing' || order.orderStatus === 'payment_verified';
            const isPending = order.orderStatus === 'pending_payment' || order.orderStatus === 'payment_verification';
            const isRejected = order.orderStatus === 'rejected';
            const isCancelled = order.orderStatus === 'cancelled';

            const matchingCancel = cancellationMap.get(order.id);
            const rawRefundStatus = (matchingCancel?.refundStatus || order.refundStatus || '').toLowerCase();
            const hasActiveRefund =
              Boolean(matchingCancel) ||
              order.cancellationStatus === 'requested' ||
              order.cancellationStatus === 'approved' ||
              Boolean(order.refundStatus && order.refundStatus !== 'not_applicable');

            const isRefundCompleted = rawRefundStatus === 'refunded' || rawRefundStatus === 'completed';
            const isRefundRejected =
              rawRefundStatus === 'rejected' ||
              matchingCancel?.status === 'REJECTED' ||
              order.cancellationStatus === 'rejected';
            const isRefundProcessing =
              rawRefundStatus === 'processing' ||
              (matchingCancel?.status === 'APPROVED' && !isRefundCompleted && !isRefundRejected);

            let existingReview = reviewMapByOrder.get(order.id);
            if (!existingReview && currentUser?.uid && order.productId) {
              const oName = (order.productName || '').toLowerCase();
              if (oName) {
                existingReview = reviewMapByUserProduct.get(`${currentUser.uid}_${order.productId}_${oName}`);
              }
            }

            const step = getOrderStepProgress(order.orderStatus);

            return (
              <motion.div
                key={`cust-order-${order.id || idx}-${idx}`}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => handleOrderClick(order.id)}
                className={`bg-white border rounded-3xl p-3.5 sm:p-4.5 shadow-2xs hover:shadow-xs active:scale-[0.99] transition-all cursor-pointer space-y-3 group ${
                  hasActiveRefund
                    ? 'border-amber-200 hover:border-amber-400'
                    : isProcessing
                    ? 'border-violet-300 ring-1 ring-violet-500/15'
                    : isCompleted
                    ? 'border-slate-200/90 hover:border-emerald-300'
                    : 'border-slate-200/90 hover:border-violet-300'
                }`}
              >
                {/* Header: Order ID + Date + Status Badge */}
                <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-xs font-mono font-black text-violet-700 bg-violet-50/90 px-2 py-0.5 rounded-lg border border-violet-100 tracking-tight">
                      {formatDisplayOrderId(order)}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => handleCopy(e, formatDisplayOrderId(order), 'Order ID')}
                      className="text-slate-400 hover:text-violet-600 p-1 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
                      title="Copy Order ID"
                    >
                      {copiedId === formatDisplayOrderId(order) ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                    </button>
                    <span className="text-slate-300 text-xs">•</span>
                    <span className="text-[11px] text-slate-400 font-medium truncate">
                      {formatDate(order.createdAt)}
                    </span>
                  </div>

                  <div className="shrink-0 flex items-center gap-1.5">
                    {/* Refund / Status Badge */}
                    {hasActiveRefund ? (
                      isRefundCompleted ? (
                        <StatusBadge status="refunded" size="sm" />
                      ) : isRefundProcessing ? (
                        <StatusBadge status="refunding" size="sm" />
                      ) : isRefundRejected ? (
                        <>
                          <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full flex items-center gap-1 border bg-rose-50 border-rose-200 text-rose-700">
                            <XCircle size={10} />
                            <span>Refund Declined</span>
                          </span>
                          <StatusBadge status={order.orderStatus} size="sm" />
                        </>
                      ) : (
                        <StatusBadge status="cancellation_requested" size="sm" />
                      )
                    ) : (
                      <StatusBadge status={order.orderStatus} size="sm" />
                    )}
                  </div>
                </div>

                {/* Main Body: Game Avatar + Package + Price + UID */}
                <div className="flex items-start gap-3">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl overflow-hidden bg-gradient-to-b from-[#1C1736] to-[#120F24] border border-violet-200/80 shrink-0 flex items-center justify-center shadow-xs">
                    <img
                      src={getOfficialGameImage(order.productId, order.productName || order.gameName, order.productImage)}
                      alt={order.productName || 'Game'}
                      className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = getOfficialGameImage(order.productId, order.productName);
                      }}
                    />
                  </div>

                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-xs sm:text-sm font-black text-slate-900 truncate group-hover:text-violet-700 transition-colors">
                        {order.productName}
                      </h3>
                      <span className="text-xs sm:text-sm font-black text-violet-700 font-mono shrink-0">
                        {formatNPR(order.amount)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                        {order.packageName}
                      </span>
                    </div>

                    {/* UID / Zone Chip */}
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-500 pt-0.5 flex-wrap font-medium">
                      <div className="flex items-center gap-1 bg-slate-50 px-2 py-0.5 rounded-lg border border-slate-200/80">
                        <span className="font-bold text-slate-500">{getOrderAccountShortLabel(order)}:</span>
                        <span className="font-mono font-black text-slate-800">
                          {order.gameUserId || (order as any).game_username || (order as any).gameUsername || (order as any).playerId || (order as any).game_uid || (order as any).game_user_id || (order as any).player_id || 'N/A'}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => handleCopy(e, order.gameUserId || (order as any).game_username || (order as any).gameUsername || (order as any).playerId || (order as any).game_uid || (order as any).game_user_id || (order as any).player_id || '', getOrderAccountShortLabel(order))}
                          className="text-slate-400 hover:text-violet-600 p-0.5"
                          title={`Copy ${getOrderAccountShortLabel(order)}`}
                        >
                          <Copy size={10} />
                        </button>
                      </div>

                      {order.gameZoneId && (
                        <span className="bg-slate-50 px-2 py-0.5 rounded-lg border border-slate-200/80 font-mono text-slate-700">
                          Zone: {order.gameZoneId}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Live Step Progress Indicator (Native App Experience) */}
                {!hasActiveRefund && order.orderStatus !== 'cancelled' && order.orderStatus !== 'rejected' && order.orderStatus !== 'completed' && order.orderStatus !== 'delivered' && (
                  <div className="pt-2 pb-1 px-1">
                    {/* Explicit Order ID for Active Orders */}
                    <div className="text-[10px] font-mono font-bold text-slate-500 mb-1.5 flex items-center gap-1.5 bg-slate-100/50 py-1 px-2 rounded-md">
                      <span>Order Ref:</span>
                      <span className="text-violet-700 font-black">{formatDisplayOrderId(order)}</span>
                    </div>

                    <div className="py-2.5 px-3 bg-slate-50/90 rounded-2xl border border-slate-100">
                      {/* Step Circles & Connecting Line Track */}
                      <div className="relative flex items-center justify-between">
                        {/* Background Base Line */}
                        <div className="absolute left-3.5 right-3.5 top-1/2 -translate-y-1/2 h-[3px] bg-slate-200 rounded-full z-0 overflow-hidden">
                          {/* Active Progress Fill */}
                          <div
                            className={`h-full transition-all duration-300 rounded-full ${
                              step >= 3
                                ? 'bg-emerald-500 w-full'
                                : step === 2
                                ? 'bg-gradient-to-r from-amber-500 to-violet-600 w-1/2'
                                : 'bg-emerald-500 w-[12%]'
                            }`}
                          />
                        </div>

                        {/* Step 1: Paid / Verifying */}
                        <div className="relative z-10 flex flex-col items-center">
                          <div
                            className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black border-2 ring-2 ring-white transition-all shadow-2xs ${
                              step >= 2
                                ? 'bg-emerald-600 border-emerald-600 text-white'
                                : step === 1
                                ? 'bg-amber-500 border-amber-500 text-white animate-pulse'
                                : 'bg-slate-100 border-slate-300 text-slate-400'
                            }`}
                          >
                            {step >= 2 ? (
                              <Check size={12} className="stroke-[3]" />
                            ) : (
                              <span className="text-[10px] text-white font-black">1</span>
                            )}
                          </div>
                        </div>

                        {/* Step 2: Crediting / Queue */}
                        <div className="relative z-10 flex flex-col items-center">
                          <div
                            className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black border-2 ring-2 ring-white transition-all shadow-2xs ${
                              step >= 3
                                ? 'bg-emerald-600 border-emerald-600 text-white'
                                : step === 2
                                ? 'bg-violet-600 border-violet-600 text-white animate-pulse'
                                : 'bg-white border-slate-300 text-slate-400'
                            }`}
                          >
                            {step >= 3 ? (
                              <Check size={12} className="stroke-[3]" />
                            ) : step === 2 ? (
                              <Zap size={11} className="text-amber-300 animate-bounce" />
                            ) : (
                              <span className="text-[10px] text-slate-400 font-bold">2</span>
                            )}
                          </div>
                        </div>

                        {/* Step 3: Delivered */}
                        <div className="relative z-10 flex flex-col items-center">
                          <div
                            className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black border-2 ring-2 ring-white transition-all shadow-2xs ${
                              step >= 3
                                ? 'bg-emerald-600 border-emerald-600 text-white'
                                : 'bg-white border-slate-300 text-slate-400'
                            }`}
                          >
                            {step >= 3 ? (
                              <Check size={12} className="stroke-[3]" />
                            ) : (
                              <span className="text-[10px] text-slate-400 font-bold">3</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Step Labels Row */}
                      <div className="flex items-center justify-between text-[9.5px] font-bold mt-1.5 px-0.5">
                        <span className={step >= 2 ? 'text-emerald-700 font-extrabold' : step === 1 ? 'text-amber-600 font-extrabold animate-pulse' : 'text-slate-500'}>
                          {step >= 2 ? 'Paid' : 'Verifying'}
                        </span>
                        <span
                          className={`text-center ${
                            step >= 3
                              ? 'text-emerald-700 font-extrabold'
                              : step === 2
                              ? 'text-violet-700 font-black animate-pulse'
                              : 'text-slate-500'
                          }`}
                        >
                          {step >= 3 ? 'Credited' : step === 2 ? 'Crediting' : 'Queue'}
                        </span>
                        <span
                          className={`text-right ${
                            step >= 3 ? 'text-emerald-700 font-black' : 'text-slate-500'
                          }`}
                        >
                          Delivered
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Footer Action Strip */}
                <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap text-xs">
                  {/* Left: Quick Status Text */}
                  <div className="flex items-center gap-1.5 text-[11px] font-medium">
                    {hasActiveRefund ? (
                      <span className="text-amber-700 flex items-center gap-1 font-black">
                        <Wallet size={12} className="text-amber-600" />
                        <span>
                          {isRefundCompleted
                            ? `Rs. ${order.refundAmount || order.amount} Refund Settled`
                            : 'Refund in progress'}
                        </span>
                      </span>
                    ) : isCompleted ? (
                      <span className="text-emerald-700 flex items-center gap-1 font-black">
                        <CheckCircle2 size={13} className="text-emerald-600" />
                        <span>Top-up Complete</span>
                      </span>
                    ) : isProcessing ? (
                      <span className="text-violet-700 flex items-center gap-1 font-black">
                        <Zap size={13} className="text-violet-600 animate-bounce" />
                        <span>Fulfilling Order ({getOrderAccountShortLabel(order)})</span>
                      </span>
                    ) : isRejected ? (
                      <span className="text-rose-700 flex items-center gap-1 font-black">
                        <XCircle size={13} className="text-rose-600" />
                        <span>Order Rejected</span>
                      </span>
                    ) : isCancelled ? (
                      <span className="text-slate-600 flex items-center gap-1 font-black">
                        <XCircle size={13} className="text-slate-500" />
                        <span>Order Cancelled</span>
                      </span>
                    ) : (
                      <span className="text-amber-700 flex items-center gap-1 font-semibold">
                        <Clock size={12} className="text-amber-600" />
                        <span>Payment Verifying</span>
                      </span>
                    )}
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-1.5 ml-auto">
                    {/* 1. WhatsApp Order Support */}
                    <a
                      href={getWhatsAppSupportUrl(order)}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="p-1.5 rounded-xl bg-slate-100 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 transition-colors border border-slate-200/60 cursor-pointer active:scale-95"
                      title="Direct WhatsApp Support for this Order"
                    >
                      <MessageCircle size={14} className="text-emerald-600" />
                    </a>

                    {hasActiveRefund ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOrderClick(order.id);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-xs flex items-center gap-1 shadow-2xs transition-all active:scale-95 cursor-pointer"
                      >
                        <RotateCcw size={12} />
                        <span>Track Refund</span>
                      </button>
                    ) : isCompleted ? (
                      <>
                        {/* 2. Review / Edit Review Button */}
                        {existingReview ? (
                          <button
                            type="button"
                            onClick={(e) => handleOpenReview(e, order)}
                            className="text-[11px] font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-300/80 px-2.5 py-1.5 rounded-xl flex items-center gap-1 cursor-pointer active:scale-95 transition-all shadow-2xs"
                            title="Click to view or edit your review"
                          >
                            <Star size={12} className="fill-amber-500 text-amber-500" />
                            <span>{existingReview.rating}★ Reviewed</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => handleOpenReview(e, order)}
                            className="px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-black text-xs flex items-center gap-1 shadow-2xs transition-all active:scale-95 cursor-pointer"
                          >
                            <Star size={12} className="fill-white text-white" />
                            <span>Review</span>
                          </button>
                        )}

                        {/* 3. Re-Order Quick Button */}
                        <button
                          type="button"
                          onClick={(e) => handleReorder(e, order)}
                          className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-violet-50 hover:text-violet-700 text-slate-700 font-bold text-xs flex items-center gap-1 transition-all active:scale-95 cursor-pointer border border-slate-200/70 shadow-2xs"
                        >
                          <RotateCcw size={11} className="text-violet-600" />
                          <span>Re-Order</span>
                        </button>
                      </>
                    ) : null}

                    {/* 4. Track & Receipt Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOrderClick(order.id);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-700 active:scale-95 text-white font-black text-xs flex items-center gap-1 transition-all cursor-pointer shadow-xs shadow-violet-200"
                    >
                      <span>Track &amp; Receipt</span>
                      <ChevronRight size={13} className="stroke-[2.5]" />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Review Modal for Selected Order */}
      {reviewOrder && (
        <ReviewModal
          isOpen={isReviewModalOpen}
          onClose={() => {
            setIsReviewModalOpen(false);
            setReviewOrder(null);
          }}
          orderId={reviewOrder.id}
          productId={reviewOrder.productId}
          defaultProductName={reviewOrder.productName}
          defaultPackageName={reviewOrder.packageName}
          defaultProductImage={reviewOrder.productImage}
        />
      )}
    </div>
  );
};
export default OrdersPage;
