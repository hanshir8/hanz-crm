import React, { useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import {
  Cloud,
  HelpCircle,
  KeyRound,
  Lock,
  LogOut,
  Menu,
  Plus,
  QrCode,
  RefreshCw,
  Search,
} from 'lucide-react';
import type {
  LeadStatus,
  SendQuotaStatus,
  SmartViewId,
  WhatsAppSessionState,
} from '../types/crm';
import { isCloudSyncConfigured } from '../services/crmService';

type AuthActionResult = { ok: boolean; message: string };

interface TopHeaderProps {
  activeView: SmartViewId;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  statusFilter: 'All' | LeadStatus;
  onStatusFilterChange: (status: 'All' | LeadStatus) => void;
  waSession?: WhatsAppSessionState | null;
  quota?: SendQuotaStatus | null;
  onOpenNewLead: () => void;
  onOpenQrModal: () => void;
  onOpenPasscodeModal: () => void;
  onLockNow: () => void;
  onOpenHowToUse: () => void;
  onToggleMobileSidebar: () => void;
  authSession?: Session | null;
  isSyncingCloud?: boolean;
  onSyncNow?: () => void;
  onSignIn?: (email: string, password: string) => Promise<AuthActionResult>;
  onSignUp?: (
    email: string,
    password: string
  ) => Promise<AuthActionResult & { requiresEmailConfirmation: boolean }>;
  onPasswordReset?: (email: string) => Promise<AuthActionResult>;
  onSignOut?: () => Promise<void>;
}

const VIEW_TITLES: Record<SmartViewId, string> = {
  all: 'All Leads',
  overdue: 'Overdue Follow-Ups',
  due_today: 'Due Today',
  upcoming: 'Upcoming Reminders',
  replied: 'Replied Leads',
  closed: 'Closed Deals',
};

export function TopHeader({
  activeView,
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  waSession,
  quota,
  onOpenNewLead,
  onOpenQrModal,
  onOpenPasscodeModal,
  onLockNow,
  onOpenHowToUse,
  onToggleMobileSidebar,
  authSession,
  isSyncingCloud = false,
  onSyncNow,
  onSignIn,
  onSignUp,
  onPasswordReset,
  onSignOut,
}: TopHeaderProps) {
  const [isAuthPopoverOpen, setIsAuthPopoverOpen] = useState(false);
  const [authTab, setAuthTab] = useState<'signin' | 'signup' | 'reset'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [statusMsg, setStatusMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const waStatus = waSession?.status ?? 'qr';
  const sentCount = Number.isFinite(Number(quota?.sentIn24h)) ? Number(quota?.sentIn24h) : 0;
  const quotaLimit =
    Number.isFinite(Number(quota?.limit)) && Number(quota?.limit) > 0
      ? Number(quota?.limit)
      : 45;
  const remainingQuota = Math.max(0, quotaLimit - sentCount);
  const cloudConfigured = isCloudSyncConfigured();

  const viewTitle = VIEW_TITLES[activeView] ?? 'All Leads';

  const handleAuthFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setStatusMsg('');
    setSubmitting(true);

    try {
      if (authTab === 'reset') {
        if (!onPasswordReset) return;
        const res = await onPasswordReset(email);
        if (res.ok) setStatusMsg(res.message);
        else setErrorMsg(res.message);
        return;
      }

      if (authTab === 'signup') {
        if (!onSignUp) return;
        const res = await onSignUp(email, password);
        if (res.ok) {
          setStatusMsg(res.message);
          setPassword('');
        } else {
          setErrorMsg(res.message);
        }
        return;
      }

      if (!onSignIn) return;
      const res = await onSignIn(email, password);
      if (res.ok) {
        setStatusMsg(res.message);
        setPassword('');
        setIsAuthPopoverOpen(false);
      } else {
        setErrorMsg(res.message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-black/[0.06] px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            type="button"
            onClick={onToggleMobileSidebar}
            aria-label="Toggle navigation menu"
            className="lg:hidden p-2 rounded-xl border border-black/10 text-[#1D1D1F] hover:bg-[#F5F5F7] transition cursor-pointer"
          >
            <Menu className="w-4 h-4" />
          </button>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-semibold tracking-tight truncate">
                {viewTitle}
              </h1>
              <span className="hidden sm:inline-flex items-center rounded-full bg-[#F5F5F7] px-2.5 py-0.5 text-[11px] font-medium text-[#6E6E73]">
                {remainingQuota}/{quotaLimit} left today
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-1 sm:flex-initial items-center gap-2 min-w-[200px] sm:min-w-[260px] max-w-md order-3 sm:order-2 w-full sm:w-auto">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-[#6E6E73] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search name, phone, model..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-[#F5F5F7] border border-transparent focus:border-black/15 focus:bg-white text-xs sm:text-sm focus:outline-none transition"
            />
          </div>

          <select
            aria-label="Filter by status"
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value as 'All' | LeadStatus)}
            className="px-2.5 py-1.5 rounded-xl bg-[#F5F5F7] border border-black/[0.06] text-xs font-medium text-[#1D1D1F] focus:outline-none cursor-pointer"
          >
            <option value="All">All Status</option>
            <option value="New">New</option>
            <option value="Contacted">Contacted</option>
            <option value="Replied">Replied</option>
            <option value="Closed">Closed</option>
          </select>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 order-2 sm:order-3 relative">
          {cloudConfigured && (
            <div className="relative">
              {authSession?.user?.email ? (
                <div className="flex items-center gap-1">
                  {onSyncNow && (
                    <button
                      type="button"
                      onClick={onSyncNow}
                      disabled={isSyncingCloud}
                      title={`Synced for ${authSession.user.email}`}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-black/10 bg-white hover:bg-[#F5F5F7] text-xs font-medium text-[#1D1D1F] transition cursor-pointer disabled:opacity-60"
                    >
                      <RefreshCw
                        className={`w-3.5 h-3.5 text-[#0071E3] ${
                          isSyncingCloud ? 'animate-spin' : ''
                        }`}
                      />
                      <span className="hidden md:inline">
                        {isSyncingCloud ? 'Syncing...' : 'Sync'}
                      </span>
                    </button>
                  )}

                  {onSignOut && (
                    <button
                      type="button"
                      onClick={() => void onSignOut()}
                      title="Sign out of cloud sync"
                      className="p-2 rounded-xl border border-black/10 bg-white hover:bg-[#F5F5F7] text-[#6E6E73] hover:text-[#1D1D1F] transition cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setIsAuthPopoverOpen((prev) => !prev);
                    setErrorMsg('');
                    setStatusMsg('');
                  }}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-black/10 bg-white hover:bg-[#F5F5F7] text-xs font-medium text-[#1D1D1F] transition cursor-pointer"
                >
                  <Cloud className="w-3.5 h-3.5 text-[#0071E3]" />
                  <span className="hidden md:inline">Sign In</span>
                </button>
              )}

              {isAuthPopoverOpen && !authSession?.user?.email && (
                <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-white border border-black/10 shadow-xl p-4 z-50 space-y-3">
                  <div className="flex items-center justify-between border-b border-black/[0.06] pb-2">
                    <span className="text-xs font-semibold">Supabase Cloud Sync</span>
                    <div className="flex items-center gap-2 text-[11px]">
                      <button
                        type="button"
                        onClick={() => setAuthTab('signin')}
                        className={
                          authTab === 'signin'
                            ? 'font-semibold text-[#0071E3]'
                            : 'text-[#6E6E73] cursor-pointer'
                        }
                      >
                        Sign In
                      </button>
                      <button
                        type="button"
                        onClick={() => setAuthTab('signup')}
                        className={
                          authTab === 'signup'
                            ? 'font-semibold text-[#0071E3]'
                            : 'text-[#6E6E73] cursor-pointer'
                        }
                      >
                        Sign Up
                      </button>
                    </div>
                  </div>

                  <form onSubmit={handleAuthFormSubmit} className="space-y-2">
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full px-3 py-1.5 rounded-xl border border-black/15 text-xs focus:outline-none focus:border-[#0071E3]"
                    />
                    {authTab !== 'reset' && (
                      <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Password"
                        className="w-full px-3 py-1.5 rounded-xl border border-black/15 text-xs focus:outline-none focus:border-[#0071E3]"
                      />
                    )}

                    <div className="flex items-center justify-between pt-1">
                      <button
                        type="button"
                        onClick={() =>
                          setAuthTab((prev) => (prev === 'reset' ? 'signin' : 'reset'))
                        }
                        className="text-[11px] text-[#6E6E73] hover:text-[#1D1D1F] cursor-pointer"
                      >
                        {authTab === 'reset' ? 'Back' : 'Reset password'}
                      </button>

                      <button
                        type="submit"
                        disabled={submitting}
                        className="px-3 py-1.5 rounded-xl bg-[#0071E3] text-white text-xs font-medium hover:opacity-90 disabled:opacity-50 cursor-pointer"
                      >
                        {submitting
                          ? 'Saving...'
                          : authTab === 'reset'
                            ? 'Send Link'
                            : authTab === 'signup'
                              ? 'Register'
                              : 'Sign In'}
                      </button>
                    </div>
                  </form>

                  {errorMsg && <p className="text-[11px] text-red-600">{errorMsg}</p>}
                  {statusMsg && <p className="text-[11px] text-emerald-700">{statusMsg}</p>}
                </div>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={onOpenQrModal}
            title={`WhatsApp status: ${waStatus}`}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-black/10 bg-white hover:bg-[#F5F5F7] text-xs font-medium text-[#1D1D1F] transition cursor-pointer"
          >
            <span
              className={`w-2 h-2 rounded-full ${
                waStatus === 'connected'
                  ? 'bg-emerald-500'
                  : waStatus === 'disconnected'
                    ? 'bg-amber-500'
                    : 'bg-[#0071E3]'
              }`}
            />
            <QrCode className="w-3.5 h-3.5" />
            <span className="hidden sm:inline capitalize">{waStatus}</span>
          </button>

          <button
            type="button"
            onClick={onOpenPasscodeModal}
            title="Passcode settings"
            className="p-2 rounded-xl border border-black/10 bg-white hover:bg-[#F5F5F7] text-[#1D1D1F] transition cursor-pointer"
          >
            <KeyRound className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={onLockNow}
            title="Lock CRM"
            className="p-2 rounded-xl border border-black/10 bg-white hover:bg-[#F5F5F7] text-[#1D1D1F] transition cursor-pointer"
          >
            <Lock className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={onOpenHowToUse}
            title="How to use"
            className="hidden sm:inline-flex p-2 rounded-xl border border-black/10 bg-white hover:bg-[#F5F5F7] text-[#1D1D1F] transition cursor-pointer"
          >
            <HelpCircle className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={onOpenNewLead}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1D1D1F] text-white text-xs sm:text-sm font-medium hover:opacity-90 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Lead</span>
          </button>
        </div>
      </div>
    </header>
  );
}

export default TopHeader;
