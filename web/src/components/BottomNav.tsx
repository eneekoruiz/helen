'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bot, CheckSquare, Utensils, Terminal, Settings } from 'lucide-react';

export default function BottomNav() {
  const pathname = usePathname();

  const tabs = [
    {
      name: 'Ellen',
      href: '/',
      icon: <Bot className="w-5 h-5" />,
    },
    {
      name: 'Tareas',
      href: '/tasks',
      icon: <CheckSquare className="w-5 h-5" />,
    },
    {
      name: 'Recetas',
      href: '/recipes',
      icon: <Utensils className="w-5 h-5" />,
    },
    {
      name: 'Prompts',
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
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg border-t border-slate-200 dark:border-slate-800 pb-[env(safe-area-inset-bottom)]">
      <div className="max-w-md mx-auto flex items-center justify-around h-16 px-2">
        {tabs.map((tab) => {
          const isActive = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-col items-center justify-center flex-1 py-1 transition-all duration-200 ${
                isActive
                  ? 'text-cyan-600 dark:text-cyan-400 font-bold scale-105'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-medium'
              }`}
            >
              <div className="relative">
                {tab.icon}
                {isActive && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-cyan-500 rounded-full" />
                )}
              </div>
              <span className="text-[10px] mt-1 tracking-tight">{tab.name}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
