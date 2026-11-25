import { useEffect, useState, type FormEvent } from 'react';
import { Bell, Send } from 'lucide-react';
import { GlassSelect } from '../../components/GlassSelect.tsx';
import { api } from '../../lib/api.ts';
import { BLOOD_GROUPS, INDIAN_CITIES, type AdminNotificationItem } from '../../shared/types.ts';

interface AdminNotificationsSectionProps {
  token: string;
  onToast: (type: 'success' | 'error', message: string) => void;
  onAuthError: (err: unknown) => void;
}

export function AdminNotificationsSection({
  token,
  onToast,
  onAuthError,
}: AdminNotificationsSectionProps) {
  const [history, setHistory] = useState<AdminNotificationItem[]>([]);
  const [channel, setChannel] = useState<'email' | 'in_app' | 'sms' | 'whatsapp'>('in_app');
  const [bloodGroup, setBloodGroup] = useState('ALL');
  const [city, setCity] = useState('ALL');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  async function loadHistory() {
    try {
      const data = await api.getAdminNotifications(token);
      setHistory(data.notifications);
    } catch (err) {
      onAuthError(err);
    }
  }

  useEffect(() => {
    void loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSend(e: FormEvent) {
    e.preventDefault();
    setSending(true);
    try {
      const res = await api.sendAdminNotification(token, {
        channel,
        bloodGroup,
        city,
        subject: subject.trim(),
        message: message.trim(),
      });
      onToast('success', `Alert sent to ${res.recipientsCount} eligible donor(s).`);
      setSubject('');
      setMessage('');
      await loadHistory();
    } catch (err) {
      onToast('error', (err as Error).message);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-6">
      <form
        onSubmit={handleSend}
        className="rounded-[20px] ios-glass p-5 sm:p-6 space-y-4"
      >
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-[#B3261E] dark:text-[#F28B82]" />
          <h2 className="text-base font-semibold text-[#1C1917] dark:text-[#F5F2EE]">Broadcast Urgent Alert to Eligible Donors</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label htmlFor="admin-notif-channel" className="block text-xs font-medium text-[#57534E] dark:text-[#A8A29E] mb-1">Channel</label>
            <GlassSelect
              id="admin-notif-channel"
              ariaLabel="Channel"
              value={channel}
              onChange={(val) => setChannel(val as 'email' | 'in_app' | 'sms' | 'whatsapp')}
              options={[
                { value: 'in_app', label: 'In-App Donor Inbox' },
                { value: 'email', label: 'Email + Donor Inbox' },
                { value: 'sms', label: 'SMS Gateway' },
                { value: 'whatsapp', label: 'WhatsApp Alert' },
              ]}
            />
          </div>

          <div>
            <label htmlFor="admin-notif-bg" className="block text-xs font-medium text-[#57534E] dark:text-[#A8A29E] mb-1">Target Blood Group</label>
            <GlassSelect
              id="admin-notif-bg"
              ariaLabel="Target Blood Group"
              value={bloodGroup}
              onChange={setBloodGroup}
              options={[
                { value: 'ALL', label: 'All Blood Groups' },
                ...BLOOD_GROUPS.map((bg) => ({ value: bg, label: bg })),
              ]}
            />
          </div>

          <div>
            <label htmlFor="admin-notif-city" className="block text-xs font-medium text-[#57534E] dark:text-[#A8A29E] mb-1">Target City</label>
            <GlassSelect
              id="admin-notif-city"
              ariaLabel="Target City"
              value={city}
              onChange={setCity}
              options={[
                { value: 'ALL', label: 'All Cities' },
                ...INDIAN_CITIES.map((c) => ({ value: c, label: c })),
              ]}
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-[#57534E] dark:text-[#A8A29E] mb-1">Alert Subject</label>
          <input
            type="text"
            required
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="e.g. Urgent A+ units needed at Lady Goschen Hospital, Hampankatta"
            className="w-full min-h-[44px] rounded-xl border border-[#E2DDD6] dark:border-white/10 bg-white/85 dark:bg-[#141210]/85 px-3 text-sm text-[#1C1917] dark:text-[#F5F2EE]"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-[#57534E] dark:text-[#A8A29E] mb-1">Message</label>
          <textarea
            rows={3}
            required
            minLength={5}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Share clear hospital ward, contact timing, and eligibility note..."
            className="w-full rounded-xl border border-[#E2DDD6] dark:border-white/10 bg-white/85 dark:bg-[#141210]/85 p-3 text-sm text-[#1C1917] dark:text-[#F5F2EE]"
          />
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={sending}
            className="min-h-[44px] px-5 rounded-xl bg-[#B3261E] hover:bg-[#961E17] text-white text-sm font-semibold inline-flex items-center gap-2 disabled:opacity-60 shadow-[0_4px_14px_rgba(179,38,30,0.3)] transition-colors"
          >
            <Send className="h-4 w-4" />
            <span>{sending ? 'Sending...' : 'Send Broadcast Alert'}</span>
          </button>
        </div>
      </form>

      <div className="rounded-[20px] ios-glass p-5 sm:p-6 space-y-3">
        <h3 className="text-base font-semibold text-[#1C1917] dark:text-[#F5F2EE]">Recent Broadcast History</h3>
        {history.length === 0 ? (
          <p className="text-sm text-[#57534E] dark:text-[#A8A29E]">No alerts dispatched yet.</p>
        ) : (
          <div className="divide-y divide-[#E2DDD6] dark:divide-white/10">
            {history.map((item) => (
              <div key={item.id} className="py-3 flex flex-wrap items-start justify-between gap-2 text-sm">
                <div>
                  <div className="font-semibold text-[#1C1917] dark:text-[#F5F2EE]">{item.subject}</div>
                  <p className="text-xs text-[#57534E] dark:text-[#A8A29E] mt-0.5">{item.message}</p>
                  <div className="text-xs text-[#57534E] dark:text-[#A8A29E] mt-1">
                    Target: {item.bloodGroup} · {item.city} · Channel: {item.channel.toUpperCase()} · By{' '}
                    {item.sentBy}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-xs font-semibold text-[#155E3A] dark:text-[#7CE0A9] tabular-nums">
                    {item.recipientsCount} notified
                  </div>
                  <div className="text-xs text-[#A8A29E]">{item.createdAt.slice(0, 16).replace('T', ' ')}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
