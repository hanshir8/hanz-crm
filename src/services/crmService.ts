import { supabase } from '../lib/supabase';
import type {
  FollowUpTemplate,
  Lead,
  LeadStatus,
  QuotaConfig,
  ReminderCadence,
  SmartViewId,
  WorkspaceSession,
} from '../types/crm';

const LEADS_STORAGE_KEY = 'goodshield_crm_leads_v1';
const QUOTA_STORAGE_KEY = 'goodshield_crm_quota_v1';
const SESSION_STORAGE_KEY = 'goodshield_crm_session_v1';

export const FOLLOW_UP_TEMPLATES: FollowUpTemplate[] = [
  {
    id: 'tpl-gentle-check',
    title: 'Gentle Follow-Up (3–4 Days)',
    channel: 'whatsapp',
    body: 'Hi {name}, just checking in on {vehicle}—did you have any questions about the details or availability I shared earlier?',
  },
  {
    id: 'tpl-value-tip',
    title: 'Helpful Protection / Spec Tip',
    channel: 'whatsapp',
    body: 'Hi {name}, sharing a quick tip for {vehicle}: planning ahead early helps avoid last-minute delays. Let me know if you would like a quick comparison or quote.',
  },
  {
    id: 'tpl-slot-check',
    title: 'Availability & Next Step',
    channel: 'whatsapp',
    body: 'Hi {name}, I have a couple of follow-up slots open this week if you are still considering {vehicle}. Would morning or afternoon work better for a quick chat?',
  },
];

interface LeadRow {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  vehicle_model: string | null;
  notes: string | null;
  status: LeadStatus;
  cadence: ReminderCadence;
  next_follow_up_at: string;
  created_at: string;
  updated_at: string;
}

