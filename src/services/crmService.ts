import type {
  DesktopNotificationPermission,
  FollowUpTemplate,
  Lead,
  LeadHistoryItem,
  LeadReminderMeta,
  LeadStatus,
  ReminderCadence,
  SendQuotaStatus,
  SmartDraftOption,
  SmartViewId,
  WhatsAppSessionState,
} from '../types/crm';

const STORAGE_KEYS = {
  leads: 'goodshield_crm_leads_v1',
  passcode: 'goodshield_crm_passcode_v1',
  quotaHistory: 'goodshield_crm_quota_ts_v1',
  waSession: 'goodshield_crm_wa_session_v1',
  notifiedReminders: 'goodshield_crm_notified_v1',
  supabaseSession: 'goodshield_crm_sb_session_v1',
} as const;

const DEFAULT_PASSCODE = '2468';
const DAILY_SEND_LIMIT = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

export const FOLLOW_UP_TEMPLATES: FollowUpTemplate[] = [
  {
    id: 'day3_check_in',
    name: 'Day 3–4 Friendly Check-In',
    buildMessage: (lead) =>
      `Hi ${lead.name}, just following up on your interest in ${lead.interest}. Let me know if you have any questions or would like to see options!`,
  },
  {
    id: 'slot_availability',
    name: 'Quick Availability & Next Step',
    buildMessage: (lead) =>
      `Hi ${lead.name}, checking in regarding ${lead.interest}. I have a couple of quick slots open this week if you'd like to chat or lock things in.`,
  },
  {
    id: 'polite_wrap',
    name: 'Low-Pressure Follow-Up',
    buildMessage: (lead) =>
      `Hi ${lead.name}, hope your week is going well! Sharing a quick follow-up on ${lead.interest}—no rush at all, just here whenever you're ready.`,
  },
];

function safeGetItem(key: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSetItem(key: string, value: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

function safeRemoveItem(key: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Ignore storage access restrictions
  }
}

export function normalizePhoneDigits(phone: string): string {
  return (phone || '').replace(/\D/g, '');
}

export function computeNextReminderDate(
  days: ReminderCadence,
  fromDate: Date = new Date()
): string | null {
  if (!days || days <= 0) return null;
  const next = new Date(fromDate.getTime() + days * DAY_MS);
  return next.toISOString();
}

export function getLeadReminderMeta(lead: Lead): LeadReminderMeta {
  if (lead.status === 'Closed') {
    return {
      bucket: 'closed',
      label: 'Closed',
      sortPriority: 5,
      isDueNow: false,
    };
  }

  if (lead.status === 'Replied') {
    return {
      bucket: 'replied',
      label: 'Replied',
      sortPriority: 4,
      isDueNow: false,
    };
  }

  if (!lead.nextReminderAt) {
    return {
      bucket: 'upcoming',
      label: 'No reminder',
      sortPriority: 3,
      isDueNow: false,
    };
  }

  const targetMs = new Date(lead.nextReminderAt).getTime();
  if (Number.isNaN(targetMs)) {
    return {
      bucket: 'upcoming',
      label: 'Scheduled',
      sortPriority: 3,
      isDueNow: false,
    };
  }

  const now = new Date();
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  ).getTime();
  const endOfToday = startOfToday + DAY_MS - 1;

  if (targetMs < startOfToday) {
    const daysOverdue = Math.max(
      1,
      Math.floor((startOfToday - targetMs) / DAY_MS)
    );
    return {
      bucket: 'overdue',
      label: `${daysOverdue}d overdue`,
      sortPriority: 1,
      isDueNow: true,
    };
  }

  if (targetMs <= endOfToday) {
    return {
      bucket: 'due_today',
      label: 'Due today',
      sortPriority: 0,
      isDueNow: true,
    };
  }

  const daysUntil = Math.max(
    1,
    Math.ceil((targetMs - endOfToday) / DAY_MS)
  );
  return {
    bucket: 'upcoming',
    label: `In ${daysUntil}d`,
    sortPriority: 2,
    isDueNow: false,
  };
}

export function matchesSmartView(lead: Lead, view: SmartViewId): boolean {
  if (view === 'all') return true;
  const meta = getLeadReminderMeta(lead);
  switch (view) {
    case 'due_today':
      return meta.bucket === 'due_today';
    case 'overdue':
      return meta.bucket === 'overdue';
    case 'upcoming':
      return meta.bucket === 'upcoming';
    case 'replied':
      return meta.bucket === 'replied';
    case 'closed':
      return meta.bucket === 'closed';
    default:
      return true;
  }
}

