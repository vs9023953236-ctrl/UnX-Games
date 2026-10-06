import React, { useEffect, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useStore } from '../../context/StoreContext';
import { useAuth } from '../../context/AuthContext';
import { formatTimeAgo, formatDisplayOrderId } from '../../utils/formatters';
import {
  Bell,
  CheckCheck,
  Package,
  AlertCircle,
  Sparkles,
  CheckCircle2,
  ShieldCheck,
  Trash2,
  X,
  CreditCard,
  Zap,
  ArrowRight,
  Clock,
  LogIn,
  BellOff,
  Eye,
  Volume2,
  VolumeX,
  Gift,
  Shield,
  Copy,
  Check,
  Flame,
  Radio,
  ExternalLink,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { NotificationDetailModal } from './NotificationDetailModal';

interface NotificationDropdownProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationDropdown: React.FC<NotificationDropdownProps> = ({
  isOpen,
  onClose,
}) => {
  const { currentUser } = useAuth();
  const {
    getUserNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    clearUserNotifications,
    deleteNotification,
    setSelectedOrderId,
    setCurrentTab,
    showToast,
  } = useStore();

  const [mounted, setMounted] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'orders' | 'promos' | 'system' | 'unread'>('all');
  const [selectedNotification, setSelectedNotification] = useState<any | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [copiedCoupon, setCopiedCoupon] = useState<string | null>(null);

  // Persistent read state for instant reactivity across broadcasts & DB items
  const [localReadIds, setLocalReadIds] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem('unx_read_notif_ids');
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });

  // Persistent deleted / cleared IDs
  const [clearedNotifIds, setClearedNotifIds] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem('unx_cleared_notif_ids');
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });

  const markIdAsReadLocally = (id: string) => {
    setLocalReadIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      try {
        localStorage.setItem('unx_read_notif_ids', JSON.stringify(Array.from(next)));
      } catch {}
      return next;
    });
  };

  const markAllAsReadLocally = (ids: string[]) => {
    setLocalReadIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.add(id));
      try {
        localStorage.setItem('unx_read_notif_ids', JSON.stringify(Array.from(next)));
      } catch {}
      return next;
    });
  };

  const markIdAsClearedLocally = (id: string) => {
    setClearedNotifIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      try {
        localStorage.setItem('unx_cleared_notif_ids', JSON.stringify(Array.from(next)));
      } catch {}
      return next;
    });
  };

  const clearAllLocally = (ids: string[]) => {
    setClearedNotifIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.add(id));
      try {
        localStorage.setItem('unx_cleared_notif_ids', JSON.stringify(Array.from(next)));
      } catch {}
      return next;
    });
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  // Built-in verified system broadcasts (ensures the notification tray is never empty/broken for any gamer)
  const systemBroadcasts = useMemo<any[]>(() => [
    {
      id: 'sys_notif_instant_delivery',
      recipientUid: currentUser?.uid || 'broadcast',
      userId: currentUser?.uid || 'broadcast',
      title: '⚡ 24/7 Instant Top-Up Active',
      message: 'Over 98% of diamond and game top-up orders are processed within 5-15 minutes across Nepal!',
      type: 'delivery_guarantee',
      read: false,
      createdAt: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
      actionUrl: '/shop',
      badge: 'FAST DISPATCH',
    },
    {
      id: 'sys_notif_freefire_coupon',
      recipientUid: currentUser?.uid || 'broadcast',
      userId: currentUser?.uid || 'broadcast',
      title: '🎁 Special Offer: Coupon Code FREEFIRE',
      message: 'Get 10% instant discount on all Free Fire diamond packs today. Tap to copy code and save!',
      type: 'promo',
      couponCode: 'FREEFIRE',
      read: false,
      createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
      badge: '10% OFF',
    },
    {
      id: 'sys_notif_payment_safe',
      recipientUid: currentUser?.uid || 'broadcast',
      userId: currentUser?.uid || 'broadcast',
      title: '💳 eSewa & Khalti QR Auto-Scan Active',
      message: 'Upload your clear payment receipt slip or enter Order ID in remarks for zero-delay order approval.',
      type: 'payment_verified',
      read: true,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
      badge: 'VERIFIED PAY',
    },
  ], [currentUser?.uid]);

  const rawUserNotifications: any[] = getUserNotifications(currentUser?.uid || '');

  // Merge user personal notifications with system broadcasts & filter deleted items
  const allNotifications = useMemo<any[]>(() => {
    const combined: any[] = [...rawUserNotifications];
    // Add broadcasts if not already present
    for (const sys of systemBroadcasts) {
      if (!combined.some(n => n.id === sys.id)) {
        combined.push(sys);
      }
    }

    // Filter out deleted / cleared notifications
    const active = combined.filter((n) => !clearedNotifIds.has(n.id));

    // Apply local persistent read state
    const withReadStatus = active.map(n => ({
      ...n,
      read: Boolean(n.read || localReadIds.has(n.id)),
    }));

    // Sort newest first
    return withReadStatus.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  }, [rawUserNotifications, systemBroadcasts, clearedNotifIds, localReadIds]);

  const unreadCount = allNotifications.filter(n => !n.read).length;
  const orderCount = allNotifications.filter(n => Boolean(n.orderId || n.order_id || n.type?.includes('order') || n.type?.includes('delivery') || n.type?.includes('payment'))).length;
  const promoCount = allNotifications.filter(n => n.type === 'promo' || n.type === 'offer' || n.type === 'announcement' || n.couponCode).length;
  const systemCount = allNotifications.filter(n => n.type === 'security' || n.type === 'kyc' || n.type === 'system' || n.type === 'delivery_guarantee').length;

  const filteredNotifications = useMemo<any[]>(() => {
    return allNotifications.filter(n => {
      if (activeFilter === 'unread') return !n.read;
      if (activeFilter === 'orders') return Boolean(n.orderId || n.order_id || n.type?.includes('order') || n.type?.includes('delivery') || n.type?.includes('payment'));
      if (activeFilter === 'promos') return n.type === 'promo' || n.type === 'offer' || n.type === 'announcement' || n.couponCode;
      if (activeFilter === 'system') return n.type === 'security' || n.type === 'kyc' || n.type === 'system' || n.type === 'delivery_guarantee';
      return true;
    });
  }, [allNotifications, activeFilter]);

  const handleNotificationClick = (notif: any) => {
    markIdAsReadLocally(notif.id);
    markNotificationAsRead(notif.id);
    setSelectedNotification(notif);
  };

  const handleReadAll = async () => {
    const allIds = allNotifications.map(n => n.id);
    markAllAsReadLocally(allIds);
    if (currentUser) {
      await markAllNotificationsAsRead(currentUser.uid);
    } else {
      showToast('info', 'Notifications Read', 'All notifications marked as read.');
    }
  };

  const handleDeleteNotification = async (e: React.MouseEvent | null, notifId: string) => {
    if (e) e.stopPropagation();
    markIdAsClearedLocally(notifId);
    await deleteNotification(notifId);
    if (selectedNotification?.id === notifId) {
      setSelectedNotification(null);
    }
    showToast('info', 'Notification Removed', 'Notification removed from your list.');
  };

  const handleClearAll = async () => {
    const allIds = allNotifications.map(n => n.id);
    clearAllLocally(allIds);
    if (currentUser) {
      await clearUserNotifications(currentUser.uid);
    } else {
      showToast('info', 'Notifications Cleared', 'All notifications cleared.');
    }
  };

  const handleTrackOrderFromCard = (e: React.MouseEvent, notif: any) => {
    e.stopPropagation();
    markIdAsReadLocally(notif.id);
    markNotificationAsRead(notif.id);
    const orderId = notif.orderId || notif.order_id;
    if (orderId) {
      setSelectedOrderId(orderId);
      setCurrentTab('orders');
      onClose();
    } else {
      setSelectedNotification(notif);
    }
  };

  const handleCopyCouponCode = (e: React.MouseEvent, code: string) => {
    e.stopPropagation();
    try {
      navigator.clipboard.writeText(code);
      setCopiedCoupon(code);
      showToast('success', 'Coupon Copied!', `Code "${code}" copied to clipboard.`);
      setTimeout(() => setCopiedCoupon(null), 2500);
    } catch {
      showToast('info', 'Code', code);
    }
  };

  const handleGoToShop = () => {
    setCurrentTab('shop');
    onClose();
  };

  const handleGoToLogin = () => {
    setCurrentTab('login');
    onClose();
  };

  const getIconAndBadge = (type: string, isUnread: boolean) => {
    switch (type) {
      case 'order_completed':
      case 'delivered':
        return {
          icon: <CheckCircle2 size={16} className="text-emerald-600" />,
          bg: 'bg-emerald-50 border-emerald-200 text-emerald-700',
          badge: 'DELIVERED',
          badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300'
        };
      case 'payment_verified':
        return {
          icon: <ShieldCheck size={16} className="text-orange-600" />,
          bg: 'bg-orange-50 border-orange-200 text-orange-700',
          badge: 'VERIFIED',
          badgeColor: 'bg-orange-100 text-orange-800 border-orange-300'
        };
      case 'payment_rejected':
        return {
          icon: <AlertCircle size={16} className="text-rose-600" />,
          bg: 'bg-rose-50 border-rose-200 text-rose-700',
          badge: 'ACTION REQUIRED',
          badgeColor: 'bg-rose-100 text-rose-800 border-rose-300'
        };
      case 'promo':
      case 'offer':
      case 'announcement':
        return {
          icon: <Sparkles size={16} className="text-amber-600" />,
          bg: 'bg-amber-50 border-amber-200 text-amber-700',
          badge: 'SPECIAL OFFER',
          badgeColor: 'bg-amber-100 text-amber-800 border-amber-300'
        };
      case 'delivery_guarantee':
        return {
          icon: <Zap size={16} className="text-sky-600" />,
          bg: 'bg-sky-50 border-sky-200 text-sky-700',
          badge: '5-15 MINS',
          badgeColor: 'bg-sky-100 text-sky-800 border-sky-300'
        };
      case 'order_processing':
        return {
          icon: <Clock size={16} className="text-sky-600" />,
          bg: 'bg-sky-50 border-sky-200 text-sky-700',
          badge: 'PROCESSING',
          badgeColor: 'bg-sky-100 text-sky-800 border-sky-300'
        };
      default:
        return {
          icon: <Bell size={16} className="text-indigo-600" />,
          bg: 'bg-indigo-50 border-indigo-200 text-indigo-700',
          badge: 'STORE UPDATE',
          badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-300'
        };
    }
  };

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop: Modern blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-xs"
            onClick={onClose}
          />

          {/* Dialog Container: Native Mobile App Bottom Sheet / Floating Modal */}
          <motion.div
            initial={{ opacity: 0, y: 15, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 15, scale: 0.98 }}
            transition={{ type: 'spring', damping: 28, stiffness: 360 }}
            className="fixed top-12 sm:top-16 left-2 right-2 sm:left-auto sm:right-6 sm:w-[440px] max-w-[450px] max-h-[85vh] z-[110] bg-white border border-slate-200/95 rounded-3xl shadow-[0_20px_60px_-15px_rgba(23,19,41,0.22)] flex flex-col overflow-hidden text-slate-900 mx-auto antialiased"
          >
            {/* Top Accent Gradient Bar */}
            <div className="h-1.5 bg-gradient-to-r from-red-600 via-purple-600 to-indigo-600 shrink-0" />

            {/* Header: Native Mobile App Header */}
            <div className="px-4 py-3 bg-slate-50/95 border-b border-slate-200/80 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="relative w-8 h-8 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center text-red-600 shadow-2xs">
                  <Bell size={16} className={unreadCount > 0 ? 'animate-bounce' : ''} />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-600 rounded-full ring-2 ring-white animate-pulse" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h2 className="font-black text-sm tracking-tight text-slate-900">Notifications</h2>
                    {unreadCount > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full bg-red-600 text-white text-[9px] font-black uppercase tracking-wider shadow-2xs">
                        {unreadCount} New
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-500 font-medium">
                    Order updates, diamond alerts &amp; announcements
                  </p>
                </div>
              </div>

              {/* Action Icons */}
              <div className="flex items-center gap-1.5">
                {allNotifications.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearAll}
                    className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200/80 transition-colors cursor-pointer"
                    title="Clear All Notifications"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
                  title={soundEnabled ? 'Notification Sound On' : 'Notification Sound Muted'}
                >
                  {soundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} className="text-slate-400" />}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-100 text-slate-500 hover:text-slate-800 hover:bg-slate-200 transition-colors cursor-pointer border border-slate-200/60"
                  aria-label="Close notifications"
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* Filter Pills Bar (Native App Style) */}
            <div className="px-3 py-2 bg-white border-b border-slate-100 flex items-center justify-between gap-1.5 shrink-0 overflow-x-auto no-scrollbar">
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => setActiveFilter('all')}
                  className={`px-2.5 py-1 rounded-xl text-[11px] font-black transition-all cursor-pointer ${
                    activeFilter === 'all'
                      ? 'bg-slate-900 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  All ({allNotifications.length})
                </button>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setActiveFilter('unread')}
                    className={`px-2.5 py-1 rounded-xl text-[11px] font-black transition-all cursor-pointer flex items-center gap-1 ${
                      activeFilter === 'unread'
                        ? 'bg-red-600 text-white shadow-2xs'
                        : 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
                    }`}
                  >
                    Unread ({unreadCount})
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setActiveFilter('orders')}
                  className={`px-2.5 py-1 rounded-xl text-[11px] font-black transition-all cursor-pointer ${
                    activeFilter === 'orders'
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Orders ({orderCount})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFilter('promos')}
                  className={`px-2.5 py-1 rounded-xl text-[11px] font-black transition-all cursor-pointer ${
                    activeFilter === 'promos'
                      ? 'bg-amber-600 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Offers ({promoCount})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFilter('system')}
                  className={`px-2.5 py-1 rounded-xl text-[11px] font-black transition-all cursor-pointer ${
                    activeFilter === 'system'
                      ? 'bg-sky-600 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  System ({systemCount})
                </button>
              </div>

              {/* Mark All Read */}
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleReadAll}
                  className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold flex items-center gap-1 cursor-pointer shrink-0 transition-all"
                  title="Mark all as read"
                >
                  <CheckCheck size={12} className="text-emerald-600" />
                  <span>Read All</span>
                </button>
              )}
            </div>

            {/* Notification Items List */}
            <div className="overflow-y-auto flex-1 bg-slate-50/70 p-2.5 space-y-2 max-h-[58vh] sm:max-h-[420px]">
              {filteredNotifications.length === 0 ? (
                <div className="py-12 px-4 text-center flex flex-col items-center justify-center space-y-2.5">
                  <div className="w-12 h-12 bg-white border border-slate-200 rounded-2xl flex items-center justify-center shadow-xs text-slate-400">
                    <BellOff size={22} />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-800">
                      {activeFilter === 'unread'
                        ? 'No Unread Notifications'
                        : activeFilter === 'orders'
                        ? 'No Order Updates'
                        : 'All Caught Up!'}
                    </h4>
                    <p className="text-[11px] text-slate-500 max-w-xs mt-0.5 leading-relaxed font-medium">
                      New diamond top-ups, voucher deliveries, and wallet reloads will appear here in real-time.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleGoToShop}
                    className="mt-1 px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Zap size={13} />
                    <span>Browse Popular Top-Ups</span>
                  </button>
                </div>
              ) : (
                <AnimatePresence>
                  {filteredNotifications.map((notif, index) => {
                    const isUnread = !notif.read;
                    const meta = getIconAndBadge(notif.type || 'info', isUnread);
                    const orderId = notif.orderId || notif.order_id;
                    const coupon = notif.couponCode;

                    return (
                      <motion.div
                        key={notif.id || index}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ delay: index * 0.02 }}
                        onClick={() => handleNotificationClick(notif)}
                        className={`p-3 rounded-2xl border transition-all cursor-pointer relative group flex flex-col space-y-2 shadow-2xs hover:shadow-md ${
                          isUnread
                            ? 'bg-white border-indigo-200/90 ring-1 ring-indigo-500/10'
                            : 'bg-white/80 border-slate-200/80 hover:bg-white hover:border-slate-300'
                        }`}
                      >
                        {/* Unread Pulse Glow Dot */}
                        {isUnread && (
                          <span className="absolute top-3 right-8 w-2 h-2 bg-red-600 rounded-full ring-4 ring-red-100 animate-pulse" />
                        )}

                        {/* Top Metadata Row */}
                        <div className="flex items-start gap-2.5">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${meta.bg}`}>
                            {meta.icon}
                          </div>

                          <div className="flex-1 min-w-0 pr-6">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <h3 className={`text-xs leading-snug ${isUnread ? 'font-black text-slate-900' : 'font-bold text-slate-800'}`}>
                                {notif.title}
                              </h3>
                            </div>
                            <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed font-medium line-clamp-2">
                              {notif.message}
                            </p>
                          </div>

                          {/* Individual Card Delete Action */}
                          <button
                            type="button"
                            onClick={(e) => handleDeleteNotification(e, notif.id)}
                            className="w-6 h-6 rounded-lg bg-slate-100 hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-transparent hover:border-rose-200 flex items-center justify-center transition-colors cursor-pointer shrink-0"
                            title="Delete notification"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>

                        {/* Bottom Action Footer on each Card */}
                        <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between gap-2 text-[10px]">
                          <span className="text-slate-400 font-medium flex items-center gap-1">
                            <Clock size={11} />
                            {notif.createdAt ? formatTimeAgo(notif.createdAt) : 'Just now'}
                          </span>

                          <div className="flex items-center gap-1.5">
                            {/* Action: Copy Coupon */}
                            {coupon && (
                              <button
                                type="button"
                                onClick={(e) => handleCopyCouponCode(e, coupon)}
                                className="px-2 py-0.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-mono font-black flex items-center gap-1 cursor-pointer transition-colors"
                              >
                                {copiedCoupon === coupon ? <Check size={11} className="text-emerald-600" /> : <Copy size={11} />}
                                <span>{coupon}</span>
                              </button>
                            )}

                            {/* Action: Track Order */}
                            {orderId && (
                              <button
                                type="button"
                                onClick={(e) => handleTrackOrderFromCard(e, notif)}
                                className="px-2 py-0.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold flex items-center gap-1 cursor-pointer transition-colors"
                              >
                                <Package size={11} />
                                <span>Track</span>
                              </button>
                            )}

                            <span className="text-slate-400 group-hover:text-indigo-600 font-bold flex items-center gap-0.5 transition-colors">
                              <span>Details</span>
                              <ArrowRight size={10} />
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              )}
            </div>

            {/* Bottom App Footer */}
            <div className="p-3 bg-slate-50 border-t border-slate-200/90 flex items-center justify-between shrink-0 text-xs">
              <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Real-time Live Sync Active</span>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs transition-colors cursor-pointer active:scale-95"
              >
                Close
              </button>
            </div>
          </motion.div>

          {/* Detailed Notification Breakdown Modal */}
          {selectedNotification && (
            <NotificationDetailModal
              notification={selectedNotification}
              onClose={() => setSelectedNotification(null)}
              onTrackOrder={(orderId) => {
                setSelectedOrderId(orderId);
                setCurrentTab('orders');
                setSelectedNotification(null);
                onClose();
              }}
              onDelete={(id) => {
                handleDeleteNotification(null, id);
              }}
            />
          )}
        </>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default NotificationDropdown;
