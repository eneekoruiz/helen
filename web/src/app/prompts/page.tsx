'use client';

import React, { useState } from 'react';
import promptsData from '../../../data/helen_prompts.json';
import type { HelenPromptItem } from '@/types/assistant';
import { Terminal, Copy, Search, ExternalLink, Check, BookOpen } from 'lucide-react';
import toast from '@/lib/toast';
import Link from 'next/link';

export default function PromptsPage() {
  const [prompts] = useState<HelenPromptItem[]>(promptsData as HelenPromptItem[]);
  const [search, setSearch] = useState('');
  const [selectedPhase, setSelectedPhase] = useState('Todas');
  const [copiedFile, setCopiedFile] = useState<string | null>(null);

  const phases = ['Todas', ...Array.from(new Set(prompts.map((p) => p.phase)))];

  const filtered = prompts.filter((p) => {
    const matchesPhase = selectedPhase === 'Todas' || p.phase === selectedPhase;
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.file.toLowerCase().includes(search.toLowerCase());
    return matchesPhase && matchesSearch;
  });

  const handleCopy = (prompt: HelenPromptItem) => {
    const cmd = `helen prompts show ${prompt.name} --cache-ready`;
    navigator.clipboard.writeText(cmd);
    setCopiedFile(prompt.file);
    toast.success(`Comando copiado: ${cmd}`);
    setTimeout(() => setCopiedFile(null), 2000);
  };

  return (
    <div className="flex flex-col flex-1 h-full min-h-0 space-y-4">
      {/* Header */}
      <div className="p-4 rounded-3xl bg-white/75 dark:bg-slate-900/75 backdrop-blur-xl border border-white/60 dark:border-slate-800 shadow-sm shrink-0">
        <div className="flex items-center gap-2 mb-1">
          <Terminal className="w-5 h-5 text-emerald-500" />
          <h1 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
            Biblioteca de Prompts & Playbooks de Helen
          </h1>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          105 prompts técnicos clasificados por fases para ejecutar flujos autónomos con IA.
        </p>

        {/* Search & Phase chips */}
        <div className="mt-3 flex flex-col gap-2">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar prompts por nombre o palabra clave..."
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-hide">
            {phases.map((ph) => (
              <button
                key={ph}
                type="button"
                onClick={() => setSelectedPhase(ph)}
                className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition ${
                  selectedPhase === ph
                    ? 'bg-emerald-600 text-white font-bold'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                }`}
              >
                {ph}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Prompts list */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-0">
        {filtered.map((prompt, idx) => (
          <div
            key={idx}
            className="flex items-center justify-between p-3.5 rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/70 dark:border-slate-800 shadow-xs hover:border-emerald-400/50 transition"
          >
            <div className="min-w-0 pr-3">
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">
                {prompt.phase}
              </span>
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate mt-0.5">
                {prompt.name}
              </h3>
              <p className="text-[10px] text-slate-400 font-mono truncate mt-0.5">
                helen prompts show {prompt.name}
              </p>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => handleCopy(prompt)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition"
                title="Copiar comando de terminal"
              >
                {copiedFile === prompt.file ? (
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                <span className="hidden sm:inline">Copiar</span>
              </button>

              <Link
                href={`/?prompt=${encodeURIComponent(prompt.name)}`}
                className="p-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 transition"
                title="Usar con Ellen"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
