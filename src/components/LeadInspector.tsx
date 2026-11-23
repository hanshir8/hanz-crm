import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  Clock,
  ExternalLink,
  MessageSquare,
  Phone,
  Send,
  Sparkles,
  Trash2,
} from 'lucide-react';
import {
  buildWhatsAppMeUrl,
  FOLLOW_UP_TEMPLATES,
  generateSmartDrafts,
  getLeadReminderMeta,
} from '../services/crmService';
import type {
  Lead,
  LeadStatus,
  ReminderCadence,
  SmartDraftOption,
} from '../types/crm';

interface LeadInspectorProps {
  lead: Lead | null;
  isQuotaLocked: boolean;
  isSending: boolean;
  mobilePane: 'list' | 'detail';
  onBackToList: () => void;
  onUpdateLead: (updated: Lead) => void;
  onDeleteLead: (leadId: string) => void;
  onSendFollowUp: (
    lead: Lead,
    message: string,
    templateName?: string
  ) => Promise<void>;
}

const STATUS_OPTIONS: LeadStatus[] = ['New', 'Contacted', 'Replied', 'Closed'];
const CADENCE_OPTIONS: Array<{ value: ReminderCadence; label: string }> = [
  { value: 3, label: 'Every 3 days' },
  { value: 4, label: 'Every 4 days' },
  { value: 7, label: 'Every 7 days' },
  { value: 0, label: 'Off' },
];

