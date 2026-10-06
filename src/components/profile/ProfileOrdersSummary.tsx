import React from 'react';
import { useStore } from '../../context/StoreContext';
import {
  ShoppingBag,
  ReceiptText,
  Clock,
  CheckCircle2,
  Star,
  ChevronRight,
} from 'lucide-react';
import { motion } from 'motion/react';

interface ProfileOrdersSummaryProps {
  totalOrders: number;
  processingOrders: number;
  completedOrders: number;
  reviewsCount: number;
}

export const ProfileOrdersSummary: React.FC<ProfileOrdersSummaryProps> = ({
  totalOrders,
  processingOrders,
  completedOrders,
  reviewsCount,
}) => {
  const { setCurrentTab, openReviews } = useStore();

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.05 }}
      className="w-full bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3.5"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-red-50 text-red-600 flex items-center justify-center">
            <ShoppingBag size={15} className="stroke-[2.2]" />
          </div>
          <h2 className="text-xs sm:text-sm font-black text-slate-900 tracking-tight">
            Orders &amp; Top-Ups
          </h2>
        </div>

        <button
          type="button"
          onClick={() => setCurrentTab('orders')}
          className="text-[11px] sm:text-xs font-bold text-red-600 hover:text-red-700 inline-flex items-center gap-1 transition-colors cursor-pointer group"
        >
          <span>View All ({totalOrders})</span>
          <ChevronRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>

      {/* 4 Metric Columns Grid */}
      <div className="grid grid-cols-4 gap-2">
        {/* 1. Total Orders */}
        <button
          type="button"
          onClick={() => setCurrentTab('orders')}
          className="flex flex-col items-center justify-center p-2.5 sm:p-3 rounded-xl bg-slate-50/90 hover:bg-red-50/70 border border-slate-100 hover:border-red-200/80 active:scale-[0.97] transition-all cursor-pointer text-center group"
          title="View All Orders"
        >
          <div className="w-8 h-8 rounded-lg bg-red-100/80 text-red-600 flex items-center justify-center mb-1 group-hover:scale-105 transition-transform">
            <ReceiptText size={16} className="stroke-[2.2]" />
          </div>
          <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider block truncate">
            Total
          </span>
          <span className="text-sm sm:text-base font-black text-slate-900 group-hover:text-red-600 font-mono leading-tight transition-colors">
            {totalOrders}
          </span>
        </button>

        {/* 2. Processing / Pending */}
        <button
          type="button"
          onClick={() => setCurrentTab('orders')}
          className="flex flex-col items-center justify-center p-2.5 sm:p-3 rounded-xl bg-slate-50/90 hover:bg-amber-50/70 border border-slate-100 hover:border-amber-200/80 active:scale-[0.97] transition-all cursor-pointer text-center group relative"
          title="View Pending Orders"
        >
          <div className="w-8 h-8 rounded-lg bg-amber-100/80 text-amber-600 flex items-center justify-center mb-1 group-hover:scale-105 transition-transform relative">
            <Clock size={16} className="stroke-[2.2]" />
            {processingOrders > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
            )}
          </div>
          <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider block truncate">
            Pending
          </span>
          <span className="text-sm sm:text-base font-black text-amber-600 font-mono leading-tight">
            {processingOrders}
          </span>
        </button>

        {/* 3. Delivered / Completed */}
        <button
          type="button"
          onClick={() => setCurrentTab('orders')}
          className="flex flex-col items-center justify-center p-2.5 sm:p-3 rounded-xl bg-slate-50/90 hover:bg-emerald-50/70 border border-slate-100 hover:border-emerald-200/80 active:scale-[0.97] transition-all cursor-pointer text-center group"
          title="View Delivered Orders"
        >
          <div className="w-8 h-8 rounded-lg bg-emerald-100/80 text-emerald-600 flex items-center justify-center mb-1 group-hover:scale-105 transition-transform">
            <CheckCircle2 size={16} className="stroke-[2.2]" />
          </div>
          <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider block truncate">
            Delivered
          </span>
          <span className="text-sm sm:text-base font-black text-emerald-600 font-mono leading-tight">
            {completedOrders}
          </span>
        </button>

        {/* 4. Customer Reviews */}
        <button
          type="button"
          onClick={() => {
            if (openReviews) {
              openReviews();
            } else {
              setCurrentTab('reviews');
            }
          }}
          className="flex flex-col items-center justify-center p-2.5 sm:p-3 rounded-xl bg-slate-50/90 hover:bg-amber-50/70 border border-slate-100 hover:border-amber-200/80 active:scale-[0.97] transition-all cursor-pointer text-center group"
          title="View Your Reviews"
        >
          <div className="w-8 h-8 rounded-lg bg-amber-100/80 text-amber-600 flex items-center justify-center mb-1 group-hover:scale-105 transition-transform">
            <Star size={16} className="fill-amber-500 text-amber-500" />
          </div>
          <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider block truncate">
            Reviews
          </span>
          <span className="text-sm sm:text-base font-black text-amber-600 font-mono leading-tight">
            {reviewsCount}
          </span>
        </button>
      </div>
    </motion.div>
  );
};
