export type LeadStatus = 'New' | 'Contacted' | 'Replied' | 'Closed';

export type ReminderCadence = 0 | 3 | 4 | 7;

export type SmartViewId =
  | 'due_today'
  | 'overdue'
  | 'upcoming'
  | 'replied'
  | 'all'
  | 'closed';

export type ReminderBucket =
  | 'due_today'
  | 'overdue'
  | 'upcoming'
  | 'replied'
  | 'closed';

export interface LeadReminderMeta {
  bucket: ReminderBucket;
  label: string;
  sortPriority: number;
  isDueNow: boolean;
}

export interface LeadHistoryItem {
  id: string;
  sentAt: string;
  channel: 'qr_session' | 'wa_me';
  templateName?: string;
  message: string;
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
  history: LeadHistoryItem[];
  createdAt: string;
}

export interface SendQuotaStatus {
  limit: number;
  sentIn24h: number;
  remaining: number;
  isLocked: boolean;
  nextUnlockAt: string | null;
}

export interface WhatsAppSessionState {
  status: 'qr' | 'connected';
  qrValue?: string;
  pairedAt?: string;
  updatedAt?: string;
}

export interface SmartDraftOption {
  id: string;
  label: string;
  message: string;
}

export interface FollowUpTemplate {
  id: string;
  name: string;
  buildMessage: (lead: Lead) => string;
}

export type DesktopNotificationPermission =
  | NotificationPermission
  | 'unsupported';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  actionLabel?: string;
  actionUrl?: string;
}
