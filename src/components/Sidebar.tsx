import React from 'react';
import {
  CheckCircle2,
  Clock,
  Flame,
  Inbox,
  KeyRound,
  Layers,
  Lock,
  Plus,
  X,
} from 'lucide-react';
import type { SmartViewId } from '../types/crm';

interface SidebarProps {
  activeView: SmartViewId;
  counts: Record<SmartViewId, number>;
  isMobileMenuOpen: boolean;
  onCloseMobileMenu: () => void;
  onSelectView: (view: SmartViewId) => void;
  onOpenNewLead: () => void;
  onLockWorkspace: () => void;
  onOpenPasscodeModal: () => void;
}

const NAV_ITEMS: Array<{
  id: SmartViewId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: 'due_today', label: 'Due Today', icon: Flame },
  { id: 'overdue', label: 'Overdue', icon: Clock },
  { id: 'upcoming', label: 'Upcoming', icon: Inbox },
  { id: 'replied', label: 'Replied', icon: CheckCircle2 },
  { id: 'all', label: 'All Leads', icon: Layers },
  { id: 'closed', label: 'Closed', icon: CheckCircle2 },
];

export function Sidebar({
  activeView,
  counts,
  isMobileMenuOpen,
  onCloseMobileMenu,
  onSelectView,
  onOpenNewLead,
  onLockWorkspace,
  onOpenPasscodeModal,
}: SidebarProps) {
  const content = (
    <aside className="w-60 shrink-0 bg-white rounded-2xl border border-black/10 p-3 flex flex-col justify-between h-full">
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#6E6E73]">
            Follow-Up Queues
          </span>
          <button
            type="button"
            onClick={onCloseMobileMenu}
            aria-label="Close navigation"
            className="lg:hidden p-1.5 rounded-lg text-[#6E6E73] hover:bg-black/5 hover:text-[#1D1D1F] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <button
          type="button"
          onClick={() => {
            onOpenNewLead();
            onCloseMobileMenu();
          }}
          className="w-full flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-[#1D1D1F] text-white text-sm font-medium hover:bg-black/85 active:scale-[0.99] transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Lead</span>
        </button>

        <nav aria-label="Follow-up queues" className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            const count = counts[item.id] ?? 0;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onSelectView(item.id);
                  onCloseMobileMenu();
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-[#1D1D1F] text-white font-medium'
                    : 'text-[#1D1D1F] hover:bg-black/[0.04]'
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
                  className={`text-xs px-2 py-0.5 rounded-full tabular-nums ${
                    isActive
                      ? 'bg-white/15 text-white'
                      : 'bg-black/[0.05] text-[#6E6E73]'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </nav>
      </div>

      <div className="pt-3 mt-3 border-t border-black/10 space-y-1">
        <button
          type="button"
          onClick={() => {
            onOpenPasscodeModal();
            onCloseMobileMenu();
          }}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-[#1D1D1F] hover:bg-black/[0.04] transition-colors cursor-pointer"
        >
          <KeyRound className="w-4 h-4 text-[#6E6E73] shrink-0" />
          <span>Passcode</span>
        </button>

        <button
          type="button"
          onClick={() => {
            onLockWorkspace();
            onCloseMobileMenu();
          }}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-[#1D1D1F] hover:bg-black/[0.04] transition-colors cursor-pointer"
        >
          <Lock className="w-4 h-4 text-[#6E6E73] shrink-0" />
          <span>Lock Workspace</span>
        </button>
      </div>
    </aside>
  );

  return (
    <>
      <div className="hidden lg:block h-full">{content}</div>

      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden flex">
          <button
            type="button"
            aria-label="Close navigation backdrop"
            onClick={onCloseMobileMenu}
            className="fixed inset-0 bg-black/30 backdrop-blur-[1px] cursor-default"
          />
          <div className="relative z-10 h-full p-2">{content}</div>
        </div>
      )}
    </>
  );
}
