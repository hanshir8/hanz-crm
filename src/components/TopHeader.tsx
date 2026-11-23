import React from 'react';
import {
  Bell,
  HelpCircle,
  Lock,
  Menu,
  QrCode,
  ShieldCheck,
} from 'lucide-react';
import type {
  DesktopNotificationPermission,
  SendQuotaStatus,
  SmartViewId,
  WhatsAppSessionState,
} from '../types/crm';

interface TopHeaderProps {
  dueTodayCount: number;
  overdueCount: number;
  repliedRatePct: number;
  repliedCount: number;
  totalLeadsCount: number;
  activeView: SmartViewId;
  quota: SendQuotaStatus;
  whatsappSession: WhatsAppSessionState;
  notificationPermission: DesktopNotificationPermission;
  onSelectView: (view: SmartViewId) => void;
  onRequestNotificationPermission: () => void;
  onTestDesktopAlert: () => void;
  onOpenHowToUse: () => void;
  onOpenQrModal: () => void;
  onLockWorkspace: () => void;
  onOpenMobileMenu: () => void;
  onResetToMainView: () => void;
}

export function TopHeader({
  dueTodayCount,
  overdueCount,
  repliedRatePct,
  repliedCount,
  totalLeadsCount,
  activeView,
  quota,
  whatsappSession,
  notificationPermission,
  onSelectView,
  onRequestNotificationPermission,
  onTestDesktopAlert,
  onOpenHowToUse,
  onOpenQrModal,
  onLockWorkspace,
  onOpenMobileMenu,
  onResetToMainView,
}: TopHeaderProps) {
  const isWaConnected = whatsappSession.status === 'connected';

  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-black/10 px-3 sm:px-5 py-2.5">
      <div className="max-w-[1600px] mx-auto flex items-center justify-between gap-3">
        {/* Left: Mobile drawer button + Brand + Quick KPI pills */}
        <div className="flex items-center gap-2.5 sm:gap-4 min-w-0">
          <button
            type="button"
            onClick={onOpenMobileMenu}
            aria-label="Open menu"
            className="md:hidden p-2 rounded-xl bg-[#F5F5F7] hover:bg-black/5 text-[#1D1D1F] transition-colors cursor-pointer"
          >
            <Menu className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={onResetToMainView}
            className="flex items-center gap-2.5 text-left group cursor-pointer shrink-0"
          >
            <div className="w-8 h-8 rounded-xl bg-[#007AFF]/10 text-[#007AFF] flex items-center justify-center group-hover:bg-[#007AFF] group-hover:text-white transition-colors">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div className="leading-tight">
              <span className="block text-sm font-semibold tracking-tight text-[#1D1D1F]">
                GOODSHIELD CRM
              </span>
              <span className="hidden sm:block text-[11px] text-[#6E6E73]">
                created by hanz
              </span>
            </div>
          </button>

          {/* Compact Metric Chips */}
          <div className="hidden xl:flex items-center gap-2 pl-2 border-l border-black/10">
            <button
              type="button"
              onClick={() => onSelectView('due_today')}
              className={`px-2.5 py-1 rounded-full text-xs font-medium tabular-nums transition-colors cursor-pointer ${
                activeView === 'due_today'
                  ? 'bg-[#007AFF] text-white'
                  : 'bg-[#F5F5F7] text-[#1D1D1F] hover:bg-black/5'
              }`}
            >
              Due Today: {dueTodayCount}
            </button>

            <button
              type="button"
              onClick={() => onSelectView('overdue')}
              className={`px-2.5 py-1 rounded-full text-xs font-medium tabular-nums transition-colors cursor-pointer ${
                activeView === 'overdue'
                  ? 'bg-[#FF3B30] text-white'
                  : overdueCount > 0
                    ? 'bg-[#FF3B30]/10 text-[#C62828] hover:bg-[#FF3B30]/15'
                    : 'bg-[#F5F5F7] text-[#6E6E73] hover:bg-black/5'
              }`}
            >
              Overdue: {overdueCount}
            </button>

            <button
              type="button"
              onClick={() => onSelectView('replied')}
              className="px-2.5 py-1 rounded-full text-xs font-medium tabular-nums bg-[#F5F5F7] text-[#1D1D1F] hover:bg-black/5 transition-colors cursor-pointer"
            >
              Replied: {repliedCount}/{totalLeadsCount} ({repliedRatePct}%)
            </button>
          </div>
        </div>

        {/* Right: Quota + WhatsApp QR + Alerts + Help + Lock */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <div
            title="Rolling 24-hour WhatsApp send safety cap"
            className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium tabular-nums border ${
              quota.isLocked
                ? 'bg-[#FF9F0A]/15 border-[#FF9F0A]/30 text-[#9A5B00]'
                : 'bg-[#F5F5F7] border-black/5 text-[#1D1D1F]'
            }`}
          >
            <span>
              24h Quota: {quota.sentIn24h}/{quota.limit}
            </span>
          </div>

          <button
            type="button"
            onClick={onOpenQrModal}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium border transition-colors cursor-pointer ${
              isWaConnected
                ? 'bg-[#34C759]/10 border-[#34C759]/30 text-[#1E7E34]'
                : 'bg-[#F5F5F7] border-black/10 text-[#1D1D1F] hover:bg-black/5'
            }`}
          >
            <QrCode className="w-3.5 h-3.5" />
            <span className="hidden md:inline">
              {isWaConnected ? 'WA Paired' : 'WA QR'}
            </span>
          </button>

          {notificationPermission === 'granted' ? (
            <button
              type="button"
              onClick={onTestDesktopAlert}
              title="Send test desktop notification"
              className="p-2 rounded-xl bg-[#F5F5F7] hover:bg-black/5 text-[#1D1D1F] transition-colors cursor-pointer"
            >
              <Bell className="w-4 h-4 text-[#34C759]" />
            </button>
          ) : (
            <button
              type="button"
              onClick={onRequestNotificationPermission}
              title="Enable desktop follow-up alerts"
              className="p-2 rounded-xl bg-[#F5F5F7] hover:bg-black/5 text-[#6E6E73] hover:text-[#1D1D1F] transition-colors cursor-pointer"
            >
              <Bell className="w-4 h-4" />
            </button>
          )}

          <button
            type="button"
            onClick={onOpenHowToUse}
            title="How to use & sample leads"
            className="p-2 rounded-xl bg-[#F5F5F7] hover:bg-black/5 text-[#1D1D1F] transition-colors cursor-pointer"
          >
            <HelpCircle className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={onLockWorkspace}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1D1D1F] hover:bg-black text-white text-xs font-medium transition-colors cursor-pointer"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Lock</span>
          </button>
        </div>
      </div>
    </header>
  );
}
