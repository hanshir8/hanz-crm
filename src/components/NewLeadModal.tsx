import React, { useEffect, useState } from 'react';
import { Plus, X } from 'lucide-react';
import type { LeadStatus, ReminderCadence } from '../types/crm';

interface NewLeadInput {
  name: string;
  phone: string;
  interest: string;
  notes?: string;
  status?: LeadStatus;
  reminderDays?: ReminderCadence;
}

interface NewLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateLead: (input: NewLeadInput) => Promise<void> | void;
}

const CADENCE_CHOICES: Array<{ label: string; value: ReminderCadence }> = [
  { label: 'Every 2 days', value: 2 },
  { label: 'Every 3 days', value: 3 },
  { label: 'Every 4 days', value: 4 },
  { label: 'Every 7 days', value: 7 },
  { label: 'Off', value: 0 },
];

const STATUS_CHOICES: LeadStatus[] = ['New', 'Contacted', 'Replied', 'Closed'];

export function NewLeadModal({
  isOpen,
  onClose,
  onCreateLead,
}: NewLeadModalProps) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [interest, setInterest] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<LeadStatus>('New');
  const [reminderDays, setReminderDays] = useState<ReminderCadence>(3);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setName('');
    setPhone('');
    setInterest('');
    setNotes('');
    setStatus('New');
    setReminderDays(3);
    setErrorMsg('');
    setIsSubmitting(false);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('Please enter the lead name.');
      return;
    }

    setErrorMsg('');
    setIsSubmitting(true);
    try {
      await onCreateLead({
        name: name.trim(),
        phone: phone.trim(),
        interest: interest.trim(),
        notes: notes.trim(),
        status,
        reminderDays,
      });
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Could not save lead.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-black/35 backdrop-blur-[2px]"
        onClick={onClose}
      />

      <div className="relative z-10 w-full max-w-md rounded-3xl bg-white border border-black/[0.08] shadow-xl p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold tracking-tight text-[#1D1D1F]">
              Add New Lead
            </h2>
            <p className="text-xs text-[#6E6E73]">
              Create a lead and schedule automatic follow-up reminders.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 rounded-xl text-[#6E6E73] hover:text-[#1D1D1F] hover:bg-[#F5F5F7] transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-medium text-[#1D1D1F] mb-1">
              Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Aiman Hakim"
              className="w-full px-3.5 py-2 rounded-xl border border-black/15 bg-[#FAFAFC] text-sm focus:outline-none focus:border-[#0071E3]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#1D1D1F] mb-1">
                WhatsApp / Phone
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+60123456789"
                className="w-full px-3.5 py-2 rounded-xl border border-black/15 bg-[#FAFAFC] text-sm focus:outline-none focus:border-[#0071E3]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#1D1D1F] mb-1">
                Vehicle / Interest
              </label>
              <input
                type="text"
                value={interest}
                onChange={(e) => setInterest(e.target.value)}
                placeholder="e.g., Model / Package"
                className="w-full px-3.5 py-2 rounded-xl border border-black/15 bg-[#FAFAFC] text-sm focus:outline-none focus:border-[#0071E3]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#1D1D1F] mb-1">
                Initial Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as LeadStatus)}
                className="w-full px-3 py-2 rounded-xl border border-black/15 bg-[#FAFAFC] text-sm focus:outline-none focus:border-[#0071E3] cursor-pointer"
              >
                {STATUS_CHOICES.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#1D1D1F] mb-1">
                Follow-Up Cadence
              </label>
              <select
                value={reminderDays}
                onChange={(e) => setReminderDays(Number(e.target.value) as ReminderCadence)}
                className="w-full px-3 py-2 rounded-xl border border-black/15 bg-[#FAFAFC] text-sm focus:outline-none focus:border-[#0071E3] cursor-pointer"
              >
                {CADENCE_CHOICES.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#1D1D1F] mb-1">
              Notes
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional context or inquiry notes..."
              className="w-full px-3.5 py-2 rounded-xl border border-black/15 bg-[#FAFAFC] text-sm focus:outline-none focus:border-[#0071E3]"
            />
          </div>

          {errorMsg && <p className="text-xs text-red-600">{errorMsg}</p>}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-black/12 text-xs sm:text-sm font-medium text-[#1D1D1F] hover:bg-[#F5F5F7] transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#1D1D1F] text-white text-xs sm:text-sm font-medium hover:opacity-90 disabled:opacity-50 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{isSubmitting ? 'Saving...' : 'Save Lead'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default NewLeadModal;
