'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, type PanInfo } from 'framer-motion';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export default function BottomSheet({ isOpen, onClose, title, children }: BottomSheetProps) {
  const [mounted, setMounted] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    setMounted(true);
    const mediaQuery = window.matchMedia('(min-width: 768px)');
    const updateViewportMode = () => setIsDesktop(mediaQuery.matches);

    updateViewportMode();
    mediaQuery.addEventListener('change', updateViewportMode);

    return () => {
      mediaQuery.removeEventListener('change', updateViewportMode);
      setMounted(false);
    };
  }, []);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[150] bg-slate-950/60 backdrop-blur-sm pointer-events-auto"
          />

          {/* Drawer Panel */}
          <motion.div
            initial={isDesktop ? { x: '100%', y: 0 } : { y: '100%', x: 0 }}
            animate={{ y: 0, x: 0 }}
            exit={isDesktop ? { x: '100%', y: 0 } : { y: '100%', x: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 240 }}
            drag={isDesktop ? false : 'y'}
            dragConstraints={{ top: 0 }}
            dragElastic={0.15}
            onDragEnd={(_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
              if (info.offset.y > 100) {
                onClose();
              }
            }}
            className="fixed bottom-0 left-0 right-0 z-[160] flex max-h-[85dvh] flex-col rounded-t-[2.5rem] border-t border-slate-200/80 bg-white p-6 pb-8 shadow-[0_-10px_40px_rgba(0,0,0,0.06)] pointer-events-auto md:bottom-0 md:left-auto md:top-0 md:h-[100dvh] md:max-h-none md:w-[400px] md:rounded-l-[2rem] md:rounded-tr-none md:border-l md:border-t-0 md:shadow-[-18px_0_60px_rgba(15,23,42,0.12)]"
          >
            {/* Drag Handle indicator */}
            <div className="mx-auto w-12 h-1.5 bg-slate-200 rounded-full mb-5 cursor-grab active:cursor-grabbing shrink-0" />

            {/* Header Area */}
            <div className="flex items-center justify-between mb-6 shrink-0">
              <h3 className="text-xl font-black text-slate-900">{title}</h3>
              <button
                type="button"
                onClick={onClose}
                className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition-all duration-200 ease-in-out hover:bg-slate-200 active:scale-95"
              >
                ✕
              </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto scrollbar-hide">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}
