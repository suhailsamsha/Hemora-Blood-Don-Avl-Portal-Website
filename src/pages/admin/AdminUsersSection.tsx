import { useEffect, useState } from 'react';
import { Ban, CheckCircle2, Eye, Search, ShieldCheck, Trash2, X } from 'lucide-react';
import { ConfirmDialog } from '../../components/ConfirmDialog.tsx';
import { GlassSelect } from '../../components/GlassSelect.tsx';
import { api } from '../../lib/api.ts';
import type { ManagedUserRecord } from '../../shared/types.ts';

interface AdminUsersSectionProps {
  token: string;
  onToast: (type: 'success' | 'error', message: string) => void;
  onAuthError: (err: unknown) => void;
}

export function AdminUsersSection({ token, onToast, onAuthError }: AdminUsersSectionProps) {
  const [users, setUsers] = useState<ManagedUserRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<ManagedUserRecord | null>(null);
  const [confirmState, setConfirmState] = useState<{
    open: boolean;
    title: string;
    message: string;
    confirmLabel: string;
    onConfirm: () => Promise<void>;
  } | null>(null);
  const [busyAction, setBusyAction] = useState(false);

  async function loadUsers(targetPage = page) {
    setLoading(true);
    try {
      const data = await api.getAdminUsers(token, {
        search: search.trim(),
        role: roleFilter,
        status: statusFilter,
        page: targetPage,
        limit: 10,
      });
      setUsers(data.users);
      setTotal(data.total);
      setPage(data.page);
      setTotalPages(data.totalPages);
    } catch (err) {
      onAuthError(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadUsers(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roleFilter, statusFilter]);

  async function runAction(
    user: ManagedUserRecord,
    action: 'verify' | 'unverify' | 'block' | 'unblock'
  ) {
    try {
      await api.moderateAdminUser(token, user.source, user.id, action);
      onToast('success', `Updated ${user.name} (${action}).`);
      await loadUsers(page);
    } catch (err) {
      onAuthError(err);
      onToast('error', (err as Error).message);
    }
  }

  function promptBlock(user: ManagedUserRecord) {
    const blocking = !user.blocked;
    setConfirmState({
      open: true,
      title: blocking ? 'Block account?' : 'Unblock account?',
      message: blocking
        ? `Blocking ${user.name} prevents them from appearing in search or logging in.`
        : `Restore active access for ${user.name}?`,
      confirmLabel: blocking ? 'Block Account' : 'Unblock Account',
      onConfirm: async () => {
        setBusyAction(true);
        try {
          await api.moderateAdminUser(token, user.source, user.id, blocking ? 'block' : 'unblock');
          onToast('success', `${blocking ? 'Blocked' : 'Unblocked'} ${user.name}.`);
          setConfirmState(null);
          await loadUsers(page);
        } catch (err) {
          onToast('error', (err as Error).message);
        } finally {
          setBusyAction(false);
        }
      },
    });
  }

  function promptDelete(user: ManagedUserRecord) {
    setConfirmState({
      open: true,
      title: 'Delete user permanently?',
      message: `Are you sure you want to delete ${user.name} (${user.role})? This action cannot be undone.`,
      confirmLabel: 'Delete Permanently',
      onConfirm: async () => {
        setBusyAction(true);
        try {
          await api.deleteAdminUser(token, user.source, user.id);
          onToast('success', `Deleted ${user.name}.`);
          setConfirmState(null);
          await loadUsers(page);
        } catch (err) {
          onToast('error', (err as Error).message);
        } finally {
          setBusyAction(false);
        }
      },
    });
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="rounded-[20px] ios-glass p-4 flex flex-wrap items-center gap-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void loadUsers(1);
          }}
          className="flex-1 min-w-[220px] flex items-center gap-2"
        >
          <div className="relative flex-1">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#57534E] dark:text-[#A8A29E]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, city, blood group, or email..."
              className="w-full min-h-[44px] rounded-xl border border-[#E2DDD6] dark:border-white/10 bg-white/85 dark:bg-[#141210]/85 pl-9 pr-3 text-sm text-[#1C1917] dark:text-[#F5F2EE] focus:outline-none focus:ring-2 focus:ring-[#B3261E]/70"
            />
          </div>
          <button
            type="submit"
            className="min-h-[44px] px-4 rounded-xl bg-[#B3261E] hover:bg-[#961E17] text-white text-sm font-semibold transition-colors"
          >
            Search
          </button>
        </form>

        <GlassSelect
          ariaLabel="Filter by role"
          value={roleFilter}
          onChange={setRoleFilter}
          className="min-w-[190px]"
          options={[
            { value: 'ALL', label: 'All Roles' },
            { value: 'donor', label: 'Donors' },
            { value: 'hospital', label: 'Hospitals / Blood Banks' },
            { value: 'recipient', label: 'Recipients' },
          ]}
        />

        <GlassSelect
          ariaLabel="Filter by status"
          value={statusFilter}
          onChange={setStatusFilter}
          className="min-w-[170px]"
          options={[
            { value: 'ALL', label: 'All Statuses' },
            { value: 'active', label: 'Active / Verified' },
            { value: 'pending', label: 'Pending Approval' },
            { value: 'blocked', label: 'Blocked' },
          ]}
        />
      </div>

      {/* Table */}
      <div className="rounded-[20px] ios-glass overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-[#E2DDD6] dark:border-white/10 text-left text-xs uppercase tracking-wider text-[#57534E] dark:text-[#A8A29E]">
              <th className="py-3 px-4">User / Organization</th>
              <th className="py-3 px-4">Role</th>
              <th className="py-3 px-4">Location</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E2DDD6] dark:divide-white/10">
            {loading ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-[#57534E] dark:text-[#A8A29E]">
                  Loading user directory...
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-[#57534E] dark:text-[#A8A29E]">
                  No matching donors, recipients, or hospitals found.
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={`${u.source}-${u.id}`} className="hover:bg-[#FAF8F6]/60 dark:hover:bg-white/5 transition-colors">
                  <td className="py-3 px-4">
                    <div className="font-semibold text-[#1C1917] dark:text-[#F5F2EE] flex items-center gap-2">
                      <span>{u.name}</span>
                      {u.bloodGroup && (
                        <span className="text-xs font-bold text-[#B3261E] dark:text-[#F28B82]">
                          {u.bloodGroup}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-[#57534E] dark:text-[#A8A29E]">{u.emailOrPhone}</div>
                  </td>
                  <td className="py-3 px-4 capitalize text-[#1C1917] dark:text-[#F5F2EE]">{u.role}</td>
                  <td className="py-3 px-4 text-[#57534E] dark:text-[#A8A29E]">
                    {u.area ? `${u.area}, ${u.city}` : u.city || '—'}
                  </td>
                  <td className="py-3 px-4">
                    {u.blocked ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#B3261E] dark:text-[#F28B82]">
                        <Ban className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Blocked</span>
                      </span>
                    ) : u.verified ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#155E3A] dark:text-[#7CE0A9]">
                        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Verified</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#9A5B00] dark:text-[#F6C86E]">
                        <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Pending</span>
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-end gap-1.5 flex-wrap">
                      <button
                        type="button"
                        onClick={() => setSelectedUser(u)}
                        className="min-h-[36px] px-2.5 rounded-xl border border-[#E2DDD6] dark:border-white/10 bg-white/70 dark:bg-[#141210]/70 text-xs font-medium inline-flex items-center gap-1 hover:bg-[#F3EFEA] dark:hover:bg-white/10 transition-colors"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span>View</span>
                      </button>

                      {u.verified ? (
                        <button
                          type="button"
                          onClick={() => void runAction(u, 'unverify')}
                          className="min-h-[36px] px-2.5 rounded-xl border border-[#E2DDD6] dark:border-white/10 bg-white/70 dark:bg-[#141210]/70 text-xs font-medium hover:bg-[#F3EFEA] dark:hover:bg-white/10 transition-colors"
                        >
                          Unverify
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => void runAction(u, 'verify')}
                          className="min-h-[36px] px-2.5 rounded-xl bg-[#1D6B44] hover:bg-[#165435] text-white text-xs font-semibold transition-colors"
                        >
                          Approve
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => promptBlock(u)}
                        className="min-h-[36px] px-2.5 rounded-xl border border-[#E2DDD6] dark:border-white/10 bg-white/70 dark:bg-[#141210]/70 text-xs font-medium hover:bg-[#F3EFEA] dark:hover:bg-white/10 transition-colors"
                      >
                        {u.blocked ? 'Unblock' : 'Block'}
                      </button>

                      <button
                        type="button"
                        onClick={() => promptDelete(u)}
                        aria-label={`Delete ${u.name}`}
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

      {/* Pagination */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#57534E] dark:text-[#A8A29E]">
        <span>
          Showing page {page} of {totalPages} ({total} total records)
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => void loadUsers(page - 1)}
            className="min-h-[38px] px-3.5 rounded-xl border border-[#E2DDD6] dark:border-white/10 bg-white/80 dark:bg-[#141210]/85 disabled:opacity-40 transition-colors"
          >
            Previous
          </button>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => void loadUsers(page + 1)}
            className="min-h-[38px] px-3.5 rounded-xl border border-[#E2DDD6] dark:border-white/10 bg-white/80 dark:bg-[#141210]/85 disabled:opacity-40 transition-colors"
          >
            Next
          </button>
        </div>
      </div>

      {/* View User Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-[24px] ios-hero-glass p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-[#1C1917] dark:text-[#F5F2EE]">{selectedUser.name}</h3>
              <button
                type="button"
                onClick={() => setSelectedUser(null)}
                className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-xl hover:bg-black/5 dark:hover:bg-white/10"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-xs text-[#57534E] dark:text-[#A8A29E]">Role</dt>
                <dd className="font-medium capitalize">{selectedUser.role}</dd>
              </div>
              <div>
                <dt className="text-xs text-[#57534E] dark:text-[#A8A29E]">Contact</dt>
                <dd className="font-medium break-all">{selectedUser.emailOrPhone}</dd>
              </div>
              <div>
                <dt className="text-xs text-[#57534E] dark:text-[#A8A29E]">City / Area</dt>
                <dd className="font-medium">{selectedUser.area ? `${selectedUser.area}, ${selectedUser.city}` : selectedUser.city}</dd>
              </div>
              <div>
                <dt className="text-xs text-[#57534E] dark:text-[#A8A29E]">Status</dt>
                <dd className="font-medium capitalize">{selectedUser.status}</dd>
              </div>
              {selectedUser.bloodGroup && (
                <>
                  <div>
                    <dt className="text-xs text-[#57534E] dark:text-[#A8A29E]">Blood Group</dt>
                    <dd className="font-bold text-[#B3261E] dark:text-[#F28B82]">{selectedUser.bloodGroup}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-[#57534E] dark:text-[#A8A29E]">Last Donation</dt>
                    <dd className="font-medium">{selectedUser.lastDonation || 'None recorded'}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-[#57534E] dark:text-[#A8A29E]">Next Eligible</dt>
                    <dd className="font-medium">{selectedUser.nextEligibleDate || 'Eligible now'}</dd>
                  </div>
                </>
              )}
            </dl>
          </div>
        </div>
      )}

      {confirmState && (
        <ConfirmDialog
          open={confirmState.open}
          title={confirmState.title}
          message={confirmState.message}
          confirmLabel={confirmState.confirmLabel}
          busy={busyAction}
          onConfirm={() => void confirmState.onConfirm()}
          onCancel={() => setConfirmState(null)}
        />
      )}
    </div>
  );
}
