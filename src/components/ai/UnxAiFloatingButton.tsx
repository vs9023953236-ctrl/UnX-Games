import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Headphones, Sparkles } from 'lucide-react';

interface UnxAiFloatingButtonProps {
  onClick: () => void;
}

export const UnxAiFloatingButton: React.FC<UnxAiFloatingButtonProps> = ({ onClick }) => {
  const [isHovered, setIsHovered] = useState(false);

  const handleClick = () => {
    // Tactile haptic response for mobile native feel
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(12);
      } catch (_) {}
    }
    onClick();
  };

  return (
    <div
      className="fixed bottom-[calc(76px+env(safe-area-inset-bottom,0px))] sm:bottom-7 right-3.5 sm:right-6 z-40 select-none pointer-events-auto"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Floating Tooltip Pill (Shows on Desktop Hover only, strictly above the button, without breaking the circular shape) */}
      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.9 }}
            transition={{ duration: 0.18 }}
            className="hidden sm:flex items-center gap-1.5 absolute -top-10 right-0 px-3 py-1 rounded-full bg-slate-950/95 border border-violet-500/50 text-white shadow-xl shadow-violet-950/50 backdrop-blur-md pointer-events-none whitespace-nowrap z-50"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-[11px] font-black tracking-tight bg-gradient-to-r from-violet-200 via-white to-pink-200 bg-clip-text text-transparent">
              Alex Unx Agent • 24/7 AI
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Floating Button: 100% PERFECTLY ROUND (Circular), Aspect Ratio 1:1 */}
      <motion.button
        type="button"
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.92 }}
        onClick={handleClick}
        className="relative group p-0 m-0 border-0 bg-transparent rounded-full cursor-pointer focus:outline-hidden touch-manipulation block w-14 h-14 sm:w-16 sm:h-16 aspect-square"
        title="Open Alex AI Support (24/7 Live Concierge)"
        aria-label="Open Alex AI Support"
      >
        {/* Layer 1: Ambient Outer Pulse Glow Ring (Perfect Circle) */}
        <div className="absolute -inset-1 rounded-full bg-gradient-to-tr from-violet-600 via-indigo-500 to-fuchsia-500 opacity-75 blur-md group-hover:opacity-100 transition-opacity duration-300 animate-pulse pointer-events-none" />

        {/* Layer 2: Shimmering Holographic Border Ring (Perfect 100% Circle) */}
        <div className="relative w-full h-full p-[2.5px] rounded-full bg-gradient-to-tr from-violet-500 via-fuchsia-400 to-indigo-500 shadow-[0_8px_25px_rgba(99,102,241,0.55)] transition-all duration-300 group-hover:shadow-[0_12px_32px_rgba(168,85,247,0.75)]">
          {/* Layer 3: Deep Dark Cyber Glass Interior Circle */}
          <div className="w-full h-full rounded-full bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-950 flex items-center justify-center relative overflow-hidden backdrop-blur-md border border-white/25">
            {/* Subtle background light radial sweep */}
            <div className="absolute inset-0 bg-radial from-violet-500/35 via-transparent to-transparent opacity-80 group-hover:opacity-100 transition-opacity" />

            {/* Layer 4: High-Definition Gaming Concierge Icon */}
            <div className="relative z-10 flex items-center justify-center text-white">
              <Headphones
                size={24}
                className="text-white drop-shadow-[0_2px_10px_rgba(255,255,255,0.45)] group-hover:scale-110 transition-transform duration-200"
              />
            </div>

            {/* Layer 5: Mini Sparkle Accent (Bottom-Left) */}
            <Sparkles
              size={11}
              className="absolute bottom-2 left-2 z-20 text-amber-300 animate-pulse pointer-events-none drop-shadow-[0_0_4px_#fcd34d]"
            />

            {/* Layer 6: Online Live Green Beacon (Top-Right) */}
            <span className="absolute top-1.5 right-1.5 z-20 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-400 border-2 border-slate-900 shadow-[0_0_10px_#34d399]" />
            </span>
          </div>
        </div>
      </motion.button>
    </div>
  );
};
