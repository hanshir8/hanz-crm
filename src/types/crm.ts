export type LeadStatus = 'new' | 'contacted' | 'replied' | 'closed';

export type ReminderCadence = 0 | 2 | 3 | 4 | 7;

export type SqlCadence =
  | 'off'
  | 'every_2_days'
  | 'every_3_days'
  | 'every_4_days'
  | 'every_7_days';

export type SmartViewId =
  | 'all'
  | 'due_today'
  | 'overdue'
  | 'new'
  | 'contacted'
  | 'replied'
  | 'closed';

export interface FollowUpHistoryItem {
  id: string;
  message: string;
  templateName?: string;
  sentAt?: string;
  at?: string;
}

export interface Lead {
  id: string;
  userId?: string | null;
  name: string;
  phone: string;
  email?: string;
  interest: string; // Mirrors SQL vehicle_model
  vehicleModel?: string;
  notes?: string;
  status: LeadStatus;
  reminderDays: ReminderCadence; // Mirrors SQL cadence
  cadence?: SqlCadence;
  nextFollowUpAt?: string; // Mirrors SQL next_follow_up_at
  lastContactedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  history?: FollowUpHistoryItem[];
}

export interface SmartDraftOption {
  id: string;
  label: string;
  message: string;
}
