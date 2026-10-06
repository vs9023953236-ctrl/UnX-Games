import React from 'react';
import { useStore } from '../../context/StoreContext';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useStore();

  if (!toasts || toasts.length === 0) return null;

  return (
    <div className="fixed top-3 left-3 right-3 sm:left-auto sm:right-6 sm:top-5 sm:w-96 z-[99999] flex flex-col items-center sm:items-end gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast, idx) => {
          const isSuccess = toast.type === 'success';
          const isError = toast.type === 'error';
          const isWarning = toast.type === 'warning';
          const isInfo = toast.type === 'info';

          return (
            <motion.div
              key={`toast-${toast.id || idx}-${idx}`}
              initial={{ opacity: 0, y: -16, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.96 }}
              transition={{ type: 'spring', damping: 26, stiffness: 380 }}
              onClick={() => removeToast(toast.id)}
              className="w-full pointer-events-auto bg-white/98 border border-slate-200/90 rounded-2xl shadow-[0_10px_32px_rgba(15,23,42,0.18)] p-3 flex items-start gap-2.5 text-xs text-slate-900 backdrop-blur-md cursor-pointer select-none active:scale-[0.99] transition-transform"
            >
              <div className="mt-0.5 shrink-0">
                {isSuccess && (
                  <div className="w-6 h-6 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
                    <CheckCircle2 size={16} />
                  </div>
                )}
                {isError && (
                  <div className="w-6 h-6 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center text-red-600">
                    <AlertCircle size={16} />
                  </div>
                )}
                {isWarning && (
                  <div className="w-6 h-6 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
                    <AlertTriangle size={16} />
                  </div>
                )}
                {isInfo && (
                  <div className="w-6 h-6 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
                    <Info size={16} />
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0 pt-0.5">
                <div className="font-black text-slate-900 tracking-tight text-xs sm:text-sm leading-tight">
                  {toast.title}
                </div>
                {toast.message && (
                  <div className="text-slate-600 font-medium text-[11px] sm:text-xs mt-0.5 leading-snug">
                    {toast.message}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeToast(toast.id);
                }}
                className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 p-1 rounded-lg transition-colors cursor-pointer shrink-0"
                aria-label="Dismiss toast"
              >
                <X size={14} />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};
