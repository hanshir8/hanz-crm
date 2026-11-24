import React, { useEffect, useState } from 'react';
import { KeyRound, RotateCcw, ShieldOff, X } from 'lucide-react';

interface PasscodeModalProps {
  isOpen: boolean;
  currentPasscode?: string | null;
  onClose: () => void;
  onSavePasscode: (nextPasscode: string | null) => void;
  onResetPasscode: () => void;
}

export function PasscodeModal({
  isOpen,
  currentPasscode,
  onClose,
  onSavePasscode,
  onResetPasscode,
}: PasscodeModalProps) {
  const [passcodeInput, setPasscodeInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setPasscodeInput(currentPasscode ?? '');
    setErrorMsg('');
  }, [isOpen, currentPasscode]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = passcodeInput.trim();
    if (trimmed.length < 4) {
      setErrorMsg('Passcode must be at least 4 characters (or click Disable Lock).');
      return;
    }
    setErrorMsg('');
    onSavePasscode(trimmed);
  };

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
              <KeyRound className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold tracking-tight text-[#1D1D1F]">
                Quick-Lock Passcode
              </h2>
              <p className="text-xs text-[#6E6E73]">
                {currentPasscode ? 'Lock screen is currently active' : 'No passcode set'}
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

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#1D1D1F] mb-1">
              New Passcode
            </label>
            <input
              type="password"
              inputMode="numeric"
              value={passcodeInput}
              onChange={(e) => {
                setPasscodeInput(e.target.value);
                if (errorMsg) setErrorMsg('');
              }}
              placeholder="Enter 4+ digit passcode"
              className="w-full px-3.5 py-2.5 rounded-xl border border-black/15 bg-[#FAFAFC] text-sm focus:outline-none focus:border-[#0071E3]"
            />
            {errorMsg && <p className="text-xs text-red-600 mt-1">{errorMsg}</p>}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  onResetPasscode();
                  setPasscodeInput('1234');
                  setErrorMsg('');
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-black/12 text-xs font-medium text-[#1D1D1F] hover:bg-[#F5F5F7] transition cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset (1234)</span>
              </button>

              {currentPasscode && (
                <button
                  type="button"
                  onClick={() => onSavePasscode(null)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-red-200 text-xs font-medium text-red-600 hover:bg-red-50 transition cursor-pointer"
                >
                  <ShieldOff className="w-3.5 h-3.5" />
                  <span>Disable</span>
                </button>
              )}
            </div>

            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-[#1D1D1F] text-white text-xs sm:text-sm font-medium hover:opacity-90 transition cursor-pointer"
            >
              Save Passcode
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default PasscodeModal;
