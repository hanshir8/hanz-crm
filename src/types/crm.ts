export type LeadStatus = 'new' | 'contacted' | 'replied' | 'closed';

export type ReminderCadence =
  | 'daily'
  | 'every_2_days'
  | 'every_3_days'
  | 'weekly';

export type SmartViewId =
  | 'due_today'
  | 'overdue'
  | 'upcoming'
  | 'replied'
  | 'all'
  | 'closed';

export interface Lead {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  vehicleModel?: string;
  notes?: string;
  status: LeadStatus;
  cadence: ReminderCadence;
  nextFollowUpAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface FollowUpTemplate {
  id: string;
  title: string;
  body: string;
  channel?: 'whatsapp' | 'call' | 'email' | 'sms';
}

export interface QuotaConfig {
  dailyTarget: number;
  weeklyTarget: number;
}

export interface WorkspaceSession {
  isLocked: boolean;
  hasPasscode: boolean;
  lastUnlockedAt?: string;
}
