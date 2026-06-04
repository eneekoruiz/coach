import type { ReactNode } from 'react';
import type { Metadata, Viewport } from 'next';

import './globals.css';
import ToasterClient from '@/components/ToasterClient';
import BottomNav from '@/components/BottomNav';

export const metadata: Metadata = {
  title: 'Gemelo Digital Fisiológico',
  description: 'Dashboard para registrar, analizar y visualizar el estado fisiológico diario.',
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
    <html lang="es">
      <body className="pb-24">
        {children}
        <ToasterClient />
        <BottomNav />
      </body>
    </html>
  );
}
