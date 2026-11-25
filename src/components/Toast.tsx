import { AlertCircle, CheckCircle2, X } from 'lucide-react';

export interface ToastItem {
  id: string;
  type: 'success' | 'error';
  message: string;
}

interface ToastContainerProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-full max-w-sm pointer-events-none px-4 sm:px-0"
      aria-live="polite"
    >
      {toasts.map((toast) => {
        const isErr = toast.type === 'error';
        return (
          <div
            key={toast.id}
            role="status"
            className={`pointer-events-auto flex items-start gap-2.5 rounded-2xl backdrop-blur-xl border p-3.5 shadow-xl text-sm ${
              isErr
                ? 'border-[#E6B8B5] bg-[#FBEAE8]/95 text-[#8E1B15] dark:border-[#6A2B27] dark:bg-[#3A1513]/90 dark:text-[#F28B82]'
                : 'border-[#B8DEC9] bg-[#ECF8F1]/95 text-[#155E3A] dark:border-[#245A3D] dark:bg-[#10291C]/90 dark:text-[#7CE0A9]'
            }`}
          >
            {isErr ? (
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" aria-hidden="true" />
            ) : (
              <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" aria-hidden="true" />
            )}
            <span className="flex-1 font-medium leading-snug">{toast.message}</span>
            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              aria-label="Dismiss notification"
              className="p-0.5 rounded hover:bg-black/10"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
