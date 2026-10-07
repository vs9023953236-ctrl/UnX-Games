import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Clock, Sparkles } from 'lucide-react';
import { PerfectAppSpinner } from './PerfectAppSpinner';

export interface UnifiedAppLoadingScreenProps {
  message?: string;
  onFinish?: () => void;
  fullScreen?: boolean;
}

// Ultra-reliable Nepal Standard Time (UTC+5:45) helper
function getFormattedNepalTime(): string {
  try {
    const now = new Date();
    // Calculate Nepal time directly using UTC offset (+345 minutes)
    const utc = now.getTime() + now.getTimezoneOffset() * 60000;
    const nptDate = new Date(utc + 345 * 60000);
    let hours = nptDate.getHours();
    const minutes = String(nptDate.getMinutes()).padStart(2, '0');
    const seconds = String(nptDate.getSeconds()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const strHours = String(hours).padStart(2, '0');
    return `${strHours}:${minutes}:${seconds} ${ampm}`;
  } catch {
    return '05:45:00 PM';
  }
}

export const UnifiedAppLoadingScreen: React.FC<UnifiedAppLoadingScreenProps> = ({
  message,
}) => {
  const [nepalTime, setNepalTime] = useState<string>(getFormattedNepalTime);
  const [progress, setProgress] = useState(24);
  const [bootStep, setBootStep] = useState('Initializing Unx Gaming Hub...');

  useEffect(() => {
    const clockInterval = setInterval(() => {
      setNepalTime(getFormattedNepalTime());
    }, 1000);

    // Native mobile app boot progression simulation
    const steps = [
      { p: 35, s: 'Connecting to Nepal Cloud...' },
      { p: 68, s: 'Syncing Store Catalog & Diamonds...' },
      { p: 89, s: 'Verifying Security & Session...' },
      { p: 98, s: 'Launching Gaming Experience...' },
    ];

    let currentIdx = 0;
    const progressInterval = setInterval(() => {
      if (currentIdx < steps.length) {
        setProgress(steps[currentIdx].p);
        setBootStep(steps[currentIdx].s);
        currentIdx++;
      } else {
        clearInterval(progressInterval);
      }
    }, 450);

    return () => {
      clearInterval(clockInterval);
      clearInterval(progressInterval);
    };
  }, []);

  return (
    <motion.div
      id="ghn-unified-splash"
      initial={{ opacity: 1 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      className="fixed inset-0 z-[9999999] bg-[#FAFBFF] text-slate-900 flex flex-col justify-between items-center px-4 py-6 select-none overflow-hidden font-sans h-full h-[100dvh] w-full w-[100dvw] box-border overscroll-none pointer-events-auto transform-gpu"
      style={{
        overscrollBehavior: 'none',
        touchAction: 'none',
        paddingTop: 'max(1.25rem, env(safe-area-inset-top, 1.25rem))',
        paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom, 1.25rem))',
      }}
    >
      {/* Background Ambient High-Definition Lighting FX (Hardware GPU Accelerated) */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[320px] sm:w-[440px] h-[320px] sm:h-[440px] bg-gradient-to-tr from-violet-200/50 via-indigo-100/40 to-fuchsia-200/35 rounded-full blur-3xl pointer-events-none -z-10 transform-gpu" />
      <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 w-[260px] sm:w-[340px] h-[260px] sm:h-[340px] bg-indigo-100/35 rounded-full blur-2xl pointer-events-none -z-10 transform-gpu" />

      {/* Top Header Bar: Nepal Time Clock & Live Country Badge */}
      <div className="w-full max-w-sm flex items-center justify-between text-xs font-semibold px-2 z-10 box-border">
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/95 backdrop-blur-md border border-slate-200/90 text-slate-700 text-[11px] font-bold shadow-xs">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0 shadow-xs shadow-red-500/80" />
          <Clock size={12} className="text-red-600 shrink-0" />
          <span className="font-mono font-bold tracking-tight text-slate-800">{nepalTime}</span>
          <span className="text-[9px] font-black text-red-600 uppercase tracking-wide">NPT</span>
        </div>

        <div className="flex items-center gap-2">
          <div className="px-3 py-1.5 rounded-full bg-white/95 backdrop-blur-md border border-slate-200/90 text-slate-700 text-xs font-bold flex items-center gap-1.5 shadow-xs">
            <span>Nepal</span>
            <span className="text-sm">🇳🇵</span>
          </div>
        </div>
      </div>

      {/* Center Logo Section with High-Definition Logo & Motion Spinner Ring */}
      <div className="flex flex-col items-center justify-center my-auto z-10 w-full max-w-[360px] px-4 text-center box-border">
        <div className="mb-4 shrink-0">
          <PerfectAppSpinner size="lg" theme="violet" showDots={false} />
        </div>

        {/* Official Brand Title */}
        <div className="mb-2 w-full max-w-sm px-2">
          <div className="text-[28px] sm:text-[32px] font-black tracking-tight text-slate-900 flex items-center justify-center gap-2 leading-tight">
            <span>UNX</span>
            <span className="bg-gradient-to-r from-violet-600 via-indigo-600 to-fuchsia-600 bg-clip-text text-transparent">
              GAMES
            </span>
          </div>

          <div className="mt-1.5 w-full flex items-center justify-center">
            <span className="text-xs sm:text-sm font-black tracking-wider text-slate-500 uppercase">
              NEPAL&apos;S #1 GAME TOP-UP &amp; VOUCHER APP
            </span>
          </div>
        </div>

        {/* Native Mobile App Style Progress Track & Real-Time Sync Indicator */}
        <div className="w-full max-w-[280px] mt-4 space-y-2">
          {/* Animated Gradient Progress Track */}
          <div className="w-full h-1.5 bg-slate-200/80 rounded-full overflow-hidden p-0 relative shadow-inner">
            <motion.div
              className="h-full bg-gradient-to-r from-violet-600 via-indigo-600 to-fuchsia-500 rounded-full"
              initial={{ width: '20%' }}
              animate={{ width: `${progress}%` }}
              transition={{ ease: 'easeOut', duration: 0.35 }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 px-0.5">
            <span className="truncate max-w-[210px] text-left">{message || bootStep}</span>
            <span className="font-mono font-bold text-violet-700">{progress}%</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="w-full max-w-sm flex flex-col items-center text-center z-10 pb-1 box-border">
        <div className="flex items-center justify-center gap-1.5 text-xs font-black text-red-600 uppercase tracking-widest">
          <span>PROUDLY NEPAL</span>
          <span className="text-sm">🇳🇵</span>
        </div>
        <p className="text-[10px] font-semibold text-slate-400 mt-1">
          © Unx Games By intraX Pvt Ltd
        </p>
      </div>
    </motion.div>
  );
};

export default UnifiedAppLoadingScreen;
