import React, { useState, useEffect, useMemo, Suspense, lazy } from 'react';
import { useStore } from '../../context/StoreContext';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { AdminTab } from '../../types';
import { isOrderAwaitingPaymentVerification } from '../../utils/formatters';

import { AdminOverviewTab } from './tabs/AdminOverviewTab';
import { AdminOrdersTab } from './tabs/AdminOrdersTab';
import { AdminPaymentsTab } from './tabs/AdminPaymentsTab';
import { AdminProductsTab } from './tabs/AdminProductsTab';
import { AdminUsersTab } from './tabs/AdminUsersTab';

// Safe lazy loader with automatic retry and graceful fallback for secondary admin tabs
function safeTabLazy(importFn: () => Promise<any>, exportName?: string) {
  return lazy(async () => {
    const extractModule = (module: any) => {
      if (!module) return null;
      if (exportName && module[exportName]) {
        return { default: module[exportName] };
      }
      if (module.default) {
        return module;
      }
      const component = exportName
        ? module[exportName]
        : Object.values(module).find((v) => typeof v === 'function' || typeof v === 'object') || module;
      return { default: component };
    };

    try {
      const module = await importFn();
      const extracted = extractModule(module);
      if (extracted) return extracted;
      throw new Error(`Module ${exportName || 'tab'} did not export a valid React component`);
    } catch (err) {
      console.warn(`Admin sub-tab (${exportName || 'unknown'}) load attempt 1 failed, retrying...`, err);
      try {
        await new Promise((r) => setTimeout(r, 300));
        const module = await importFn();
        const extracted = extractModule(module);
        if (extracted) return extracted;
      } catch (retryErr) {
        console.warn(`Admin sub-tab (${exportName || 'unknown'}) load attempt 2 failed:`, retryErr);

        // Return a clean inline fallback UI instead of crashing the entire admin panel or reloading loop
        return {
          default: () => (
            <div className="p-8 text-center space-y-4 bg-amber-50/80 border border-amber-200/80 rounded-2xl my-6">
              <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto font-bold text-lg">
                ⚠️
              </div>
              <h3 className="text-base font-bold text-slate-900">
                Tab Component Failed to Load ({exportName || 'Admin Tab'})
              </h3>
              <p className="text-xs text-slate-600 max-w-md mx-auto">
                The connection was interrupted or a new app update was deployed. Please reload the page to refresh modules.
              </p>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md transition-all active:scale-95 cursor-pointer"
              >
                Reload Application
              </button>
            </div>
          )
        };
      }

      // Final safety fallback
      return {
        default: () => (
          <div className="p-6 text-center text-xs text-slate-500 font-medium">
            Tab temporarily unavailable.
          </div>
        ),
      };
    }
  });
}

// Lazy-loaded secondary Admin Sub-Tabs for optimal bundle splitting
const AdminOrderDetailTab = safeTabLazy(() => import('./tabs/AdminOrderDetailTab'), 'AdminOrderDetailTab');
const AdminProductEditorTab = safeTabLazy(() => import('./tabs/AdminProductEditorTab'), 'AdminProductEditorTab');
const AdminUserDetailTab = safeTabLazy(() => import('./tabs/AdminUserDetailTab'), 'AdminUserDetailTab');
const AdminNewsTab = safeTabLazy(() => import('./tabs/AdminNewsTab'), 'AdminNewsTab');
const AdminNewsEditorTab = safeTabLazy(() => import('./tabs/AdminNewsEditorTab'), 'AdminNewsEditorTab');
const AdminNotificationsTab = safeTabLazy(() => import('./tabs/AdminNotificationsTab'), 'AdminNotificationsTab');
const AdminPaymentSettingsTab = safeTabLazy(() => import('./tabs/AdminPaymentSettingsTab'), 'AdminPaymentSettingsTab');
const AdminAppSettingsTab = safeTabLazy(() => import('./tabs/AdminAppSettingsTab'), 'AdminAppSettingsTab');
const AdminReportsTab = safeTabLazy(() => import('./tabs/AdminReportsTab'), 'AdminReportsTab');
const AdminActivityLogsTab = safeTabLazy(() => import('./tabs/AdminActivityLogsTab'), 'AdminActivityLogsTab');
const AdminCancellationsTab = safeTabLazy(() => import('./tabs/AdminCancellationsTab'), 'AdminCancellationsTab');
const AdminRefundsTab = safeTabLazy(() => import('./tabs/AdminRefundsTab'), 'AdminRefundsTab');
const AdminRefundProcessTab = safeTabLazy(() => import('./tabs/AdminRefundProcessTab'), 'AdminRefundProcessTab');
const AdminSupportTab = safeTabLazy(() => import('./tabs/AdminSupportTab'), 'AdminSupportTab');
const AdminReviewsTab = safeTabLazy(() => import('./tabs/AdminReviewsTab'), 'AdminReviewsTab');
const AdminBannersTab = safeTabLazy(() => import('./tabs/AdminBannersTab'), 'AdminBannersTab');
const AdminPasswordResetsTab = safeTabLazy(() => import('./tabs/AdminPasswordResetsTab'), 'AdminPasswordResetsTab');
const AdminCoupons = safeTabLazy(() => import('./AdminCoupons'), 'AdminCoupons');
const AdminPackagesTab = safeTabLazy(() => import('./tabs/AdminPackagesTab'), 'AdminPackagesTab');
const AdminGamesTab = safeTabLazy(() => import('./tabs/AdminGamesTab'), 'AdminGamesTab');
const AdminCategoriesTab = safeTabLazy(() => import('./tabs/AdminCategoriesTab'), 'AdminCategoriesTab');
const AdminMediaVaultTab = safeTabLazy(() => import('./tabs/AdminMediaVaultTab'), 'AdminMediaVaultTab');
const AdminLegalTab = safeTabLazy(() => import('./tabs/AdminLegalTab'), 'AdminLegalTab');
const AdminBackupJobsTab = safeTabLazy(() => import('./tabs/AdminBackupJobsTab'), 'AdminBackupJobsTab');
const AdminSystemEventsTab = safeTabLazy(() => import('./tabs/AdminSystemEventsTab'), 'AdminSystemEventsTab');
const AdminMaintenanceTab = safeTabLazy(() => import('./tabs/AdminMaintenanceTab'), 'AdminMaintenanceTab');
const AdminDbInspectorTab = safeTabLazy(() => import('./tabs/AdminDbInspectorTab'), 'AdminDbInspectorTab');
const AdminGlobalSearchTab = safeTabLazy(() => import('./tabs/AdminGlobalSearchTab'), 'AdminGlobalSearchTab');
const AdminSystemHealthTab = safeTabLazy(() => import('./tabs/AdminSystemHealthTab'), 'AdminSystemHealthTab');
const AdminSystemFetcherTab = safeTabLazy(() => import('./tabs/AdminSystemFetcherTab'), 'AdminSystemFetcherTab');
const AdminCacheTab = safeTabLazy(() => import('./tabs/AdminCacheTab'), 'AdminCacheTab');
const AdminControlCenterTab = safeTabLazy(() => import('./tabs/AdminControlCenterTab'), 'AdminControlCenterTab');
const AdminInfrastructureTab = safeTabLazy(() => import('./tabs/AdminInfrastructureTab'), 'AdminInfrastructureTab');
const AdminRolesPermissionsTab = safeTabLazy(() => import('./tabs/AdminRolesPermissionsTab'), 'AdminRolesPermissionsTab');
const AdminWalletsTab = safeTabLazy(() => import('./tabs/AdminWalletsTab'), 'AdminWalletsTab');
const AdminSecurityTab = safeTabLazy(() => import('./tabs/AdminSecurityTab'), 'AdminSecurityTab');
const AdminRateLimitingTab = safeTabLazy(() => import('./tabs/AdminRateLimitingTab'), 'AdminRateLimitingTab');
const AdminPerformanceTab = safeTabLazy(() => import('./tabs/AdminPerformanceTab'), 'AdminPerformanceTab');
const AdminKycTab = safeTabLazy(() => import('./tabs/AdminKycTab'), 'AdminKycTab');
const AdminTeamApplicationsTab = safeTabLazy(() => import('./tabs/AdminTeamApplicationsTab'), 'AdminTeamApplicationsTab');
const AdminAiStudioTab = safeTabLazy(() => import('./tabs/AdminAiStudioTab'), 'AdminAiStudioTab');
import { AdminAiOverseerModal } from '../../components/admin/AdminAiOverseerModal';
import { AppLogo } from '../../components/common/AppLogo';
import { ModalPortal } from '../../components/common/ModalPortal';
import { AppLoadingScreen } from '../../components/common/AppLoadingScreen';


