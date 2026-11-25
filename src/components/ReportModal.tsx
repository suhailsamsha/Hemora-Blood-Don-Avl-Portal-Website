import { useState } from 'react';
import { X } from 'lucide-react';
import { Perspective3DCard } from './SmoothSection.tsx';
import { api } from '../lib/api.ts';
import { GlassSelect } from './GlassSelect.tsx';

interface ReportModalProps {
  targetType: 'donor' | 'request';
  targetId: string;
  targetLabel: string;
  onClose: () => void;
}

const REPORT_REASONS = [
  'Unreachable or wrong phone number',
  'Incorrect blood group or location',
  'Duplicate or fake entry',
  'Asking for money or commercial solicitation',
  'Request already fulfilled',
];

export function ReportModal({ targetType, targetId, targetLabel, onClose }: ReportModalProps) {
  const [reason, setReason] = useState(REPORT_REASONS[0]);
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await api.submitReport({ targetType, targetId, reason, details });
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not submit report.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-modal-title"
    >
      <div className="w-full max-w-md">
        <Perspective3DCard
          tiltStrength={2.2}
          className="w-full rounded-[26px] ios-hero-glass p-6 space-y-4 shadow-[0_28px_64px_-16px_rgba(0,0,0,0.5)]"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2
                id="report-modal-title"
                className="text-lg font-bold text-[#1C1917] dark:text-[#F5F2EE]"
              >
                Report entry
              </h2>
              <p className="text-xs text-[#57534E] dark:text-[#A8A29E] mt-1">{targetLabel}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close report dialog"
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl ios-glass-subtle text-[#57534E] hover:text-[#1C1917] dark:text-[#A8A29E] dark:hover:text-[#F5F2EE]"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {submitted ? (
            <div className="space-y-4">
              <p className="text-sm text-[#1C1917] dark:text-[#F5F2EE]">
                Report recorded. A coordinator will review this {targetType} entry shortly.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="w-full min-h-[44px] px-4 py-2 text-sm font-semibold rounded-xl bg-[#B3261E] text-white hover:bg-[#961E17] transition-colors duration-150"
              >
                Done
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="report-reason" className="block text-xs font-semibold text-[#57534E] dark:text-[#A8A29E] mb-1.5">
                  Reason
                </label>
                <GlassSelect
                  id="report-reason"
                  ariaLabel="Reason"
                  value={reason}
                  onChange={setReason}
                  options={REPORT_REASONS}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#57534E] dark:text-[#A8A29E] mb-1.5">
                  Notes (optional)
                </label>
                <textarea
                  rows={3}
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  placeholder="Share what happened so moderators can act quickly."
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-[#E2DDD6] dark:border-white/15 bg-white/80 dark:bg-[#141210]/80 text-[#1C1917] dark:text-[#F5F2EE] focus:outline-none focus:ring-2 focus:ring-[#B3261E]"
                />
              </div>

              {error && (
                <p role="alert" className="text-sm text-[#B3261E] dark:text-[#F28B82]">
                  {error}
                </p>
              )}

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="min-h-[44px] px-4 py-2 text-sm font-medium rounded-xl ios-glass-subtle text-[#1C1917] dark:text-[#F5F2EE]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="min-h-[44px] px-4 py-2 text-sm font-semibold rounded-xl bg-[#B3261E] text-white hover:bg-[#961E17] active:scale-[0.98] transition-all duration-150 disabled:opacity-50"
                >
                  {submitting ? 'Submitting...' : 'Submit report'}
                </button>
              </div>
            </form>
          )}
        </Perspective3DCard>
      </div>
    </div>
  );
}
