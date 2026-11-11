'use client';

import React, { useState, useEffect, useRef } from 'react';
import Hero3D from '@/components/Hero3D';
import AvatarWidget from '@/components/AvatarWidget';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { Mic, MicOff, Send, Sparkles, CheckSquare, Utensils, Terminal, ArrowRight } from 'lucide-react';
import Link from 'next/link';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  time: string;
}

export default function HomePage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        '¡Hola Eneko! Soy Ellen. Estoy conectada a tus Recordatorios y a la biblioteca de prompts de Helen. ¿En qué te ayudo hoy?',
      time: 'Ahora',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [avatarStatus, setAvatarStatus] = useState<string>('Óptimo');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { isListening, toggleListening } = useSpeechRecognition({
    onTranscript: (transcript: string) => {
      setInput((prev) => (prev ? `${prev} ${transcript}` : transcript));
    },
    onEnd: () => {
      setAvatarStatus('Escuchando');
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async (customText?: string) => {
    const textToSend = customText || input;
    if (!textToSend.trim() || loading) return;

    const userMsg: Message = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: textToSend.trim(),
      time: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!customText) setInput('');
    setLoading(true);
    setAvatarStatus('Pensando...');

    try {
      // Get stored user apiKey if present
      const storedKey = typeof window !== 'undefined' ? localStorage.getItem('ellen_gemini_key') : null;

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMsg].map((m) => ({ role: m.role, content: m.content })),
          apiKey: storedKey || undefined,
        }),
      });

      const data = await res.json();
      const assistantMsg: Message = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        content: data.content || 'Sin respuesta',
        time: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, assistantMsg]);
      setAvatarStatus('Óptimo');
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content: 'No he podido procesar la solicitud en este momento. Revisa la conexión.',
          time: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
      setAvatarStatus('Atención');
    } finally {
      setLoading(false);
    }
  };

  const quickChips = [
    { label: '¿Qué tengo hoy?', query: '¿Qué tareas y rutinas tengo programadas para hoy en Recordatorios?' },
    { label: 'Receta rápida', query: 'Sugiéreme una receta saludable y rápida con pollo o avena de las que tengo guardadas.' },
    { label: 'Prompts de Helen', query: '¿Qué prompts o playbooks de Helen me recomiendas para auditar mi código?' },
    { label: 'Beber agua', query: 'Recuérdame beber un vaso de agua y actualizar mis hábitos vitales.' },
  ];

  return (
    <div className="relative flex flex-col flex-1 h-full min-h-0 w-full">
      {/* Background Orbs */}
      <Hero3D />

      <div className="relative z-10 flex flex-col flex-1 h-full min-h-0">
        {/* Header Hero with Ellen Avatar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-3xl bg-white/75 dark:bg-slate-900/75 backdrop-blur-xl border border-white/60 dark:border-slate-800 shadow-sm shrink-0 mb-4">
          <div className="flex items-center gap-4">
            <AvatarWidget
              normalizedMomentum={90}
              stateLabel={isListening ? 'Escuchando voz...' : avatarStatus}
              insightText="Conectada a Recordatorios y Helen"
            />
          </div>

          <div className="grid grid-cols-3 gap-2 w-full sm:w-auto">
            <Link
              href="/tasks"
              className="flex flex-col items-center justify-center p-2.5 rounded-2xl bg-sky-50/80 dark:bg-sky-950/40 border border-sky-100 dark:border-sky-900/40 text-center hover:scale-105 transition"
            >
              <CheckSquare className="w-4 h-4 text-sky-600 dark:text-sky-400 mb-1" />
              <span className="text-[10px] font-bold text-slate-800 dark:text-slate-200">Tareas</span>
              <span className="text-[9px] text-slate-500 dark:text-slate-400">Ver agenda</span>
            </Link>

            <Link
              href="/recipes"
              className="flex flex-col items-center justify-center p-2.5 rounded-2xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900/40 text-center hover:scale-105 transition"
            >
              <Utensils className="w-4 h-4 text-amber-600 dark:text-amber-400 mb-1" />
              <span className="text-[10px] font-bold text-slate-800 dark:text-slate-200">Recetas</span>
              <span className="text-[9px] text-slate-500 dark:text-slate-400">Cocina</span>
            </Link>

            <Link
              href="/prompts"
              className="flex flex-col items-center justify-center p-2.5 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/40 text-center hover:scale-105 transition"
            >
              <Terminal className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mb-1" />
              <span className="text-[10px] font-bold text-slate-800 dark:text-slate-200">Prompts</span>
              <span className="text-[9px] text-slate-500 dark:text-slate-400">105 activos</span>
            </Link>
          </div>
        </div>

        {/* Chat Conversation Scroll Area */}
        <div className="flex-1 flex flex-col min-h-0 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-3xl border border-white/60 dark:border-slate-800 p-4 overflow-hidden shadow-sm">
          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-2.5 text-xs sm:text-sm leading-relaxed shadow-xs ${
                    m.role === 'user'
                      ? 'bg-slate-900 text-white rounded-br-xs'
                      : 'bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-bl-xs'
                  }`}
                >
                  {m.role === 'assistant' && (
                    <span className="block text-[9px] font-bold uppercase tracking-widest text-cyan-600 dark:text-cyan-400 mb-1">
                      Ellen
                    </span>
                  )}
                  <p className="whitespace-pre-wrap">{m.content}</p>
                </div>
                <span className="text-[9px] text-slate-400 mt-0.5 px-1">{m.time}</span>
              </div>
            ))}

            {loading && (
              <div className="flex items-center gap-1.5 p-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 max-w-[120px]">
                <span className="w-2 h-2 rounded-full bg-cyan-500 animate-bounce [animation-delay:-0.3s]" />
                <span className="w-2 h-2 rounded-full bg-cyan-500 animate-bounce [animation-delay:-0.15s]" />
                <span className="w-2 h-2 rounded-full bg-cyan-500 animate-bounce" />
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-2 scrollbar-hide shrink-0">
            {quickChips.map((chip, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSend(chip.query)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-[11px] font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 whitespace-nowrap transition"
              >
                <Sparkles className="w-3 h-3 text-cyan-500" />
                {chip.label}
              </button>
            ))}
          </div>

          {/* Input Bar with Voice & Send */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void handleSend();
            }}
            className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 shrink-0"
          >
            <button
              type="button"
              onClick={toggleListening}
              className={`p-2.5 rounded-xl transition ${
                isListening
                  ? 'bg-rose-500 text-white animate-pulse'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
              title={isListening ? 'Detener dictado' : 'Hablar con Ellen'}
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>

            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={isListening ? 'Escuchando tu voz...' : 'Escribe o habla con Ellen...'}
              className="flex-1 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />

            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="p-2.5 rounded-xl bg-slate-900 dark:bg-cyan-600 text-white hover:bg-slate-800 dark:hover:bg-cyan-500 disabled:opacity-40 transition"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
