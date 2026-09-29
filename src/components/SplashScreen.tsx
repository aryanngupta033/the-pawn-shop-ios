import React from 'react';
import { motion } from 'motion/react';
import { Sparkles } from 'lucide-react';

interface SplashScreenProps {
  onComplete?: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = () => {
  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4, ease: 'easeInOut' }}
      className="fixed inset-0 z-50 bg-[#1c1917] text-[#faf8f5] flex flex-col items-center justify-center p-6 selection:bg-amber-900 selection:text-amber-100"
    >
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className="flex flex-col items-center max-w-sm text-center"
      >
        {/* Vintage Monogram Crest */}
        <div className="w-16 h-16 rounded-full border border-amber-500/40 flex items-center justify-center mb-6 bg-stone-900/80 shadow-inner">
          <span className="font-serif text-2xl tracking-widest text-amber-400 font-bold">PS</span>
        </div>

        {/* Title */}
        <h1 className="font-serif text-3xl sm:text-4xl tracking-widest uppercase font-bold text-stone-100 mb-2">
          The Pawn Shop
        </h1>

        <div className="h-px w-24 bg-amber-500/40 my-3" />

        <p className="text-xs sm:text-sm font-sans tracking-wider uppercase text-stone-400 font-medium">
          Curated Vintage & Collectibles
        </p>

        {/* Subtle Minimal Loader */}
        <div className="mt-12 flex items-center gap-2">
          <motion.div
            animate={{ scale: [1, 1.2, 1], opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
            className="w-1.5 h-1.5 rounded-full bg-amber-400"
          />
          <motion.div
            animate={{ scale: [1, 1.2, 1], opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}
            className="w-1.5 h-1.5 rounded-full bg-amber-400"
          />
          <motion.div
            animate={{ scale: [1, 1.2, 1], opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut', delay: 0.6 }}
            className="w-1.5 h-1.5 rounded-full bg-amber-400"
          />
        </div>

        <p className="text-[11px] text-stone-500 mt-6 font-sans">
          Connecting collectors for verified offline exchanges
        </p>
      </motion.div>
    </motion.div>
  );
};
