import { useEffect, useState, type FormEvent } from 'react';
import { Check, CheckCircle2, UserPlus, X, XCircle } from 'lucide-react';
import { GlassSelect } from '../../components/GlassSelect.tsx';
import { api } from '../../lib/api.ts';
import type { BloodRequest } from '../../shared/types.ts';

interface AdminRequestsSectionProps {
  token: string;
  onToast: (type: 'success' | 'error', message: string) => void;
  onAuthError: (err: unknown) => void;
}

export function AdminRequestsSection({ token, onToast, onAuthError }: AdminRequestsSectionProps) {
  const [requests, setRequests] = useState<BloodRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('ALL');

  const [rejectTarget, setRejectTarget] = useState<BloodRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const [assignTarget, setAssignTarget] = useState<BloodRequest | null>(null);
  const [assignedTo, setAssignedTo] = useState('');

  async function loadRequests() {
    setLoading(true);
    try {
      const data = await api.getAdminRequests(token);
      setRequests(data.requests);
    } catch (err) {
      onAuthError(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleQuickAction(id: string, action: 'approve' | 'fulfill') {
    try {
      await api.moderateAdminRequest(token, id, { action });
      onToast('success', action === 'approve' ? 'Request approved.' : 'Request marked as fulfilled.');
      await loadRequests();
    } catch (err) {
      onToast('error', (err as Error).message);
    }
  }

  async function handleRejectSubmit(e: FormEvent) {
    e.preventDefault();
    if (!rejectTarget) return;
    try {
      await api.moderateAdminRequest(token, rejectTarget.id, {
        action: 'reject',
        rejectionReason: rejectionReason.trim(),
      });
      onToast('success', 'Request rejected.');
      setRejectTarget(null);
      setRejectionReason('');
      await loadRequests();
    } catch (err) {
      onToast('error', (err as Error).message);
    }
  }

  async function handleAssignSubmit(e: FormEvent) {
    e.preventDefault();
    if (!assignTarget) return;
    try {
      await api.moderateAdminRequest(token, assignTarget.id, {
        action: 'assign',
        assignedTo: assignedTo.trim(),
      });
      onToast('success', `Assigned request to ${assignedTo.trim()}.`);
      setAssignTarget(null);
      setAssignedTo('');
      await loadRequests();
    } catch (err) {
      onToast('error', (err as Error).message);
    }
  }

  const filtered = requests.filter((r) => {
    if (filterStatus === 'ALL') return true;
    if (filterStatus === 'fulfilled') return r.status === 'fulfilled';
    if (filterStatus === 'pending') return r.approvalStatus === 'pending' && r.status === 'open';
    if (filterStatus === 'approved') return r.approvalStatus === 'approved' && r.status !== 'fulfilled';
    if (filterStatus === 'rejected') return r.approvalStatus === 'rejected';
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="rounded-[20px] ios-glass p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm font-medium text-[#57534E] dark:text-[#A8A29E]">
          Filter requests by workflow state
        </div>
        <GlassSelect
          ariaLabel="Filter blood requests"
          value={filterStatus}
          onChange={setFilterStatus}
          className="min-w-[200px]"
          options={[
            { value: 'ALL', label: `All Requests (${requests.length})` },
            { value: 'pending', label: 'Pending Approval' },
            { value: 'approved', label: 'Approved' },
            { value: 'rejected', label: 'Rejected' },
            { value: 'fulfilled', label: 'Fulfilled' },
          ]}
        />
      </div>

      <div className="rounded-[20px] ios-glass overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-[#E2DDD6] dark:border-white/10 text-left text-xs uppercase tracking-wider text-[#57534E] dark:text-[#A8A29E]">
              <th className="py-3 px-4">Blood Need</th>
              <th className="py-3 px-4">Hospital & Requester</th>
              <th className="py-3 px-4">Urgency</th>
              <th className="py-3 px-4">Approval / Fulfillment</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E2DDD6] dark:divide-white/10">
            {loading ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-[#57534E] dark:text-[#A8A29E]">
                  Loading blood requests...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-[#57534E] dark:text-[#A8A29E]">
                  No requests match this filter.
                </td>
              </tr>
            ) : (
              filtered.map((r) => (
                <tr key={r.id} className="hover:bg-[#FAF8F6]/60 dark:hover:bg-white/5 transition-colors">
                  <td className="py-3 px-4">
                    <div className="font-bold text-[#B3261E] dark:text-[#F28B82]">
                      {r.bloodGroup} · {r.units} unit(s)
                    </div>
                    <div className="text-xs text-[#57534E] dark:text-[#A8A29E]">{r.city}</div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-medium text-[#1C1917] dark:text-[#F5F2EE]">{r.hospital}</div>
                    <div className="text-xs text-[#57534E] dark:text-[#A8A29E]">
                      Requester: {r.requesterName}
                    </div>
                    {r.assignedTo && (
                      <div className="text-xs font-medium text-[#155E3A] dark:text-[#7CE0A9]">
                        Assigned: {r.assignedTo}
                      </div>
                    )}
                    {r.rejectionReason && (
                      <div className="text-xs text-[#B3261E] dark:text-[#F28B82]">
                        Reason: {r.rejectionReason}
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`text-xs font-semibold uppercase ${
                        r.urgency === 'critical'
                          ? 'text-[#B3261E] dark:text-[#F28B82]'
                          : r.urgency === 'urgent'
                            ? 'text-[#9A5B00] dark:text-[#F6C86E]'
                            : 'text-[#57534E] dark:text-[#A8A29E]'
                      }`}
                    >
                      {r.urgency}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    {r.status === 'fulfilled' ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#155E3A] dark:text-[#7CE0A9]">
                        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Fulfilled</span>
                      </span>
                    ) : r.approvalStatus === 'rejected' ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#B3261E] dark:text-[#F28B82]">
                        <XCircle className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Rejected</span>
                      </span>
                    ) : r.approvalStatus === 'approved' ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#155E3A] dark:text-[#7CE0A9]">
                        <Check className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Approved ({r.status})</span>
                      </span>
                    ) : (
                      <span className="text-xs font-semibold text-[#9A5B00] dark:text-[#F6C86E]">
                        Pending Approval
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="inline-flex items-center justify-end gap-1.5 flex-wrap">
                      {r.approvalStatus !== 'approved' && r.status !== 'fulfilled' && (
                        <button
                          type="button"
                          onClick={() => void handleQuickAction(r.id, 'approve')}
                          className="min-h-[36px] px-2.5 rounded-xl bg-[#1D6B44] hover:bg-[#165435] text-white text-xs font-semibold transition-colors"
                        >
                          Approve
                        </button>
                      )}

                      {r.status !== 'fulfilled' && (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setAssignTarget(r);
                              setAssignedTo(r.assignedTo || '');
                            }}
                            className="min-h-[36px] px-2.5 rounded-xl border border-[#E2DDD6] dark:border-white/10 bg-white/70 dark:bg-[#141210]/70 text-xs font-medium inline-flex items-center gap-1 hover:bg-[#F3EFEA] dark:hover:bg-white/10 transition-colors"
                          >
                            <UserPlus className="h-3.5 w-3.5" />
                            <span>Assign</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => void handleQuickAction(r.id, 'fulfill')}
                            className="min-h-[36px] px-2.5 rounded-xl border border-[#E2DDD6] dark:border-white/10 bg-white/70 dark:bg-[#141210]/70 text-xs font-medium hover:bg-[#F3EFEA] dark:hover:bg-white/10 transition-colors"
                          >
                            Mark Fulfilled
                          </button>

                          {r.approvalStatus !== 'rejected' && (
                            <button
                              type="button"
                              onClick={() => {
                                setRejectTarget(r);
                                setRejectionReason('');
                              }}
                              className="min-h-[36px] px-2.5 rounded-xl border border-[#E6B8B5] dark:border-[#B3261E]/40 text-[#B3261E] dark:text-[#F28B82] text-xs font-medium hover:bg-[#FBEAE8] dark:hover:bg-[#3A1513] transition-colors"
                            >
                              Reject
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Reject Reason Modal */}
      {rejectTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4" role="dialog" aria-modal="true">
          <form
            onSubmit={handleRejectSubmit}
            className="w-full max-w-md rounded-[24px] ios-hero-glass p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-[#1C1917] dark:text-[#F5F2EE]">Reject Blood Request</h3>
              <button
                type="button"
                onClick={() => setRejectTarget(null)}
                className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-xl hover:bg-black/5 dark:hover:bg-white/10"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-xs text-[#57534E] dark:text-[#A8A29E]">
              {rejectTarget.bloodGroup} at {rejectTarget.hospital} ({rejectTarget.city})
            </p>
            <div>
              <label className="block text-xs font-medium text-[#57534E] dark:text-[#A8A29E] mb-1">Reason for rejection</label>
              <textarea
                rows={3}
                required
                minLength={3}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="e.g. Duplicate emergency entry or hospital details unverified"
                className="w-full rounded-xl border border-[#E2DDD6] dark:border-white/10 bg-white/85 dark:bg-[#141210]/85 p-3 text-sm text-[#1C1917] dark:text-[#F5F2EE]"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRejectTarget(null)}
                className="min-h-[44px] px-4 rounded-xl border border-[#E2DDD6] dark:border-white/10 bg-white/80 dark:bg-[#141210]/85 text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="min-h-[44px] px-4 rounded-xl bg-[#B3261E] hover:bg-[#961E17] text-white text-sm font-semibold transition-colors"
              >
                Confirm Reject
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Assign Donor / Blood Bank Modal */}
      {assignTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4" role="dialog" aria-modal="true">
          <form
            onSubmit={handleAssignSubmit}
            className="w-full max-w-md rounded-[24px] ios-hero-glass p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-[#1C1917] dark:text-[#F5F2EE]">Assign Donor or Blood Bank</h3>
              <button
                type="button"
                onClick={() => setAssignTarget(null)}
                className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-xl hover:bg-black/5 dark:hover:bg-white/10"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-xs text-[#57534E] dark:text-[#A8A29E]">
              {assignTarget.bloodGroup} ({assignTarget.units} units) · {assignTarget.hospital},{' '}
              {assignTarget.city}
            </p>
            <div>
              <label className="block text-xs font-medium text-[#57534E] dark:text-[#A8A29E] mb-1">Donor Name or Blood Bank</label>
              <input
                type="text"
                required
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                placeholder="e.g. Wenlock District Hospital Blood Bank / Rakshith S."
                className="w-full min-h-[44px] rounded-xl border border-[#E2DDD6] dark:border-white/10 bg-white/85 dark:bg-[#141210]/85 px-3 text-sm text-[#1C1917] dark:text-[#F5F2EE]"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setAssignTarget(null)}
                className="min-h-[44px] px-4 rounded-xl border border-[#E2DDD6] dark:border-white/10 bg-white/80 dark:bg-[#141210]/85 text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="min-h-[44px] px-4 rounded-xl bg-[#B3261E] hover:bg-[#961E17] text-white text-sm font-semibold transition-colors"
              >
                Save Assignment
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
