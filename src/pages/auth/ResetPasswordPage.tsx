import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { AuthLayout } from '../../components/auth/AuthLayout';
import {
  Lock,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Eye,
  EyeOff,
  ShieldCheck,
  ArrowLeft,
  KeyRound,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ResetPasswordPageProps {
  hideLayout?: boolean;
}

export const ResetPasswordPage: React.FC<ResetPasswordPageProps> = ({ hideLayout = false }) => {
  const { setCurrentTab, showToast } = useStore();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Password strength calculation
  const getPasswordStrength = (pass: string) => {
    if (!pass) return { score: 0, label: 'None', color: 'bg-slate-200', text: 'text-slate-400', width: '0%' };
    let score = 0;
    if (pass.length >= 6) score += 1;
    if (pass.length >= 8) score += 1;
    if (/[A-Z]/.test(pass)) score += 1;
    if (/[0-9]/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;

    if (score <= 1) return { score: 1, label: 'Weak', color: 'bg-rose-500', text: 'text-rose-600', width: '25%' };
    if (score <= 3) return { score: 2, label: 'Fair', color: 'bg-amber-500', text: 'text-amber-600', width: '50%' };
    if (score === 4) return { score: 3, label: 'Good', color: 'bg-blue-500', text: 'text-blue-600', width: '75%' };
    return { score: 4, label: 'Strong', color: 'bg-emerald-500', text: 'text-emerald-600', width: '100%' };
  };

  const strength = getPasswordStrength(newPassword);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!newPassword || newPassword.length < 6) {
      setErrorMessage('Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please verify.');
      return;
    }

    setLoading(true);
    try {
      const sb = (await import('../../lib/supabase')).getClientSupabase();
      if (!sb) throw new Error('Supabase client not initialized');

      const { error } = await sb.auth.updateUser({ password: newPassword });
      if (error) throw error;

      setSuccessMessage('Password updated successfully! Taking you to sign in...');
      showToast('success', 'Password reset successfully!');

      await sb.auth.signOut();
      window.location.hash = '';

      setTimeout(() => {
        setCurrentTab('login');
      }, 1500);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const content = (
    <div className="w-full">
      <form onSubmit={handleResetPassword} className="flex flex-col gap-4 font-sans">
        <div className="text-center mb-0.5">
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center justify-center gap-2">
            <span>Set New Password</span>
            <KeyRound size={20} className="text-violet-600" />
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1.5">
            Create a secure password for your Unx Games account
          </p>
        </div>

        <AnimatePresence mode="wait">
          {errorMessage && (
            <motion.div
              key="reset-page-error"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
              className="p-2.5 rounded-xl bg-rose-50 border border-rose-200/90 text-rose-700 text-xs font-semibold flex items-center gap-2"
            >
              <AlertCircle size={15} className="shrink-0 text-rose-500" />
              <span>{errorMessage}</span>
            </motion.div>
          )}

          {successMessage && (
            <motion.div
              key="reset-page-success"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
              className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200/90 text-emerald-700 text-xs font-semibold flex items-center gap-2"
            >
              <CheckCircle2 size={15} className="shrink-0 text-emerald-500" />
              <span>{successMessage}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 1. New Password */}
        <div className="flex flex-col gap-0.5">
          <label htmlFor="reset-new-password" className="text-xs sm:text-sm font-bold text-slate-700 ml-1 mb-0.5">New Password</label>
          <div className="relative flex items-center group">
            <div className="absolute left-4 text-slate-400 group-focus-within:text-violet-600 pointer-events-none transition-colors">
              <Lock size={16} />
            </div>
            <input
              id="reset-new-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => {
                setNewPassword(e.target.value);
                if (errorMessage) setErrorMessage(null);
              }}
              placeholder="At least 6 characters"
              className="w-full pl-11 pr-12 py-3.5 min-h-[48px] rounded-[20px] bg-slate-100/60 hover:bg-slate-100 focus:bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 text-sm font-bold focus:border-slate-400 focus:ring-0 transition-all outline-none"
              autoFocus
            />
            <button
              type="button"
              aria-label={showPassword ? 'Hide new password' : 'Show new password'}
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 transition-colors cursor-pointer"
            >
              {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>

          {/* Password strength indicator */}
          {newPassword.length > 0 && (
            <div className="flex items-center gap-2 px-0.5 mt-0.5">
              <div className="flex-1 h-1 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${strength.color}`}
                  style={{ width: strength.width }}
                />
              </div>
              <span className={`text-[9px] font-black ${strength.text}`}>
                {strength.label}
              </span>
            </div>
          )}
        </div>

        {/* 2. Confirm Password */}
        <div className="flex flex-col gap-0.5">
          <label htmlFor="reset-confirm-password" className="text-xs sm:text-sm font-bold text-slate-700 ml-1 mb-0.5">Confirm New Password</label>
          <div className="relative flex items-center group">
            <div className="absolute left-4 text-slate-400 group-focus-within:text-slate-700 pointer-events-none transition-colors">
              <Lock size={16} />
            </div>
            <input
              id="reset-confirm-password"
              type={showConfirmPassword ? 'text' : 'password'}
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                if (errorMessage) setErrorMessage(null);
              }}
              placeholder="Re-enter your password"
              className="w-full pl-11 pr-12 py-3.5 min-h-[48px] rounded-[20px] bg-slate-100/60 hover:bg-slate-100 focus:bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 text-sm font-bold focus:border-slate-400 focus:ring-0 transition-all outline-none"
            />
            <button
              type="button"
              aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 transition-colors cursor-pointer"
            >
              {showConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
          {confirmPassword && newPassword !== confirmPassword && (
            <span className="text-[10px] font-bold text-rose-500 mt-0.5">Passwords do not match</span>
          )}
        </div>

        {/* Submit Button - High Energy Framer Motion Animated Button */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          whileHover={{ scale: 1.02, y: -1 }}
          type="submit"
          disabled={loading || !newPassword || newPassword.length < 6}
          className="group relative mt-3 flex min-h-[52px] w-full cursor-pointer items-center justify-center overflow-hidden rounded-2xl p-[2px] transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {/* Outer Glowing Pulsing Backdrop */}
          <motion.div
            animate={{
              opacity: [0.5, 0.85, 0.5],
              scale: [0.99, 1.03, 0.99],
            }}
            transition={{
              duration: 2.4,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            className="absolute inset-0 bg-gradient-to-r from-violet-600 via-fuchsia-500 to-indigo-600 rounded-2xl blur-md"
          />

          {/* Outer Flowing Gradient Border */}
          <motion.div
            animate={{
              backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: 'linear',
            }}
            className="absolute inset-0 rounded-2xl bg-gradient-to-r from-violet-500 via-fuchsia-400 to-indigo-500 bg-[length:200%_200%]"
          />

          {/* Inner Content Container */}
          <span className="relative flex h-full w-full items-center justify-center gap-2.5 rounded-[14px] bg-gradient-to-r from-violet-800 via-indigo-700 to-violet-900 px-5 py-3.5 text-sm sm:text-base font-black text-white shadow-inner overflow-hidden transition-all duration-200 group-hover:brightness-110">
            {/* Animated Shimmer Sweep Light Beam */}
            <motion.div
              animate={{
                x: ['-120%', '220%'],
              }}
              transition={{
                duration: 2.2,
                repeat: Infinity,
                ease: 'easeInOut',
                repeatDelay: 0.5,
              }}
              className="absolute inset-0 w-1/2 h-full bg-gradient-to-r from-transparent via-white/35 to-transparent transform -skew-x-12 pointer-events-none"
            />

            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin text-cyan-300 shrink-0" />
                <motion.span
                  animate={{ opacity: [0.7, 1, 0.7] }}
                  transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
                  className="tracking-wide font-black text-white"
                >
                  Saving Password...
                </motion.span>
                <span className="inline-flex items-center gap-1 ml-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-300 animate-ping" />
                </span>
              </>
            ) : (
              <>
                <ShieldCheck size={18} className="text-cyan-300" />
                <span className="tracking-wide font-black text-white">Save New Password</span>
              </>
            )}
          </span>
        </motion.button>

        {/* Back to Login */}
        <div className="text-center pt-1.5 border-t border-slate-100 mt-0.5">
          <button
            type="button"
            onClick={() => setCurrentTab('login')}
            className="inline-flex items-center gap-1.5 text-[11px] sm:text-xs font-bold text-slate-600 hover:text-violet-600 transition-colors cursor-pointer"
          >
            <ArrowLeft size={13} />
            <span>Back to Sign In</span>
          </button>
        </div>
      </form>
    </div>
  );

  if (hideLayout) {
    return content;
  }

  return (
    <AuthLayout activeTab="reset_password">
      {content}
    </AuthLayout>
  );
};
export default ResetPasswordPage;
