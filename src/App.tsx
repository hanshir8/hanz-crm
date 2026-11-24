import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import type {
  Lead,
  LeadStatus,
  ReminderCadence,
  SendQuotaStatus,
  SmartViewId,
  ToastMessage,
  WhatsAppSessionState,
} from './types/crm';
import {
  buildWhatsAppMeUrl,
  clearSupabaseAuthSession,
  computeNextFollowUpIso,
  computeNextReminderDate,
  DAILY_QUOTA_LIMIT,
  deleteLead as deleteLeadService,
  fetchLeadsFromSupabase,
  fetchWhatsAppSession,
  generateSmartDrafts,
  getActiveSession,
  getDesktopNotificationPermission,
  getDueLeadsForNotification,
  getLeadReminderMeta,
  getQuotaStatus,
  getSentCountLast24h,
  getStoredPasscode,
  hasLeadReminderBeenNotified,
  isCloudSyncConfigured,
  loadCachedLeads,
  markLeadReminderNotified,
  matchesSmartView,
  normalizeLeadStatus,
  onSupabasePasswordRecovery,
  recordSentTimestamp,
  resetStoredPasscodeToDefault,
  restoreSampleLeads,
  sanitizePhoneForWhatsApp,
  saveCachedLeads,
  sendSupabasePasswordReset,
  sendWhatsAppFollowUp,
  setStoredPasscode,
  signInWithSupabase,
  signUpWithSupabase,
  supabase,
  updateLead as updateLeadService,
  updateSupabasePassword,
  updateWhatsAppSession,
} from './services/crmService';
import Sidebar from './components/Sidebar';
import TopHeader from './components/TopHeader';
import LeadList from './components/LeadList';
import LeadInspector from './components/LeadInspector';
import NewLeadModal from './components/NewLeadModal';
import PasscodeModal from './components/PasscodeModal';
import QrModal from './components/QrModal';
import HowToUseModal from './components/HowToUseModal';
import LockScreen from './components/LockScreen';
import ToastContainer from './components/ToastContainer';

const DEFAULT_WA_SESSION: WhatsAppSessionState = { status: 'qr' };

const DEFAULT_QUOTA: SendQuotaStatus = {
  sentIn24h: 0,
  limit: DAILY_QUOTA_LIMIT,
  remaining: DAILY_QUOTA_LIMIT,
  isLocked: false,
};

function ensureSafeWaSession(session: WhatsAppSessionState | null | undefined): WhatsAppSessionState {
  if (!session || typeof session !== 'object') {
    return { ...DEFAULT_WA_SESSION };
  }
  const status =
    session.status === 'connected' || session.status === 'disconnected' || session.status === 'qr'
      ? session.status
      : 'qr';
  return {
    ...session,
    status,
  };
}

function ensureSafeQuota(quota: SendQuotaStatus | null | undefined): SendQuotaStatus {
  if (!quota || typeof quota !== 'object') {
    return { ...DEFAULT_QUOTA };
  }
  const sentIn24h = Number.isFinite(Number(quota.sentIn24h)) ? Number(quota.sentIn24h) : 0;
  const limit = Number.isFinite(Number(quota.limit)) && Number(quota.limit) > 0
    ? Number(quota.limit)
    : DAILY_QUOTA_LIMIT;
  const remaining = Math.max(0, limit - sentIn24h);
  return {
    sentIn24h,
    limit,
    remaining,
    isLocked: remaining === 0,
  };
}

