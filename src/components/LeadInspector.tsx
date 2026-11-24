import React, { useEffect, useState } from 'react';
import {
  Calendar,
  ExternalLink,
  MessageCircle,
  Phone,
  Send,
  Sparkles,
  Trash2,
} from 'lucide-react';
import type {
  Lead,
  LeadStatus,
  ReminderCadence,
  SendQuotaStatus,
  WhatsAppSessionState,
} from '../types/crm';
import {
  buildWhatsAppMeUrl as defaultBuildWaUrl,
  computeNextReminderDate,
  FOLLOW_UP_TEMPLATES,
  generateSmartDrafts as defaultGenerateDrafts,
  getLeadReminderMeta,
  normalizeLeadStatus,
  sanitizePhoneForWhatsApp as defaultSanitizePhone,
} from '../services/crmService';

interface SmartDraftOption {
  id: string;
  label?: string;
  title?: string;
  name?: string;
  text?: string;
  body?: string;
  message?: string;
  content?: string;
}

interface LeadInspectorProps {
  lead?: Lead | null;
  quota?: SendQuotaStatus | null;
  waSession?: WhatsAppSessionState | null;
  onUpdateLead: (updatedLead: Lead) => Promise<void> | void;
  onDeleteLead: (leadId: string) => Promise<void> | void;
  onSendWhatsApp: (lead: Lead, message: string, templateName?: string) => Promise<void> | void;
  generateSmartDrafts?: (lead: Lead) => SmartDraftOption[];
  buildWhatsAppMeUrl?: (phone: string | undefined, message: string) => string;
  sanitizePhoneForWhatsApp?: (phone?: string, defaultCountryCode?: string) => string;
}

const CADENCE_OPTIONS: Array<{ label: string; value: ReminderCadence }> = [
  { label: 'Every 2 days', value: 2 },
  { label: 'Every 3 days', value: 3 },
  { label: 'Every 4 days', value: 4 },
  { label: 'Every 7 days', value: 7 },
  { label: 'Off', value: 0 },
];

const STATUS_OPTIONS: LeadStatus[] = ['New', 'Contacted', 'Replied', 'Closed'];

