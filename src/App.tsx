import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { HowToUseModal } from './components/HowToUseModal';
import { LeadInspector } from './components/LeadInspector';
import { LeadList } from './components/LeadList';
import { LockScreen } from './components/LockScreen';
import { NewLeadModal } from './components/NewLeadModal';
import { QrModal } from './components/QrModal';
import { Sidebar } from './components/Sidebar';
import { ToastContainer } from './components/ToastContainer';
import { TopHeader } from './components/TopHeader';
import {
  clearSupabaseAuthSession,
  fetchWhatsAppSession,
  FOLLOW_UP_TEMPLATES,
  getDesktopNotificationPermission,
  getDueLeadsForNotification,
  getLeadReminderMeta,
  getQuotaStatus,
  getSupabaseSession,
  hasLeadReminderBeenNotified,
  loadLeads,
  markLeadReminderNotified,
  matchesSmartView,
  restoreSampleLeads,
  saveLeads,
  sendWhatsAppFollowUp,
  updateWhatsAppSession,
} from './services/crmService';
import type {
  DesktopNotificationPermission,
  Lead,
  SendQuotaStatus,
  SmartViewId,
  ToastItem,
  ToastType,
  WhatsAppSessionState,
} from './types/crm';

function CrmWorkspaceApp() {
  const [isUnlocked, setIsUnlocked] = useState<boolean>(false);

  const [leads, setLeads] = useState<Lead[]>(() => loadLeads());
  const [activeView, setActiveView] = useState<SmartViewId>('due_today');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(() => {
    const initial = loadLeads();
    return initial[0]?.id ?? null;
  });

  const [mobilePane, setMobilePane] = useState<'list' | 'detail'>('list');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  const [isNewLeadOpen, setIsNewLeadOpen] = useState<boolean>(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState<boolean>(false);
  const [isHowToUseOpen, setIsHowToUseOpen] = useState<boolean>(false);

  const [quota, setQuota] = useState<SendQuotaStatus>(() => getQuotaStatus());
  const [sendingLeadId, setSendingLeadId] = useState<string | null>(null);

  const [whatsappSession, setWhatsappSession] = useState<WhatsAppSessionState>({
    status: 'qr',
  });
  const [isUpdatingQr, setIsUpdatingQr] = useState<boolean>(false);

  const [notificationPermission, setNotificationPermission] =
    useState<DesktopNotificationPermission>(() =>
      getDesktopNotificationPermission()
    );

  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const pushToast = useCallback(
    (
      type: ToastType,
      title: string,
      options?: {
        description?: string;
        actionLabel?: string;
        actionUrl?: string;
        durationMs?: number;
      }
    ) => {
      const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const item: ToastItem = {
        id,
        type,
        title,
        description: options?.description,
        actionLabel: options?.actionLabel,
        actionUrl: options?.actionUrl,
      };
      setToasts((prev) => [...prev.slice(-3), item]);

      const duration = options?.durationMs ?? 5000;
      if (duration > 0 && typeof window !== 'undefined') {
        window.setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== id));
        }, duration);
      }
    },
    []
  );

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Auto-unlock if already signed in with Supabase
  useEffect(() => {
    getSupabaseSession().then((session) => {
      if (session) setIsUnlocked(true);
    });
  }, []);

  useEffect(() => {
    saveLeads(leads);
  }, [leads]);

  useEffect(() => {
    if (!isUnlocked) return;
    let active = true;
    fetchWhatsAppSession()
      .then((session) => {
        if (active) setWhatsappSession(session);
      })
      .catch(() => {
        // Non-blocking fallback
      });
    setQuota(getQuotaStatus());
    return () => {
      active = false;
    };
  }, [isUnlocked]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setQuota(getQuotaStatus());
    }, 30_000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!isUnlocked || notificationPermission !== 'granted') return;
    if (typeof Notification === 'undefined') return;

    const checkDueReminders = () => {
      const dueLeads = getDueLeadsForNotification(leads);
      for (const lead of dueLeads) {
        if (!lead.nextReminderAt) continue;
        if (hasLeadReminderBeenNotified(lead.id, lead.nextReminderAt)) continue;

        try {
          const n = new Notification(`GOODSHIELD CRM: Follow up with ${lead.name}`, {
            body: `${lead.interest} (${lead.phone}) is due for a reminder.`,
            tag: `goodshield-reminder-${lead.id}`,
          });
          n.onclick = () => {
            window.focus();
            setSelectedLeadId(lead.id);
            setMobilePane('detail');
          };
          markLeadReminderNotified(lead.id, lead.nextReminderAt);
        } catch {
          // Ignore blocked notification calls
        }
      }
    };

    checkDueReminders();
    const timer = window.setInterval(checkDueReminders, 60_000);
    return () => window.clearInterval(timer);
  }, [isUnlocked, leads, notificationPermission]);

  const counts = useMemo<Record<SmartViewId, number>>(() => {
    return {
      due_today: leads.filter((l) => matchesSmartView(l, 'due_today')).length,
      overdue: leads.filter((l) => matchesSmartView(l, 'overdue')).length,
      upcoming: leads.filter((l) => matchesSmartView(l, 'upcoming')).length,
      replied: leads.filter((l) => matchesSmartView(l, 'replied')).length,
      all: leads.length,
      closed: leads.filter((l) => matchesSmartView(l, 'closed')).length,
    };
  }, [leads]);

  const filteredLeads = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const matching = leads.filter((lead) => {
      if (!matchesSmartView(lead, activeView)) return false;
      if (!q) return true;
      return (
        lead.name.toLowerCase().includes(q) ||
        lead.phone.toLowerCase().includes(q) ||
        lead.interest.toLowerCase().includes(q) ||
        lead.notes.toLowerCase().includes(q)
      );
    });

    return [...matching].sort((a, b) => {
      const metaA = getLeadReminderMeta(a);
      const metaB = getLeadReminderMeta(b);
      if (metaA.sortPriority !== metaB.sortPriority) {
        return metaA.sortPriority - metaB.sortPriority;
      }
      const timeA = a.nextReminderAt ? new Date(a.nextReminderAt).getTime() : Number.MAX_SAFE_INTEGER;
      const timeB = b.nextReminderAt ? new Date(b.nextReminderAt).getTime() : Number.MAX_SAFE_INTEGER;
      return timeA - timeB;
    });
  }, [leads, activeView, searchQuery]);

  const selectedLead = useMemo(() => {
    if (!selectedLeadId) return null;
    return leads.find((l) => l.id === selectedLeadId) ?? null;
  }, [leads, selectedLeadId]);

  const repliedCount = useMemo(
    () => leads.filter((l) => l.status === 'Replied').length,
    [leads]
  );

  const repliedRatePct = useMemo(() => {
    if (leads.length === 0) return 0;
    return Math.round((repliedCount / leads.length) * 100);
  }, [leads.length, repliedCount]);

  const handleCreateLead = (newLead: Lead) => {
    setLeads((prev) => [newLead, ...prev]);
    setSelectedLeadId(newLead.id);
    setMobilePane('detail');
    pushToast('success', `Added ${newLead.name}`, {
      description:
        newLead.reminderDays > 0
          ? `Follow-up reminder set for ${newLead.reminderDays} days.`
          : 'Lead saved without automatic reminder.',
    });
  };

  const handleUpdateLead = (updated: Lead) => {
    setLeads((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
  };

  const handleDeleteLead = (leadId: string) => {
    const target = leads.find((l) => l.id === leadId);
    setLeads((prev) => {
      const remaining = prev.filter((l) => l.id !== leadId);
      if (selectedLeadId === leadId) {
        setSelectedLeadId(remaining[0]?.id ?? null);
        setMobilePane('list');
      }
      return remaining;
    });
    if (target) {
      pushToast('info', `Removed ${target.name}`);
    }
  };

  const handleSendFollowUp = async (
    lead: Lead,
    message: string,
    templateName?: string
  ) => {
    const latestQuota = getQuotaStatus();
    setQuota(latestQuota);

    if (latestQuota.isLocked) {
      pushToast('warning', 'Daily 24h WhatsApp limit reached (30/30)', {
        description:
          'GOODSHIELD paused sending to protect your number from spam flags.',
      });
      return;
    }

    setSendingLeadId(lead.id);
    try {
      const result = await sendWhatsAppFollowUp(lead, message, {
        templateName,
        isQrConnected: whatsappSession.status === 'connected',
      });

      setLeads((prev) =>
        prev.map((item) =>
          item.id === result.updatedLead.id ? result.updatedLead : item
        )
      );
      setQuota(result.quota);

      pushToast(
        'success',
        `Follow-up logged for ${lead.name} (${result.quota.sentIn24h}/${result.quota.limit} in 24h)`,
        {
          description: `Next reminder scheduled in ${result.updatedLead.reminderDays} days.`,
          actionLabel: 'Open WhatsApp Link',
          actionUrl: result.waMeUrl,
        }
      );
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Unable to send follow-up.';
      pushToast('error', 'Follow-up not sent', { description: msg });
    } finally {
      setSendingLeadId(null);
    }
  };

  const handleQuickSend = async (lead: Lead) => {
    const defaultTpl = FOLLOW_UP_TEMPLATES[0];
    await handleSendFollowUp(
      lead,
      defaultTpl.buildMessage(lead),
      defaultTpl.name
    );
  };

  const handleLoadSampleLeads = () => {
    const restored = restoreSampleLeads();
    setLeads(restored);
    setSelectedLeadId(restored[0]?.id ?? null);
    setActiveView('all');
    pushToast('success', 'Sample leads loaded', {
      description: 'Added 3 example contacts with 3–4 day reminder cadences.',
    });
  };

  const handleLockWorkspace = () => {
    clearSupabaseAuthSession();
    setIsUnlocked(false);
    setIsMobileMenuOpen(false);
  };

  const handleRequestNotificationPermission = async () => {
    if (typeof window === 'undefined' || typeof Notification === 'undefined') {
      setNotificationPermission('unsupported');
      pushToast('info', 'Desktop notifications unsupported in this browser');
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      if (permission === 'granted') {
        pushToast('success', 'Desktop reminder alerts enabled');
      } else {
        pushToast('warning', 'Desktop notifications were not enabled');
      }
    } catch {
      pushToast('error', 'Could not request notification permission');
    }
  };

  const handleTestDesktopAlert = () => {
    if (
      typeof window === 'undefined' ||
      typeof Notification === 'undefined' ||
      Notification.permission !== 'granted'
    ) {
      pushToast('info', 'Enable desktop notifications first');
      return;
    }

    try {
      new Notification('GOODSHIELD CRM — Test Alert', {
        body: 'Follow-up desktop notifications are active and working.',
      });
      pushToast('info', 'Test desktop notification sent');
    } catch {
      pushToast('error', 'Unable to trigger test notification');
    }
  };

  const handleQrAction = async (action: 'refresh' | 'pair' | 'disconnect') => {
    setIsUpdatingQr(true);
    try {
      const next = await updateWhatsAppSession(action);
      setWhatsappSession(next);
      if (action === 'pair') {
        pushToast('success', 'WhatsApp session marked as paired');
      } else if (action === 'disconnect') {
        pushToast('info', 'WhatsApp session disconnected');
      } else {
        pushToast('info', 'Session QR refreshed');
      }
    } finally {
      setIsUpdatingQr(false);
    }
  };

  if (!isUnlocked) {
    return (
      <>
        <LockScreen
          onUnlock={() => {
            setIsUnlocked(true);
            setQuota(getQuotaStatus());
          }}
        />
        <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F5F7] text-[#1D1D1F] flex flex-col">
      <TopHeader
        dueTodayCount={counts.due_today}
        overdueCount={counts.overdue}
        repliedRatePct={repliedRatePct}
        repliedCount={repliedCount}
        totalLeadsCount={leads.length}
        activeView={activeView}
        quota={quota}
        whatsappSession={whatsappSession}
        notificationPermission={notificationPermission}
        onSelectView={(view) => {
          setActiveView(view);
          setMobilePane('list');
        }}
        onRequestNotificationPermission={handleRequestNotificationPermission}
        onTestDesktopAlert={handleTestDesktopAlert}
        onOpenHowToUse={() => setIsHowToUseOpen(true)}
        onOpenQrModal={() => setIsQrModalOpen(true)}
        onLockWorkspace={handleLockWorkspace}
        onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
        onResetToMainView={() => {
          setActiveView('due_today');
          setSearchQuery('');
          setMobilePane('list');
        }}
      />

      <main className="flex-1 max-w-[1600px] w-full mx-auto p-3 sm:p-5 flex gap-4 min-h-0">
        <Sidebar
          activeView={activeView}
          counts={counts}
          isMobileMenuOpen={isMobileMenuOpen}
          onCloseMobileMenu={() => setIsMobileMenuOpen(false)}
          onSelectView={(view) => {
            setActiveView(view);
            setMobilePane('list');
          }}
          onOpenNewLead={() => setIsNewLeadOpen(true)}
          onLockWorkspace={handleLockWorkspace}
        />

        <div className="flex-1 flex flex-col md:flex-row gap-4 min-h-0">
          <LeadList
            leads={filteredLeads}
            selectedLeadId={selectedLeadId}
            searchQuery={searchQuery}
            activeView={activeView}
            isQuotaLocked={quota.isLocked}
            sendingLeadId={sendingLeadId}
            mobilePane={mobilePane}
            onSearchChange={setSearchQuery}
            onSelectLead={(leadId) => {
              setSelectedLeadId(leadId);
              setMobilePane('detail');
            }}
            onQuickSend={handleQuickSend}
            onOpenNewLead={() => setIsNewLeadOpen(true)}
            onLoadSampleLeads={handleLoadSampleLeads}
          />

          <LeadInspector
            lead={selectedLead}
            isQuotaLocked={quota.isLocked}
            isSending={
              selectedLead ? sendingLeadId === selectedLead.id : false
            }
            mobilePane={mobilePane}
            onBackToList={() => setMobilePane('list')}
            onUpdateLead={handleUpdateLead}
            onDeleteLead={handleDeleteLead}
            onSendFollowUp={handleSendFollowUp}
          />
        </div>
      </main>

      <NewLeadModal
        isOpen={isNewLeadOpen}
        onClose={() => setIsNewLeadOpen(false)}
        onCreateLead={handleCreateLead}
      />

      <QrModal
        isOpen={isQrModalOpen}
        session={whatsappSession}
        isUpdating={isUpdatingQr}
        onClose={() => setIsQrModalOpen(false)}
        onRefreshQr={() => handleQrAction('refresh')}
        onMarkPaired={() => handleQrAction('pair')}
        onDisconnect={() => handleQrAction('disconnect')}
      />

      <HowToUseModal
        isOpen={isHowToUseOpen}
        onClose={() => setIsHowToUseOpen(false)}
        onRestoreSamples={handleLoadSampleLeads}
      />

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}

export function App() {
  return (
    <ErrorBoundary>
      <CrmWorkspaceApp />
    </ErrorBoundary>
  );
}

export default App;
