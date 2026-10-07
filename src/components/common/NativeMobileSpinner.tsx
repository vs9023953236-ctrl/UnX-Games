import React from 'react';
import { motion } from 'motion/react';

export type NativeSpinnerVariant = 'tapered-arc' | 'ios' | 'dual-neon' | 'pulse-ring';
export type NativeSpinnerSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type NativeSpinnerColor = 'violet' | 'indigo' | 'emerald' | 'amber' | 'white' | 'current';

export interface NativeMobileSpinnerProps {
  variant?: NativeSpinnerVariant;
  size?: NativeSpinnerSize;
  color?: NativeSpinnerColor;
  className?: string;
  label?: string;
}

const SIZE_MAP = {
  xs: { box: 16, stroke: 2, radius: 6 },
  sm: { box: 22, stroke: 2.5, radius: 8 },
  md: { box: 36, stroke: 3.5, radius: 14 },
  lg: { box: 52, stroke: 4.5, radius: 21 },
  xl: { box: 76, stroke: 5.5, radius: 31 },
};

export const NativeMobileSpinner: React.FC<NativeMobileSpinnerProps> = ({
  variant = 'tapered-arc',
  size = 'md',
  color = 'violet',
  className = '',
  label,
}) => {
  const { box, stroke, radius } = SIZE_MAP[size] || SIZE_MAP.md;

  const getColorClasses = () => {
    switch (color) {
      case 'indigo':
        return {
          stroke1: '#4F46E5',
          stroke2: '#818CF8',
          text: 'text-indigo-600',
          gradStart: '#4F46E5',
          gradEnd: '#818CF8',
        };
      case 'emerald':
        return {
          stroke1: '#10B981',
          stroke2: '#34D399',
          text: 'text-emerald-600',
          gradStart: '#10B981',
          gradEnd: '#34D399',
        };
      case 'amber':
        return {
          stroke1: '#F59E0B',
          stroke2: '#FBBF24',
          text: 'text-amber-600',
          gradStart: '#F59E0B',
          gradEnd: '#FBBF24',
        };
      case 'white':
        return {
          stroke1: '#FFFFFF',
          stroke2: 'rgba(255, 255, 255, 0.4)',
          text: 'text-white',
          gradStart: '#FFFFFF',
          gradEnd: 'rgba(255, 255, 255, 0.2)',
        };
      case 'current':
        return {
          stroke1: 'currentColor',
          stroke2: 'currentColor',
          text: 'text-current',
          gradStart: 'currentColor',
          gradEnd: 'currentColor',
        };
      case 'violet':
      default:
        return {
          stroke1: '#7C3AED',
          stroke2: '#C084FC',
          text: 'text-violet-600',
          gradStart: '#7C3AED',
          gradEnd: '#D946EF',
        };
    }
  };

  const colors = getColorClasses();
  const center = box / 2;

  // 1. iOS Native Activity Indicator (Segmented Radial Spokes)
  if (variant === 'ios') {
    const spokes = 12;
    return (
      <div className={`inline-flex flex-col items-center justify-center gap-2 select-none ${className}`}>
        <div
          style={{ width: box, height: box, transformOrigin: 'center center' }}
          className="relative shrink-0 spinner-rotate"
        >
          {Array.from({ length: spokes }).map((_, i) => {
            const angle = (i * 360) / spokes;
            const opacity = Math.max(0.18, (i + 1) / spokes);
            return (
              <span
                key={i}
                className="absolute left-1/2 top-0 rounded-full"
                style={{
                  width: Math.max(1.5, stroke * 0.75),
                  height: box * 0.27,
                  backgroundColor: colors.stroke1,
                  opacity,
                  transformOrigin: `center ${box / 2}px`,
                  transform: `translateX(-50%) rotate(${angle}deg)`,
                }}
              />
            );
          })}
        </div>
        {label && <span className={`text-xs font-semibold ${colors.text}`}>{label}</span>}
      </div>
    );
  }

  // 2. Dual Concentric Neon Rings (Gaming Native App Style - Forward Orbit)
  if (variant === 'dual-neon') {
    const outerCircumference = 2 * Math.PI * radius;
    const innerRadius = radius * 0.68;
    const innerCircumference = 2 * Math.PI * innerRadius;

    return (
      <div className={`inline-flex flex-col items-center justify-center gap-2 select-none ${className}`}>
        <div className="relative shrink-0" style={{ width: box, height: box }}>
          {/* Outer Ring Rotating Forward Clockwise */}
          <div
            className="absolute inset-0 spinner-rotate"
            style={{ transformOrigin: 'center center' }}
          >
            <svg width={box} height={box} viewBox={`0 0 ${box} ${box}`}>
              <circle
                cx={center}
                cy={center}
                r={radius}
                fill="none"
                stroke={colors.stroke1}
                strokeWidth={stroke}
                strokeDasharray={`${outerCircumference * 0.65} ${outerCircumference * 0.35}`}
                strokeLinecap="round"
                opacity={0.9}
              />
              <circle
                cx={center + radius}
                cy={center}
                r={stroke * 0.8}
                fill="#FFFFFF"
                stroke={colors.stroke1}
                strokeWidth={1}
              />
            </svg>
          </div>

          {/* Inner Ring Synchronized Forward Clockwise at Complementary Speed */}
          <div
            className="absolute inset-0 spinner-rotate-fast"
            style={{ transformOrigin: 'center center' }}
          >
            <svg width={box} height={box} viewBox={`0 0 ${box} ${box}`}>
              <circle
                cx={center}
                cy={center}
                r={innerRadius}
                fill="none"
                stroke={colors.stroke2}
                strokeWidth={Math.max(1.5, stroke * 0.7)}
                strokeDasharray={`${innerCircumference * 0.5} ${innerCircumference * 0.5}`}
                strokeLinecap="round"
                opacity={0.8}
              />
            </svg>
          </div>
        </div>
        {label && <span className={`text-xs font-semibold ${colors.text}`}>{label}</span>}
      </div>
    );
  }

  // 3. Pulse Wave Haptic Ring
  if (variant === 'pulse-ring') {
    return (
      <div className={`inline-flex flex-col items-center justify-center gap-2 select-none ${className}`}>
        <div className="relative shrink-0 flex items-center justify-center" style={{ width: box, height: box }}>
          <motion.div
            animate={{ scale: [1, 1.4, 1], opacity: [0.6, 0, 0.6] }}
            transition={{ repeat: Infinity, duration: 1.4, ease: 'easeInOut' }}
            className="absolute inset-0 rounded-full"
            style={{ border: `${stroke}px solid ${colors.stroke1}` }}
          />
          <motion.div
            animate={{ scale: [0.8, 1.1, 0.8] }}
            transition={{ repeat: Infinity, duration: 1.4, ease: 'easeInOut', delay: 0.2 }}
            className="w-1/2 h-1/2 rounded-full"
            style={{ backgroundColor: colors.stroke1 }}
          />
        </div>
        {label && <span className={`text-xs font-semibold ${colors.text}`}>{label}</span>}
      </div>
    );
  }

  // 4. Default: Tapered Native Mobile Arc (Instagram / Apple / Supercell Modern App Standard)
  const circumference = 2 * Math.PI * radius;
  const gradientId = `taperedGrad-${color}-${size}`;

  return (
    <div className={`inline-flex flex-col items-center justify-center gap-2 select-none ${className}`}>
      <div
        style={{ width: box, height: box, transformOrigin: 'center center' }}
        className="relative shrink-0 spinner-rotate"
      >
        <svg width={box} height={box} viewBox={`0 0 ${box} ${box}`}>
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={colors.gradStart} stopOpacity="1" />
              <stop offset="65%" stopColor={colors.gradEnd} stopOpacity="0.6" />
              <stop offset="100%" stopColor={colors.gradEnd} stopOpacity="0.05" />
            </linearGradient>
          </defs>

          {/* Background subtle guide track */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={colors.stroke1}
            strokeWidth={stroke}
            opacity={0.15}
          />

          {/* Smooth Sweeping Gradient Arc */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={`url(#${gradientId})`}
            strokeWidth={stroke}
            strokeDasharray={`${circumference * 0.74} ${circumference * 0.26}`}
            strokeLinecap="round"
          />

          {/* Leading High-Intensity Tip Bead for Ultra-Crisp Motion Feedback */}
          <circle
            cx={center + radius}
            cy={center}
            r={stroke * 0.7}
            fill="#FFFFFF"
            stroke={colors.stroke1}
            strokeWidth={1.2}
          />
        </svg>
      </div>
      {label && <span className={`text-xs font-semibold ${colors.text}`}>{label}</span>}
    </div>
  );
};

export default NativeMobileSpinner;