export function getSampleLeads(): Lead[] {
  const now = Date.now();
  const isoAgo = (days: number) => new Date(now - days * DAY_MS).toISOString();
  const isoAhead = (days: number) => new Date(now + days * DAY_MS).toISOString();

  return [
    {
      id: 'sample_1',
      name: 'Aiman Hakim',
      phone: '+60123456789',
      interest: 'Full Protection Package',
      status: 'Contacted',
      reminderDays: 3,
      lastContactedAt: isoAgo(3),
      nextReminderAt: new Date(now - 3600_000).toISOString(),
      notes: 'Requested comparison details and weekend availability.',
      history: [
        {
          id: 'h_1',
          sentAt: isoAgo(3),
          channel: 'wa_me',
          templateName: 'Initial Quote',
          message: 'Hi Aiman, sharing the full package breakdown as requested.',
        },
      ],
      createdAt: isoAgo(3),
    },
    {
      id: 'sample_2',
      name: 'Nurul Huda',
      phone: '+60198765432',
      interest: 'Monthly Plan Inquiry',
      status: 'New',
      reminderDays: 4,
      lastContactedAt: isoAgo(4),
      nextReminderAt: isoAhead(1),
      notes: 'Asked about flexible billing and setup timeline.',
      history: [],
      createdAt: isoAgo(4),
    },
    {
      id: 'sample_3',
      name: 'Daniel Tan',
      phone: '+60162223344',
      interest: 'Priority Upgrade',
      status: 'Replied',
      reminderDays: 3,
      lastContactedAt: isoAgo(2),
      nextReminderAt: isoAhead(2),
      notes: 'Replied positively; awaiting final confirmation.',
      history: [],
      createdAt: isoAgo(5),
    },
  ];
}

export function loadLeads(): Lead[] {
  const raw = safeGetItem(STORAGE_KEYS.leads);
  if (!raw) {
    const samples = getSampleLeads();
    saveLeads(samples);
    return samples;
  }

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return getSampleLeads();
    return parsed as Lead[];
  } catch {
    return getSampleLeads();
  }
}

export function saveLeads(leads: Lead[]): void {
  safeSetItem(STORAGE_KEYS.leads, JSON.stringify(leads));
}

export function restoreSampleLeads(): Lead[] {
  const samples = getSampleLeads();
  saveLeads(samples);
  return samples;
}

export function getStoredPasscode(): string {
  const saved = safeGetItem(STORAGE_KEYS.passcode);
  if (saved && /^\d{4}$/.test(saved)) {
    return saved;
  }
  return DEFAULT_PASSCODE;
}

export function setStoredPasscode(code: string): boolean {
  if (!/^\d{4}$/.test(code)) return false;
  return safeSetItem(STORAGE_KEYS.passcode, code);
}

export function resetStoredPasscodeToDefault(): string {
  safeSetItem(STORAGE_KEYS.passcode, DEFAULT_PASSCODE);
  return DEFAULT_PASSCODE;
}

function getQuotaTimestamps(): number[] {
  const raw = safeGetItem(STORAGE_KEYS.quotaHistory);
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    const cutoff = Date.now() - DAY_MS;
    return arr
      .map((n) => Number(n))
      .filter((ts) => Number.isFinite(ts) && ts > cutoff);
  } catch {
    return [];
  }
}

function recordQuotaSend(): number[] {
  const active = getQuotaTimestamps();
  const updated = [...active, Date.now()];
  safeSetItem(STORAGE_KEYS.quotaHistory, JSON.stringify(updated));
  return updated;
}

export function getQuotaStatus(): SendQuotaStatus {
  const active = getQuotaTimestamps();
  const sentIn24h = active.length;
  const remaining = Math.max(0, DAILY_SEND_LIMIT - sentIn24h);
  const isLocked = sentIn24h >= DAILY_SEND_LIMIT;
  const oldestTs = active.length > 0 ? Math.min(...active) : null;
  const nextUnlockAt =
    isLocked && oldestTs ? new Date(oldestTs + DAY_MS).toISOString() : null;

  return {
    limit: DAILY_SEND_LIMIT,
    sentIn24h,
    remaining,
    isLocked,
    nextUnlockAt,
  };
}

export function getDesktopNotificationPermission(): DesktopNotificationPermission {
  if (typeof window === 'undefined' || typeof Notification === 'undefined') {
    return 'unsupported';
  }
  return Notification.permission;
}

export function getDueLeadsForNotification(leads: Lead[]): Lead[] {
  const nowMs = Date.now();
  return leads.filter((lead) => {
    if (lead.status === 'Closed' || lead.status === 'Replied') return false;
    if (!lead.nextReminderAt) return false;
    const dueMs = new Date(lead.nextReminderAt).getTime();
    return !Number.isNaN(dueMs) && dueMs <= nowMs;
  });
}

