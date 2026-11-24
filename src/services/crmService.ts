import { supabase } from '../lib/supabase';
import type { Session } from '@supabase/supabase-js';
import type {
  DesktopNotificationPermission,
  FollowUpTemplate,
  Lead,
  LeadStatus,
  ReminderCadence,
  SendQuotaStatus,
  SmartViewId,
  WhatsAppSessionState,
} from '../types/crm';

const LEADS_KEY = 'goodshield_crm_leads_v2';
const SENT_LOG_KEY = 'goodshield_crm_sent_log_v1';
const WA_SESSION_KEY = 'goodshield_crm_wa_session_v1';
const NOTIFIED_KEY = 'goodshield_crm_notified_v1';
const PASSCODE_KEY = 'goodshield_crm_passcode_v1';
const DEFAULT_PASSCODE = '1234';

const DAY_MS = 24 * 60 * 60 * 1000;
export const DAILY_SEND_LIMIT = 45;
export const DAILY_QUOTA_LIMIT = DAILY_SEND_LIMIT;

/* ------------------------------------------------------------------ */
/* Storage & Passcode helpers                                          */
/* ------------------------------------------------------------------ */

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore storage errors
  }
}

export function getStoredPasscode(): string | null {
  try {
    return localStorage.getItem(PASSCODE_KEY);
  } catch {
    return null;
  }
}

export function setStoredPasscode(passcode: string | null): void {
  try {
    if (passcode && passcode.trim().length > 0) {
      localStorage.setItem(PASSCODE_KEY, passcode.trim());
    } else {
      localStorage.removeItem(PASSCODE_KEY);
    }
  } catch {
    // ignore storage errors
  }
}

export function resetStoredPasscodeToDefault(): string {
  setStoredPasscode(DEFAULT_PASSCODE);
  return DEFAULT_PASSCODE;
}

/* ------------------------------------------------------------------ */
/* Templates                                                           */
/* ------------------------------------------------------------------ */

function firstName(lead: Lead): string {
  return lead.name?.trim().split(/\s+/)[0] || 'there';
}

export const FOLLOW_UP_TEMPLATES: FollowUpTemplate[] = [
  {
    id: 'tpl-gentle-check',
    name: 'Gentle Follow-Up',
    description: 'Friendly check-in after 3–4 days',
    buildMessage: (lead) =>
      `Hi ${firstName(lead)}, just checking in on ${lead.interest || 'your inquiry'}. Did you have any questions about the details or availability I shared earlier?`,
  },
  {
    id: 'tpl-value-tip',
    name: 'Helpful Tip',
    description: 'Share a quick tip and offer a quote',
    buildMessage: (lead) =>
      `Hi ${firstName(lead)}, sharing a quick tip for ${lead.interest || 'your inquiry'}: planning ahead early helps avoid last-minute delays. Let me know if you would like a quick comparison or quote.`,
  },
  {
    id: 'tpl-slot-check',
    name: 'Availability & Next Step',
    description: 'Offer a time slot for a chat',
    buildMessage: (lead) =>
      `Hi ${firstName(lead)}, I have a couple of follow-up slots open this week if you are still considering ${lead.interest || 'your inquiry'}. Would morning or afternoon work better for a quick chat?`,
  },
];

export function generateSmartDrafts(lead: Lead) {
  return FOLLOW_UP_TEMPLATES.map((tpl) => {
    const text = tpl.buildMessage(lead);
    return {
      id: tpl.id,
      label: tpl.name,
      title: tpl.name,
      name: tpl.name,
      text,
      body: text,
      message: text,
      content: text,
    };
  });
}

/* ------------------------------------------------------------------ */
/* Normalization & Schema Mapping                                      */
/* ------------------------------------------------------------------ */

export function normalizeLeadStatus(raw: unknown): LeadStatus {
  const val = String(raw ?? 'new').trim().toLowerCase();
  if (val === 'contacted') return 'Contacted';
  if (val === 'replied') return 'Replied';
  if (val === 'closed') return 'Closed';
  return 'New';
}

export function daysToSqlCadence(days: ReminderCadence | number | undefined): string {
  const d = Number(days ?? 3);
  if (!d || d <= 0) return 'off';
  if (d === 2) return 'every_2_days';
  if (d === 4) return 'every_4_days';
  if (d === 7) return 'every_7_days';
  return 'every_3_days';
}

