export type LeadStatus = 'New' | 'Contacted' | 'Replied' | 'Closed';

// Days until next reminder. 0 = no automatic reminder.
export type ReminderCadence = 0 | 3 | 4 | 7;

export type SmartViewId =
  | 'due_today'
  | 'overdue'
  | 'upcoming'
  | 'replied'
  | 'all'
  | 'closed';

export interface LeadHistoryEntry {
  id: string;
  type: 'whatsapp_sent' | 'note' | 'status_change';
  message: string;
  templateName?: string;
  at: string;
}

export interface Lead {
  id: string;
  name: string;
  phone: string;
  interest: string;
  status: LeadStatus;
  reminderDays: ReminderCadence;
  lastContactedAt: string | null;
  nextReminderAt: string | null;
  notes: string;
  history: LeadHistoryEntry[];
  createdAt: string;
}

export interface FollowUpTemplate {
  id: string;
  name: string;
  description?: string;
  buildMessage: (lead: Lead) => string;
}

export interface SendQuotaStatus {
  sentIn24h: number;
  limit: number;
  remaining: number;
  isLocked: boolean;
}

export interface WhatsAppSessionState {
  status: 'qr' | 'connected' | 'disconnected';
  qrCode?: string;
  pairedAt?: string;
  updatedAt?: string;
}

export type DesktopNotificationPermission = NotificationPermission | 'unsupported';

export type ToastType = 'success' | 'info' | 'warning' | 'error';

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  actionLabel?: string;
  actionUrl?: string;
}
