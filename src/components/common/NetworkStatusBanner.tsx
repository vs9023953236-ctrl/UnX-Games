import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Wifi, WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';

export const NetworkStatusBanner: React.FC = () => {
  const { isOnline, wasOffline } = useOnlineStatus();
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    if (isOnline && wasOffline) {
      setShowReconnected(true);
      const timer = setTimeout(() => {
        setShowReconnected(false);
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [isOnline, wasOffline]);

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          key="offline-toast"
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 50, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed bottom-[calc(100px+env(safe-area-inset-bottom,0px))] sm:bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900/95 border border-amber-500/50 text-white text-xs font-semibold shadow-2xl shadow-black/80 backdrop-blur-md"
        >
          <div className="w-2 h-2 rounded-full bg-amber-400 animate-ping shrink-0" />
          <WifiOff size={14} className="text-amber-400 shrink-0" />
          <span className="text-amber-200">You&apos;re offline</span>
          <span className="text-slate-400 text-[11px]">• Using cached data</span>
        </motion.div>
      )}

      {showReconnected && isOnline && (
        <motion.div
          key="online-toast"
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 50, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed bottom-[calc(100px+env(safe-area-inset-bottom,0px))] sm:bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900/95 border border-emerald-500/50 text-white text-xs font-semibold shadow-2xl shadow-black/80 backdrop-blur-md"
        >
          <div className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
          <Wifi size={14} className="text-emerald-400 shrink-0" />
          <span className="text-emerald-200">Back online</span>
          <span className="text-slate-400 text-[11px]">• Reconnected</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
