import React from 'react';

type AvatarWidgetProps = {
  normalizedMomentum?: number;
  avatarUrl?: string;
  insightText?: string;
  stateLabel?: string;
};

export default function AvatarWidget({
  normalizedMomentum = 85,
  avatarUrl = '/default-avatar.png',
  insightText = 'Sistema en equilibrio. Todo listo para hoy.',
  stateLabel,
}: AvatarWidgetProps) {
  const status =
    stateLabel ||
    (normalizedMomentum > 80
      ? 'Óptimo'
      : normalizedMomentum > 40
      ? 'Estable'
      : 'Atención');

  return (
    <div className="flex flex-col items-center text-center">
      <div className="relative aspect-square w-32 sm:w-40 md:w-44 overflow-hidden rounded-3xl border-4 border-white/80 dark:border-slate-800 shadow-xl bg-white dark:bg-slate-900 mb-3 flex-shrink-0 transition-transform hover:scale-105 duration-300">
        <img
          src={avatarUrl}
          alt="Ellen Avatar"
          className="w-full h-full object-cover"
          loading="eager"
        />
        <div className="absolute top-2 right-2 flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
        </div>
      </div>

      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border border-slate-200 dark:border-slate-700 shadow-xs mb-2">
        <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
        <span className="text-xs font-bold text-slate-800 dark:text-slate-100 tracking-tight">
          {status}
        </span>
      </div>

      {insightText && (
        <p className="text-[11px] sm:text-xs text-slate-600 dark:text-slate-400 max-w-xs line-clamp-2 leading-relaxed">
          {insightText}
        </p>
      )}
    </div>
  );
}
