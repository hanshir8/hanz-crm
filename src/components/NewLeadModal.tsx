import React, { useState } from 'react';
import { UserPlus, X } from 'lucide-react';
import { computeNextReminderDate } from '../services/crmService';
import type { Lead, ReminderCadence } from '../types/crm';

interface NewLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateLead: (lead: Lead) => void;
}

export function NewLeadModal({
  isOpen,
  onClose,
  onCreateLead,
}: NewLeadModalProps) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [interest, setInterest] = useState('');
  const [reminderDays, setReminderDays] = useState<ReminderCadence>(3);
  const [notes, setNotes] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) return;

    const now = new Date();
    const newLead: Lead = {
      id: `lead_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: name.trim(),
      phone: phone.trim(),
      interest: interest.trim() || 'General Inquiry',
      status: 'New',
      reminderDays,
      lastContactedAt: null,
      nextReminderAt: computeNextReminderDate(reminderDays, now),
      notes: notes.trim(),
      history: [],
      createdAt: now.toISOString(),
    };

    onCreateLead(newLead);
    setName('');
    setPhone('');
    setInterest('');
    setReminderDays(3);
    setNotes('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-black/30 backdrop-blur-[1px]"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-md bg-white rounded-3xl border border-black/10 shadow-xl p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#007AFF]/10 text-[#007AFF] flex items-center justify-center">
              <UserPlus className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-[#1D1D1F]">
                Add New Lead
              </h2>
              <p className="text-xs text-[#6E6E73]">
                Schedule automatic 3–4 day WhatsApp follow-ups
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 rounded-xl text-[#8E8E93] hover:text-[#1D1D1F] hover:bg-[#F5F5F7] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div className="space-y-1">
            <label className="block text-xs font-medium text-[#6E6E73]">
              Customer Name *
            </label>
            <input
              type="text"
              required
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Sarah Lim"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#F5F5F7] border border-black/10 text-sm focus:outline-none focus:bg-white focus:border-[#007AFF]"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-medium text-[#6E6E73]">
              WhatsApp Phone Number *
            </label>
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. +60123456789"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#F5F5F7] border border-black/10 text-sm font-mono focus:outline-none focus:bg-white focus:border-[#007AFF]"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-medium text-[#6E6E73]">
              Interest / Package
            </label>
            <input
              type="text"
              value={interest}
              onChange={(e) => setInterest(e.target.value)}
              placeholder="e.g. Tiggo 7 PHEV Test Drive"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#F5F5F7] border border-black/10 text-sm focus:outline-none focus:bg-white focus:border-[#007AFF]"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-medium text-[#6E6E73]">
              First Follow-Up Reminder
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {([3, 4, 7, 0] as ReminderCadence[]).map((days) => (
                <button
                  key={days}
                  type="button"
                  onClick={() => setReminderDays(days)}
                  className={`py-2 rounded-xl text-xs font-medium border transition-colors cursor-pointer ${
                    reminderDays === days
                      ? 'bg-[#007AFF] border-[#007AFF] text-white'
                      : 'bg-[#F5F5F7] border-transparent text-[#1D1D1F] hover:bg-black/5'
                  }`}
                >
                  {days === 0 ? 'None' : `${days} Days`}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-medium text-[#6E6E73]">
              Notes
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional context..."
              className="w-full px-3.5 py-2 rounded-xl bg-[#F5F5F7] border border-black/10 text-xs focus:outline-none focus:bg-white focus:border-[#007AFF] resize-none"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-[#F5F5F7] hover:bg-black/5 text-xs font-medium text-[#1D1D1F] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-[#007AFF] hover:bg-[#0066D6] text-white text-xs font-semibold cursor-pointer"
            >
              Save Lead
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
