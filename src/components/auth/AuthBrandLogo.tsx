import React from 'react';
import { useStore } from '../../context/StoreContext';
import { AUTH_R2_HORIZONTAL_LOGO } from '../../utils/branding';

export { AUTH_R2_HORIZONTAL_LOGO };

interface AuthBrandLogoProps {
  className?: string;
  onClick?: () => void;
  priority?: boolean;
}

export const AuthBrandLogo: React.FC<AuthBrandLogoProps> = React.memo(({
  className = '',
  onClick,
}) => {
  const { setCurrentTab } = useStore();

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      setCurrentTab('home');
    }
  };

  return (
    <div
      className={`w-full flex items-center justify-center cursor-pointer select-none transition-transform hover:scale-[1.02] active:scale-[0.98] py-0.5 ${className}`}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          handleClick();
        }
      }}
      aria-label="Unx Games - Return to Home"
    >
      <div className="flex items-center justify-center bg-transparent">
        <img
          src={AUTH_R2_HORIZONTAL_LOGO}
          alt="Unx Games"
          className="w-16 h-16 sm:w-20 sm:h-20 object-cover block mx-auto pointer-events-none rounded-2xl shadow-sm"
          referrerPolicy="no-referrer"
          loading="eager"
          decoding="async"
        />
      </div>
    </div>
  );
});

AuthBrandLogo.displayName = 'AuthBrandLogo';
