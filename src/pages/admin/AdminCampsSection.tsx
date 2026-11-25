import { useEffect, useState, type FormEvent } from 'react';
import { Calendar, Edit3, Plus, Trash2, X } from 'lucide-react';
import { ConfirmDialog } from '../../components/ConfirmDialog.tsx';
import { GlassDatePicker } from '../../components/GlassDatePicker.tsx';
import { GlassSelect } from '../../components/GlassSelect.tsx';
import { api } from '../../lib/api.ts';
import { INDIAN_CITIES, type DonationCamp } from '../../shared/types.ts';

interface AdminCampsSectionProps {
  token: string;
  onToast: (type: 'success' | 'error', message: string) => void;
  onAuthError: (err: unknown) => void;
}

export function AdminCampsSection({ token, onToast, onAuthError }: AdminCampsSectionProps) {
  const [camps, setCamps] = useState<DonationCamp[]>([]);
  const [loading, setLoading] = useState(true);

  const [title, setTitle] = useState('');
  const [city, setCity] = useState<string>(INDIAN_CITIES[0]);
  const [venue, setVenue] = useState('');
  const [campDate, setCampDate] = useState(new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10));
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('15:00');
  const [slotsTotal, setSlotsTotal] = useState(60);
  const [organizer, setOrganizer] = useState('');
  const [campCategory, setCampCategory] = useState<'college' | 'corporate' | 'community'>('community');
  const [submitting, setSubmitting] = useState(false);

  const [editing, setEditing] = useState<DonationCamp | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DonationCamp | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function loadCamps() {
    setLoading(true);
    try {
      const data = await api.getAdminCamps(token);
      setCamps(data.camps);
    } catch (err) {
      onAuthError(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadCamps();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.createAdminCamp(token, {
        title: title.trim(),
        city,
        venue: venue.trim(),
        campDate,
        startTime,
        endTime,
        slotsTotal: Number(slotsTotal),
        organizer: organizer.trim(),
        campCategory,
      });
      onToast('success', `Created donation camp "${title.trim()}".`);
      setTitle('');
      setVenue('');
      setOrganizer('');
      await loadCamps();
    } catch (err) {
      onToast('error', (err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSaveEdit(e: FormEvent) {
    e.preventDefault();
    if (!editing) return;
    try {
      await api.updateAdminCamp(token, editing.id, {
        title: editing.title,
        city: editing.city,
        venue: editing.venue,
        campDate: editing.campDate,
        slotsTotal: editing.slotsTotal,
        status: editing.status,
        campCategory: editing.campCategory,
        unitsCollected: editing.unitsCollected,
      });
      onToast('success', `Updated camp "${editing.title}".`);
      setEditing(null);
      await loadCamps();
    } catch (err) {
      onToast('error', (err as Error).message);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.deleteAdminCamp(token, deleteTarget.id);
      onToast('success', `Deleted camp "${deleteTarget.title}".`);
      setDeleteTarget(null);
      await loadCamps();
    } catch (err) {
      onToast('error', (err as Error).message);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      <form
        onSubmit={handleCreate}
        className="rounded-[20px] ios-glass p-5 sm:p-6 space-y-4"
      >
        <div className="flex items-center gap-2">
          <Plus className="h-4 w-4 text-[#B3261E] dark:text-[#F28B82]" />
          <h2 className="text-base font-semibold text-[#1C1917] dark:text-[#F5F2EE]">Create Donation Camp / Drive</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-[#57534E] dark:text-[#A8A29E] mb-1">Camp Title</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. NITK Surathkal Community Voluntary Drive"
              className="w-full min-h-[44px] rounded-xl border border-[#E2DDD6] dark:border-white/10 bg-white/85 dark:bg-[#141210]/85 px-3 text-sm text-[#1C1917] dark:text-[#F5F2EE]"
            />
          </div>

          <div>
            <label htmlFor="admin-camp-city" className="block text-xs font-medium text-[#57534E] dark:text-[#A8A29E] mb-1">City</label>
            <GlassSelect
              id="admin-camp-city"
              ariaLabel="City"
              value={city}
              onChange={setCity}
              options={INDIAN_CITIES}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#57534E] dark:text-[#A8A29E] mb-1">Camp Date</label>
            <GlassDatePicker
              required
              value={campDate}
              onChange={setCampDate}
              ariaLabel="Camp Date"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-[#57534E] dark:text-[#A8A29E] mb-1">Venue Address</label>
            <input
              type="text"
              required
              value={venue}
              onChange={(e) => setVenue(e.target.value)}
              placeholder="Auditorium / Hospital hall"
              className="w-full min-h-[44px] rounded-xl border border-[#E2DDD6] dark:border-white/10 bg-white/85 dark:bg-[#141210]/85 px-3 text-sm text-[#1C1917] dark:text-[#F5F2EE]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#57534E] dark:text-[#A8A29E] mb-1">Hours</label>
            <div className="flex items-center gap-1.5">
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full min-h-[44px] rounded-xl border border-[#E2DDD6] dark:border-white/10 bg-white/85 dark:bg-[#141210]/85 px-2 text-sm text-[#1C1917] dark:text-[#F5F2EE]"
              />
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full min-h-[44px] rounded-xl border border-[#E2DDD6] dark:border-white/10 bg-white/85 dark:bg-[#141210]/85 px-2 text-sm text-[#1C1917] dark:text-[#F5F2EE]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#57534E] dark:text-[#A8A29E] mb-1">Donor Slots</label>
            <input
              type="number"
              min={1}
              max={5000}
              value={slotsTotal}
              onChange={(e) => setSlotsTotal(Number(e.target.value))}
              className="w-full min-h-[44px] rounded-xl border border-[#E2DDD6] dark:border-white/10 bg-white/85 dark:bg-[#141210]/85 px-3 text-sm text-[#1C1917] dark:text-[#F5F2EE] tabular-nums"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-[#57534E] dark:text-[#A8A29E] mb-1">Organizer / Blood Bank</label>
            <input
              type="text"
              value={organizer}
              onChange={(e) => setOrganizer(e.target.value)}
              placeholder="e.g. NITK NSS & Wenlock Blood Bank"
              className="w-full min-h-[44px] rounded-xl border border-[#E2DDD6] dark:border-white/10 bg-white/85 dark:bg-[#141210]/85 px-3 text-sm text-[#1C1917] dark:text-[#F5F2EE]"
            />
          </div>

          <div>
            <label htmlFor="admin-camp-category" className="block text-xs font-medium text-[#57534E] dark:text-[#A8A29E] mb-1">Category</label>
            <GlassSelect
              id="admin-camp-category"
              ariaLabel="Category"
              value={campCategory}
              onChange={(val) => setCampCategory(val as 'college' | 'corporate' | 'community')}
              options={[
                { value: 'community', label: 'Community' },
                { value: 'college', label: 'College' },
                { value: 'corporate', label: 'Corporate' },
              ]}
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={submitting}
              className="w-full min-h-[44px] rounded-xl bg-[#B3261E] hover:bg-[#961E17] text-white text-sm font-semibold shadow-[0_4px_14px_rgba(179,38,30,0.3)] transition-colors"
            >
              {submitting ? 'Creating...' : 'Create Camp'}
            </button>
          </div>
        </div>
      </form>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading ? (
          <div className="col-span-2 py-8 text-center text-sm text-[#57534E] dark:text-[#A8A29E]">Loading donation camps...</div>
        ) : camps.length === 0 ? (
          <div className="col-span-2 py-8 text-center text-sm text-[#57534E] dark:text-[#A8A29E]">No camps scheduled yet.</div>
        ) : (
          camps.map((camp) => (
            <div
              key={camp.id}
              className="rounded-[20px] ios-glass p-5 flex flex-col justify-between gap-4"
            >
              <div className="space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-base font-semibold text-[#1C1917] dark:text-[#F5F2EE]">{camp.title}</h3>
                  <span className="text-xs font-semibold uppercase text-[#155E3A] dark:text-[#7CE0A9]">
                    {camp.status}
                  </span>
                </div>
                <div className="text-xs text-[#57534E] dark:text-[#A8A29E] flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>
                    {camp.campDate} · {camp.startTime} – {camp.endTime}
                  </span>
                </div>
                <p className="text-sm text-[#1C1917] dark:text-[#F5F2EE]">
                  {camp.venue}, {camp.city}
                </p>
                {camp.organizer && (
                  <p className="text-xs text-[#57534E] dark:text-[#A8A29E]">Organizer: {camp.organizer}</p>
                )}
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-[#E2DDD6] dark:border-white/10">
                <span className="text-xs font-semibold tabular-nums">
                  {camp.unitsCollected && camp.unitsCollected > 0
                    ? `${camp.unitsCollected} units collected`
                    : `Slots: ${camp.slotsBooked} / ${camp.slotsTotal} booked`}
                  {camp.campCategory ? ` · ${camp.campCategory}` : ''}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setEditing(camp)}
                    className="min-h-[36px] px-2.5 rounded-xl border border-[#E2DDD6] dark:border-white/10 bg-white/70 dark:bg-[#141210]/70 text-xs font-medium inline-flex items-center gap-1 hover:bg-[#F3EFEA] dark:hover:bg-white/10 transition-colors"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                    <span>Edit</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(camp)}
                    aria-label={`Delete ${camp.title}`}
                    className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-xl border border-[#E6B8B5] dark:border-[#B3261E]/40 text-[#B3261E] dark:text-[#F28B82] hover:bg-[#FBEAE8] dark:hover:bg-[#3A1513] transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4" role="dialog" aria-modal="true">
          <form
            onSubmit={handleSaveEdit}
            className="w-full max-w-md rounded-[24px] ios-hero-glass p-6 space-y-3"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-[#1C1917] dark:text-[#F5F2EE]">Edit Camp</h3>
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-xl hover:bg-black/5 dark:hover:bg-white/10"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#57534E] dark:text-[#A8A29E] mb-1">Title</label>
              <input
                type="text"
                required
                value={editing.title}
                onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                className="w-full min-h-[44px] rounded-xl border border-[#E2DDD6] dark:border-white/10 bg-white/85 dark:bg-[#141210]/85 px-3 text-sm text-[#1C1917] dark:text-[#F5F2EE]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#57534E] dark:text-[#A8A29E] mb-1">Venue</label>
              <input
                type="text"
                required
                value={editing.venue}
                onChange={(e) => setEditing({ ...editing, venue: e.target.value })}
                className="w-full min-h-[44px] rounded-xl border border-[#E2DDD6] dark:border-white/10 bg-white/85 dark:bg-[#141210]/85 px-3 text-sm text-[#1C1917] dark:text-[#F5F2EE]"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[#57534E] dark:text-[#A8A29E] mb-1">Date</label>
                <GlassDatePicker
                  required
                  value={editing.campDate}
                  onChange={(val) => setEditing({ ...editing, campDate: val })}
                  ariaLabel="Camp Date"
                />
              </div>
              <div>
                <label htmlFor="admin-edit-camp-status" className="block text-xs font-medium text-[#57534E] dark:text-[#A8A29E] mb-1">Status</label>
                <GlassSelect
                  id="admin-edit-camp-status"
                  ariaLabel="Status"
                  value={editing.status}
                  onChange={(val) =>
                    setEditing({ ...editing, status: val as 'upcoming' | 'completed' | 'cancelled' })
                  }
                  options={[
                    { value: 'upcoming', label: 'Upcoming' },
                    { value: 'completed', label: 'Completed' },
                    { value: 'cancelled', label: 'Cancelled' },
                  ]}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="admin-edit-camp-cat" className="block text-xs font-medium text-[#57534E] dark:text-[#A8A29E] mb-1">Category</label>
                <GlassSelect
                  id="admin-edit-camp-cat"
                  ariaLabel="Category"
                  value={editing.campCategory || 'community'}
                  onChange={(val) =>
                    setEditing({
                      ...editing,
                      campCategory: val as 'college' | 'corporate' | 'community',
                    })
                  }
                  options={[
                    { value: 'community', label: 'Community' },
                    { value: 'college', label: 'College' },
                    { value: 'corporate', label: 'Corporate' },
                  ]}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#57534E] dark:text-[#A8A29E] mb-1">Units Collected</label>
                <input
                  type="number"
                  min={0}
                  max={5000}
                  value={editing.unitsCollected ?? 0}
                  onChange={(e) =>
                    setEditing({ ...editing, unitsCollected: Number(e.target.value) || 0 })
                  }
                  className="w-full min-h-[44px] rounded-xl border border-[#E2DDD6] dark:border-white/10 bg-white/85 dark:bg-[#141210]/85 px-3 text-sm text-[#1C1917] dark:text-[#F5F2EE] tabular-nums"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="min-h-[44px] px-4 rounded-xl border border-[#E2DDD6] dark:border-white/10 bg-white/80 dark:bg-[#141210]/85 text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="min-h-[44px] px-4 rounded-xl bg-[#B3261E] hover:bg-[#961E17] text-white text-sm font-semibold transition-colors"
              >
                Save Camp
              </button>
            </div>
          </form>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete donation camp?"
        message={deleteTarget ? `Remove "${deleteTarget.title}" scheduled for ${deleteTarget.campDate}?` : ''}
        confirmLabel="Delete Camp"
        busy={deleting}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