function rowToLead(row: LeadRow): Lead {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone ?? '',
    email: row.email ?? '',
    vehicleModel: row.vehicle_model ?? '',
    notes: row.notes ?? '',
    status: row.status,
    cadence: row.cadence,
    nextFollowUpAt: row.next_follow_up_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function leadToRow(lead: Lead): LeadRow {
  return {
    id: lead.id,
    name: lead.name,
    phone: lead.phone?.trim() ? lead.phone.trim() : null,
    email: lead.email?.trim() ? lead.email.trim() : null,
    vehicle_model: lead.vehicleModel?.trim() ? lead.vehicleModel.trim() : null,
    notes: lead.notes?.trim() ? lead.notes.trim() : null,
    status: lead.status,
    cadence: lead.cadence,
    next_follow_up_at: lead.nextFollowUpAt,
    created_at: lead.createdAt,
    updated_at: lead.updatedAt,
  };
}

function readLocalLeads(): Lead[] {
  try {
    const raw = localStorage.getItem(LEADS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocalLeads(leads: Lead[]): void {
  try {
    localStorage.setItem(LEADS_STORAGE_KEY, JSON.stringify(leads));
  } catch {
    // Ignore storage quota errors in restricted browser contexts
  }
}

export function isSupabaseConnected(): boolean {
  return Boolean(supabase);
}

export function isCloudSyncConfigured(): boolean {
  return Boolean(supabase);
}

export async function fetchLeads(): Promise<Lead[]> {
  if (!supabase) {
    return readLocalLeads();
  }

  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .order('next_follow_up_at', { ascending: true });

  if (error) {
    console.warn('Supabase fetchLeads error, falling back to local storage:', error.message);
    return readLocalLeads();
  }

  const mapped = ((data ?? []) as LeadRow[]).map(rowToLead);
  writeLocalLeads(mapped);
  return mapped;
}

export async function saveLead(lead: Lead): Promise<Lead> {
  const nowIso = new Date().toISOString();
  const normalizedLead: Lead = {
    ...lead,
    id: lead.id || crypto.randomUUID(),
    createdAt: lead.createdAt || nowIso,
    updatedAt: nowIso,
  };

  const currentLocal = readLocalLeads();
  const existingIndex = currentLocal.findIndex((item) => item.id === normalizedLead.id);
  const nextLocal =
    existingIndex >= 0
      ? currentLocal.map((item, idx) => (idx === existingIndex ? normalizedLead : item))
      : [normalizedLead, ...currentLocal];
  writeLocalLeads(nextLocal);

  if (!supabase) {
    return normalizedLead;
  }

  const { data, error } = await supabase
    .from('leads')
    .upsert(leadToRow(normalizedLead), { onConflict: 'id' })
    .select('*')
    .single();

  if (error) {
    console.warn('Supabase saveLead error, kept in local storage:', error.message);
    return normalizedLead;
  }

  return rowToLead(data as LeadRow);
}

export async function deleteLead(leadId: string): Promise<void> {
  const filteredLocal = readLocalLeads().filter((item) => item.id !== leadId);
  writeLocalLeads(filteredLocal);

  if (!supabase) {
    return;
  }

  const { error } = await supabase.from('leads').delete().eq('id', leadId);
  if (error) {
    console.warn('Supabase deleteLead error:', error.message);
  }
}

export function sanitizePhoneForWhatsApp(phone?: string): string {
  if (!phone) return '';
  return phone.replace(/[^\d]/g, '');
}

export function personalizeTemplateText(templateText: string, lead: Lead): string {
  const firstName = lead.name?.trim().split(/\s+/)[0] || 'there';
  const vehicle = lead.vehicleModel?.trim() || 'your inquiry';
  return templateText
    .replace(/\{name\}/gi, firstName)
    .replace(/\{fullName\}/gi, lead.name || 'there')
    .replace(/\{vehicle\}/gi, vehicle)
    .replace(/\{vehicleModel\}/gi, vehicle);
}

export function buildWhatsAppMeUrl(phone: string | undefined, message: string): string {
  const cleanPhone = sanitizePhoneForWhatsApp(phone);
  const encodedText = encodeURIComponent(message);
  if (cleanPhone) {
    return `https://wa.me/${cleanPhone}?text=${encodedText}`;
  }
  return `https://wa.me/?text=${encodedText}`;
}

export function generateSmartDrafts(lead: Lead): Array<{ id: string; label: string; text: string }> {
  return FOLLOW_UP_TEMPLATES.map((tpl) => ({
    id: tpl.id,
    label: tpl.title,
    text: personalizeTemplateText(tpl.body, lead),
  }));
}

export function getCadenceDays(cadence: ReminderCadence): number {
  switch (cadence) {
    case 'daily':
      return 1;
    case 'every_2_days':
      return 2;
    case 'every_3_days':
      return 3;
    case 'weekly':
      return 7;
    default:
      return 3;
  }
}

export function computeNextFollowUpIso(cadence: ReminderCadence, fromDate = new Date()): string {
  const days = getCadenceDays(cadence);
  const next = new Date(fromDate.getTime() + days * 24 * 60 * 60 * 1000);
  return next.toISOString();
}

export function getLeadReminderMeta(lead: Lead): {
  bucket: SmartViewId;
  label: string;
  isDueToday: boolean;
  isOverdue: boolean;
} {
  if (lead.status === 'closed') {
    return { bucket: 'closed', label: 'Closed', isDueToday: false, isOverdue: false };
  }
  if (lead.status === 'replied') {
    return { bucket: 'replied', label: 'Replied', isDueToday: false, isOverdue: false };
  }

  const now = new Date();
  const followUp = new Date(lead.nextFollowUpAt);

  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  if (Number.isNaN(followUp.getTime())) {
    return { bucket: 'upcoming', label: 'Scheduled', isDueToday: false, isOverdue: false };
  }

  if (followUp < startOfToday) {
    return { bucket: 'overdue', label: 'Overdue', isDueToday: false, isOverdue: true };
  }

  if (followUp <= endOfToday) {
    return { bucket: 'due_today', label: 'Due Today', isDueToday: true, isOverdue: false };
  }

  return { bucket: 'upcoming', label: 'Upcoming', isDueToday: false, isOverdue: false };
}

export function loadQuotaConfig(): QuotaConfig {
  try {
    const raw = localStorage.getItem(QUOTA_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        dailyTarget: Number(parsed.dailyTarget) || 25,
        weeklyTarget: Number(parsed.weeklyTarget) || 120,
      };
    }
  } catch {
    // Ignore storage errors
  }
  return { dailyTarget: 25, weeklyTarget: 120 };
}

export function saveQuotaConfig(config: QuotaConfig): void {
  try {
    localStorage.setItem(QUOTA_STORAGE_KEY, JSON.stringify(config));
  } catch {
    // Ignore storage errors
  }
}

export function loadWorkspaceSession(): WorkspaceSession {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {
    // Ignore storage errors
  }
  return { isLocked: false, hasPasscode: false };
}

export function saveWorkspaceSession(session: WorkspaceSession): void {
  try {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  } catch {
    // Ignore storage errors
  }
}

/* ------------------------------------------------------------------ */
/* Supabase auth                                                       */
/* ------------------------------------------------------------------ */

type AuthResult = { ok: boolean; message: string };

export async function signInWithSupabase(email: string, password: string): Promise<AuthResult> {
  if (!supabase) return { ok: false, message: 'Cloud sync is not configured.' };

  const { error } = await supabase.auth.signInWithPassword({
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
  if (!supabase) {
    return { ok: false, message: 'Cloud sync is not configured.', requiresEmailConfirmation: false };
  }

  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
  });
  if (error) return { ok: false, message: error.message, requiresEmailConfirmation: false };

  // No session returned = email confirmation is required
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

  if (!supabase) {
    return { ok: false, message: 'Cloud sync is not configured.' };
  }

  const redirectTo =
    typeof window !== 'undefined'
      ? `${window.location.origin}/hanz-crm/`
      : 'https://hanshir8.github.io/hanz-crm/';

  const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
    redirectTo,
  });

  if (error) {
    return { ok: false, message: error.message };
  }

  return {
    ok: true,
    message: `Password reset email sent to ${trimmedEmail}.`,
  };
}

export async function updateSupabasePassword(newPassword: string): Promise<AuthResult> {
  if (!supabase) return { ok: false, message: 'Cloud sync is not configured.' };

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) return { ok: false, message: error.message };
  return { ok: true, message: 'Password updated. Please sign in.' };
}

export async function getSupabaseSession() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export async function signOutSupabase(): Promise<void> {
  if (!supabase) return;
  await supabase.auth.signOut();
}

// Fires when the user lands from a password-reset email link
export function onSupabasePasswordRecovery(callback: () => void): () => void {
  if (!supabase) return () => {};
  const { data } = supabase.auth.onAuthStateChange((event) => {
    if (event === 'PASSWORD_RECOVERY') callback();
  });
  return () => data.subscription.unsubscribe();
}
