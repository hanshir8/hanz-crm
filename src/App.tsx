import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import {
  buildWhatsAppMeUrl,
  computeNextFollowUpIso,
  DAILY_QUOTA_LIMIT,
  daysToSqlCadence,
  deleteLeadInSupabase,
  fetchUserLeadsFromSupabase,
  getActiveSession,
  getLeadReminderMeta,
  getSentCountLast24h,
  loadCachedLeads,
  normalizeLeadStatus,
  recordSentTimestamp,
  saveCachedLeads,
  supabase,
  upsertLeadInSupabase,
} from './services/crmService';
import type {
  Lead,
  LeadStatus,
  ReminderCadence,
  SmartViewId,
} from './types/crm';
import { HowToUseModal } from './components/HowToUseModal';
import { LeadInspector } from './components/LeadInspector';
import { LeadList } from './components/LeadList';
import { LockScreen } from './components/LockScreen';
import { NewLeadModal } from './components/NewLeadModal';
import { PasscodeModal } from './components/PasscodeModal';
import { QrModal } from './components/QrModal';
import { Sidebar } from './components/Sidebar';
import { ToastContainer, type ToastMessage } from './components/ToastContainer';
import { TopHeader } from './components/TopHeader';

const PASSCODE_STORAGE_KEY = 'goodshield_crm_passcode_v1';
const LOCK_STATE_KEY = 'goodshield_crm_locked_v1';

