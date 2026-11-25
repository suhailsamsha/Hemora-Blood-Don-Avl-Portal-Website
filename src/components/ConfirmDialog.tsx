import { AlertTriangle, X } from 'lucide-react';
import { Perspective3DCard } from './SmoothSection.tsx';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = true,
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-md p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
    >
      <div className="w-full max-w-md my-auto">
        <Perspective3DCard
          tiltStrength={2.2}
          className="rounded-[26px] ios-hero-glass p-6 shadow-2xl space-y-4"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div
                className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${
                  destructive
                    ? 'bg-[#FBEAE8] text-[#B3261E] dark:bg-[#3A1513] dark:text-[#F28B82]'
                    : 'bg-[#F3EFEA] text-[#1C1917] dark:bg-[#262220] dark:text-[#F5F2EE]'
                }`}
              >
                <AlertTriangle className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <h3 id="confirm-dialog-title" className="text-base font-semibold text-[#1C1917] dark:text-[#F5F2EE]">
                  {title}
                </h3>
                <p className="mt-1 text-sm text-[#57534E] dark:text-[#A8A29E]">{message}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onCancel}
              disabled={busy}
              aria-label="Close dialog"
              className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-xl text-[#57534E] hover:bg-black/5 dark:hover:bg-white/10"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={busy}
              className="min-h-[44px] px-4 rounded-xl ios-glass-subtle text-sm font-medium text-[#1C1917] dark:text-[#F5F2EE]"
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={busy}
              className={`min-h-[44px] px-4 rounded-xl text-sm font-semibold text-white disabled:opacity-60 ${
                destructive ? 'bg-[#B3261E] hover:bg-[#961E17]' : 'bg-[#1C1917] hover:bg-[#332E2B]'
              }`}
            >
              {busy ? 'Working...' : confirmLabel}
            </button>
          </div>
        </Perspective3DCard>
      </div>
    </div>
  );
}
