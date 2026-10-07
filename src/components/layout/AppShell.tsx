import React from 'react';
import { useStore } from '../../context/StoreContext';
import { useAuth } from '../../context/AuthContext';
import { Header } from './Header';
import { BottomNav } from './BottomNav';
import { ToastContainer } from '../common/Toast';
import { AppLogo } from '../common/AppLogo';
import { NetworkStatusBanner } from '../common/NetworkStatusBanner';
import { PWAUpdatePrompt } from '../common/PWAUpdatePrompt';
import { AuthRecoveryPrompt } from '../auth/AuthRecoveryPrompt';
import { UnxAiAssistantModal } from '../ai/UnxAiAssistantModal';
import { UnxAiFloatingButton } from '../ai/UnxAiFloatingButton';
import { Sparkles, Wrench, Power, ShieldAlert, Zap, Clock, ShieldCheck, Gem, Megaphone, Flame, Radio, Bot } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const MAIN_TABS = ['home', 'shop', 'news', 'orders', 'profile'];

export const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const {
    appSettings,
    updateAppSettings,
    toggleMaintenanceStatus,
    isAdminView,
    currentTab,
    showToast,
  } = useStore();
  const { isAdmin, currentUser, authRecoveryError, clearAuthRecoveryError } = useAuth();
  const [showAiModal, setShowAiModal] = React.useState(false);

  const handleTurnOffMaintenance = async () => {
    try {
      const adminInfo = currentUser
        ? { uid: currentUser.uid, name: currentUser.name, email: currentUser.email }
        : undefined;
      await toggleMaintenanceStatus(false, { adminInfo });
    } catch (e: any) {
      showToast('error', 'Failed to disable maintenance', e.message);
    }
  };

  const isMainTab = MAIN_TABS.includes(currentTab);
  const isDirectAuthPage = ['login', 'register', 'forgot_password', 'reset_password'].includes(currentTab);
  const isProtectedAuthView = !currentUser && ['orders', 'order_detail', 'profile', 'settings', 'security', 'checkout'].includes(currentTab);
  const isAuthPage = isDirectAuthPage || isProtectedAuthView;

  // Smooth scroll to top on tab navigation
  React.useEffect(() => {
    try {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    } catch {}
  }, [currentTab]);

  // Full-Screen Layout for Visitors in Maintenance Mode (No Header, No Footer, No Bottom Nav)
  if (appSettings?.maintenanceMode && !isAdmin) {
    if (isAuthPage || currentTab === 'admin') {
      return (
        <div className="w-full min-h-[100dvh] bg-[#F7F7FB] text-[#171329] flex flex-col antialiased font-sans">
          <main className="flex-1 w-full min-h-[100dvh]">
            {children}
          </main>
          <ToastContainer />
        </div>
      );
    }

    return (
      <div className="w-full min-h-[100dvh] bg-[#F7F7FB] text-[#171329] flex flex-col antialiased font-sans overflow-y-auto">
        {children}
        <ToastContainer />
      </div>
    );
  }

  // Full-Screen Edge-to-Edge Layout for Admin App
  if (isAdminView || currentTab === 'admin') {
    return (
      <div className="w-full max-w-full min-w-0 h-[100dvh] bg-[#F5F5FA] text-[#171329] flex flex-col antialiased selection:bg-[#DC2626] selection:text-white font-sans pt-[env(safe-area-inset-top)] overflow-hidden">
        {/* Admin Maintenance Alert Header */}
        {appSettings?.maintenanceMode && (
          <div className="sticky top-0 z-50 bg-[#D97706] text-white px-4 py-2 flex items-center justify-between gap-2 text-xs font-bold shadow-xs border-b border-[#B45309]">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-white animate-ping" />
              <span className="text-[11px] sm:text-xs">
                ⚠️ Platform Maintenance Mode is ACTIVE (Customers locked)
              </span>
            </div>
            <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleTurnOffMaintenance}
              className="px-2.5 py-1 rounded-lg bg-black/30 hover:bg-black/40 active:scale-95 text-white font-bold text-[10px] sm:text-xs uppercase flex items-center gap-1 transition-all cursor-pointer"
            >
              <Power size={12} />
              <span>Turn OFF Now</span>
              </motion.button>
          </div>
        )}
        <main className="flex-1 w-full max-w-full min-w-0 min-h-0 overflow-hidden flex flex-col">
          {children}
        </main>
        <PWAUpdatePrompt />
        <NetworkStatusBanner />
        <ToastContainer />
      </div>
    );
  }

  return (
    <div className="w-full max-w-full min-w-0 bg-[#FAFBFF] text-[#0F172A] flex flex-col antialiased selection:bg-violet-600 selection:text-white font-sans pl-[env(safe-area-inset-left,0px)] pr-[env(safe-area-inset-right,0px)] pt-[env(safe-area-inset-top,0px)] h-[100dvh] overflow-hidden overscroll-none select-none">
      <a href="#app-main-content" className="app-skip-link">Skip to main content</a>
      {/* Customer Unified Global Top Fixed Header Shell (Locked at top: Announcement Bar + Header) */}
      {!isAdminView && (
        <>
          <header className="fixed top-0 left-0 right-0 z-40 w-full flex flex-col bg-[#FAFBFF]/95 backdrop-blur-md pt-[env(safe-area-inset-top,0px)] pl-[env(safe-area-inset-left,0px)] pr-[env(safe-area-inset-right,0px)]">
            {/* Admin Logged-In Top Warning Bar when Maintenance is Active */}
            {isAdmin && appSettings?.maintenanceMode && (
              <div className="w-full bg-[#D97706] text-white px-4 py-2 flex items-center justify-between gap-2 text-xs font-bold shadow-xs border-b border-[#B45309] shrink-0">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                  <span className="text-[11px] sm:text-xs">
                    ⚠️ Maintenance Mode is ON (Regular customers see Launch Screen)
                  </span>
                </div>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleTurnOffMaintenance}
                  className="px-2.5 py-1 rounded-lg bg-black/30 hover:bg-black/40 active:scale-95 text-white font-bold text-[10px] sm:text-xs uppercase flex items-center gap-1 transition-all cursor-pointer"
                >
                  <Power size={12} />
                  <span>Turn OFF</span>
                </motion.button>
              </div>
            )}

            {/* Announcement Marquee Ticker - Ultra Advance Cyber Gaming Strip */}
            <div className="relative w-full overflow-hidden shrink-0 flex items-center h-10 sm:h-11 fhd-crisp select-none bg-gradient-to-r from-slate-950 via-[#150f2f] to-slate-950 border-b border-violet-500/25 shadow-[0_4px_20px_rgba(124,58,237,0.18)]">
              {/* Subtle top & bottom iridescent glow lines */}
              <div className="pointer-events-none absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-violet-500/50 to-transparent" />
              <div className="pointer-events-none absolute bottom-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent" />

              {/* Live Badge Left Pill - Store Button Inspired Frame */}
              <div className="relative z-20 ml-2.5 sm:ml-4 shrink-0 inline-flex items-center rounded-full bg-gradient-to-r from-violet-600 via-indigo-600 to-fuchsia-600 p-[1.5px] shadow-[0_0_14px_rgba(168,85,247,0.4)]">
                <div className="flex items-center gap-1.5 rounded-full bg-slate-950/90 px-2.5 py-0.5 backdrop-blur-md">
                  <span className="relative flex h-2 w-2 shrink-0 items-center justify-center">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-80" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400 shadow-[0_0_8px_#34d399]" />
                  </span>
                  <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-white via-violet-200 to-fuchsia-200">
                    LIVE
                  </span>
                </div>
              </div>

              {/* Marquee Scrolling Stream Bar with Inner Soft Edge Fade Masks */}
              <div className="relative flex-1 overflow-hidden h-full flex items-center min-w-0">
                {/* Left Inner Fade Gradient Mask */}
                <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-8 sm:w-16 bg-gradient-to-r from-slate-950 to-transparent z-10" />

                {/* Right Inner Fade Gradient Mask */}
                <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 sm:w-16 bg-gradient-to-l from-slate-950 to-transparent z-10" />

                {/* 120FPS ProMotion Hardware-Accelerated Infinite Scrolling Content with Advance Floating Badges */}
                <div 
                  className="animate-live-ticker hover:[animation-play-state:paused] active:[animation-play-state:paused] text-xs sm:text-sm font-bold text-slate-100 flex items-center tracking-normal select-none shrink-0 flex-nowrap w-max whitespace-nowrap cursor-pointer transition-opacity"
                  title="Official UNX Games Live Announcements (Tap & hold to pause)"
                >
                  {/* Loop 1 */}
                  <div className="flex shrink-0 flex-nowrap items-center gap-3.5 sm:gap-5 px-3 whitespace-nowrap">
                    {appSettings?.announcementActive !== false && appSettings?.announcementBanner && (
                      <span className="shrink-0 inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 px-3 py-0.5 text-amber-300 font-black backdrop-blur-xs">
                        <Megaphone size={13} className="text-amber-400 shrink-0" />
                        <span>{appSettings.announcementBanner}</span>
                      </span>
                    )}

                    <span className="shrink-0 inline-flex items-center gap-1.5 rounded-full bg-white/[0.08] border border-white/12 px-3 py-0.5 text-slate-100 font-bold backdrop-blur-xs">
                      <Zap size={13} className="text-amber-400 shrink-0 fill-amber-400/50" />
                      <span>Instant Top-Up with eSewa &amp; Khalti QR</span>
                    </span>

                    <span className="w-1.5 h-1.5 rounded-full bg-violet-400/80 shadow-[0_0_6px_rgba(168,85,247,0.7)] shrink-0" />

                    <span className="shrink-0 inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-3 py-0.5 text-emerald-300 font-black backdrop-blur-xs">
                      <Clock size={13} className="text-emerald-400 shrink-0" />
                      <span>Delivered in 5-15 Minutes</span>
                    </span>

                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400/80 shadow-[0_0_6px_rgba(99,102,241,0.7)] shrink-0" />

                    <span className="shrink-0 inline-flex items-center gap-1.5 rounded-full bg-white/[0.08] border border-white/12 px-3 py-0.5 text-cyan-300 font-bold backdrop-blur-xs">
                      <Gem size={13} className="text-cyan-400 shrink-0" />
                      <span>100% Genuine In-Game Credits</span>
                    </span>

                    <span className="w-1.5 h-1.5 rounded-full bg-fuchsia-400/80 shadow-[0_0_6px_rgba(217,70,239,0.7)] shrink-0" />

                    <span className="shrink-0 inline-flex items-center gap-1.5 rounded-full bg-violet-500/15 border border-violet-500/30 px-3 py-0.5 text-violet-200 font-bold backdrop-blur-xs">
                      <ShieldCheck size={13} className="text-violet-400 shrink-0" />
                      <span>Nepal 24/7 Verified Safe Payments</span>
                    </span>

                    <span className="w-1.5 h-1.5 rounded-full bg-violet-400/80 shadow-[0_0_6px_rgba(168,85,247,0.7)] shrink-0" />
                  </div>

                  {/* Loop 2 */}
                  <div className="flex shrink-0 flex-nowrap items-center gap-3.5 sm:gap-5 px-3 whitespace-nowrap">
                    {appSettings?.announcementActive !== false && appSettings?.announcementBanner && (
                      <span className="shrink-0 inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 px-3 py-0.5 text-amber-300 font-black backdrop-blur-xs">
                        <Megaphone size={13} className="text-amber-400 shrink-0" />
                        <span>{appSettings.announcementBanner}</span>
                      </span>
                    )}

                    <span className="shrink-0 inline-flex items-center gap-1.5 rounded-full bg-white/[0.08] border border-white/12 px-3 py-0.5 text-slate-100 font-bold backdrop-blur-xs">
                      <Zap size={13} className="text-amber-400 shrink-0 fill-amber-400/50" />
                      <span>Instant Top-Up with eSewa &amp; Khalti QR</span>
                    </span>

                    <span className="w-1.5 h-1.5 rounded-full bg-violet-400/80 shadow-[0_0_6px_rgba(168,85,247,0.7)] shrink-0" />

                    <span className="shrink-0 inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-3 py-0.5 text-emerald-300 font-black backdrop-blur-xs">
                      <Clock size={13} className="text-emerald-400 shrink-0" />
                      <span>Delivered in 5-15 Minutes</span>
                    </span>

                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400/80 shadow-[0_0_6px_rgba(99,102,241,0.7)] shrink-0" />

                    <span className="shrink-0 inline-flex items-center gap-1.5 rounded-full bg-white/[0.08] border border-white/12 px-3 py-0.5 text-cyan-300 font-bold backdrop-blur-xs">
                      <Gem size={13} className="text-cyan-400 shrink-0" />
                      <span>100% Genuine In-Game Credits</span>
                    </span>

                    <span className="w-1.5 h-1.5 rounded-full bg-fuchsia-400/80 shadow-[0_0_6px_rgba(217,70,239,0.7)] shrink-0" />

                    <span className="shrink-0 inline-flex items-center gap-1.5 rounded-full bg-violet-500/15 border border-violet-500/30 px-3 py-0.5 text-violet-200 font-bold backdrop-blur-xs">
                      <ShieldCheck size={13} className="text-violet-400 shrink-0" />
                      <span>Nepal 24/7 Verified Safe Payments</span>
                    </span>

                    <span className="w-1.5 h-1.5 rounded-full bg-violet-400/80 shadow-[0_0_6px_rgba(168,85,247,0.7)] shrink-0" />
                  </div>
                </div>
              </div>

              {/* Right Status Badge */}
              <div className="hidden md:flex items-center gap-2 px-4 py-1.5 bg-slate-950/80 text-emerald-400 text-[11px] sm:text-xs font-black shrink-0 h-full border-l border-violet-500/20 tracking-wider backdrop-blur-md">
                <span className="relative flex h-2 w-2 shrink-0 items-center justify-center">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-80" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400 shadow-[0_0_8px_#34d399]" />
                </span>
                <span>24/7 ONLINE</span>
              </div>
            </div>

            {/* Customer Global Header */}
            <Header />
          </header>

          {/* Top Fixed Header Spacer: Reserves exact physical space so page content is never hidden */}
          <div
            className={`w-full shrink-0 select-none pointer-events-none ${
              isAdmin && appSettings?.maintenanceMode
                ? 'h-[146px] sm:h-[154px]'
                : 'h-[110px] sm:h-[118px]'
            }`}
            aria-hidden="true"
          />
        </>
      )}

      {/* Main Full-Width Application Container */}
      <div className="flex-1 flex flex-col w-full relative min-h-0 overflow-hidden">
        {/* Auth Recovery Error Banner for Customer View */}
        {authRecoveryError && !isAdminView && (
          <div className="max-w-7xl mx-auto px-4 pt-3 pb-1 w-full">
            <AuthRecoveryPrompt
              variant="card"
              title="Authentication Session Notice"
              description={authRecoveryError}
              onDismiss={clearAuthRecoveryError}
            />
          </div>
        )}

        {/* Main Content Area */}
        <main
          id="app-main-content"
          tabIndex={-1}
          className={`flex-1 w-full max-w-full min-w-0 ${
            !isAdminView
              ? isAuthPage
                ? 'min-h-0 h-full overflow-hidden flex flex-col p-0 overscroll-none'
                : 'min-h-0 overflow-y-auto overflow-x-hidden overscroll-y-contain pt-1 sm:pt-1.5 pb-2 sm:pb-3'
              : 'overflow-x-clip overflow-y-visible'
          }`}
        >
          <div
            className={`w-full flex-1 flex flex-col transform-gpu ${
              isAuthPage ? 'h-full min-h-0 overflow-hidden' : ''
            }`}
          >
            {children}
          </div>
        </main>

        {/* Customer Fixed Bottom Navigation */}
        {!isAdminView && <BottomNav />}
      </div>

      {/* UNX Live AI Assistant Floating Button & Modal */}
      {!isAdminView && !isAuthPage && (
        <>
          <UnxAiFloatingButton onClick={() => setShowAiModal(true)} />
          <UnxAiAssistantModal isOpen={showAiModal} onClose={() => setShowAiModal(false)} />
        </>
      )}

      {/* PWA Update Notification Prompt */}
      <PWAUpdatePrompt />

      {/* Online / Offline Connectivity Toast */}
      <NetworkStatusBanner />

      {/* Floating Toast Notifications */}
      <ToastContainer />
    </div>
  );
};