export function sqlCadenceToReminderDays(cadence: unknown): ReminderCadence {
  const val = String(cadence ?? '').trim().toLowerCase();
  if (val === 'off' || val === '0' || val === 'none') return 0;
  if (val === 'every_2_days' || val === '2') return 2;
  if (val === 'every_4_days' || val === '4') return 4;
  if (val === 'every_7_days' || val === '7') return 7;
  return 3;
}

export function computeNextReminderDate(
  days: ReminderCadence,
  fromDate: Date = new Date()
): string | null {
  if (!days || days <= 0) return null;
  return new Date(fromDate.getTime() + days * DAY_MS).toISOString();
}

export function computeNextFollowUpIso(
  days: ReminderCadence | number | undefined,
  fromIso?: string
): string {
  const d = Number(days ?? 3);
  const baseMs = fromIso ? new Date(fromIso).getTime() : Date.now();
  const safeBase = Number.isFinite(baseMs) ? baseMs : Date.now();
  const effectiveDays = d > 0 ? d : 3;
  return new Date(safeBase + effectiveDays * DAY_MS).toISOString();
}

/* ------------------------------------------------------------------ */
/* Leads & Supabase Sync                                               */
/* ------------------------------------------------------------------ */

function buildSampleLeads(): Lead[] {
  const now = new Date();
  const make = (
    id: string,
    name: string,
    phone: string,
    interest: string,
    days: ReminderCadence,
    offsetDays: number
  ): Lead => ({
    id,
    name,
    phone,
    interest,
    status: 'New',
    reminderDays: days,
    lastContactedAt: null,
    nextReminderAt: new Date(now.getTime() + offsetDays * DAY_MS).toISOString(),
    notes: '',
    history: [],
    createdAt: now.toISOString(),
  });

  return [
    make('sample_1', 'Sarah Lim', '+60123456789', 'Window tint package', 3, 0),
    make('sample_2', 'Ahmad Faiz', '+60129876543', 'SUV tint promo', 4, -1),
    make('sample_3', 'Daniel Tan', '+60111222333', 'Full protection bundle', 7, 2),
  ];
}

export function loadLeads(): Lead[] {
  const stored = readJson<Lead[] | null>(LEADS_KEY, null);
  if (Array.isArray(stored)) return stored;
  return [];
}

export function saveLeads(leads: Lead[]): void {
  writeJson(LEADS_KEY, leads);
}

export function loadCachedLeads(): Lead[] {
  return loadLeads();
}

export function saveCachedLeads(leads: Lead[]): void {
  saveLeads(leads);
}

export function restoreSampleLeads(): Lead[] {
  const samples = buildSampleLeads();
  saveLeads(samples);
  return samples;
}

export async function fetchLeadsFromSupabase(userId?: string): Promise<Lead[]> {
  const client = supabase;
  if (!client) return loadLeads();

  let activeUserId = userId;
  if (!activeUserId) {
    const { data: sessionData } = await client.auth.getSession();
    activeUserId = sessionData.session?.user?.id;
  }
  if (!activeUserId) return loadLeads();

  const { data, error } = await client
    .from('leads')
    .select(
      'id, user_id, name, phone, vehicle_model, notes, status, cadence, next_follow_up_at, created_at, updated_at'
    )
    .eq('user_id', activeUserId)
    .order('next_follow_up_at', { ascending: true });

  if (error) {
    console.warn('Supabase fetchLeadsFromSupabase warning:', error.message);
    return loadLeads();
  }

  const localById = new Map(loadLeads().map((item) => [item.id, item]));
  const mapped: Lead[] = (data ?? []).map((row: any) => {
    const local = localById.get(String(row.id));
    return {
      id: String(row.id),
      name: String(row.name ?? local?.name ?? 'Unnamed Lead'),
      phone: String(row.phone ?? local?.phone ?? ''),
      interest: String(row.vehicle_model ?? local?.interest ?? ''),
      notes: String(row.notes ?? local?.notes ?? ''),
      status: normalizeLeadStatus(row.status),
      reminderDays: sqlCadenceToReminderDays(row.cadence),
      lastContactedAt: local?.lastContactedAt ?? null,
      nextReminderAt: row.next_follow_up_at ?? local?.nextReminderAt ?? null,
      history: local?.history ?? [],
      createdAt: row.created_at ?? local?.createdAt ?? new Date().toISOString(),
    };
  });

  saveLeads(mapped);
  return mapped;
}

