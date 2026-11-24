import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  CalendarClock,
  Check,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileVideo,
  Image as ImageIcon,
  MessageSquare,
  Pencil,
  Phone,
  Plus,
  Send,
  Sparkles,
  Trash2,
  X,
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

interface AttachedMediaItem {
  id: string;
  name: string;
  type: 'image' | 'video';
  sizeBytes: number;
  previewUrl: string;
}

const STATUS_OPTIONS: LeadStatus[] = ['New', 'Contacted', 'Replied', 'Closed'];
const CADENCE_OPTIONS: Array<{ value: ReminderCadence; label: string }> = [
  { value: 3, label: 'Every 3 days' },
  { value: 4, label: 'Every 4 days' },
  { value: 7, label: 'Every 7 days' },
  { value: 0, label: 'Off' },
];

const MAX_PHOTO_BYTES = 8 * 1024 * 1024;  // 8 MB
const MAX_VIDEO_BYTES = 25 * 1024 * 1024; // 25 MB

function getTemplateText(tpl: any, lead: Lead): string {
  if (!tpl) {
    const firstName = lead.name?.trim().split(/\s+/)[0] || 'there';
    const topic = lead.interest?.trim() || 'your inquiry';
    return `Hi ${firstName}, just following up on ${topic} — let me know if you have any questions!`;
  }
  if (typeof tpl.buildMessage === 'function') {
    return tpl.buildMessage(lead);
  }
  const raw = tpl.body ?? tpl.message ?? '';
  const firstName = lead.name?.trim().split(/\s+/)[0] || 'there';
  const topic = lead.interest?.trim() || 'your inquiry';
  return String(raw)
    .replace(/\{name\}/gi, firstName)
    .replace(/\{interest\}/gi, topic)
    .replace(/\{vehicle\}/gi, topic);
}

