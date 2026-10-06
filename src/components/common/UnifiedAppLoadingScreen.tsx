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

  useEffect(() => {
    const clockInterval = setInterval(() => {
      setNepalTime(getFormattedNepalTime());
    }, 1000);

    return () => clearInterval(clockInterval);
  }, []);

  return (
    <motion.div
      id="ghn-unified-splash"
      initial={{ opacity: 1 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      className="fixed inset-0 z-[9999999] bg-[#FAFBFF] text-slate-900 flex flex-col justify-between items-center px-4 py-6 select-none overflow-hidden font-sans h-full h-[100dvh] w-full w-[100dvw] box-border overscroll-none pointer-events-auto transform-gpu"
      style={{
        overscrollBehavior: 'none',
        touchAction: 'none',
        paddingTop: 'max(1.25rem, env(safe-area-inset-top, 1.25rem))',
        paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom, 1.25rem))',
      }}
    >
      {/* Background Ambient High-Definition Lighting FX (Hardware GPU Accelerated) */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] sm:w-[420px] h-[300px] sm:h-[420px] bg-gradient-to-tr from-violet-200/40 via-indigo-100/35 to-fuchsia-200/30 rounded-full blur-3xl pointer-events-none -z-10 transform-gpu" />
      <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 w-[240px] sm:w-[320px] h-[240px] sm:h-[320px] bg-indigo-100/30 rounded-full blur-2xl pointer-events-none -z-10 transform-gpu" />

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
          <div className="text-[26px] sm:text-[30px] font-black tracking-tight text-slate-900 flex items-center justify-center gap-2 leading-tight">
            <span>UNX</span>
            <span className="bg-gradient-to-r from-violet-600 via-indigo-600 to-fuchsia-600 bg-clip-text text-transparent">
              GAMES
            </span>
          </div>

          <div className="mt-2.5 w-full flex items-center justify-center">
            <div className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-violet-50 via-indigo-50 to-fuchsia-50 border border-violet-200/90 shadow-xs max-w-full">
              <Sparkles size={13} className="text-amber-500 animate-pulse shrink-0" />
              <span className="text-[11px] sm:text-xs font-black uppercase text-transparent bg-clip-text bg-gradient-to-r from-violet-700 via-indigo-600 to-purple-700 tracking-wide text-center leading-normal">
                {message || 'LOADING UNX GAMES...'}
              </span>
              <Sparkles size={13} className="text-amber-500 animate-pulse shrink-0" />
            </div>
          </div>
        </div>

        <div className="mb-4 pt-1 w-full text-center">
          <div className="text-xs sm:text-sm font-black tracking-wider text-slate-500 uppercase">
            NEPAL&apos;S #1 GAME TOP-UP &amp; VOUCHER APP
          </div>
        </div>

        <div className="flex items-center justify-center gap-2 text-sm font-extrabold text-violet-600 bg-violet-50/90 border border-violet-100 px-4.5 py-2 rounded-full shadow-xs">
          <span>Loading</span>
          <span className="inline-flex gap-1 items-center">
            <span className="w-1.5 h-1.5 rounded-full bg-violet-600 animate-bounce [animation-delay:-0.3s]" />
            <span className="w-1.5 h-1.5 rounded-full bg-violet-600 animate-bounce [animation-delay:-0.15s]" />
            <span className="w-1.5 h-1.5 rounded-full bg-violet-600 animate-bounce" />
          </span>
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
