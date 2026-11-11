'use client';

import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertCircle, RotateCw } from 'lucide-react';
import { hapticLight } from '@/utils/haptics';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class GlobalErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error inside GlobalErrorBoundary:', error, errorInfo);
  }

  private handleRetry = () => {
    hapticLight();
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-[2rem] border border-red-200 bg-red-50/30 p-6 shadow-sm max-w-lg mx-auto my-6 text-center space-y-4 select-none animate-fade-in">
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto text-red-650">
            <AlertCircle className="w-6 h-6 animate-pulse" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Ups, algo ha fallado aquí</h3>
            <p className="text-xs text-slate-500 font-semibold leading-relaxed">
              Ocurrió un error inesperado al renderizar esta sección. El resto de la aplicación sigue activa y a salvo.
            </p>
          </div>
          <button
            onClick={this.handleRetry}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-full text-xs font-bold transition shadow-md active:scale-95 mx-auto"
          >
            <RotateCw className="w-3.5 h-3.5" /> Reintentar
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
