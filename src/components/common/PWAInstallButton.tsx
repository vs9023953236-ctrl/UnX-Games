import React, { useState } from 'react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { Download, Check, Share, PlusSquare, X, Smartphone } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AppLogo } from './AppLogo';

interface PWAInstallButtonProps {
  className?: string;
  variant?: 'compact' | 'full' | 'outline' | 'pill';
  showLabel?: boolean;
  label?: string;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  className = '',
  variant = 'compact',
  showLabel = true,
  label = 'Download Unx Games',
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showInstructions, setShowInstructions] = useState(false);

  if (isInstalled) {
    return null;
  }

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isIOS) {
      setShowInstructions(true);
      return;
    }

    if (isInstallable) {
      const res = await install();
      if (!res) {
        setShowInstructions(true);
      }
    } else {
      setShowInstructions(true);
    }
  };

  const getButtonStyles = () => {
    switch (variant) {
      case 'pill':
        return 'bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 hover:opacity-95 text-white shadow-xs font-bold text-xs py-1.5 px-3 rounded-full border border-white/20';
      case 'outline':
        return 'border border-violet-200 hover:border-violet-400 bg-violet-50/50 hover:bg-violet-100/50 text-violet-700 font-bold text-xs py-2 px-3.5 rounded-xl';
      case 'full':
        return 'w-full bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 hover:opacity-95 text-white font-extrabold text-sm py-3 px-4 rounded-xl shadow-md shadow-violet-600/20 justify-center';
      case 'compact':
      default:
        return 'h-10 sm:h-11 px-3 sm:px-3.5 bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 hover:opacity-95 text-white rounded-xl shadow-xs font-bold text-xs sm:text-sm border border-white/20';
    }
  };

  return (
    <>
      <button
        onClick={handleClick}
        className={`flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all select-none ${getButtonStyles()} ${className}`}
        title="Install Unx Games App on your device"
      >
        <Download size={15} className="stroke-[2.5]" />
        {showLabel && <span>{label}</span>}
      </button>

      {/* Manual install instruction modal */}
      <AnimatePresence>
        {showInstructions && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4"
            onClick={() => setShowInstructions(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-sm rounded-2xl bg-white p-5 sm:p-6 shadow-2xl border border-slate-200 text-slate-900"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 shrink-0 flex items-center justify-center rounded-[12px] bg-white border border-slate-200/90 shadow-2xs p-0.5 overflow-hidden">
                    <AppLogo size="custom" className="w-full h-full rounded-[10px]" imageClassName="w-full h-full object-contain rounded-[10px]" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-black text-slate-900 leading-tight">
                      Install Unx Games
                    </h3>
                    <p className="text-[11px] text-slate-500 font-medium">Add Web App to your Phone</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowInstructions(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-3 my-4 bg-slate-50 p-3.5 rounded-xl border border-slate-100 text-xs text-slate-700">
                {isIOS ? (
                  <>
                    <div className="flex items-start gap-2.5">
                      <div className="w-6 h-6 rounded-full bg-red-600 text-white font-bold flex items-center justify-center text-xs shrink-0 mt-0.5">
                        1
                      </div>
                      <div>
                        Tap the <strong className="text-slate-900 font-bold inline-flex items-center gap-1 mx-1 px-1.5 py-0.5 bg-slate-200/80 rounded text-[11px]"><Share size={12} /> Share</strong> icon in your Safari bottom bar.
                      </div>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <div className="w-6 h-6 rounded-full bg-red-600 text-white font-bold flex items-center justify-center text-xs shrink-0 mt-0.5">
                        2
                      </div>
                      <div>
                        Select <strong className="text-slate-900 font-bold inline-flex items-center gap-1 mx-1 px-1.5 py-0.5 bg-slate-200/80 rounded text-[11px]"><PlusSquare size={12} /> Add to Home Screen</strong>.
                      </div>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <div className="w-6 h-6 rounded-full bg-red-600 text-white font-bold flex items-center justify-center text-xs shrink-0 mt-0.5">
                        3
                      </div>
                      <div>
                        Tap <strong className="text-red-600 font-bold">Add</strong> at top right!
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-start gap-2.5">
                      <div className="w-6 h-6 rounded-full bg-red-600 text-white font-bold flex items-center justify-center text-xs shrink-0 mt-0.5">
                        1
                      </div>
                      <div>
                        In your browser (Chrome), tap the <strong className="text-slate-900 font-bold">Menu (⋮ 3 vertical dots)</strong>.
                      </div>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <div className="w-6 h-6 rounded-full bg-red-600 text-white font-bold flex items-center justify-center text-xs shrink-0 mt-0.5">
                        2
                      </div>
                      <div>
                        Tap <strong className="text-red-600 font-bold inline-flex items-center gap-1 mx-1 px-1.5 py-0.5 bg-red-50 rounded text-[11px]"><Download size={12} /> Install app</strong> (or <em>Add to Home screen</em>).
                      </div>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <div className="w-6 h-6 rounded-full bg-red-600 text-white font-bold flex items-center justify-center text-xs shrink-0 mt-0.5">
                        3
                      </div>
                      <div>
                        Open Unx Games directly from your phone's home screen like an APK app!
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="pt-2">
                <button
                  onClick={() => setShowInstructions(false)}
                  className="w-full py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition-colors shadow-sm cursor-pointer"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
