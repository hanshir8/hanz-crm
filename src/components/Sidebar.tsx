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
