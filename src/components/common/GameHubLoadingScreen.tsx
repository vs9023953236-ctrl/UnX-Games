import React from 'react';
import { GlobalLoadingSystem, type GlobalLoadingSystemProps } from './GlobalLoadingSystem';

export interface GameHubLoadingScreenProps {
  message?: string;
  isPreview?: boolean;
  onDismissPreview?: () => void;
  autoFinish?: boolean;
  minDuration?: number;
  onFinish?: () => void;
}

export const GameHubLoadingScreen: React.FC<GameHubLoadingScreenProps> = (props) => {
  return <GlobalLoadingSystem mode="startup" {...props} />;
};

export type UnxGamesLoadingScreenProps = GameHubLoadingScreenProps;
export const UnxGamesLoadingScreen = GameHubLoadingScreen;

export default GameHubLoadingScreen;
