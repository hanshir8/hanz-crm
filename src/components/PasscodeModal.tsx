import React, { useState } from 'react';
import { KeyRound, RotateCcw, X } from 'lucide-react';
import {
  resetStoredPasscodeToDefault,
  setStoredPasscode,
} from '../services/crmService';

interface PasscodeModalProps {
  isOpen: boolean;
  currentPasscode: string;
  onClose: () => void;
  onPasscodeUpdated: (newCode: string) => void;
}

export function PasscodeModal({
  isOpen,
  currentPasscode,
  onClose,
  onPasscodeUpdated,
}: PasscodeModalProps) {
  const [newCode, setNewCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const cleaned = newCode.trim();
    if (!/^\d{4}$/.test(cleaned)) {
      setError('Passcode must be exactly 4 digits.');
      return;
    }
    if (setStoredPasscode(cleaned)) {
      onPasscodeUpdated(cleaned);
      setNewCode('');
      onClose();
    } else {
      setError('Unable to save passcode in browser storage.');
    }
  };

  const handleReset = () => {
    const def = resetStoredPasscodeToDefault();
    onPasscodeUpdated(def);
    setNewCode('');
    setError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-black/30 backdrop-blur-[1px]"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-sm bg-white rounded-3xl border border-black/10 shadow-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#007AFF]/10 text-[#007AFF] flex items-center justify-center">
              <KeyRound className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-[#1D1D1F]">
                Workspace Passcode
              </h2>
              <p className="text-[11px] text-[#6E6E73] font-mono">
                Current PIN: {currentPasscode}
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

        {error && (
          <p className="text-xs text-[#C62828] bg-[#FF3B30]/10 rounded-xl px-3 py-2">
            {error}
          </p>
        )}

        <form onSubmit={handleSave} className="space-y-3">
          <div className="space-y-1">
            <label className="block text-xs font-medium text-[#6E6E73]">
              New 4-Digit PIN
            </label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={4}
              autoFocus
              value={newCode}
              onChange={(e) =>
                setNewCode(e.target.value.replace(/\D/g, '').slice(0, 4))
              }
              placeholder="e.g. 2468"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#F5F5F7] border border-black/10 text-sm font-mono tracking-widest focus:outline-none focus:bg-white focus:border-[#007AFF]"
            />
          </div>

          <button
            type="submit"
            className="w-full py-2.5 rounded-xl bg-[#007AFF] hover:bg-[#0066D6] text-white text-xs font-semibold cursor-pointer"
          >
            Update Passcode
          </button>
        </form>

        <button
          type="button"
          onClick={handleReset}
          className="w-full py-2 rounded-xl bg-[#F5F5F7] hover:bg-black/5 text-xs font-medium text-[#1D1D1F] inline-flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reset to Default (2468)
        </button>
      </div>
    </div>
  );
}
