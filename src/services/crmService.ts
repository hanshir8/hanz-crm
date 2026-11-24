import { supabase } from '../lib/supabase';
import type { Lead, LeadStatus, ReminderCadence } from '../types/crm';

const LOCAL_STORAGE_KEY = 'goodshield_crm_leads_v1';

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
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocalLeads(leads: Lead[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(leads));
  } catch {
    // Ignore storage quota errors in restricted browser contexts
  }
}

export function isSupabaseConnected(): boolean {
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
