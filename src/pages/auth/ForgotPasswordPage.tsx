import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useStore } from '../../context/StoreContext';
import { AuthLayout } from '../../components/auth/AuthLayout';
import { OtpCodeInput } from '../../components/auth/OtpCodeInput';
import {
  Mail,
  ArrowRight,
  AlertCircle,
  Loader2,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  CheckCircle2,
  ArrowLeft,
  KeyRound,
  RotateCw,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ForgotPasswordPageProps {
  hideLayout?: boolean;
}

export const ForgotPasswordPage: React.FC<ForgotPasswordPageProps> = ({ hideLayout = false }) => {
  const { sendPasswordResetLink, verifyOtpAndResetPassword } = useAuth();
  const { setCurrentTab, showToast } = useStore();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Flow step: false = Enter Email, true = Enter Code & New Password
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const isMountedRef = React.useRef(true);

  // Clear password inputs, OTP, and messages upon unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      setNewPassword('');
      setConfirmPassword('');
      setOtpCode('');
      setErrorMessage(null);
      setSuccessMessage(null);
      setLoading(false);
    };
  }, []);

  // Resend Cooldown Countdown
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

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

  // Step 1: Send Reset Link / OTP
  const handleSendLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    try {
      const res = await sendPasswordResetLink(trimmedEmail);
      if (res.success) {
        setOtpSent(true);
        setResendCooldown(60);
        setSuccessMessage(`A 6-digit verification code was sent to ${trimmedEmail}.`);
        showToast('success', 'Verification code sent to your email.');
      } else {
        setErrorMessage(res.message || 'Unable to send reset code. Please check your email.');
      }
    } catch {
      setErrorMessage('Connection error. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Reset Password with OTP
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanOtp = otpCode.replace(/\D/g, '');
    if (cleanOtp.length !== 6) {
      setErrorMessage('Please enter all 6 digits of the verification code.');
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      setErrorMessage('New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please verify.');
      return;
    }

    setLoading(true);
    try {
      const res = await verifyOtpAndResetPassword(email.trim().toLowerCase(), cleanOtp, newPassword);
      if (res.success) {
        showToast('success', 'Password reset successfully! You can now sign in.');
        setSuccessMessage('Password reset successfully! Redirecting to sign in...');
        setTimeout(() => {
          setCurrentTab('login');
        }, 1500);
      } else {
        setErrorMessage(res.message || 'Invalid or expired verification code.');
      }
    } catch {
      setErrorMessage('Failed to reset password. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP
  const handleResendCode = async () => {
    if (resendCooldown > 0 || loading) return;
    setErrorMessage(null);
    setLoading(true);
    try {
      const res = await sendPasswordResetLink(email.trim().toLowerCase());
      if (res.success) {
        setResendCooldown(60);
        setSuccessMessage('A fresh verification code was sent.');
        showToast('success', 'Code resent successfully!');
      } else {
        setErrorMessage(res.message || 'Failed to resend code.');
      }
    } catch {
      setErrorMessage('Unable to resend. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const content = (
    <div className="w-full">
      {otpSent ? (
        /* STEP 2: ENTER OTP & NEW PASSWORD */
        <form onSubmit={handleResetPassword} className="flex flex-col gap-4 font-sans">
          <div className="mb-0 text-left">
            <motion.p
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              className="mb-2 text-xs font-extrabold uppercase tracking-[0.16em] text-violet-600 flex items-center gap-1.5"
            >
              <KeyRound size={13} className="text-violet-500 animate-pulse" />
              <span>EXTRA ACCOUNT PROTECTION</span>
            </motion.p>
            <motion.h2
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.05, ease: 'easeOut' }}
              className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl"
            >
              Verify &amp; Reset<span className="text-violet-600 animate-pulse">.</span>
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1, ease: 'easeOut' }}
              className="mt-2 text-sm font-medium leading-6 text-slate-500"
            >
              Enter the 6-digit code sent to <span className="font-bold text-slate-900">{email}</span> and choose a new password.
            </motion.p>
          </div>

          <AnimatePresence mode="wait">
            {errorMessage && (
              <motion.div
                key="reset-err"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                role="alert"
                aria-live="assertive"
                className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2"
              >
                <AlertCircle size={15} className="shrink-0 text-rose-500" />
                <span>{errorMessage}</span>
              </motion.div>
            )}
            {successMessage && (
              <motion.div
                key="reset-succ"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                role="status"
                aria-live="polite"
                className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold flex items-center gap-2"
              >
                <CheckCircle2 size={15} className="shrink-0 text-emerald-500" />
                <span>{successMessage}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* 6 Digit OTP */}
          <div className="flex flex-col gap-1">
            <label htmlFor="otp-code-0" className="text-xs font-bold text-slate-700 text-center">
              6-digit verification code
            </label>
            <OtpCodeInput
              value={otpCode}
              onChange={(value) => {
                setOtpCode(value);
                if (errorMessage) setErrorMessage(null);
              }}
              disabled={loading}
              ariaLabel="Password reset code"
            />
          </div>

          {/* Password & Confirm Password Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* New Password */}
            <div className="flex flex-col gap-0.5">
              <label className="text-xs sm:text-sm font-bold text-slate-700 ml-1 mb-0.5 truncate">New Password</label>
              <div className="relative flex items-center group">
                <div className="absolute left-3.5 text-slate-400 group-focus-within:text-violet-600 pointer-events-none transition-colors">
                  <Lock size={15} />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min 6 chars"
                  className="w-full pl-10 pr-10 py-3.5 min-h-[48px] rounded-[20px] bg-slate-100/60 hover:bg-slate-100 focus:bg-white border border-transparent text-slate-900 placeholder:text-slate-400 text-sm font-bold focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 transition-all outline-none"
                />
                <button
                  type="button"
                  aria-label={showPassword ? 'Hide new password' : 'Show new password'}
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div className="flex flex-col gap-0.5">
              <label className="text-xs sm:text-sm font-bold text-slate-700 ml-1 mb-0.5 truncate">Confirm</label>
              <div className="relative flex items-center group">
                <div className="absolute left-3.5 text-slate-400 group-focus-within:text-violet-600 pointer-events-none transition-colors">
                  <Lock size={15} />
                </div>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter"
                  className="w-full pl-10 pr-10 py-3.5 min-h-[48px] rounded-[20px] bg-slate-100/60 hover:bg-slate-100 focus:bg-white border border-transparent text-slate-900 placeholder:text-slate-400 text-sm font-bold focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 transition-all outline-none"
                />
                <button
                  type="button"
                  aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 transition-colors cursor-pointer"
                >
                  {showConfirmPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
          </div>

          {/* Password strength */}
          {newPassword.length > 0 && (
            <div className="flex items-center gap-2 px-0.5">
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

          {/* Submit Reset Button - High Energy Framer Motion Animated Button */}
          <motion.button
            whileTap={{ scale: 0.97 }}
            whileHover={{ scale: 1.02, y: -1 }}
            type="submit"
            disabled={loading || otpCode.replace(/\D/g, '').length !== 6 || !newPassword}
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
                    Updating Password...
                  </motion.span>
                  <span className="inline-flex items-center gap-1 ml-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-300 animate-ping" />
                  </span>
                </>
              ) : (
                <>
                  <ShieldCheck size={18} className="text-cyan-300" />
                  <span className="tracking-wide font-black text-white">Reset Password</span>
                </>
              )}
            </span>
          </motion.button>

          {/* Resend & Back */}
          <div className="flex items-center justify-between text-[11px] sm:text-xs pt-1 font-semibold text-slate-500">
            <button
              type="button"
              onClick={() => {
                setOtpSent(false);
                setOtpCode('');
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              className="text-slate-500 hover:text-violet-600 transition-colors cursor-pointer"
            >
              ← Edit Email
            </button>
            <button
              type="button"
              disabled={resendCooldown > 0 || loading}
              onClick={handleResendCode}
              className="text-violet-600 hover:text-violet-700 font-bold transition-colors cursor-pointer disabled:text-slate-400"
            >
              {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code'}
            </button>
          </div>
        </form>
      ) : (
        /* STEP 1: ENTER EMAIL TO RECEIVE CODE */
        <form onSubmit={handleSendLink} className="flex flex-col gap-4 font-sans">
          <div className="mb-0 text-left">
            <motion.p
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              className="mb-2 text-xs font-extrabold uppercase tracking-[0.16em] text-violet-600 flex items-center gap-1.5"
            >
              <ShieldCheck size={14} className="text-violet-500 animate-pulse" />
              <span>ACCOUNT RECOVERY</span>
            </motion.p>
            <motion.h2
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.05, ease: 'easeOut' }}
              className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl"
            >
              Forgot password<span className="text-violet-600 animate-pulse">?</span>
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1, ease: 'easeOut' }}
              className="mt-2 text-sm font-medium leading-6 text-slate-500"
            >
              Enter the email linked to your account. We’ll send you a secure verification code.
            </motion.p>
          </div>

          <AnimatePresence mode="wait">
            {errorMessage && (
              <motion.div
                key="fp-err"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                role="alert"
                aria-live="assertive"
                className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2"
              >
                <AlertCircle size={14} className="shrink-0 text-rose-500" />
                <span>{errorMessage}</span>
              </motion.div>
            )}
            {successMessage && (
              <motion.div
                key="fp-succ"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                role="status"
                aria-live="polite"
                className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold flex items-center gap-2"
              >
                <CheckCircle2 size={14} className="shrink-0 text-emerald-500" />
                <span>{successMessage}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Email Input */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="password-reset-email" className="text-xs sm:text-sm font-bold text-slate-700 ml-1">
              Email Address
            </label>
            <div className="relative flex items-center group">
              <div className="absolute left-4 text-slate-400 group-focus-within:text-violet-600 pointer-events-none transition-colors">
                <Mail size={16} />
              </div>
              <input
                id="password-reset-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                placeholder="you@email.com"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3.5 pl-11 pr-4 text-sm font-semibold text-slate-900 outline-none transition placeholder:font-medium placeholder:text-slate-400 hover:border-slate-300 focus:border-violet-500 focus:bg-white focus:ring-4 focus:ring-violet-500/10"
                autoFocus
              />
            </div>

            {/* Helper text under email enter */}
            <div className="flex items-start gap-1.5 px-1 pt-1 text-[11px] sm:text-xs font-medium text-slate-500 leading-normal">
              <ShieldCheck size={14} className="shrink-0 text-violet-600 mt-0.5" />
              <span>We will send a 6-digit verification code to this email to safely reset your password.</span>
            </div>
          </div>

          {/* Submit Button - High Energy Framer Motion Animated Button */}
          <motion.button
            whileTap={{ scale: 0.97 }}
            whileHover={{ scale: 1.02, y: -1 }}
            type="submit"
            disabled={loading}
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
                    Sending Code...
                  </motion.span>
                  <span className="inline-flex items-center gap-1 ml-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-300 animate-ping" />
                  </span>
                </>
              ) : (
                <>
                  <span className="tracking-wide font-black text-white">Send Verification Code</span>
                  <motion.div
                    animate={{ x: [0, 4, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    <ArrowRight size={18} className="text-cyan-300 stroke-[2.5]" />
                  </motion.div>
                </>
              )}
            </span>
          </motion.button>

          {/* Back to Login & Switch Link */}
          <div className="pt-2 text-center">
            <p className="text-xs sm:text-sm font-semibold text-slate-500">
              Remember your password?{' '}
              <button
                type="button"
                onClick={() => setCurrentTab('login')}
                className="font-extrabold text-violet-600 hover:text-violet-700 hover:underline cursor-pointer"
              >
                Sign In
              </button>
            </p>
          </div>

          <div className="text-center pt-1 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setCurrentTab('login')}
              className="inline-flex items-center gap-1.5 text-[11px] sm:text-xs font-bold text-slate-500 hover:text-violet-600 transition-colors cursor-pointer"
            >
              <ArrowLeft size={13} />
              <span>Back to Sign In</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );

  if (hideLayout) {
    return content;
  }

  return (
    <AuthLayout activeTab="forgot_password">
      {content}
    </AuthLayout>
  );
};
export default ForgotPasswordPage;