function getTemplateTitle(tpl: any, index: number): string {
  return tpl?.name || tpl?.title || `Template ${index + 1}`;
}

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

  // Edit mode state for Name, Phone, and Interest
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editInterest, setEditInterest] = useState('');

  // Photo / Video attachment state from PC file picker
  const [attachments, setAttachments] = useState<AttachedMediaItem[]>([]);
  const attachmentsRef = useRef<AttachedMediaItem[]>([]);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const mediaInputRef = useRef<HTMLInputElement | null>(null);

  attachmentsRef.current = attachments;

  const revokeItems = (items: AttachedMediaItem[]) => {
    items.forEach((item) => {
      if (item.previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(item.previewUrl);
      }
    });
  };

  useEffect(() => {
    setIsEditingProfile(false);
    setSmartDrafts([]);
    setMediaError(null);
    setAttachments((prev) => {
      revokeItems(prev);
      return [];
    });

    if (!lead) {
      setMessage('');
      setSelectedTemplateName(undefined);
      return;
    }

    setEditName(lead.name ?? '');
    setEditPhone(lead.phone ?? '');
    setEditInterest(lead.interest ?? '');

    const defaultTpl = FOLLOW_UP_TEMPLATES?.[0];
    setMessage(getTemplateText(defaultTpl, lead));
    setSelectedTemplateName(defaultTpl ? getTemplateTitle(defaultTpl, 0) : undefined);
  }, [lead?.id]);

  // Only revoke blob URLs when LeadInspector unmounts
  useEffect(() => {
    return () => {
      revokeItems(attachmentsRef.current);
    };
  }, []);

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

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = editName.trim();
    if (!trimmedName) return;

    const updatedLead: Lead = {
      ...lead,
      name: trimmedName,
      phone: editPhone.trim(),
      interest: editInterest.trim(),
    };

    onUpdateLead(updatedLead);
    setIsEditingProfile(false);
  };

  const handleCancelProfileEdit = () => {
    setEditName(lead.name ?? '');
    setEditPhone(lead.phone ?? '');
    setEditInterest(lead.interest ?? '');
    setIsEditingProfile(false);
  };

  const handleOpenMediaPicker = () => {
    setMediaError(null);
    mediaInputRef.current?.click();
  };

  const handleMediaFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    const added: AttachedMediaItem[] = [];
    for (const file of files) {
      const isImage = file.type.startsWith('image/');
      const isVideo = file.type.startsWith('video/');
      if (!isImage && !isVideo) {
        setMediaError('Only image and video files are supported.');
        continue;
      }
      const limit = isImage ? MAX_PHOTO_BYTES : MAX_VIDEO_BYTES;
      const limitLabel = isImage ? '8 MB' : '25 MB';
      if (file.size > limit) {
        setMediaError(`"${file.name}" exceeds the ${limitLabel} limit.`);
        continue;
      }
      added.push({
        id: `media_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        name: file.name,
        type: isImage ? 'image' : 'video',
        sizeBytes: file.size,
        previewUrl: URL.createObjectURL(file),
      });
    }

    if (added.length > 0) {
      setAttachments((prev) => [...prev, ...added]);
    }

    e.target.value = '';
  };

  const handleRemoveAttachment = (id: string) => {
    setAttachments((prev) => {
      const target = prev.find((item) => item.id === id);
      if (target) revokeItems([target]);
      return prev.filter((item) => item.id !== id);
    });
  };

  const buildMessageWithMedia = (baseText: string) => {
    const trimmed = baseText.trim();
    if (attachments.length === 0) return trimmed;
    const names = attachments.map((a) => a.name).join(', ');
    return trimmed ? `${trimmed}\n[Attached: ${names}]` : `[Attached: ${names}]`;
  };

  const meta = getLeadReminderMeta(lead);
  const composedMessage = buildMessageWithMedia(message);
  const directWaUrl = buildWhatsAppMeUrl(editPhone || lead.phone, composedMessage);

  const handleGenerateSmartDrafts = async () => {
    setIsLoadingDrafts(true);
    try {
      const drafts = await generateSmartDrafts(lead);
      const normalized = (Array.isArray(drafts) ? drafts : []).map((d: any, idx: number) => ({
        id: d.id ?? `draft-${idx}`,
        label: d.label ?? d.title ?? `Draft ${idx + 1}`,
        message: d.message ?? d.text ?? d.body ?? '',
      }));
      setSmartDrafts(normalized);
    } finally {
      setIsLoadingDrafts(false);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!composedMessage || isQuotaLocked || isSending) return;
    await onSendFollowUp(lead, composedMessage, selectedTemplateName);
    setAttachments((prev) => {
      revokeItems(prev);
      return [];
    });
    setMediaError(null);
  };

  return (
    <section
      className={`${
        mobilePane === 'list' ? 'hidden md:flex' : 'flex'
      } flex-1 bg-white rounded-2xl border border-black/10 flex-col min-h-0 overflow-hidden`}
    >
      {/* Top Bar */}
      <div className="p-4 border-b border-black/10 flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5 min-w-0 flex-1">
          <button
            type="button"
            onClick={onBackToList}
            aria-label="Back to leads"
            className="md:hidden p-1.5 rounded-xl bg-[#F5F5F7] text-[#1D1D1F] cursor-pointer mt-0.5"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          {isEditingProfile ? (
            <form onSubmit={handleSaveProfile} className="flex-1 space-y-2">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Lead name"
                  required
                  className="px-2.5 py-1.5 rounded-lg bg-[#F5F5F7] border border-[#007AFF]/40 text-xs font-medium text-[#1D1D1F] focus:outline-none focus:bg-white focus:border-[#007AFF]"
                />
                <input
                  type="text"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  placeholder="Phone (e.g. 60123456789)"
                  className="px-2.5 py-1.5 rounded-lg bg-[#F5F5F7] border border-[#007AFF]/40 font-mono text-xs text-[#1D1D1F] focus:outline-none focus:bg-white focus:border-[#007AFF]"
                />
                <input
                  type="text"
                  value={editInterest}
                  onChange={(e) => setEditInterest(e.target.value)}
                  placeholder="Interest / model"
                  className="px-2.5 py-1.5 rounded-lg bg-[#F5F5F7] border border-[#007AFF]/40 text-xs text-[#1D1D1F] focus:outline-none focus:bg-white focus:border-[#007AFF]"
                />
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#007AFF] text-white text-xs font-medium hover:bg-[#0066D6] cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  Save Details
                </button>
                <button
                  type="button"
                  onClick={handleCancelProfileEdit}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#F5F5F7] text-[#6E6E73] text-xs font-medium hover:text-[#1D1D1F] cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold tracking-tight text-[#1D1D1F] truncate">
                  {lead.name}
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#007AFF]/10 text-[#007AFF] shrink-0">
                  {meta.label}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-3 mt-0.5 text-xs text-[#6E6E73]">
                <span className="inline-flex items-center gap-1 font-mono">
                  <Phone className="w-3 h-3" />
                  {lead.phone || 'No phone'}
                </span>
                <span className="truncate">• {lead.interest || 'No interest set'}</span>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {!isEditingProfile && (
            <button
              type="button"
              onClick={() => {
                setEditName(lead.name ?? '');
                setEditPhone(lead.phone ?? '');
                setEditInterest(lead.interest ?? '');
                setIsEditingProfile(true);
              }}
              title="Edit lead details"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium text-[#1D1D1F] bg-[#F5F5F7] hover:bg-black/10 transition-colors cursor-pointer"
            >
              <Pencil className="w-3.5 h-3.5" />
              <span>Edit</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => onDeleteLead(lead.id)}
            title="Delete lead"
            className="p-2 rounded-xl text-[#8E8E93] hover:text-[#FF3B30] hover:bg-[#FF3B30]/10 transition-colors cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
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
            value={lead.notes ?? ''}
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
            {(FOLLOW_UP_TEMPLATES ?? []).map((tpl, idx) => {
              const title = getTemplateTitle(tpl, idx);
              return (
                <button
                  key={tpl.id ?? title}
                  type="button"
                  onClick={() => {
                    setMessage(getTemplateText(tpl, lead));
                    setSelectedTemplateName(title);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors cursor-pointer ${
                    selectedTemplateName === title
                      ? 'bg-[#007AFF]/10 border-[#007AFF]/30 text-[#007AFF]'
                      : 'bg-white border-black/10 text-[#6E6E73] hover:text-[#1D1D1F]'
                  }`}
                >
                  {title}
                </button>
              );
            })}
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

          {/* Text Box + Plus Button for Photo/Video from PC */}
          <div className="flex items-start gap-2">
            <button
              type="button"
              onClick={handleOpenMediaPicker}
              title="Add photo or video from PC"
              aria-label="Add photo or video from PC"
              className="w-9 h-9 rounded-xl bg-white border border-black/10 hover:bg-[#F5F5F7] text-[#007AFF] flex items-center justify-center shrink-0 transition-colors cursor-pointer mt-0.5"
            >
              <Plus className="w-4 h-4" />
            </button>

            <input
              ref={mediaInputRef}
              type="file"
              accept="image/*,video/*"
              multiple
              onChange={handleMediaFileChange}
              className="hidden"
            />

            <textarea
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Write your WhatsApp follow-up message or click + to attach a photo/video..."
              className="flex-1 px-3.5 py-2.5 rounded-xl bg-white border border-black/10 text-xs leading-relaxed focus:outline-none focus:border-[#007AFF] transition-colors"
            />
          </div>

          {mediaError && (
            <p className="text-[11px] text-[#FF3B30]">{mediaError}</p>
          )}

          {/* Selected Photo / Video Previews */}
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {attachments.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-2 p-1.5 pr-2 rounded-xl bg-white border border-black/10"
                >
                  {item.type === 'image' ? (
                    <img
                      src={item.previewUrl}
                      alt={item.name}
                      className="w-10 h-10 rounded-lg object-cover bg-[#F5F5F7]"
                    />
                  ) : (
                    <video
                      src={item.previewUrl}
                      className="w-12 h-10 rounded-lg object-cover bg-black"
                      muted
                      playsInline
                    />
                  )}
                  <div className="min-w-0 max-w-[140px]">
                    <p className="text-[11px] font-medium text-[#1D1D1F] truncate flex items-center gap-1">
                      {item.type === 'image' ? (
                        <ImageIcon className="w-3 h-3 text-[#007AFF] shrink-0" />
                      ) : (
                        <FileVideo className="w-3 h-3 text-[#007AFF] shrink-0" />
                      )}
                      <span className="truncate">{item.name}</span>
                    </p>
                    <p className="text-[10px] text-[#6E6E73] tabular-nums">
                      {(item.sizeBytes / (1024 * 1024)).toFixed(1)} MB
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveAttachment(item.id)}
                    aria-label={`Remove ${item.name}`}
                    className="p-1 rounded-lg text-[#8E8E93] hover:text-[#FF3B30] hover:bg-[#FF3B30]/10 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

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
              disabled={isQuotaLocked || isSending || !composedMessage}
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
              {lead.history.map((item: any) => {
                const timestamp = item.sentAt || item.at;
                return (
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
                        {timestamp ? new Date(timestamp).toLocaleString() : ''}
                      </span>
                    </div>
                    <p className="text-xs text-[#1D1D1F] leading-relaxed">
                      {item.message}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
