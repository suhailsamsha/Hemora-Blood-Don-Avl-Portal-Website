import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
} from 'react';
import { createPortal } from 'react-dom';
import { Calendar, ChevronDown, ChevronLeft, ChevronRight, X } from 'lucide-react';
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from 'motion/react';
import { IOS_EASE, IOS_SPRING } from './SmoothSection.tsx';

export interface GlassDatePickerProps {
  id?: string;
  value: string; // 'YYYY-MM-DD' or ''
  onChange: (value: string) => void;
  min?: string;
  max?: string;
  placeholder?: string;
  ariaLabel?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

interface PopoverCoords {
  top?: number;
  bottom?: number;
  left: number;
  width: number;
  placement: 'bottom' | 'top';
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const SHORT_MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function toIsoDate(year: number, monthIndex: number, day: number): string {
  const mm = String(monthIndex + 1).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${year}-${mm}-${dd}`;
}

function parseIsoDate(iso: string): { year: number; month: number; day: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]) - 1;
  const day = Number(m[3]);
  if (month < 0 || month > 11 || day < 1 || day > 31) return null;
  return { year, month, day };
}

function formatDisplayDate(iso: string): string {
  const parsed = parseIsoDate(iso);
  if (!parsed) return iso;
  return `${String(parsed.day).padStart(2, '0')} ${SHORT_MONTHS[parsed.month]} ${parsed.year}`;
}

export function GlassDatePicker({
  id,
  value,
  onChange,
  min,
  max,
  placeholder = 'Select date',
  ariaLabel = 'Choose date',
  required = false,
  disabled = false,
  className = '',
}: GlassDatePickerProps) {
  const generatedId = useId();
  const controlId = id || generatedId;
  const dialogId = `${controlId}-calendar`;

  const reducedMotion = useReducedMotion();
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);

  const todayIso = useMemo(() => {
    const now = new Date();
    return toIsoDate(now.getFullYear(), now.getMonth(), now.getDate());
  }, []);

  const initialAnchor = useMemo(() => {
    return parseIsoDate(value) ?? parseIsoDate(todayIso) ?? { year: 2026, month: 10, day: 25 };
  }, [todayIso, value]);

  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<PopoverCoords | null>(null);
  const [viewYear, setViewYear] = useState(initialAnchor.year);
  const [viewMonth, setViewMonth] = useState(initialAnchor.month);
  const [pickerMode, setPickerMode] = useState<'days' | 'months'>('days');

  // Pointer-responsive 3D tilt & specular sheen
  const pointerX = useMotionValue(0.5);
  const pointerY = useMotionValue(0.5);
  const smoothX = useSpring(pointerX, { stiffness: 240, damping: 24, mass: 0.65 });
  const smoothY = useSpring(pointerY, { stiffness: 240, damping: 24, mass: 0.65 });
  const tiltX = useTransform(smoothY, [0, 1], [3.6, -3.6]);
  const tiltY = useTransform(smoothX, [0, 1], [-3.6, 3.6]);
  const sheenBg = useTransform([smoothX, smoothY], ([x, y]) => {
    const px = `${(Number(x) * 100).toFixed(1)}%`;
    const py = `${(Number(y) * 100).toFixed(1)}%`;
    return `radial-gradient(280px circle at ${px} ${py}, rgba(255, 255, 255, 0.2), rgba(242, 139, 130, 0.08) 42%, transparent 72%)`;
  });

  const computeCoords = useCallback((): PopoverCoords | null => {
    const btn = triggerRef.current;
    if (!btn) return null;
    const rect = btn.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const gap = 8;
    const margin = 12;
    const width = Math.min(316, vw - margin * 2);
    const estHeight = 368;

    const spaceBelow = vh - rect.bottom - margin - gap;
    const spaceAbove = rect.top - margin - gap;
    const placement: 'bottom' | 'top' =
      spaceBelow < estHeight && spaceAbove > spaceBelow ? 'top' : 'bottom';

    const left = Math.max(margin, Math.min(rect.left, vw - width - margin));

    if (placement === 'top') {
      return {
        bottom: vh - rect.top + gap,
        left,
        width,
        placement,
      };
    }

    return {
      top: rect.bottom + gap,
      left,
      width,
      placement,
    };
  }, []);

  const openCalendar = useCallback(() => {
    if (disabled) return;
    const anchor = parseIsoDate(value) ?? parseIsoDate(todayIso);
    if (anchor) {
      setViewYear(anchor.year);
      setViewMonth(anchor.month);
    }
    setPickerMode('days');
    const next = computeCoords();
    if (next) setCoords(next);
    pointerX.set(0.5);
    pointerY.set(0.5);
    setOpen(true);
  }, [computeCoords, disabled, pointerX, pointerY, todayIso, value]);

  const closeCalendar = useCallback((restoreFocus = false) => {
    setOpen(false);
    if (restoreFocus) {
      requestAnimationFrame(() => triggerRef.current?.focus());
    }
  }, []);

  useEffect(() => {
    if (!open) return;

    function handleMouseDown(e: MouseEvent) {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (popoverRef.current?.contains(target)) return;
      closeCalendar(false);
    }

    function handleKeyDown(e: globalThis.KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeCalendar(true);
      }
    }

    function handleReposition(e: Event) {
      if (e.type === 'scroll' && popoverRef.current?.contains(e.target as Node)) {
        return;
      }
      const btn = triggerRef.current;
      if (!btn) {
        closeCalendar(false);
        return;
      }
      const rect = btn.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > window.innerHeight) {
        closeCalendar(false);
        return;
      }
      const next = computeCoords();
      if (next) setCoords(next);
    }

    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleReposition);
    window.addEventListener('scroll', handleReposition, true);
    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleReposition);
      window.removeEventListener('scroll', handleReposition, true);
    };
  }, [closeCalendar, computeCoords, open]);

  const calendarCells = useMemo(() => {
    const firstWeekday = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const prevMonthYear = viewMonth === 0 ? viewYear - 1 : viewYear;
    const prevMonthIdx = viewMonth === 0 ? 11 : viewMonth - 1;
    const prevMonthDays = new Date(prevMonthYear, prevMonthIdx + 1, 0).getDate();

    const nextMonthYear = viewMonth === 11 ? viewYear + 1 : viewYear;
    const nextMonthIdx = viewMonth === 11 ? 0 : viewMonth + 1;

    const cells: Array<{
      iso: string;
      day: number;
      inCurrentMonth: boolean;
      disabled: boolean;
    }> = [];

    for (let i = firstWeekday - 1; i >= 0; i--) {
      const d = prevMonthDays - i;
      const iso = toIsoDate(prevMonthYear, prevMonthIdx, d);
      const outOfBounds = Boolean((min && iso < min) || (max && iso > max));
      cells.push({ iso, day: d, inCurrentMonth: false, disabled: outOfBounds });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const iso = toIsoDate(viewYear, viewMonth, d);
      const outOfBounds = Boolean((min && iso < min) || (max && iso > max));
      cells.push({ iso, day: d, inCurrentMonth: true, disabled: outOfBounds });
    }

    const remaining = 42 - cells.length;
    for (let d = 1; d <= remaining; d++) {
      const iso = toIsoDate(nextMonthYear, nextMonthIdx, d);
      const outOfBounds = Boolean((min && iso < min) || (max && iso > max));
      cells.push({ iso, day: d, inCurrentMonth: false, disabled: outOfBounds });
    }

    return cells;
  }, [max, min, viewMonth, viewYear]);

  const canSelectToday = useMemo(() => {
    if (min && todayIso < min) return false;
    if (max && todayIso > max) return false;
    return true;
  }, [max, min, todayIso]);

  function stepMonth(delta: number) {
    const next = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth());
  }

  function handlePopoverMouseMove(e: ReactMouseEvent<HTMLDivElement>) {
    if (reducedMotion || !popoverRef.current) return;
    const rect = popoverRef.current.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    pointerX.set(Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)));
    pointerY.set(Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height)));
  }

  function handlePopoverMouseLeave() {
    pointerX.set(0.5);
    pointerY.set(0.5);
  }

  return (
    <div className={`relative ${className}`}>
      {required && (
        <input
          type="text"
          tabIndex={-1}
          aria-hidden="true"
          required
          value={value}
          onChange={() => {}}
          className="sr-only pointer-events-none"
        />
      )}

      <div className="relative">
        <button
          ref={triggerRef}
          id={controlId}
          type="button"
          disabled={disabled}
          aria-label={ariaLabel}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-controls={open ? dialogId : undefined}
          onClick={() => (open ? closeCalendar(false) : openCalendar())}
          className={`w-full min-h-[44px] pl-3.5 ${
            !required && value ? 'pr-16' : 'pr-10'
          } py-2 text-sm rounded-xl border flex items-center justify-between gap-2 text-left select-none tabular-nums transition-[border-color,box-shadow,background-color] duration-150 ${
            open
              ? 'border-[#B3261E] bg-white/95 dark:bg-[#191513]/95 ring-2 ring-[#B3261E]/70 shadow-[0_10px_26px_-12px_rgba(179,38,30,0.45)]'
              : 'border-[#E2DDD6] dark:border-white/10 bg-white/85 dark:bg-[#141210]/85 hover:border-[#B3261E]/45 dark:hover:border-white/20'
          } ${
            value
              ? 'text-[#1C1917] dark:text-[#F5F2EE]'
              : 'text-[#78716C] dark:text-[#78716C]'
          } focus:outline-none focus-visible:ring-2 focus-visible:ring-[#B3261E]/80 disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          <span className="truncate">
            {value ? formatDisplayDate(value) : placeholder}
          </span>
        </button>

        {!required && value && !disabled && (
          <button
            type="button"
            aria-label="Clear selected date"
            onClick={(e) => {
              e.stopPropagation();
              onChange('');
            }}
            className="absolute right-8 top-1/2 -translate-y-1/2 h-7 w-7 flex items-center justify-center rounded-lg text-[#57534E] dark:text-[#A8A29E] hover:text-[#B3261E] dark:hover:text-[#F28B82] transition-colors"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        )}

        <Calendar
          className="h-4 w-4 text-[#57534E] dark:text-[#A8A29E] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
          aria-hidden="true"
        />
      </div>

      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {open && coords && (
              <div
                data-glass-popover="true"
                style={{
                  position: 'fixed',
                  top: coords.top,
                  bottom: coords.bottom,
                  left: coords.left,
                  width: coords.width,
                  zIndex: 120,
                  perspective: '1050px',
                }}
              >
                <motion.div
                  ref={popoverRef}
                  id={dialogId}
                  role="dialog"
                  aria-label="Date picker calendar"
                  onMouseMove={handlePopoverMouseMove}
                  onMouseLeave={handlePopoverMouseLeave}
                  initial={
                    reducedMotion
                      ? { opacity: 0 }
                      : {
                          opacity: 0,
                          rotateX: coords.placement === 'bottom' ? -15 : 15,
                          y: coords.placement === 'bottom' ? -10 : 10,
                          scale: 0.93,
                        }
                  }
                  animate={
                    reducedMotion
                      ? { opacity: 1 }
                      : { opacity: 1, rotateX: 0, y: 0, scale: 1 }
                  }
                  exit={
                    reducedMotion
                      ? { opacity: 0 }
                      : {
                          opacity: 0,
                          rotateX: coords.placement === 'bottom' ? -10 : 10,
                          y: coords.placement === 'bottom' ? -6 : 6,
                          scale: 0.95,
                        }
                  }
                  transition={
                    reducedMotion
                      ? { duration: 0.1 }
                      : { type: 'spring', stiffness: 340, damping: 25, mass: 0.8 }
                  }
                  style={
                    reducedMotion
                      ? undefined
                      : {
                          transformOrigin:
                            coords.placement === 'bottom' ? 'top center' : 'bottom center',
                          transformStyle: 'preserve-3d',
                          rotateX: tiltX,
                          rotateY: tiltY,
                        }
                  }
                  className="relative overflow-hidden rounded-[22px] border border-white/75 dark:border-white/15 bg-white/92 dark:bg-[#191614]/90 backdrop-blur-2xl backdrop-saturate-150 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_26px_58px_-14px_rgba(28,25,23,0.3)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_28px_64px_-12px_rgba(0,0,0,0.86),0_0_0_1px_rgba(255,255,255,0.05)] p-3.5"
                >
                  {/* Top liquid refraction rim */}
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-white/80 dark:via-white/35 to-transparent"
                  />

                  {/* Cursor-reactive liquid glass sheen */}
                  {!reducedMotion && (
                    <motion.div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-0"
                      style={{ background: sheenBg }}
                    />
                  )}

                  <div className="relative z-10 space-y-3">
                    {/* Calendar Header */}
                    <div className="flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setPickerMode((m) => (m === 'days' ? 'months' : 'days'))
                        }
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-sm font-bold text-[#1C1917] dark:text-[#F5F2EE] hover:bg-black/[0.05] dark:hover:bg-white/[0.08] transition-colors"
                      >
                        <span>
                          {MONTH_NAMES[viewMonth]}, {viewYear}
                        </span>
                        <motion.span
                          aria-hidden="true"
                          animate={
                            reducedMotion
                              ? undefined
                              : { rotate: pickerMode === 'months' ? 180 : 0 }
                          }
                          transition={IOS_SPRING}
                          className="inline-flex text-[#57534E] dark:text-[#A8A29E]"
                        >
                          <ChevronDown className="h-3.5 w-3.5" />
                        </motion.span>
                      </button>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          aria-label={pickerMode === 'months' ? 'Previous year' : 'Previous month'}
                          onClick={() =>
                            pickerMode === 'months'
                              ? setViewYear((y) => y - 1)
                              : stepMonth(-1)
                          }
                          className="h-8 w-8 flex items-center justify-center rounded-xl border border-transparent hover:border-black/10 dark:hover:border-white/15 hover:bg-black/[0.05] dark:hover:bg-white/[0.08] text-[#1C1917] dark:text-[#F5F2EE] transition-colors"
                        >
                          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          aria-label={pickerMode === 'months' ? 'Next year' : 'Next month'}
                          onClick={() =>
                            pickerMode === 'months'
                              ? setViewYear((y) => y + 1)
                              : stepMonth(1)
                          }
                          className="h-8 w-8 flex items-center justify-center rounded-xl border border-transparent hover:border-black/10 dark:hover:border-white/15 hover:bg-black/[0.05] dark:hover:bg-white/[0.08] text-[#1C1917] dark:text-[#F5F2EE] transition-colors"
                        >
                          <ChevronRight className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </div>
                    </div>

                    {pickerMode === 'months' ? (
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between px-1">
                          <span className="text-xs font-semibold text-[#57534E] dark:text-[#A8A29E]">
                            Select month ({viewYear})
                          </span>
                          <div className="flex items-center gap-1">
                            {[viewYear - 2, viewYear - 1, viewYear, viewYear + 1].map(
                              (yr) => (
                                <button
                                  key={yr}
                                  type="button"
                                  onClick={() => setViewYear(yr)}
                                  className={`px-2 py-1 text-[11px] font-semibold rounded-lg tabular-nums transition-colors ${
                                    yr === viewYear
                                      ? 'bg-[#B3261E] text-white'
                                      : 'text-[#57534E] dark:text-[#A8A29E] hover:bg-black/[0.05] dark:hover:bg-white/[0.08]'
                                  }`}
                                >
                                  {yr}
                                </button>
                              )
                            )}
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-1.5">
                          {SHORT_MONTHS.map((mLabel, mIdx) => {
                            const active = mIdx === viewMonth;
                            return (
                              <motion.button
                                key={mLabel}
                                type="button"
                                whileTap={reducedMotion ? undefined : { scale: 0.96 }}
                                onClick={() => {
                                  setViewMonth(mIdx);
                                  setPickerMode('days');
                                }}
                                className={`min-h-[38px] rounded-xl text-xs font-semibold transition-colors ${
                                  active
                                    ? 'bg-[#B3261E] text-white shadow-[0_6px_16px_-4px_rgba(179,38,30,0.6)]'
                                    : 'text-[#1C1917] dark:text-[#F5F2EE] hover:bg-black/[0.05] dark:hover:bg-white/[0.08]'
                                }`}
                              >
                                {mLabel}
                              </motion.button>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <>
                        {/* Weekday Header */}
                        <div className="grid grid-cols-7 gap-1 text-center">
                          {WEEKDAYS.map((wd) => (
                            <span
                              key={wd}
                              className="text-[11px] font-semibold text-[#57534E] dark:text-[#A8A29E] py-1"
                            >
                              {wd}
                            </span>
                          ))}
                        </div>

                        {/* Day Cells */}
                        <motion.div
                          key={`${viewYear}-${viewMonth}`}
                          initial={reducedMotion ? false : { opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.16, ease: IOS_EASE }}
                          className="grid grid-cols-7 gap-1"
                        >
                          {calendarCells.map((cell) => {
                            const isSelected = cell.iso === value;
                            const isToday = cell.iso === todayIso;
                            return (
                              <motion.button
                                key={cell.iso}
                                type="button"
                                disabled={cell.disabled}
                                whileHover={
                                  cell.disabled || reducedMotion
                                    ? undefined
                                    : { scale: 1.08 }
                                }
                                whileTap={
                                  cell.disabled || reducedMotion
                                    ? undefined
                                    : { scale: 0.92 }
                                }
                                onClick={() => {
                                  onChange(cell.iso);
                                  closeCalendar(true);
                                }}
                                aria-label={formatDisplayDate(cell.iso)}
                                aria-pressed={isSelected}
                                className={`relative h-9 w-full rounded-xl text-xs font-medium tabular-nums flex items-center justify-center transition-colors ${
                                  isSelected
                                    ? 'bg-[#B3261E] text-white font-bold shadow-[0_6px_16px_-4px_rgba(179,38,30,0.65)]'
                                    : cell.disabled
                                      ? 'text-[#A8A29E]/40 dark:text-[#57534E]/60 cursor-not-allowed'
                                      : cell.inCurrentMonth
                                        ? isToday
                                          ? 'text-[#B3261E] dark:text-[#F28B82] font-bold ring-1 ring-[#B3261E]/50 bg-[#FBEAE8]/60 dark:bg-[#3A1513]/60 hover:bg-[#FBEAE8] dark:hover:bg-[#3A1513]'
                                          : 'text-[#1C1917] dark:text-[#F5F2EE] hover:bg-black/[0.06] dark:hover:bg-white/[0.1]'
                                        : 'text-[#78716C]/55 dark:text-[#78716C]/70 hover:bg-black/[0.04] dark:hover:bg-white/[0.06]'
                                }`}
                              >
                                <span>{cell.day}</span>
                              </motion.button>
                            );
                          })}
                        </motion.div>
                      </>
                    )}

                    {/* Footer Actions */}
                    <div className="pt-2 border-t border-black/[0.07] dark:border-white/[0.08] flex items-center justify-between gap-2">
                      {!required ? (
                        <button
                          type="button"
                          onClick={() => {
                            onChange('');
                            closeCalendar(true);
                          }}
                          className="px-2.5 py-1.5 rounded-xl text-xs font-semibold text-[#57534E] dark:text-[#A8A29E] hover:text-[#B3261E] dark:hover:text-[#F28B82] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors"
                        >
                          Clear
                        </button>
                      ) : (
                        <span className="text-[11px] text-[#57534E] dark:text-[#A8A29E] px-1">
                          Select a date
                        </span>
                      )}

                      <button
                        type="button"
                        disabled={!canSelectToday}
                        onClick={() => {
                          onChange(todayIso);
                          closeCalendar(true);
                        }}
                        className="px-3 py-1.5 rounded-xl text-xs font-semibold text-[#B3261E] dark:text-[#F28B82] bg-[#FBEAE8]/80 dark:bg-[#3A1513]/80 hover:bg-[#FBEAE8] dark:hover:bg-[#491A17] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        Today
                      </button>
                    </div>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </div>
  );
}
