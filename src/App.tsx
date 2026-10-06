/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback, Suspense, lazy } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { StoreProvider, useStore } from './context/StoreContext';
import { AppShell } from './components/layout/AppShell';
import { HomePage } from './pages/HomePage';
import { MaintenanceScreen } from './components/common/MaintenanceScreen';
import { AuthRecoveryPrompt } from './components/auth/AuthRecoveryPrompt';
import { AdminTab } from './types';

import { ShopPage } from './pages/ShopPage';
import { ProductDetailsPage } from './pages/ProductDetailsPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { OrdersPage } from './pages/OrdersPage';
import { OrderDetailsPage } from './pages/OrderDetailsPage';
import { NewsPage } from './pages/NewsPage';
import { ProfilePage } from './pages/ProfilePage';
import { SettingsPage } from './pages/SettingsPage';
import { ReviewsPage } from './pages/ReviewsPage';
import { AccountVerificationPage } from './pages/AccountVerificationPage';
import { WalletPage } from './pages/WalletPage';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/auth/ResetPasswordPage';
import { AcceptInvitePage } from './pages/auth/AcceptInvitePage';
import { AuthLayout } from './components/auth/AuthLayout';
import { AppLogo } from './components/common/AppLogo';
import { SEOHead } from './components/common/SEOHead';
import { UnifiedAppLoadingScreen } from './components/common/UnifiedAppLoadingScreen';
import { PerfectAppSpinner } from './components/common/PerfectAppSpinner';
import { initImagePreloader } from './utils/imagePreloader';

// Helper to dynamically load secondary components with automatic retry and graceful fallback
function safeLazy<T extends React.ComponentType<any>>(
  importFn: () => Promise<any>,
  exportName?: string
) {
  return lazy(async () => {
    const extractModule = (module: any) => {
      if (!module) return null;
      if (exportName && module[exportName]) return { default: module[exportName] };
      if (module.default) return module;
      const component = exportName
        ? module[exportName]
        : Object.values(module).find((v) => typeof v === 'function' || typeof v === 'object') || module;
      return { default: component };
    };

    try {
      const module = await importFn();
      const extracted = extractModule(module);
      if (extracted) return extracted;
      throw new Error(`Module ${exportName || 'page'} did not export a valid component`);
    } catch (err: any) {
      console.warn('Dynamic page load failed, performing automatic recovery:', err?.message || err);
      const reloadKey = `ghn_lazy_retry_${exportName || 'page'}`;
      if (typeof window !== 'undefined' && !window.sessionStorage.getItem(reloadKey)) {
        window.sessionStorage.setItem(reloadKey, 'true');
        window.location.reload();
        return new Promise(() => {}); // Wait for reload
      } else {
        window.sessionStorage.removeItem(reloadKey);
      }
      return {
        default: () => (
          <div className="min-h-[50vh] flex flex-col items-center justify-center p-6 text-center">
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mb-3 font-bold">
              ⚠️
            </div>
            <h2 className="text-lg font-bold text-slate-900 mb-1">Page Load Error</h2>
            <p className="text-xs text-slate-600 mb-4 max-w-sm">
              We encountered an issue loading this section. Please reload the app.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-5 py-2.5 bg-indigo-600 text-white font-bold text-xs rounded-xl shadow-md hover:bg-indigo-700 transition"
            >
              Reload Page
            </button>
          </div>
        ),
      };
    }
  });
}

import { ProtectedAdminRoute } from './components/common/ProtectedAdminRoute';

