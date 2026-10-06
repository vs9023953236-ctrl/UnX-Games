import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Check, Clock, ShieldAlert, ShieldCheck, Zap, Truck, CheckCircle2, XCircle, Ban } from 'lucide-react';
import { OrderStatus } from '../../types';

export interface OrderStatusOption {
  value: OrderStatus;
  label: string;
  description: string;
  icon: React.ReactNode;
  badgeBg: string;
  textColor: string;
  borderColor: string;
}

export const STATUS_OPTIONS: OrderStatusOption[] = [
  {
    value: 'pending_payment',
    label: 'Pending Payment',
    description: 'Awaiting customer payment transfer',
    icon: <Clock size={16} />,
    badgeBg: 'bg-amber-100 text-amber-800',
    textColor: 'text-amber-900',
    borderColor: 'border-amber-300',
  },
  {
    value: 'payment_verification',
    label: 'Payment Verification',
    description: 'Verifying Ref ID or bank statement',
    icon: <ShieldAlert size={16} />,
    badgeBg: 'bg-sky-100 text-sky-800',
    textColor: 'text-sky-900',
    borderColor: 'border-sky-300',
  },
  {
    value: 'payment_verified',
    label: 'Payment Verified',
    description: 'Payment confirmed & matched',
    icon: <ShieldCheck size={16} />,
    badgeBg: 'bg-emerald-100 text-emerald-800',
    textColor: 'text-emerald-900',
    borderColor: 'border-emerald-300',
  },
  {
    value: 'processing',
    label: 'Processing Topup',
    description: 'Game topup or gift card processing',
    icon: <Zap size={16} />,
    badgeBg: 'bg-orange-100 text-orange-800',
    textColor: 'text-orange-900',
    borderColor: 'border-orange-300',
  },
  {
    value: 'delivered',
    label: 'Delivered',
    description: 'Code or topup sent to user',
    icon: <Truck size={16} />,
    badgeBg: 'bg-blue-100 text-blue-800',
    textColor: 'text-blue-900',
    borderColor: 'border-blue-300',
  },
  {
    value: 'completed',
    label: 'Completed',
    description: 'Order fully fulfilled & closed',
    icon: <CheckCircle2 size={16} />,
    badgeBg: 'bg-green-100 text-green-800',
    textColor: 'text-green-900',
    borderColor: 'border-green-300',
  },
  {
    value: 'rejected',
    label: 'Rejected',
    description: 'Payment invalid or mismatched',
    icon: <XCircle size={16} />,
    badgeBg: 'bg-rose-100 text-rose-800',
    textColor: 'text-rose-900',
    borderColor: 'border-rose-300',
  },
  {
    value: 'cancelled',
    label: 'Cancelled',
    description: 'Order cancelled by user or admin',
    icon: <Ban size={16} />,
    badgeBg: 'bg-slate-200 text-slate-800',
    textColor: 'text-slate-900',
    borderColor: 'border-slate-300',
  },
];

interface OrderStatusBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  currentStatus: OrderStatus;
  orderIdDisplay?: string;
  onSelectStatus: (newStatus: OrderStatus) => void;
  disabled?: boolean;
}

export const OrderStatusBottomSheet: React.FC<OrderStatusBottomSheetProps> = ({
  isOpen,
  onClose,
  currentStatus,
  orderIdDisplay,
  onSelectStatus,
  disabled = false,
}) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
        {/* Dark Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity"
        />

        {/* Bottom Sheet Card */}
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 26, stiffness: 280 }}
          className="relative w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-4 sm:p-5 shadow-2xl z-10 max-h-[85vh] flex flex-col overflow-hidden border border-slate-100"
        >
          {/* Pull Handle Bar */}
          <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-3 shrink-0" />

          {/* Sheet Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-slate-900">Update Order Status</h3>
                {orderIdDisplay && (
                  <span className="text-xs font-mono font-bold bg-red-50 text-red-700 px-2 py-0.5 rounded-md border border-red-100">
                    #{orderIdDisplay}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">Select order status to update queue state</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          {/* Options List */}
          <div className="overflow-y-auto py-2 space-y-2 flex-1 scrollbar-none pr-0.5">
            {STATUS_OPTIONS.map((opt, optIdx) => {
              const isSelected = currentStatus === opt.value;

              return (
                <button
                  key={`status-opt-${opt.value}-${optIdx}`}
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    if (disabled) return;
                    onSelectStatus(opt.value);
                    onClose();
                  }}
                  className={`w-full text-left p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none disabled:cursor-not-allowed ${
                    isSelected
                      ? `${opt.borderColor} bg-red-50/50 shadow-xs ring-2 ring-red-500/20`
                      : 'border-slate-100 bg-white hover:bg-slate-50 hover:border-slate-200 cursor-pointer'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${opt.badgeBg}`}>
                      {opt.icon}
                    </div>
                    <div className="min-w-0">
                      <p className={`text-xs font-black ${isSelected ? 'text-red-900' : 'text-slate-800'}`}>
                        {opt.label}
                      </p>
                      <p className="text-[10.5px] text-slate-500 truncate">{opt.description}</p>
                    </div>
                  </div>

                  {/* Radio Indicator */}
                  <div className="shrink-0">
                    <div
                      className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                        isSelected
                          ? 'bg-red-600 border-red-600 text-white'
                          : 'border-slate-300 bg-white'
                      }`}
                    >
                      {isSelected && <Check size={12} strokeWidth={3} />}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
