import React from 'react';
import {
  CheckCircle2,
  Link2Off,
  QrCode,
  RefreshCw,
  Smartphone,
  X,
} from 'lucide-react';
import type { WhatsAppSessionState } from '../types/crm';

interface QrModalProps {
  isOpen: boolean;
  session: WhatsAppSessionState;
  isUpdating: boolean;
  onClose: () => void;
  onRefreshQr: () => void;
  onMarkPaired: () => void;
  onDisconnect: () => void;
}

export function QrModal({
  isOpen,
  session,
  isUpdating,
  onClose,
  onRefreshQr,
  onMarkPaired,
  onDisconnect,
}: QrModalProps) {
  if (!isOpen) return null;

  const isConnected = session.status === 'connected';
  const qrData = encodeURIComponent(
    session.qrValue || 'goodshield-crm-whatsapp-session'
  );
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${qrData}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-black/30 backdrop-blur-[1px]"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-sm max-h-[90vh] overflow-y-auto bg-white rounded-3xl border border-black/10 shadow-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#34C759]/10 text-[#1E7E34] flex items-center justify-center">
              <QrCode className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-[#1D1D1F]">
                WhatsApp Link Status
              </h2>
              <p className="text-[11px] text-[#6E6E73]">
                {isConnected
                  ? 'Session paired on this device'
                  : 'Use wa.me deep links or pair session'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 rounded-xl text-[#8E8E93] hover:text-[#1D1D1F] hover:bg-[#F5F5F7] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {isConnected ? (
          <div className="p-4 rounded-2xl bg-[#34C759]/10 border border-[#34C759]/25 text-center space-y-2">
            <CheckCircle2 className="w-8 h-8 text-[#34C759] mx-auto" />
            <p className="text-xs font-semibold text-[#1E7E34]">
              WhatsApp Session Active
            </p>
            {session.pairedAt && (
              <p className="text-[11px] text-[#6E6E73]">
                Paired: {new Date(session.pairedAt).toLocaleString()}
              </p>
            )}
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-[#F5F5F7] flex flex-col items-center space-y-2.5">
            <div className="p-2.5 bg-white rounded-2xl border border-black/10">
              <img
                src={qrImageUrl}
                alt="WhatsApp Session QR Code"
                className="w-40 h-40 object-contain"
              />
            </div>
            <p className="text-[11px] text-[#6E6E73] text-center leading-relaxed">
              Even without QR pairing, clicking <strong>Follow Up</strong>{' '}
              opens <code className="font-mono">wa.me</code> directly with your
              pre-filled message.
            </p>
          </div>
        )}

        <div className="flex flex-col gap-2">
          {!isConnected ? (
            <>
              <button
                type="button"
                disabled={isUpdating}
                onClick={onMarkPaired}
                className="w-full py-2.5 rounded-xl bg-[#34C759] hover:bg-[#2DB84F] text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Smartphone className="w-3.5 h-3.5" />
                Mark WhatsApp Session Paired
              </button>
              <button
                type="button"
                disabled={isUpdating}
                onClick={onRefreshQr}
                className="w-full py-2 rounded-xl bg-[#F5F5F7] hover:bg-black/5 text-xs font-medium text-[#1D1D1F] inline-flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Refresh Session Code
              </button>
            </>
          ) : (
            <button
              type="button"
              disabled={isUpdating}
              onClick={onDisconnect}
              className="w-full py-2.5 rounded-xl bg-[#FF3B30]/10 hover:bg-[#FF3B30]/15 text-[#C62828] text-xs font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Link2Off className="w-3.5 h-3.5" />
              Disconnect Session
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
