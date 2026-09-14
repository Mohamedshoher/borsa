'use client';

import React from 'react';
import { useApp } from '@/context/AppContext';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

export default function ToastContainer() {
  const { toasts, removeToast } = useApp();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 left-5 z-50 flex flex-col gap-2 max-w-md w-full pointer-events-none">
      {toasts.map((toast) => {
        let bg = 'bg-slate-900 text-white border-slate-700';
        let Icon = Info;
        let iconColor = 'text-blue-400';

        if (toast.type === 'success') {
          bg = 'bg-emerald-900/95 text-emerald-50 border-emerald-700 shadow-emerald-950/20';
          Icon = CheckCircle2;
          iconColor = 'text-emerald-400';
        } else if (toast.type === 'error') {
          bg = 'bg-rose-950/95 text-rose-50 border-rose-800 shadow-rose-950/20';
          Icon = AlertCircle;
          iconColor = 'text-rose-400';
        } else if (toast.type === 'warning') {
          bg = 'bg-amber-950/95 text-amber-50 border-amber-700 shadow-amber-950/20';
          Icon = AlertTriangle;
          iconColor = 'text-amber-400';
        }

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-xl backdrop-blur-md transition-all duration-300 animate-in fade-in slide-in-from-bottom-3 ${bg}`}
          >
            <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${iconColor}`} />
            <div className="flex-1 text-sm font-medium leading-relaxed">{toast.message}</div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-white/60 hover:text-white p-1 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
