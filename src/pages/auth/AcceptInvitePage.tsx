import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useStore } from '../../context/StoreContext';
import { AuthLayout } from '../../components/auth/AuthLayout';
import { AuthBrandLogo } from '../../components/auth/AuthBrandLogo';
import { api } from '../../services/api';
import { getClientSupabase } from '../../lib/supabase';
import {
  Lock,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Eye,
  EyeOff,
  Mail,
  User,
  Phone,
  ShieldCheck,
  Gamepad2,
  Sparkles,
  Check,
  RefreshCw,
  LogOut,
  AlertTriangle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AcceptInvitePageProps {
  hideLayout?: boolean;
}

export const AcceptInvitePage: React.FC<AcceptInvitePageProps> = ({ hideLayout = false }) => {
  const { setCurrentTab, setIsAdminView, setAdminTab, showToast } = useStore();
  const { currentUser, logout, refreshUser } = useAuth();

  const [email, setEmail] = useState<string>('');
  const [fullName, setFullName] = useState<string>('');
  const [mobile, setMobile] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
  const [agreeTerms, setAgreeTerms] = useState<boolean>(true);
  const [role, setRole] = useState<string>('CUSTOMER');

  const [verifying, setVerifying] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isSigningOut, setIsSigningOut] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isExpiredOrInvalid, setIsExpiredOrInvalid] = useState<boolean>(false);
  const [isAlreadyAccepted, setIsAlreadyAccepted] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);

  const initInvitationSession = useCallback(async () => {
    setVerifying(true);
    setErrorMessage(null);
    setIsExpiredOrInvalid(false);

    try {
      const sb = getClientSupabase();
      if (!sb) {
        throw new Error('Authentication client unavailable. Please check your internet connection.');
      }

      // 1. Inspect URL hash and search params
      const searchParams = new URLSearchParams(window.location.search);
      const hash = window.location.hash.startsWith('#') ? window.location.hash.substring(1) : window.location.hash;
      const hashParams = new URLSearchParams(hash);

      // Check for error in URL (e.g. Supabase auth error redirect)
      const errorDescription = searchParams.get('error_description') || hashParams.get('error_description');
      const errorCode = searchParams.get('error_code') || hashParams.get('error_code') || searchParams.get('error');

      if (errorCode || errorDescription) {
        console.warn('[InviteAuth] Error detected in URL params:', errorCode, errorDescription);
        setIsExpiredOrInvalid(true);
        setErrorMessage(
          errorDescription ||
            'This invitation link is invalid or has expired. Please ask your administrator to send a new invitation.'
        );
        setVerifying(false);
        return;
      }

      // 2. First check: does Supabase client already have an active session?
      // (Supabase automatically detects and exchanges tokens from URL on initialization)
      let { data: sessionData } = await sb.auth.getSession();
      let activeUser = sessionData?.session?.user;

      // 3. If no session yet, inspect and process tokens manually
      const code = searchParams.get('code');
      if (!activeUser && code) {
        try {
          console.log('[InviteAuth] Exchanging PKCE code for session...');
          const { data: exchangeData, error: exchangeErr } = await sb.auth.exchangeCodeForSession(code);
          if (!exchangeErr && exchangeData?.session?.user) {
            activeUser = exchangeData.session.user;
          } else if (exchangeErr) {
            console.warn('[InviteAuth] Code exchange error:', exchangeErr.message);
            // Re-check getSession in case background auto-exchange finished concurrently
            const retry = await sb.auth.getSession();
            if (retry?.data?.session?.user) {
              activeUser = retry.data.session.user;
            }
          }
        } catch (e: any) {
          console.warn('[InviteAuth] Code exchange exception:', e?.message);
        }
      }

      // Check for token_hash OTP verification
      const tokenHash = searchParams.get('token_hash') || hashParams.get('token_hash');
      const type = searchParams.get('type') || hashParams.get('type');
      if (!activeUser && tokenHash && (type === 'invite' || type === 'signup' || type === 'recovery')) {
        console.log('[InviteAuth] Verifying OTP token_hash...');
        const { data: otpData, error: otpErr } = await sb.auth.verifyOtp({
          token_hash: tokenHash,
          type: (type as any) || 'invite',
        });
        if (!otpErr && otpData?.session?.user) {
          activeUser = otpData.session.user;
        } else if (otpErr) {
          console.warn('[InviteAuth] OTP verification error:', otpErr.message);
        }
      }

      // Check for direct access_token in hash (Implicit Flow)
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');
      if (!activeUser && accessToken && refreshToken) {
        console.log('[InviteAuth] Setting session from hash tokens...');
        const { data: setSessData, error: sessionErr } = await sb.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (!sessionErr && setSessData?.session?.user) {
          activeUser = setSessData.session.user;
        } else if (sessionErr) {
          console.warn('[InviteAuth] Set session error:', sessionErr.message);
        }
      }

      // Fallback final session check
      if (!activeUser) {
        const finalSession = await sb.auth.getSession();
        activeUser = finalSession?.data?.session?.user;
      }

      if (!activeUser) {
        console.warn('[InviteAuth] No active session found after token processing');
        setIsExpiredOrInvalid(true);
        setErrorMessage(
          'We could not verify your invitation link. The link may have expired or already been used. Please request a new invitation.'
        );
        setVerifying(false);
        return;
      }

      // 4. Populate invited user details
      const invitedEmail = activeUser.email || '';
      setEmail(invitedEmail);

      const meta = activeUser.user_metadata || {};
      const metaName = meta.full_name || meta.name || '';
      const metaPhone = meta.mobile || meta.phone || '';
      const metaRole = meta.role || 'CUSTOMER';

      if (metaName) setFullName(metaName);
      if (metaPhone) setMobile(metaPhone);
      if (metaRole) setRole(metaRole);

      // Check if user is already setup (setup_completed)
      if (meta.setup_completed === true && activeUser.email_confirmed_at) {
        setIsAlreadyAccepted(true);
      }
    } catch (err: any) {
      console.error('[InviteAuth] Initialization exception:', err);
      setIsExpiredOrInvalid(true);
      setErrorMessage(err?.message || 'Failed to verify invitation link.');
    } finally {
      setVerifying(false);
    }
  }, []);

  useEffect(() => {
    initInvitationSession();
  }, [initInvitationSession]);

  // Account mismatch detection: another user is logged in
  const hasAccountMismatch = Boolean(
    currentUser &&
      email &&
      currentUser.email &&
      currentUser.email.trim().toLowerCase() !== email.trim().toLowerCase()
  );

  const handleSignOutAndContinue = async () => {
    setIsSigningOut(true);
    try {
      await logout();
      showToast('info', `Signed out of previous account. Verifying invitation for ${email}...`);
      setTimeout(() => {
        initInvitationSession();
      }, 500);
    } catch (e: any) {
      console.warn('Sign out notice:', e?.message);
    } finally {
      setIsSigningOut(false);
    }
  };

  const handleCompleteSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!password || password.length < 6) {
      setErrorMessage('Please enter a secure password of at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please re-type your confirm password.');
      return;
    }

    if (!agreeTerms) {
      setErrorMessage('Please agree to the Unx Games Terms of Service to continue.');
      return;
    }

    setIsSubmitting(true);

    try {
      const sb = getClientSupabase();
      if (!sb) {
        throw new Error('Supabase client is not available.');
      }

      // 1. Update user password and metadata via client Supabase session
      const { error: updateErr } = await sb.auth.updateUser({
        password: password,
        data: {
          full_name: fullName.trim(),
          name: fullName.trim(),
          mobile: mobile.trim() || undefined,
          setup_completed: true,
        },
      });

      if (updateErr) {
        throw updateErr;
      }

      // 2. Call backend server to complete customer record sync and mark invitation accepted
      const res = await api.auth.completeInvitationSetup({
        password: password,
        full_name: fullName.trim(),
        mobile: mobile.trim(),
      });

      if (!res.success) {
        throw new Error(res.message || 'Failed to complete profile synchronization.');
      }

      // 3. Refresh authentication context
      await refreshUser();

      // 4. Success state
      setIsSuccess(true);
      showToast('success', 'Account activated! Welcome to Unx Games 🇳🇵');

      // Clear URL tokens
      try {
        window.history.replaceState({}, document.title, window.location.pathname);
      } catch {}

      // Redirect after 1.5 seconds to the customer dashboard (or admin if staff role)
      setTimeout(() => {
        if (['SUPER_ADMIN', 'ADMIN', 'STORE_MANAGER', 'SUPPORT_STAFF'].includes(role.toUpperCase())) {
          setIsAdminView(true);
          setAdminTab('overview');
          setCurrentTab('admin');
        } else {
          setCurrentTab('profile');
        }
      }, 1500);
    } catch (err: any) {
      console.error('[AcceptInvite] Submission error:', err);
      setErrorMessage(err?.message || 'Failed to activate account. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Password strength helper
  const getPasswordStrength = (pass: string) => {
    if (!pass) return { score: 0, text: '', color: 'bg-slate-200' };
    let score = 0;
    if (pass.length >= 6) score += 1;
    if (pass.length >= 8) score += 1;
    if (/[A-Z]/.test(pass)) score += 1;
    if (/[0-9]/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;

    if (score <= 2) return { score: 1, text: 'Weak', color: 'bg-rose-500' };
    if (score === 3 || score === 4) return { score: 2, text: 'Medium', color: 'bg-amber-500' };
    return { score: 3, text: 'Strong', color: 'bg-emerald-500' };
  };

  const strength = getPasswordStrength(password);

  const content = (
    <div className="w-full max-w-md mx-auto">
      {/* Brand Header */}
      <div className="text-center mb-5">
        <AuthBrandLogo />
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-3">
          Welcome to Unx Games 🇳🇵
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
          Your account invitation is ready. Set your password to activate.
        </p>
      </div>

      {/* State: Verifying Token */}
      {verifying && (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-3">
            <Loader2 size={24} className="animate-spin" />
          </div>
          <h3 className="text-sm font-bold text-slate-800">Verifying your invitation...</h3>
          <p className="text-xs text-slate-500 mt-1">Please wait while we secure your account link.</p>
        </div>
      )}

      {/* State: Expired or Invalid Link */}
      {!verifying && isExpiredOrInvalid && (
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-2xl border border-rose-200/80 p-6 shadow-sm text-center"
        >
          <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3">
            <AlertCircle size={26} />
          </div>
          <h2 className="text-base font-bold text-slate-900">Invitation Link Expired or Invalid</h2>
          <p className="text-xs text-slate-600 mt-2 leading-relaxed">
            {errorMessage ||
              'This invitation link is either invalid, already used, or expired. Links are valid for 7 days.'}
          </p>

          <div className="mt-6 flex flex-col sm:flex-row gap-2.5">
            <button
              type="button"
              onClick={() => setCurrentTab('login')}
              className="flex-1 py-2.5 px-4 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5"
            >
              Go to Sign In <ArrowRight size={14} />
            </button>
            <button
              type="button"
              onClick={() => setCurrentTab('home')}
              className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
            >
              Return Home
            </button>
          </div>
        </motion.div>
      )}

      {/* State: Account Mismatch Warning */}
      {!verifying && !isExpiredOrInvalid && !isSuccess && hasAccountMismatch && (
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-2xl border border-amber-200/80 p-6 shadow-sm text-center"
        >
          <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center mx-auto mb-3">
            <AlertTriangle size={26} />
          </div>
          <h2 className="text-base font-bold text-slate-900">Signed In With Different Account</h2>
          <p className="text-xs text-slate-600 mt-2 leading-relaxed">
            You are currently signed in as <span className="font-semibold text-slate-800">{currentUser?.email}</span>.
            However, this invitation is for <span className="font-semibold text-red-700">{email}</span>.
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Please sign out first to set up the invited account correctly.
          </p>

          <div className="mt-6 flex flex-col sm:flex-row gap-2.5">
            <button
              type="button"
              onClick={handleSignOutAndContinue}
              disabled={isSigningOut}
              className="flex-1 py-2.5 px-4 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isSigningOut ? <Loader2 size={14} className="animate-spin" /> : <LogOut size={14} />}
              Sign Out & Accept Invite
            </button>
            <button
              type="button"
              onClick={() => {
                if (['SUPER_ADMIN', 'ADMIN', 'STORE_MANAGER', 'SUPPORT_STAFF'].includes(currentUser?.role || '')) {
                  setIsAdminView(true);
                  setAdminTab('overview');
                  setCurrentTab('admin');
                } else {
                  setCurrentTab('profile');
                }
              }}
              className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              Stay as Current User
            </button>
          </div>
        </motion.div>
      )}

      {/* State: Already Accepted Account */}
      {!verifying && !isExpiredOrInvalid && !hasAccountMismatch && isAlreadyAccepted && !isSuccess && (
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-2xl border border-emerald-200 p-6 shadow-sm text-center"
        >
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-3">
            <CheckCircle2 size={26} />
          </div>
          <h2 className="text-base font-bold text-slate-900">Account Already Active!</h2>
          <p className="text-xs text-slate-600 mt-2 leading-relaxed">
            The account for <span className="font-semibold text-slate-800">{email}</span> is already active.
            You can access your Customer Dashboard directly or sign in.
          </p>

          <div className="mt-6 flex flex-col sm:flex-row gap-2.5">
            <button
              type="button"
              onClick={() => {
                if (['SUPER_ADMIN', 'ADMIN', 'STORE_MANAGER', 'SUPPORT_STAFF'].includes(role.toUpperCase())) {
                  setIsAdminView(true);
                  setAdminTab('overview');
                  setCurrentTab('admin');
                } else {
                  setCurrentTab('profile');
                }
              }}
              className="flex-1 py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
            >
              Go to Customer Dashboard <ArrowRight size={14} />
            </button>
            <button
              type="button"
              onClick={() => setCurrentTab('home')}
              className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              Explore Store
            </button>
          </div>
        </motion.div>
      )}

      {/* State: Activation Success */}
      {isSuccess && (
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-2xl border border-emerald-200 p-6 shadow-sm text-center"
        >
          <div className="w-14 h-14 rounded-2xl bg-emerald-500 text-white flex items-center justify-center mx-auto mb-3 shadow-md shadow-emerald-500/20">
            <Check size={30} className="stroke-[2.5]" />
          </div>
          <h2 className="text-lg font-black text-slate-900">Account Successfully Activated!</h2>
          <p className="text-xs text-slate-600 mt-2">
            Welcome to the community, <span className="font-bold text-slate-800">{fullName || email}</span>! Redirecting you to your customer dashboard...
          </p>
          <div className="mt-4 flex justify-center">
            <div className="flex items-center gap-2 text-red-600 text-xs font-semibold">
              <Loader2 size={16} className="animate-spin" /> Loading Customer Dashboard...
            </div>
          </div>
        </motion.div>
      )}

      {/* State: Active Invitation Form */}
      {!verifying && !isExpiredOrInvalid && !hasAccountMismatch && !isAlreadyAccepted && !isSuccess && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-sm"
        >
          <form onSubmit={handleCompleteSetup} className="space-y-4">
            {/* Error banner */}
            <AnimatePresence>
              {errorMessage && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-start gap-2"
                >
                  <AlertCircle size={15} className="shrink-0 mt-0.5 text-rose-500" />
                  <span>{errorMessage}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Invited Email Card (Read-only) */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                Invited Email Address
              </label>
              <div className="flex items-center gap-2.5 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-xs font-semibold select-none">
                <Mail size={15} className="text-red-600 shrink-0" />
                <span className="truncate flex-1">{email || 'Loading email...'}</span>
                <span className="shrink-0 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider bg-red-100 text-red-700 rounded-full">
                  Invited
                </span>
              </div>
            </div>

            {/* Full Name Field */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                Full Name <span className="text-slate-400 font-normal">(as shown in game)</span>
              </label>
              <div className="relative flex items-center">
                <User size={15} className="absolute left-3.5 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Aarav Sharma"
                  className="w-full pl-9 pr-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-600 transition-all"
                />
              </div>
            </div>

            {/* Mobile Number Field (Optional) */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                Mobile Number <span className="text-slate-400 font-normal">(optional for order updates)</span>
              </label>
              <div className="relative flex items-center">
                <div className="absolute left-3 flex items-center gap-1 text-slate-500 text-xs font-bold pointer-events-none">
                  <span>🇳🇵</span>
                  <span className="text-[11px] text-slate-400">+977</span>
                </div>
                <input
                  type="tel"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  placeholder="98XXXXXXXX"
                  className="w-full pl-16 pr-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-600 transition-all"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                Create Secure Password
              </label>
              <div className="relative flex items-center">
                <Lock size={15} className="absolute left-3.5 text-slate-400 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full pl-9 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-600 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 text-slate-400 hover:text-slate-600 p-1"
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>

              {/* Password strength meter */}
              {password && (
                <div className="mt-1.5 flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden flex gap-1">
                    <div
                      className={`h-full rounded-full transition-all ${
                        strength.score >= 1 ? strength.color : 'bg-transparent'
                      } w-1/3`}
                    />
                    <div
                      className={`h-full rounded-full transition-all ${
                        strength.score >= 2 ? strength.color : 'bg-transparent'
                      } w-1/3`}
                    />
                    <div
                      className={`h-full rounded-full transition-all ${
                        strength.score >= 3 ? strength.color : 'bg-transparent'
                      } w-1/3`}
                    />
                  </div>
                  <span className="text-[10px] font-bold text-slate-500">{strength.text}</span>
                </div>
              )}
            </div>

            {/* Confirm Password Field */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                Confirm Password
              </label>
              <div className="relative flex items-center">
                <Lock size={15} className="absolute left-3.5 text-slate-400 pointer-events-none" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your password"
                  className={`w-full pl-9 pr-10 py-2.5 bg-white border rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 transition-all ${
                    confirmPassword && confirmPassword !== password
                      ? 'border-rose-300 focus:ring-rose-500/20 focus:border-rose-500'
                      : 'border-slate-200 focus:ring-red-500/20 focus:border-red-600'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 text-slate-400 hover:text-slate-600 p-1"
                >
                  {showConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {confirmPassword && confirmPassword !== password && (
                <p className="text-[10px] font-semibold text-rose-500 mt-1">Passwords do not match.</p>
              )}
            </div>

            {/* Terms Agreement Checkbox */}
            <div className="pt-1">
              <label className="flex items-start gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-red-600 focus:ring-red-500"
                />
                <span className="text-[11px] text-slate-600 leading-tight">
                  I accept the Unx Games{' '}
                  <span className="text-red-600 font-bold hover:underline">Terms of Service</span> and{' '}
                  <span className="text-red-600 font-bold hover:underline">Privacy Policy</span>.
                </span>
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting || !password || password.length < 6 || password !== confirmPassword}
              className="w-full py-3 px-4 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 active:from-red-800 active:to-orange-800 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-red-600/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Activating Account...</span>
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  <span>Activate Account & Join</span>
                  <ArrowRight size={15} />
                </>
              )}
            </button>
          </form>
        </motion.div>
      )}

      {/* Footer Info */}
      <div className="text-center mt-6">
        <p className="text-[11px] text-slate-400 font-medium">
          © Unx Games By intraX Pvt Ltd
        </p>
      </div>
    </div>
  );

  if (hideLayout) {
    return content;
  }

  return <AuthLayout hideTabSwitcher={true}>{content}</AuthLayout>;
};
export default AcceptInvitePage;
