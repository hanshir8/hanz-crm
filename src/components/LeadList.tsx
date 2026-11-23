import React from 'react';
import {
  Database,
  Plus,
  Search,
  Send,
  UserPlus,
} from 'lucide-react';
import { getLeadReminderMeta } from '../services/crmService';
import type { Lead, SmartViewId } from '../types/crm';

interface LeadListProps {
  leads: Lead[];
  selectedLeadId: string | null;
  searchQuery: string;
  activeView: SmartViewId;
  isQuotaLocked: boolean;
  sendingLeadId: string | null;
  mobilePane: 'list' | 'detail';
  onSearchChange: (query: string) => void;
  onSelectLead: (leadId: string) => void;
  onQuickSend: (lead: Lead) => void;
  onOpenNewLead: () => void;
  onLoadSampleLeads: () => void;
}

const VIEW_TITLES: Record<SmartViewId, string> = {
  due_today: 'Due Today',
  overdue: 'Overdue Follow-Ups',
  upcoming: 'Upcoming Reminders',
  replied: 'Replied Leads',
  all: 'All Leads',
  closed: 'Closed Leads',
};

export function LeadList({
  leads,
  selectedLeadId,
  searchQuery,
  activeView,
  isQuotaLocked,
  sendingLeadId,
  mobilePane,
  onSearchChange,
  onSelectLead,
  onQuickSend,
  onOpenNewLead,
  onLoadSampleLeads,
}: LeadListProps) {
  return (
    <section
      className={`${
        mobilePane === 'detail' ? 'hidden md:flex' : 'flex'
      } w-full md:w-80 lg:w-96 shrink-0 bg-white rounded-2xl border border-black/10 flex-col min-h-0 overflow-hidden`}
    >
      <div className="p-3.5 border-b border-black/10 space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold tracking-tight text-[#1D1D1F]">
            {VIEW_TITLES[activeView]}
          </h2>
          <span className="text-xs font-medium text-[#6E6E73] tabular-nums">
            {leads.length} {leads.length === 1 ? 'lead' : 'leads'}
          </span>
        </div>

        <div className="relative">
          <Search className="w-3.5 h-3.5 text-[#8E8E93] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search name, phone, or interest..."
            className="w-full pl-8 pr-3 py-2 rounded-xl bg-[#F5F5F7] border border-transparent text-xs focus:outline-none focus:bg-white focus:border-[#007AFF] transition-colors"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
        {leads.length === 0 ? (
          <div className="h-full min-h-[240px] flex flex-col items-center justify-center text-center p-6 space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-[#F5F5F7] text-[#6E6E73] flex items-center justify-center">
              <UserPlus className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold text-[#1D1D1F]">
                No leads in this view
              </p>
              <p className="text-xs text-[#6E6E73]">
                Add a new lead or load sample leads to test follow-ups.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={onOpenNewLead}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#007AFF] text-white text-xs font-medium hover:bg-[#0066D6] transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Lead
              </button>
              <button
                type="button"
                onClick={onLoadSampleLeads}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#F5F5F7] text-[#1D1D1F] text-xs font-medium hover:bg-black/5 transition-colors cursor-pointer"
              >
                <Database className="w-3.5 h-3.5" />
                Sample Data
              </button>
            </div>
          </div>
        ) : (
          leads.map((lead) => {
            const meta = getLeadReminderMeta(lead);
            const isSelected = lead.id === selectedLeadId;
            const isSending = sendingLeadId === lead.id;

            const badgeStyle =
              meta.bucket === 'due_today'
                ? 'bg-[#007AFF]/10 text-[#007AFF]'
                : meta.bucket === 'overdue'
                  ? 'bg-[#FF3B30]/10 text-[#C62828]'
                  : meta.bucket === 'replied'
                    ? 'bg-[#34C759]/10 text-[#1E7E34]'
                    : 'bg-[#F5F5F7] text-[#6E6E73]';

            return (
              <div
                key={lead.id}
                onClick={() => onSelectLead(lead.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectLead(lead.id);
                  }
                }}
                className={`p-3 rounded-xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#007AFF]/5 border-[#007AFF]/40'
                    : 'bg-white border-black/5 hover:border-black/15 hover:bg-[#F5F5F7]/60'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-[#1D1D1F] truncate">
                      {lead.name}
                    </p>
                    <p className="text-[11px] text-[#6E6E73] truncate mt-0.5">
                      {lead.interest}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-medium tabular-nums ${badgeStyle}`}
                  >
                    {meta.label}
                  </span>
                </div>

                <div className="mt-2.5 pt-2 border-t border-black/5 flex items-center justify-between gap-2">
                  <span className="text-[11px] font-mono text-[#6E6E73] truncate">
                    {lead.phone}
                  </span>

                  <button
                    type="button"
                    disabled={isQuotaLocked || isSending}
                    onClick={(e) => {
                      e.stopPropagation();
                      onQuickSend(lead);
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#34C759] hover:bg-[#2DB84F] disabled:opacity-40 text-white text-[11px] font-medium transition-colors cursor-pointer shrink-0"
                  >
                    <Send className="w-3 h-3" />
                    <span>{isSending ? 'Sending...' : 'Follow Up'}</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
