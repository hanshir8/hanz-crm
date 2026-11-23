import React, { useEffect, useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  KeyRound,
  Lock,
  Mail,
  RotateCcw,
  ShieldCheck,
} from 'lucide-react';
import {
  isCloudSyncConfigured,
  resetStoredPasscodeToDefault,
  sendSupabasePasswordReset,
  setStoredPasscode,
  signInWithSupabase,
  signUpWithSupabase,
  updateSupabasePassword,
} from '../services/crmService';

interface LockScreenProps {
  expectedPasscode: string;
  onUnlock: () => void;
  onPasscodeUpdated: (newCode: string) => void;
}

type AuthMode = 'passcode' | 'signin' | 'signup' | 'forgot' | 'recovery';

export function LockScreen({
  expectedPasscode,
  onUnlock,
  onPasscodeUpdated,
}: LockScreenProps) {
  const cloudEnabled = isCloudSyncConfigured();

  const [mode, setMode] = useState<AuthMode>('passcode');
  const [pin, setPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [recoveryToken, setRecoveryToken] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const hash = window.location.hash || '';
    if (!hash.includes('access_token=')) return;

    const params = new URLSearchParams(hash.replace(/^#/, ''));
    const token = params.get('access_token');
    const type = params.get('type');
    if (token && (type === 'recovery' || hash.includes('recovery'))) {
      setRecoveryToken(token);
      setMode('recovery');
    }
  }, []);

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setStatusMsg(null);

    const cleaned = pin.trim();
    if (cleaned === expectedPasscode) {
      setPin('');
      onUnlock();
      return;
    }

    setErrorMsg('Incorrect passcode. Default passcode is 2468.');
  };

  const handleSetNewPasscode = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setStatusMsg(null);

    const cleaned = newPin.trim();
    if (!/^\d{4}$/.test(cleaned)) {
      setErrorMsg('Please enter exactly 4 digits (0–9).');
      return;
    }

    if (setStoredPasscode(cleaned)) {
      onPasscodeUpdated(cleaned);
      setNewPin('');
      setPin('');
      setMode('passcode');
      setStatusMsg(`Passcode updated to ${cleaned}. Enter it to unlock.`);
    } else {
      setErrorMsg('Could not save passcode in browser storage.');
    }
  };

  const handleResetDefaultPasscode = () => {
    const def = resetStoredPasscodeToDefault();
    onPasscodeUpdated(def);
    setPin('');
    setNewPin('');
    setErrorMsg(null);
    setStatusMsg(`Passcode reset to default (${def}).`);
  };

  const handleEmailAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setStatusMsg(null);
    setIsSubmitting(true);

    try {
      if (mode === 'signin') {
        const res = await signInWithSupabase(email, password);
        if (res.ok) {
          onUnlock();
        } else {
          setErrorMsg(res.message || 'Sign in failed.');
        }
      } else if (mode === 'signup') {
        const res = await signUpWithSupabase(email, password);
        if (res.ok && !res.requiresEmailConfirmation) {
          onUnlock();
        } else if (res.ok) {
          setStatusMsg(res.message || 'Check your inbox to confirm your email.');
        } else {
          setErrorMsg(res.message || 'Sign up failed.');
        }
      } else if (mode === 'forgot') {
        const res = await sendSupabasePasswordReset(email);
        if (res.ok) {
          setStatusMsg(res.message || 'Password reset email sent.');
        } else {
          setErrorMsg(res.message || 'Could not send reset email.');
        }
      } else if (mode === 'recovery' && recoveryToken) {
        const res = await updateSupabasePassword(recoveryToken, password);
        if (res.ok) {
          setPassword('');
          setRecoveryToken(null);
          setMode('signin');
          setStatusMsg(res.message || 'Password updated.');
        } else {
          setErrorMsg(res.message || 'Could not update password.');
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F5F7] text-[#1D1D1F] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-3xl border border-black/10 shadow-[0_12px_40px_rgba(0,0,0,0.06)] p-6 sm:p-7 space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-[#007AFF]/10 text-[#007AFF] flex items-center justify-center mx-auto">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-semibold tracking-tight">
              GOODSHIELD CRM
            </h1>
            <p className="text-xs text-[#6E6E73]">
              created by hanz • Privacy Workspace Lock
            </p>
          </div>
        </div>

        {statusMsg && (
          <div className="rounded-xl bg-[#34C759]/10 border border-[#34C759]/25 px-3.5 py-2.5 text-xs text-[#1E7E34] flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-[#34C759]" />
            <span>{statusMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="rounded-xl bg-[#FF3B30]/10 border border-[#FF3B30]/25 px-3.5 py-2.5 text-xs text-[#C62828]">
            {errorMsg}
          </div>
        )}

        {mode === 'passcode' && (
          <form onSubmit={handlePinSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label
                htmlFor="crm-passcode"
                className="block text-xs font-medium text-[#6E6E73]"
              >
                4-Digit Workspace Passcode
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#8E8E93] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="crm-passcode"
                  type="password"
                  inputMode="numeric"
                  maxLength={8}
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="Enter passcode (default 2468)"
                  autoFocus
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#F5F5F7] border border-black/10 text-sm font-mono tracking-widest focus:outline-none focus:bg-white focus:border-[#007AFF] transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 px-4 rounded-xl bg-[#007AFF] hover:bg-[#0066D6] text-white text-sm font-medium inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              Unlock Workspace
              <ArrowRight className="w-4 h-4" />
            </button>

            <div className="pt-2 border-t border-black/5 flex items-center justify-between text-xs text-[#6E6E73]">
              <button
                type="button"
                onClick={() => {
                  setErrorMsg(null);
                  setStatusMsg(null);
                  setMode('forgot');
                }}
                className="inline-flex items-center gap-1 hover:text-[#1D1D1F] transition-colors cursor-pointer"
              >
                <KeyRound className="w-3.5 h-3.5" />
                Change / Reset PIN
              </button>

              {cloudEnabled && (
                <button
                  type="button"
                  onClick={() => {
                    setErrorMsg(null);
                    setStatusMsg(null);
                    setMode('signin');
                  }}
                  className="inline-flex items-center gap-1 text-[#007AFF] hover:underline cursor-pointer"
                >
                  <Mail className="w-3.5 h-3.5" />
                  Cloud Sign In
                </button>
              )}
            </div>
          </form>
        )}

        {mode === 'forgot' && (
          <div className="space-y-4">
            <form onSubmit={handleSetNewPasscode} className="space-y-3">
              <div className="space-y-1.5">
                <label
                  htmlFor="new-crm-passcode"
                  className="block text-xs font-medium text-[#6E6E73]"
                >
                  Set New 4-Digit Passcode
                </label>
                <input
                  id="new-crm-passcode"
                  type="text"
                  inputMode="numeric"
                  maxLength={4}
                  value={newPin}
                  onChange={(e) =>
                    setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))
                  }
                  placeholder="4 digits e.g. 1234"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#F5F5F7] border border-black/10 text-sm font-mono tracking-widest focus:outline-none focus:bg-white focus:border-[#007AFF]"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 rounded-xl bg-[#007AFF] hover:bg-[#0066D6] text-white text-sm font-medium transition-colors cursor-pointer"
              >
                Save New Passcode
              </button>
            </form>

            <button
              type="button"
              onClick={handleResetDefaultPasscode}
              className="w-full py-2 px-3 rounded-xl bg-[#F5F5F7] hover:bg-black/5 text-[#1D1D1F] text-xs font-medium inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Passcode to Default (2468)
            </button>

            {cloudEnabled && (
              <form
                onSubmit={handleEmailAuthSubmit}
                className="pt-3 border-t border-black/5 space-y-2.5"
              >
                <p className="text-[11px] text-[#6E6E73]">
                  Or send a cloud account password reset link:
                </p>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full px-3.5 py-2 rounded-xl bg-[#F5F5F7] border border-black/10 text-xs focus:outline-none focus:bg-white focus:border-[#007AFF]"
                />
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2 px-3 rounded-xl border border-black/10 text-xs font-medium hover:bg-[#F5F5F7] transition-colors cursor-pointer"
                >
                  {isSubmitting ? 'Sending...' : 'Send Reset Email'}
                </button>
              </form>
            )}

            <button
              type="button"
              onClick={() => {
                setErrorMsg(null);
                setMode('passcode');
              }}
              className="w-full text-center text-xs text-[#6E6E73] hover:text-[#1D1D1F] cursor-pointer"
            >
              Back to Passcode Unlock
            </button>
          </div>
        )}

        {(mode === 'signin' || mode === 'signup' || mode === 'recovery') && (
          <form onSubmit={handleEmailAuthSubmit} className="space-y-3.5">
            {mode !== 'recovery' && (
              <div className="space-y-1">
                <label className="block text-xs font-medium text-[#6E6E73]">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#F5F5F7] border border-black/10 text-sm focus:outline-none focus:bg-white focus:border-[#007AFF]"
                />
              </div>
            )}

            <div className="space-y-1">
              <label className="block text-xs font-medium text-[#6E6E73]">
                {mode === 'recovery' ? 'New Password' : 'Password'}
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#F5F5F7] border border-black/10 text-sm focus:outline-none focus:bg-white focus:border-[#007AFF]"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 px-4 rounded-xl bg-[#007AFF] hover:bg-[#0066D6] text-white text-sm font-medium transition-colors cursor-pointer"
            >
              {isSubmitting
                ? 'Please wait...'
                : mode === 'signin'
                  ? 'Sign In'
                  : mode === 'signup'
                    ? 'Create Account'
                    : 'Update Password'}
            </button>

            <div className="flex items-center justify-between text-xs text-[#6E6E73] pt-1">
              {mode === 'signin' ? (
                <button
                  type="button"
                  onClick={() => setMode('signup')}
                  className="text-[#007AFF] hover:underline cursor-pointer"
                >
                  Need an account? Sign up
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setMode('signin')}
                  className="text-[#007AFF] hover:underline cursor-pointer"
                >
                  Back to Sign In
                </button>
              )}

              <button
                type="button"
                onClick={() => setMode('passcode')}
                className="hover:text-[#1D1D1F] cursor-pointer"
              >
                Use PIN instead
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
