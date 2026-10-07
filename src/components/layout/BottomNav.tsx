import React, { useMemo, useCallback } from 'react';
import { useStore } from '../../context/StoreContext';
import { useAuth } from '../../context/AuthContext';
import { Home, ShoppingBag, Newspaper, ClipboardList, User } from 'lucide-react';

const NAV_ITEMS = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'shop', label: 'Shop', icon: ShoppingBag },
  { id: 'news', label: 'News', icon: Newspaper },
  { id: 'orders', label: 'Orders', icon: ClipboardList, hasBadge: true },
  { id: 'profile', label: 'Profile', icon: User },
];

export const BottomNav: React.FC = () => {
  const { currentTab, setCurrentTab, setSelectedProductId, setSelectedOrderId, isAdminView, orders } = useStore();
  const { currentUser, setRedirectAfterAuth } = useAuth();

  // If in admin dashboard, we do not show customer bottom navigation
  if (isAdminView) {
    return null;
  }

  // Memoize active pending verification orders count to prevent array filtering on every frame
  const userActiveOrders = useMemo(() => {
    if (!currentUser || !Array.isArray(orders)) return 0;
    const uid = currentUser.uid;
    let count = 0;
    for (let i = 0; i < orders.length; i++) {
      const o = orders[i];
      if (
        o.userId === uid &&
        (o.orderStatus === 'payment_verification' ||
          o.orderStatus === 'processing' ||
          o.orderStatus === 'pending_payment')
      ) {
        count++;
      }
    }
    return count;
  }, [currentUser, orders]);

  const handleNavClick = useCallback(
    (tabId: string) => {
      // Non-blocking haptic feedback scheduled outside the touch frame
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        setTimeout(() => {
          try {
            navigator.vibrate(6);
          } catch {}
        }, 0);
      }

      // If clicking on already active tab, scroll cleanly to top
      if (currentTab === tabId) {
        const mainEl = document.getElementById('app-main-content') || document.querySelector('main');
        if (mainEl) mainEl.scrollTo({ top: 0, behavior: 'smooth' });
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      if (tabId === 'shop') {
        setSelectedProductId(null);
      } else if (tabId === 'orders') {
        setSelectedOrderId(null);
      }

      if (!currentUser && (tabId === 'orders' || tabId === 'profile')) {
        setRedirectAfterAuth(tabId);
        setCurrentTab('login');
        return;
      }

      setCurrentTab(tabId);
    },
    [currentTab, currentUser, setCurrentTab, setSelectedOrderId, setSelectedProductId, setRedirectAfterAuth]
  );

  return (
    <nav
      aria-label="Main navigation"
      className="shrink-0 z-40 flex h-[calc(82px+env(safe-area-inset-bottom,0px))] w-full select-none items-stretch border-t border-slate-200/80 bg-white/95 backdrop-blur-md pb-[env(safe-area-inset-bottom,0px)] pt-1 shadow-[0_-4px_20px_rgba(15,23,42,0.06)] transform-gpu"
    >
      <div className="relative mx-auto flex h-full w-full max-w-lg items-stretch justify-around px-2 sm:max-w-3xl sm:px-4">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive =
            currentTab === item.id ||
            (item.id === 'shop' && currentTab === 'product_detail') ||
            (item.id === 'orders' && currentTab === 'order_detail') ||
            (item.id === 'profile' && ['login', 'register', 'forgot_password', 'reset_password'].includes(currentTab));

          const badgeCount = item.hasBadge && userActiveOrders > 0 ? userActiveOrders : null;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleNavClick(item.id)}
              aria-current={isActive ? 'page' : undefined}
              aria-label={badgeCount ? `${item.label}, ${badgeCount} active orders` : item.label}
              className={`group relative flex min-h-[64px] flex-1 cursor-pointer flex-col items-center justify-center gap-1.5 px-1 py-1.5 transition-colors duration-100 ease-out touch-manipulation focus-visible:outline-none ${
                isActive ? 'text-indigo-600 font-black' : 'text-slate-500 hover:text-slate-800'
              }`}
              title={item.label}
            >
              {/* Top Active Indicator Line - Pure GPU CSS, 0ms JavaScript overhead */}
              {isActive && (
                <div
                  aria-hidden="true"
                  className="absolute top-0 w-10 h-1 rounded-full bg-indigo-600 sm:w-14 shadow-sm"
                />
              )}

              {/* Icon Container with Instant Hardware Tap Feedback */}
              <div className="relative flex items-center justify-center">
                <div
                  className={`relative flex h-11 w-14 items-center justify-center rounded-2xl active:scale-95 transition-transform duration-100 ease-out sm:w-16 transform-gpu ${
                    isActive
                      ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-md shadow-indigo-600/25'
                      : 'text-slate-500 group-hover:text-slate-800 hover:bg-slate-100/70'
                  }`}
                >
                  <Icon
                    size={24}
                    className={`transition-colors duration-100 ${
                      isActive ? 'stroke-[2.5] text-white' : 'stroke-[2] text-slate-500 group-hover:text-slate-800'
                    }`}
                  />
                </div>

                {/* Real-Time Notification & Pending Order Badge */}
                {badgeCount && (
                  <span
                    aria-hidden="true"
                    className="absolute -right-2 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full border-2 border-white bg-rose-600 px-1 text-[10px] font-black text-white shadow-sm"
                  >
                    {badgeCount > 9 ? '9+' : badgeCount}
                  </span>
                )}
              </div>

              {/* Label */}
              <span
                className={`text-xs leading-none tracking-tight transition-colors sm:text-sm ${
                  isActive
                    ? 'font-black text-violet-700'
                    : 'font-bold text-slate-500 group-hover:text-slate-800'
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
