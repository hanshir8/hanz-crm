import React from 'react';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Info,
  X,
} from 'lucide-react';
import type { ToastItem, ToastType } from '../types/crm';

interface ToastContainerProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}

function renderIcon(type: ToastType) {
  switch (type) {
    case 'success':
      return <CheckCircle2 className="w-4 h-4 text-[#34C759] shrink-0 mt-0.5" />;
    case 'warning':
      return <AlertTriangle className="w-4 h-4 text-[#FF9F0A] shrink-0 mt-0.5" />;
    case 'error':
      return <AlertCircle className="w-4 h-4 text-[#FF3B30] shrink-0 mt-0.5" />;
    case 'info':
    default:
      return <Info className="w-4 h-4 text-[#007AFF] shrink-0 mt-0.5" />;
  }
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-3 sm:px-0"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto bg-white/95 backdrop-blur-md border border-black/10 shadow-lg rounded-2xl p-3.5 flex items-start gap-3 text-[#1D1D1F]"
        >
          {renderIcon(toast.type)}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium leading-snug">{toast.title}</p>
            {toast.description && (
              <p className="text-xs text-[#6E6E73] mt-0.5 leading-relaxed">
                {toast.description}
              </p>
            )}
            {toast.actionLabel && toast.actionUrl && (
              <a
                href={toast.actionUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 mt-2 text-xs font-medium text-[#007AFF] hover:underline"
              >
                {toast.actionLabel}
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
          <button
            type="button"
            onClick={() => onDismiss(toast.id)}
            aria-label="Dismiss notification"
            className="text-[#8E8E93] hover:text-[#1D1D1F] p-0.5 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
