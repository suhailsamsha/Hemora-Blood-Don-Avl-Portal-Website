import { useEffect, useState, type FormEvent } from 'react';
import { AlertTriangle, CheckCircle2, Edit3, Plus, Trash2, X } from 'lucide-react';
import { ConfirmDialog } from '../../components/ConfirmDialog.tsx';
import { GlassDatePicker } from '../../components/GlassDatePicker.tsx';
import { GlassSelect } from '../../components/GlassSelect.tsx';
import { api } from '../../lib/api.ts';
import {
  BLOOD_COMPONENTS,
  BLOOD_GROUPS,
  INDIAN_CITIES,
  type BloodCentreView,
  type BloodComponent,
  type BloodGroup,
  type BloodStockItem,
} from '../../shared/types.ts';

interface AdminStockSectionProps {
  token: string;
  onToast: (type: 'success' | 'error', message: string) => void;
  onAuthError: (err: unknown) => void;
}

export function AdminStockSection({ token, onToast, onAuthError }: AdminStockSectionProps) {
  const [stock, setStock] = useState<BloodStockItem[]>([]);
  const [centres, setCentres] = useState<BloodCentreView[]>([]);
  const [loading, setLoading] = useState(true);

  const today = new Date().toISOString().slice(0, 10);
  const plus30 = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);

  const [bloodGroup, setBloodGroup] = useState<BloodGroup>('O+');
  const [units, setUnits] = useState(5);
  const [component, setComponent] = useState<BloodComponent>('Whole Blood');
  const [centreId, setCentreId] = useState<string>('');
  const [location, setLocation] = useState('');
  const [city, setCity] = useState<string>(INDIAN_CITIES[0]);
  const [collectionDate, setCollectionDate] = useState(today);
  const [expiryDate, setExpiryDate] = useState(plus30);
  const [submitting, setSubmitting] = useState(false);

  const [editing, setEditing] = useState<BloodStockItem | null>(null);
  const [editUnits, setEditUnits] = useState(0);
  const [editExpiry, setEditExpiry] = useState('');

  const [deleteTarget, setDeleteTarget] = useState<BloodStockItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function loadStock() {
    setLoading(true);
    try {
      const [data, centresRes] = await Promise.all([
        api.getAdminStock(token),
        api.getCentres().catch(() => null),
      ]);
      setStock(data.stock);
      if (centresRes?.centres) {
        setCentres(centresRes.centres);
      }
    } catch (err) {
      onAuthError(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadStock();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.addAdminStock(token, {
        bloodGroup,
        units: Number(units),
        component,
        location: location.trim(),
        city,
        collectionDate,
        expiryDate,
        centreId: city === 'Mangaluru' && centreId ? centreId : undefined,
      });
      onToast('success', `Added ${units} unit(s) of ${bloodGroup} (${component}).`);
      setLocation('');
      setCentreId('');
      await loadStock();
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
      await api.updateAdminStock(token, editing.id, {
        units: Number(editUnits),
        expiryDate: editExpiry,
      });
      onToast('success', `Updated ${editing.bloodGroup} stock batch.`);
      setEditing(null);
      await loadStock();
    } catch (err) {
      onToast('error', (err as Error).message);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.deleteAdminStock(token, deleteTarget.id);
      onToast('success', `Removed ${deleteTarget.bloodGroup} batch from inventory.`);
      setDeleteTarget(null);
      await loadStock();
    } catch (err) {
      onToast('error', (err as Error).message);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Add Stock Form */}
      <form
        onSubmit={handleAdd}
        className="rounded-[20px] ios-glass p-5 sm:p-6 space-y-4"
      >
        <div className="flex items-center gap-2">
          <Plus className="h-4 w-4 text-[#B3261E] dark:text-[#F28B82]" aria-hidden="true" />
          <h2 className="text-base font-semibold text-[#1C1917] dark:text-[#F5F2EE]">Add Blood Stock Batch</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label htmlFor="admin-stock-bg" className="block text-xs font-medium text-[#57534E] dark:text-[#A8A29E] mb-1">Blood Group</label>
            <GlassSelect
              id="admin-stock-bg"
              ariaLabel="Blood Group"
              value={bloodGroup}
              onChange={(val) => setBloodGroup(val as BloodGroup)}
              options={BLOOD_GROUPS}
            />
          </div>

          <div>
            <label htmlFor="admin-stock-comp" className="block text-xs font-medium text-[#57534E] dark:text-[#A8A29E] mb-1">Component</label>
            <GlassSelect
              id="admin-stock-comp"
              ariaLabel="Component"
              value={component}
              onChange={(val) => setComponent(val as BloodComponent)}
              options={BLOOD_COMPONENTS}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#57534E] dark:text-[#A8A29E] mb-1">Units</label>
            <input
              type="number"
              min={0}
              max={500}
              required
              value={units}
              onChange={(e) => setUnits(Number(e.target.value))}
              className="w-full min-h-[44px] rounded-xl border border-[#E2DDD6] dark:border-white/10 bg-white/85 dark:bg-[#141210]/85 px-3 text-sm text-[#1C1917] dark:text-[#F5F2EE] tabular-nums"
            />
          </div>

          <div>
            <label htmlFor="admin-stock-city" className="block text-xs font-medium text-[#57534E] dark:text-[#A8A29E] mb-1">City</label>
            <GlassSelect
              id="admin-stock-city"
              ariaLabel="City"
              value={city}
              onChange={(val) => {
                setCity(val);
                if (val !== 'Mangaluru') setCentreId('');
              }}
              options={INDIAN_CITIES}
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-[#57534E] dark:text-[#A8A29E] mb-1">
              Blood Bank / Storage Location
            </label>
            {city === 'Mangaluru' && centres.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <GlassSelect
                  ariaLabel="Select Mangaluru centre"
                  value={centreId}
                  onChange={(nextId) => {
                    setCentreId(nextId);
                    const matched = centres.find((c) => c.id === nextId);
                    if (matched) setLocation(matched.name);
                  }}
                  options={[
                    { value: '', label: 'Custom location...' },
                    ...centres.map((c) => ({
                      value: c.id,
                      label: `${c.name} (${c.area})`,
                    })),
                  ]}
                />
                <input
                  type="text"
                  required
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Wenlock District Hospital Blood Bank"
                  className="w-full min-h-[44px] rounded-xl border border-[#E2DDD6] dark:border-white/10 bg-white/85 dark:bg-[#141210]/85 px-3 text-sm text-[#1C1917] dark:text-[#F5F2EE]"
                />
              </div>
            ) : (
              <input
                type="text"
                required
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Wenlock District Hospital Blood Bank"
                className="w-full min-h-[44px] rounded-xl border border-[#E2DDD6] dark:border-white/10 bg-white/85 dark:bg-[#141210]/85 px-3 text-sm text-[#1C1917] dark:text-[#F5F2EE]"
              />
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-[#57534E] dark:text-[#A8A29E] mb-1">
              Collection Date
            </label>
            <GlassDatePicker
              required
              value={collectionDate}
              onChange={setCollectionDate}
              ariaLabel="Collection Date"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#57534E] dark:text-[#A8A29E] mb-1">Expiry Date</label>
            <GlassDatePicker
              required
              value={expiryDate}
              onChange={setExpiryDate}
              ariaLabel="Expiry Date"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={submitting}
            className="min-h-[44px] px-5 rounded-xl bg-[#B3261E] hover:bg-[#961E17] text-white text-sm font-semibold disabled:opacity-60 shadow-[0_4px_14px_rgba(179,38,30,0.3)] transition-colors"
          >
            {submitting ? 'Saving...' : 'Add Inventory Batch'}
          </button>
        </div>
      </form>

      {/* Inventory Table */}
      <div className="rounded-[20px] ios-glass overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-[#E2DDD6] dark:border-white/10 text-left text-xs uppercase tracking-wider text-[#57534E] dark:text-[#A8A29E]">
              <th className="py-3 px-4">Group & Component</th>
              <th className="py-3 px-4">Units</th>
              <th className="py-3 px-4">Blood Bank & City</th>
              <th className="py-3 px-4">Collection / Expiry</th>
              <th className="py-3 px-4">Condition</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E2DDD6] dark:divide-white/10">
            {loading ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-[#57534E] dark:text-[#A8A29E]">
                  Loading blood stock inventory...
                </td>
              </tr>
            ) : stock.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-[#57534E] dark:text-[#A8A29E]">
                  No inventory batches recorded.
                </td>
              </tr>
            ) : (
              stock.map((item) => (
                <tr
                  key={item.id}
                  className={
                    item.isExpired
                      ? 'bg-[#FBEAE8]/50 dark:bg-[#3A1513]/35'
                      : item.isLowStock
                        ? 'bg-[#FDF7E8]/60 dark:bg-[#2C2412]/35'
                        : 'hover:bg-[#FAF8F6]/60 dark:hover:bg-white/5 transition-colors'
                  }
                >
                  <td className="py-3 px-4">
                    <div className="font-bold text-[#B3261E] dark:text-[#F28B82]">{item.bloodGroup}</div>
                    <div className="text-xs text-[#57534E] dark:text-[#A8A29E]">{item.component}</div>
                  </td>
                  <td className="py-3 px-4 font-semibold tabular-nums">{item.units}</td>
                  <td className="py-3 px-4">
                    <div className="font-medium text-[#1C1917] dark:text-[#F5F2EE]">{item.location}</div>
                    <div className="text-xs text-[#57534E] dark:text-[#A8A29E]">{item.city}</div>
                  </td>
                  <td className="py-3 px-4 text-xs tabular-nums">
                    <div>Collected: {item.collectionDate}</div>
                    <div>Expires: {item.expiryDate}</div>
                  </td>
                  <td className="py-3 px-4">
                    {item.isExpired ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#B3261E] dark:text-[#F28B82]">
                        <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Expired</span>
                      </span>
                    ) : item.isLowStock ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#9A5B00] dark:text-[#F6C86E]">
                        <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Low Stock</span>
                      </span>
                    ) : item.isExpiringSoon ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#9A5B00] dark:text-[#F6C86E]">
                        <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Expiring Soon</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#155E3A] dark:text-[#7CE0A9]">
                        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Healthy</span>
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="inline-flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setEditing(item);
                          setEditUnits(item.units);
                          setEditExpiry(item.expiryDate);
                        }}
                        className="min-h-[36px] px-2.5 rounded-xl border border-[#E2DDD6] dark:border-white/10 bg-white/70 dark:bg-[#141210]/70 text-xs font-medium inline-flex items-center gap-1 hover:bg-[#F3EFEA] dark:hover:bg-white/10 transition-colors"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                        <span>Edit</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(item)}
                        aria-label={`Delete ${item.bloodGroup} stock`}
                        className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-xl border border-[#E6B8B5] dark:border-[#B3261E]/40 text-[#B3261E] dark:text-[#F28B82] hover:bg-[#FBEAE8] dark:hover:bg-[#3A1513] transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Edit Stock Modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4" role="dialog" aria-modal="true">
          <form
            onSubmit={handleSaveEdit}
            className="w-full max-w-sm rounded-[24px] ios-hero-glass p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-[#1C1917] dark:text-[#F5F2EE]">
                Update {editing.bloodGroup} ({editing.component})
              </h3>
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-xl hover:bg-black/5 dark:hover:bg-white/10"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#57534E] dark:text-[#A8A29E] mb-1">Units</label>
              <input
                type="number"
                min={0}
                max={500}
                required
                value={editUnits}
                onChange={(e) => setEditUnits(Number(e.target.value))}
                className="w-full min-h-[44px] rounded-xl border border-[#E2DDD6] dark:border-white/10 bg-white/85 dark:bg-[#141210]/85 px-3 text-sm text-[#1C1917] dark:text-[#F5F2EE]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#57534E] dark:text-[#A8A29E] mb-1">Expiry Date</label>
              <GlassDatePicker
                required
                value={editExpiry}
                onChange={setEditExpiry}
                ariaLabel="Expiry Date"
              />
            </div>
            <div className="flex justify-end gap-2">
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
                Save Changes
              </button>
            </div>
          </form>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete blood stock batch?"
        message={
          deleteTarget
            ? `Remove ${deleteTarget.units} unit(s) of ${deleteTarget.bloodGroup} at ${deleteTarget.location}?`
            : ''
        }
        confirmLabel="Delete Batch"
        busy={deleting}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
