import { useEffect, useState } from 'react';

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

declare global {
  interface Window {
    __pwaPromptEvent?: BeforeInstallPromptEvent | null;
  }
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(
    typeof window !== 'undefined' ? window.__pwaPromptEvent || null : null
  );
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // 1. Detect standalone mode (already installed or launched from home screen)
    const standaloneMediaQuery = window.matchMedia('(display-mode: standalone)');
    const checkStandalone = () => {
      const isStandaloneMode =
        standaloneMediaQuery.matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
        document.referrer.includes('android-app://');
      setIsInstalled(isStandaloneMode);
      setIsStandalone(isStandaloneMode);
    };

    checkStandalone();

    // 2. Detect iOS devices
    const ua = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(ua) && !(window as any).MSStream;
    setIsIOS(isIOSDevice);

    // 3. Handle beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      window.__pwaPromptEvent = promptEvent;
      setDeferredPrompt(promptEvent);
    };

    // 4. Handle app installed event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      window.__pwaPromptEvent = null;
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    if (standaloneMediaQuery.addEventListener) {
      standaloneMediaQuery.addEventListener('change', checkStandalone);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      if (standaloneMediaQuery.removeEventListener) {
        standaloneMediaQuery.removeEventListener('change', checkStandalone);
      }
    };
  }, []);

  const install = async (): Promise<boolean> => {
    const promptEvent = deferredPrompt || window.__pwaPromptEvent;
    if (!promptEvent) {
      return false;
    }

    try {
      await promptEvent.prompt();
      const { outcome } = await promptEvent.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
        setDeferredPrompt(null);
        window.__pwaPromptEvent = null;
        return true;
      }
      return false;
    } catch (err) {
      console.warn('PWA installation error:', err);
      return false;
    }
  };

  return {
    isInstallable: !!deferredPrompt || !!window.__pwaPromptEvent,
    isInstalled,
    isStandalone,
    isIOS,
    install,
  };
}
