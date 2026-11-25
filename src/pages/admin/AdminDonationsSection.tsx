import { useEffect, useState, type FormEvent } from 'react';
import { CalendarPlus, CheckCircle2, Clock, XCircle } from 'lucide-react';
import { GlassDatePicker } from '../../components/GlassDatePicker.tsx';
import { GlassSelect } from '../../components/GlassSelect.tsx';
import { api } from '../../lib/api.ts';
import type { AdminDonationItem, ManagedUserRecord } from '../../shared/types.ts';

interface AdminDonationsSectionProps {
  token: string;
  onToast: (type: 'success' | 'error', message: string) => void;
  onAuthError: (err: unknown) => void;
}

export function AdminDonationsSection({ token, onToast, onAuthError }: AdminDonationsSectionProps) {
  const [donations, setDonations] = useState<AdminDonationItem[]>([]);
  const [donors, setDonors] = useState<ManagedUserRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const [donorId, setDonorId] = useState('');
  const [donatedAt, setDonatedAt] = useState(new Date().toISOString().slice(0, 10));
  const [location, setLocation] = useState('');
  const [units, setUnits] = useState(1);
  const [status, setStatus] = useState<'scheduled' | 'completed'>('scheduled');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function loadAll() {
    setLoading(true);
    try {
      const [donData, userData] = await Promise.all([
        api.getAdminDonations(token),
        api.getAdminUsers(token, { role: 'donor', limit: 50, page: 1 }),
      ]);
      setDonations(donData.donations);
      setDonors(userData.users);
      if (!donorId && userData.users.length > 0) {
        setDonorId(userData.users[0].id);
      }
    } catch (err) {
      onAuthError(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.createAdminDonation(token, {
        donorId,
        donatedAt,
        location: location.trim(),
        units: Number(units),
        notes: notes.trim(),
        status,
      });
      onToast(
        'success',
        status === 'completed'
          ? 'Donation recorded and 90-day recovery cooldown updated.'
          : 'Donation appointment scheduled.'
      );
      setLocation('');
      setNotes('');
      await loadAll();
    } catch (err) {
      onToast('error', (err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleStatusChange(id: string, nextStatus: 'completed' | 'cancelled') {
    try {
      await api.updateAdminDonation(token, id, nextStatus);
      onToast('success', `Donation marked as ${nextStatus}.`);
      await loadAll();
    } catch (err) {
      onToast('error', (err as Error).message);
    }
  }

  return (
    <div className="space-y-6">
      <form
        onSubmit={handleCreate}
        className="rounded-[20px] ios-glass p-5 sm:p-6 space-y-4"
      >
        <div className="flex items-center gap-2">
          <CalendarPlus className="h-4 w-4 text-[#B3261E] dark:text-[#F28B82]" aria-hidden="true" />
          <h2 className="text-base font-semibold text-[#1C1917] dark:text-[#F5F2EE]">
            Schedule or Record Donation (90-Day Eligibility Checked)
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div>
            <label htmlFor="admin-donation-donor" className="block text-xs font-medium text-[#57534E] dark:text-[#A8A29E] mb-1">Donor</label>
            <GlassSelect
              id="admin-donation-donor"
              ariaLabel="Donor"
              value={donorId}
              onChange={setDonorId}
              placeholder="Select donor..."
              options={donors.map((d) => ({
                value: d.id,
                label: `${d.name} (${d.bloodGroup} · ${d.city})`,
              }))}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#57534E] dark:text-[#A8A29E] mb-1">
              Appointment / Donation Date
            </label>
            <GlassDatePicker
              required
              value={donatedAt}
              onChange={setDonatedAt}
              ariaLabel="Appointment / Donation Date"
            />
          </div>

          <div>
            <label htmlFor="admin-donation-status" className="block text-xs font-medium text-[#57534E] dark:text-[#A8A29E] mb-1">Status</label>
            <GlassSelect
              id="admin-donation-status"
              ariaLabel="Status"
              value={status}
              onChange={(val) => setStatus(val as 'scheduled' | 'completed')}
              options={[
                { value: 'scheduled', label: 'Scheduled Appointment' },
                { value: 'completed', label: 'Completed Donation' },
              ]}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#57534E] dark:text-[#A8A29E] mb-1">
              Blood Bank / Hospital
            </label>
            <input
              type="text"
              required
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Wenlock District Hospital Blood Bank, Hampankatta"
              className="w-full min-h-[44px] rounded-xl border border-[#E2DDD6] dark:border-white/10 bg-white/85 dark:bg-[#141210]/85 px-3 text-sm text-[#1C1917] dark:text-[#F5F2EE]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#57534E] dark:text-[#A8A29E] mb-1">Units</label>
            <input
              type="number"
              min={1}
              max={4}
              value={units}
              onChange={(e) => setUnits(Number(e.target.value))}
              className="w-full min-h-[44px] rounded-xl border border-[#E2DDD6] dark:border-white/10 bg-white/85 dark:bg-[#141210]/85 px-3 text-sm text-[#1C1917] dark:text-[#F5F2EE] tabular-nums"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#57534E] dark:text-[#A8A29E] mb-1">Notes</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional hemoglobin or screening note"
              className="w-full min-h-[44px] rounded-xl border border-[#E2DDD6] dark:border-white/10 bg-white/85 dark:bg-[#141210]/85 px-3 text-sm text-[#1C1917] dark:text-[#F5F2EE]"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={submitting}
            className="min-h-[44px] px-5 rounded-xl bg-[#B3261E] hover:bg-[#961E17] text-white text-sm font-semibold disabled:opacity-60 shadow-[0_4px_14px_rgba(179,38,30,0.3)] transition-colors"
          >
            {submitting ? 'Saving...' : 'Save Donation Record'}
          </button>
        </div>
      </form>

      <div className="rounded-[20px] ios-glass overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-[#E2DDD6] dark:border-white/10 text-left text-xs uppercase tracking-wider text-[#57534E] dark:text-[#A8A29E]">
              <th className="py-3 px-4">Donor</th>
              <th className="py-3 px-4">Location & Date</th>
              <th className="py-3 px-4">90-Day Eligibility</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E2DDD6] dark:divide-white/10">
            {loading ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-[#57534E] dark:text-[#A8A29E]">
                  Loading donation appointments...
                </td>
              </tr>
            ) : (
              donations.map((d) => (
                <tr key={d.id} className="hover:bg-[#FAF8F6]/60 dark:hover:bg-white/5 transition-colors">
                  <td className="py-3 px-4">
                    <div className="font-semibold text-[#1C1917] dark:text-[#F5F2EE]">
                      {d.donorName}{' '}
                      <span className="text-xs font-bold text-[#B3261E] dark:text-[#F28B82]">
                        {d.donorBloodGroup}
                      </span>
                    </div>
                    <div className="text-xs text-[#57534E] dark:text-[#A8A29E]">{d.donorCity}</div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-medium">{d.location}</div>
                    <div className="text-xs text-[#57534E] dark:text-[#A8A29E] tabular-nums">
                      {d.donatedAt} · {d.units} unit(s)
                    </div>
                  </td>
                  <td className="py-3 px-4 text-xs">
                    {d.isCooldownActive && d.nextEligibleDate ? (
                      <span className="font-semibold text-[#9A5B00] dark:text-[#F6C86E]">
                        90-day gap until {d.nextEligibleDate}
                      </span>
                    ) : (
                      <span className="font-semibold text-[#155E3A] dark:text-[#7CE0A9]">Eligible to donate</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    {d.status === 'completed' ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#155E3A] dark:text-[#7CE0A9]">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>Completed</span>
                      </span>
                    ) : d.status === 'cancelled' ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#B3261E] dark:text-[#F28B82]">
                        <XCircle className="h-3.5 w-3.5" />
                        <span>Cancelled</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#9A5B00] dark:text-[#F6C86E]">
                        <Clock className="h-3.5 w-3.5" />
                        <span>Scheduled</span>
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right">
                    {d.status === 'scheduled' ? (
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => void handleStatusChange(d.id, 'completed')}
                          className="min-h-[36px] px-2.5 rounded-xl bg-[#1D6B44] hover:bg-[#165435] text-white text-xs font-semibold transition-colors"
                        >
                          Mark Completed
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleStatusChange(d.id, 'cancelled')}
                          className="min-h-[36px] px-2.5 rounded-xl border border-[#E2DDD6] dark:border-white/10 bg-white/70 dark:bg-[#141210]/70 text-xs font-medium hover:bg-[#F3EFEA] dark:hover:bg-white/10 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-[#A8A29E]">—</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
