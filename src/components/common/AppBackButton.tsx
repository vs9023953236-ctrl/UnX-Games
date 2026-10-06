import React from 'react';
import { ChevronLeft } from 'lucide-react';
import { useStore } from '../../context/StoreContext';

export interface AppBackButtonProps {
  onClick?: () => void;
  fallbackTab?: string;
  label?: string;
  showLabel?: boolean;
  variant?: 'native' | 'pill' | 'circular' | 'subtle';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  title?: string;
  iconOnlyOnMobile?: boolean;
}

export const AppBackButton: React.FC<AppBackButtonProps> = ({
  onClick,
  fallbackTab = 'home',
  label = 'Back',
  showLabel = false,
  variant = 'circular',
  size = 'md',
  className = '',
  title = 'Go back',
  iconOnlyOnMobile = true,
}) => {
  const { goBack } = useStore();

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onClick) {
      onClick();
    } else {
      goBack(fallbackTab);
    }
  };

  // Base sizing
  const sizeClasses = {
    sm: 'h-8 w-8 min-w-8 text-xs',
    md: 'h-11 w-11 min-w-11 text-sm',
    lg: 'h-12 w-12 min-w-12 text-base',
  }[size];

  const iconSizes = {
    sm: 16,
    md: 20,
    lg: 22,
  }[size];

  // Variant styling
  if (variant === 'pill' || (showLabel && variant !== 'circular')) {
    return (
      <button
        type="button"
        onClick={handleClick}
        title={title}
        aria-label={title}
        className={`group inline-flex items-center gap-1.5 px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-2xl bg-white hover:bg-slate-50 active:bg-slate-100 border border-slate-200/90 hover:border-slate-300 shadow-2xs hover:shadow-xs active:scale-92 text-slate-800 hover:text-slate-950 font-bold transition-all duration-150 select-none cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-black/10 shrink-0 ${className}`}
      >
        <ChevronLeft
          size={iconSizes}
          strokeWidth={2.5}
          className="text-slate-700 group-hover:text-black transition-transform duration-150 group-hover:-translate-x-0.5 shrink-0"
        />
        <span className={`tracking-tight font-extrabold ${iconOnlyOnMobile ? 'hidden sm:inline' : 'inline'}`}>
          {label}
        </span>
      </button>
    );
  }

  // Circular / Native App Back Button (iOS / Android Mobile Standard)
  return (
    <button
      type="button"
      onClick={handleClick}
      title={title}
      aria-label={title}
      className={`group ${sizeClasses} rounded-2xl bg-white hover:bg-slate-50 active:bg-slate-100 border border-slate-200/90 hover:border-slate-300 shadow-2xs hover:shadow-xs active:scale-90 text-slate-800 hover:text-slate-950 flex items-center justify-center transition-all duration-150 select-none cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-black/10 shrink-0 ${className}`}
    >
      <ChevronLeft
        size={iconSizes}
        strokeWidth={2.5}
        className="text-slate-700 group-hover:text-black transition-transform duration-150 group-hover:-translate-x-0.5 shrink-0"
      />
      {showLabel && (
        <span className={`tracking-tight font-extrabold ml-1 pr-1.5 ${iconOnlyOnMobile ? 'hidden sm:inline' : 'inline'}`}>
          {label}
        </span>
      )}
    </button>
  );
};
