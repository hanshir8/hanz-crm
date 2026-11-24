import React, { useEffect, useState } from 'react';
import { ArrowRight, CheckCircle2, Mail, ShieldCheck } from 'lucide-react';
import {
  isCloudSyncConfigured,
  onSupabasePasswordRecovery,
  sendSupabasePasswordReset,
  signInWithSupabase,
  signUpWithSupabase,
  updateSupabasePassword,
} from '../services/crmService';

interface LockScreenProps {
  onUnlock: () => void;
}

type AuthMode = 'signin' | 'signup' | 'forgot' | 'recovery';

const inputClass =
  'w-full px-3.5 py-2.5 rounded-xl bg-[#F5F5F7] border border-black/10 text-sm focus:outline-none focus:bg-white focus:border-[#007AFF]';

export function LockScreen({ onUnlock }: LockScreenProps) {
  const cloudEnabled = isCloudSyncConfigured();

  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    return onSupabasePasswordRecovery(() => setMode('recovery'));
  }, []);

  const switchMode = (next: AuthMode) => {
    setErrorMsg(null);
    setStatusMsg(null);
    setMode(next);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setStatusMsg(null);
    setIsSubmitting(true);

    try {
      if (mode === 'signin') {
        const res = await signInWithSupabase(email, password);
        if (res.ok) onUnlock();
        else setErrorMsg(res.message || 'Sign in failed.');
      } else if (mode === 'signup') {
        const res = await signUpWithSupabase(email, password);
        if (!res.ok) {
          setErrorMsg(res.message || 'Sign up failed.');
        } else if (res.requiresEmailConfirmation) {
          setStatusMsg(res.message);
          setMode('signin');
        } else {
          onUnlock();
        }
      } else if (mode === 'forgot') {
        const res = await sendSupabasePasswordReset(email);
        if (res.ok) setStatusMsg(res.message);
        else setErrorMsg(res.message || 'Could not send reset email.');
      } else if (mode === 'recovery') {
        const res = await updateSupabasePassword(password);
        if (res.ok) {
          setPassword('');
          setMode('signin');
          setStatusMsg(res.message);
        } else {
          setErrorMsg(res.message || 'Could not update password.');
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const title =
    mode === 'signin' ? 'Sign In'
    : mode === 'signup' ? 'Create Account'
    : mode === 'forgot' ? 'Send Reset Email'
    : 'Update Password';

  return (
    <div className="min-h-screen bg-[#F5F5F7] text-[#1D1D1F] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-3xl border border-black/10 shadow-[0_12px_40px_rgba(0,0,0,0.06)] p-6 sm:p-7 space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-[#007AFF]/10 text-[#007AFF] flex items-center justify-center mx-auto">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-semibold tracking-tight">GOODSHIELD CRM</h1>
            <p className="text-xs text-[#6E6E73]">created by hanz • Private Workspace</p>
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

        {!cloudEnabled ? (
          <p className="text-xs text-center text-[#6E6E73]">
            Supabase is not configured. Check your VITE_SUPABASE_URL and
            VITE_SUPABASE_ANON_KEY environment variables.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {mode !== 'recovery' && (
              <div className="space-y-1">
                <label className="block text-xs font-medium text-[#6E6E73]">Email Address</label>
                <input
                  type="email"
                  required
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className={inputClass}
                />
              </div>
            )}

            {mode !== 'forgot' && (
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
                  className={inputClass}
                />
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 px-4 rounded-xl bg-[#007AFF] hover:bg-[#0066D6] disabled:opacity-60 text-white text-sm font-medium inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              {isSubmitting ? 'Please wait...' : title}
              {!isSubmitting && mode === 'signin' && <ArrowRight className="w-4 h-4" />}
              {!isSubmitting && mode === 'forgot' && <Mail className="w-4 h-4" />}
            </button>

            <div className="flex items-center justify-between text-xs text-[#6E6E73] pt-1">
              {mode === 'signin' ? (
                <>
                  <button type="button" onClick={() => switchMode('signup')} className="text-[#007AFF] hover:underline cursor-pointer">
                    Need an account? Sign up
                  </button>
                  <button type="button" onClick={() => switchMode('forgot')} className="hover:text-[#1D1D1F] cursor-pointer">
                    Forgot password?
                  </button>
                </>
              ) : mode !== 'recovery' ? (
                <button type="button" onClick={() => switchMode('signin')} className="text-[#007AFF] hover:underline cursor-pointer">
                  Back to Sign In
                </button>
              ) : null}
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
