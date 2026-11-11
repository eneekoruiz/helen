'use client';

import React from 'react';

export default function GlobalLoading() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 px-4 py-6 sm:px-6 md:px-8 space-y-6 animate-pulse" aria-hidden="true">
      <div className="rounded-[2.5rem] bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 p-8 flex flex-col items-center justify-center gap-4 max-w-4xl mx-auto min-h-[360px] shadow-sm">
        <div className="w-28 h-28 rounded-full bg-slate-200 dark:bg-slate-800" />
        <div className="h-6 w-48 bg-slate-200 dark:bg-slate-800 rounded-full" />
        <div className="h-4 w-72 bg-slate-100 dark:bg-slate-800/60 rounded-full" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-4xl mx-auto">
        {Array.from({ length: 3 }).map((_, idx) => (
          <div key={idx} className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 h-28" />
        ))}
      </div>
    </div>
  );
}
