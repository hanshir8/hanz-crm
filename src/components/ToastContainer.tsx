import React from 'react';
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import type { ToastMessage } from '../types/crm';

interface ToastContainerProps {
  toasts?: ToastMessage[] | null;
  onDismiss?: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  const safeToasts = Array.isArray(toasts) ? toasts.filter(Boolean) : [];

  if (safeToasts.length === 0) {
    return null;
  }

  return (
    <div
      aria-live="polite"
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-3 sm:px-0"
    >
      {safeToasts.map((toast) => {
        const tone = toast.tone ?? 'info';

        const icon =
          tone === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          ) : tone === 'warning' ? (
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          ) : (
            <Info className="w-4 h-4 text-[#0071E3] shrink-0 mt-0.5" />
          );

        return (
          <div
            key={toast.id}
            role="status"
            className="pointer-events-auto flex items-start justify-between gap-3 rounded-2xl bg-white/95 backdrop-blur-md border border-black/[0.08] shadow-lg px-4 py-3 text-[#1D1D1F]"
          >
            <div className="flex items-start gap-2.5 min-w-0">
              {icon}
              <div className="min-w-0">
                <p className="text-xs font-semibold leading-snug break-words">
                  {toast.title}
                </p>
                {toast.description && (
                  <p className="text-[11px] text-[#6E6E73] leading-snug mt-0.5 break-words">
                    {toast.description}
                  </p>
                )}
              </div>
            </div>

            {onDismiss && (
              <button
                type="button"
                onClick={() => onDismiss(toast.id)}
                aria-label="Dismiss notification"
                className="text-[#6E6E73] hover:text-[#1D1D1F] transition cursor-pointer shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default ToastContainer;
