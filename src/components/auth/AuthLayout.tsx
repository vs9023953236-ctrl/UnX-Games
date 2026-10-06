import React from 'react';
import {
  ArrowUpRight,
  Check,
  Gamepad2,
  ShieldCheck,
  Sparkles,
  Zap,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useStore } from '../../context/StoreContext';

interface AuthLayoutProps {
  children: React.ReactNode;
  activeTab?: 'login' | 'register' | 'forgot_password' | 'reset_password';
  hideTabSwitcher?: boolean;
}

const AUTH_COPY = {
  login: {
    eyebrow: 'WELCOME BACK, PLAYER',
    title: 'Your next win',
    highlight: 'starts here.',
    subtitle: 'Sign in to pick up where you left off.',
  },
  register: {
    eyebrow: 'YOUR GAME. YOUR ACCOUNT.',
    title: 'Join the',
    highlight: 'squad.',
    subtitle: 'Create an account for a faster, smoother checkout.',
  },
  forgot_password: {
    eyebrow: 'ACCOUNT RECOVERY',
    title: 'Back in the',
    highlight: 'game soon.',
    subtitle: 'We’ll help you securely get back into your account.',
  },
  reset_password: {
    eyebrow: 'ACCOUNT SECURITY',
    title: 'A fresh start',
    highlight: 'for your account.',
    subtitle: 'Choose a new password and get back to playing.',
  },
} as const;

export const AuthLayout: React.FC<AuthLayoutProps> = ({
  children,
  activeTab = 'login',
  hideTabSwitcher = false,
}) => {
  const { setCurrentTab } = useStore();
  const copy = (activeTab && AUTH_COPY[activeTab as keyof typeof AUTH_COPY]) || AUTH_COPY.login;

  return (
    <div role="region" aria-label="Authentication" className="relative isolate w-full h-full min-h-full flex-1 overflow-hidden bg-gradient-to-b from-[#f5f3ff] via-[#faf5ff] to-[#ede9fe] font-sans text-slate-900 flex flex-col justify-center items-center">
      <div className="w-full h-full flex flex-col justify-center items-center px-4 py-2 sm:px-6 relative overflow-hidden min-h-0">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute -left-32 -top-32 h-80 w-80 rounded-full bg-violet-300/35 blur-3xl" />
          <div className="absolute -bottom-40 -right-28 h-96 w-96 rounded-full bg-fuchsia-200/45 blur-3xl" />
          <div className="absolute inset-0 bg-[radial-gradient(#7c3aed18_1.2px,transparent_1.2px)] [background-size:24px_24px] opacity-75" />
        </div>

        <div className="mx-auto grid w-full max-w-6xl items-center gap-4 lg:grid-cols-[0.92fr_1.08fr] lg:gap-7 min-h-0 max-h-full">
          <section className="relative hidden max-h-[580px] overflow-hidden rounded-[2rem] bg-gradient-to-br from-violet-700 via-violet-800 to-indigo-950 p-9 text-white shadow-[0_28px_90px_rgba(76,29,149,0.22)] lg:flex lg:flex-col lg:justify-between xl:p-12">
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
              <div className="absolute -right-20 -top-24 h-80 w-80 rounded-full border border-white/10" />
              <div className="absolute -right-4 -top-8 h-64 w-64 rounded-full border border-white/10" />
              <div className="absolute -bottom-28 -left-24 h-80 w-80 rounded-full bg-fuchsia-500/20 blur-3xl" />
              <div className="absolute right-12 top-1/2 h-48 w-48 rounded-full bg-cyan-400/10 blur-3xl" />
            </div>

            <div className="relative z-10">
              <div className="mb-16 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3.5 py-2 text-xs font-bold text-violet-100 backdrop-blur">
                <span className="text-base" aria-hidden="true">🇳🇵</span>
                Made for gamers in Nepal
              </div>

              <p className="mb-4 flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.22em] text-violet-200">
                <Sparkles size={14} />
                {copy.eyebrow}
              </p>
              <h1 className="max-w-lg text-5xl font-black leading-[1.04] tracking-tight xl:text-6xl">
                {copy.title}{' '}
                <span className="bg-gradient-to-r from-fuchsia-200 via-violet-100 to-cyan-200 bg-clip-text text-transparent">
                  {copy.highlight}
                </span>
              </h1>
              <p className="mt-5 max-w-md text-base leading-7 text-violet-100/80">
                {copy.subtitle} Get trusted game top-ups, clear NPR pricing, and your order history in one place.
              </p>

              <div className="mt-10 grid max-w-md grid-cols-2 gap-3">
                <div className="rounded-2xl border border-white/10 bg-white/[0.08] p-4 backdrop-blur-sm">
                  <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-amber-300/15 text-amber-200">
                    <Zap size={18} />
                  </div>
                  <p className="font-extrabold">Quick top-ups</p>
                  <p className="mt-1 text-xs text-violet-100/70">Simple, guided checkout</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.08] p-4 backdrop-blur-sm">
                  <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-300/15 text-emerald-200">
                    <ShieldCheck size={18} />
                  </div>
                  <p className="font-extrabold">Protected account</p>
                  <p className="mt-1 text-xs text-violet-100/70">Verification when needed</p>
                </div>
              </div>
            </div>

            <div className="relative z-10 flex items-center justify-between border-t border-white/15 pt-5 text-xs text-violet-100/75">
              <span className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10">
                  <Gamepad2 size={15} />
                </span>
                Unx Games
              </span>
              <span>Play more. Wait less.</span>
            </div>
          </section>

          <section className="mx-auto flex w-full max-w-xl flex-col justify-center lg:max-w-none py-2 min-h-0 max-h-full">
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.28, ease: 'easeOut' }}
              className="relative max-h-[calc(100dvh-180px)] sm:max-h-[calc(100dvh-200px)] lg:max-h-[580px] overflow-y-auto scrollbar-none rounded-[1.65rem] border border-white/90 bg-white p-5 shadow-[0_20px_60px_rgba(51,35,88,0.12)] sm:rounded-[2rem] sm:p-8 lg:p-9 flex flex-col min-h-0"
            >
              <div aria-hidden="true" className="absolute right-0 top-0 h-32 w-32 rounded-bl-full bg-gradient-to-bl from-violet-100/80 to-transparent pointer-events-none shrink-0" />

              <div className="relative w-full flex-grow min-h-0 flex flex-col justify-center">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.16, ease: 'easeOut' }}
                    className="w-full flex-grow min-h-0 flex flex-col justify-center"
                  >
                    {children}
                  </motion.div>
                </AnimatePresence>
              </div>
            </motion.div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
