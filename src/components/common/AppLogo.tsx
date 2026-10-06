import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import {
  OFFICIAL_GAME_HUB_LOGO_SVG,
  OFFICIAL_LOGO_DATA_URI,
  OFFICIAL_LOGO_URL,
  OFFICIAL_R2_LOGO,
} from '../../utils/branding';

export interface AppLogoProps {
  /**
   * Predefined responsive size presets:
   * - 'xs': 28-32px (micro badges, tables)
   * - 'sm': 36-48px (mobile header, compact chips)
   * - 'md': 48-64px (desktop header, card headers, drawer)
   * - 'lg': 80-120px (auth cards, login/register, modals)
   * - 'xl': 120-140px (splash screen, hero brand, admin preview)
   * - '2xl': 150-180px (ultra high-res splash, showcase hero)
   * - 'custom': uses width / height / className specified in container
   */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'custom';

  /**
   * Explicit container className for maximum layout flexibility
   */
  className?: string;

  /**
   * Additional className applied directly to the <img> element
   */
  imageClassName?: string;

  /**
   * Optional text brand beside/below logo
   */
  showText?: boolean;

  /**
   * Layout orientation if text is enabled
   */
  textPlacement?: 'right' | 'bottom';

  /**
   * Custom subtitle under the app name
   */
  subtitle?: string;

  /**
   * Subtle ambient glow effect matching brand colors
   */
  glow?: boolean;

  /**
   * Optional click handler
   */
  onClick?: () => void;

  /**
   * Background theme container for contrast preview
   */
  variant?: 'default' | 'transparent' | 'dark' | 'light';

  /**
   * Accessible label
   */
  alt?: string;

  /**
   * Force using icon-only mark (badge) for ultra-compact UI
   */
  useIconOnly?: boolean;
}

export const AppLogo: React.FC<AppLogoProps> = ({
  size = 'sm',
  className = '',
  imageClassName = '',
  showText = false,
  textPlacement = 'right',
  subtitle,
  glow = false,
  onClick,
  variant = 'transparent',
  alt = 'Unx Games Logo',
}) => {
  const { appSettings } = useStore();
  const [imageError, setImageError] = useState(false);
  const [useSvgFallback, setUseSvgFallback] = useState(false);

  // Robust Single Source of Truth logo resolution:
  // 1. Official High-Resolution R2 Cloud Logo (https://pub-f5b49392d8cb47b0b42800e81d2216c0.r2.dev/App%20Logo/unx.png)
  // 2. Local copy of the exact Official R2 Image (/logo.png)
  const logoSource = imageError ? '/logo.png' : (appSettings?.logoUrl || OFFICIAL_R2_LOGO);

  const handleImageError = () => {
    setImageError(true);
  };

  // Preset dimension wrappers ensuring aspect ratio preservation
  const getSizeStyles = () => {
    switch (size) {
      case 'xs':
        return 'w-7 h-7 sm:w-8 sm:h-8';
      case 'sm':
        return 'w-10 h-10 sm:w-11 sm:h-11';
      case 'md':
        return 'w-12 h-12 sm:w-14 sm:h-14';
      case 'lg':
        return 'w-20 h-20 sm:w-24 sm:h-24';
      case 'xl':
        return 'w-24 h-24 sm:w-28 sm:h-28';
      case '2xl':
        return 'w-32 h-32 sm:w-40 sm:h-40';
      case 'custom':
      default:
        return '';
    }
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'dark':
      case 'light':
      case 'default':
      case 'transparent':
      default:
        return 'bg-transparent p-0 rounded-[22%] overflow-hidden';
    }
  };

  const logoImage = (
    <div
      className={`relative shrink-0 flex items-center justify-center select-none rounded-[22%] overflow-hidden ${getSizeStyles()} ${getVariantStyles()} ${
        onClick ? 'cursor-pointer hover:opacity-95 transition-transform active:scale-95' : ''
      } ${className}`}
      onClick={onClick}
    >
      {/* Optional ambient colored glow */}
      {glow && (
        <div className="absolute inset-0 bg-gradient-to-r from-violet-600/30 via-indigo-500/30 to-fuchsia-600/30 rounded-[22%] blur-xl -z-10 animate-pulse pointer-events-none" />
      )}

      <img
        src={logoSource}
        alt={alt}
        onError={handleImageError}
        className={`w-full h-full object-cover rounded-[22%] pointer-events-none transition-all duration-200 select-none ${imageClassName}`}
        style={{
          aspectRatio: '1 / 1',
          width: '100%',
          height: '100%',
          maxWidth: '100%',
          maxHeight: '100%',
          WebkitFontSmoothing: 'antialiased',
          imageRendering: '-webkit-optimize-contrast' as any,
          transform: 'translate3d(0, 0, 0)',
          backfaceVisibility: 'hidden',
        }}
        loading="eager"
        fetchPriority="high"
        decoding="async"
      />
    </div>
  );

  if (!showText) {
    return logoImage;
  }

  return (
    <div
      className={`flex items-center gap-2.5 ${
        textPlacement === 'bottom' ? 'flex-col text-center' : 'flex-row text-left'
      } ${onClick ? 'cursor-pointer group' : ''}`}
      onClick={onClick}
    >
      {logoImage}

      <div className="min-w-0">
        <div className="font-black text-sm sm:text-base tracking-tight text-slate-900 group-hover:text-red-600 transition-colors uppercase flex items-center gap-1.5">
          <span>{appSettings?.appName || 'Unx Games'}</span>
        </div>
        {subtitle !== undefined ? (
          <div className="text-[10px] sm:text-xs font-semibold text-slate-500 truncate">
            {subtitle}
          </div>
        ) : (
          <div className="text-[10px] sm:text-xs font-bold text-red-600 truncate">
            {appSettings?.appTagline || "Nepal's #1 Game Top-Up"}
          </div>
        )}
      </div>
    </div>
  );
};
