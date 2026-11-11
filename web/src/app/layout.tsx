import type { ReactNode } from 'react';
import type { Metadata, Viewport } from 'next';

import './globals.css';
import { Toaster } from 'sonner';
import PWAInstallPrompt from '@/components/PWAInstallPrompt';
import Sidebar from '@/components/Sidebar';
import BottomNav from '@/components/BottomNav';

export const metadata: Metadata = {
  metadataBase: new URL('https://mi-coach-nutricional.vercel.app'),
  title: 'Ellen | Asistente Personal Inteligente',
  description: 'Bio-Avatar interactivo conectado a Recordatorios, Helen Prompts y Gestión de Hábitos.',
  manifest: '/manifest.webmanifest',
  applicationName: 'EllenAssistant',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Ellen',
  },
  openGraph: {
    title: 'Ellen | Asistente Personal Inteligente',
    description: 'Bio-Avatar interactivo conectado a Recordatorios y Helen Prompts.',
    url: 'https://mi-coach-nutricional.vercel.app',
    siteName: 'Ellen Assistant',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Ellen Assistant preview',
      },
    ],
    locale: 'es_ES',
    type: 'website',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#0ea5e9',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es" className="h-full overflow-x-hidden" suppressHydrationWarning>
      <body className="h-full w-full max-w-full overflow-x-hidden bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans antialiased selection:bg-cyan-500/20">
        <div className="flex h-full w-full max-w-full overflow-hidden">
          <Sidebar />
          <div className="flex-1 flex flex-col min-w-0 h-full overflow-y-auto pb-20 md:pb-6">
            <main className="flex-1 flex flex-col min-h-0 w-full max-w-5xl mx-auto px-4 py-4 sm:px-6">
              {children}
            </main>
          </div>
        </div>

        <BottomNav />
        <PWAInstallPrompt />
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