import {
  Bot,
  Code2,
  LayoutDashboard,
  ShoppingBag,
  Clock,
  QrCode,
  Users,
  UserPlus,
  Newspaper,
  FileWarning,
  FileText,
  Bell,
  Settings,
  ShieldAlert,
  LogOut,
  ExternalLink,
  Smartphone,
  Menu,
  X,
  ShieldCheck,
  Shield,
  Key,
  Package,
  FileBarChart,
  History,
  MessageSquareText,
  Star,
  Layers,
  MoreHorizontal,
  KeyRound,
  Tag,
  Folder,
  Sliders,
  Gift,
  Image,
  BarChart3,
  Database,
  Server,
  Terminal,
  DatabaseBackup,
  Search,
  Activity,
  UserCheck,
  Gamepad2,
  Trash2,
  Copy,
  Check,
  CheckCircle,
  AlertCircle,
  Eye,
  Lock,
  Unlock,
  CreditCard,
  Wallet as WalletIcon,
  Sparkles,
  Store,
  Power,
  Cpu,
  Zap,
  Gauge,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  PanelLeftClose,
  PanelLeftOpen,
  Pin,
  PinOff,
  Command,
  Bookmark,
} from 'lucide-react';
import { Ticket } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const AdminDashboard: React.FC = () => {
  const {
    products,
    orders,
    cancellationRequests,
    inquiries,
    reviews,
    banners,
    actionableOrderCount,
    notifications,
    adminTab,
    setAdminTab,
    setIsAdminView,
    setCurrentTab,
    showToast,
    appSettings,
    toggleStoreStatus,
    toggleOrderingStatus,
    toggleMaintenanceStatus,
    syncOrdersFromBackend,
    refreshSettings,
  } = useStore();

  const { currentUser, isAdmin, loading, logout, users } = useAuth();
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [showAdminProfileModal, setShowAdminProfileModal] = useState(false);
  const [showAiOverseerModal, setShowAiOverseerModal] = useState(false);
  const [isTogglingStore, setIsTogglingStore] = useState(false);

  // Advanced Navigation Menu States
  const [menuSearchQuery, setMenuSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string | null>(null);

  // Global Keyboard shortcuts: Ctrl+K / Cmd+K for Search Hub, Ctrl+J / Cmd+J for AI Overseer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setMobileDrawerOpen(prev => !prev);
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'j') {
        e.preventDefault();
        setShowAiOverseerModal(prev => !prev);
      } else if (e.key === 'Escape') {
        if (mobileDrawerOpen) setMobileDrawerOpen(false);
        if (showAiOverseerModal) setShowAiOverseerModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileDrawerOpen, showAiOverseerModal]);

  const handleAiSyncState = async () => {
    try {
      if (syncOrdersFromBackend) await syncOrdersFromBackend();
      if (refreshSettings) await refreshSettings();
      showToast('success', 'System State Synced', 'Live changes applied to Database, Backend and UI.');
    } catch (_) {}
  };
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem('unx_admin_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });
  const [pinnedTabs, setPinnedTabs] = useState<AdminTab[]>(() => {
    try {
      const saved = localStorage.getItem('unx_admin_pinned_tabs');
      return saved ? JSON.parse(saved) : ['overview', 'orders', 'payments', 'products', 'control_center'];
    } catch {
      return ['overview', 'orders', 'payments', 'products', 'control_center'];
    }
  });
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});

  const toggleSidebarCollapse = () => {
    setIsSidebarCollapsed(prev => {
      const next = !prev;
      try { localStorage.setItem('unx_admin_sidebar_collapsed', String(next)); } catch {}
      return next;
    });
  };

  const togglePinTab = (tab: AdminTab, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setPinnedTabs(prev => {
      const next = prev.includes(tab) ? prev.filter(t => t !== tab) : [...prev, tab];
      try { localStorage.setItem('unx_admin_pinned_tabs', JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const toggleCategoryCollapse = (catTitle: string) => {
    setCollapsedCategories(prev => ({
      ...prev,
      [catTitle]: !prev[catTitle]
    }));
  };

  const isOrderingEnabled = appSettings.orderingEnabled !== false;
  const isMaintenanceMode = Boolean(appSettings.maintenanceMode);
  const isStoreOnline = isOrderingEnabled && !isMaintenanceMode;

  const handleQuickToggleStore = async () => {
    if (isTogglingStore) return;
    setIsTogglingStore(true);
    const targetState = !isStoreOnline;
    try {
      await toggleStoreStatus(targetState);
    } catch {
      // Handled in store context with toast
    } finally {
      setIsTogglingStore(false);
    }
  };

  // Close drawer on tab change & clean scroll reset to top
  const navigateTab = (tab: AdminTab) => {
    try {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(8);
      }
    } catch {}

    const adminMain = document.getElementById('admin-main-content');
    if (adminTab === tab) {
      if (adminMain) adminMain.scrollTo({ top: 0, behavior: 'smooth' });
      setMobileDrawerOpen(false);
      return;
    }

    setAdminTab(tab);
    setMobileDrawerOpen(false);
    if (adminMain) {
      adminMain.scrollTo({ top: 0, behavior: 'auto' });
      adminMain.scrollTop = 0;
    }
  };

  const handleLogout = async () => {
    setIsAdminView(false);
    showToast('info', 'Logged Out', 'You have been signed out.');
    await logout();
    setCurrentTab(isMaintenanceMode ? 'home' : 'login');
  };

  const handleReturnToStore = () => {
    setIsAdminView(false);
    setCurrentTab('home');
  };

  // Counts for sidebar badges & mobile navigation (Unified 100% with AdminPaymentsTab)
  const pendingPaymentsCount = useMemo(() => {
    return orders.reduce((acc, o) => acc + (isOrderAwaitingPaymentVerification(o) ? 1 : 0), 0);
  }, [orders]);
  const activeProductsCount = useMemo(() => {
    return products.reduce((acc, p) => acc + (p.active ? 1 : 0), 0);
  }, [products]);
  const pendingCancellationsCount = useMemo(() => {
    return cancellationRequests.reduce((acc, r) => acc + (r.status === 'PENDING' ? 1 : 0), 0);
  }, [cancellationRequests]);
  const pendingInquiriesCount = useMemo(() => {
    return inquiries.reduce((acc, i) => acc + (i.status === 'pending' || !i.adminReply ? 1 : 0), 0);
  }, [inquiries]);
  const pendingKycCount = useMemo(() => {
    return (users || []).reduce((acc, u) => acc + (u.verification_status === 'pending' ? 1 : 0), 0);
  }, [users]);
  const adminUnreadCount = useMemo(() => {
    return (notifications || []).reduce((acc, n) => {
      if (n.read) return acc;
      const rRole = String(n.recipientRole || (n as any).recipient_role || '').toLowerCase();
      const rUid = String(n.recipientUid || (n as any).recipient_uid || n.userId || '').toLowerCase();
      if (rUid === 'admin' || rRole === 'admin' || rRole === 'staff' || n.type === 'payment_verification' || n.type === 'kyc_request' || n.type === 'WALLET_DEPOSIT') {
        return acc + 1;
      }
      return acc;
    }, 0);
  }, [notifications]);

  useEffect(() => {
    if (!currentUser) {
      setIsAdminView(false);
      setCurrentTab('login');
    }
  }, [currentUser, setIsAdminView, setCurrentTab]);

  // Provide a familiar keyboard shortcut for operators working through queues.
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        navigateTab('global_search');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setAdminTab]);

  // Strict Admin Role Access Control
  if (loading) {
    return (
      <div className="flex-1 w-full bg-slate-50 flex items-center justify-center p-4">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
          <p className="text-sm font-medium text-slate-500">Restoring secure session...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return null;
  }

  if (!isAdmin || currentUser.status === 'suspended') {
    return (
      <div className="flex-1 w-full bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 text-center space-y-4 shadow-xs">
          <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto text-2xl font-bold">
            🚫
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">Access Denied</h2>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
              You do not have permission to access the Unx Games administrative management system.
            </p>
          </div>
          <div className="space-y-2 pt-2">
            <button
              onClick={handleReturnToStore}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-extrabold text-xs uppercase tracking-wider shadow-md shadow-red-600/20 transition-all cursor-pointer"
            >
              Return to Home
            </button>
            <button
              onClick={async () => {
                await logout();
                setIsAdminView(false);
                setCurrentTab('login');
              }}
              className="w-full py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all cursor-pointer"
            >
              Sign Out & Switch Account
            </button>
          </div>
        </div>
      </div>
    );
  }

  interface DrawerCategory {
    title: string;
    items: {
      id: AdminTab;
      label: string;
      icon: React.ReactNode;
      badge?: string | number;
      badgeColor?: string;
    }[];
  }

  const uRole = String(currentUser?.role || '').toUpperCase();
  const isStoreOwner = uRole === 'STORE_OWNER';
  const isSuperAdmin = uRole === 'SUPER_ADMIN' || isStoreOwner;
  const isManager = uRole === 'STORE_MANAGER' || isSuperAdmin;
  const isStaff = uRole === 'SUPPORT_STAFF' || isManager;

  const rawDrawerCategories: DrawerCategory[] = [
    {
      title: 'OVERVIEW',
      items: [
        { id: 'overview', label: 'Dashboard', icon: <LayoutDashboard size={16} /> }
      ]
    },
    {
      title: 'CATALOG & PACKAGES',
      items: [
        { id: 'products', label: 'Products', icon: <Package size={16} />, badge: `${activeProductsCount} Active`, badgeColor: 'bg-emerald-100 text-emerald-700' },
        { id: 'packages', label: 'Packages & Prices', icon: <Layers size={16} /> },
        { id: 'categories', label: 'Categories', icon: <Folder size={16} /> }
      ]
    },
    {
      title: 'SALES & FULFILLMENT',
      items: [
        { id: 'orders', label: 'Orders', icon: <ShoppingBag size={16} />, badge: actionableOrderCount > 0 ? actionableOrderCount : undefined, badgeColor: 'bg-red-100 text-red-700' },
        { id: 'payments', label: 'Payment Verification', icon: <CreditCard size={16} />, badge: pendingPaymentsCount > 0 ? pendingPaymentsCount : undefined, badgeColor: 'bg-amber-500 text-white font-black animate-pulse' },
        { id: 'wallets', label: 'Customer Wallets', icon: <WalletIcon size={16} /> },
        { id: 'cancellations', label: 'Cancellations', icon: <FileWarning size={16} />, badge: pendingCancellationsCount > 0 ? pendingCancellationsCount : undefined, badgeColor: 'bg-amber-100 text-amber-700' },
        { id: 'coupons', label: 'Coupons & Promos', icon: <Ticket size={16} /> }
      ]
    },
    {
      title: 'CUSTOMERS & SUPPORT',
      items: [
        { id: 'users', label: 'User & Staff Accounts', icon: <Users size={16} /> },
        { id: 'invitations', label: 'User Invitations', icon: <UserPlus size={16} /> },
        { id: 'roles_permissions', label: 'Roles & Permissions', icon: <Shield size={16} /> },
        { id: 'team_applications', label: 'Team Applications', icon: <UserCheck size={16} /> },
        { id: 'kyc', label: 'KYC Verification', icon: <ShieldCheck size={16} />, badge: pendingKycCount > 0 ? pendingKycCount : undefined, badgeColor: 'bg-amber-500 text-white font-black animate-pulse' },
        { id: 'inquiries', label: 'Support Inquiries', icon: <MessageSquareText size={16} />, badge: pendingInquiriesCount > 0 ? pendingInquiriesCount : undefined, badgeColor: 'bg-rose-500 text-white font-black' },
        { id: 'reviews', label: 'Reviews', icon: <Star size={16} />, badge: reviews.length > 0 ? `${reviews.length}` : undefined, badgeColor: 'bg-amber-100 text-amber-800' }
      ]
    },
    {
      title: 'MARKETING & CONTENT',
      items: [
        { id: 'banners', label: 'Banners & Offers', icon: <Sliders size={16} />, badge: `${banners.length} Total`, badgeColor: 'bg-red-100 text-red-700' },
        { id: 'news', label: 'News & Updates', icon: <Newspaper size={16} /> },
        { id: 'notifications', label: 'Push Notifications', icon: <Bell size={16} /> },
        { id: 'legal', label: 'Legal Pages', icon: <FileText size={16} /> }
      ]
    },
    {
      title: 'STORAGE & MEDIA',
      items: [
        { id: 'media_vault', label: 'R2 Media Vault', icon: <Image size={16} /> }
      ]
    },
    {
      title: 'ANALYTICS & AUDIT',
      items: [
        { id: 'reports', label: 'Reports & Revenue', icon: <BarChart3 size={16} /> },
        { id: 'activity_logs', label: 'Activity Logs', icon: <History size={16} /> }
      ]
    },
    {
      title: 'AI & SYSTEM INTELLIGENCE',
      items: [
        { id: 'ai_studio', label: 'AI Engineer & Auto-Healer', icon: <Bot size={16} />, badge: 'Nemotron', badgeColor: 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-black animate-pulse' },
        { id: 'control_center', label: 'AI Control Tower', icon: <Sparkles size={16} />, badge: 'AI Live', badgeColor: 'bg-purple-600 text-white font-extrabold' },
        { id: 'infrastructure', label: 'Cluster & Load Balancer', icon: <Server size={16} />, badge: 'Proxy', badgeColor: 'bg-cyan-600 text-white font-bold' },
        { id: 'system_health', label: 'System Health Monitor', icon: <Activity size={16} />, badge: 'Realtime', badgeColor: 'bg-emerald-600 text-white font-bold' },
        { id: 'performance', label: 'Performance Center', icon: <Gauge size={16} />, badge: '120FPS', badgeColor: 'bg-purple-600 text-white font-bold' },
      ]
    },
    {
      title: 'SETTINGS & SYSTEM',
      items: [
        { id: 'payment_settings', label: 'Payment QR Setup', icon: <QrCode size={16} /> },
        { id: 'app_settings', label: 'Store Settings', icon: <Settings size={16} /> },
        { id: 'db_inspector', label: 'Database Inspector', icon: <Database size={16} /> },
        { id: 'backup_jobs', label: 'Backup Jobs', icon: <DatabaseBackup size={16} /> },
        { id: 'system_events', label: 'System Events', icon: <Terminal size={16} /> },
        { id: 'global_search', label: 'Global Search', icon: <Search size={16} /> },
        { id: 'cache', label: 'Cache Engine (LFU)', icon: <Zap size={16} />, badge: 'Fast', badgeColor: 'bg-emerald-600 text-white font-bold' },
        { id: 'system_fetcher', label: 'System Fetcher', icon: <Cpu size={16} />, badge: 'Live', badgeColor: 'bg-purple-600 text-white font-black animate-pulse' },
        { id: 'security', label: 'Security Center', icon: <ShieldAlert size={16} /> },
        { id: 'rate_limiting', label: 'Rate Limiting & Abuse', icon: <ShieldAlert size={16} />, badge: 'Shield', badgeColor: 'bg-rose-600 text-white font-bold' },
      ]
    }
  ];

  const drawerCategories = rawDrawerCategories.map(cat => {
    let filteredItems = cat.items;
    
    if (isStoreOwner) {
      // Store owner sees everything
      return { ...cat, items: filteredItems };
    }

    if (isSuperAdmin) {
      if (cat.title === 'SETTINGS & SYSTEM') {
        filteredItems = filteredItems.filter(i => i.id !== 'db_inspector');
      }
      return { ...cat, items: filteredItems };
    }

    if (isManager) {
      if (cat.title === 'SETTINGS & SYSTEM') {
        filteredItems = filteredItems.filter(i => ['control_center', 'infrastructure', 'cache', 'system_fetcher', 'system_health', 'rate_limiting', 'global_search'].includes(i.id));
      }
      if (cat.title === 'MARKETING & CONTENT') {
        filteredItems = filteredItems.filter(i => ['news', 'notifications', 'banners', 'legal'].includes(i.id));
      }
      if (cat.title === 'STORAGE & MEDIA') {
        filteredItems = [];
      }
      if (cat.title === 'ANALYTICS & AUDIT') {
        filteredItems = filteredItems.filter(i => ['reports', 'activity_logs'].includes(i.id));
      }
      if (cat.title === 'CATALOG & PACKAGES') {
        filteredItems = filteredItems.filter(i => ['products', 'packages', 'categories'].includes(i.id));
      }
      if (cat.title === 'SALES & FULFILLMENT') {
        filteredItems = filteredItems.filter(i => ['orders', 'payments', 'cancellations', 'coupons'].includes(i.id));
      }
      if (cat.title === 'CUSTOMERS & SUPPORT') {
        filteredItems = filteredItems.filter(i => ['inquiries', 'reviews', 'users', 'kyc'].includes(i.id));
      }
      return { ...cat, items: filteredItems };
    }

    if (isStaff) {
      if (cat.title === 'OVERVIEW') {
         filteredItems = filteredItems.filter(i => i.id === 'overview');
      } else if (cat.title === 'CATALOG & PACKAGES') {
        filteredItems = filteredItems.filter(i => ['products'].includes(i.id));
      } else if (cat.title === 'SALES & FULFILLMENT') {
        filteredItems = filteredItems.filter(i => ['orders', 'payments', 'cancellations'].includes(i.id));
      } else if (cat.title === 'CUSTOMERS & SUPPORT') {
        filteredItems = filteredItems.filter(i => ['inquiries', 'kyc', 'users'].includes(i.id));
      } else if (cat.title === 'SETTINGS & SYSTEM') {
        filteredItems = [];
      } else {
        filteredItems = [];
      }
      return { ...cat, items: filteredItems };
    }

    return { ...cat, items: [] };
  }).filter(cat => cat.items.length > 0);

  // Flat list of all accessible items
  const allAccessibleItems = useMemo(() => {
    return drawerCategories.flatMap(c => c.items);
  }, [drawerCategories]);

  // Pinned items
  const pinnedMenuItems = useMemo(() => {
    return allAccessibleItems.filter(item => pinnedTabs.includes(item.id));
  }, [allAccessibleItems, pinnedTabs]);

  // Filtered categories based on search query
  const filteredDrawerCategories = useMemo(() => {
    const q = menuSearchQuery.trim().toLowerCase();
    if (!q) return drawerCategories;

    return drawerCategories.map(cat => {
      const items = cat.items.filter(item =>
        item.label.toLowerCase().includes(q) ||
        item.id.toLowerCase().includes(q) ||
        cat.title.toLowerCase().includes(q)
      );
      return { ...cat, items };
    }).filter(cat => cat.items.length > 0);
  }, [drawerCategories, menuSearchQuery]);

  const displayedFullscreenCategories = useMemo(() => {
    if (!selectedCategoryFilter) return filteredDrawerCategories;
    return filteredDrawerCategories.filter(cat => cat.title.toUpperCase() === selectedCategoryFilter.toUpperCase());
  }, [filteredDrawerCategories, selectedCategoryFilter]);

  // Helper to determine active link in sidebar
  const isLinkActive = (id: AdminTab) => {
    if (adminTab === id) return true;
    if (id === 'kyc' && adminTab === 'kyc') return true;
    if (id === 'orders' && adminTab === 'order_detail') return true;
    if (id === 'products' && (adminTab === 'product_new' || adminTab === 'product_edit')) return true;
    if (id === 'invitations' && adminTab === 'invitations') return true;
    if ((id === 'users' || id === 'customers') && (adminTab === 'users' || adminTab === 'customers' || adminTab === 'user_detail')) return true;
    if (id === 'news' && (adminTab === 'news_new' || adminTab === 'news_edit')) return true;
    if (id === 'banners' && adminTab === 'special_offers') return true;
    return false;
  };

  // Contextual Active Breadcrumb
  const currentActiveContext = useMemo(() => {
    for (const cat of drawerCategories) {
      for (const item of cat.items) {
        if (isLinkActive(item.id)) {
          return {
            categoryTitle: cat.title,
            itemLabel: item.label,
            itemId: item.id
          };
        }
      }
    }
    return {
      categoryTitle: 'CONSOLE',
      itemLabel: 'Management View',
      itemId: adminTab
    };
  }, [drawerCategories, adminTab]);

  const activeNavigationItem = drawerCategories
    .flatMap((category) => category.items)
    .find((item) => isLinkActive(item.id));

  const renderTabContent = () => {
    switch (adminTab) {
      case 'overview':
        return <AdminOverviewTab />;
      case 'orders':
        return <AdminOrdersTab />;
      case 'order_detail':
        return <AdminOrderDetailTab />;
      case 'products':
        return <AdminProductsTab />;
      case 'product_new':
      case 'product_edit':
        return <AdminProductEditorTab />;
      case 'banners':
      case 'special_offers':
        return <AdminBannersTab initialSubTab={adminTab === 'special_offers' ? 'offer' : 'hero'} />;
      case 'inquiries':
        return <AdminSupportTab />;
      case 'cancellations':
        return <AdminCancellationsTab />;
      case 'refunds':
        return <AdminRefundsTab />;
      case 'refund_process':
        return <AdminRefundProcessTab />;
      case 'payments':
        return <AdminPaymentsTab />;
      case 'kyc':
        return <AdminKycTab />;
      case 'users':
      case 'customers':
      case 'invitations':
        return <AdminUsersTab initialRoleFilter={'all'} initialView={adminTab === 'invitations' ? 'invitations' : 'users'} />;
      case 'user_detail':
        return <AdminUserDetailTab />;
      case 'password_resets':
        return <AdminPasswordResetsTab />;
      case 'reviews':
        return <AdminReviewsTab />;
      case 'news':
        return <AdminNewsTab />;
      case 'news_new':
      case 'news_edit':
        return <AdminNewsEditorTab />;
      case 'notifications':
        return <AdminNotificationsTab />;
      case 'payment_settings':
        return <AdminPaymentSettingsTab />;
      case 'app_settings':
        return <AdminAppSettingsTab />;
      case 'reports':
        return <AdminReportsTab />;
      case 'activity_logs':
        return <AdminActivityLogsTab />;
      case 'coupons':
        return <AdminCoupons />;
      case 'wallets':
        return <AdminWalletsTab />;
      case 'packages':
        return <AdminPackagesTab />;
      case 'games':
        return <AdminGamesTab />;
      case 'categories':
        return <AdminCategoriesTab />;
      case 'media_vault':
        return <AdminMediaVaultTab />;
      case 'maintenance':
        return <AdminMaintenanceTab />;
      case 'db_inspector':
        return <AdminDbInspectorTab />;
      case 'backup_jobs':
        return <AdminBackupJobsTab />;
      case 'system_events':
        return <AdminSystemEventsTab />;
      case 'global_search':
        return <AdminGlobalSearchTab />;
      case 'control_center':
        return <AdminControlCenterTab />;
      case 'ai_studio':
        return <AdminAiStudioTab />;
      case 'infrastructure':
        return <AdminInfrastructureTab />;
      case 'cache':
        return <AdminCacheTab />;
      case 'system_health':
        return <AdminSystemHealthTab />;
      case 'system_fetcher':
        return <AdminSystemFetcherTab />;
      case 'security':
        return <AdminSecurityTab />;
      case 'rate_limiting':
        return <AdminRateLimitingTab />;
      case 'performance':
        return <AdminPerformanceTab />;
      case 'roles_permissions':
        return <AdminRolesPermissionsTab />;
      case 'team_applications':
        return <AdminTeamApplicationsTab />;
      case 'legal':
        return <AdminLegalTab />;
      default:
        return <AdminOverviewTab />;
    }
  };

  return (
    <div className="w-full max-w-full min-w-0 h-[100dvh] min-h-0 bg-slate-50 text-slate-900 flex flex-col overflow-hidden relative">
      {/* 1. Admin Top Navigation Header (Clean, Modern, Responsive Pro proportions) */}
      <header className="w-full max-w-full h-[68px] sm:h-[76px] lg:h-[84px] bg-white/95 backdrop-blur-md border-b border-slate-200/90 px-3 sm:px-6 lg:px-8 flex items-center justify-between sticky top-0 z-40 shadow-xs shrink-0">
        <div className="flex items-center gap-2.5 sm:gap-4 min-w-0">
          {/* Brand Logo & Contextual Breadcrumb Header */}
          <div
            onClick={() => navigateTab('overview')}
            className="flex items-center gap-2 sm:gap-3 cursor-pointer select-none min-w-0 group"
            title="Admin Overview Dashboard"
          >
            <div className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center overflow-hidden rounded-2xl shrink-0 shadow-2xs border border-slate-200/80 group-hover:scale-105 transition-all">
              <AppLogo
                size="custom"
                className="w-full h-full rounded-2xl overflow-hidden"
                glow={false}
                imageClassName="w-full h-full object-cover rounded-2xl"
              />
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5 leading-none">
                <span className="font-black text-sm sm:text-base lg:text-lg text-slate-900 tracking-tight">UNX ADMIN</span>
              </div>
              {/* Contextual Active Breadcrumb Trail */}
              <div className="hidden sm:flex items-center gap-1.5 mt-1 text-xs font-semibold text-slate-500 truncate">
                <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">PANEL</span>
                <span className="text-slate-300">/</span>
                <span className="text-slate-500 truncate max-w-[120px] lg:max-w-[160px] font-extrabold uppercase text-[10px]">{currentActiveContext.categoryTitle}</span>
                <span className="text-slate-300">/</span>
                <span className="text-red-600 font-extrabold truncate max-w-[150px] lg:max-w-[200px] text-xs">{currentActiveContext.itemLabel}</span>
              </div>
            </div>
          </div>

          {/* Quick Menu Search Launcher (Desktop) */}
          <button
            type="button"
            onClick={() => navigateTab('global_search')}
            className="hidden md:flex items-center gap-2.5 h-10 lg:h-11 px-3.5 rounded-2xl bg-slate-100/90 hover:bg-slate-200/80 border border-slate-200/80 text-slate-600 hover:text-slate-900 text-xs sm:text-sm font-bold transition-all ml-2 lg:ml-4 cursor-pointer"
            title="Search entire system (Ctrl+K)"
          >
            <Search size={15} className="text-slate-400" />
            <span className="font-semibold text-slate-600">Search console...</span>
            <kbd className="px-2 py-0.5 rounded-lg bg-white border border-slate-200 text-[10px] font-mono text-slate-500 shadow-2xs font-extrabold ml-1">
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Right Actions Header Navigation Bar */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">

          {/* Quick Store Online / Offline Toggle Button */}
          {currentUser && (
            <button
              type="button"
              disabled={isTogglingStore || currentUser?.role === 'SUPPORT_STAFF'}
              onClick={handleQuickToggleStore}
              className={`h-10 sm:h-11 px-3 sm:px-4 rounded-2xl flex items-center gap-2 font-black text-xs sm:text-sm transition-all shadow-xs border ${
                currentUser?.role === 'SUPPORT_STAFF'
                  ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                  : isStoreOnline
                  ? 'bg-emerald-50 hover:bg-emerald-100 border-emerald-300 text-emerald-800 cursor-pointer'
                  : 'bg-rose-50 hover:bg-rose-100 border-rose-300 text-rose-800 cursor-pointer'
              } disabled:opacity-60`}
              title={
                currentUser?.role === 'SUPPORT_STAFF'
                  ? 'Locked: Only Store Owner, Manager, or Super Admin can toggle store status'
                  : isStoreOnline
                  ? 'Click to turn Store OFFLINE (pause ordering)'
                  : 'Click to turn Store ONLINE (accept orders)'
              }
            >
              <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${currentUser?.role === 'SUPPORT_STAFF' ? 'bg-slate-400' : isStoreOnline ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500 animate-pulse'}`} />
              <span className="hidden sm:inline text-slate-600 font-bold text-xs">STORE:</span>
              <span className="font-black uppercase tracking-wide text-xs sm:text-sm">{isStoreOnline ? 'ONLINE' : 'OFFLINE'}</span>
              <Power size={15} className={currentUser?.role === 'SUPPORT_STAFF' ? 'text-slate-400' : isStoreOnline ? 'text-emerald-600' : 'text-rose-600'} />
            </button>
          )}

          {/* Admin Notifications Trigger */}
          <button
            type="button"
            onClick={() => navigateTab('notifications')}
            className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer shadow-2xs shrink-0 border border-slate-200/80 flex items-center justify-center relative active:scale-95"
            title="Admin Notifications Center"
            aria-label="Admin Notifications"
          >
            <Bell size={20} className="text-slate-800 stroke-[2.2] shrink-0" />
            {adminUnreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[20px] h-[20px] px-1 bg-rose-600 text-white font-black text-[11px] rounded-full flex items-center justify-center border-2 border-white shadow-xs animate-pulse">
                {adminUnreadCount}
              </span>
            )}
          </button>

          {/* Admin Avatar & Profile Trigger */}
          <button
            type="button"
            onClick={() => setShowAdminProfileModal(true)}
            className="flex items-center gap-2.5 pl-1.5 sm:pl-3 border-l border-slate-200 hover:opacity-90 transition-opacity cursor-pointer text-left shrink-0 h-10 sm:h-11"
            title="Open Admin Profile & Options"
          >
            <img
              src={
                currentUser.photoURL ||
                `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(currentUser.name || currentUser.uid)}`
              }
              alt={currentUser.name}
              className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl object-cover border-2 border-red-500/50 bg-slate-100 shadow-xs shrink-0"
            />
            <div className="hidden lg:block text-left">
              <div className="text-xs text-red-600 font-extrabold uppercase tracking-wider">{isStoreOwner ? 'Store Owner' : (isSuperAdmin ? 'Super Admin' : (isManager ? 'Store Manager' : 'Support Staff'))}</div>
            </div>
          </button>
        </div>
      </header>

      {/* Admin Profile Modal */}
      <AnimatePresence>
        {showAdminProfileModal && (
          <ModalPortal isOpen={showAdminProfileModal} onClose={() => setShowAdminProfileModal(false)} zIndex={99999}>
            <div 
              className="fixed inset-0 z-[99999] bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
              onClick={() => setShowAdminProfileModal(false)}
            >
              <motion.div
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 40 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="bg-white border-t sm:border border-slate-200 rounded-t-3xl sm:rounded-3xl w-full sm:max-w-md p-5 sm:p-6 pb-8 sm:pb-6 space-y-4 shadow-2xl relative text-slate-900"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Mobile drag handle bar */}
                <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto -mt-1 mb-2 sm:hidden" />

                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="text-red-600" size={19} />
                    <h3 className="text-base font-bold text-slate-900">{isStoreOwner ? 'Store Owner Profile' : (isSuperAdmin ? 'Super Admin Profile' : (isManager ? 'Store Manager Profile' : 'Support Staff Profile'))}</h3>
                  </div>
                  <button
                    onClick={() => setShowAdminProfileModal(false)}
                    className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
                  >
                    <X size={17} />
                  </button>
                </div>

                <div className="flex items-center gap-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl p-4">
                  <img
                    src={
                      currentUser.photoURL ||
                      `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(currentUser.name || currentUser.uid)}`
                    }
                    alt={currentUser.name}
                    className="w-14 h-14 rounded-2xl object-cover border-2 border-red-500 bg-slate-100 shadow-xs shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm sm:text-base font-bold text-slate-900 truncate">{currentUser.name}</div>
                    <div className="text-xs text-slate-500 font-mono truncate">{currentUser.email}</div>
                    <div className="inline-flex items-center gap-1 mt-1 px-2.5 py-0.5 rounded-md bg-red-50 border border-red-200 text-red-700 text-[10px] sm:text-xs font-bold uppercase tracking-wider">
                      <ShieldCheck size={12} />
                      {isStoreOwner ? 'Store Owner' : (isSuperAdmin ? 'Super Admin' : (isManager ? 'Store Manager' : 'Support Staff'))}
                    </div>
                  </div>
                </div>

                <div className="space-y-2 text-xs sm:text-sm">
                  <div className="flex justify-between py-2 border-b border-slate-100 text-slate-600">
                    <span>Authorized Email:</span>
                    <span className="text-slate-900 font-mono font-medium truncate max-w-[220px]">{currentUser.email}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-100 text-slate-600">
                    <span>Role:</span>
                    <span className="text-red-600 font-bold">
                      {isStoreOwner ? 'Store Owner' : (isSuperAdmin ? 'Super Admin' : (isManager ? 'Store Manager' : 'Support Staff'))}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-100 text-slate-600">
                    <span>Console Status:</span>
                    <span className="text-emerald-600 font-bold">Active &amp; Verified</span>
                  </div>
                </div>

                <div className="space-y-2.5 pt-2">
                  <button
                    onClick={() => {
                      setShowAdminProfileModal(false);
                      handleReturnToStore();
                    }}
                    className="w-full py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer active:scale-98"
                  >
                    <ExternalLink size={15} />
                    <span>Switch to User Storefront</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowAdminProfileModal(false);
                      handleLogout();
                    }}
                    className="w-full py-3 rounded-2xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer active:scale-98"
                  >
                    <LogOut size={15} />
                    <span>Log Out of Admin Console</span>
                  </button>
                </div>
              </motion.div>
            </div>
          </ModalPortal>
        )}
      </AnimatePresence>

      {/* 2. Main Layout Area: Sidebar (Desktop) + Full-Screen Content */}
      <div className="flex-1 flex w-full overflow-hidden relative min-h-0">
        {/* Persistent Desktop Sidebar with Collapsible Mini Rail Mode */}
        <aside
          className={`hidden lg:flex flex-col bg-white border-r border-slate-200/90 shrink-0 shadow-xs h-full overflow-y-auto transition-all duration-300 relative select-none ${
            isSidebarCollapsed ? 'w-[84px] p-3 items-center' : 'w-80 p-4 sm:p-5'
          }`}
        >
          {/* Sidebar Top Search & Collapse Header */}
          {!isSidebarCollapsed ? (
            <div className="space-y-3.5 pb-3.5 border-b border-slate-100 shrink-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-black text-slate-400 uppercase tracking-wider">
                  Menu Navigation ({allAccessibleItems.length})
                </span>
                <button
                  type="button"
                  onClick={toggleSidebarCollapse}
                  className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                  title="Collapse sidebar to icon rail"
                >
                  <PanelLeftClose size={18} />
                </button>
              </div>

              {/* Real-time Menu Search Box */}
              <div className="relative flex items-center">
                <Search size={16} className="absolute left-3.5 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={menuSearchQuery}
                  onChange={(e) => setMenuSearchQuery(e.target.value)}
                  placeholder="Search admin tools..."
                  className="w-full pl-9 pr-8 py-2.5 bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-200 focus:border-red-500 rounded-2xl text-xs sm:text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 transition-all"
                />
                {menuSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setMenuSearchQuery('')}
                    className="absolute right-2.5 p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="pb-3 border-b border-slate-100 shrink-0 flex flex-col items-center gap-2">
              <button
                type="button"
                onClick={toggleSidebarCollapse}
                className="p-2.5 rounded-2xl bg-red-50 hover:bg-red-100 border border-red-200/80 text-red-600 transition-all cursor-pointer shadow-2xs"
                title="Expand sidebar"
              >
                <PanelLeftOpen size={20} />
              </button>
            </div>
          )}

          <div className="space-y-4 flex-1 py-3 w-full scrollbar-thin">
            {/* Pinned / Favorites Bar (When Expanded & non-empty query) */}
            {!isSidebarCollapsed && pinnedMenuItems.length > 0 && !menuSearchQuery && (
              <div className="space-y-1.5 pb-2.5 border-b border-slate-100">
                <div className="px-2 py-1 text-[11px] font-black tracking-wider text-amber-600 uppercase flex items-center gap-1.5">
                  <Star size={13} className="fill-amber-400 text-amber-500" />
                  <span>Pinned Tools</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {pinnedMenuItems.map((item) => {
                    const active = isLinkActive(item.id);
                    return (
                      <button
                        key={`pinned-${item.id}`}
                        onClick={() => navigateTab(item.id)}
                        className={`px-3 py-2 rounded-2xl text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer ${
                          active
                            ? 'bg-amber-500 text-white shadow-xs'
                            : 'bg-amber-50/70 hover:bg-amber-100/80 text-amber-900 border border-amber-200/60'
                        }`}
                        title={item.label}
                      >
                        {React.cloneElement(item.icon as React.ReactElement<any>, { size: 15 })}
                        <span className="truncate max-w-[110px]">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Category Groups (Expanded vs Collapsed Rail View) */}
            {filteredDrawerCategories.map((cat, catIdx) => {
              const isCollapsedCat = Boolean(collapsedCategories[cat.title]) && !menuSearchQuery;
              const hasActiveChild = cat.items.some(item => isLinkActive(item.id));

              if (isSidebarCollapsed) {
                return (
                  <div key={`desktop-rail-cat-${cat.title}-${catIdx}`} className="space-y-2.5 py-1.5 border-b border-slate-100/80 last:border-0 w-full flex flex-col items-center">
                    {cat.items.map((link) => {
                      const active = isLinkActive(link.id);
                      return (
                        <button
                          key={`rail-link-${link.id}`}
                          onClick={() => navigateTab(link.id)}
                          className={`relative p-3.5 rounded-2xl flex items-center justify-center transition-all cursor-pointer group ${
                            active
                              ? 'bg-red-600 text-white shadow-md shadow-red-600/20 scale-105'
                              : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                          }`}
                          title={`${cat.title} • ${link.label}`}
                        >
                          {React.cloneElement(link.icon as React.ReactElement<any>, { size: 22 })}
                          {link.badge !== undefined && (
                            <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-rose-500 border-2 border-white" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                );
              }

              return (
                <div key={`desktop-cat-${cat.title}-${catIdx}`} className="space-y-1.5">
                  {/* Category Header Accordion Button */}
                  <button
                    type="button"
                    onClick={() => toggleCategoryCollapse(cat.title)}
                    className={`w-full px-2.5 py-1.5 text-[11px] font-black tracking-wider uppercase flex items-center justify-between transition-colors cursor-pointer rounded-xl hover:bg-slate-50 ${
                      hasActiveChild ? 'text-red-600' : 'text-slate-400'
                    }`}
                  >
                    <span className="truncate">{cat.title} ({cat.items.length})</span>
                    <span className="text-slate-400">
                      {isCollapsedCat ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                    </span>
                  </button>

                  {/* Category Items */}
                  {!isCollapsedCat && (
                    <div className="space-y-1.5 pl-1">
                      {cat.items.map((link, linkIdx) => {
                        const active = isLinkActive(link.id);
                        const isPinned = pinnedTabs.includes(link.id);

                        return (
                          <div
                            key={`desktop-link-${link.id}-${linkIdx}`}
                            onClick={() => navigateTab(link.id)}
                            className={`group/item relative flex items-center justify-between w-full px-4 py-3 rounded-2xl text-sm font-bold transition-all cursor-pointer ${
                              active
                                ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white font-extrabold shadow-sm shadow-red-600/20'
                                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0 pr-2">
                              <span className={active ? 'text-white' : 'text-slate-400 shrink-0 group-hover/item:text-slate-600'}>
                                {React.cloneElement(link.icon as React.ReactElement<any>, { size: 19 })}
                              </span>
                              <span className="truncate text-sm sm:text-[14.5px]">{link.label}</span>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              {link.badge !== undefined && (
                                <span
                                  className={`px-2 py-0.5 rounded-lg text-[10.5px] font-mono font-black ${
                                    active
                                      ? 'bg-white/20 text-white'
                                      : link.badgeColor || 'bg-slate-100 text-slate-600'
                                  }`}
                                >
                                  {link.badge}
                                </span>
                              )}

                              <button
                                type="button"
                                onClick={(e) => togglePinTab(link.id, e)}
                                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                                  isPinned
                                    ? 'text-amber-400 opacity-100'
                                    : 'text-slate-300 opacity-0 group-hover/item:opacity-100 hover:text-amber-500'
                                }`}
                                title={isPinned ? 'Unpin tab' : 'Pin tab'}
                              >
                                <Star size={14} className={isPinned ? 'fill-amber-400' : ''} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Sidebar Footer Logout Button */}
          <div className="pt-3.5 border-t border-slate-100 space-y-2 shrink-0 w-full">
            {!isSidebarCollapsed ? (
              <button
                onClick={handleLogout}
                className="w-full py-3 px-4 rounded-2xl bg-rose-50 hover:bg-rose-100 border border-rose-200/80 text-rose-700 font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer transition-all shadow-2xs active:scale-95"
              >
                <LogOut size={16} className="shrink-0 text-rose-600" />
                <span>Sign Out Console</span>
              </button>
            ) : (
              <button
                onClick={handleLogout}
                className="p-3.5 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-600 transition-colors cursor-pointer flex items-center justify-center"
                title="Sign Out Console"
              >
                <LogOut size={20} />
              </button>
            )}
          </div>
        </aside>

        {/* Native Mobile App Style Full-Screen Admin Navigation Overlay */}
        <AnimatePresence>
          {mobileDrawerOpen && (
            <ModalPortal isOpen={mobileDrawerOpen} onClose={() => setMobileDrawerOpen(false)} zIndex={999999}>
              <motion.div 
                initial={{ opacity: 0, y: '100%' }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: '100%' }}
                transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                className="fixed inset-0 z-[999999] bg-[#F4F4F8] text-slate-900 flex flex-col overflow-hidden select-none transform-gpu"
              >
                {/* Native Mobile Sheet Top Grab Bar */}
                <div className="w-full pt-2 pb-1 bg-white/95 backdrop-blur-md shrink-0 flex items-center justify-center">
                  <div className="w-12 h-1.5 rounded-full bg-slate-300 mx-auto" />
                </div>

                {/* Native App Bar Header */}
                <header className="px-4 sm:px-6 py-3 bg-white/95 backdrop-blur-md border-b border-slate-200/90 flex items-center justify-between shrink-0 z-10 shadow-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl overflow-hidden shadow-xs flex items-center justify-center shrink-0 border border-slate-100 bg-white">
                      <AppLogo
                        size="custom"
                        className="w-full h-full rounded-2xl overflow-hidden"
                        glow={false}
                        imageClassName="w-full h-full object-cover rounded-2xl"
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                          Console Navigation
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-black bg-red-100 text-red-800 border border-red-300 uppercase">
                          ADMIN
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 font-bold">
                        Unx Games • Nepal Gaming System
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setMobileDrawerOpen(false);
                        handleReturnToStore();
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 font-extrabold text-xs transition-colors cursor-pointer"
                    >
                      <ExternalLink size={14} />
                      <span className="hidden sm:inline">Store</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setMobileDrawerOpen(false)}
                      className="px-4 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 active:scale-95 text-white font-black text-xs uppercase tracking-wider flex items-center gap-1 transition-all shadow-sm shadow-red-600/30 cursor-pointer"
                    >
                      <span>Done</span>
                    </button>
                  </div>
                </header>

                {/* Main Native Scrollable View */}
                <div className="flex-1 overflow-y-auto px-3 sm:px-6 py-4 space-y-4 scrollbar-none z-10 max-w-5xl mx-auto w-full">
                  
                  {/* AI Autonomous Brain & Code Studio Hero Card (Mobile-Native) */}
                  <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-violet-950 rounded-3xl p-4 sm:p-5 text-white border border-violet-800/60 shadow-xl relative overflow-hidden">
                    <div className="absolute right-0 top-0 translate-x-6 -translate-y-6 w-36 h-36 bg-violet-500/20 rounded-full blur-2xl pointer-events-none" />
                    
                    <div className="flex items-center justify-between gap-3 relative z-10">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-violet-500 to-fuchsia-500 text-white flex items-center justify-center font-black shadow-lg shadow-violet-900/40 shrink-0">
                          <Bot size={24} className="animate-pulse" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm sm:text-base font-black tracking-tight text-white">AI Autonomous Studio</span>
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                              24/7 Live
                            </span>
                          </div>
                          <p className="text-[11px] text-violet-200 font-mono">
                            nvidia/nemotron-3-ultra-550b-a55b:free
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setMobileDrawerOpen(false);
                          navigateTab('ai_studio');
                        }}
                        className="px-3.5 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-black shadow-md shadow-violet-900/30 flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all"
                      >
                        <Sparkles size={14} className="text-amber-300" />
                        <span>Open AI</span>
                      </button>
                    </div>

                    {/* Quick 1-Tap Mobile AI Action Chips */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3.5 pt-3 border-t border-violet-800/40 font-mono text-[11px]">
                      <button
                        type="button"
                        onClick={() => {
                          setMobileDrawerOpen(false);
                          navigateTab('ai_studio');
                        }}
                        className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-left flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Code2 size={13} className="text-violet-300 shrink-0" />
                        <span className="truncate font-bold">Code Architect</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setMobileDrawerOpen(false);
                          navigateTab('system_health');
                        }}
                        className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-left flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Activity size={13} className="text-emerald-300 shrink-0" />
                        <span className="truncate font-bold">System Health</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setMobileDrawerOpen(false);
                          navigateTab('db_inspector');
                        }}
                        className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-left flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Database size={13} className="text-cyan-300 shrink-0" />
                        <span className="truncate font-bold">DB Inspector</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setMobileDrawerOpen(false);
                          navigateTab('control_center');
                        }}
                        className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-left flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Zap size={13} className="text-amber-300 shrink-0" />
                        <span className="truncate font-bold">AI Control</span>
                      </button>
                    </div>
                  </div>

                  {/* Native Search Input */}
                  <div className="space-y-2.5">
                    <div className="relative flex items-center">
                      <Search size={18} className="absolute left-3.5 text-slate-400 pointer-events-none" />
                      <input
                        type="text"
                        value={menuSearchQuery}
                        onChange={(e) => setMenuSearchQuery(e.target.value)}
                        placeholder="Search tools, orders, products, settings..."
                        className="w-full pl-10 pr-10 py-3 bg-white border border-slate-200/90 focus:border-red-500 rounded-2xl text-xs sm:text-sm font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none shadow-xs transition-all"
                      />
                      {menuSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setMenuSearchQuery('')}
                          className="absolute right-2.5 p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer bg-slate-100"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>

                    {/* Native Horizontal Category Segment Pills */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                      {['ALL', 'OVERVIEW', 'CATALOG & PACKAGES', 'SALES & FULFILLMENT', 'CUSTOMERS & SUPPORT', 'MARKETING & CONTENT', 'AI & SYSTEM INTELLIGENCE', 'SETTINGS & SYSTEM'].map((categoryName) => {
                        const isAll = categoryName === 'ALL';
                        const isSelected = isAll ? !selectedCategoryFilter : selectedCategoryFilter === categoryName;
                        return (
                          <button
                            key={`native-cat-pill-${categoryName}`}
                            type="button"
                            onClick={() => setSelectedCategoryFilter(isAll ? null : categoryName)}
                            className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider whitespace-nowrap transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-red-600 text-white shadow-sm shadow-red-600/20'
                                : 'bg-white hover:bg-slate-200/80 text-slate-600 border border-slate-200/90 shadow-2xs'
                            }`}
                          >
                            {categoryName}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Pinned Favorites Native App Section */}
                  {pinnedMenuItems.length > 0 && !menuSearchQuery && !selectedCategoryFilter && (
                    <div className="space-y-2">
                      <div className="px-1 text-[11px] font-black tracking-wider text-amber-600 uppercase flex items-center gap-1.5">
                        <Star size={13} className="fill-amber-400 text-amber-500" />
                        <span>Quick Access Pinned ({pinnedMenuItems.length})</span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                        {pinnedMenuItems.map((item) => {
                          const active = isLinkActive(item.id);
                          return (
                            <button
                              key={`native-pinned-${item.id}`}
                              onClick={() => {
                                navigateTab(item.id);
                              }}
                              className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between group active:scale-95 ${
                                active
                                  ? 'bg-amber-500 text-white border-amber-500 shadow-md shadow-amber-500/20 font-extrabold'
                                  : 'bg-white hover:bg-amber-50/50 border-amber-200/80 text-amber-950 shadow-2xs'
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <div className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${active ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-700'}`}>
                                  {React.cloneElement(item.icon as React.ReactElement<any>, { size: 14 })}
                                </div>
                                <span className="text-xs font-bold truncate">{item.label}</span>
                              </div>
                              <Star size={12} className="fill-amber-400 text-amber-500 shrink-0" />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Native Mobile App Grouped Inset Sections */}
                  <div className="space-y-4">
                    {displayedFullscreenCategories.map((cat, catIdx) => (
                      <div key={`native-group-${cat.title}-${catIdx}`} className="space-y-1.5">
                        <div className="px-1 flex items-center justify-between">
                          <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                            {cat.title}
                          </span>
                          <span className="text-[10px] font-mono font-bold text-slate-400">
                            {cat.items.length} items
                          </span>
                        </div>

                        {/* Native Grouped Inset Card (iOS/Android Style) */}
                        <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-2xs overflow-hidden divide-y divide-slate-100">
                          {cat.items.map((link, linkIdx) => {
                            const active = isLinkActive(link.id);
                            const isPinned = pinnedTabs.includes(link.id);

                            return (
                              <div
                                key={`native-item-${link.id}-${linkIdx}`}
                                className={`px-4 py-3.5 flex items-center justify-between gap-3.5 transition-all cursor-pointer active:bg-slate-100/70 active:scale-[0.99] ${
                                  active ? 'bg-red-50/90' : ''
                                }`}
                                onClick={() => {
                                  navigateTab(link.id);
                                }}
                              >
                                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                                  <div
                                    className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 transition-all ${
                                      active
                                        ? 'bg-red-600 text-white shadow-md shadow-red-600/30'
                                        : 'bg-slate-100 text-slate-700 border border-slate-200/60'
                                    }`}
                                  >
                                    {React.cloneElement(link.icon as React.ReactElement<any>, { size: 20 })}
                                  </div>

                                  <div className="min-w-0 flex-1">
                                    <div className={`text-sm sm:text-base font-extrabold truncate ${active ? 'text-red-700 font-black' : 'text-slate-900'}`}>
                                      {link.label}
                                    </div>
                                    <div className="text-xs text-slate-400 font-mono truncate">
                                      /{link.id}
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                  {link.badge !== undefined && (
                                    <span
                                      className={`px-2.5 py-0.5 rounded-lg text-[11px] font-mono font-black ${
                                        active
                                          ? 'bg-red-600 text-white'
                                          : link.badgeColor || 'bg-slate-100 text-slate-700'
                                      }`}
                                    >
                                      {link.badge}
                                    </span>
                                  )}

                                  <button
                                    type="button"
                                    onClick={(e) => togglePinTab(link.id, e)}
                                    className={`p-2 rounded-xl transition-all cursor-pointer ${
                                      isPinned
                                        ? 'text-amber-500 opacity-100 bg-amber-50'
                                        : 'text-slate-300 opacity-80 hover:text-amber-500'
                                    }`}
                                    title={isPinned ? 'Unpin tool' : 'Pin to top'}
                                  >
                                    <Star size={16} className={isPinned ? 'fill-amber-400' : ''} />
                                  </button>

                                  <ChevronRight size={18} className={active ? 'text-red-600' : 'text-slate-300'} />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Native Bottom Dock Bar */}
                <footer className="px-5 sm:px-7 py-4.5 bg-white border-t border-slate-200/90 flex items-center justify-between gap-3 shrink-0 z-10 shadow-lg">
                  <div className="flex items-center gap-3">
                    <img
                      src={
                        currentUser.photoURL ||
                        `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(currentUser.name || currentUser.uid)}`
                      }
                      alt={currentUser.name}
                      className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl object-cover border-2 border-red-500 bg-slate-100 shrink-0 shadow-xs"
                    />
                    <div className="min-w-0">
                      <div className="text-sm sm:text-base font-black text-slate-900 truncate max-w-[140px] sm:max-w-none">{currentUser.name}</div>
                      <div className="text-xs text-red-600 font-extrabold uppercase tracking-wider">
                        {isStoreOwner ? 'Store Owner' : (isSuperAdmin ? 'Super Admin' : (isManager ? 'Manager' : 'Staff'))}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => {
                        api.gateway.cache.flush().catch(() => {});
                        showToast('success', 'Cache Cleared', 'System cache refreshed.');
                      }}
                      className="px-3.5 py-2.5 rounded-2xl bg-amber-50 hover:bg-amber-100 active:scale-95 text-amber-800 border border-amber-200 font-extrabold text-xs sm:text-sm flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      <Zap size={16} className="text-amber-600" />
                      <span className="hidden sm:inline">Cache</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setMobileDrawerOpen(false);
                        handleLogout();
                      }}
                      className="px-4 py-2.5 sm:px-5 sm:py-3 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs sm:text-sm flex items-center gap-2 transition-all shadow-md shadow-rose-600/20 cursor-pointer active:scale-95"
                    >
                      <LogOut size={16} />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </footer>
              </motion.div>
            </ModalPortal>
          )}
        </AnimatePresence>

        {/* Dynamic Edge-to-Edge Admin Content View Area */}
        <main id="admin-main-content" className="flex-1 w-full max-w-full min-w-0 overflow-y-auto overflow-x-hidden px-2 sm:px-6 lg:px-8 pt-2 sm:pt-3 pb-[84px] sm:pb-[92px] lg:pb-3 bg-slate-50 scrollbar-thin">
          <Suspense fallback={
            <AppLoadingScreen fullScreen title="Loading Admin Module" message="Fetching management data..." />
          }>
            <div
              key={adminTab}
              className="w-full max-w-full min-w-0 overflow-x-hidden"
            >
              {renderTabContent()}
            </div>
          </Suspense>
        </main>
      </div>

      {/* Admin Mobile Fixed Bottom Navigation Bar (Modern Native Floating Island with Center AI Brain) */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 w-full h-[78px] sm:h-[84px] bg-white/95 backdrop-blur-xl border-t border-slate-200/90 shadow-[0_-4px_24px_rgba(15,23,42,0.1)] pb-[env(safe-area-inset-bottom,0px)] flex items-center">
        <div className="w-full max-w-lg sm:max-w-2xl mx-auto px-1 sm:px-4 flex items-center justify-around h-full">
          {[
            { id: 'overview', label: 'Dashboard', icon: LayoutDashboard, active: adminTab === 'overview' },
            { id: 'orders', label: 'Orders', icon: ShoppingBag, active: adminTab === 'orders' || adminTab === 'order_detail', badge: actionableOrderCount },
            { id: 'ai_studio', label: 'AI Brain', icon: Bot, isCenterAi: true, active: adminTab === 'ai_studio' || adminTab === 'control_center' || adminTab === 'system_health' },
            { id: 'payments', label: 'Payments', icon: CreditCard, active: adminTab === 'payments', badge: pendingPaymentsCount },
            { id: 'menu', label: 'Menu', icon: Menu, active: mobileDrawerOpen }
          ].map((item, idx) => {
            const Icon = item.icon;
            const isActive = item.active;

            if (item.isCenterAi) {
              return (
                <button
                  key={`admin-bottom-nav-ai-center-${idx}`}
                  type="button"
                  onClick={() => setShowAiOverseerModal(true)}
                  className="relative -top-4 flex flex-col items-center justify-center group cursor-pointer active:scale-90 transition-all shrink-0 px-2"
                  title="Open Supreme AI Overseer Voice & Text Console (Ctrl+J)"
                  aria-label="AI Commander"
                >
                  <div className="relative flex items-center justify-center">
                    {/* Animated Neon Cyber Halo Aura */}
                    <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-violet-600 via-rose-500 to-amber-400 opacity-80 blur-xs group-hover:opacity-100 group-hover:blur-sm transition-all animate-pulse" />
                    
                    {/* Outer Glowing Shell */}
                    <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-tr from-slate-950 via-indigo-950 to-slate-900 border-2 border-violet-400/80 shadow-2xl shadow-violet-950/80 flex items-center justify-center overflow-hidden">
                      {/* Internal Cyber Grid Glow */}
                      <div className="absolute inset-0 bg-gradient-to-b from-violet-500/20 via-transparent to-rose-500/20" />
                      <Bot size={28} className="text-amber-300 relative z-10 group-hover:scale-110 transition-transform stroke-[2.2] animate-pulse" />
                      
                      {/* Active Live Sparkle Orb */}
                      <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399] animate-ping" />
                    </div>
                  </div>
                  <div className="flex items-center gap-1 mt-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[11px] font-black tracking-tight leading-none bg-gradient-to-r from-violet-600 via-rose-600 to-indigo-600 bg-clip-text text-transparent">
                      AI Commander
                    </span>
                  </div>
                </button>
              );
            }

            return (
              <button
                key={`admin-bottom-nav-${item.id || idx}-${idx}`}
                type="button"
                onClick={() => item.id === 'menu' ? setMobileDrawerOpen(!mobileDrawerOpen) : navigateTab(item.id as AdminTab)}
                className={`relative flex flex-col items-center justify-center flex-1 h-full py-1 gap-1 transition-all duration-200 group cursor-pointer active:scale-95 ${
                  isActive ? 'text-red-600' : 'text-slate-400 hover:text-slate-700'
                }`}
                title={item.label}
                aria-label={item.label}
              >
                {/* Top Active Indicator Line */}
                {isActive && (
                  <motion.div
                    layoutId="admin-bottomnav-top-indicator-line"
                    className="absolute top-0 w-10 sm:w-12 h-1 bg-gradient-to-r from-red-500 via-red-600 to-orange-500 rounded-full shadow-[0_2px_8px_rgba(220,38,38,0.4)]"
                    transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                  />
                )}

                {/* Icon Container with Refined Active Background Pill */}
                <div className="relative flex items-center justify-center">
                  <div
                    className={`px-3.5 py-1 rounded-2xl flex items-center justify-center transition-all duration-200 relative ${
                      isActive
                        ? 'bg-red-50 text-red-600 shadow-xs'
                        : 'text-slate-400 group-hover:text-slate-700'
                    }`}
                  >
                    <Icon
                      size={24}
                      className={`transition-all duration-200 ${
                        isActive ? 'stroke-[2.5] text-red-600' : 'stroke-[1.9] text-slate-400 group-hover:text-slate-600'
                      }`}
                    />
                  </div>

                  {/* Real-Time Notification & Pending Order Badge */}
                  {item.badge !== undefined && item.badge > 0 ? (
                    <span className="absolute -top-1 -right-1 min-w-[20px] h-[20px] px-1 bg-rose-500 text-white text-[11px] font-black rounded-full flex items-center justify-center shadow-xs border-2 border-white animate-in zoom-in duration-200">
                      {item.badge}
                    </span>
                  ) : null}
                </div>

                {/* Label */}
                <span
                  className={`text-xs tracking-tight leading-none transition-all ${
                    isActive
                      ? 'font-black text-red-700'
                      : 'font-semibold text-slate-400 group-hover:text-slate-600'
                  }`}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Supreme AI Overseer Full Command Modal */}
      <AdminAiOverseerModal
        isOpen={showAiOverseerModal}
        onClose={() => setShowAiOverseerModal(false)}
        onSyncState={handleAiSyncState}
      />
    </div>
  );
};
export default AdminDashboard;