export function LeadInspector({
  lead,
  quota,
  waSession,
  onUpdateLead,
  onDeleteLead,
  onSendWhatsApp,
  generateSmartDrafts = defaultGenerateDrafts,
  buildWhatsAppMeUrl = defaultBuildWaUrl,
  sanitizePhoneForWhatsApp = defaultSanitizePhone,
}: LeadInspectorProps) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [interest, setInterest] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<LeadStatus>('New');
  const [reminderDays, setReminderDays] = useState<ReminderCadence>(3);
  const [messageDraft, setMessageDraft] = useState('');
  const [activeTemplateName, setActiveTemplateName] = useState<string | undefined>(undefined);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (!lead) {
      setName('');
      setPhone('');
      setInterest('');
      setNotes('');
      setStatus('New');
      setReminderDays(3);
      setMessageDraft('');
      setActiveTemplateName(undefined);
      return;
    }

    setName(lead.name ?? '');
    setPhone(lead.phone ?? '');
    setInterest(lead.interest ?? '');
    setNotes(lead.notes ?? '');
    setStatus(normalizeLeadStatus(lead.status));
    setReminderDays((lead.reminderDays ?? 3) as ReminderCadence);

    const firstName = (lead.name ?? '').trim().split(/\s+/)[0] || 'there';
    const topic = (lead.interest ?? '').trim() || 'your inquiry';
    setMessageDraft(
      `Hi ${firstName}, following up on ${topic}. Let me know if you have any questions or would like more details.`
    );
    setActiveTemplateName(undefined);
  }, [lead]);

  if (!lead) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-[#6E6E73]">
        <MessageCircle className="w-10 h-10 mb-3 opacity-40" />
        <p className="text-sm font-medium text-[#1D1D1F]">No lead selected</p>
        <p className="text-xs mt-1 max-w-xs">
          Select a lead on the left or click New Lead to inspect details and send a WhatsApp follow-up.
        </p>
      </div>
    );
  }

  const meta = getLeadReminderMeta(lead);
  const waStatus = waSession?.status ?? 'qr';
  const isQuotaLocked = Boolean(quota?.isLocked);
  const cleanPhone = sanitizePhoneForWhatsApp(phone);
  const waHref = buildWhatsAppMeUrl(phone, messageDraft);
  const smartDrafts = generateSmartDrafts(lead);
  const historyList = Array.isArray(lead.history) ? [...lead.history].reverse() : [];

  const persistDetails = async (overrides?: Partial<Lead>) => {
    const nextStatus = normalizeLeadStatus(overrides?.status ?? status);
    const nextCadence = (overrides?.reminderDays ?? reminderDays) as ReminderCadence;
    const nextReminderAt =
      overrides?.nextReminderAt !== undefined
        ? overrides.nextReminderAt
        : nextCadence > 0
          ? computeNextReminderDate(nextCadence, new Date())
          : null;

    const updated: Lead = {
      ...lead,
      name: (overrides?.name ?? name).trim() || 'Unnamed Lead',
      phone: (overrides?.phone ?? phone).trim(),
      interest: (overrides?.interest ?? interest).trim(),
      notes: overrides?.notes !== undefined ? overrides.notes : notes,
      status: nextStatus,
      reminderDays: nextCadence,
      nextReminderAt,
    };

    await onUpdateLead(updated);
  };

  const handleSendClick = async () => {
    const textToSend =
      messageDraft.trim() || FOLLOW_UP_TEMPLATES[0].buildMessage({ ...lead, name, interest });
    setIsSending(true);
    try {
      await onSendWhatsApp(
        {
          ...lead,
          name: name.trim() || lead.name,
          phone: phone.trim() || lead.phone,
          interest: interest.trim() || lead.interest,
          notes,
          status,
          reminderDays,
        },
        textToSend,
        activeTemplateName
      );
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
      <div className="bg-white rounded-3xl border border-black/[0.07] p-5 space-y-4 shadow-2xs">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-semibold tracking-tight text-[#1D1D1F] truncate">
                {lead.name || 'Unnamed Lead'}
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#F5F5F7] text-[#1D1D1F]">
                {meta.label}
              </span>
              <span className="text-[11px] text-[#6E6E73]">WA: {waStatus}</span>
            </div>
            <p className="text-xs text-[#6E6E73] mt-0.5 flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1">
                <Phone className="w-3 h-3" />
                {cleanPhone ? `+${cleanPhone}` : phone || 'No phone number'}
              </span>
              {lead.nextReminderAt && (
                <span className="inline-flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  Next: {new Date(lead.nextReminderAt).toLocaleDateString()}
                </span>
              )}
            </p>
          </div>

          <button
            type="button"
            onClick={() => void onDeleteLead(lead.id)}
            title="Delete lead"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-xs font-medium transition cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-medium text-[#6E6E73] mb-1">
              Lead Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => void persistDetails()}
              className="w-full px-3 py-2 rounded-xl border border-black/12 bg-[#FAFAFC] text-xs sm:text-sm focus:outline-none focus:border-[#0071E3]"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-[#6E6E73] mb-1">
              Phone Number
            </label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              onBlur={() => void persistDetails()}
              placeholder="+60123456789"
              className="w-full px-3 py-2 rounded-xl border border-black/12 bg-[#FAFAFC] text-xs sm:text-sm focus:outline-none focus:border-[#0071E3]"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-[#6E6E73] mb-1">
              Vehicle / Interest
            </label>
            <input
              type="text"
              value={interest}
              onChange={(e) => setInterest(e.target.value)}
              onBlur={() => void persistDetails()}
              placeholder="e.g., Tiggo 7 PHEV / Tint package"
              className="w-full px-3 py-2 rounded-xl border border-black/12 bg-[#FAFAFC] text-xs sm:text-sm focus:outline-none focus:border-[#0071E3]"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-medium text-[#6E6E73] mb-1">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => {
                  const next = normalizeLeadStatus(e.target.value);
                  setStatus(next);
                  void persistDetails({ status: next });
                }}
                className="w-full px-2.5 py-2 rounded-xl border border-black/12 bg-[#FAFAFC] text-xs sm:text-sm focus:outline-none focus:border-[#0071E3] cursor-pointer"
              >
                {STATUS_OPTIONS.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-[#6E6E73] mb-1">
                Cadence
              </label>
              <select
                value={reminderDays}
                onChange={(e) => {
                  const nextDays = Number(e.target.value) as ReminderCadence;
                  setReminderDays(nextDays);
                  void persistDetails({ reminderDays: nextDays });
                }}
                className="w-full px-2.5 py-2 rounded-xl border border-black/12 bg-[#FAFAFC] text-xs sm:text-sm focus:outline-none focus:border-[#0071E3] cursor-pointer"
              >
                {CADENCE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-medium text-[#6E6E73] mb-1">
            Notes
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={() => void persistDetails()}
            placeholder="Key details, budget, or follow-up context..."
            className="w-full px-3 py-2 rounded-xl border border-black/12 bg-[#FAFAFC] text-xs sm:text-sm focus:outline-none focus:border-[#0071E3]"
          />
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-black/[0.07] p-5 space-y-3.5 shadow-2xs">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-[#1D1D1F]">
            <Sparkles className="w-4 h-4 text-[#0071E3]" />
            <span>WhatsApp Follow-Up Message</span>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {smartDrafts.map((draft, idx) => {
              const label = draft.label || draft.title || draft.name || `Template ${idx + 1}`;
              const body =
                draft.text || draft.body || draft.message || draft.content || '';
              return (
                <button
                  key={draft.id || idx}
                  type="button"
                  onClick={() => {
                    setMessageDraft(body);
                    setActiveTemplateName(label);
                  }}
                  className="px-2.5 py-1 rounded-xl bg-[#F5F5F7] hover:bg-[#EBEBEF] text-[11px] font-medium text-[#1D1D1F] transition cursor-pointer"
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        <textarea
          rows={4}
          value={messageDraft}
          onChange={(e) => setMessageDraft(e.target.value)}
          placeholder="Write your WhatsApp follow-up message..."
          className="w-full px-3.5 py-2.5 rounded-2xl border border-black/12 bg-[#FAFAFC] text-xs sm:text-sm focus:outline-none focus:border-[#0071E3]"
        />

        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <a
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-black/12 text-xs font-medium text-[#1D1D1F] hover:bg-[#F5F5F7] transition"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Direct WhatsApp Link</span>
          </a>

          <button
            type="button"
            disabled={isSending || isQuotaLocked}
            onClick={() => void handleSendClick()}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0071E3] text-white text-xs sm:text-sm font-medium hover:opacity-90 disabled:opacity-50 transition cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>
              {isQuotaLocked
                ? 'Daily Limit Reached'
                : isSending
                  ? 'Sending...'
                  : 'Send & Log Follow-Up'}
            </span>
          </button>
        </div>
      </div>

      {historyList.length > 0 && (
        <div className="bg-white rounded-3xl border border-black/[0.07] p-5 space-y-2.5 shadow-2xs">
          <h3 className="text-xs font-semibold text-[#1D1D1F]">Activity History</h3>
          <div className="space-y-2">
            {historyList.map((entry) => (
              <div
                key={entry.id}
                className="rounded-2xl bg-[#F5F5F7] px-3.5 py-2.5 text-xs space-y-1"
              >
                <div className="flex items-center justify-between gap-2 text-[11px] text-[#6E6E73]">
                  <span className="font-medium text-[#1D1D1F]">{entry.type}</span>
                  <span>
                    {entry.at ? new Date(entry.at).toLocaleString() : ''}
                  </span>
                </div>
                {entry.message && (
                  <p className="text-xs text-[#1D1D1F]/85 break-words">{entry.message}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default LeadInspector;
