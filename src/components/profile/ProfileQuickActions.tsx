import React from 'react';
import { useStore } from '../../context/StoreContext';
import { useAuth } from '../../context/AuthContext';
import {
  MessageCircle,
  ShieldCheck,
  Lock,
  ChevronRight,
  Sparkles,
  Monitor,
  Bot,
} from 'lucide-react';
import { motion } from 'motion/react';

interface ProfileQuickActionsProps {
  waHelpUrl: string;
  onOpen2FAModal?: () => void;
  onOpenActiveSessionsModal?: () => void;
}

export const ProfileQuickActions: React.FC<ProfileQuickActionsProps> = ({
  waHelpUrl,
  onOpen2FAModal,
  onOpenActiveSessionsModal,
}) => {
  const { setCurrentTab } = useStore();
  const { currentUser } = useAuth();

  const isPinActive = Boolean(currentUser?.has_pin || currentUser?.security_pin);
  const is2FAActive = Boolean(
    currentUser?.twoFactorEnabled ?? currentUser?.two_factor_enabled ?? false
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.1 }}
      className="w-full"
    >
      {/* 4-Column Action Tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
        {/* WhatsApp Direct Help */}
        <a
          href={waHelpUrl}
          target="_blank"
          rel="noopener noreferrer"
          id="profile-whatsapp-help-btn"
          className="relative overflow-hidden bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 text-white rounded-2xl p-3.5 sm:p-4 shadow-sm hover:shadow-md hover:from-emerald-700 hover:to-teal-900 active:scale-[0.98] transition-all cursor-pointer group flex flex-col justify-between min-h-[92px] border border-emerald-500/30"
          title="Open WhatsApp Support Chat"
        >
          {/* Subtle Ambient Light */}
          <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full blur-xl pointer-events-none" />

          <div className="flex items-center justify-between relative z-10">
            <div className="w-9 h-9 rounded-xl bg-white/15 backdrop-blur-xs flex items-center justify-center text-white border border-white/20 group-hover:scale-105 transition-transform shadow-xs">
              <MessageCircle size={18} className="stroke-[2.2]" />
            </div>
            
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-xs text-[9px] font-extrabold uppercase tracking-wider text-emerald-100 border border-white/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />
              Live 24/7
            </span>
          </div>

          <div className="relative z-10 pt-2">
            <div className="flex items-center justify-between">
              <span className="text-xs sm:text-sm font-black text-white block tracking-tight leading-snug truncate">
                WhatsApp Help
              </span>
              <ChevronRight size={14} className="text-emerald-200 group-hover:translate-x-0.5 transition-transform shrink-0" />
            </div>
            <span className="text-[10px] sm:text-[11px] text-emerald-100/90 font-medium block truncate mt-0.5">
              Instant Chat Support
            </span>
          </div>
        </a>

        {/* Active Devices & Sessions */}
        <button
          type="button"
          onClick={onOpenActiveSessionsModal}
          id="profile-active-devices-btn"
          className="relative overflow-hidden bg-gradient-to-br from-slate-800 via-slate-900 to-zinc-900 text-white rounded-2xl p-3.5 sm:p-4 shadow-sm hover:shadow-md active:scale-[0.98] transition-all cursor-pointer group flex flex-col justify-between min-h-[92px] text-left border border-slate-700/50"
          title="View & Revoke Active Logged-In Devices"
        >
          <div className="flex items-center justify-between relative z-10">
            <div className="w-9 h-9 rounded-xl bg-white/10 backdrop-blur-xs flex items-center justify-center text-white border border-white/15 group-hover:scale-105 transition-transform shadow-xs">
              <Monitor size={18} className="stroke-[2.2]" />
            </div>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/15 backdrop-blur-xs text-[9px] font-extrabold uppercase tracking-wider text-slate-200 border border-white/15">
              Sessions
            </span>
          </div>

          <div className="relative z-10 pt-2">
            <div className="flex items-center justify-between">
              <span className="text-xs sm:text-sm font-black text-white block tracking-tight leading-snug truncate">
                Active Devices
              </span>
              <ChevronRight size={14} className="text-slate-300 group-hover:translate-x-0.5 transition-transform shrink-0" />
            </div>
            <span className="text-[10px] sm:text-[11px] text-slate-300/90 font-medium block truncate mt-0.5">
              Manage Logged-in Devices
            </span>
          </div>
        </button>
      </div>
    </motion.div>
  );
};