function getNotifiedMap(): Record<string, string> {
  const raw = safeGetItem(STORAGE_KEYS.notifiedReminders);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function hasLeadReminderBeenNotified(
  leadId: string,
  reminderAt: string
): boolean {
  const map = getNotifiedMap();
  return map[leadId] === reminderAt;
}

export function markLeadReminderNotified(leadId: string, reminderAt: string): void {
  const map = getNotifiedMap();
  map[leadId] = reminderAt;
  safeSetItem(STORAGE_KEYS.notifiedReminders, JSON.stringify(map));
}

export async function fetchWhatsAppSession(): Promise<WhatsAppSessionState> {
  const raw = safeGetItem(STORAGE_KEYS.waSession);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as WhatsAppSessionState;
      if (parsed && (parsed.status === 'qr' || parsed.status === 'connected')) {
        return parsed;
      }
    } catch {
      // Fall through to default
    }
  }
  return {
    status: 'qr',
    qrValue: `goodshield-session-${Date.now().toString(36)}`,
    updatedAt: new Date().toISOString(),
  };
}

export async function updateWhatsAppSession(
  action: 'refresh' | 'pair' | 'disconnect'
): Promise<WhatsAppSessionState> {
  const nowIso = new Date().toISOString();
  let next: WhatsAppSessionState;

  if (action === 'pair') {
    next = {
      status: 'connected',
      pairedAt: nowIso,
      updatedAt: nowIso,
    };
  } else {
    next = {
      status: 'qr',
      qrValue: `goodshield-session-${Date.now().toString(36)}`,
      updatedAt: nowIso,
    };
  }

  safeSetItem(STORAGE_KEYS.waSession, JSON.stringify(next));
  return next;
}

export function buildWhatsAppMeUrl(phone: string, message: string): string {
  const digits = normalizePhoneDigits(phone);
  const encodedText = encodeURIComponent(message.trim());
  return digits
    ? `https://wa.me/${digits}?text=${encodedText}`
    : `https://wa.me/?text=${encodedText}`;
}

export async function sendWhatsAppFollowUp(
  lead: Lead,
  message: string,
  options: { templateName?: string; isQrConnected?: boolean } = {}
): Promise<{
  updatedLead: Lead;
  quota: SendQuotaStatus;
  waMeUrl: string;
  channel: 'qr_session' | 'wa_me';
}> {
  const cleanMessage = message.trim();
  if (!cleanMessage) {
    throw new Error('Message cannot be empty.');
  }

  const currentQuota = getQuotaStatus();
  if (currentQuota.isLocked) {
    throw new Error('Daily 24-hour send limit (30/30) reached.');
  }

  recordQuotaSend();
  const updatedQuota = getQuotaStatus();

  const waMeUrl = buildWhatsAppMeUrl(lead.phone, cleanMessage);
  const channel: 'qr_session' | 'wa_me' = options.isQrConnected
    ? 'qr_session'
    : 'wa_me';

  const now = new Date();
  const nextDays: ReminderCadence =
    lead.reminderDays && lead.reminderDays > 0 ? lead.reminderDays : 3;

  const historyEntry: LeadHistoryItem = {
    id: `hist_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    sentAt: now.toISOString(),
    channel,
    templateName: options.templateName,
    message: cleanMessage,
  };

  const nextStatus: LeadStatus =
    lead.status === 'New' ? 'Contacted' : lead.status;

  const updatedLead: Lead = {
    ...lead,
    status: nextStatus,
    reminderDays: nextDays,
    lastContactedAt: now.toISOString(),
    nextReminderAt: computeNextReminderDate(nextDays, now),
    history: [historyEntry, ...(lead.history || [])],
  };

  if (channel === 'wa_me' && typeof window !== 'undefined') {
    try {
      window.open(waMeUrl, '_blank', 'noopener,noreferrer');
    } catch {
      // Fallback button in toast still provides waMeUrl
    }
  }

  return {
    updatedLead,
    quota: updatedQuota,
    waMeUrl,
    channel,
  };
}

export async function generateSmartDrafts(lead: Lead): Promise<SmartDraftOption[]> {
  const interest = lead.interest || 'your inquiry';
  const noteHint = lead.notes?.trim()
    ? ` based on your note (${lead.notes.trim().slice(0, 60)})`
    : '';

  return [
    {
      id: 'draft_warm',
      label: 'Warm Check-In',
      message: `Hi ${lead.name}, just checking in on ${interest}${noteHint}. Happy to answer any questions whenever you have a moment!`,
    },
    {
      id: 'draft_direct',
      label: 'Direct Next Step',
      message: `Hi ${lead.name}, following up on ${interest}. Would a quick call or message today work best to confirm your next step?`,
    },
    {
      id: 'draft_value',
      label: 'Helpful Summary',
      message: `Hi ${lead.name}, circling back on ${interest}. Let me know if you'd like a clear breakdown of options, pricing, or timing.`,
    },
  ];
}