export async function fetchUserLeadsFromSupabase(userId?: string): Promise<Lead[]> {
  return fetchLeadsFromSupabase(userId);
}

export async function upsertLeadInSupabase(lead: Lead, userId?: string): Promise<Lead> {
  const client = supabase;
  if (!client) return lead;

  let activeUserId = userId;
  if (!activeUserId) {
    const { data: sessionData } = await client.auth.getSession();
    activeUserId = sessionData.session?.user?.id;
  }
  if (!activeUserId) return lead;

  const { error } = await client.from('leads').upsert(
    {
      id: lead.id,
      user_id: activeUserId,
      name: lead.name,
      phone: lead.phone || null,
      vehicle_model: lead.interest || null,
      notes: lead.notes || null,
      status: String(lead.status || 'new').toLowerCase(),
      cadence: daysToSqlCadence(lead.reminderDays),
      next_follow_up_at: lead.nextReminderAt || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' }
  );

  if (error) {
    console.warn('Supabase upsertLeadInSupabase warning:', error.message);
  }

  return lead;
}

export async function updateLead(updatedLead: Lead): Promise<Lead> {
  const existing = loadLeads();
  const exists = existing.some((item) => item.id === updatedLead.id);
  const nextLeads = exists
    ? existing.map((item) => (item.id === updatedLead.id ? updatedLead : item))
    : [updatedLead, ...existing];

  saveLeads(nextLeads);
  await upsertLeadInSupabase(updatedLead);
  return updatedLead;
}

export async function deleteLeadInSupabase(leadId: string, userId?: string): Promise<void> {
  const client = supabase;
  if (!client) return;

  let activeUserId = userId;
  if (!activeUserId) {
    const { data: sessionData } = await client.auth.getSession();
    activeUserId = sessionData.session?.user?.id;
  }

  let query = client.from('leads').delete().eq('id', leadId);
  if (activeUserId) {
    query = query.eq('user_id', activeUserId);
  }

  const { error } = await query;
  if (error) {
    console.warn('Supabase deleteLeadInSupabase warning:', error.message);
  }
}

export async function deleteLead(leadId: string): Promise<void> {
  const filtered = loadLeads().filter((item) => item.id !== leadId);
  saveLeads(filtered);
  await deleteLeadInSupabase(leadId);
}

/* ------------------------------------------------------------------ */
/* Reminder buckets                                                    */
/* ------------------------------------------------------------------ */

export function getLeadReminderMeta(lead: Lead): {
  bucket: SmartViewId;
  label: string;
  isDueToday: boolean;
  isOverdue: boolean;
  sortPriority: number;
} {
  if (lead.status === 'Closed') {
    return { bucket: 'closed', label: 'Closed', isDueToday: false, isOverdue: false, sortPriority: 5 };
  }
  if (lead.status === 'Replied') {
    return { bucket: 'replied', label: 'Replied', isDueToday: false, isOverdue: false, sortPriority: 4 };
  }
  if (!lead.nextReminderAt) {
    return { bucket: 'upcoming', label: 'No reminder', isDueToday: false, isOverdue: false, sortPriority: 3 };
  }

  const followUp = new Date(lead.nextReminderAt);
  if (Number.isNaN(followUp.getTime())) {
    return { bucket: 'upcoming', label: 'Scheduled', isDueToday: false, isOverdue: false, sortPriority: 3 };
  }

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  if (followUp < startOfToday) {
    return { bucket: 'overdue', label: 'Overdue', isDueToday: false, isOverdue: true, sortPriority: 0 };
  }
  if (followUp <= endOfToday) {
    return { bucket: 'due_today', label: 'Due Today', isDueToday: true, isOverdue: false, sortPriority: 1 };
  }
  return { bucket: 'upcoming', label: 'Upcoming', isDueToday: false, isOverdue: false, sortPriority: 2 };
}

export function matchesSmartView(lead: Lead, view: SmartViewId): boolean {
  if (view === 'all') return true;
  if (view === 'closed') return lead.status === 'Closed';
  if (view === 'replied') return lead.status === 'Replied';
  if (lead.status === 'Closed' || lead.status === 'Replied') return false;
  return getLeadReminderMeta(lead).bucket === view;
}

/* ------------------------------------------------------------------ */
/* WhatsApp sending + quota                                            */
/* ------------------------------------------------------------------ */

export function sanitizePhoneForWhatsApp(
  phone?: string,
  defaultCountryCode = '60'
): string {
  if (!phone) return '';
  let digits = phone.replace(/[^\d]/g, '');
  if (digits.startsWith('0') && defaultCountryCode) {
    digits = `${defaultCountryCode}${digits.slice(1)}`;
  }
  return digits;
}

export function buildWhatsAppMeUrl(phone: string | undefined, message: string): string {
  const clean = sanitizePhoneForWhatsApp(phone);
  const cleanMessage = (message ?? '').replace(/\r\n/g, '\n').trim();
  const text = encodeURIComponent(cleanMessage);
  return clean
    ? `https://api.whatsapp.com/send?phone=${clean}&text=${text}`
    : `https://api.whatsapp.com/send?text=${text}`;
}

function readSentLog(): number[] {
  const cutoff = Date.now() - DAY_MS;
  return readJson<number[]>(SENT_LOG_KEY, []).filter((t) => t > cutoff);
}

export function getQuotaStatus(): SendQuotaStatus {
  const sent = readSentLog().length;
  const remaining = Math.max(0, DAILY_SEND_LIMIT - sent);
  return {
    sentIn24h: sent,
    limit: DAILY_SEND_LIMIT,
    remaining,
    isLocked: remaining === 0,
  };
}

export function getSentCountLast24h(): number {
  return readSentLog().length;
}

export function recordSentTimestamp(): void {
  writeJson(SENT_LOG_KEY, [...readSentLog(), Date.now()]);
}

export async function sendWhatsAppFollowUp(
  lead: Lead,
  message: string,
  options?: { templateName?: string; isQrConnected?: boolean }
): Promise<{ updatedLead: Lead; quota: SendQuotaStatus; waMeUrl: string }> {
  const current = getQuotaStatus();
  if (current.isLocked) {
    throw new Error('Daily WhatsApp send limit reached.');
  }

  const finalMessage =
    message?.trim() || FOLLOW_UP_TEMPLATES[0].buildMessage(lead);

  const now = new Date();
  writeJson(SENT_LOG_KEY, [...readSentLog(), now.getTime()]);

  const updatedLead: Lead = {
    ...lead,
    status: lead.status === 'Replied' || lead.status === 'Closed' ? lead.status : 'Contacted',
    lastContactedAt: now.toISOString(),
    nextReminderAt: computeNextReminderDate(lead.reminderDays, now),
    history: [
      ...lead.history,
      {
        id: `h_${now.getTime()}_${Math.random().toString(36).slice(2, 6)}`,
        type: 'whatsapp_sent',
        message: finalMessage,
        templateName: options?.templateName,
        at: now.toISOString(),
      },
    ],
  };

  const waMeUrl = buildWhatsAppMeUrl(lead.phone, finalMessage);
  if (typeof window !== 'undefined') {
    window.open(waMeUrl, '_blank', 'noopener,noreferrer');
  }

  return { updatedLead, quota: getQuotaStatus(), waMeUrl };
}

/* ------------------------------------------------------------------ */
/* WhatsApp session (local simulation)                                 */
/* ------------------------------------------------------------------ */

export async function fetchWhatsAppSession(): Promise<WhatsAppSessionState> {
  return readJson<WhatsAppSessionState>(WA_SESSION_KEY, { status: 'qr' });
}

export async function updateWhatsAppSession(
  action: 'refresh' | 'pair' | 'disconnect'
): Promise<WhatsAppSessionState> {
  const nowIso = new Date().toISOString();
  let next: WhatsAppSessionState;

  if (action === 'pair') {
    next = { status: 'connected', pairedAt: nowIso, updatedAt: nowIso };
  } else if (action === 'disconnect') {
    next = { status: 'disconnected', updatedAt: nowIso };
  } else {
    next = { status: 'qr', qrCode: `refresh-${Date.now()}`, updatedAt: nowIso };
  }

  writeJson(WA_SESSION_KEY, next);
  return next;
}

/* ------------------------------------------------------------------ */
/* Desktop notifications                                               */
/* ------------------------------------------------------------------ */

export function getDesktopNotificationPermission(): DesktopNotificationPermission {
  if (typeof window === 'undefined' || typeof Notification === 'undefined') {
    return 'unsupported';
  }
  return Notification.permission;
}

export function getDueLeadsForNotification(leads: Lead[]): Lead[] {
  const now = Date.now();
  return leads.filter((lead) => {
    if (lead.status === 'Closed' || lead.status === 'Replied') return false;
    if (!lead.nextReminderAt) return false;
    const t = new Date(lead.nextReminderAt).getTime();
    return !Number.isNaN(t) && t <= now;
  });
}

function notifiedKey(leadId: string, reminderAt: string): string {
  return `${leadId}::${reminderAt}`;
}

export function hasLeadReminderBeenNotified(leadId: string, reminderAt: string): boolean {
  return readJson<string[]>(NOTIFIED_KEY, []).includes(notifiedKey(leadId, reminderAt));
}

export function markLeadReminderNotified(leadId: string, reminderAt: string): void {
  const list = readJson<string[]>(NOTIFIED_KEY, []);
  const key = notifiedKey(leadId, reminderAt);
  if (!list.includes(key)) {
    writeJson(NOTIFIED_KEY, [...list.slice(-200), key]);
  }
}

/* ------------------------------------------------------------------ */
/* Supabase auth                                                       */
/* ------------------------------------------------------------------ */

export function isCloudSyncConfigured(): boolean {
  return Boolean(supabase);
}

type AuthResult = { ok: boolean; message: string };

const SITE_URL_FALLBACK = 'https://hanshir8.github.io/hanz-crm/';

function getRedirectUrl(): string {
  if (typeof window === 'undefined') return SITE_URL_FALLBACK;
  return `${window.location.origin}${import.meta.env.BASE_URL}`;
}

export async function signInWithSupabase(email: string, password: string): Promise<AuthResult> {
  const client = supabase;
  if (!client) return { ok: false, message: 'Cloud sync is not configured.' };

  const { error } = await client.auth.signInWithPassword({
    email: email.trim(),
    password,
  });
  if (error) return { ok: false, message: error.message };
  return { ok: true, message: 'Signed in.' };
}

export async function signUpWithSupabase(
  email: string,
  password: string
): Promise<AuthResult & { requiresEmailConfirmation: boolean }> {
  const client = supabase;
  if (!client) {
    return { ok: false, message: 'Cloud sync is not configured.', requiresEmailConfirmation: false };
  }

  const { data, error } = await client.auth.signUp({
    email: email.trim(),
    password,
    options: { emailRedirectTo: getRedirectUrl() },
  });
  if (error) return { ok: false, message: error.message, requiresEmailConfirmation: false };

  const requiresEmailConfirmation = !data.session;
  return {
    ok: true,
    requiresEmailConfirmation,
    message: requiresEmailConfirmation
      ? 'Account created. Check your email to confirm, then sign in.'
      : 'Account created.',
  };
}

export async function sendSupabasePasswordReset(email: string): Promise<AuthResult> {
  const trimmedEmail = email.trim();
  if (!trimmedEmail) {
    return { ok: false, message: 'Please enter your email address first.' };
  }
  const client = supabase;
  if (!client) return { ok: false, message: 'Cloud sync is not configured.' };

  const { error } = await client.auth.resetPasswordForEmail(trimmedEmail, {
    redirectTo: getRedirectUrl(),
  });
  if (error) return { ok: false, message: error.message };

  return { ok: true, message: `Password reset email sent to ${trimmedEmail}.` };
}

export async function updateSupabasePassword(newPassword: string): Promise<AuthResult> {
  const client = supabase;
  if (!client) return { ok: false, message: 'Cloud sync is not configured.' };

  const { error } = await client.auth.updateUser({ password: newPassword });
  if (error) return { ok: false, message: error.message };
  return { ok: true, message: 'Password updated. Please sign in.' };
}

export async function getSupabaseSession() {
  const client = supabase;
  if (!client) return null;
  const { data } = await client.auth.getSession();
  return data.session;
}

export async function getActiveSession(): Promise<Session | null> {
  return getSupabaseSession();
}

export async function clearSupabaseAuthSession(): Promise<void> {
  const client = supabase;
  if (!client) return;
  await client.auth.signOut();
}

export function onSupabasePasswordRecovery(callback: () => void): () => void {
  const client = supabase;
  if (!client) return () => {};
  const { data } = client.auth.onAuthStateChange((event) => {
    if (event === 'PASSWORD_RECOVERY') callback();
  });
  return () => data.subscription.unsubscribe();
}
