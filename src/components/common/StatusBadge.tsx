import React from 'react';
import { OrderStatus } from '../../types';
import { Clock, CheckCircle2, AlertCircle, XCircle, RefreshCw, ShieldCheck, Truck } from 'lucide-react';

interface StatusBadgeProps {
  status: OrderStatus | string;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = 'md',
  showIcon = true,
}) => {
  const statusStr = String(status || '').toLowerCase().trim();
  const getStatusConfig = () => {
    if (statusStr.includes('pending_payment') || statusStr === 'pending_payment') {
      return {
        label: 'Pending Payment',
        icon: Clock,
        bg: 'bg-[#D97706]/10 border-[#D97706]/20 text-[#D97706]',
      };
    }
    if (statusStr.includes('pending')) {
      return {
        label: 'Pending',
        icon: Clock,
        bg: 'bg-amber-500/10 border-amber-500/20 text-amber-700',
      };
    }
    if (statusStr.includes('verification') || statusStr === 'payment_verification') {
      return {
        label: 'Payment Verification',
        icon: ShieldCheck,
        bg: 'bg-orange-500/10 border-orange-500/20 text-orange-700',
      };
    }
    if (statusStr === 'payment_verified' || statusStr === 'verified') {
      return {
        label: 'Payment Verified',
        icon: CheckCircle2,
        bg: 'bg-blue-500/10 border-blue-500/20 text-blue-700',
      };
    }
    if (statusStr.includes('processing')) {
      return {
        label: 'Processing',
        icon: RefreshCw,
        bg: 'bg-orange-600/10 border-orange-600/20 text-orange-700',
      };
    }
    if (statusStr.includes('delivered')) {
      return {
        label: 'Delivered',
        icon: Truck,
        bg: 'bg-blue-500/10 border-blue-500/20 text-blue-700',
      };
    }
    if (statusStr.includes('completed') || statusStr === 'success') {
      return {
        label: 'Completed',
        icon: CheckCircle2,
        bg: 'bg-emerald-600/10 border-emerald-600/20 text-emerald-700',
      };
    }
    if (statusStr.includes('rejected') || statusStr.includes('failed')) {
      return {
        label: 'Rejected',
        icon: XCircle,
        bg: 'bg-red-600/10 border-red-600/20 text-red-700',
      };
    }
    if (statusStr.includes('refunded')) {
      return {
        label: 'Refunded',
        icon: CheckCircle2,
        bg: 'bg-emerald-600/10 border-emerald-600/20 text-emerald-700',
      };
    }
    if (statusStr.includes('refunding') || statusStr === 'refund_processing') {
      return {
        label: 'Refunding',
        icon: RefreshCw,
        bg: 'bg-orange-600/10 border-orange-600/20 text-orange-700',
      };
    }
    if (statusStr.includes('refund_requested') || statusStr.includes('refund_pending') || statusStr === 'cancellation_requested') {
      return {
        label: 'Refund Pending',
        icon: Clock,
        bg: 'bg-amber-500/10 border-amber-500/20 text-amber-700',
      };
    }
    if (statusStr.includes('cancel')) {
      return {
        label: 'Cancelled',
        icon: AlertCircle,
        bg: 'bg-rose-600/10 border-rose-600/20 text-rose-700',
      };
    }

    const cleanLabel = statusStr ? statusStr.replace(/_/g, ' ') : 'Pending';
    return {
      label: cleanLabel,
      icon: Clock,
      bg: 'bg-slate-100 border-slate-200 text-slate-700',
    };
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  const sizeClasses = {
    sm: 'text-[10px] h-5 px-2 gap-1 font-bold',
    md: 'text-xs h-6 px-2.5 gap-1.5 font-bold',
    lg: 'text-sm h-7 px-3 gap-2 font-bold',
  };

  const iconSizes = {
    sm: 11,
    md: 13,
    lg: 15,
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border whitespace-nowrap select-none fhd-crisp ${config.bg} ${sizeClasses[size]}`}
    >
      {showIcon && <Icon size={iconSizes[size]} className="shrink-0 fhd-vector" />}
      <span className="capitalize">{config.label}</span>
    </span>
  );
};
