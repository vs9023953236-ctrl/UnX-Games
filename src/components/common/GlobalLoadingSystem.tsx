import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Clock, Sparkles, Shield, CreditCard, Search } from 'lucide-react';
import { AppLogo } from './AppLogo';
import { PerfectAppSpinner } from './PerfectAppSpinner';
import { UnifiedAppLoadingScreen } from './UnifiedAppLoadingScreen';
import { NativeMobileSpinner } from './NativeMobileSpinner';

export type LoadingMode =
  | 'startup'
  | 'auth'
  | 'route'
  | 'inline'
  | 'product_skeleton'
  | 'order'
  | 'payment'
  | 'search'
  | 'button';

export interface GlobalLoadingSystemProps {
  mode?: LoadingMode;
  title?: string;
  message?: string;
  fullScreen?: boolean;
  minHeight?: string;
  className?: string;
  autoFinish?: boolean;
  minDuration?: number;
  onFinish?: () => void;
  isPreview?: boolean;
  onDismissPreview?: () => void;
  // Specific settings
  isSessionRestoration?: boolean;
  progress?: number; // for payment progress
}

export const GlobalLoadingSystem: React.FC<GlobalLoadingSystemProps> = ({
  mode = 'startup',
  title,
  message,
  fullScreen = false,
  minHeight = 'min-h-[60vh]',
  className = '',
  autoFinish = true,
  minDuration = 800,
  onFinish,
  isPreview = false,
  onDismissPreview,
  isSessionRestoration = false,
  progress,
}) => {
  const finishedRef = useRef(false);
  const onFinishRef = useRef(onFinish);
  onFinishRef.current = onFinish;

  // Live Nepal Standard Time (UTC+5:45)
  const [nepalTime, setNepalTime] = useState<string>(() => {
    try {
      return new Date().toLocaleTimeString('en-US', {
        timeZone: 'Asia/Kathmandu',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      });
    } catch {
      return '';
    }
  });

  useEffect(() => {
    if (mode === 'startup' || (mode === 'route' && fullScreen) || (mode === 'auth' && fullScreen)) {
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';
      return () => {
        document.body.style.overflow = '';
        document.body.style.touchAction = 'pan-x pan-y';
      };
    }
  }, [mode, fullScreen]);

  useEffect(() => {
    if (mode !== 'startup') return;
    const updateTime = () => {
      try {
        setNepalTime(
          new Date().toLocaleTimeString('en-US', {
            timeZone: 'Asia/Kathmandu',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true,
          })
        );
      } catch {}
    };
    updateTime();
    const clockInterval = setInterval(updateTime, 1000);
    return () => clearInterval(clockInterval);
  }, [mode]);

  useEffect(() => {
    if (!autoFinish || mode !== 'startup') return;

    const timer = setTimeout(() => {
      if (!finishedRef.current) {
        finishedRef.current = true;
        onFinishRef.current?.();
      }
    }, minDuration);

    return () => clearTimeout(timer);
  }, [autoFinish, minDuration, mode]);

  // Render skeletons for product page
  if (mode === 'product_skeleton') {
    return (
      <div className={`w-full space-y-4 animate-pulse ${className}`}>
        {/* Game image skeleton */}
        <div className="w-full h-48 sm:h-64 bg-slate-200/80 rounded-2xl" />
        {/* Title skeleton */}
        <div className="h-6 bg-slate-200/80 rounded-lg w-2/3" />
        {/* Rating/subtitle skeleton */}
        <div className="h-4 bg-slate-200/80 rounded-lg w-1/3" />
        {/* Price skeleton */}
        <div className="h-8 bg-slate-200/80 rounded-lg w-1/4" />
        {/* Button skeleton */}
        <div className="h-12 bg-slate-200/80 rounded-xl w-full" />
      </div>
    );
  }

  // Search inline loader
  if (mode === 'search') {
    return (
      <div className={`flex items-center gap-2 py-3 px-4 text-slate-500 text-xs font-semibold ${className}`}>
        <Search size={14} className="animate-pulse text-violet-500" />
        <NativeMobileSpinner size="xs" variant="tapered-arc" color="violet" />
        <span>Searching...</span>
      </div>
    );
  }

  // Button spinner
  if (mode === 'button') {
    return (
      <span className="inline-flex items-center justify-center gap-2">
        <NativeMobileSpinner size="xs" variant="tapered-arc" color="current" />
        <span>{title || 'Processing...'}</span>
      </span>
    );
  }

  // 1. Startup Mode (Single Unified App Loading Screen)
  if (mode === 'startup') {
    return <UnifiedAppLoadingScreen message={message} onFinish={onFinish} fullScreen={fullScreen} />;
  }

  // 2. Auth Loading Mode (Clean elegant, with optional full screen or inline)
  if (mode === 'auth') {
    const authTitle = isSessionRestoration ? 'Welcome Back' : (title || 'Signing you in...');
    const authMessage = isSessionRestoration ? 'Restoring your secure session...' : (message || 'Authenticating credentials & signing in...');

    const authContent = (
      <div className="fixed inset-0 top-0 left-0 right-0 bottom-0 z-[9999999] bg-[#FAFBFF]/95 backdrop-blur-sm text-slate-900 flex flex-col items-center justify-center p-4 select-none overflow-hidden h-[100dvh] w-screen pointer-events-auto">
        <div className="flex flex-col items-center justify-center text-center max-w-sm w-full px-4 box-border">
          <div className="mb-4">
            <PerfectAppSpinner size="md" theme="violet" showDots={false} />
          </div>

          <div className="text-center space-y-2 w-full">
            <div className="text-xl font-black text-slate-900 tracking-tight leading-tight flex items-center justify-center gap-1.5">
              <span>UNX</span>
              <span className="bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">GAMES</span>
            </div>

            <h3 className="text-base font-black text-slate-800 tracking-tight">
              {authTitle}
            </h3>

            <div className="flex items-center justify-center gap-1.5 py-1">
              <span className="w-2 h-2 rounded-full bg-violet-600 animate-bounce [animation-delay:-0.3s]" />
              <span className="w-2 h-2 rounded-full bg-violet-600 animate-bounce [animation-delay:-0.15s]" />
              <span className="w-2 h-2 rounded-full bg-violet-600 animate-bounce" />
            </div>

            <p className="text-xs font-semibold text-slate-500 leading-relaxed max-w-xs mx-auto">
              {authMessage}
            </p>
          </div>
        </div>
      </div>
    );

    return typeof document !== 'undefined' ? createPortal(authContent, document.body) : authContent;
  }

  // 3. Route Loading (Lightweight, non-blocking splash screen fallback)
  if (mode === 'route') {
    const routeTitle = title || 'Loading...';
    const routeMsg = message || 'Preparing page...';

    const routeContent = (
      <div className="fixed inset-0 z-[99999] bg-white/80 backdrop-blur-xs text-slate-900 flex flex-col items-center justify-center p-4 select-none h-screen w-screen pointer-events-auto">
        <div className="flex flex-col items-center justify-center text-center max-w-xs w-full">
          <div className="mb-3">
            <PerfectAppSpinner size="sm" theme="violet" showDots={false} />
          </div>

          <div className="text-center space-y-1">
            <h4 className="text-sm font-bold text-slate-900 tracking-tight">{routeTitle}</h4>
            <p className="text-xs text-slate-500 font-medium">{routeMsg}</p>
          </div>
        </div>
      </div>
    );

    return typeof document !== 'undefined' ? createPortal(routeContent, document.body) : routeContent;
  }

  // 3b. Inline Container Loading (Non-blocking sub-tab / section fallback)
  if (mode === 'inline') {
    const inlineTitle = title || 'Loading Module...';
    const inlineMsg = message || 'Fetching latest data...';

    return (
      <div className={`w-full flex flex-col items-center justify-center py-10 px-4 text-center select-none my-auto bg-white/70 backdrop-blur-xs border border-slate-200/80 rounded-3xl shadow-xs transition-all ${minHeight || 'min-h-[220px]'} ${className}`}>
        <div className="mb-2">
          <PerfectAppSpinner size="sm" theme="violet" showDots={false} />
        </div>

        <div className="text-center space-y-1 max-w-xs mx-auto">
          <h4 className="text-xs sm:text-sm font-black text-slate-800 tracking-tight">{inlineTitle}</h4>
          <p className="text-[11px] text-slate-500 font-semibold">{inlineMsg}</p>
        </div>

        <div className="flex items-center justify-center gap-1.5 mt-3">
          <span className="w-1.5 h-1.5 rounded-full bg-violet-600 animate-bounce [animation-delay:-0.3s]" />
          <span className="w-1.5 h-1.5 rounded-full bg-violet-600 animate-bounce [animation-delay:-0.15s]" />
          <span className="w-1.5 h-1.5 rounded-full bg-violet-600 animate-bounce" />
        </div>
      </div>
    );
  }

  // 4. Order Loading
  if (mode === 'order') {
    const orderTitle = title || 'Processing Order...';
    const orderMsg = message || 'Please wait while we confirm your order.';

    return (
      <div className={`w-full flex flex-col items-center justify-center py-8 px-4 text-center select-none ${minHeight} ${className}`}>
        <div className="relative flex items-center justify-center mb-4">
          <div className="absolute -inset-2 rounded-full pointer-events-none">
            <NativeMobileSpinner size="xl" variant="dual-neon" color="violet" />
          </div>
          <div className="relative p-3.5 bg-white rounded-full shadow-lg border border-violet-100 flex items-center justify-center z-10">
            <Shield size={26} className="text-violet-600" />
          </div>
        </div>

        <h3 className="text-base font-black text-slate-900 mb-1">{orderTitle}</h3>
        <p className="text-xs font-semibold text-slate-500 max-w-xs leading-normal">{orderMsg}</p>

        <div className="flex items-center justify-center gap-1.5 mt-4">
          <NativeMobileSpinner size="xs" variant="tapered-arc" color="violet" />
        </div>
      </div>
    );
  }

  // 5. Payment Loading
  if (mode === 'payment') {
    const paymentTitle = title || 'Processing Payment...';
    const paymentMsg = message || "Please don't close this page.";

    return (
      <div className={`w-full flex flex-col items-center justify-center py-8 px-4 text-center select-none ${minHeight} ${className}`}>
        <div className="relative flex items-center justify-center mb-5">
          <div className="absolute -inset-2 rounded-full pointer-events-none">
            <NativeMobileSpinner size="xl" variant="tapered-arc" color="indigo" />
          </div>
          <div className="relative p-3.5 bg-white rounded-full shadow-lg border border-indigo-100 flex items-center justify-center z-10">
            <CreditCard size={26} className="text-indigo-600" />
          </div>
        </div>

        <h3 className="text-base font-black text-slate-900 mb-1">{paymentTitle}</h3>
        <p className="text-xs font-bold text-slate-500 max-w-xs leading-normal mb-4">{paymentMsg}</p>

        {/* Payment progress indicator if passed */}
        {progress !== undefined ? (
          <div className="w-full max-w-xs bg-slate-100 rounded-full h-1.5 overflow-hidden mb-2 shadow-inner">
            <div
              className="bg-indigo-600 h-full rounded-full transition-all duration-300"
              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            />
          </div>
        ) : (
          <div className="flex items-center justify-center gap-1.5">
            <NativeMobileSpinner size="xs" variant="tapered-arc" color="indigo" />
          </div>
        )}
      </div>
    );
  }

  // Fallback default
  return (
    <div className={`w-full flex flex-col items-center justify-center gap-4 p-6 select-none my-auto ${minHeight} ${className}`}>
      <PerfectAppSpinner size="md" theme="violet" showDots={false} />

      <div className="text-center space-y-2 mt-2 w-full max-w-sm">
        <h2 className="text-sm sm:text-base font-black text-slate-900 tracking-tight leading-tight">
          {title || 'Loading'}
        </h2>
        <div className="flex items-center justify-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-violet-600 animate-bounce [animation-delay:-0.3s]" />
          <span className="w-1.5 h-1.5 rounded-full bg-violet-600 animate-bounce [animation-delay:-0.15s]" />
          <span className="w-1.5 h-1.5 rounded-full bg-violet-600 animate-bounce" />
        </div>
        {message && <p className="text-xs font-semibold text-slate-500">{message}</p>}
      </div>
    </div>
  );
};

export default GlobalLoadingSystem;
