import React from 'react';
import {
  BellRing,
  CalendarCheck2,
  Database,
  ShieldAlert,
  X,
} from 'lucide-react';

interface HowToUseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRestoreSamples: () => void;
}

export function HowToUseModal({
  isOpen,
  onClose,
  onRestoreSamples,
}: HowToUseModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-black/30 backdrop-blur-[1px]"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-md bg-white rounded-3xl border border-black/10 shadow-xl p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-[#1D1D1F]">
              GOODSHIELD CRM Guide
            </h2>
            <p className="text-xs text-[#6E6E73]">
              created by hanz • Fast daily follow-up workflow
            </p>
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

        <div className="space-y-3 text-xs text-[#1D1D1F]">
          <div className="p-3 rounded-2xl bg-[#F5F5F7] flex items-start gap-3">
            <CalendarCheck2 className="w-4 h-4 text-[#007AFF] shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">1. Automatic 3–4 Day Reminders</p>
              <p className="text-[#6E6E73] mt-0.5 leading-relaxed">
                Every lead gets a 3-day or 4-day follow-up timer. Leads due
                today or overdue appear automatically at the top of your queue.
              </p>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-[#F5F5F7] flex items-start gap-3">
            <ShieldAlert className="w-4 h-4 text-[#FF9F0A] shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">2. 30 Messages / 24h Safety Cap</p>
              <p className="text-[#6E6E73] mt-0.5 leading-relaxed">
                GOODSHIELD tracks your rolling 24-hour outreach count and pauses
                sending at 30/30 to protect your WhatsApp account from spam
                flags.
              </p>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-[#F5F5F7] flex items-start gap-3">
            <BellRing className="w-4 h-4 text-[#34C759] shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">3. Local Storage & PIN Privacy</p>
              <p className="text-[#6E6E73] mt-0.5 leading-relaxed">
                Your leads stay saved in this browser and can be locked anytime
                with your 4-digit passcode (default <code className="font-mono">2468</code>).
              </p>
            </div>
          </div>
        </div>

        <div className="pt-2 border-t border-black/10 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => {
              onRestoreSamples();
              onClose();
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#F5F5F7] hover:bg-black/5 text-xs font-medium text-[#1D1D1F] cursor-pointer"
          >
            <Database className="w-3.5 h-3.5" />
            Restore Sample Leads
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[#007AFF] hover:bg-[#0066D6] text-white text-xs font-semibold cursor-pointer"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
}
