import React from 'react';
import { GlobalLoadingSystem } from './GlobalLoadingSystem';

export interface AppLoadingScreenProps {
  title?: string;
  message?: string;
  fullScreen?: boolean;
  minHeight?: string;
  className?: string;
}

export const AppLoadingScreen: React.FC<AppLoadingScreenProps> = ({
  title,
  message,
  fullScreen = false,
  minHeight,
  className,
}) => {
  // If fullScreen, use route portal overlay. Otherwise use clean inline loader
  const selectedMode = fullScreen ? 'route' : 'inline';

  return (
    <GlobalLoadingSystem
      mode={selectedMode}
      title={title}
      message={message}
      fullScreen={fullScreen}
      minHeight={minHeight}
      className={className}
    />
  );
};

export default AppLoadingScreen;
