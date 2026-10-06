import React from 'react';
import { motion } from 'motion/react';
import { AppLogo } from './AppLogo';

export interface PerfectAppSpinnerProps {
  /** Size preset for logo container */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Optional custom title below spinner */
  title?: string;
  /** Optional custom subtitle below title */
  subtitle?: string;
  /** Color theme accent: 'violet' | 'red' | 'amber' | 'emerald' */
  theme?: 'violet' | 'red' | 'amber' | 'emerald';
  /** Show animated loading dots below */
  showDots?: boolean;
  className?: string;
}

export const PerfectAppSpinner: React.FC<PerfectAppSpinnerProps> = ({
  size = 'md',
  title,
  subtitle,
  theme = 'violet',
  showDots = true,
  className = '',
}) => {

  // Sizing definitions ensuring 1:1 perfect square aspect ratio
  const getDimensions = () => {
    switch (size) {
      case 'sm':
        return {
          logoContainer: 'w-12 h-12 rounded-[22%]',
          ringPadding: 'p-2',
          spinnerSize: 'w-16 h-16',
          logoSize: 'custom' as const,
        };
      case 'lg':
        return {
          logoContainer: 'w-24 h-24 sm:w-28 sm:h-28 rounded-[22%]',
          ringPadding: 'p-3',
          spinnerSize: 'w-32 h-32 sm:w-36 sm:h-36',
          logoSize: 'custom' as const,
        };
      case 'xl':
        return {
          logoContainer: 'w-28 h-28 sm:w-36 sm:h-36 rounded-[22%]',
          ringPadding: 'p-4',
          spinnerSize: 'w-36 h-36 sm:w-48 sm:h-48',
          logoSize: 'custom' as const,
        };
      case 'md':
      default:
        return {
          logoContainer: 'w-20 h-20 sm:w-24 sm:h-24 rounded-[22%]',
          ringPadding: 'p-2.5',
          spinnerSize: 'w-28 h-28 sm:w-32 sm:h-32',
          logoSize: 'custom' as const,
        };
    }
  };

  const { logoContainer, spinnerSize } = getDimensions();

  // Color theme mapping for the rotating ring and glows
  const getThemeColors = () => {
    switch (theme) {
      case 'red':
        return {
          track: 'border-red-100',
          gradientArc: 'from-red-600 via-orange-500 to-amber-500',
          glow: 'from-red-600/30 via-orange-500/25 to-amber-500/30',
          dots: 'bg-red-600',
          badgeText: 'text-red-700',
        };
      case 'amber':
        return {
          track: 'border-amber-100',
          gradientArc: 'from-amber-500 via-orange-500 to-red-500',
          glow: 'from-amber-500/35 via-orange-500/30 to-red-500/30',
          dots: 'bg-amber-600',
          badgeText: 'text-amber-800',
        };
      case 'emerald':
        return {
          track: 'border-emerald-100',
          gradientArc: 'from-emerald-500 via-teal-500 to-cyan-500',
          glow: 'from-emerald-500/30 via-teal-500/25 to-cyan-500/30',
          dots: 'bg-emerald-600',
          badgeText: 'text-emerald-800',
        };
      case 'violet':
      default:
        return {
          track: 'border-violet-100',
          gradientArc: 'from-violet-600 via-indigo-600 to-fuchsia-600',
          glow: 'from-violet-600/35 via-indigo-500/30 to-fuchsia-500/35',
          dots: 'bg-violet-600',
          badgeText: 'text-violet-700',
        };
    }
  };

  const themeColors = getThemeColors();

  return (
    <div className={`flex flex-col items-center justify-center text-center select-none ${className}`}>
      {/* Central Logo with Guaranteed 360-degree Motion Spinning Ring */}
      <div className={`relative flex items-center justify-center ${spinnerSize}`}>
        
        {/* 1. Ambient Background Soft Blur Glow */}
        <div
          className={`absolute inset-0 rounded-full bg-gradient-to-tr ${themeColors.glow} blur-md pointer-events-none -z-10 transform-gpu animate-pulse`}
        />

        {/* 2. Static Background Outer Circular Track */}
        <div className="absolute inset-1 rounded-full border-4 border-slate-200/70 shadow-2xs pointer-events-none z-0" />

        {/* 3. Guaranteed Continuous 360-Degree Spinning Arc Ring (120 FPS Hardware GPU Accelerated) */}
        <div className="absolute inset-1 rounded-full pointer-events-none z-10 animate-spin transform-gpu will-change-transform">
          <svg className="w-full h-full transform-gpu" viewBox="0 0 100 100">
            <defs>
              <linearGradient id={`perfectSpinnerGrad-${theme}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={theme === 'red' || theme === 'amber' ? '#EF4444' : '#7C3AED'} />
                <stop offset="50%" stopColor={theme === 'emerald' ? '#10B981' : '#F59E0B'} />
                <stop offset="100%" stopColor={theme === 'red' || theme === 'amber' ? '#D946EF' : '#2563EB'} />
              </linearGradient>
            </defs>
            <circle
              cx="50"
              cy="50"
              r="44"
              fill="none"
              stroke={`url(#perfectSpinnerGrad-${theme})`}
              strokeWidth="6"
              strokeDasharray="175 80"
              strokeLinecap="round"
            />
          </svg>
        </div>

        {/* 4. Counter-Rotating Subtle Dotted Outer Ring for Motion Depth */}
        <div className="absolute inset-[-4px] rounded-full border-2 border-dashed border-slate-300/80 pointer-events-none z-0 opacity-70 animate-[spin_3s_linear_infinite_reverse] transform-gpu will-change-transform" />

        {/* 5. Center Full-Bleed Logo Container */}
        <div className={`relative ${logoContainer} flex items-center justify-center rounded-[22%] shadow-2xl z-20 overflow-hidden`}>
          <AppLogo
            size="custom"
            className="w-full h-full"
            imageClassName="w-full h-full object-cover rounded-[22%]"
            glow={false}
          />
        </div>
      </div>

      {/* Optional Title & Subtitle */}
      {title && (
        <div className="mt-4 space-y-1 max-w-xs mx-auto">
          <h3 className="text-sm sm:text-base font-black text-slate-900 tracking-tight leading-tight">
            {title}
          </h3>
          {subtitle && (
            <p className="text-xs font-semibold text-slate-500 leading-normal">
              {subtitle}
            </p>
          )}
        </div>
      )}

      {/* Animated Bouncing Dots */}
      {showDots && (
        <div className="flex items-center justify-center gap-1.5 mt-3">
          <span className={`w-2 h-2 rounded-full ${themeColors.dots} animate-bounce [animation-delay:-0.3s]`} />
          <span className={`w-2 h-2 rounded-full ${themeColors.dots} animate-bounce [animation-delay:-0.15s]`} />
          <span className={`w-2 h-2 rounded-full ${themeColors.dots} animate-bounce`} />
        </div>
      )}
    </div>
  );
};

export default PerfectAppSpinner;
