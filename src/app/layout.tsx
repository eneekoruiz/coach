import type { ReactNode } from 'react';
import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';

import './globals.css';
import { Toaster } from 'sonner';
import BottomNav from '@/components/BottomNav';
import Sidebar from '@/components/Sidebar';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  metadataBase: new URL('https://coach-mascota.vercel.app'),
  title: 'Bio-Avatar | Tu Gemelo Digital Fisiológico',
  description: 'Dashboard avanzado para registrar, analizar y visualizar tu estado fisiológico diario con IA.',
  manifest: '/manifest.webmanifest',
  applicationName: 'BioAvatar',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'BioAvatar',
  },
  openGraph: {
    title: 'Bio-Avatar | Tu Gemelo Digital Fisiológico',
    description: 'Registra, analiza y visualiza tu estado fisiológico en tiempo real con inteligencia artificial.',
    url: 'https://coach-mascota.vercel.app',
    siteName: 'Bio-Avatar',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Bio-Avatar Metas Fisiológicas',
      },
    ],
    locale: 'es_ES',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Bio-Avatar | Tu Gemelo Digital Fisiológico',
    description: 'Registra, analiza y visualiza tu estado fisiológico en tiempo real con inteligencia artificial.',
    images: ['/og-image.jpg'],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#ffffff',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es" className={`${inter.variable} font-sans`}>
      <body className="antialiased text-slate-900 bg-slate-50 selection:bg-cyan-500/30 overflow-hidden overscroll-none h-[100dvh] w-full flex">
        {/* Spatial 3D Layout Structure */}
        <Sidebar />
        <main className="flex-1 flex flex-col min-h-0 min-w-0 relative overflow-y-auto">
          {children}
        </main>
        <Toaster richColors theme="system" position="top-center" />
        <BottomNav />
      </body>
    </html>
  );
}