// Code-split legal secondary pages for optimal bundle separation
const AccountRestrictedScreen = safeLazy(() => import('./components/common/AccountRestrictedScreen'), 'AccountRestrictedScreen');
const LegalPoliciesPage = safeLazy(() => import('./pages/legal/LegalPoliciesPage'), 'LegalPoliciesPage');
const TermsPage = safeLazy(() => import('./pages/legal/TermsPage'), 'TermsPage');
const PrivacyPage = safeLazy(() => import('./pages/legal/PrivacyPage'), 'PrivacyPage');
const RefundPolicyPage = safeLazy(() => import('./pages/legal/RefundPolicyPage'), 'RefundPolicyPage');
const KycPolicyPage = safeLazy(() => import('./pages/legal/KycPolicyPage'), 'KycPolicyPage');
const AboutUsPage = safeLazy(() => import('./pages/legal/AboutUsPage'), 'AboutUsPage');
const ContactUsPage = safeLazy(() => import('./pages/legal/ContactUsPage'), 'ContactUsPage');
const FaqPage = safeLazy(() => import('./pages/legal/FaqPage'), 'FaqPage');
const JoinTeamView = safeLazy(() => import('./components/profile/JoinTeamView'), 'JoinTeamView');

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { authStatus, isAuthenticated, currentUser, setRedirectAfterAuth, authRecoveryError } = useAuth();
  const { currentTab, setCurrentTab } = useStore();
  const [showSlowWarning, setShowSlowWarning] = useState(false);

  React.useEffect(() => {
    let timer: any = null;
    if (authStatus === 'loading') {
      timer = setTimeout(() => {
        setShowSlowWarning(true);
      }, 4000);
    } else {
      setShowSlowWarning(false);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [authStatus]);

  React.useEffect(() => {
    if (authStatus !== 'loading' && (!isAuthenticated || !currentUser)) {
      if (currentTab !== 'login') {
        setRedirectAfterAuth(currentTab);
        setCurrentTab('login');
      }
    }
  }, [authStatus, isAuthenticated, currentUser, currentTab, setRedirectAfterAuth, setCurrentTab]);

  if (authStatus === 'loading') {
    if (showSlowWarning || authRecoveryError) {
      return (
        <div className="p-4 max-w-lg mx-auto my-8">
          <AuthRecoveryPrompt
            variant="card"
            title="Session Verification Notice"
            description={authRecoveryError || "Session check is taking longer than usual. You can re-validate with Supabase or continue."}
          />
        </div>
      );
    }

    return (
      <div className="min-h-[50vh] flex items-center justify-center p-6">
        <div className="w-9 h-9 rounded-full border-3 border-violet-600 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (authStatus === 'unauthenticated' || !isAuthenticated || !currentUser) {
    return null;
  }

  const isOwner = currentUser?.role === 'STORE_OWNER' || currentUser?.role === 'SUPER_ADMIN';

  const isRestricted = !isOwner && currentUser?.status && 
    ['suspended', 'SUSPENDED', 'blocked', 'BLOCKED', 'restricted', 'RESTRICTED'].includes(currentUser.status);

  if (isRestricted) {
    return <AccountRestrictedScreen />;
  }

  return <>{children}</>;
};

const getPathForTab = (
  tab: string,
  isAdminView: boolean,
  adminTab: string,
  selectedProductId: string | null,
  selectedOrderId: string | null
): string => {
  if (isAdminView || tab === 'admin') {
    return adminTab === 'overview' ? '/admin' : `/admin/${adminTab.replace(/_/g, '-')}`;
  }
  switch (tab) {
    case 'home':
      return '/';
    case 'shop':
      return '/shop';
    case 'product_detail':
      return selectedProductId ? `/product/${selectedProductId}` : '/shop';
    case 'checkout':
      return '/checkout';
    case 'orders':
      return '/orders';
    case 'order_detail':
      return selectedOrderId ? `/orders/${selectedOrderId}` : '/orders';
    case 'wallet':
      return '/wallet';
    case 'reviews':
      return '/reviews';
    case 'news':
      return '/news';
    case 'profile':
      return '/profile';
    case 'settings':
      return '/settings';
    case 'account_verification':
      return '/account-verification';
    case 'join_team':
      return '/join-team';
    case 'login':
      return '/login';
    case 'register':
      return '/register';
    case 'forgot_password':
      return '/forgot-password';
    case 'reset_password':
      return '/reset-password';
    case 'accept_invite':
      if (typeof window !== 'undefined') {
        const currentPath = window.location.pathname.toLowerCase();
        if (currentPath.includes('/auth/callback')) return '/auth/callback';
        if (currentPath.includes('/auth/accept-invite')) return '/auth/accept-invite';
        if (currentPath.includes('/accept-invite')) return '/accept-invite';
      }
      return '/auth/callback';
    case 'about':
      return '/about';
    case 'contact':
      return '/contact';
    case 'terms':
      return '/terms';
    case 'privacy':
      return '/privacy';
    case 'faq':
      return '/faq';
    case 'kyc_policy':
      return '/kyc-policy';
    case 'refund_policy':
      return '/refund-policy';
    case 'delivery_policy':
      return '/delivery-policy';
    case 'payment_policy':
      return '/payment-policy';
    default:
      return '/';
  }
};

const RouteLoadingFallback: React.FC = () => (
  <div className="min-h-[50vh] flex items-center justify-center p-6">
    <div className="w-8 h-8 rounded-full border-3 border-violet-600 border-t-transparent animate-spin" />
  </div>
);

const AppContent: React.FC = () => {
  const {
    currentTab,
    setCurrentTab,
    isAdminView,
    setIsAdminView,
    adminTab,
    setAdminTab,
    appSettings,
    selectedProductId,
    selectedOrderId,
    setSelectedProductId,
    setSelectedOrderId,
  } = useStore();
  const { isAdmin, isAuthenticated, logout } = useAuth();
  const location = useLocation();

  // Defer global image preloader until after initial interactive paint for low-end mobile performance
  useEffect(() => {
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      (window as any).requestIdleCallback(() => initImagePreloader(), { timeout: 2000 });
    } else {
      const timer = setTimeout(() => initImagePreloader(), 800);
      return () => clearTimeout(timer);
    }
  }, []);

  // Enforce Maintenance Mode: Auto-logout non-admin users
  useEffect(() => {
    if (appSettings?.maintenanceMode && isAuthenticated && !isAdmin) {
      logout();
      if (currentTab === 'login' || currentTab === 'register') {
         setCurrentTab('home');
      }
    }
  }, [appSettings?.maintenanceMode, isAuthenticated, isAdmin, logout, currentTab, setCurrentTab]);

  // Scroll to top automatically when navigating to any page/tab
  useEffect(() => {
    try {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
      const mainEl = document.querySelector('main');
      if (mainEl) mainEl.scrollTop = 0;
    } catch {}
  }, [currentTab]);

  // Keep browser URL cleanly in sync with current active tab
  useEffect(() => {
    try {
      const expectedPath = getPathForTab(
        currentTab,
        isAdminView,
        adminTab,
        selectedProductId,
        selectedOrderId
      );
      if (window.location.pathname !== expectedPath) {
        const fullExpected = expectedPath + window.location.search + window.location.hash;
        window.history.replaceState(null, '', fullExpected);
      }
    } catch {}
  }, [currentTab, isAdminView, adminTab, selectedProductId, selectedOrderId]);

  // Keep document title strictly synchronized with brand guidelines:
  // Primary Brand: Unx Games (Never intraX Pvt Ltd as primary page title)
  useEffect(() => {
    try {
      if (isAdminView) {
        document.title = 'Unx Games - Admin';
        return;
      }
      switch (currentTab) {
        case 'login':
          document.title = 'Unx Games - Login';
          break;
        case 'register':
          document.title = 'Unx Games - Register';
          break;
        case 'forgot_password':
        case 'reset_password':
          document.title = 'Unx Games - Password Reset';
          break;
        case 'accept_invite':
          document.title = "Unx Games - You're Invited";
          break;
        case 'profile':
          document.title = 'Unx Games - Customer Dashboard';
          break;
        case 'orders':
          document.title = 'Unx Games - Dashboard';
          break;
        case 'contact':
          document.title = 'Unx Games - Support';
          break;
        case 'notifications':
          document.title = 'Unx Games - Notifications';
          break;
        case 'shop':
          document.title = 'Unx Games - Game Top-Up Store';
          break;
        case 'about':
          document.title = 'Unx Games - About Us';
          break;
        case 'terms':
          document.title = 'Unx Games - Terms of Service';
          break;
        case 'privacy':
          document.title = 'Unx Games - Privacy Policy';
          break;
        case 'faq':
          document.title = 'Unx Games - FAQ';
          break;
        case 'wallet':
          document.title = 'Unx Games - Gamer Wallet';
          break;
        case 'home':
        default:
          document.title = 'Unx Games';
          break;
      }
    } catch {}
  }, [currentTab, isAdminView]);

  // Sync initial URL path / query params and browser back/forward (popstate)
  useEffect(() => {
    const handleUrlSync = () => {
      try {
        const path = window.location.pathname.toLowerCase();
        const params = new URLSearchParams(window.location.search);
        const hash = window.location.hash.toLowerCase();
        const hasResetCode = params.has('oobCode') || params.has('code');
        const hasInviteHash = hash.includes('type=invite') || params.get('type') === 'invite';
        const isInvitePath =
          path === '/auth/callback' ||
          path.startsWith('/auth/callback') ||
          path === '/auth/accept-invite' ||
          path.startsWith('/auth/accept-invite') ||
          path === '/accept-invite' ||
          path.startsWith('/accept-invite') ||
          hasInviteHash;

        let targetTab: string | null = null;
        let targetAdminTab: AdminTab | null = null;
        let targetIsAdminView = false;

        if (isInvitePath) {
          targetTab = 'accept_invite';
        } else if (hasResetCode || path.includes('/reset-password') || path.includes('/auth/reset-password') || hash.includes('#reset-password')) {
          targetTab = 'reset_password';
        } else if (path.includes('/forgot-password') || path.includes('/auth/forgot-password')) {
          targetTab = 'forgot_password';
        } else if (
          path.includes('/login') ||
          path.includes('/sign-in') ||
          path.includes('/auth/sign-in') ||
          path.includes('/auth/login') ||
          hash.includes('#login') ||
          hash.includes('#signin')
        ) {
          targetTab = 'login';
        } else if (
          path.includes('/register') ||
          path.includes('/signup') ||
          path.includes('/sign-up') ||
          path.includes('/auth/sign-up') ||
          path.includes('/auth/register')
        ) {
          targetTab = 'register';
        } else if (path.startsWith('/admin') || path.includes('/admin')) {
          targetIsAdminView = true;
          targetTab = 'admin';
          if (path.includes('/admin/orders')) targetAdminTab = 'orders';
          else if (path.includes('/admin/payments')) targetAdminTab = 'payments';
          else if (path.includes('/admin/wallets')) targetAdminTab = 'wallets';
          else if (path.includes('/admin/products')) targetAdminTab = 'products';
          else if (path.includes('/admin/packages')) targetAdminTab = 'packages';
          else if (path.includes('/admin/categories')) targetAdminTab = 'categories';
          else if (path.includes('/admin/customers') || path.includes('/admin/users')) targetAdminTab = 'users';
          else if (path.includes('/admin/roles') || path.includes('/admin/permissions')) targetAdminTab = 'roles_permissions';
          else if (path.includes('/admin/team') || path.includes('/admin/applications')) targetAdminTab = 'team_applications';
          else if (path.includes('/admin/kyc')) targetAdminTab = 'kyc';
          else if (path.includes('/admin/inquiries') || path.includes('/admin/support')) targetAdminTab = 'inquiries';
          else if (path.includes('/admin/reviews')) targetAdminTab = 'reviews';
          else if (path.includes('/admin/banners') || path.includes('/admin/offers')) targetAdminTab = 'banners';
          else if (path.includes('/admin/coupons') || path.includes('/admin/promos')) targetAdminTab = 'coupons';
          else if (path.includes('/admin/news')) targetAdminTab = 'news';
          else if (path.includes('/admin/notifications')) targetAdminTab = 'notifications';
          else if (path.includes('/admin/media') || path.includes('/admin/vault')) targetAdminTab = 'media_vault';
          else if (path.includes('/admin/reports') || path.includes('/admin/revenue')) targetAdminTab = 'reports';
          else if (path.includes('/admin/activity') || path.includes('/admin/logs')) targetAdminTab = 'activity_logs';
          else if (path.includes('/admin/payment-settings') || path.includes('/admin/qr')) targetAdminTab = 'payment_settings';
          else if (path.includes('/admin/settings') || path.includes('/admin/app-settings')) targetAdminTab = 'app_settings';
          else if (path.includes('/admin/db') || path.includes('/admin/database')) targetAdminTab = 'db_inspector';
          else if (path.includes('/admin/search')) targetAdminTab = 'global_search';
          else if (path.includes('/admin/system-fetcher') || path.includes('/admin/fetcher')) targetAdminTab = 'system_fetcher';
          else if (path.includes('/admin/health') || path.includes('/admin/system')) targetAdminTab = 'system_health';
          else if (path.includes('/admin/security')) targetAdminTab = 'security';
          else if (path.includes('/admin/cancellations')) targetAdminTab = 'cancellations';
          else if (path.includes('/admin/password-resets')) targetAdminTab = 'password_resets';
          else targetAdminTab = 'overview';
        } else if (path.startsWith('/product/') || path.startsWith('/p/')) {
          targetTab = 'product_detail';
          const parts = window.location.pathname.split('/');
          const idFromUrl = parts[2];
          if (idFromUrl) {
            setSelectedProductId(idFromUrl);
          }
        } else if (path === '/shop' || path === '/products' || path.startsWith('/shop/') || path.startsWith('/category/')) {
          targetTab = 'shop';
        } else if (path.startsWith('/order/') || path.startsWith('/orders/')) {
          const parts = window.location.pathname.split('/');
          const idFromUrl = parts[2];
          if (idFromUrl) {
            targetTab = 'order_detail';
            setSelectedOrderId(idFromUrl);
          } else {
            targetTab = 'orders';
          }
        } else if (path === '/orders') {
          targetTab = 'orders';
        } else if (path.includes('/account-verification') || path.includes('/kyc-verification') || path === '/verification') {
          targetTab = 'account_verification';
        } else if (path.includes('/wallet') || path.includes('/gamer-wallet')) {
          targetTab = 'wallet';
        } else if (path.includes('/join-team') || path.includes('/careers') || path === '/team') {
          targetTab = 'join_team';
        } else if (path.includes('/account') || path.includes('/profile')) {
          if (path.includes('/account/settings') || path.includes('/settings')) {
            targetTab = 'settings';
          } else {
            targetTab = 'profile';
          }
        } else if (path.includes('/settings') || path.includes('/security')) {
          targetTab = 'settings';
        } else if (path.includes('/reviews') || path.includes('/feedback')) {
          targetTab = 'reviews';
        } else if (path.includes('/news') || path.includes('/announcements')) {
          targetTab = 'news';
        } else if (path.includes('/checkout')) {
          targetTab = 'checkout';
        } else if (path.includes('/about')) {
          targetTab = 'about';
        } else if (path.includes('/contact')) {
          targetTab = 'contact';
        } else if (path.includes('/terms')) {
          targetTab = 'terms';
        } else if (path.includes('/privacy')) {
          targetTab = 'privacy';
        } else if (path.includes('/kyc-policy')) {
          targetTab = 'kyc_policy';
        } else if (path.includes('/refund-policy') || path.includes('/refund')) {
          targetTab = 'refund_policy';
        } else if (path.includes('/delivery-policy') || path.includes('/delivery')) {
          targetTab = 'delivery_policy';
        } else if (path.includes('/payment-policy') || path.includes('/payment')) {
          targetTab = 'payment_policy';
        } else if (path.includes('/faq') || path.includes('/faqs') || path.includes('/help')) {
          targetTab = 'faq';
        } else if (path === '/' || path === '/home') {
          targetTab = 'home';
        }

        if (targetTab) {
          setCurrentTab(targetTab);
        }
        setIsAdminView(targetIsAdminView);
        if (targetAdminTab) {
          setAdminTab(targetAdminTab);
        }
      } catch {}
    };

    handleUrlSync();
    window.addEventListener('popstate', handleUrlSync);
    return () => window.removeEventListener('popstate', handleUrlSync);
  }, [setCurrentTab, setIsAdminView, setAdminTab, setSelectedProductId, setSelectedOrderId]);

  if (isAdminView || currentTab === 'admin') {
    return (
      <Suspense fallback={<RouteLoadingFallback />}>
        <ProtectedAdminRoute />
      </Suspense>
    );
  }

  // Maintenance Mode Guard for non-admin visitors
  if (appSettings?.maintenanceMode && !isAdmin) {
    return (
      <Suspense fallback={<RouteLoadingFallback />}>
        {currentTab === 'login' ? <LoginPage /> : currentTab === 'forgot_password' ? <ForgotPasswordPage /> : currentTab === 'reset_password' ? <ResetPasswordPage /> : <MaintenanceScreen />}
      </Suspense>
    );
  }

  return (
    <Suspense fallback={<RouteLoadingFallback />}>
      <SEOHead />
      <div className="w-full flex-1 flex flex-col relative min-h-0">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={
              currentTab === 'product_detail'
                ? `product_${selectedProductId || ''}`
                : currentTab === 'order_detail'
                ? `order_${selectedOrderId || ''}`
                : currentTab
            }
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.16, ease: [0.25, 1, 0.5, 1] }}
            className="w-full flex-1 flex flex-col min-h-0"
          >
            {(() => {
              switch (currentTab) {
                case 'home':
                  return <HomePage />;
                case 'shop':
                  return <ShopPage />;
                case 'product_detail':
                  return <ProductDetailsPage />;
                case 'checkout':
                  return (
                    <ProtectedRoute>
                      <CheckoutPage />
                    </ProtectedRoute>
                  );
                case 'orders':
                  return (
                    <ProtectedRoute>
                      <OrdersPage />
                    </ProtectedRoute>
                  );
                case 'order_detail':
                  return (
                    <ProtectedRoute>
                      <OrderDetailsPage />
                    </ProtectedRoute>
                  );
                case 'reviews':
                  return <ReviewsPage />;
                case 'news':
                  return <NewsPage />;
                case 'profile':
                  return (
                    <ProtectedRoute>
                      <ProfilePage />
                    </ProtectedRoute>
                  );
                case 'join_team':
                  return (
                    <ProtectedRoute>
                      <JoinTeamView />
                    </ProtectedRoute>
                  );
                case 'settings':
                case 'security':
                  return (
                    <ProtectedRoute>
                      <SettingsPage />
                    </ProtectedRoute>
                  );
                case 'login':
                case 'register':
                case 'forgot_password':
                case 'reset_password': {
                  const activeTab = currentTab === 'login' ? 'login' : currentTab === 'register' ? 'register' : 'forgot_password';
                  return (
                    <AuthLayout activeTab={activeTab}>
                      {currentTab === 'login' && <LoginPage hideLayout />}
                      {currentTab === 'register' && <RegisterPage hideLayout />}
                      {currentTab === 'forgot_password' && <ForgotPasswordPage hideLayout />}
                      {currentTab === 'reset_password' && <ResetPasswordPage hideLayout />}
                    </AuthLayout>
                  );
                }
                case 'accept_invite':
                  return <AcceptInvitePage />;
                case 'about':
                  return <AboutUsPage />;
                case 'contact':
                  return <ContactUsPage />;
                case 'terms':
                  return <TermsPage />;
                case 'privacy':
                  return <PrivacyPage />;
                case 'refund_policy':
                  return <RefundPolicyPage />;
                case 'kyc_policy':
                case 'kyc':
                  return <KycPolicyPage />;
                case 'account_verification':
                case 'verification':
                  return (
                    <ProtectedRoute>
                      <AccountVerificationPage />
                    </ProtectedRoute>
                  );
                case 'wallet':
                case 'gamer_wallet':
                  return (
                    <ProtectedRoute>
                      <WalletPage />
                    </ProtectedRoute>
                  );
                case 'delivery_policy':
                  return <LegalPoliciesPage initialSection="delivery" />;
                case 'payment_policy':
                  return <LegalPoliciesPage initialSection="payment" />;
                case 'faq':
                  return <FaqPage />;
                case 'admin':
                  return <ProtectedAdminRoute />;
                default:
                  return <HomePage />;
              }
            })()}
          </motion.div>
        </AnimatePresence>
      </div>
    </Suspense>
  );
};

