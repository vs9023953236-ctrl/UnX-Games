import React, { useState } from 'react';
import { motion } from 'motion/react';
import { useAuth } from '../../context/AuthContext';
import { useStore } from '../../context/StoreContext';
import { NativeMobileSpinner } from '../common/NativeMobileSpinner';

interface SocialLoginButtonsProps {
  onSuccess?: () => void;
  onError?: (msg: string) => void;
  mode?: 'signin' | 'signup';
}

export const SocialLoginButtons: React.FC<SocialLoginButtonsProps> = ({
  onSuccess,
  onError,
  mode = 'signin',
}) => {
  const { loginWithGoogle, loginWithFacebook, loginWithApple } = useAuth();
  const { showToast } = useStore();
  const [activeProvider, setActiveProvider] = useState<'google' | 'facebook' | 'apple' | null>(null);

  const handleProviderLogin = async (provider: 'google' | 'facebook' | 'apple') => {
    setActiveProvider(provider);
    try {
      let res: { success: boolean; message?: string } = { success: false };
      if (provider === 'google') {
        res = await loginWithGoogle();
      } else if (provider === 'facebook') {
        res = await loginWithFacebook();
      } else if (provider === 'apple') {
        res = await loginWithApple();
      }

      if (res.success) {
        showToast('success', `${provider.charAt(0).toUpperCase() + provider.slice(1)} sign-in initiated!`);
        if (onSuccess) onSuccess();
      } else {
        const friendlyMsg = res.message || `${provider.charAt(0).toUpperCase() + provider.slice(1)} authentication is initializing. You can log in directly with your email or phone.`;
        showToast('info', friendlyMsg);
        if (onError) onError(friendlyMsg);
      }
    } catch (err: any) {
      const msg = err?.message || 'Social sign-in temporarily unavailable.';
      showToast('info', msg);
      if (onError) onError(msg);
    } finally {
      setActiveProvider(null);
    }
  };

  return (
    <div className="w-full space-y-3 font-sans">
      {/* Modern Clean Divider */}
      <div className="relative flex items-center justify-center my-1">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-200/90" />
        </div>
        <div className="relative bg-white px-3 text-[10.5px] sm:text-xs font-bold uppercase tracking-wider text-slate-400">
          Or continue with
        </div>
      </div>

      {/* 3 Advance Social Media Login Icons in a Single Row */}
      <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
        
        {/* 1. GOOGLE ADVANCE BUTTON */}
        <motion.button
          type="button"
          whileHover={{ scale: 1.03, y: -1.5 }}
          whileTap={{ scale: 0.95 }}
          disabled={Boolean(activeProvider)}
          onClick={() => handleProviderLogin('google')}
          aria-label={`${mode === 'signup' ? 'Sign up' : 'Sign in'} with Google`}
          title="Continue with Google"
          className="group relative flex h-12 w-full cursor-pointer items-center justify-center rounded-2xl bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 p-[1.5px] shadow-2xs transition-all duration-300 hover:from-violet-500/50 hover:via-indigo-500/50 hover:to-fuchsia-500/50 hover:shadow-[0_6px_20px_rgba(124,58,237,0.2)] active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
        >
          <span className="flex h-full w-full items-center justify-center rounded-[14.5px] bg-white transition-colors duration-200 group-hover:bg-slate-50/80">
            {activeProvider === 'google' ? (
              <NativeMobileSpinner size="xs" variant="tapered-arc" color="violet" />
            ) : (
              <svg
                className="h-5 w-5 shrink-0 transition-transform duration-200 group-hover:scale-105"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.16 0 9.94 0 12s.45 3.84 1.25 5.42l4.03-3.15z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                />
              </svg>
            )}
          </span>
        </motion.button>

        {/* 2. FACEBOOK ADVANCE BUTTON */}
        <motion.button
          type="button"
          whileHover={{ scale: 1.03, y: -1.5 }}
          whileTap={{ scale: 0.95 }}
          disabled={Boolean(activeProvider)}
          onClick={() => handleProviderLogin('facebook')}
          aria-label={`${mode === 'signup' ? 'Sign up' : 'Sign in'} with Facebook`}
          title="Continue with Facebook"
          className="group relative flex h-12 w-full cursor-pointer items-center justify-center rounded-2xl bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 p-[1.5px] shadow-2xs transition-all duration-300 hover:from-blue-500/60 hover:via-indigo-500/60 hover:to-blue-600/60 hover:shadow-[0_6px_20px_rgba(24,119,242,0.25)] active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          <span className="flex h-full w-full items-center justify-center rounded-[14.5px] bg-white transition-colors duration-200 group-hover:bg-blue-50/40">
            {activeProvider === 'facebook' ? (
              <NativeMobileSpinner size="xs" variant="tapered-arc" color="indigo" />
            ) : (
              <svg
                className="h-5.5 w-5.5 shrink-0 transition-transform duration-200 group-hover:scale-105"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="12" fill="#1877F2" />
                <path
                  d="M15.02 12.07h-2.18v7.86h-3.25v-7.86H8v-2.77h1.59V7.47c0-2.17 1.28-3.4 3.28-3.4.96 0 1.96.17 1.96.17v2.16h-1.11c-1.08 0-1.42.67-1.42 1.36v1.54h2.44l-.39 2.77z"
                  fill="#ffffff"
                />
              </svg>
            )}
          </span>
        </motion.button>

        {/* 3. APPLE ADVANCE BUTTON */}
        <motion.button
          type="button"
          whileHover={{ scale: 1.03, y: -1.5 }}
          whileTap={{ scale: 0.95 }}
          disabled={Boolean(activeProvider)}
          onClick={() => handleProviderLogin('apple')}
          aria-label={`${mode === 'signup' ? 'Sign up' : 'Sign in'} with Apple`}
          title="Continue with Apple"
          className="group relative flex h-12 w-full cursor-pointer items-center justify-center rounded-2xl bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 p-[1.5px] shadow-2xs transition-all duration-300 hover:from-slate-700/50 hover:via-slate-800/50 hover:to-slate-950/50 hover:shadow-[0_6px_20px_rgba(0,0,0,0.2)] active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
        >
          <span className="flex h-full w-full items-center justify-center rounded-[14.5px] bg-white transition-colors duration-200 group-hover:bg-slate-50">
            {activeProvider === 'apple' ? (
              <NativeMobileSpinner size="xs" variant="tapered-arc" color="violet" />
            ) : (
              <svg
                className="h-5 w-5 shrink-0 text-slate-900 transition-transform duration-200 group-hover:scale-105"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.38c.62-.75 1.04-1.8 0.93-2.85-.9.04-1.98.6-2.61 1.34-.56.64-1.04 1.68-.91 2.69 1 .08 1.97-.43 2.59-1.18z" />
              </svg>
            )}
          </span>
        </motion.button>

      </div>
    </div>
  );
};
export default SocialLoginButtons;