function getSupabaseConfig(): { url: string; anonKey: string } | null {
  const env = (import.meta as unknown as { env?: Record<string, string> }).env;
  const url = env?.VITE_SUPABASE_URL?.trim();
  const anonKey = env?.VITE_SUPABASE_ANON_KEY?.trim();
  if (!url || !anonKey) return null;
  return { url: url.replace(/\/+$/, ''), anonKey };
}

export function isCloudSyncConfigured(): boolean {
  return Boolean(getSupabaseConfig());
}

export function clearSupabaseAuthSession(): void {
  safeRemoveItem(STORAGE_KEYS.supabaseSession);
}

export async function signInWithSupabase(
  email: string,
  password: string
): Promise<{ ok: boolean; message?: string; requiresEmailConfirmation?: boolean }> {
  const cfg = getSupabaseConfig();
  if (!cfg) {
    return {
      ok: false,
      message: 'Cloud account sign-in is not configured on this static build. Use Passcode Lock.',
    };
  }

  try {
    const res = await fetch(`${cfg.url}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: cfg.anonKey,
      },
      body: JSON.stringify({ email: email.trim(), password }),
    });
    const data = await res.json();
    if (!res.ok) {
      return {
        ok: false,
        message: data?.error_description || data?.msg || 'Sign in failed.',
      };
    }
    safeSetItem(STORAGE_KEYS.supabaseSession, JSON.stringify(data));
    return { ok: true };
  } catch {
    return { ok: false, message: 'Network error while signing in.' };
  }
}

export async function signUpWithSupabase(
  email: string,
  password: string
): Promise<{ ok: boolean; message?: string; requiresEmailConfirmation?: boolean }> {
  const cfg = getSupabaseConfig();
  if (!cfg) {
    return {
      ok: false,
      message: 'Cloud account sign-up is not configured on this static build. Use Passcode Lock.',
    };
  }

  try {
    const res = await fetch(`${cfg.url}/auth/v1/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: cfg.anonKey,
      },
      body: JSON.stringify({ email: email.trim(), password }),
    });
    const data = await res.json();
    if (!res.ok) {
      return {
        ok: false,
        message: data?.error_description || data?.msg || 'Could not create account.',
      };
    }
    if (data?.session) {
      safeSetItem(STORAGE_KEYS.supabaseSession, JSON.stringify(data.session));
      return { ok: true };
    }
    return {
      ok: true,
      requiresEmailConfirmation: true,
      message: 'Account created. Check your inbox to confirm your email.',
    };
  } catch {
    return { ok: false, message: 'Network error while creating account.' };
  }
}

export async function sendSupabasePasswordReset(
  email: string
): Promise<{ ok: boolean; message?: string }> {
  const cfg = getSupabaseConfig();
  if (!cfg) {
    return {
      ok: false,
      message: 'Supabase auth is not configured; reset your 4-digit passcode under Passcode Lock instead.',
    };
  }

  try {
    const redirectTo =
      typeof window !== 'undefined'
        ? `${window.location.origin}${window.location.pathname}`
        : undefined;
    const res = await fetch(`${cfg.url}/auth/v1/recover`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: cfg.anonKey,
      },
      body: JSON.stringify({ email: email.trim(), redirect_to: redirectTo }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return {
        ok: false,
        message: data?.error_description || data?.msg || 'Could not send reset email.',
      };
    }
    return {
      ok: true,
      message: 'Password reset link sent. Check your email inbox.',
    };
  } catch {
    return { ok: false, message: 'Network error while sending reset link.' };
  }
}

export async function updateSupabasePassword(
  accessToken: string,
  newPassword: string
): Promise<{ ok: boolean; message?: string }> {
  const cfg = getSupabaseConfig();
  if (!cfg) {
    return {
      ok: false,
      message: 'Supabase auth is not configured on this static build.',
    };
  }

  try {
    const res = await fetch(`${cfg.url}/auth/v1/user`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        apikey: cfg.anonKey,
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ password: newPassword }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        ok: false,
        message: data?.error_description || data?.msg || 'Could not update password.',
      };
    }
    return {
      ok: true,
      message: 'Password updated. Sign in with your new password.',
    };
  } catch {
    return { ok: false, message: 'Network error while updating password.' };
  }
}
