import React from 'react';
import { useStore } from '../../context/StoreContext';
import { Wrench, MessageCircle, AlertTriangle, X, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface MaintenanceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MaintenanceModal: React.FC<MaintenanceModalProps> = ({ isOpen, onClose }) => {
  const { appSettings } = useStore();

  if (!isOpen) return null;

  const supportPhone = appSettings?.whatsappNumber || '9768914027';
  const cleanPhone = supportPhone.replace(/[^0-9]/g, '');
  const waUrl = `https://wa.me/977${cleanPhone.replace(/^977/, '')}?text=${encodeURIComponent(
    'Namaste Unx Games! I would like to place an order manually while the system is under maintenance.'
  )}`;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="bg-white border border-slate-200 rounded-3xl max-w-sm w-full p-5 space-y-4 shadow-2xl text-slate-900 relative"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>

          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center shrink-0">
              <Wrench size={20} className="animate-spin" style={{ animationDuration: '8s' }} />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase text-amber-600 tracking-wider">
                Temporary Pause
              </span>
              <h3 className="text-base font-black text-slate-900">Maintenance in Progress</h3>
            </div>
          </div>

          {/* Body */}
          <p className="text-xs text-slate-600 leading-relaxed">
            Online checkouts and automatic UID top-ups are temporarily paused while our technical team upgrades the delivery nodes.
          </p>

          <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl space-y-1">
            <span className="text-[11px] font-bold text-amber-700 block">
              💡 Need Urgent Top-Up?
            </span>
            <p className="text-[10px] text-slate-600">
              You can contact our verified Nepal admin on WhatsApp for instant manual processing.
            </p>
          </div>

          {/* Actions */}
          <div className="space-y-2 pt-1">
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md transition-colors cursor-pointer"
            >
              <MessageCircle size={15} />
              <span>Order via WhatsApp Direct</span>
            </a>

            <button
              onClick={onClose}
              className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors cursor-pointer"
            >
              Got It / Browse Games
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
