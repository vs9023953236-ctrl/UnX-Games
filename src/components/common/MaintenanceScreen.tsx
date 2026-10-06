import React, { useState, useEffect } from 'react';
import { useStore } from '../../context/StoreContext';
import { useAuth } from '../../context/AuthContext';
import { AppLogo } from './AppLogo';
import { PerfectAppSpinner } from './PerfectAppSpinner';
import {
  Wrench,
  Clock,
  Sparkles,
  MessageCircle,
  ExternalLink,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { motion } from 'motion/react';

interface MaintenanceScreenProps {
  onDismissPreview?: () => void;
  isPreview?: boolean;
}

export const MaintenanceScreen: React.FC<MaintenanceScreenProps> = ({
  onDismissPreview,
  isPreview = false,
}) => {
  const { appSettings, refreshSettings } = useStore();
  const { isAdmin } = useAuth();

  const maintenanceUntil = appSettings?.maintenanceUntil;
  const [timeLeft, setTimeLeft] = useState<{ hours: number; minutes: number; seconds: number } | null>(null);

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
  }, []);

  useEffect(() => {
    if (!maintenanceUntil) {
      setTimeLeft(null);
      return;
    }

    const calculateTime = () => {
      const target = new Date(maintenanceUntil).getTime();
      const now = Date.now();
      const diff = Math.max(0, Math.floor((target - now) / 1000));

      if (diff <= 0) {
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0 });
        if (!isPreview) {
          refreshSettings();
        }
        return;
      }

      const hours = Math.floor(diff / 3600);
      const minutes = Math.floor((diff % 3600) / 60);
      const seconds = diff % 60;
      setTimeLeft({ hours, minutes, seconds });
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [maintenanceUntil, isPreview]);

  const supportPhone = appSettings?.whatsappNumber || '9768914027';
  const cleanPhone = supportPhone.replace(/[^0-9]/g, '');
  const waUrl = `https://wa.me/977${cleanPhone.replace(/^977/, '')}?text=${encodeURIComponent(
    'Namaste Unx Games! I see the app is currently under scheduled maintenance. I would like to inquire about game top-up or status.'
  )}`;

  const customNotice =
    appSettings?.maintenanceMessage && appSettings.maintenanceMessage.trim().length > 5
      ? appSettings.maintenanceMessage.trim()
      : null;

  const hasActiveCountdown = timeLeft && (timeLeft.hours > 0 || timeLeft.minutes > 0 || timeLeft.seconds > 0);

  return (
    <div
      className={`${
        isPreview
          ? 'relative w-full rounded-3xl min-h-[580px] max-h-[85vh]'
          : 'fixed inset-0 z-[9999] w-full h-[100dvh]'
      } bg-slate-50 text-slate-900 flex flex-col justify-between items-center px-4 py-5 sm:py-6 select-none overflow-y-auto no-scrollbar font-sans box-border`}
    >
      {/* Background Ambient Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 sm:w-96 h-80 sm:h-96 bg-red-500/10 rounded-full blur-[100px] pointer-events-none -z-10" />
      <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 w-72 sm:w-80 h-72 sm:h-80 bg-orange-500/10 rounded-full blur-[100px] pointer-events-none -z-10" />

      {/* Top Header */}
      <header className="w-full max-w-sm flex items-center justify-between text-xs font-semibold px-2 z-10 pt-2 shrink-0">
        {/* Live Working Nepal Time Clock */}
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/90 border border-slate-200/90 text-slate-800 text-[11px] font-bold shadow-xs">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0" />
          <Clock size={12} className="text-red-600 shrink-0" />
          <span className="font-mono font-bold tracking-tight text-slate-800">{nepalTime}</span>
          <span className="text-[9px] font-extrabold text-red-600 uppercase tracking-wide">NPT</span>
        </div>

        {/* Country Badge & Exit Preview */}
        <div className="flex items-center gap-2">
          <div className="px-3 py-1 rounded-full bg-white border border-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 shadow-sm backdrop-blur-xs">
            <span>Nepal</span>
            <span>🇳🇵</span>
          </div>

          {isPreview && onDismissPreview && (
            <button
              type="button"
              onClick={onDismissPreview}
              className="px-3 py-1 rounded-full bg-red-600 hover:bg-red-700 text-white font-black text-xs shadow-md shadow-red-900/30 cursor-pointer transition-all border border-red-400/40 flex items-center gap-1 active:scale-95 shrink-0"
            >
              <span>Exit ✕</span>
            </button>
          )}
        </div>
      </header>

      {/* Center Main Maintenance Content */}
      <main className="w-full max-w-sm my-auto py-3 sm:py-4 flex flex-col items-center text-center z-10 space-y-3.5 sm:space-y-4">
        
        {/* Center Maintenance Visual & Logo with Guaranteed Spinning Ring */}
        <div className="relative flex items-center justify-center pt-2 mb-2">
          <PerfectAppSpinner size="md" theme="amber" showDots={false} />

          {/* Floating maintenance badge indicator */}
          <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 text-slate-950 border-2 border-white flex items-center justify-center shadow-lg shadow-amber-500/40 z-30">
            <Wrench size={14} className="fill-slate-950 stroke-slate-950" />
          </div>
        </div>

        {/* Title & Brand Typography */}
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-[26px] font-black tracking-tight text-slate-900 flex items-center justify-center gap-1.5">
            <span>Under</span>
            <span className="bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent">Maintenance</span>
          </h1>
          <p className="text-xs sm:text-[13px] font-bold text-slate-500 tracking-wide">
            We&apos;re making Unx Games better for you.
          </p>
        </div>

        {/* Status Indicator Pill */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold shadow-sm shadow-amber-500/10 backdrop-blur-xs">
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping shrink-0" />
          <span>Maintenance in progress</span>
        </div>

        {/* Glass Maintenance Card */}
        <div className="w-full bg-white border border-slate-200 rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-lg backdrop-blur-md text-center space-y-3">
          
          <p className="text-xs sm:text-[12.5px] text-slate-600 font-medium leading-relaxed">
            Unx Games is temporarily unavailable while we perform scheduled system upgrades and infrastructure enhancements.
          </p>

          {customNotice && (
            <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-900 text-xs font-semibold leading-normal">
              {customNotice}
            </div>
          )}

          {/* Availability / Countdown Section */}
          <div className="pt-1 border-t border-slate-100">
            {hasActiveCountdown ? (
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                  <Clock size={13} className="text-slate-400" />
                  <span>Estimated Return</span>
                </div>
                {/* Countdown Digit Blocks */}
                <div className="grid grid-cols-3 gap-2 max-w-[220px] mx-auto">
                  <div className="bg-slate-50 border border-slate-200 rounded-xl py-1.5 px-2 text-center">
                    <span className="font-mono text-lg font-black text-slate-800 block leading-tight">
                      {String(timeLeft.hours).padStart(2, '0')}
                    </span>
                    <span className="text-[8.5px] font-bold text-slate-400 tracking-widest uppercase">HRS</span>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-xl py-1.5 px-2 text-center">
                    <span className="font-mono text-lg font-black text-slate-800 block leading-tight">
                      {String(timeLeft.minutes).padStart(2, '0')}
                    </span>
                    <span className="text-[8.5px] font-bold text-slate-400 tracking-widest uppercase">MIN</span>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-xl py-1.5 px-2 text-center">
                    <span className="font-mono text-lg font-black text-orange-600 block leading-tight">
                      {String(timeLeft.seconds).padStart(2, '0')}
                    </span>
                    <span className="text-[8.5px] font-bold text-slate-400 tracking-widest uppercase">SEC</span>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs font-bold text-slate-500 pt-1 flex items-center justify-center gap-1.5">
                <Sparkles size={13} className="text-amber-500" />
                <span>We&apos;ll be back soon. Please check back shortly.</span>
              </p>
            )}
          </div>
        </div>

        {/* Contact / WhatsApp Support Button */}
        <div className="w-full pt-0.5">
          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-2.5 px-4 rounded-xl sm:rounded-2xl bg-emerald-50 hover:bg-emerald-100 active:scale-[0.98] border border-emerald-200 text-emerald-700 text-xs font-extrabold flex items-center justify-center gap-2 transition-all shadow-sm cursor-pointer"
          >
            <MessageCircle size={15} className="text-emerald-600 fill-emerald-600/20" />
            <span>Need help? Contact WhatsApp Support</span>
            <ExternalLink size={13} className="text-emerald-600/70" />
          </a>
        </div>

      </main>

      {/* Footer */}
      <footer className="w-full max-w-sm flex flex-col items-center text-center z-10 pb-1 shrink-0 space-y-1">
        <div
          style={{ fontFamily: "'Caveat', 'Dancing Script', cursive" }}
          className="flex items-center justify-center gap-1 text-lg font-bold text-slate-700"
        >
          <span>Proudly Nepal</span>
          <span className="not-italic text-sm">🇳🇵</span>
        </div>
        <p className="text-[9.5px] font-medium text-slate-400">
          © Unx Games By intraX Pvt Ltd
        </p>
      </footer>
    </div>
  );
};
