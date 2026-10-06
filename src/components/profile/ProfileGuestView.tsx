import React from 'react';
import { useStore } from '../../context/StoreContext';
import { AppLogo } from '../common/AppLogo';
import { PWAInstallButton } from '../common/PWAInstallButton';
import {
  LogIn,
  UserPlus,
  Zap,
  CheckCircle2,
  ShieldCheck,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { motion } from 'motion/react';

export const ProfileGuestView: React.FC = () => {
  const { setCurrentTab } = useStore();

  return (
    <div className="w-full flex-1 flex flex-col items-center justify-center px-2 py-2 max-w-md mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full space-y-4 text-center"
      >
        {/* Brand Banner Card */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="inline-flex mx-auto rounded-[20px] shadow-sm overflow-hidden">
            <AppLogo size="md" glow={false} className="rounded-[20px] overflow-hidden" imageClassName="rounded-[20px] object-cover" />
          </div>

          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-red-50 border border-red-100 text-red-700 font-extrabold text-[11px] uppercase tracking-wider">
              <Sparkles size={12} className="text-amber-500" />
              <span>Gamer Portal Nepal</span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight pt-1">
              Welcome to Unx Games
            </h1>
            <p className="text-xs text-slate-500 font-medium max-w-xs mx-auto leading-relaxed">
              Sign in or create an account to manage top-ups, track live orders, and unlock exclusive gamer offers.
            </p>
          </div>

          {/* Quick Features Highlight */}
          <div className="grid grid-cols-2 gap-2 text-left pt-1">
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
              <div className="w-7 h-7 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                <Zap size={15} />
              </div>
              <h2 className="text-xs font-black text-slate-900">5-15 Min Delivery</h2>
              <p className="text-[10px] text-slate-500 font-medium leading-tight">Instant UID top-up</p>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
              <div className="w-7 h-7 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <CheckCircle2 size={15} />
              </div>
              <h2 className="text-xs font-black text-slate-900">eSewa &amp; Khalti</h2>
              <p className="text-[10px] text-slate-500 font-medium leading-tight">Official Nepal QR</p>
            </div>
          </div>

          {/* Main Action Buttons */}
          <div className="space-y-2 pt-2">
            <button
              type="button"
              onClick={() => setCurrentTab('login')}
              className="w-full h-11 sm:h-12 rounded-2xl bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 active:scale-[0.98] text-white font-black text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-red-600/30 transition-all cursor-pointer"
            >
              <LogIn size={17} className="stroke-[2.5]" />
              <span>Sign In to Account</span>
            </button>

            <button
              type="button"
              onClick={() => setCurrentTab('register')}
              className="w-full h-11 sm:h-12 rounded-2xl bg-slate-50 hover:bg-slate-100 active:scale-[0.98] border border-slate-200/90 text-slate-800 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs"
            >
              <UserPlus size={16} className="text-red-600" />
              <span>Create New Account</span>
            </button>

            <PWAInstallButton variant="full" />
          </div>

          {/* Guest Link */}
          <div className="pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setCurrentTab('shop')}
              className="text-xs font-bold text-slate-500 hover:text-red-600 transition-colors inline-flex items-center gap-1 cursor-pointer"
            >
              <span>Explore products as guest</span>
              <ArrowRight size={13} />
            </button>
          </div>
        </div>

        {/* Bottom Trust Badge */}
        <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400 font-medium">
          <ShieldCheck size={14} className="text-emerald-600" />
          <span>100% Safe &amp; Verified Nepalese Platform</span>
        </div>
      </motion.div>
    </div>
  );
};
