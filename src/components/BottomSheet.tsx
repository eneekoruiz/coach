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

  useEffect(() => {
    setMounted(true);
    return () => {
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
            initial={{ y: '100%', x: 0 }}
            animate={{ y: 0, x: 0 }}
            exit={{ y: '100%', x: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 240 }}
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={0.15}
            onDragEnd={(_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
              if (info.offset.y > 100) {
                onClose();
              }
            }}
            onClick={(event: React.MouseEvent<HTMLDivElement>) => event.stopPropagation()}
            className="fixed bottom-0 left-0 right-0 z-[160] mx-auto flex max-h-[88dvh] w-full max-w-2xl flex-col rounded-t-[2.5rem] border-t border-slate-200/80 bg-white p-6 pb-8 shadow-[0_-18px_60px_rgba(15,23,42,0.14)] pointer-events-auto"
          >
            {/* Drag Handle indicator */}
            <div className="mx-auto w-12 h-1.5 bg-slate-200 rounded-full mb-5 cursor-grab active:cursor-grabbing shrink-0" />

            {/* Header Area */}
            <div className="flex items-center justify-between mb-6 shrink-0">
              <h3 className="text-xl font-black text-slate-900">{title}</h3>
              <button
                type="button"
                onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
                  event.stopPropagation();
                  onClose();
                }}
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