export function App() {
  const [leads, setLeads] = useState<Lead[]>(() => loadCachedLeads());
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(() => {
    const initial = loadCachedLeads();
    return initial[0]?.id ?? null;
  });

  const [session, setSession] = useState<Session | null>(null);
  const [isSyncingLeads, setIsSyncingLeads] = useState(false);

  const [activeView, setActiveView] = useState<SmartViewId>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [mobilePane, setMobilePane] = useState<'list' | 'detail'>('list');

  const [sentLast24h, setSentLast24h] = useState<number>(() => getSentCountLast24h());
  const [isSending, setIsSending] = useState(false);

  // Modals & quick device lock state
  const [isNewLeadOpen, setIsNewLeadOpen] = useState(false);
  const [isQrOpen, setIsQrOpen] = useState(false);
  const [isHowToUseOpen, setIsHowToUseOpen] = useState(false);
  const [isPasscodeModalOpen, setIsPasscodeModalOpen] = useState(false);

  const [passcode, setPasscode] = useState<string | null>(() => {
    try {
      return localStorage.getItem(PASSCODE_STORAGE_KEY);
    } catch {
      return null;
    }
  });

  const [isLocked, setIsLocked] = useState<boolean>(() => {
    try {
      const savedPasscode = localStorage.getItem(PASSCODE_STORAGE_KEY);
      return Boolean(savedPasscode) && localStorage.getItem(LOCK_STATE_KEY) === '1';
    } catch {
      return false;
    }
  });

  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const pushToast = useCallback(
    (text: string, tone: ToastMessage['tone'] = 'info') => {
      const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      setToasts((prev) => [...prev.slice(-3), { id, text, tone }]);
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 3600);
    },
    []
  );

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const persistLeadsState = useCallback((updater: (prev: Lead[]) => Lead[]) => {
    setLeads((prev) => {
      const next = updater(prev);
      saveCachedLeads(next);
      return next;
    });
  }, []);

  // Sync leads from Supabase for the authenticated user
  const syncLeadsForUser = useCallback(
    async (userId: string, showToast = false) => {
      if (!supabase || !userId) return;
      setIsSyncingLeads(true);
      try {
        const localSnapshot = loadCachedLeads();
        const unownedLocal = localSnapshot.filter(
          (l) => !l.userId || l.userId !== userId
        );

        // Migrate any local leads that haven't been assigned to this user yet
        for (const localLead of unownedLocal) {
          try {
            await upsertLeadInSupabase(
              { ...localLead, userId },
              userId
            );
          } catch {
            // Keep local copy if an individual migration fails
          }
        }

        const remoteLeads = await fetchUserLeadsFromSupabase(userId);
        const existingMap = new Map(localSnapshot.map((l) => [l.id, l]));

        const merged = remoteLeads.map((remote) => {
          const localMatch = existingMap.get(remote.id);
          return {
            ...remote,
            history:
              localMatch?.history && localMatch.history.length > 0
                ? localMatch.history
                : remote.history ?? [],
          };
        });

        setLeads(merged);
        saveCachedLeads(merged);
        setSelectedLeadId((prevId) =>
          prevId && merged.some((l) => l.id === prevId)
            ? prevId
            : merged[0]?.id ?? null
        );

        if (showToast) {
          pushToast(`Synced ${merged.length} lead(s) from cloud.`, 'success');
        }
      } catch (err: any) {
        pushToast(err?.message || 'Failed to sync leads from Supabase.', 'error');
      } finally {
        setIsSyncingLeads(false);
      }
    },
    [pushToast]
  );

  // Initialize Supabase Auth session and listen for sign-in / sign-out changes
  useEffect(() => {
    let isMounted = true;

    getActiveSession().then((activeSession) => {
      if (!isMounted) return;
      setSession(activeSession);
      if (activeSession?.user?.id) {
        void syncLeadsForUser(activeSession.user.id, false);
      }
    });

    if (!supabase) return () => {
      isMounted = false;
    };

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        if (!isMounted) return;
        setSession(nextSession);
        if (nextSession?.user?.id) {
          void syncLeadsForUser(nextSession.user.id, false);
        } else {
          setLeads(loadCachedLeads());
        }
      }
    );

    return () => {
      isMounted = false;
      authListener?.subscription?.unsubscribe();
    };
  }, [syncLeadsForUser]);

  // Refresh 24h outreach quota periodically
  useEffect(() => {
    const interval = window.setInterval(() => {
      setSentLast24h(getSentCountLast24h());
    }, 30_000);
    return () => window.clearInterval(interval);
  }, []);

  const isQuotaLocked = sentLast24h >= DAILY_QUOTA_LIMIT;
  const userId = session?.user?.id ?? null;

  const counts = useMemo(() => {
    let dueToday = 0;
    let overdue = 0;
    let newCount = 0;
    let contacted = 0;
    let replied = 0;
    let closed = 0;

    for (const lead of leads) {
      const meta = getLeadReminderMeta(lead);
      if (meta.isDueToday) dueToday += 1;
      if (meta.isOverdue) overdue += 1;

      const st = normalizeLeadStatus(lead.status);
      if (st === 'new') newCount += 1;
      else if (st === 'contacted') contacted += 1;
      else if (st === 'replied') replied += 1;
      else if (st === 'closed') closed += 1;
    }

    return {
      all: leads.length,
      due_today: dueToday,
      overdue,
      new: newCount,
      contacted,
      replied,
      closed,
    };
  }, [leads]);

  const filteredLeads = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return leads.filter((lead) => {
      const meta = getLeadReminderMeta(lead);
      const st = normalizeLeadStatus(lead.status);

      if (activeView === 'due_today' && !meta.isDueToday) return false;
      if (activeView === 'overdue' && !meta.isOverdue) return false;
      if (
        (activeView === 'new' ||
          activeView === 'contacted' ||
          activeView === 'replied' ||
          activeView === 'closed') &&
        st !== activeView
      ) {
        return false;
      }

      if (!q) return true;

      const haystack = [
        lead.name,
        lead.phone,
        lead.email ?? '',
        lead.interest,
        lead.vehicleModel ?? '',
        lead.notes ?? '',
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(q);
    });
  }, [leads, activeView, searchQuery]);

  const selectedLead = useMemo(
    () => leads.find((l) => l.id === selectedLeadId) ?? null,
    [leads, selectedLeadId]
  );

  const handleSelectLead = (leadId: string) => {
    setSelectedLeadId(leadId);
    setMobilePane('detail');
  };

  const handleCreateLead = async (input: {
    name: string;
    phone: string;
    email?: string;
    interest: string;
    notes?: string;
    status?: LeadStatus;
    reminderDays?: ReminderCadence;
  }) => {
    const nowIso = new Date().toISOString();
    const status = normalizeLeadStatus(input.status ?? 'new');
    const reminderDays: ReminderCadence = input.reminderDays ?? 3;
    const interest = input.interest.trim();

    const newLead: Lead = {
      id: `lead_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      userId,
      name: input.name.trim(),
      phone: input.phone.trim(),
      email: input.email?.trim() || undefined,
      interest,
      vehicleModel: interest,
      notes: input.notes?.trim() ?? '',
      status,
      reminderDays,
      cadence: daysToSqlCadence(reminderDays),
      nextFollowUpAt: computeNextFollowUpIso(reminderDays, nowIso),
      createdAt: nowIso,
      updatedAt: nowIso,
      history: [],
    };

    persistLeadsState((prev) => [newLead, ...prev]);
    setSelectedLeadId(newLead.id);
    setMobilePane('detail');
    setIsNewLeadOpen(false);

    if (userId) {
      try {
        const saved = await upsertLeadInSupabase(newLead, userId);
        persistLeadsState((prev) =>
          prev.map((item) => (item.id === newLead.id ? saved : item))
        );
        pushToast('Lead saved and synced to cloud.', 'success');
      } catch (err: any) {
        pushToast(
          err?.message || 'Saved locally; cloud sync will retry.',
          'error'
        );
      }
    } else {
      pushToast('Lead added locally.', 'success');
    }
  };

  const handleUpdateLead = async (updatedInput: Lead) => {
    const nowIso = new Date().toISOString();
    const status = normalizeLeadStatus(updatedInput.status);
    const reminderDays = updatedInput.reminderDays ?? 3;
    const interest = (updatedInput.interest ?? updatedInput.vehicleModel ?? '').trim();

    const normalizedLead: Lead = {
      ...updatedInput,
      userId: updatedInput.userId ?? userId,
      name: updatedInput.name.trim(),
      phone: updatedInput.phone.trim(),
      interest,
      vehicleModel: interest,
      status,
      reminderDays,
      cadence: daysToSqlCadence(reminderDays),
      nextFollowUpAt:
        updatedInput.nextFollowUpAt ||
        computeNextFollowUpIso(reminderDays, nowIso),
      updatedAt: nowIso,
    };

    persistLeadsState((prev) =>
      prev.map((item) => (item.id === normalizedLead.id ? normalizedLead : item))
    );

    if (userId) {
      try {
        const saved = await upsertLeadInSupabase(normalizedLead, userId);
        persistLeadsState((prev) =>
          prev.map((item) => (item.id === normalizedLead.id ? saved : item))
        );
      } catch (err: any) {
        pushToast(
          err?.message || 'Updated locally; cloud sync failed.',
          'error'
        );
      }
    }
  };

  const handleDeleteLead = async (leadId: string) => {
    persistLeadsState((prev) => {
      const remaining = prev.filter((l) => l.id !== leadId);
      if (selectedLeadId === leadId) {
        setSelectedLeadId(remaining[0]?.id ?? null);
        setMobilePane('list');
      }
      return remaining;
    });

    if (userId) {
      try {
        await deleteLeadInSupabase(leadId, userId);
        pushToast('Lead deleted.', 'info');
      } catch (err: any) {
        pushToast(err?.message || 'Failed to delete lead in cloud.', 'error');
      }
    } else {
      pushToast('Lead removed.', 'info');
    }
  };

  const handleSendFollowUp = async (
    targetLead: Lead,
    message: string,
    templateName?: string
  ) => {
    if (isQuotaLocked || isSending) return;
    setIsSending(true);

    try {
      const waUrl = buildWhatsAppMeUrl(targetLead.phone, message);
      window.open(waUrl, '_blank', 'noopener,noreferrer');

      recordSentTimestamp();
      setSentLast24h(getSentCountLast24h());

      const nowIso = new Date().toISOString();
      const nextStatus: LeadStatus =
        normalizeLeadStatus(targetLead.status) === 'new'
          ? 'contacted'
          : normalizeLeadStatus(targetLead.status);
      const reminderDays = targetLead.reminderDays ?? 3;

      const updatedLead: Lead = {
        ...targetLead,
        userId: targetLead.userId ?? userId,
        status: nextStatus,
        reminderDays,
        cadence: daysToSqlCadence(reminderDays),
        lastContactedAt: nowIso,
        nextFollowUpAt: computeNextFollowUpIso(reminderDays, nowIso),
        updatedAt: nowIso,
        history: [
          {
            id: `hist_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            message,
            templateName: templateName || 'Follow-Up Sent',
            sentAt: nowIso,
            at: nowIso,
          },
          ...(targetLead.history ?? []),
        ],
      };

      await handleUpdateLead(updatedLead);
      pushToast('Follow-up logged and next reminder scheduled.', 'success');
    } finally {
      setIsSending(false);
    }
  };

  const handleSavePasscode = (newPasscode: string | null) => {
    try {
      if (newPasscode) {
        localStorage.setItem(PASSCODE_STORAGE_KEY, newPasscode);
        localStorage.setItem(LOCK_STATE_KEY, '0');
        setPasscode(newPasscode);
        setIsLocked(false);
        pushToast('Quick lock passcode updated.', 'success');
      } else {
        localStorage.removeItem(PASSCODE_STORAGE_KEY);
        localStorage.removeItem(LOCK_STATE_KEY);
        setPasscode(null);
        setIsLocked(false);
        pushToast('Quick lock passcode removed.', 'info');
      }
    } catch {
      pushToast('Could not update passcode storage.', 'error');
    }
    setIsPasscodeModalOpen(false);
  };

  const handleLockScreen = () => {
    if (!passcode) {
      setIsPasscodeModalOpen(true);
      return;
    }
    try {
      localStorage.setItem(LOCK_STATE_KEY, '1');
    } catch {
      // Ignore storage errors
    }
    setIsLocked(true);
  };

  const handleUnlock = (entered: string): boolean => {
    if (!passcode || entered === passcode) {
      try {
        localStorage.setItem(LOCK_STATE_KEY, '0');
      } catch {
        // Ignore storage errors
      }
      setIsLocked(false);
      return true;
    }
    return false;
  };

  const handleSignOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setSession(null);
    pushToast('Signed out of Supabase session.', 'info');
  };

  if (isLocked && passcode) {
    return (
      <>
        <LockScreen onUnlock={handleUnlock} />
        <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F5F7] text-[#1D1D1F] flex flex-col">
      <TopHeader
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        sentLast24h={sentLast24h}
        quotaLimit={DAILY_QUOTA_LIMIT}
        userEmail={session?.user?.email ?? null}
        isSyncing={isSyncingLeads}
        onSyncNow={() => {
          if (userId) {
            void syncLeadsForUser(userId, true);
          } else {
            pushToast('Sign in with Supabase to sync across devices.', 'info');
          }
        }}
        onSignOut={session ? handleSignOut : undefined}
        onOpenNewLead={() => setIsNewLeadOpen(true)}
        onOpenQr={() => setIsQrOpen(true)}
        onOpenPasscode={() => setIsPasscodeModalOpen(true)}
        onLock={handleLockScreen}
        onOpenHowToUse={() => setIsHowToUseOpen(true)}
      />

      <main className="flex-1 max-w-[1440px] w-full mx-auto p-3 sm:p-5 flex flex-col md:flex-row gap-4 min-h-0">
        <Sidebar
          activeView={activeView}
          onSelectView={(view) => {
            setActiveView(view);
            setMobilePane('list');
          }}
          counts={counts}
        />

        <LeadList
          leads={filteredLeads}
          selectedLeadId={selectedLeadId}
          mobilePane={mobilePane}
          onSelectLead={handleSelectLead}
          onOpenNewLead={() => setIsNewLeadOpen(true)}
        />

        <LeadInspector
          lead={selectedLead}
          isQuotaLocked={isQuotaLocked}
          isSending={isSending}
          mobilePane={mobilePane}
          onBackToList={() => setMobilePane('list')}
          onUpdateLead={handleUpdateLead}
          onDeleteLead={handleDeleteLead}
          onSendFollowUp={handleSendFollowUp}
        />
      </main>

      <NewLeadModal
        isOpen={isNewLeadOpen}
        onClose={() => setIsNewLeadOpen(false)}
        onCreateLead={handleCreateLead}
      />

      <QrModal isOpen={isQrOpen} onClose={() => setIsQrOpen(false)} />

      <HowToUseModal
        isOpen={isHowToUseOpen}
        onClose={() => setIsHowToUseOpen(false)}
      />

      <PasscodeModal
        isOpen={isPasscodeModalOpen}
        hasExistingPasscode={Boolean(passcode)}
        onClose={() => setIsPasscodeModalOpen(false)}
        onSavePasscode={handleSavePasscode}
      />

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}

export default App;
