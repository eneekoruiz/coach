'use client';

import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { usePathname } from 'next/navigation';

export default function RouteTransitionShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        initial={{ opacity: 0.82 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0.94 }}
        transition={{ duration: 0.15, ease: 'easeOut' }}
        className="flex min-h-0 min-w-0 max-w-full flex-1 flex-col overflow-hidden overflow-x-hidden"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
