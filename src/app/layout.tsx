import type { ReactNode } from 'react';
import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';

import './globals.css';
import ToasterClient from '@/components/ToasterClient';
import BottomNav from '@/components/BottomNav';
import Sidebar from '@/components/Sidebar';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'BioAvatar - Gemelo Digital Fisiológico',
  description: 'Dashboard avanzado para registrar, analizar y visualizar tu estado fisiológico diario con IA.',
  manifest: '/manifest.webmanifest',
  applicationName: 'BioAvatar',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'BioAvatar',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#0f172a',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es" className={`${inter.variable} font-sans`}>
      <body className="antialiased text-slate-900 bg-slate-50 selection:bg-cyan-500/30 overflow-hidden overscroll-none h-[100dvh] w-full flex">
        <Sidebar />
        <main className="flex-1 flex flex-col min-h-0 min-w-0 relative overflow-y-auto">
          {children}
        </main>
        <ToasterClient />
        <BottomNav />
      </body>
    </html>
  );
}
