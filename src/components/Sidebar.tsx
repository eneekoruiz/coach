'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';

export default function Sidebar() {
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
      href: '/habits',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 13c0 5-3.5 7.5-8 9-4.5-1.5-8-4-8-9V5l8-3 8 3v8z" />
          <path d="M9 12l2 2 4-5" />
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
    <aside className="hidden md:flex flex-col w-20 lg:w-64 bg-white border-r border-slate-100 shadow-sm h-full overflow-y-auto z-40">
      <div className="flex-1 flex flex-col pt-8 pb-6 px-4 lg:px-6 gap-4">
        <Link
          href="/profile"
          className="flex items-center justify-center lg:justify-start px-2 mb-8 hover:opacity-80 transition-opacity cursor-pointer"
        >
          <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white font-black text-xl shadow-md">
            B
          </div>
          <span className="hidden lg:block ml-3 font-black text-xl text-slate-800 tracking-tight">
            BioAvatar
          </span>
        </Link>

        <nav className="flex flex-col gap-2">
          {tabs.map((tab) => {
            const isActive = tab.href === '/' ? pathname === '/' : pathname === tab.href || pathname.startsWith(`${tab.href}/`);
            return (
              <Link
                key={tab.name}
                href={tab.href}
                className={`relative flex items-center p-3 rounded-2xl group transition-colors duration-200 ${!isActive ? 'hover:bg-slate-50' : ''}`}
              >
                {isActive && (
                  <motion.div
                    layoutId="active-sidebar-tab"
                    className="absolute inset-0 bg-slate-900 rounded-2xl"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                <div className={`relative z-10 w-6 h-6 lg:mr-3 transition-colors duration-200 flex-shrink-0 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-900'}`}>
                  {tab.icon}
                </div>
                <span className={`hidden lg:block relative z-10 text-sm font-bold tracking-tight transition-colors duration-200 ${isActive ? 'text-white' : 'text-slate-500 group-hover:text-slate-900'}`}>
                  {tab.name}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
