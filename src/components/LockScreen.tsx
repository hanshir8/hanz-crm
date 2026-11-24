import React, { useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { Cloud, KeyRound, Lock, LogOut, RotateCcw, ShieldCheck } from 'lucide-react';
import { isCloudSyncConfigured } from '../services/crmService';

type AuthMode = 'signin' | 'signup' | 'forgot';

interface LockScreenProps {
  onUnlock: (entered: string) => boolean;
  onResetPasscode: () => void;
  authSession: Session | null;
  isPasswordRecovery: boolean;
  onClearPasswordRecovery: () => void;
  onSignIn: (email: string, password: string) => Promise<{ ok: boolean; message: string }>;
  onSignUp: (
    email: string,
    password: string
  ) => Promise<{ ok: boolean; message: string; requiresEmailConfirmation: boolean }>;
  onPasswordReset: (email: string) => Promise<{ ok: boolean; message: string }>;
  onUpdatePassword: (newPassword: string) => Promise<{ ok: boolean; message: string }>;
  onSignOut: () => Promise<void>;
}

export function LockScreen({
  onUnlock,
  onResetPasscode,
  authSession,
  isPasswordRecovery,
  onClearPasswordRecovery,
  onSignIn,
  onSignUp,
  onPasswordReset,
  onUpdatePassword,
  onSignOut,
}: LockScreenProps) {
  const [passcodeInput, setPasscodeInput] = useState('');
  const [passcodeError, setPasscodeError] = useState('');

  const [authMode, setAuthMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [authStatus, setAuthStatus] = useState<string>('');
  const [authError, setAuthError] = useState<string>('');
  const [isAuthSubmitting, setIsAuthSubmitting] = useState<boolean>(false);

  const cloudEnabled = isCloudSyncConfigured();

  const handlePasscodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const ok = onUnlock(passcodeInput);
    if (!ok) {
      setPasscodeError('Incorrect passcode. Try again or reset to default.');
    } else {
      setPasscodeError('');
      setPasscodeInput('');
    }
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthStatus('');
    setIsAuthSubmitting(true);

    try {
      if (isPasswordRecovery) {
        if (newPassword.trim().length < 6) {
          setAuthError('Password must be at least 6 characters.');
          return;
        }
        const res = await onUpdatePassword(newPassword);
        if (res.ok) {
          setAuthStatus(res.message || 'Password updated.');
          setNewPassword('');
          onClearPasswordRecovery();
        } else {
          setAuthError(res.message || 'Could not update password.');
        }
        return;
      }

      if (authMode === 'forgot') {
        const res = await onPasswordReset(email);
        if (res.ok) {
          setAuthStatus(res.message || 'Password reset email sent.');
        } else {
          setAuthError(res.message || 'Could not send reset email.');
        }
        return;
      }

      if (authMode === 'signup') {
        const res = await onSignUp(email, password);
        if (res.ok) {
          setAuthStatus(res.message || 'Account created.');
          setPassword('');
        } else {
          setAuthError(res.message || 'Sign up failed.');
        }
        return;
      }

      const res = await onSignIn(email, password);
      if (res.ok) {
        setAuthStatus(res.message || 'Signed in.');
        setPassword('');
      } else {
        setAuthError(res.message || 'Sign in failed.');
      }
    } finally {
      setIsAuthSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F5F7] text-[#1D1D1F] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white border border-black/[0.08] rounded-3xl shadow-sm p-6 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-[#1D1D1F] text-white flex items-center justify-center shrink-0">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-semibold tracking-tight">GOODSHIELD CRM Locked</h1>
            <p className="text-xs text-[#6E6E73]">
              Enter your quick-lock passcode to access leads and follow-ups.
            </p>
          </div>
        </div>

        <form onSubmit={handlePasscodeSubmit} className="space-y-3">
          <label className="block text-xs font-medium text-[#1D1D1F]">
            Quick-Lock Passcode
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <KeyRound className="w-4 h-4 text-[#6E6E73] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                inputMode="numeric"
                value={passcodeInput}
                onChange={(e) => {
                  setPasscodeInput(e.target.value);
                  if (passcodeError) setPasscodeError('');
                }}
                placeholder="Enter passcode"
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-black/15 bg-[#FAFAFC] text-sm focus:outline-none focus:border-[#1D1D1F]"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2.5 rounded-xl bg-[#1D1D1F] text-white text-sm font-medium hover:opacity-90 transition cursor-pointer shrink-0"
            >
              Unlock
            </button>
          </div>

          {passcodeError && (
            <p className="text-xs text-red-600">{passcodeError}</p>
          )}

          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] text-[#6E6E73]">
              Forgot code? Default resets to 1234.
            </span>
            <button
              type="button"
              onClick={() => {
                onResetPasscode();
                setPasscodeError('');
                setAuthStatus('Passcode reset to default.');
              }}
              className="inline-flex items-center gap-1 text-xs font-medium text-[#1D1D1F] hover:underline cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Passcode
            </button>
          </div>
        </form>

        {cloudEnabled && (
          <div className="border-t border-black/[0.07] pt-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-medium text-[#1D1D1F]">
                <Cloud className="w-4 h-4 text-[#0071E3]" />
                <span>Cloud Account Sync</span>
              </div>

              {authSession?.user?.email ? (
                <button
                  type="button"
                  onClick={() => void onSignOut()}
                  className="inline-flex items-center gap-1 text-xs text-[#6E6E73] hover:text-[#1D1D1F] cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Sign out
                </button>
              ) : (
                <div className="flex items-center gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('signin');
                      setAuthError('');
                      setAuthStatus('');
                    }}
                    className={
                      authMode === 'signin'
                        ? 'font-semibold text-[#1D1D1F]'
                        : 'text-[#6E6E73] hover:text-[#1D1D1F] cursor-pointer'
                    }
                  >
                    Sign In
                  </button>
                  <span className="text-black/20">/</span>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('signup');
                      setAuthError('');
                      setAuthStatus('');
                    }}
                    className={
                      authMode === 'signup'
                        ? 'font-semibold text-[#1D1D1F]'
                        : 'text-[#6E6E73] hover:text-[#1D1D1F] cursor-pointer'
                    }
                  >
                    Sign Up
                  </button>
                </div>
              )}
            </div>

            {authSession?.user?.email ? (
              <div className="flex items-center gap-2 rounded-xl bg-[#F5F5F7] px-3.5 py-2.5 text-xs text-[#1D1D1F]">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="truncate">Signed in as {authSession.user.email}</span>
              </div>
            ) : (
              <form onSubmit={handleAuthSubmit} className="space-y-2.5">
                {isPasswordRecovery ? (
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password (min 6 chars)"
                    className="w-full px-3.5 py-2 rounded-xl border border-black/15 bg-[#FAFAFC] text-sm focus:outline-none focus:border-[#1D1D1F]"
                  />
                ) : (
                  <>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Email address"
                      className="w-full px-3.5 py-2 rounded-xl border border-black/15 bg-[#FAFAFC] text-sm focus:outline-none focus:border-[#1D1D1F]"
                    />
                    {authMode !== 'forgot' && (
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Password"
                        className="w-full px-3.5 py-2 rounded-xl border border-black/15 bg-[#FAFAFC] text-sm focus:outline-none focus:border-[#1D1D1F]"
                      />
                    )}
                  </>
                )}

                <div className="flex items-center justify-between gap-2 pt-1">
                  {!isPasswordRecovery && (
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode(authMode === 'forgot' ? 'signin' : 'forgot');
                        setAuthError('');
                        setAuthStatus('');
                      }}
                      className="text-[11px] text-[#6E6E73] hover:text-[#1D1D1F] cursor-pointer"
                    >
                      {authMode === 'forgot' ? 'Back to sign in' : 'Forgot password?'}
                    </button>
                  )}

                  <button
                    type="submit"
                    disabled={isAuthSubmitting}
                    className="ml-auto px-4 py-2 rounded-xl bg-[#0071E3] text-white text-xs font-medium hover:opacity-90 disabled:opacity-50 transition cursor-pointer"
                  >
                    {isAuthSubmitting
                      ? 'Working...'
                      : isPasswordRecovery
                        ? 'Update Password'
                        : authMode === 'forgot'
                          ? 'Send Reset Link'
                          : authMode === 'signup'
                            ? 'Create Account'
                            : 'Sign In'}
                  </button>
                </div>
              </form>
            )}

            {authError && <p className="text-xs text-red-600">{authError}</p>}
            {authStatus && <p className="text-xs text-emerald-700">{authStatus}</p>}
          </div>
        )}
      </div>
    </div>
  );
}

export default LockScreen;