export function LeadInspector({
  lead,
  isQuotaLocked,
  isSending,
  mobilePane,
  onBackToList,
  onUpdateLead,
  onDeleteLead,
  onSendFollowUp,
}: LeadInspectorProps) {
  const [message, setMessage] = useState('');
  const [selectedTemplateName, setSelectedTemplateName] = useState<
    string | undefined
  >(undefined);
  const [smartDrafts, setSmartDrafts] = useState<SmartDraftOption[]>([]);
  const [isLoadingDrafts, setIsLoadingDrafts] = useState(false);

  useEffect(() => {
    if (!lead) {
      setMessage('');
      setSelectedTemplateName(undefined);
      setSmartDrafts([]);
      return;
    }

    const defaultTpl = FOLLOW_UP_TEMPLATES[0];
    setMessage(defaultTpl.buildMessage(lead));
    setSelectedTemplateName(defaultTpl.name);
    setSmartDrafts([]);
  }, [lead?.id]);

  if (!lead) {
    return (
      <section
        className={`${
          mobilePane === 'list' ? 'hidden md:flex' : 'flex'
        } flex-1 bg-white rounded-2xl border border-black/10 items-center justify-center p-8 text-center`}
      >
        <div className="max-w-xs space-y-2">
          <div className="w-11 h-11 rounded-2xl bg-[#F5F5F7] text-[#6E6E73] flex items-center justify-center mx-auto">
            <MessageSquare className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-semibold text-[#1D1D1F]">
            Select a lead to inspect
          </h3>
          <p className="text-xs text-[#6E6E73] leading-relaxed">
            Pick any contact on the left to review history, adjust 3–4 day
            reminder cadence, or send a WhatsApp follow-up.
          </p>
        </div>
      </section>
    );
  }

  const meta = getLeadReminderMeta(lead);
  const directWaUrl = buildWhatsAppMeUrl(lead.phone, message);

  const handleGenerateSmartDrafts = async () => {
    setIsLoadingDrafts(true);
    try {
      const drafts = await generateSmartDrafts(lead);
      setSmartDrafts(drafts);
    } finally {
      setIsLoadingDrafts(false);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || isQuotaLocked || isSending) return;
    await onSendFollowUp(lead, message, selectedTemplateName);
  };

  return (
    <section
      className={`${
        mobilePane === 'list' ? 'hidden md:flex' : 'flex'
      } flex-1 bg-white rounded-2xl border border-black/10 flex-col min-h-0 overflow-hidden`}
    >
      {/* Top Bar */}
      <div className="p-4 border-b border-black/10 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            type="button"
            onClick={onBackToList}
            aria-label="Back to leads"
            className="md:hidden p-1.5 rounded-xl bg-[#F5F5F7] text-[#1D1D1F] cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold tracking-tight text-[#1D1D1F] truncate">
                {lead.name}
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#007AFF]/10 text-[#007AFF] shrink-0">
                {meta.label}
              </span>
            </div>
            <div className="flex items-center gap-3 mt-0.5 text-xs text-[#6E6E73]">
              <span className="inline-flex items-center gap-1 font-mono">
                <Phone className="w-3 h-3" />
                {lead.phone}
              </span>
              <span className="truncate">• {lead.interest}</span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onDeleteLead(lead.id)}
          title="Delete lead"
          className="p-2 rounded-xl text-[#8E8E93] hover:text-[#FF3B30] hover:bg-[#FF3B30]/10 transition-colors cursor-pointer shrink-0"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
        {/* Status & Cadence Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-3 rounded-xl bg-[#F5F5F7] space-y-1.5">
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#6E6E73]">
              Pipeline Status
            </label>
            <div className="flex flex-wrap gap-1.5">
              {STATUS_OPTIONS.map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => onUpdateLead({ ...lead, status })}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    lead.status === status
                      ? 'bg-[#1D1D1F] text-white'
                      : 'bg-white text-[#1D1D1F] hover:bg-black/5'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[#F5F5F7] space-y-1.5">
            <label className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-[#6E6E73]">
              <CalendarClock className="w-3.5 h-3.5" />
              Reminder Cadence
            </label>
            <div className="flex flex-wrap gap-1.5">
              {CADENCE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() =>
                    onUpdateLead({ ...lead, reminderDays: opt.value })
                  }
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    lead.reminderDays === opt.value
                      ? 'bg-[#007AFF] text-white'
                      : 'bg-white text-[#1D1D1F] hover:bg-black/5'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="space-y-1.5">
          <label
            htmlFor="lead-notes"
            className="block text-xs font-semibold text-[#1D1D1F]"
          >
            Context & Notes
          </label>
          <textarea
            id="lead-notes"
            rows={2}
            value={lead.notes}
            onChange={(e) => onUpdateLead({ ...lead, notes: e.target.value })}
            placeholder="Add car model, budget, trade-in details, or preferred follow-up timing..."
            className="w-full px-3.5 py-2.5 rounded-xl bg-[#F5F5F7] border border-transparent text-xs focus:outline-none focus:bg-white focus:border-[#007AFF] transition-colors resize-none"
          />
        </div>

        {/* Composer */}
        <form
          onSubmit={handleSend}
          className="p-4 rounded-2xl border border-black/10 bg-[#F5F5F7]/50 space-y-3"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-semibold text-[#1D1D1F]">
              WhatsApp Follow-Up Message
            </span>

            <button
              type="button"
              onClick={handleGenerateSmartDrafts}
              disabled={isLoadingDrafts}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-black/10 hover:bg-[#F5F5F7] text-xs font-medium text-[#007AFF] transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {isLoadingDrafts ? 'Drafting...' : 'Smart Drafts'}
            </button>
          </div>

          {/* Preset Templates */}
          <div className="flex flex-wrap gap-1.5">
            {FOLLOW_UP_TEMPLATES.map((tpl) => (
              <button
                key={tpl.id}
                type="button"
                onClick={() => {
                  setMessage(tpl.buildMessage(lead));
                  setSelectedTemplateName(tpl.name);
                }}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors cursor-pointer ${
                  selectedTemplateName === tpl.name
                    ? 'bg-[#007AFF]/10 border-[#007AFF]/30 text-[#007AFF]'
                    : 'bg-white border-black/10 text-[#6E6E73] hover:text-[#1D1D1F]'
                }`}
              >
                {tpl.name}
              </button>
            ))}
          </div>

          {/* Smart Draft Chips */}
          {smartDrafts.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
              {smartDrafts.map((draft) => (
                <button
                  key={draft.id}
                  type="button"
                  onClick={() => {
                    setMessage(draft.message);
                    setSelectedTemplateName(draft.label);
                  }}
                  className="text-left p-2.5 rounded-xl bg-white border border-[#007AFF]/25 hover:border-[#007AFF] transition-colors cursor-pointer space-y-1"
                >
                  <span className="block text-[11px] font-semibold text-[#007AFF]">
                    {draft.label}
                  </span>
                  <span className="block text-[11px] text-[#6E6E73] line-clamp-2">
                    {draft.message}
                  </span>
                </button>
              ))}
            </div>
          )}

          <textarea
            rows={3}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Write your WhatsApp follow-up message..."
            className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-black/10 text-xs leading-relaxed focus:outline-none focus:border-[#007AFF] transition-colors"
          />

          <div className="flex flex-wrap items-center justify-between gap-2">
            <a
              href={directWaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-[#6E6E73] hover:text-[#1D1D1F]"
            >
              Preview wa.me link
              <ExternalLink className="w-3 h-3" />
            </a>

            <button
              type="submit"
              disabled={isQuotaLocked || isSending || !message.trim()}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#34C759] hover:bg-[#2DB84F] disabled:opacity-40 text-white text-xs font-semibold transition-colors cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              {isQuotaLocked
                ? '24h Quota Reached (30/30)'
                : isSending
                  ? 'Sending...'
                  : 'Send & Schedule Next Reminder'}
            </button>
          </div>
        </form>

        {/* Outreach History */}
        <div className="space-y-2.5">
          <h3 className="text-xs font-semibold text-[#1D1D1F] flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-[#6E6E73]" />
            Follow-Up History ({lead.history?.length || 0})
          </h3>

          {!lead.history || lead.history.length === 0 ? (
            <p className="text-xs text-[#6E6E73] bg-[#F5F5F7] rounded-xl p-3">
              No messages logged yet. Sending a follow-up automatically records
              it here and schedules the next reminder.
            </p>
          ) : (
            <div className="space-y-2">
              {lead.history.map((item) => (
                <div
                  key={item.id}
                  className="p-3 rounded-xl bg-[#F5F5F7] border border-black/5 space-y-1"
                >
                  <div className="flex items-center justify-between gap-2 text-[11px] text-[#6E6E73]">
                    <span className="inline-flex items-center gap-1 font-medium text-[#1D1D1F]">
                      <CheckCircle2 className="w-3 h-3 text-[#34C759]" />
                      {item.templateName || 'Follow-Up Sent'}
                    </span>
                    <span className="tabular-nums">
                      {new Date(item.sentAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-xs text-[#1D1D1F] leading-relaxed">
                    {item.message}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
