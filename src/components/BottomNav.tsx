'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { triggerVibration } from '@/lib/haptics';

export default function BottomNav() {
  const pathname = usePathname();

  // Hide on auth and public routes
  const isPublicRoute = ['/login', '/signup', '/auth/callback'].includes(pathname);
  if (isPublicRoute) {
    return null;
  }

  const tabs = [
    {
      name: 'Inicio',
      href: '/',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      ),
    },
    {
      name: 'Nutrición',
      href: '/nutrition',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2v20" />
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
      ),
    },
    {
      name: 'Hábitos',
      href: '/habits/tracker',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
      ),
    },
    {
      name: 'Tareas',
      href: '/routines',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 11 12 14 22 4" />
          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
        </svg>
      ),
    },
    {
      name: 'Ánimo',
      href: '/mood',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M8 14s1.5 2 4 2 4-2 4-2" />
          <line x1="9" y1="9" x2="9.01" y2="9" />
          <line x1="15" y1="9" x2="15.01" y2="9" />
        </svg>
      ),
    },
    {
      name: 'Historia',
      href: '/history',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 6v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6" />
          <path d="M7 10h10" />
        </svg>
      ),
    },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 px-4 pb-safe pt-2 pointer-events-none">
      <div className="mx-auto max-w-md pointer-events-auto pb-4 sm:pb-6">
        <nav className="flex items-center justify-between bg-white/90 backdrop-blur-xl border border-slate-200/50 rounded-full px-2 py-2 shadow-[0_8px_30px_rgb(0,0,0,0.08)]">
          {tabs.map((tab) => {
            const isActive = pathname === tab.href;
            return (
              <Link
                key={tab.name}
                href={tab.href}
                onClick={() => triggerVibration('light')}
                className="relative flex flex-1 flex-col items-center justify-center py-2"
              >
                {isActive && (
                  <motion.div
                    layoutId="active-tab"
                    className="absolute inset-0 bg-slate-100/80 rounded-full"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                <div className={`relative z-10 w-6 h-6 mb-1 transition-colors duration-200 ${isActive ? 'text-slate-900' : 'text-slate-400'}`}>
                  {tab.icon}
                </div>
                <span className={`relative z-10 text-[10px] font-bold tracking-tight transition-colors duration-200 ${isActive ? 'text-slate-900' : 'text-slate-400'}`}>
                  {tab.name}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
