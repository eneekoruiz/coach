import type { ReactNode } from 'react';
import type { Metadata, Viewport } from 'next';

import './globals.css';
import { Toaster } from 'sonner';
import PWAInstallPrompt from '@/components/PWAInstallPrompt';
import Sidebar from '@/components/Sidebar';
import BottomNav from '@/components/BottomNav';
import RouteTransitionShell from '@/components/RouteTransitionShell';

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
  formatDetection: {
    telephone: false,
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
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#ffffff',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es" className="font-sans overflow-x-hidden" suppressHydrationWarning>
      <body className="antialiased text-slate-900 bg-slate-50 selection:bg-cyan-500/30 overflow-hidden overflow-x-hidden overscroll-none h-[100dvh] w-full max-w-full flex flex-col md:flex-row pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]">
        <Sidebar />
        <main className="flex-1 flex flex-col min-h-0 min-w-0 relative overflow-hidden">
          <RouteTransitionShell>{children}</RouteTransitionShell>
        </main>
        <Toaster
          position="top-center"
          toastOptions={{
            classNames: {
              toast:
                'rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 shadow-xl ring-1 ring-slate-950/5',
              title: 'text-sm font-black tracking-tight text-slate-950',
              description: 'mt-1 text-xs font-semibold leading-5 text-slate-500',
              actionButton:
                'rounded-xl bg-slate-950 px-3 py-2 text-xs font-black text-white',
              cancelButton:
                'rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-700',
              error: 'border-rose-200 bg-rose-50 text-rose-950',
              success: 'border-emerald-200 bg-emerald-50 text-emerald-950',
              warning: 'border-amber-200 bg-amber-50 text-amber-950',
            },
          }}
        />
        <BottomNav />
        <PWAInstallPrompt />
      </body>
    </html>
  );
}
