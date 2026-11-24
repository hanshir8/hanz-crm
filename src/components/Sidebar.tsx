import React from 'react';
import {
  CheckCircle2,
  Clock,
  Inbox,
  MessageSquareCheck,
  QrCode,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react';
import type { SmartViewId, WhatsAppSessionState } from '../types/crm';

interface SidebarProps {
  activeView: SmartViewId;
  onSelectView: (view: SmartViewId) => void;
  counts?: Partial<Record<SmartViewId, number>> | null;
  waSession?: WhatsAppSessionState | null;
  onOpenQrModal: () => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
  authEmail?: string | null;
}

const NAV_ITEMS: Array<{
  id: SmartViewId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badgeClass?: string;
}> = [
  { id: 'all', label: 'All Leads', icon: Users },
  {
    id: 'overdue',
    label: 'Overdue',
    icon: Clock,
    badgeClass: 'bg-red-50 text-red-700',
  },
  {
    id: 'due_today',
    label: 'Due Today',
    icon: Inbox,
    badgeClass: 'bg-amber-50 text-amber-700',
  },
  {
    id: 'upcoming',
    label: 'Upcoming',
    icon: Clock,
    badgeClass: 'bg-blue-50 text-[#0071E3]',
  },
  {
    id: 'replied',
    label: 'Replied',
    icon: MessageSquareCheck,
    badgeClass: 'bg-emerald-50 text-emerald-700',
  },
  {
    id: 'closed',
    label: 'Closed',
    icon: CheckCircle2,
    badgeClass: 'bg-[#F5F5F7] text-[#6E6E73]',
  },
];

export function Sidebar({
  activeView,
  onSelectView,
  counts,
  waSession,
  onOpenQrModal,
  isMobileOpen = false,
  onCloseMobile,
  authEmail,
}: SidebarProps) {
  const waStatus = waSession?.status ?? 'qr';

  const content = (
    <aside className="w-64 shrink-0 bg-white border-r border-black/[0.06] flex flex-col justify-between h-full">
      <div className="p-4 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-2xl bg-[#1D1D1F] text-white flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold tracking-tight truncate">GOODSHIELD CRM</p>
              <p className="text-[11px] text-[#6E6E73] truncate">
                {authEmail ? authEmail : 'WhatsApp Follow-Up'}
              </p>
            </div>
          </div>

          {onCloseMobile && (
            <button
              type="button"
              onClick={onCloseMobile}
              aria-label="Close sidebar"
              className="lg:hidden p-1.5 rounded-xl text-[#6E6E73] hover:text-[#1D1D1F] hover:bg-[#F5F5F7] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <nav aria-label="Lead views" className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            const countValue = Number(counts?.[item.id] ?? 0);

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onSelectView(item.id);
                  onCloseMobile?.();
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs sm:text-sm transition cursor-pointer ${
                  isActive
                    ? 'bg-[#1D1D1F] text-white font-medium'
                    : 'text-[#1D1D1F] hover:bg-[#F5F5F7]'
                }`}
              >
                <span className="flex items-center gap-2.5 min-w-0">
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      isActive ? 'text-white' : 'text-[#6E6E73]'
                    }`}
                  />
                  <span className="truncate">{item.label}</span>
                </span>

                <span
                  className={`ml-2 px-2 py-0.5 rounded-full text-[11px] font-medium tabular-nums ${
                    isActive
                      ? 'bg-white/15 text-white'
                      : item.badgeClass ?? 'bg-[#F5F5F7] text-[#6E6E73]'
                  }`}
                >
                  {Number.isFinite(countValue) ? countValue : 0}
                </span>
              </button>
            );
          })}
        </nav>
      </div>

      <div className="p-4 border-t border-black/[0.06] space-y-2.5">
        <button
          type="button"
          onClick={() => {
            onOpenQrModal();
            onCloseMobile?.();
          }}
          className="w-full flex items-center justify-between px-3 py-2.5 rounded-2xl bg-[#F5F5F7] hover:bg-[#EBEBEF] transition text-left cursor-pointer"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <QrCode className="w-4 h-4 text-[#1D1D1F] shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-medium text-[#1D1D1F] truncate">WhatsApp Link</p>
              <p className="text-[11px] text-[#6E6E73] capitalize truncate">
                Status: {waStatus}
              </p>
            </div>
          </div>

          <span
            className={`w-2.5 h-2.5 rounded-full shrink-0 ${
              waStatus === 'connected'
                ? 'bg-emerald-500'
                : waStatus === 'disconnected'
                  ? 'bg-amber-500'
                  : 'bg-[#0071E3]'
            }`}
          />
        </button>
      </div>
    </aside>
  );

  return (
    <>
      <div className="hidden lg:block">{content}</div>

      {isMobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/30 backdrop-blur-[1px]"
            onClick={onCloseMobile}
          />
          <div className="relative z-50 h-full">{content}</div>
        </div>
      )}
    </>
  );
}

export default Sidebar;
