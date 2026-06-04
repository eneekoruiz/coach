import type { ReactNode } from 'react';
import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';

import './globals.css';
import ToasterClient from '@/components/ToasterClient';
import BottomNav from '@/components/BottomNav';

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
      <body className="pb-24 antialiased text-slate-900 bg-slate-50 selection:bg-cyan-500/30 overscroll-none">
        {children}
        <ToasterClient />
        <BottomNav />
      </body>
    </html>
  );
}