export default function App() {
  const [leads, setLeads] = useState<Lead[]>(() => {
    try {
      const cached = loadCachedLeads();
      return Array.isArray(cached) ? cached.filter(Boolean) : [];
    } catch {
      return [];
    }
  });

  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(() => {
    try {
      const cached = loadCachedLeads();
      return Array.isArray(cached) && cached.length > 0 && cached[0]?.id
        ? cached[0].id
        : null;
    } catch {
      return null;
    }
  });

  const [activeView, setActiveView] = useState<SmartViewId>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'All' | LeadStatus>('All');

  const [waSession, setWaSession] = useState<WhatsAppSessionState>({ ...DEFAULT_WA_SESSION });
  const [quota, setQuota] = useState<SendQuotaStatus>(() => {
    try {
      return ensureSafeQuota(getQuotaStatus());
    } catch {
      return { ...DEFAULT_QUOTA };
    }
  });

  const [passcode, setPasscode] = useState<string | null>(() => {
    try {
      return getStoredPasscode();
    } catch {
      return null;
    }
  });
  const [isLocked, setIsLocked] = useState<boolean>(() => {
    try {
      return Boolean(getStoredPasscode());
    } catch {
      return false;
    }
  });

  const [authSession, setAuthSession] = useState<Session | null>(null);
  const [isSyncingCloud, setIsSyncingCloud] = useState<boolean>(false);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState<boolean>(false);

  const [isNewLeadOpen, setIsNewLeadOpen] = useState<boolean>(false);
  const [isPasscodeModalOpen, setIsPasscodeModalOpen] = useState<boolean>(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState<boolean>(false);
  const [isHowToUseOpen, setIsHowToUseOpen] = useState<boolean>(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);

  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const toastCounterRef = useRef(0);

  const pushToast = useCallback(
    (title: string, description?: string, tone: ToastMessage['tone'] = 'info') => {
      toastCounterRef.current += 1;
      const id = `toast_${Date.now()}_${toastCounterRef.current}`;
      setToasts((prev) => [...prev.slice(-3), { id, title, description, tone }]);
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((item) => item.id !== id));
      }, 4200);
    },
    []
  );

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const syncLeadsState = useCallback((nextLeads: Lead[]) => {
    const safeList = Array.isArray(nextLeads) ? nextLeads.filter(Boolean) : [];
    setLeads(safeList);
    saveCachedLeads(safeList);
    setSelectedLeadId((prevId) => {
      if (prevId && safeList.some((l) => l.id === prevId)) return prevId;
      return safeList[0]?.id ?? null;
    });
  }, []);

  const refreshCloudLeads = useCallback(
    async (userId?: string, showToast = false) => {
      if (!isCloudSyncConfigured()) return;
      setIsSyncingCloud(true);
      try {
        const cloudLeads = await fetchLeadsFromSupabase(userId);
        if (Array.isArray(cloudLeads)) {
          syncLeadsState(cloudLeads);
          if (showToast) {
            pushToast('Synced with cloud', `${cloudLeads.length} lead(s) up to date`, 'success');
          }
        }
      } catch (err) {
        console.warn('Cloud lead sync error:', err);
        if (showToast) {
          pushToast('Sync warning', 'Using local cached leads', 'warning');
        }
      } finally {
        setIsSyncingCloud(false);
      }
    },
    [pushToast, syncLeadsState]
  );

  useEffect(() => {
    let active = true;

    fetchWhatsAppSession()
      .then((sess) => {
        if (active) setWaSession(ensureSafeWaSession(sess));
      })
      .catch(() => {
        if (active) setWaSession({ ...DEFAULT_WA_SESSION });
      });

    try {
      setQuota(ensureSafeQuota(getQuotaStatus()));
    } catch {
      setQuota({ ...DEFAULT_QUOTA });
    }

    if (!supabase) return () => { active = false; };

    getActiveSession()
      .then((sess) => {
        if (!active) return;
        setAuthSession(sess ?? null);
        if (sess?.user?.id) {
          void refreshCloudLeads(sess.user.id, false);
        }
      })
      .catch(() => {
        if (active) setAuthSession(null);
      });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return;
      setAuthSession(nextSession ?? null);
      if (nextSession?.user?.id) {
        void refreshCloudLeads(nextSession.user.id, false);
      }
    });

    const unsubscribeRecovery = onSupabasePasswordRecovery(() => {
      if (active) setIsPasswordRecovery(true);
    });

    return () => {
      active = false;
      authListener.subscription.unsubscribe();
      unsubscribeRecovery();
    };
  }, [refreshCloudLeads]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setQuota(ensureSafeQuota(getQuotaStatus()));
      if (getDesktopNotificationPermission() !== 'granted') return;

      const dueLeads = getDueLeadsForNotification(leads);
      for (const lead of dueLeads) {
        if (!lead?.nextReminderAt) continue;
        if (!hasLeadReminderBeenNotified(lead.id, lead.nextReminderAt)) {
          markLeadReminderNotified(lead.id, lead.nextReminderAt);
          try {
            new Notification(`Follow-up due: ${lead.name}`, {
              body: lead.interest
                ? `${lead.interest} (${lead.phone || 'No phone'})`
                : lead.phone || 'Lead reminder is due now.',
            });
          } catch {
            // ignore notification errors on restricted browsers
          }
        }
      }
    }, 30000);

    return () => window.clearInterval(interval);
  }, [leads]);

  const counts = useMemo<Record<SmartViewId, number>>(() => {
    const safeLeads = Array.isArray(leads) ? leads.filter(Boolean) : [];
    const views: SmartViewId[] = ['all', 'overdue', 'due_today', 'upcoming', 'replied', 'closed'];
    const result = {} as Record<SmartViewId, number>;
    for (const v of views) {
      result[v] = safeLeads.filter((l) => matchesSmartView(l, v)).length;
    }
    return result;
  }, [leads]);

  const filteredLeads = useMemo(() => {
    const safeLeads = Array.isArray(leads) ? leads.filter(Boolean) : [];
    const q = searchQuery.trim().toLowerCase();

    return safeLeads
      .filter((lead) => matchesSmartView(lead, activeView))
      .filter((lead) => {
        if (statusFilter !== 'All' && normalizeLeadStatus(lead.status) !== statusFilter) {
          return false;
        }
        if (!q) return true;
        return (
          String(lead.name ?? '').toLowerCase().includes(q) ||
          String(lead.phone ?? '').toLowerCase().includes(q) ||
          String(lead.interest ?? '').toLowerCase().includes(q) ||
          String(lead.notes ?? '').toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        const metaA = getLeadReminderMeta(a);
        const metaB = getLeadReminderMeta(b);
        if (metaA.sortPriority !== metaB.sortPriority) {
          return metaA.sortPriority - metaB.sortPriority;
        }
        const timeA = a.nextReminderAt ? new Date(a.nextReminderAt).getTime() : Number.MAX_SAFE_INTEGER;
        const timeB = b.nextReminderAt ? new Date(b.nextReminderAt).getTime() : Number.MAX_SAFE_INTEGER;
        return timeA - timeB;
      });
  }, [leads, activeView, statusFilter, searchQuery]);

  const selectedLead = useMemo(() => {
    if (!selectedLeadId) return filteredLeads[0] ?? leads[0] ?? null;
    return (
      leads.find((item) => item.id === selectedLeadId) ??
      filteredLeads[0] ??
      leads[0] ??
      null
    );
  }, [leads, filteredLeads, selectedLeadId]);

  const handleCreateLead = useCallback(
    async (input: {
      name: string;
      phone: string;
      interest: string;
      notes?: string;
      status?: LeadStatus;
      reminderDays?: ReminderCadence;
    }) => {
      const nowIso = new Date().toISOString();
      const cadence: ReminderCadence = input.reminderDays ?? 3;
      const newLead: Lead = {
        id: `lead_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        name: input.name.trim(),
        phone: input.phone.trim(),
        interest: input.interest.trim(),
        notes: (input.notes ?? '').trim(),
        status: normalizeLeadStatus(input.status ?? 'New'),
        reminderDays: cadence,
        lastContactedAt: null,
        nextReminderAt:
          cadence > 0
            ? computeNextReminderDate(cadence, new Date()) ?? computeNextFollowUpIso(cadence, nowIso)
            : null,
        history: [
          {
            id: `h_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            type: 'created',
            message: 'Lead created',
            at: nowIso,
          },
        ],
        createdAt: nowIso,
      };

      const updatedList = [newLead, ...leads];
      syncLeadsState(updatedList);
      setSelectedLeadId(newLead.id);
      setIsNewLeadOpen(false);
      pushToast('Lead added', `${newLead.name} saved`, 'success');

      await updateLeadService(newLead);
    },
    [leads, pushToast, syncLeadsState]
  );

  const handleUpdateLead = useCallback(
    async (updatedLead: Lead) => {
      if (!updatedLead?.id) return;
      const normalized: Lead = {
        ...updatedLead,
        status: normalizeLeadStatus(updatedLead.status),
        history: Array.isArray(updatedLead.history) ? updatedLead.history : [],
      };
      const exists = leads.some((item) => item.id === normalized.id);
      const nextList = exists
        ? leads.map((item) => (item.id === normalized.id ? normalized : item))
        : [normalized, ...leads];

      syncLeadsState(nextList);
      await updateLeadService(normalized);
    },
    [leads, syncLeadsState]
  );

  const handleDeleteLead = useCallback(
    async (leadId: string) => {
      const target = leads.find((item) => item.id === leadId);
      const nextList = leads.filter((item) => item.id !== leadId);
      syncLeadsState(nextList);
      pushToast('Lead removed', target ? `${target.name} deleted` : 'Lead deleted', 'info');
      await deleteLeadService(leadId);
    },
    [leads, pushToast, syncLeadsState]
  );

  const handleSendWhatsApp = useCallback(
    async (lead: Lead, message: string, templateName?: string) => {
      const currentQuota = ensureSafeQuota(getQuotaStatus());
      if (currentQuota.isLocked) {
        pushToast('Daily limit reached', `Limit is ${currentQuota.limit} sends per 24h`, 'warning');
        return;
      }

      try {
        const result = await sendWhatsAppFollowUp(lead, message, {
          templateName,
          isQrConnected: ensureSafeWaSession(waSession).status === 'connected',
        });
        recordSentTimestamp();
        setQuota(ensureSafeQuota(result.quota));
        await handleUpdateLead(result.updatedLead);
        pushToast('WhatsApp opened', `Follow-up prepared for ${lead.name}`, 'success');
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Could not open WhatsApp';
        pushToast('Send failed', msg, 'warning');
      }
    },
    [handleUpdateLead, pushToast, waSession]
  );

  const handleRestoreSampleLeads = useCallback(() => {
    const samples = restoreSampleLeads();
    syncLeadsState(samples);
    pushToast('Sample leads loaded', 'Added 3 starter leads', 'info');
  }, [pushToast, syncLeadsState]);

  const handleWaAction = useCallback(
    async (action: 'refresh' | 'pair' | 'disconnect') => {
      const next = await updateWhatsAppSession(action);
      const safeNext = ensureSafeWaSession(next);
      setWaSession(safeNext);
      if (safeNext.status === 'connected') {
        pushToast('WhatsApp linked', 'Session marked as connected', 'success');
      } else if (safeNext.status === 'disconnected') {
        pushToast('WhatsApp disconnected', 'Session marked as disconnected', 'info');
      } else {
        pushToast('QR refreshed', 'Scan code to pair session', 'info');
      }
    },
    [pushToast]
  );

  const handleSavePasscode = useCallback(
    (nextPasscode: string | null) => {
      setStoredPasscode(nextPasscode);
      setPasscode(nextPasscode);
      setIsPasscodeModalOpen(false);
      if (nextPasscode) {
        pushToast('Passcode updated', 'Quick lock is enabled', 'success');
      } else {
        setIsLocked(false);
        pushToast('Passcode removed', 'Quick lock disabled', 'info');
      }
    },
    [pushToast]
  );

  const handleResetPasscode = useCallback(() => {
    const restored = resetStoredPasscodeToDefault();
    setPasscode(restored);
    pushToast('Passcode reset', `Default passcode set to ${restored}`, 'info');
  }, [pushToast]);

  const handleUnlock = useCallback(
    (entered: string): boolean => {
      const expected = passcode ?? getStoredPasscode();
      if (!expected || entered.trim() === expected.trim()) {
        setIsLocked(false);
        pushToast('Unlocked', 'Welcome back', 'success');
        return true;
      }
      return false;
    },
    [passcode, pushToast]
  );

  if (isLocked && (passcode || getStoredPasscode())) {
    return (
      <>
        <LockScreen
          onUnlock={handleUnlock}
          onResetPasscode={handleResetPasscode}
          authSession={authSession}
          isPasswordRecovery={isPasswordRecovery}
          onClearPasswordRecovery={() => setIsPasswordRecovery(false)}
          onSignIn={signInWithSupabase}
          onSignUp={signUpWithSupabase}
          onPasswordReset={sendSupabasePasswordReset}
          onUpdatePassword={updateSupabasePassword}
          onSignOut={async () => {
            await clearSupabaseAuthSession();
            setAuthSession(null);
          }}
        />
        <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      </>
    );
  }

  const safeWa = ensureSafeWaSession(waSession);
  const safeQuota = ensureSafeQuota(quota);
  const sent24h = getSentCountLast24h() || safeQuota.sentIn24h;

  return (
    <div className="min-h-screen bg-[#F5F5F7] text-[#1D1D1F] flex flex-col">
      <TopHeader
        activeView={activeView}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        waSession={safeWa}
        quota={{ ...safeQuota, sentIn24h }}
        onOpenNewLead={() => setIsNewLeadOpen(true)}
        onOpenQrModal={() => setIsQrModalOpen(true)}
        onOpenPasscodeModal={() => setIsPasscodeModalOpen(true)}
        onLockNow={() => {
          if (!passcode && !getStoredPasscode()) {
            setIsPasscodeModalOpen(true);
            pushToast('Set a passcode first', 'Create a passcode to enable quick lock', 'info');
            return;
          }
          setIsLocked(true);
        }}
        onOpenHowToUse={() => setIsHowToUseOpen(true)}
        onToggleMobileSidebar={() => setIsMobileSidebarOpen((prev) => !prev)}
        authSession={authSession}
        isSyncingCloud={isSyncingCloud}
        onSyncNow={() => void refreshCloudLeads(authSession?.user?.id, true)}
        onSignIn={signInWithSupabase}
        onSignUp={signUpWithSupabase}
        onPasswordReset={sendSupabasePasswordReset}
        onSignOut={async () => {
          await clearSupabaseAuthSession();
          setAuthSession(null);
          pushToast('Signed out', 'Cloud sync paused', 'info');
        }}
      />

      <div className="flex-1 flex min-h-0 relative">
        <Sidebar
          activeView={activeView}
          onSelectView={(view) => {
            setActiveView(view);
            setIsMobileSidebarOpen(false);
          }}
          counts={counts}
          waSession={safeWa}
          onOpenQrModal={() => setIsQrModalOpen(true)}
          isMobileOpen={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
          authEmail={authSession?.user?.email ?? null}
        />

        <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-0">
          <section className="lg:col-span-5 xl:col-span-4 border-r border-black/[0.06] bg-white/80 min-h-0 flex flex-col">
            <LeadList
              leads={filteredLeads}
              selectedLeadId={selectedLead?.id ?? null}
              onSelectLead={(id) => setSelectedLeadId(id)}
              onRestoreSamples={handleRestoreSampleLeads}
              onOpenNewLead={() => setIsNewLeadOpen(true)}
              searchQuery={searchQuery}
              activeView={activeView}
            />
          </section>

          <section className="lg:col-span-7 xl:col-span-8 bg-[#F5F5F7] min-h-0 flex flex-col">
            <LeadInspector
              lead={selectedLead}
              quota={safeQuota}
              waSession={safeWa}
              onUpdateLead={handleUpdateLead}
              onDeleteLead={handleDeleteLead}
              onSendWhatsApp={handleSendWhatsApp}
              generateSmartDrafts={generateSmartDrafts}
              buildWhatsAppMeUrl={buildWhatsAppMeUrl}
              sanitizePhoneForWhatsApp={sanitizePhoneForWhatsApp}
            />
          </section>
        </main>
      </div>

      <NewLeadModal
        isOpen={isNewLeadOpen}
        onClose={() => setIsNewLeadOpen(false)}
        onCreateLead={handleCreateLead}
      />

      <PasscodeModal
        isOpen={isPasscodeModalOpen}
        currentPasscode={passcode}
        onClose={() => setIsPasscodeModalOpen(false)}
        onSavePasscode={handleSavePasscode}
        onResetPasscode={handleResetPasscode}
      />

      <QrModal
        isOpen={isQrModalOpen}
        waSession={safeWa}
        onClose={() => setIsQrModalOpen(false)}
        onAction={handleWaAction}
      />

      <HowToUseModal
        isOpen={isHowToUseOpen}
        onClose={() => setIsHowToUseOpen(false)}
      />

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
