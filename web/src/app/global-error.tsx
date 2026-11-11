'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="es">
      <body className="flex min-h-dvh items-center justify-center bg-slate-50 p-6 text-slate-950">
        <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-[0.34em] text-slate-400">Observabilidad activa</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight">Algo se ha roto</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Ya hemos capturado el error para investigarlo sin exponer datos sensibles.
          </p>
          <button
            type="button"
            onClick={() => reset()}
            className="mt-6 inline-flex min-h-[44px] items-center rounded-full bg-slate-950 px-5 text-sm font-semibold text-white transition-all duration-200 ease-in-out active:scale-95"
          >
            Reintentar
          </button>
        </div>
      </body>
    </html>
  );
}
