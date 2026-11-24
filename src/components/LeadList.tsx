import React from 'react';
import { CalendarClock, Phone, Plus, RotateCcw, Users } from 'lucide-react';
import type { Lead, SmartViewId } from '../types/crm';
import { getLeadReminderMeta, normalizeLeadStatus } from '../services/crmService';

interface LeadListProps {
  leads?: Lead[] | null;
  selectedLeadId?: string | null;
  onSelectLead: (id: string) => void;
  onRestoreSamples?: () => void;
  onOpenNewLead: () => void;
  searchQuery?: string;
  activeView?: SmartViewId;
}

function statusBadgeStyle(status: Lead['status']): string {
  const normalized = normalizeLeadStatus(status);
  if (normalized === 'Replied') return 'bg-emerald-50 text-emerald-700 border-emerald-200/70';
  if (normalized === 'Contacted') return 'bg-blue-50 text-[#0071E3] border-blue-200/70';
  if (normalized === 'Closed') return 'bg-[#F5F5F7] text-[#6E6E73] border-black/10';
  return 'bg-amber-50 text-amber-800 border-amber-200/70';
}

function reminderBadgeStyle(bucket: SmartViewId): string {
  if (bucket === 'overdue') return 'text-red-700 bg-red-50';
  if (bucket === 'due_today') return 'text-amber-800 bg-amber-50';
  if (bucket === 'upcoming') return 'text-[#0071E3] bg-blue-50';
  return 'text-[#6E6E73] bg-[#F5F5F7]';
}

export function LeadList({
  leads,
  selectedLeadId,
  onSelectLead,
  onRestoreSamples,
  onOpenNewLead,
  searchQuery = '',
  activeView = 'all',
}: LeadListProps) {
  const safeLeads = Array.isArray(leads) ? leads.filter(Boolean) : [];

  if (safeLeads.length === 0) {
    const hasFilterOrSearch = Boolean(searchQuery.trim()) || activeView !== 'all';

    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-[#F5F5F7] flex items-center justify-center text-[#6E6E73]">
          <Users className="w-6 h-6" />
        </div>
        <div className="space-y-1 max-w-xs">
          <h2 className="text-sm font-semibold text-[#1D1D1F]">
            {hasFilterOrSearch ? 'No matching leads' : 'No leads yet'}
          </h2>
          <p className="text-xs text-[#6E6E73]">
            {hasFilterOrSearch
              ? 'Try clearing your search filter or switching to All Leads.'
              : 'Add your first customer inquiry or load sample leads to test follow-ups.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={onOpenNewLead}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#1D1D1F] text-white text-xs font-medium hover:opacity-90 transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Lead</span>
          </button>

          {!hasFilterOrSearch && onRestoreSamples && (
            <button
              type="button"
              onClick={onRestoreSamples}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-black/15 bg-white text-[#1D1D1F] text-xs font-medium hover:bg-[#F5F5F7] transition cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Load Samples</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto divide-y divide-black/[0.05]">
      {safeLeads.map((lead) => {
        const isSelected = lead.id === selectedLeadId;
        const meta = getLeadReminderMeta(lead);
        const normalizedStatus = normalizeLeadStatus(lead.status);

        return (
          <button
            key={lead.id}
            type="button"
            onClick={() => onSelectLead(lead.id)}
            className={`w-full text-left px-4 py-3.5 transition cursor-pointer flex flex-col gap-1.5 ${
              isSelected
                ? 'bg-[#0071E3]/[0.07] border-l-2 border-l-[#0071E3]'
                : 'bg-white hover:bg-[#FAFAFC]'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-[#1D1D1F] truncate">
                {lead.name || 'Unnamed Lead'}
              </span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-medium border shrink-0 ${statusBadgeStyle(
                  normalizedStatus
                )}`}
              >
                {normalizedStatus}
              </span>
            </div>

            {lead.interest && (
              <p className="text-xs text-[#1D1D1F]/80 truncate">{lead.interest}</p>
            )}

            <div className="flex items-center justify-between gap-2 pt-0.5 text-[11px]">
              <span className="inline-flex items-center gap-1 text-[#6E6E73] truncate">
                <Phone className="w-3 h-3 shrink-0" />
                <span className="truncate">{lead.phone || 'No phone'}</span>
              </span>

              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-medium shrink-0 ${reminderBadgeStyle(
                  meta.bucket
                )}`}
              >
                <CalendarClock className="w-3 h-3 shrink-0" />
                <span>{meta.label}</span>
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}

export default LeadList;
