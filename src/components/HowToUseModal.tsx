import React from 'react';
import { CheckCircle2, Cloud, HelpCircle, MessageCircle, ShieldCheck, X } from 'lucide-react';

interface HowToUseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function HowToUseModal({ isOpen, onClose }: HowToUseModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-black/35 backdrop-blur-[2px]"
        onClick={onClose}
      />

      <div className="relative z-10 w-full max-w-lg rounded-3xl bg-white border border-black/[0.08] shadow-xl p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-[#1D1D1F] text-white flex items-center justify-center">
              <HelpCircle className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold tracking-tight text-[#1D1D1F]">
                How to Use GOODSHIELD CRM
              </h2>
              <p className="text-xs text-[#6E6E73]">
                Fast daily workflow for tracking and following up with leads
              </p>
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

        <div className="space-y-3 text-xs text-[#1D1D1F]">
          <div className="flex items-start gap-3 rounded-2xl bg-[#F5F5F7] p-3.5">
            <CheckCircle2 className="w-4 h-4 text-[#0071E3] shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">1. Add Leads & Set Follow-Up Cadence</p>
              <p className="text-[#6E6E73] mt-0.5">
                Click New Lead to record a prospect&apos;s name, WhatsApp number, vehicle/package interest, and reminder cadence (every 2, 3, 4, or 7 days).
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-2xl bg-[#F5F5F7] p-3.5">
            <MessageCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">2. Send One-Click WhatsApp Follow-Ups</p>
              <p className="text-[#6E6E73] mt-0.5">
                Pick a smart template in the inspector, tweak the message, and click Send &amp; Log Follow-Up. Status automatically updates to Contacted and schedules the next reminder.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-2xl bg-[#F5F5F7] p-3.5">
            <Cloud className="w-4 h-4 text-[#0071E3] shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">3. Sync Across Devices with Supabase</p>
              <p className="text-[#6E6E73] mt-0.5">
                Sign in with your Supabase account in the top header to back up leads to the cloud and sync across desktop and mobile.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-2xl bg-[#F5F5F7] p-3.5">
            <ShieldCheck className="w-4 h-4 text-[#1D1D1F] shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">4. Quick-Lock Passcode</p>
              <p className="text-[#6E6E73] mt-0.5">
                Set a passcode via the key icon in the header to lock the screen whenever stepping away from your desk.
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[#1D1D1F] text-white text-xs sm:text-sm font-medium hover:opacity-90 transition cursor-pointer"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
}

export default HowToUseModal;
