import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import './index.css';

// Register Service Worker gracefully in production without auto-reload loops
try {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator && Boolean((import.meta as any).env?.PROD)) {
    const updateSW = registerSW({
      immediate: false,
      onNeedRefresh() {
        // Notify the in-app PWAUpdatePrompt component gracefully without auto-reloading
        window.dispatchEvent(new CustomEvent('ghn-sw-update-available'));
      },
      onOfflineReady() {
        console.log('Unx Games is ready to work offline.');
      },
    });

    (window as any).__ghnUpdateSW = updateSW;
  }
} catch (swErr) {
  console.warn('PWA Service Worker registration non-critical note:', swErr);
}

// Global PWA beforeinstallprompt capture for reliable in-app install triggers
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    (window as any).__pwaPromptEvent = e;
  });
}

// Handle Vite dynamic chunk loading errors gracefully
if (typeof window !== 'undefined') {
  window.addEventListener('vite:preloadError', (event) => {
    console.warn('[Vite Preload Error] Reloading to fetch updated modules:', event);
    window.location.reload();
  });
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
);
