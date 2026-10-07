import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useStore } from '../../context/StoreContext';
import { AuthLayout } from '../../components/auth/AuthLayout';
import { OtpCodeInput } from '../../components/auth/OtpCodeInput';
import { SocialLoginButtons } from '../../components/auth/SocialLoginButtons';
import { AppLoadingScreen } from '../../components/common/AppLoadingScreen';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
  Loader2,
  CheckCircle2,
  ShieldCheck,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface LoginPageProps {
  hideLayout?: boolean;
}

export const LoginPage: React.FC<LoginPageProps> = ({ hideLayout = false }) => {
  const { currentUser, login, verify2FA, redirectAfterAuth, setRedirectAfterAuth, logout } = useAuth();
  const { setIsAdminView, setAdminTab, setCurrentTab, appSettings, showToast } = useStore();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // States for 2FA verification
  const [loading, setLoading] = useState(false);
  const [requires2FA, setRequires2FA] = useState(false);
  const [factorId, setFactorId] = useState<string | undefined>(undefined);
  const [tempEmail, setTempEmail] = useState('');
  const [otp, setOtp] = useState('');

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const isMountedRef = useRef(true);

  // Clear sensitive credentials, OTP, and error states upon unmount/navigation away
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      setPassword('');
      setOtp('');
      setErrorMessage(null);
      setSuccessMessage(null);
      setLoading(false);
    };
  }, []);

  // Automatically navigate if user is already authenticated
  useEffect(() => {
    if (currentUser) {
      const role = String(currentUser.role || '').toUpperCase();
      const isUserAdmin = ['SUPER_ADMIN', 'STORE_OWNER', 'STORE_MANAGER', 'SUPPORT_STAFF'].includes(role);
      if (isUserAdmin) {
        setIsAdminView(true);
        setAdminTab('overview');
        setCurrentTab('admin');
      } else if (redirectAfterAuth && redirectAfterAuth !== 'admin') {
        const destination = redirectAfterAuth;
        setRedirectAfterAuth(null);
        setCurrentTab(destination);
      } else {
        setIsAdminView(false);
        setCurrentTab('home');
      }
    }
  }, [currentUser, redirectAfterAuth, setRedirectAfterAuth, setIsAdminView, setAdminTab, setCurrentTab]);

  const handleMaintenanceCheck = async (user: any) => {
    const role = String(user?.role || '').toUpperCase();
    const isUserAdmin = ['SUPER_ADMIN', 'STORE_OWNER', 'STORE_MANAGER', 'SUPPORT_STAFF'].includes(role);

    if (appSettings?.maintenanceMode && !isUserAdmin) {
      await logout();
      setErrorMessage('Unx Games is currently under maintenance. Please try again later.');
      setCurrentTab('home');
      return false;
    }
    return true;
  };

  const navigateAfterSuccess = async (user?: any) => {
    if (user) {
      const allowed = await handleMaintenanceCheck(user);
      if (!allowed) return;
    }

    const role = String(user?.role || '').toUpperCase();
    const isUserAdmin = ['SUPER_ADMIN', 'STORE_OWNER', 'STORE_MANAGER', 'SUPPORT_STAFF'].includes(role);

    setSuccessMessage('Login successful! Welcome back 🎉');
    showToast('success', `Welcome back, ${user?.name || user?.username || 'Gamer'}!`);

    if (isUserAdmin) {
      setIsAdminView(true);
      setAdminTab('overview');
      setCurrentTab('admin');
    } else if (redirectAfterAuth && redirectAfterAuth !== 'admin') {
      const destination = redirectAfterAuth;
      setRedirectAfterAuth(null);
      setCurrentTab(destination);
    } else {
      setIsAdminView(false);
      setCurrentTab('home');
    }
  };

  const handleVerify2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanOtp = otp.trim().replace(/\D/g, '');
    if (!cleanOtp || cleanOtp.length !== 6) {
      setErrorMessage('Please enter the exact 6-digit code from your authenticator app.');
      return;
    }
    setLoading(true);
    try {
      const res = await verify2FA(tempEmail, cleanOtp, factorId);
      if (res.success && res.user) {
        navigateAfterSuccess(res.user);
      } else {
        setErrorMessage(res.message || 'Invalid or expired authenticator code.');
      }
    } catch {
      setErrorMessage('Verification failed. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanIdentifier = identifier.trim();
    if (!cleanIdentifier) {
      setErrorMessage('Please enter your email address or phone number.');
      return;
    }
    if (!password) {
      setErrorMessage('Please enter your password.');
      return;
    }

    setLoading(true);
    try {
      const res = await login(cleanIdentifier, password);
      if (res.requires2FA) {
        setRequires2FA(true);
        setFactorId(res.factorId);
        setTempEmail(res.email || cleanIdentifier);
        setSuccessMessage(res.message || 'Enter the 6-digit code from your authenticator app.');
        return;
      }
      if (res.success) {
        navigateAfterSuccess(res.user);
      } else {
        setErrorMessage(res.message || 'Invalid email/phone or password. Please verify your credentials.');
      }
    } catch {
      setErrorMessage('Unable to connect. Please check your internet connection.');
    } finally {
      setLoading(false);
    }
  };

  const content = (
    <div className="w-full">
      {requires2FA ? (
        /* 2FA OTP VIEW */
        <form onSubmit={handleVerify2FA} className="flex flex-col gap-5 font-sans">
          <div className="mb-0 text-left">
            <motion.p
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              className="mb-2 text-xs font-extrabold uppercase tracking-[0.16em] text-violet-600 flex items-center gap-1.5"
            >
              <ShieldCheck size={14} className="text-violet-500 animate-pulse" />
              <span>EXTRA ACCOUNT PROTECTION</span>
            </motion.p>
            <motion.h2
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.05, ease: 'easeOut' }}
              className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl"
            >
              Verify it’s you<span className="text-violet-600 animate-pulse">.</span>
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1, ease: 'easeOut' }}
              className="mt-2 text-sm font-medium leading-6 text-slate-500"
            >
              Open your authenticator app and enter the 6-digit code to finish signing in.
            </motion.p>
          </div>

          <AnimatePresence mode="wait">
            {errorMessage && (
              <motion.div
                key="login-2fa-error"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15 }}
                role="alert"
                aria-live="assertive"
                className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700"
              >
                <AlertCircle size={15} className="shrink-0 text-rose-500" />
                <span>{errorMessage}</span>
              </motion.div>
            )}
            {successMessage && (
              <motion.div
                key="login-2fa-success"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                role="status"
                aria-live="polite"
                className="flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-700"
              >
                <ShieldCheck size={16} className="shrink-0 text-emerald-600" />
                <span>{successMessage}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="rounded-2xl border border-violet-100 bg-violet-50/60 p-3.5 sm:p-4">
            <div className="mb-1 flex items-center justify-between gap-2 px-1">
              <label className="text-sm font-extrabold text-slate-800" htmlFor="otp-code-0">
                Authentication code
              </label>
              <span className="text-[11px] font-bold text-slate-400">6 digits</span>
            </div>
            <OtpCodeInput
              value={otp}
              onChange={(value) => {
                setOtp(value);
                if (errorMessage) setErrorMessage(null);
              }}
              disabled={loading}
              ariaLabel="Authentication code"
            />
            <p className="mt-1 text-center text-xs font-medium text-slate-500">
              Use the current code from your authenticator app.
            </p>
          </div>

          <motion.button
            whileTap={{ scale: 0.97 }}
            whileHover={{ scale: 1.02, y: -1 }}
            type="submit"
            disabled={loading || otp.replace(/\D/g, '').length !== 6}
            className="group relative mt-2 flex min-h-[52px] w-full cursor-pointer items-center justify-center overflow-hidden rounded-2xl p-[2px] transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-60"
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
                    Verifying Code...
                  </motion.span>
                  <span className="inline-flex items-center gap-1 ml-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-300 animate-ping" />
                  </span>
                </>
              ) : (
                <>
                  <span className="tracking-wide font-black text-white">Verify &amp; Continue</span>
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

          <button
            type="button"
            onClick={() => {
              setRequires2FA(false);
              setOtp('');
              setErrorMessage(null);
              setSuccessMessage(null);
            }}
            className="inline-flex min-h-11 w-full cursor-pointer items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-600 transition hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
          >
            ← Back to Login
          </button>
        </form>
      ) : (
        /* STANDARD MOBILE-FIRST LOGIN FORM */
        <form onSubmit={handleSubmit} className="flex flex-col gap-5 font-sans">
          <div className="mb-0 text-left">
            <p className="mb-2 text-xs font-extrabold uppercase tracking-[0.16em] text-violet-600">Good to see you again</p>
            <h2 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
              Sign in<span className="text-violet-600">.</span>
            </h2>
            <p className="mt-2 text-sm font-medium leading-6 text-slate-500">
              Access your top-ups, orders and account details.
            </p>
          </div>

          {/* Feedback Messages */}
          <AnimatePresence mode="wait">
            {errorMessage && (
              <motion.div
                key="login-form-error"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15 }}
                role="alert"
                aria-live="assertive"
                className="p-2 rounded-xl bg-rose-50 border border-rose-200/90 text-rose-700 text-xs font-semibold flex items-center gap-2"
              >
                <AlertCircle size={14} className="shrink-0 text-rose-500" />
                <span>{errorMessage}</span>
              </motion.div>
            )}

            {successMessage && (
              <motion.div
                key="login-form-success"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15 }}
                role="status"
                aria-live="polite"
                className="p-2 rounded-xl bg-emerald-50 border border-emerald-200/90 text-emerald-700 text-xs font-semibold flex items-center gap-2"
              >
                <CheckCircle2 size={14} className="shrink-0 text-emerald-500" />
                <span>{successMessage}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Input 1: Email or Phone */}
          <div className="flex flex-col gap-0.5">
            <label htmlFor="login-identifier" className="text-xs sm:text-sm font-bold text-slate-700 ml-1 mb-0.5">Email or Phone Number</label>
            <div className="relative flex items-center group">
              <div className="absolute left-4 text-slate-400 group-focus-within:text-violet-600 pointer-events-none transition-colors">
                <Mail size={16} />
              </div>
              <input
                id="login-identifier"
                type="text"
                value={identifier}
                onChange={(e) => {
                  setIdentifier(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                placeholder="you@email.com or 98XXXXXXXX"
                autoComplete="username"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3.5 pl-11 pr-4 text-sm font-semibold text-slate-900 outline-none transition placeholder:font-medium placeholder:text-slate-400 hover:border-slate-300 focus:border-slate-400 focus:bg-white focus:ring-0"
              />
            </div>
          </div>

          {/* Input 2: Password */}
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center justify-between">
              <label htmlFor="login-password" className="text-xs sm:text-sm font-bold text-slate-700 ml-1 mb-0.5">Password</label>
              <button
                type="button"
                onClick={() => setCurrentTab('forgot_password')}
                className="text-[11px] sm:text-xs font-bold text-slate-700 hover:text-slate-900 transition-colors cursor-pointer"
              >
                Forgot Password?
              </button>
            </div>
            <div className="relative flex items-center group">
              <div className="absolute left-4 text-slate-400 group-focus-within:text-slate-700 pointer-events-none transition-colors">
                <Lock size={16} />
              </div>
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                placeholder="Enter your password"
                autoComplete="current-password"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3.5 pl-11 pr-12 text-sm font-semibold text-slate-900 outline-none transition placeholder:font-medium placeholder:text-slate-400 hover:border-slate-300 focus:border-slate-400 focus:bg-white focus:ring-0"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 transition-colors cursor-pointer"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {/* Primary Submit Button - High Energy Framer Motion Animated Button */}
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
                    Signing In...
                  </motion.span>
                  <span className="inline-flex items-center gap-1 ml-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-300 animate-ping" />
                  </span>
                </>
              ) : (
                <>
                  <span className="tracking-wide font-black text-white">Sign In</span>
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

          {/* Advance Social Media Login (Google, Facebook, Apple) */}
          <SocialLoginButtons mode="signin" />

          {/* Create Account Link */}
          <div className="text-center pt-1.5 border-t border-slate-100 mt-0.5">
            <span className="text-[11px] sm:text-xs font-semibold text-slate-500">Don't have an account? </span>
            <button
              type="button"
              onClick={() => setCurrentTab('register')}
              className="text-[11px] sm:text-xs font-black text-violet-600 hover:text-violet-700 hover:underline cursor-pointer"
            >
              Create Account
            </button>
          </div>
        </form>
      )}
    </div>
  );

  return (
    <>
      <AnimatePresence>
        {loading && (
          <AppLoadingScreen
            fullScreen
            title={requires2FA ? 'Verifying Code' : 'Signing In'}
            message={requires2FA ? 'Validating security authentication code...' : 'Authenticating credentials & signing in...'}
          />
        )}
      </AnimatePresence>

      {hideLayout ? (
        content
      ) : (
        <AuthLayout activeTab="login">
          {content}
        </AuthLayout>
      )}
    </>
  );
};
export default LoginPage;
