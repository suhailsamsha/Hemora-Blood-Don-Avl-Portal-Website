import { useState } from 'react';
import { CheckCircle2, Phone } from 'lucide-react';
import { api } from '../lib/api.ts';

interface OtpVerificationProps {
  purpose: 'register' | 'login' | 'request_contact' | 'request_blood' | 'respond_request';
  phone: string;
  onPhoneChange: (phone: string) => void;
  onVerified: (verificationToken: string, normalizedPhone: string) => void;
  disabled?: boolean;
  label?: string;
  helperNote?: string;
}

export function OtpVerification({
  purpose,
  phone,
  onPhoneChange,
  onVerified,
  disabled,
  label = 'Mobile number (10-digit Indian mobile)',
  helperNote,
}: OtpVerificationProps) {
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [maskedPhone, setMaskedPhone] = useState<string>('');
  const [devHintCode, setDevHintCode] = useState<string | undefined>(undefined);
  const [code, setCode] = useState('');
  const [verified, setVerified] = useState(false);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSendOtp() {
    setError(null);
    setSending(true);
    try {
      const res = await api.sendOtp(phone, purpose);
      setChallengeId(res.challengeId);
      setMaskedPhone(res.maskedPhone);
      setDevHintCode(res.devHintCode);
      setVerified(false);
      setCode('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send OTP.');
    } finally {
      setSending(false);
    }
  }

  async function handleVerifyOtp() {
    if (!challengeId) return;
    setError(null);
    setVerifying(true);
    try {
      const res = await api.verifyOtp(challengeId, code.trim(), phone);
      if (res.verified) {
        setVerified(true);
        onVerified(res.verificationToken, phone);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed.');
    } finally {
      setVerifying(false);
    }
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-[#1C1917] dark:text-[#F5F2EE] mb-1.5">
          {label}
        </label>
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Phone
              className="h-4 w-4 text-[#57534E] dark:text-[#A8A29E] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="tel"
              inputMode="numeric"
              value={phone}
              disabled={disabled || verified}
              onChange={(e) => {
                onPhoneChange(e.target.value);
                if (verified) setVerified(false);
              }}
              placeholder="Enter 10-digit mobile number"
              className="w-full min-h-[44px] pl-9 pr-3 py-2 text-sm rounded-xl border border-[#E2DDD6] dark:border-white/10 bg-white/85 dark:bg-[#141210]/85 text-[#1C1917] dark:text-[#F5F2EE] focus:outline-none focus:ring-2 focus:ring-[#B3261E] tabular-nums disabled:opacity-60"
            />
          </div>
          {!verified && (
            <button
              type="button"
              onClick={handleSendOtp}
              disabled={disabled || sending || phone.replace(/\D/g, '').length < 10}
              className="min-h-[44px] px-4 py-2 text-sm font-medium rounded-xl border border-[#E2DDD6] dark:border-white/10 bg-[#F3EFEA] dark:bg-[#24201D] text-[#1C1917] dark:text-[#F5F2EE] hover:bg-[#E7E1D9] dark:hover:bg-[#322D2A] transition-colors duration-150 whitespace-nowrap shrink-0 disabled:opacity-50"
            >
              {sending ? 'Sending...' : challengeId ? 'Resend OTP' : 'Send OTP'}
            </button>
          )}
        </div>
        {helperNote && (
          <p className="mt-1.5 text-xs text-[#57534E] dark:text-[#A8A29E]">{helperNote}</p>
        )}
      </div>

      {challengeId && !verified && (
        <div className="p-3.5 rounded-2xl ios-glass-subtle space-y-2.5">
          <p className="text-xs text-[#57534E] dark:text-[#A8A29E]">
            Enter the 6-digit OTP sent to <span className="font-medium text-[#1C1917] dark:text-[#F5F2EE] tabular-nums">{maskedPhone}</span>.
          </p>
          {devHintCode && (
            <p className="text-xs text-[#57534E] dark:text-[#A8A29E]">
              Local SMS preview code:{' '}
              <button
                type="button"
                onClick={() => setCode(devHintCode)}
                className="font-semibold underline text-[#B3261E] dark:text-[#F28B82] tabular-nums"
              >
                {devHintCode}
              </button>{' '}
              (tap to fill)
            </p>
          )}
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="Enter 6-digit OTP"
              aria-label="6-digit OTP code"
              className="flex-1 min-h-[44px] px-3.5 py-2 text-sm rounded-xl border border-[#E2DDD6] dark:border-white/10 bg-white/85 dark:bg-[#141210]/85 text-[#1C1917] dark:text-[#F5F2EE] tabular-nums tracking-widest focus:outline-none focus:ring-2 focus:ring-[#B3261E]"
            />
            <button
              type="button"
              onClick={handleVerifyOtp}
              disabled={verifying || code.length !== 6}
              className="min-h-[44px] px-4 py-2 text-sm font-semibold rounded-xl bg-[#B3261E] text-white hover:bg-[#961E17] transition-colors duration-150 whitespace-nowrap shrink-0 disabled:opacity-50"
            >
              {verifying ? 'Checking...' : 'Verify OTP'}
            </button>
          </div>
        </div>
      )}

      {verified && (
        <div className="flex items-center gap-2 text-sm font-medium text-[#166534] dark:text-[#86EFAC]">
          <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>Phone number verified</span>
        </div>
      )}

      {error && (
        <p role="alert" className="text-sm text-[#B3261E] dark:text-[#F28B82]">
          {error}
        </p>
      )}
    </div>
  );
}
