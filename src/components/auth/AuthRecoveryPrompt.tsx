import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  RefreshCw, 
  LogIn, 
  UserCheck, 
  AlertTriangle, 
  ChevronDown, 
  ChevronUp, 
  Trash2, 
  Store,
  ShieldAlert,
  CheckCircle2
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useStore } from '../../context/StoreContext';

interface AuthRecoveryPromptProps {
  variant?: 'banner' | 'card' | 'fullscreen';
  title?: string;
  description?: string;
  onDismiss?: () => void;
}

export const AuthRecoveryPrompt: React.FC<AuthRecoveryPromptProps> = ({
  variant = 'card',
  title = 'Authentication Session Notice',
  description,
  onDismiss,
}) => {
  const { 
    authStatus, 
    authRecoveryError, 
    authRecoveryState, 
    isRevalidating, 
    forceRevalidateAuth, 
    clearAuthRecoveryError,
    resetAuthSessionCache,
    setRedirectAfterAuth,
  } = useAuth();
  const { setCurrentTab } = useStore();

  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  const handleRetry = async () => {
    setActionSuccessMsg(null);
    const res = await forceRevalidateAuth({ forceSupabaseRefresh: true });
    if (res.success) {
      setActionSuccessMsg('Session successfully recovered and verified!');
      setTimeout(() => setActionSuccessMsg(null), 3000);
      if (onDismiss) onDismiss();
    }
  };

  const handleGoToLogin = () => {
    clearAuthRecoveryError();
    setRedirectAfterAuth(null);
    setCurrentTab('login');
    if (onDismiss) onDismiss();
  };

  const handleContinueAsGuest = () => {
    clearAuthRecoveryError();
    setCurrentTab('home');
    if (onDismiss) onDismiss();
  };

  const handleClearCache = async () => {
    await resetAuthSessionCache();
    setActionSuccessMsg('Session cache cleaned successfully.');
    setTimeout(() => setActionSuccessMsg(null), 2500);
  };

  const defaultDesc = description || (
    authRecoveryError 
      ? authRecoveryError 
      : authStatus === 'loading' 
        ? 'Session verification is taking longer than 5 seconds. You can re-validate with Supabase or continue.' 
        : 'Your session state could not be confirmed. Re-validating against Supabase will restore your logged-in access.'
  );

  if (variant === 'fullscreen') {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md bg-white rounded-3xl p-6 border border-slate-200/90 shadow-xl space-y-5"
        >
          <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 mx-auto">
            <ShieldAlert size={26} />
          </div>

          <div className="text-center space-y-1.5">
            <h3 className="text-base font-black text-slate-900">{title}</h3>
            <p className="text-xs text-slate-600 font-medium leading-relaxed max-w-sm mx-auto">
              {defaultDesc}
            </p>
          </div>

          {actionSuccessMsg && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold flex items-center gap-2">
              <CheckCircle2 size={16} className="shrink-0" />
              <span>{actionSuccessMsg}</span>
            </div>
          )}

          {/* Action buttons */}
          <div className="space-y-2.5 pt-1">
            <button
              type="button"
              onClick={handleRetry}
              disabled={isRevalidating}
              className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 hover:from-violet-700 hover:to-indigo-700 text-white font-bold text-xs shadow-md shadow-violet-200 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 active:scale-[0.98]"
            >
              <RefreshCw size={15} className={isRevalidating ? 'animate-spin' : ''} />
              <span>{isRevalidating ? 'Re-validating Session against Supabase...' : 'Re-validate Session (Supabase)'}</span>
            </button>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleGoToLogin}
                className="py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <LogIn size={14} />
                <span>Sign In Again</span>
              </button>

              <button
                type="button"
                onClick={handleContinueAsGuest}
                className="py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Store size={14} />
                <span>Browse Store</span>
              </button>
            </div>
          </div>

          {/* Diagnostics toggle */}
          <div className="pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowDiagnostics(!showDiagnostics)}
              className="w-full py-1 text-[11px] text-slate-500 font-medium hover:text-slate-700 flex items-center justify-between cursor-pointer"
            >
              <span>Session Diagnostics &amp; Recovery Tools</span>
              {showDiagnostics ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>

            <AnimatePresence>
              {showDiagnostics && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden space-y-2 pt-2 text-[10px] text-slate-600"
                >
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70 font-mono space-y-1">
                    <div><strong>Auth Status:</strong> {authStatus}</div>
                    <div><strong>Recovery State:</strong> {authRecoveryState}</div>
                    <div><strong>Revalidating:</strong> {String(isRevalidating)}</div>
                    <div><strong>Timestamp:</strong> {new Date().toLocaleTimeString()}</div>
                  </div>

                  <button
                    type="button"
                    onClick={handleClearCache}
                    className="w-full py-2 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-[10px] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Trash2 size={12} />
                    <span>Clear Stale Session Tokens</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    );
  }

  // Card variant
  return (
    <div className="p-4 rounded-2xl bg-amber-50/90 border border-amber-200/90 text-slate-800 shadow-sm space-y-3">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-xl bg-amber-100 border border-amber-200 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
          <AlertTriangle size={16} />
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="text-xs font-black text-slate-900">{title}</h4>
          <p className="text-[11px] text-slate-600 font-medium leading-relaxed mt-0.5">
            {defaultDesc}
          </p>
        </div>
      </div>

      {actionSuccessMsg && (
        <div className="p-2 rounded-lg bg-emerald-100 text-emerald-800 text-[11px] font-bold flex items-center gap-1.5">
          <CheckCircle2 size={13} />
          <span>{actionSuccessMsg}</span>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 pt-0.5">
        <button
          type="button"
          onClick={handleRetry}
          disabled={isRevalidating}
          className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-bold text-xs shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-60 transition-all active:scale-95"
        >
          <RefreshCw size={13} className={isRevalidating ? 'animate-spin' : ''} />
          <span>{isRevalidating ? 'Checking...' : 'Re-validate Supabase'}</span>
        </button>

        <button
          type="button"
          onClick={handleGoToLogin}
          className="px-3 py-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
        >
          <LogIn size={13} />
          <span>Sign In</span>
        </button>

        <button
          type="button"
          onClick={handleContinueAsGuest}
          className="px-3 py-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
        >
          <Store size={13} />
          <span>Browse as Guest</span>
        </button>
      </div>
    </div>
  );
};
