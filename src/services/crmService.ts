export type LeadStatus = 'new' | 'contacted' | 'replied' | 'closed';

export type ReminderCadence = 'daily' | 'every_2_days' | 'every_3_days' | 'weekly';

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
  nextFollowUpAt: string; // ISO timestamp
  createdAt: string;      // ISO timestamp
  updatedAt: string;      // ISO timestamp
}
