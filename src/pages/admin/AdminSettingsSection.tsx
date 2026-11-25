import { useEffect, useState, type FormEvent } from 'react';
import { History, KeyRound, ShieldPlus, Trash2 } from 'lucide-react';
import { ConfirmDialog } from '../../components/ConfirmDialog.tsx';
import { api } from '../../lib/api.ts';
import type { AdminUserSession } from '../../shared/types.ts';

interface AdminSettingsSectionProps {
  token: string;
  currentAdmin: AdminUserSession;
  onToast: (type: 'success' | 'error', message: string) => void;
  onAuthError: (err: unknown) => void;
}

export function AdminSettingsSection({
  token,
  currentAdmin,
  onToast,
  onAuthError,
}: AdminSettingsSectionProps) {
  const [logs, setLogs] = useState<
    Array<{ id: string; actor: string; action: string; targetType: string; summary: string; createdAt: string }>
  >([]);
  const [admins, setAdmins] = useState<
    Array<{ id: string; name: string; email: string; status: 'active' | 'blocked'; created_at: string }>
  >([]);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  const [newAdminName, setNewAdminName] = useState('');
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminPass, setNewAdminPass] = useState('');
  const [creatingAdmin, setCreatingAdmin] = useState(false);

  const [deleteAdminTarget, setDeleteAdminTarget] = useState<{
    id: string;
    name: string;
    email: string;
  } | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function loadAll() {
    try {
      const [logsData, adminsData] = await Promise.all([
        api.getAdminAuditLogs(token),
        api.getAdmins(token),
      ]);
      setLogs(logsData.logs);
      setAdmins(adminsData.admins);
    } catch (err) {
      onAuthError(err);
    }
  }

  useEffect(() => {
    void loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handlePasswordChange(e: FormEvent) {
    e.preventDefault();
    setSavingPassword(true);
    try {
      await api.changeAdminPassword(token, currentPassword, newPassword);
      onToast('success', 'Your admin password has been updated.');
      setCurrentPassword('');
      setNewPassword('');
      await loadAll();
    } catch (err) {
      onToast('error', (err as Error).message);
    } finally {
      setSavingPassword(false);
    }
  }

  async function handleCreateAdmin(e: FormEvent) {
    e.preventDefault();
    setCreatingAdmin(true);
    try {
      await api.createAdmin(token, {
        name: newAdminName.trim(),
        email: newAdminEmail.trim(),
        password: newAdminPass,
      });
      onToast('success', `Created admin account ${newAdminEmail.trim()}.`);
      setNewAdminName('');
      setNewAdminEmail('');
      setNewAdminPass('');
      await loadAll();
    } catch (err) {
      onToast('error', (err as Error).message);
    } finally {
      setCreatingAdmin(false);
    }
  }

  async function toggleAdminStatus(id: string, currentStatus: 'active' | 'blocked') {
    const next = currentStatus === 'active' ? 'blocked' : 'active';
    try {
      await api.updateAdminStatus(token, id, next);
      onToast('success', `Updated admin status to ${next}.`);
      await loadAll();
    } catch (err) {
      onToast('error', (err as Error).message);
    }
  }

  async function confirmDeleteAdmin() {
    if (!deleteAdminTarget) return;
    setDeleting(true);
    try {
      await api.deleteAdmin(token, deleteAdminTarget.id);
      onToast('success', `Removed admin ${deleteAdminTarget.email}.`);
      setDeleteAdminTarget(null);
      await loadAll();
    } catch (err) {
      onToast('error', (err as Error).message);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Change Own Password */}
        <form
          onSubmit={handlePasswordChange}
          className="rounded-[20px] ios-glass p-5 sm:p-6 space-y-4"
        >
          <div className="flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-[#B3261E] dark:text-[#F28B82]" />
            <h2 className="text-base font-semibold text-[#1C1917] dark:text-[#F5F2EE]">Change Your Admin Password</h2>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#57534E] dark:text-[#A8A29E] mb-1">Current Password</label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full min-h-[44px] rounded-xl border border-[#E2DDD6] dark:border-white/10 bg-white/85 dark:bg-[#141210]/85 px-3 text-sm text-[#1C1917] dark:text-[#F5F2EE]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#57534E] dark:text-[#A8A29E] mb-1">
              New Password (min 8 characters)
            </label>
            <input
              type="password"
              required
              minLength={8}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full min-h-[44px] rounded-xl border border-[#E2DDD6] dark:border-white/10 bg-white/85 dark:bg-[#141210]/85 px-3 text-sm text-[#1C1917] dark:text-[#F5F2EE]"
            />
          </div>

          <button
            type="submit"
            disabled={savingPassword}
            className="min-h-[44px] px-4 rounded-xl border border-[#E2DDD6] dark:border-white/10 bg-white/85 dark:bg-[#141210]/85 text-[#1C1917] dark:text-[#F5F2EE] hover:border-[#B3261E]/50 text-sm font-semibold transition-colors"
          >
            {savingPassword ? 'Updating...' : 'Update Password'}
          </button>
        </form>

        {/* Add Other Admin */}
        <form
          onSubmit={handleCreateAdmin}
          className="rounded-[20px] ios-glass p-5 sm:p-6 space-y-4"
        >
          <div className="flex items-center gap-2">
            <ShieldPlus className="h-4 w-4 text-[#B3261E] dark:text-[#F28B82]" />
            <h2 className="text-base font-semibold text-[#1C1917] dark:text-[#F5F2EE]">Add Administrator Account</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#57534E] dark:text-[#A8A29E] mb-1">Full Name</label>
              <input
                type="text"
                required
                value={newAdminName}
                onChange={(e) => setNewAdminName(e.target.value)}
                placeholder="e.g. Regional Coordinator"
                className="w-full min-h-[44px] rounded-xl border border-[#E2DDD6] dark:border-white/10 bg-white/85 dark:bg-[#141210]/85 px-3 text-sm text-[#1C1917] dark:text-[#F5F2EE]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#57534E] dark:text-[#A8A29E] mb-1">Email</label>
              <input
                type="email"
                required
                value={newAdminEmail}
                onChange={(e) => setNewAdminEmail(e.target.value)}
                placeholder="coord@bloodportal.org"
                className="w-full min-h-[44px] rounded-xl border border-[#E2DDD6] dark:border-white/10 bg-white/85 dark:bg-[#141210]/85 px-3 text-sm text-[#1C1917] dark:text-[#F5F2EE]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#57534E] dark:text-[#A8A29E] mb-1">Initial Password (min 8 chars)</label>
            <input
              type="password"
              required
              minLength={8}
              value={newAdminPass}
              onChange={(e) => setNewAdminPass(e.target.value)}
              className="w-full min-h-[44px] rounded-xl border border-[#E2DDD6] dark:border-white/10 bg-white/85 dark:bg-[#141210]/85 px-3 text-sm text-[#1C1917] dark:text-[#F5F2EE]"
            />
          </div>

          <button
            type="submit"
            disabled={creatingAdmin}
            className="min-h-[44px] px-4 rounded-xl bg-[#B3261E] hover:bg-[#961E17] text-white text-sm font-semibold shadow-[0_4px_14px_rgba(179,38,30,0.3)] transition-colors"
          >
            {creatingAdmin ? 'Creating...' : 'Create Admin Account'}
          </button>
        </form>
      </div>

      {/* Admins Directory */}
      <div className="rounded-[20px] ios-glass p-5 sm:p-6 space-y-3 overflow-x-auto">
        <h2 className="text-base font-semibold text-[#1C1917] dark:text-[#F5F2EE]">Administrator Accounts</h2>
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-[#E2DDD6] dark:border-white/10 text-left text-xs uppercase text-[#57534E] dark:text-[#A8A29E]">
              <th className="py-2.5 pr-4">Name</th>
              <th className="py-2.5 pr-4">Email</th>
              <th className="py-2.5 pr-4">Status</th>
              <th className="py-2.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E2DDD6] dark:divide-white/10">
            {admins.map((a) => {
              const isSelf = a.id === currentAdmin.id;
              return (
                <tr key={a.id} className="hover:bg-[#FAF8F6]/60 dark:hover:bg-white/5 transition-colors">
                  <td className="py-2.5 pr-4 font-medium">
                    {a.name} {isSelf && <span className="text-xs text-[#B3261E] dark:text-[#F28B82]">(You)</span>}
                  </td>
                  <td className="py-2.5 pr-4 text-[#57534E] dark:text-[#A8A29E]">{a.email}</td>
                  <td className="py-2.5 pr-4 capitalize font-semibold text-xs">{a.status}</td>
                  <td className="py-2.5 text-right">
                    {!isSelf && (
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => void toggleAdminStatus(a.id, a.status)}
                          className="min-h-[34px] px-2.5 rounded-xl border border-[#E2DDD6] dark:border-white/10 bg-white/70 dark:bg-[#141210]/70 text-xs hover:bg-[#F3EFEA] dark:hover:bg-white/10 transition-colors"
                        >
                          {a.status === 'active' ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteAdminTarget({ id: a.id, name: a.name, email: a.email })}
                          aria-label={`Remove ${a.email}`}
                          className="min-h-[34px] min-w-[34px] flex items-center justify-center rounded-xl border border-[#E6B8B5] dark:border-[#B3261E]/40 text-[#B3261E] dark:text-[#F28B82] hover:bg-[#FBEAE8] dark:hover:bg-[#3A1513] transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Activity Audit Logs */}
      <div className="rounded-[20px] ios-glass p-5 sm:p-6 space-y-3">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-[#B3261E] dark:text-[#F28B82]" />
          <h2 className="text-base font-semibold text-[#1C1917] dark:text-[#F5F2EE]">Admin Activity Audit Logs</h2>
        </div>
        <div className="divide-y divide-[#E2DDD6] dark:divide-white/10 max-h-96 overflow-y-auto pr-1">
          {logs.map((log) => (
            <div key={log.id} className="py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm">
              <div>
                <span className="font-semibold text-[#1C1917] dark:text-[#F5F2EE]">{log.actor}</span>{' '}
                <span className="text-[#57534E] dark:text-[#A8A29E]">· {log.summary}</span>
              </div>
              <span className="text-xs text-[#A8A29E] tabular-nums">
                {log.createdAt.slice(0, 19).replace('T', ' ')}
              </span>
            </div>
          ))}
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(deleteAdminTarget)}
        title="Remove administrator?"
        message={
          deleteAdminTarget
            ? `Permanently delete admin account ${deleteAdminTarget.email}? They will lose access immediately.`
            : ''
        }
        confirmLabel="Remove Admin"
        busy={deleting}
        onConfirm={() => void confirmDeleteAdmin()}
        onCancel={() => setDeleteAdminTarget(null)}
      />
    </div>
  );
}
