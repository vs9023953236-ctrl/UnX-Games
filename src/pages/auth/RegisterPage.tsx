import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useStore } from '../../context/StoreContext';
import { AuthLayout } from '../../components/auth/AuthLayout';
import { OtpCodeInput } from '../../components/auth/OtpCodeInput';
import { SocialLoginButtons } from '../../components/auth/SocialLoginButtons';
import {
  User,
  Mail,
  Lock,
  Phone,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
  Loader2,
  CheckCircle2,
  RotateCw,
  ShieldCheck,
  FileText,
  X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface RegisterPageProps {
  hideLayout?: boolean;
}

export const RegisterPage: React.FC<RegisterPageProps> = ({ hideLayout = false }) => {
  const { sendSignupOtp, verifySignupOtp, redirectAfterAuth, setRedirectAfterAuth } = useAuth();
  const { setCurrentTab, showToast } = useStore();

  // Step: 'form' | 'otp'
  const [step, setStep] = useState<'form' | 'otp'>('form');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // OTP inputs
  const [otpCode, setOtpCode] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  // Legal Modal
  const [showTermsModal, setShowTermsModal] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const isMountedRef = React.useRef(true);

  // Clear credentials, modal, and state upon unmount/navigation away
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      setPassword('');
      setConfirmPassword('');
      setOtpCode('');
      setShowTermsModal(false);
      setLoading(false);
      setErrorMessage(null);
      setSuccessMessage(null);
    };
  }, []);

  // Cooldown timer
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

  const strength = getPasswordStrength(password);

  const handlePhoneChange = (val: string) => {
    if (errorMessage) setErrorMessage(null);
    let digits = val.replace(/\D/g, '');
    if (digits.startsWith('977') && digits.length > 3) {
      digits = digits.slice(3);
    }
    setPhone(digits.slice(0, 10));
  };

  const navigateAfterSuccess = (user?: any) => {
    showToast('success', `Welcome to Unx Games, ${user?.name || name || 'Gamer'}! 🎉`);
    if (redirectAfterAuth && redirectAfterAuth !== 'admin') {
      const dest = redirectAfterAuth;
      setRedirectAfterAuth(null);
      setCurrentTab(dest);
    } else {
      setCurrentTab('home');
    }
  };

  // Handle Form Submission
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();
    const cleanPhone = phone.trim();

    if (!trimmedName || trimmedName.length < 2) {
      setErrorMessage('Please enter your full name (minimum 2 characters).');
      return;
    }
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }
    if (cleanPhone && (cleanPhone.length !== 10 || !/^(98|97|96)\d{8}$/.test(cleanPhone))) {
      setErrorMessage('Please enter a valid 10-digit Nepal mobile number (e.g. 98XXXXXXXX).');
      return;
    }
    if (!password || password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please re-enter.');
      return;
    }
    if (!agreedToTerms) {
      setErrorMessage('You must agree to the Terms of Service & Privacy Policy.');
      return;
    }

    setLoading(true);

    try {
      // Try sending signup verification code first
      const otpRes = await sendSignupOtp({
        email: trimmedEmail,
        full_name: trimmedName,
        mobile: cleanPhone || undefined,
        username: trimmedEmail.split('@')[0],
        password,
      });

      if (otpRes.success) {
        setStep('otp');
        setResendCooldown(60);
        setSuccessMessage(`A 6-digit verification code was sent to ${trimmedEmail}`);
        showToast('success', `Verification code sent to ${trimmedEmail}`);
        setLoading(false);
        return;
      }

      setErrorMessage(otpRes.message || 'We could not send a verification code. Your account was not created. Please try again.');
    } catch {
      setErrorMessage('Unable to connect. Please check your internet connection.');
    } finally {
      setLoading(false);
    }
  };

  // Handle OTP Verification
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanOtp = otpCode.replace(/\D/g, '');
    if (cleanOtp.length !== 6) {
      setErrorMessage('Please enter all 6 digits of the verification code.');
      return;
    }

    setLoading(true);
    try {
      const res = await verifySignupOtp({
        email: email.trim().toLowerCase(),
        otp_code: cleanOtp,
        password,
        full_name: name.trim(),
        mobile: phone.trim() || undefined,
        username: email.trim().toLowerCase().split('@')[0],
      });

      if (res.success && res.user) {
        navigateAfterSuccess(res.user);
      } else {
        setErrorMessage(res.message || 'Invalid or expired verification code.');
      }
    } catch {
      setErrorMessage('Verification failed. Please check your internet connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0 || loading) return;
    setErrorMessage(null);
    setLoading(true);
    try {
      const res = await sendSignupOtp({
        email: email.trim().toLowerCase(),
        full_name: name.trim(),
        mobile: phone.trim() || undefined,
        username: email.trim().toLowerCase().split('@')[0],
        password,
      });

      if (res.success) {
        setResendCooldown(60);
        setSuccessMessage('A fresh verification code was sent.');
        showToast('success', 'Verification code resent!');
      } else {
        setErrorMessage(res.message || 'Unable to resend verification code.');
      }
    } catch {
      setErrorMessage('Unable to resend. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const content = (
    <div className="w-full">
      {step === 'otp' ? (
        /* OTP VERIFICATION VIEW */
        <form onSubmit={handleVerifyOtp} className="flex flex-col gap-3 font-sans">
          <div className="text-center mb-1">
            <h2 className="text-xl font-black text-slate-900 tracking-tight">
              Verify Your Email ✉️
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Enter the 6-digit code sent to <span className="font-bold text-slate-800">{email}</span>
            </p>
          </div>

          <AnimatePresence mode="wait">
            {errorMessage && (
              <motion.div
                key="otp-err"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2"
              >
                <AlertCircle size={15} className="shrink-0 text-rose-500" />
                <span>{errorMessage}</span>
              </motion.div>
            )}
            {successMessage && (
              <motion.div
                key="otp-succ"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold flex items-center gap-2"
              >
                <CheckCircle2 size={15} className="shrink-0 text-emerald-500" />
                <span>{successMessage}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* 6 Digit Inputs */}
          <div className="my-2">
            <label htmlFor="otp-code-0" className="block text-center text-xs font-bold text-slate-700">
              Verification code
            </label>
            <OtpCodeInput
              value={otpCode}
              onChange={(value) => {
                setOtpCode(value);
                if (errorMessage) setErrorMessage(null);
              }}
              disabled={loading}
              ariaLabel="Email verification code"
            />
          </div>

          <motion.button
            whileTap={{ scale: 0.97 }}
            whileHover={{ scale: 1.02, y: -1 }}
            type="submit"
            disabled={loading || otpCode.replace(/\D/g, '').length !== 6}
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
                  <ShieldCheck size={18} className="text-cyan-300" />
                  <span className="tracking-wide font-black text-white">Complete Registration</span>
                </>
              )}
            </span>
          </motion.button>

          {/* Resend & Back */}
          <div className="flex items-center justify-between text-xs pt-1 font-semibold text-slate-500">
            <button
              type="button"
              onClick={() => setStep('form')}
              className="text-slate-500 hover:text-violet-600 transition-colors cursor-pointer"
            >
              ← Edit Details
            </button>
            <button
              type="button"
              disabled={resendCooldown > 0 || loading}
              onClick={handleResendOtp}
              className="text-violet-600 hover:text-violet-700 font-bold transition-colors cursor-pointer disabled:text-slate-400"
            >
              {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : 'Resend Code'}
            </button>
          </div>
        </form>
      ) : (
        /* MAIN REGISTRATION FORM - SLEEK & COMPACT */
        <form onSubmit={handleSubmitForm} className="flex flex-col gap-3 font-sans">
          <div className="text-left">
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-950">
              Create account<span className="text-violet-600">.</span>
            </h2>
            <p className="mt-0.5 text-xs font-medium text-slate-500">
              One account for instant game top-ups, orders &amp; support.
            </p>
          </div>

          {/* Alerts */}
          <AnimatePresence mode="wait">
            {errorMessage && (
              <motion.div
                key="reg-error"
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
                key="reg-success"
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

          {/* Row 1: Full Name & Mobile in 2 Columns */}
          <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
            {/* Full Name */}
            <div className="flex flex-col gap-0.5">
              <label htmlFor="register-name" className="text-xs font-bold text-slate-700 ml-1">Full Name</label>
              <div className="relative flex items-center group">
                <div className="absolute left-3 text-slate-400 group-focus-within:text-violet-600 pointer-events-none transition-colors">
                  <User size={14} />
                </div>
                <input
                  id="register-name"
                  type="text"
                  value={name}
                  autoComplete="name"
                  onChange={(e) => {
                    setName(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  placeholder="Full name"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-8.5 pr-2.5 text-xs sm:text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-violet-500 focus:bg-white focus:ring-2 focus:ring-violet-500/10"
                />
              </div>
            </div>

            {/* Mobile Phone (Optional) */}
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center justify-between">
                <label htmlFor="register-mobile" className="text-xs font-bold text-slate-700 ml-1">Mobile</label>
                <span className="text-[9px] font-bold text-slate-400">Opt</span>
              </div>
              <div className="relative flex items-center group">
                <div className="absolute left-3 text-slate-400 group-focus-within:text-violet-600 pointer-events-none transition-colors">
                  <Phone size={14} />
                </div>
                <input
                  id="register-mobile"
                  type="tel"
                  value={phone}
                  autoComplete="tel"
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  placeholder="98XXXXXXXX"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-8.5 pr-2.5 text-xs sm:text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-violet-500 focus:bg-white focus:ring-2 focus:ring-violet-500/10"
                />
              </div>
            </div>
          </div>

          {/* Row 2: Email Address (Full Width) */}
          <div className="flex flex-col gap-0.5">
            <label htmlFor="register-email" className="text-xs font-bold text-slate-700 ml-1">Email Address</label>
            <div className="relative flex items-center group">
              <div className="absolute left-3.5 text-slate-400 group-focus-within:text-violet-600 pointer-events-none transition-colors">
                <Mail size={14} />
              </div>
              <input
                id="register-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                placeholder="you@email.com"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-xs sm:text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-violet-500 focus:bg-white focus:ring-2 focus:ring-violet-500/10"
              />
            </div>
          </div>

          {/* Row 3: Password with Eye Toggle & Compact Strength */}
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center justify-between">
              <label htmlFor="register-password" className="text-xs font-bold text-slate-700 ml-1">Password</label>
              {password.length > 0 && (
                <span className={`text-[10px] font-black ${strength.text}`}>
                  {strength.label}
                </span>
              )}
            </div>
            <div className="relative flex items-center group">
              <div className="absolute left-3.5 text-slate-400 group-focus-within:text-violet-600 pointer-events-none transition-colors">
                <Lock size={14} />
              </div>
              <input
                id="register-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setConfirmPassword(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                placeholder="Minimum 6 characters"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-10 text-xs sm:text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-violet-500 focus:bg-white focus:ring-2 focus:ring-violet-500/10"
              />
              <button
                type="button"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 transition-colors cursor-pointer"
              >
                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
            {password.length > 0 && (
              <div className="w-full h-1 bg-slate-200 rounded-full overflow-hidden mt-0.5">
                <div
                  className={`h-full transition-all duration-300 ${strength.color}`}
                  style={{ width: strength.width }}
                />
              </div>
            )}
          </div>

          {/* Terms & Conditions Checkbox */}
          <div className="flex items-center gap-2 py-0.5">
            <input
              type="checkbox"
              id="register-terms"
              checked={agreedToTerms}
              onChange={(event) => setAgreedToTerms(event.target.checked)}
              className="h-3.5 w-3.5 shrink-0 rounded border-slate-300 accent-violet-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600 cursor-pointer"
            />
            <label htmlFor="register-terms" className="text-[10.5px] font-medium text-slate-600 leading-tight cursor-pointer">
              I agree to the{' '}
              <button
                type="button"
                onClick={() => setShowTermsModal(true)}
                className="text-violet-600 hover:underline font-bold cursor-pointer"
              >
                Terms
              </button>{' '}
              &amp;{' '}
              <button
                type="button"
                onClick={() => setShowTermsModal(true)}
                className="text-violet-600 hover:underline font-bold cursor-pointer"
              >
                Privacy Policy
              </button>
            </label>
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
                    Creating Account...
                  </motion.span>
                  <span className="inline-flex items-center gap-1 ml-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-300 animate-ping" />
                  </span>
                </>
              ) : (
                <>
                  <span className="tracking-wide font-black text-white">Create Account</span>
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
          <SocialLoginButtons mode="signup" />

          {/* Already have an account */}
          <div className="text-center pt-1.5 border-t border-slate-100 mt-0.5">
            <span className="text-[11px] sm:text-xs font-semibold text-slate-500">Already have an account? </span>
            <button
              type="button"
              onClick={() => setCurrentTab('login')}
              className="text-[11px] sm:text-xs font-black text-violet-600 hover:text-violet-700 hover:underline cursor-pointer"
            >
              Sign In
            </button>
          </div>
        </form>
      )}

      {/* Terms of Service Modal */}
      {showTermsModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-lg bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 max-h-[85vh] flex flex-col"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <FileText size={18} className="text-violet-600" />
                <h3 className="text-base font-black text-slate-900">Terms &amp; Privacy Policy</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowTermsModal(false)}
                className="w-7 h-7 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>
            <div className="overflow-y-auto py-4 text-xs text-slate-600 space-y-3 leading-relaxed flex-1">
              <p>
                <strong>1. Acceptance of Terms:</strong> By registering with Unx Games, you agree to comply with our store policies, delivery guidelines, and fair usage protocols.
              </p>
              <p>
                <strong>2. Player UID Delivery:</strong> Top-up credits are dispatched directly to the Player ID / UID specified during checkout. Customers are responsible for entering the exact Player ID.
              </p>
              <p>
                <strong>3. Official Payments:</strong> We accept verified payments via official Nepal QR gateways including eSewa, Khalti, and Mobile Banking.
              </p>
              <p>
                <strong>4. Account Security:</strong> You are responsible for safeguarding your login credentials. Unx Games staff will never request your account password.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setAgreedToTerms(true);
                setShowTermsModal(false);
              }}
              className="w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs cursor-pointer"
            >
              I Understand &amp; Agree
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );

  if (hideLayout) {
    return content;
  }

  return (
    <AuthLayout activeTab="register">
      {content}
    </AuthLayout>
  );
};
export default RegisterPage;
