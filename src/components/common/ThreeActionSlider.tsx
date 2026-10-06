import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, LayoutGrid, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export interface ActionItem {
  id: string;
  label: string;
  shortLabel?: string;
  icon?: React.ReactNode;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'warning' | 'success' | 'amber' | 'purple' | 'blue' | 'slate' | 'outline';
  disabled?: boolean;
  title?: string;
  badge?: string | number;
}

interface ThreeActionSliderProps {
  actions: ActionItem[];
  title?: string;
  className?: string;
}

export const ThreeActionSlider: React.FC<ThreeActionSliderProps> = ({
  actions,
  title = 'Quick Actions',
  className = '',
}) => {
  const [showAllGrid, setShowAllGrid] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const sliderId = useMemo(() => `threeact-${(title || 'actions').replace(/[^a-z0-9]/gi, '-').toLowerCase()}`, [title]);

  // Filter visible actions
  const validActions = useMemo(() => actions.filter(Boolean), [actions]);

  // Group actions into chunks of 3
  const pages = useMemo(() => {
    const result: ActionItem[][] = [];
    for (let i = 0; i < validActions.length; i += 3) {
      result.push(validActions.slice(i, i + 3));
    }
    return result;
  }, [validActions]);

  const totalPages = pages.length;

  const handlePrev = () => {
    if (currentPage > 0) {
      setCurrentPage((prev) => prev - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages - 1) {
      setCurrentPage((prev) => prev + 1);
    }
  };

  const visibleActions = pages[currentPage] || [];

  const getVariantStyles = (variant?: ActionItem['variant']) => {
    switch (variant) {
      case 'primary':
        return 'bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 hover:opacity-95 text-white border-transparent shadow-sm shadow-violet-600/20';
      case 'success':
        return 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600 shadow-2xs';
      case 'danger':
        return 'bg-rose-600 hover:bg-rose-700 text-white border-rose-600 shadow-2xs';
      case 'warning':
      case 'amber':
        return 'bg-amber-500 hover:bg-amber-600 text-white border-amber-500 shadow-2xs';
      case 'purple':
        return 'bg-purple-600 hover:bg-purple-700 text-white border-purple-600 shadow-2xs';
      case 'blue':
        return 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600 shadow-2xs';
      case 'slate':
      case 'secondary':
        return 'bg-slate-800 hover:bg-slate-900 text-white border-slate-800 shadow-2xs';
      case 'outline':
      default:
        return 'bg-slate-50 hover:bg-white text-slate-800 border-slate-200 hover:border-slate-300';
    }
  };

  if (validActions.length === 0) return null;

  return (
    <div className={`bg-white border border-slate-200/90 rounded-2xl p-2.5 shadow-xs space-y-2 select-none ${className}`}>
      {/* Action Slider Header */}
      <div className="flex items-center justify-between px-1 text-xs">
        <div className="flex items-center gap-1.5 font-bold text-slate-800">
          <Zap size={13} className="text-amber-500" />
          <span>{title}</span>
          <span className="text-[10px] text-amber-700 font-mono font-medium bg-amber-50 px-1.5 py-0.2 rounded-md">
            3 per slide
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Page Dots */}
          {!showAllGrid && totalPages > 1 && (
            <div className="flex items-center gap-1">
              {pages.map((_, idx) => (
                <button
                  key={`${sliderId}-dot-${idx}`}
                  type="button"
                  onClick={() => setCurrentPage(idx)}
                  className={`h-1.5 rounded-full transition-all cursor-pointer ${
                    idx === currentPage
                      ? 'w-4 bg-amber-500'
                      : 'w-1.5 bg-slate-200 hover:bg-slate-300'
                  }`}
                  aria-label={`Go to slide ${idx + 1}`}
                />
              ))}
            </div>
          )}

          {/* Navigation controls */}
          <div className="flex items-center gap-0.5 bg-slate-100 p-0.5 rounded-xl border border-slate-200/80">
            {!showAllGrid && totalPages > 1 && (
              <>
                <button
                  type="button"
                  onClick={handlePrev}
                  disabled={currentPage === 0}
                  className={`p-1 rounded-lg transition-colors ${
                    currentPage === 0
                      ? 'text-slate-300 cursor-not-allowed'
                      : 'text-slate-700 hover:bg-white hover:text-amber-600 cursor-pointer shadow-2xs'
                  }`}
                  aria-label="Previous actions"
                >
                  <ChevronLeft size={14} />
                </button>
                <span className="text-[10px] font-mono font-bold text-slate-600 px-1">
                  {currentPage + 1}/{totalPages}
                </span>
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={currentPage >= totalPages - 1}
                  className={`p-1 rounded-lg transition-colors ${
                    currentPage >= totalPages - 1
                      ? 'text-slate-300 cursor-not-allowed'
                      : 'text-slate-700 hover:bg-white hover:text-amber-600 cursor-pointer shadow-2xs'
                  }`}
                  aria-label="Next actions"
                >
                  <ChevronRight size={14} />
                </button>
              </>
            )}

            {totalPages > 1 && (
              <button
                type="button"
                onClick={() => setShowAllGrid((prev) => !prev)}
                className={`p-1 rounded-lg transition-colors cursor-pointer ${
                  showAllGrid ? 'bg-amber-500 text-white font-bold' : 'text-slate-600 hover:bg-white hover:text-amber-600'
                }`}
                title={showAllGrid ? 'Switch to 3-per-view Slider' : 'Expand All Actions'}
              >
                <LayoutGrid size={13} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Slider View: Exactly 3 Actions per Slide */}
      <AnimatePresence mode="wait">
        {showAllGrid ? (
          <motion.div
            key={`${sliderId}-grid-view`}
            initial={{ opacity: 0, y: 3 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -3 }}
            transition={{ duration: 0.15 }}
            className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 pt-0.5"
          >
            {validActions.map((act, actIdx) => (
              <button
                key={`${sliderId}-grid-act-${act.id || actIdx}-${actIdx}`}
                type="button"
                onClick={act.onClick}
                disabled={act.disabled}
                className={`px-2.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 w-full border active:scale-95 disabled:opacity-50 disabled:pointer-events-none ${getVariantStyles(
                  act.variant
                )}`}
                title={act.title || act.label}
              >
                {act.icon && <span className="shrink-0">{act.icon}</span>}
                <span className="truncate">{act.shortLabel || act.label}</span>
                {act.badge && (
                  <span className="px-1.5 py-0.2 rounded-md bg-white/20 text-[10px] font-mono shrink-0">
                    {act.badge}
                  </span>
                )}
              </button>
            ))}
          </motion.div>
        ) : (
          <motion.div
            key={`${sliderId}-slide-page-${currentPage}`}
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            transition={{ duration: 0.18 }}
            className="grid grid-cols-3 gap-1.5 w-full pt-0.5"
          >
            {visibleActions.map((act, vIdx) => (
              <button
                key={`${sliderId}-slide-act-${act.id || vIdx}-${currentPage}-${vIdx}`}
                type="button"
                onClick={act.onClick}
                disabled={act.disabled}
                className={`px-2 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex flex-col sm:flex-row items-center justify-center gap-1 w-full border active:scale-95 disabled:opacity-50 disabled:pointer-events-none ${getVariantStyles(
                  act.variant
                )}`}
                title={act.title || act.label}
              >
                {act.icon && <span className="shrink-0">{act.icon}</span>}
                <span className="truncate text-[11px] sm:text-xs font-bold">{act.shortLabel || act.label}</span>
                {act.badge && (
                  <span className="px-1.5 py-0.2 rounded-md bg-white/20 text-[10px] font-mono shrink-0">
                    {act.badge}
                  </span>
                )}
              </button>
            ))}

            {/* Fillers if less than 3 actions on last page */}
            {visibleActions.length < 3 &&
              Array.from({ length: 3 - visibleActions.length }).map((_, idx) => (
                <div
                  key={`${sliderId}-filler-${currentPage}-${idx}`}
                  className="bg-slate-50/30 border border-dashed border-slate-200/40 rounded-xl opacity-20 h-9"
                />
              ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
