import React from 'react';
import { CheckCircle2, Link2Off, QrCode, RefreshCw, X } from 'lucide-react';
import type { WhatsAppSessionState } from '../types/crm';

interface QrModalProps {
  isOpen: boolean;
  waSession?: WhatsAppSessionState | null;
  onClose: () => void;
  onAction: (action: 'refresh' | 'pair' | 'disconnect') => Promise<void> | void;
}

export function QrModal({
  isOpen,
  waSession,
  onClose,
  onAction,
}: QrModalProps) {
  if (!isOpen) return null;

  const status = waSession?.status ?? 'qr';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-black/35 backdrop-blur-[2px]"
        onClick={onClose}
      />

      <div className="relative z-10 w-full max-w-md rounded-3xl bg-white border border-black/[0.08] shadow-xl p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-[#1D1D1F] text-white flex items-center justify-center">
              <QrCode className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold tracking-tight text-[#1D1D1F]">
                WhatsApp Session Status
              </h2>
              <p className="text-xs text-[#6E6E73] capitalize">Current status: {status}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 rounded-xl text-[#6E6E73] hover:text-[#1D1D1F] hover:bg-[#F5F5F7] transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="rounded-2xl bg-[#F5F5F7] p-5 flex flex-col items-center text-center space-y-3">
          <div className="w-32 h-32 rounded-2xl bg-white border border-black/10 flex flex-col items-center justify-center gap-2">
            {status === 'connected' ? (
              <CheckCircle2 className="w-10 h-10 text-emerald-600" />
            ) : (
              <QrCode className="w-12 h-12 text-[#1D1D1F]" />
            )}
            <span className="text-[11px] font-medium text-[#6E6E73] uppercase tracking-wider">
              {status}
            </span>
          </div>

          <p className="text-xs text-[#6E6E73] max-w-xs">
            {status === 'connected'
              ? 'WhatsApp Web/Desktop link is marked active. Follow-ups open directly in WhatsApp with pre-filled messages.'
              : 'Mark your WhatsApp session as paired once WhatsApp Web or mobile WhatsApp is ready on this device.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => void onAction('refresh')}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-black/12 text-xs font-medium text-[#1D1D1F] hover:bg-[#F5F5F7] transition cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh QR</span>
          </button>

          {status === 'connected' ? (
            <button
              type="button"
              onClick={() => void onAction('disconnect')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-red-200 text-xs font-medium text-red-600 hover:bg-red-50 transition cursor-pointer"
            >
              <Link2Off className="w-3.5 h-3.5" />
              <span>Disconnect</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void onAction('pair')}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0071E3] text-white text-xs font-medium hover:opacity-90 transition cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Mark Connected</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default QrModal;
