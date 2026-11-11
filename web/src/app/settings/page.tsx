'use client';

import React, { useState, useEffect } from 'react';
import { Settings, Key, Link as LinkIcon, Save, CheckCircle2, Shield, Trash2 } from 'lucide-react';
import toast from '@/lib/toast';

export default function SettingsPage() {
  const [geminiKey, setGeminiKey] = useState('');
  const [recordatoriosToken, setRecordatoriosToken] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setGeminiKey(localStorage.getItem('ellen_gemini_key') || '');
      setRecordatoriosToken(localStorage.getItem('ellen_recordatorios_token') || '');
    }
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (typeof window !== 'undefined') {
      localStorage.setItem('ellen_gemini_key', geminiKey.trim());
      localStorage.setItem('ellen_recordatorios_token', recordatoriosToken.trim());
    }
    setSaved(true);
    toast.success('Ajustes guardados correctamente en este dispositivo.');
    setTimeout(() => setSaved(false), 2500);
  };

  const handleClear = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('ellen_gemini_key');
      localStorage.removeItem('ellen_recordatorios_token');
      setGeminiKey('');
      setRecordatoriosToken('');
    }
    toast.info('Claves borradas de este dispositivo.');
  };

  return (
    <div className="flex flex-col flex-1 h-full min-h-0 space-y-4">
      {/* Header */}
      <div className="p-4 rounded-3xl bg-white/75 dark:bg-slate-900/75 backdrop-blur-xl border border-white/60 dark:border-slate-800 shadow-sm shrink-0">
        <div className="flex items-center gap-2 mb-1">
          <Settings className="w-5 h-5 text-slate-700 dark:text-slate-300" />
          <h1 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
            Ajustes & Conexiones
          </h1>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Configura tus credenciales locales para usar Ellen y sincronizar con Recordatorios de forma independiente.
        </p>
      </div>

      {/* Settings Form */}
      <form onSubmit={handleSave} className="space-y-4">
        {/* Gemini API Key */}
        <div className="p-4 rounded-3xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/70 dark:border-slate-800 shadow-xs space-y-2">
          <div className="flex items-center gap-2">
            <Key className="w-4 h-4 text-cyan-500" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Clave de API de Gemini (Opcional)
            </h2>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
            Si no está configurada en las variables de entorno de Vercel, puedes pegarla aquí para que funcione en este navegador o móvil. Se guarda únicamente en tu dispositivo.
          </p>
          <input
            type="password"
            value={geminiKey}
            onChange={(e) => setGeminiKey(e.target.value)}
            placeholder="AIzaSy..."
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:ring-2 focus:ring-cyan-500"
          />
        </div>

        {/* Recordatorios Sync Token */}
        <div className="p-4 rounded-3xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/70 dark:border-slate-800 shadow-xs space-y-2">
          <div className="flex items-center gap-2">
            <LinkIcon className="w-4 h-4 text-emerald-500" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Token de Recordatorios
            </h2>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
            Tu token de sesión para conectar directamente con tu cuenta de Recordatorios Élite (disponible en tu perfil de Recordatorios).
          </p>
          <input
            type="password"
            value={recordatoriosToken}
            onChange={(e) => setRecordatoriosToken(e.target.value)}
            placeholder="eyJhbGciOiJIUzI1NiIsIn..."
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {/* Privacy Note */}
        <div className="p-4 rounded-3xl bg-cyan-50/50 dark:bg-cyan-950/20 border border-cyan-100 dark:border-cyan-900/40 text-[11px] text-cyan-800 dark:text-cyan-300 space-y-1">
          <div className="flex items-center gap-1.5 font-bold">
            <Shield className="w-3.5 h-3.5" />
            Privacidad Local de Helen
          </div>
          <p className="text-[10px] leading-relaxed">
            Ninguna clave se envía a servidores de analítica ni terceros. Las llamadas van directamente a Google AI y a tu servidor de Recordatorios.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-2">
          <button
            type="submit"
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-900 dark:bg-cyan-600 hover:bg-slate-800 dark:hover:bg-cyan-500 text-white text-xs font-bold transition shadow-xs"
          >
            {saved ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Save className="w-4 h-4" />}
            {saved ? 'Guardado' : 'Guardar Ajustes'}
          </button>

          <button
            type="button"
            onClick={handleClear}
            className="p-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-600 text-slate-500 transition"
            title="Borrar claves locales"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
}
