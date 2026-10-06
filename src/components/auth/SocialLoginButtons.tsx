import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useStore } from '../../context/StoreContext';

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
              <Loader2 size={19} className="animate-spin text-slate-600" />
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
              <Loader2 size={19} className="animate-spin text-[#1877F2]" />
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
          className="group relative flex h-12 w-full cursor-pointer items-center justify-center rounded-2xl bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 p-[1.5px] shadow-2xs transition-all duration-300 hover:from-slate-600/50 hover:via-indigo-500/50 hover:to-slate-800/50 hover:shadow-[0_6px_20px_rgba(0,0,0,0.2)] active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
        >
          <span className="flex h-full w-full items-center justify-center rounded-[14.5px] bg-white transition-colors duration-200 group-hover:bg-slate-50">
            {activeProvider === 'apple' ? (
              <Loader2 size={19} className="animate-spin text-slate-900" />
            ) : (
              <svg
                className="h-5.5 w-5.5 shrink-0 fill-slate-900 transition-transform duration-200 group-hover:scale-105"
                viewBox="0 0 170 170"
                aria-hidden="true"
              >
                <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.7-3.04-7.58-7.7-11.64-13.98-5.87-8.91-10.45-18.79-13.73-29.64-3.28-10.85-4.93-21.32-4.93-31.42 0-14.89 3.86-27.17 11.58-36.85 7.72-9.68 17.38-14.62 28.98-14.82 4.9 0 10.37 1.28 16.42 3.84 6.05 2.56 10.05 3.89 12 3.89 1.67 0 5.86-1.39 12.56-4.17 6.7-2.78 12.58-3.99 17.65-3.64 13.59.87 24.38 6.09 32.38 15.66-11.75 7.18-17.5 16.96-17.25 29.34.25 9.68 4.02 17.84 11.31 24.49 7.29 6.64 15.77 10.35 25.44 11.12-2.18 6.42-4.8 12.87-7.85 19.34zm-37.19-106.84c0 4.13-1.42 8.44-4.26 12.93-2.84 4.49-6.84 8.01-12 10.56-1.1-3.69-1.37-7.46-.82-11.31.55-3.85 2.12-7.86 4.71-12.03 2.59-4.17 5.76-7.53 9.51-10.08 3.75-2.55 7.22-4.09 10.41-4.62.55 4.89.5 9.74-.15 14.55z" />
              </svg>
            )}
          </span>
        </motion.button>

      </div>
    </div>
  );
};
export default SocialLoginButtons;
