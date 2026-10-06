import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { RefreshCw, X, Sparkles } from 'lucide-react';

declare global {
  interface Window {
    __ghnUpdateSW?: (reloadPage?: boolean) => Promise<void>;
  }
}

export const PWAUpdatePrompt: React.FC = () => {
  const [needRefresh, setNeedRefresh] = useState(false);

  useEffect(() => {
    const handleSWUpdate = () => {
      setNeedRefresh(true);
    };

    window.addEventListener('ghn-sw-update-available', handleSWUpdate);

    return () => {
      window.removeEventListener('ghn-sw-update-available', handleSWUpdate);
    };
  }, []);

  const handleUpdate = () => {
    if (window.__ghnUpdateSW) {
      window.__ghnUpdateSW(true);
    } else {
      window.location.reload();
    }
  };

  const handleDismiss = () => {
    setNeedRefresh(false);
  };

  return (
    <AnimatePresence>
      {needRefresh && (
        <motion.div
          key="pwa-update-toast"
          initial={{ y: -60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -60, opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] w-[92%] max-w-sm rounded-2xl bg-white border border-red-200 p-3.5 shadow-2xl shadow-slate-900/15 backdrop-blur-md text-slate-900"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center text-red-600 shrink-0">
                <Sparkles size={16} />
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-bold text-slate-900 tracking-tight">New Version Available</h4>
                <p className="text-[10px] text-slate-600 truncate font-medium">Update to get the latest features</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={handleUpdate}
                className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white font-bold text-xs shadow-md shadow-red-900/20 flex items-center gap-1 cursor-pointer active:scale-95 transition-all"
              >
                <RefreshCw size={12} className="stroke-[2.5]" />
                <span>Update Now</span>
              </button>

              <button
                type="button"
                onClick={handleDismiss}
                className="p-1 text-slate-500 hover:text-slate-900 rounded-lg transition-colors cursor-pointer"
                aria-label="Dismiss update"
              >
                <X size={15} />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
