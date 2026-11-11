'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bot, CheckSquare, Utensils, Terminal, Settings } from 'lucide-react';

export default function Sidebar() {
  const pathname = usePathname();

  const links = [
    {
      name: 'Ellen Asistente',
      href: '/',
      icon: <Bot className="w-5 h-5" />,
    },
    {
      name: 'Tareas & Agenda',
      href: '/tasks',
      icon: <CheckSquare className="w-5 h-5" />,
    },
    {
      name: 'Recetas & Cocina',
      href: '/recipes',
      icon: <Utensils className="w-5 h-5" />,
    },
    {
      name: 'Prompts Helen',
      href: '/prompts',
      icon: <Terminal className="w-5 h-5" />,
    },
    {
      name: 'Ajustes',
      href: '/settings',
      icon: <Settings className="w-5 h-5" />,
    },
  ];

  return (
    <aside className="hidden md:flex flex-col w-64 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border-r border-slate-200 dark:border-slate-800 p-4 shrink-0">
      <div className="flex items-center gap-3 px-2 py-4 mb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-sky-400 flex items-center justify-center text-white font-bold shadow-md">
          E
        </div>
        <div>
          <h2 className="font-bold text-sm text-slate-900 dark:text-white leading-tight">
            Ellen Dashboard
          </h2>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Powered by Helen
          </p>
        </div>
      </div>

      <nav className="flex-1 space-y-1">
        {links.map((link) => {
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-cyan-50 text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              {link.icon}
              <span>{link.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400">
        <p className="font-semibold text-slate-700 dark:text-slate-300">
          Recordatorios Sync
        </p>
        <p className="mt-0.5 text-[10px]">PWA conectada a Vercel y Helen.</p>
      </div>
    </aside>
  );
}
