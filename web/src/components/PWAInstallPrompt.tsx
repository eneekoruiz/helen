'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Share, PlusSquare, Download, Sparkles, Smartphone } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export default function PWAInstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    // 1) Check if already in standalone mode (installed)
    const isStandalone = 
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;

    if (isStandalone) {
      return;
    }

    // 2) Check if user dismissed it recently
    const dismissedTime = localStorage.getItem('pwa-prompt-dismissed');
    if (dismissedTime) {
      const parsedTime = parseInt(dismissedTime, 10);
      const now = Date.now();
      // Don't show again for 7 days
      if (now - parsedTime < 7 * 24 * 60 * 60 * 1000) {
        return;
      }
    }

    // 3) Detect iOS Safari
    const userAgent = window.navigator.userAgent;
    const isIOSDevice = /iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream;
    const isSafari = /Safari/.test(userAgent) && !/CriOS|FxiOS|OPiOS|mercury/i.test(userAgent);
    
    if (isIOSDevice) {
      setIsIOS(true);
      // Automatically prompt after 5 seconds on iOS
      const timer = setTimeout(() => {
        setShowPrompt(true);
      }, 5000);
      return () => clearTimeout(timer);
    }

    // 4) Detect Chromium / Android beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Automatically prompt after 4 seconds
      const timer = setTimeout(() => {
        setShowPrompt(true);
      }, 4000);
      return () => clearTimeout(timer);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleDismiss = () => {
    localStorage.setItem('pwa-prompt-dismissed', Date.now().toString());
    setShowPrompt(false);
  };

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    
    // Show native prompt
    await deferredPrompt.prompt();
    
    // Wait for the user choice
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      localStorage.setItem('pwa-prompt-dismissed', Date.now().toString());
    }
    
    // Clear deferred prompt
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  return (
    <AnimatePresence>
      {showPrompt && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/40 px-2 py-2 backdrop-blur-sm sm:px-4 sm:py-6 pointer-events-auto">
          {/* Backdrop dismiss click */}
          <div className="absolute inset-0 -z-10" onClick={handleDismiss} />
          
          <motion.div
            className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white border border-slate-100 shadow-2xl p-6 pointer-events-auto"
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
          >
            {/* Grab handle for sheet feel */}
            <div className="mx-auto -mt-2 mb-4 h-1.5 w-12 rounded-full bg-slate-200" />
            
            {/* Close Button */}
            <button
              onClick={handleDismiss}
              className="absolute right-4 top-4 rounded-full p-1.5 text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition"
              aria-label="Cerrar"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Header Content */}
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-50 text-cyan-600">
                <Sparkles className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900 leading-tight">Instala Bio-Avatar</h3>
                <p className="text-xs text-cyan-600 font-medium">Lleva tu gemelo digital fisiológico en tu pantalla de inicio</p>
              </div>
            </div>

            {/* Installation Instructions */}
            <div className="space-y-4 my-5">
              {isIOS ? (
                // iOS Safari Steps
                <div className="space-y-3">
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Sigue estos sencillos pasos para instalar la aplicación en tu iPhone o iPad usando Safari:
                  </p>
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-700">1</div>
                      <div className="text-sm text-slate-700 leading-normal">
                        Pulsa el botón de <strong>Compartir</strong> en la barra inferior del navegador Safari.
                        <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500 font-medium bg-white border border-slate-100 px-2 py-1 rounded w-fit">
                          <Share className="h-3.5 w-3.5 text-cyan-600" /> Compartir
                        </div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-700">2</div>
                      <div className="text-sm text-slate-700 leading-normal">
                        Desplázate hacia abajo y selecciona <strong>Añadir a la pantalla de inicio</strong>.
                        <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500 font-medium bg-white border border-slate-100 px-2 py-1 rounded w-fit">
                          <PlusSquare className="h-3.5 w-3.5 text-cyan-600" /> Añadir a pantalla de inicio
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                // Android / Chromium Steps
                <div className="space-y-3">
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Instala Bio-Avatar para un acceso rápido con carga instantánea y notificaciones nativas offline.
                  </p>
                  <button
                    onClick={handleInstallClick}
                    disabled={!deferredPrompt}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-600 py-3 text-sm font-semibold text-white shadow-md shadow-cyan-600/10 hover:bg-cyan-700 active:scale-98 transition disabled:opacity-50"
                  >
                    <Download className="h-4 w-4" /> Instalar Aplicación
                  </button>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-400">
              <div className="flex items-center gap-1">
                <Smartphone className="h-3.5 w-3.5" />
                <span>Solo ocupa unos KB de almacenamiento</span>
              </div>
              <button 
                onClick={handleDismiss} 
                className="text-slate-400 hover:text-slate-600 font-medium"
              >
                Quizás más tarde
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
