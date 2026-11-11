'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Check, AlertCircle, Info, AlertTriangle, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

export type ToastType = 'success' | 'error' | 'info' | 'warning' | 'ai';

interface DynamicToastProps {
  message: string;
  type?: ToastType;
  title?: string;
  visible: boolean;
  id: string | number;
}

interface ToastConfig {
  icon: React.ComponentType<any>;
  iconColor: string;
  borderColor: string;
  pulse?: boolean;
}

const TYPE_CONFIG: Record<ToastType, ToastConfig> = {
  success: {
    icon: Check,
    iconColor: 'text-emerald-500 bg-emerald-500/10',
    borderColor: 'border-emerald-500/10',
  },
  error: {
    icon: AlertCircle,
    iconColor: 'text-rose-500 bg-rose-500/10',
    borderColor: 'border-rose-500/10',
  },
  info: {
    icon: Info,
    iconColor: 'text-sky-500 bg-sky-500/10',
    borderColor: 'border-sky-500/10',
  },
  warning: {
    icon: AlertTriangle,
    iconColor: 'text-amber-500 bg-amber-500/10',
    borderColor: 'border-amber-500/10',
  },
  ai: {
    icon: Sparkles,
    iconColor: 'text-indigo-500 bg-indigo-500/10',
    borderColor: 'border-indigo-500/10',
    pulse: true,
  },
};

export default function DynamicToast({
  message,
  type = 'info',
  title,
  visible,
  id,
}: DynamicToastProps) {
  const config = TYPE_CONFIG[type];
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ scale: 0.85, y: -24, opacity: 0 }}
      animate={visible ? { scale: 1, y: 0, opacity: 1 } : { scale: 0.85, y: -24, opacity: 0 }}
      exit={{ scale: 0.85, y: -24, opacity: 0 }}
      transition={{ type: 'spring', damping: 20, stiffness: 300 }}
      className={`flex items-center gap-3.5 px-6 py-3.5 rounded-[32px] bg-white/95 backdrop-blur-2xl border ${config.borderColor} shadow-[0_20px_50px_rgba(0,0,0,0.06)] max-w-sm w-auto select-none pointer-events-auto`}
    >
      <div className={`flex items-center justify-center w-8 h-8 rounded-full ${config.iconColor}`}>
        <Icon className={`w-4 h-4 ${config.pulse ? 'animate-pulse' : ''}`} />
      </div>
      <div className="flex flex-col text-left pr-2">
        {title && (
          <span className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400 leading-none mb-0.5">
            {title}
          </span>
        )}
        <span className="text-sm font-black tracking-tight text-slate-800 leading-tight">
          {message}
        </span>
      </div>
    </motion.div>
  );
}

/**
 * Helper utility to trigger custom Apple HIG Dynamic Island toasts
 */
export const showDynamicToast = (
  message: string,
  type: ToastType = 'info',
  title?: string
) => {
  toast.custom((id) => (
    <DynamicToast
      id={id}
      visible={true}
      message={message}
      type={type}
      title={title || (type === 'ai' ? 'Coach IA' : undefined)}
    />
  ), {
    duration: 3500,
  });
};