const AppBootController: React.FC = () => {
  const { isLoadingProducts, isLoadingCategories, isLoadingNews } = useStore();
  const { authStatus } = useAuth();
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  useEffect(() => {
    // Fail-safe max boot timer: Guarantee app splash dismissal within 5 seconds if offline/stuck
    const maxBootTimer = setTimeout(() => {
      setIsDataLoaded(true);
    }, 5000);

    // Complete app data load condition:
    // Only dismiss loading screen once Products, Categories, News, and Auth session have completed loading
    const isAllDataReady = !isLoadingProducts && !isLoadingCategories && !isLoadingNews && authStatus !== 'loading';

    if (isAllDataReady) {
      const timer = setTimeout(() => {
        setIsDataLoaded(true);
      }, 300);
      return () => {
        clearTimeout(timer);
        clearTimeout(maxBootTimer);
      };
    }

    return () => clearTimeout(maxBootTimer);
  }, [isLoadingProducts, isLoadingCategories, isLoadingNews, authStatus]);

  return (
    <div className="relative h-full w-full bg-[#FAFBFF]">
      {/* Mount AppShell instantly so routes and components hydrate seamlessly in background */}
      <AppShell>
        <AppContent />
      </AppShell>

      <AnimatePresence>
        {!isDataLoaded && (
          <UnifiedAppLoadingScreen key="unx-app-loader" />
        )}
      </AnimatePresence>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <StoreProvider>
        <AppBootController />
      </StoreProvider>
    </AuthProvider>
  );
}
