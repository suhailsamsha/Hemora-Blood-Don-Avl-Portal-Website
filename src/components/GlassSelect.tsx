import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown } from 'lucide-react';
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from 'motion/react';
import { IOS_EASE, IOS_SPRING } from './SmoothSection.tsx';

export interface GlassSelectOption {
  value: string;
  label: string;
}

export interface GlassSelectProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  options: ReadonlyArray<GlassSelectOption | string>;
  ariaLabel?: string;
  placeholder?: string;
  className?: string;
  triggerClassName?: string;
  disabled?: boolean;
}

interface MenuCoords {
  top?: number;
  bottom?: number;
  left: number;
  width: number;
  maxHeight: number;
  placement: 'bottom' | 'top';
}

export function GlassSelect({
  id,
  value,
  onChange,
  options,
  ariaLabel,
  placeholder = 'Select...',
  className = '',
  triggerClassName = '',
  disabled = false,
}: GlassSelectProps) {
  const generatedId = useId();
  const controlId = id || generatedId;
  const listboxId = `${controlId}-listbox`;

  const reducedMotion = useReducedMotion();
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const typeAheadRef = useRef<{ query: string; timer: number | null }>({
    query: '',
    timer: null,
  });

  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<MenuCoords | null>(null);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(0);

  const normalizedOptions = useMemo<GlassSelectOption[]>(
    () =>
      options.map((opt) =>
        typeof opt === 'string' ? { value: opt, label: opt } : opt
      ),
    [options]
  );

  const selectedIndex = useMemo(
    () => normalizedOptions.findIndex((o) => o.value === value),
    [normalizedOptions, value]
  );
  const selectedOption = selectedIndex >= 0 ? normalizedOptions[selectedIndex] : null;

  // 3D pointer tilt & liquid glass specular sheen inside the floating menu
  const pointerX = useMotionValue(0.5);
  const pointerY = useMotionValue(0.5);
  const smoothX = useSpring(pointerX, { stiffness: 260, damping: 24, mass: 0.6 });
  const smoothY = useSpring(pointerY, { stiffness: 260, damping: 24, mass: 0.6 });
  const menuTiltX = useTransform(smoothY, [0, 1], [2.2, -2.2]);
  const menuTiltY = useTransform(smoothX, [0, 1], [-2.2, 2.2]);
  const sheenBg = useTransform([smoothX, smoothY], ([x, y]) => {
    const px = `${(Number(x) * 100).toFixed(1)}%`;
    const py = `${(Number(y) * 100).toFixed(1)}%`;
    return `radial-gradient(240px circle at ${px} ${py}, rgba(255, 255, 255, 0.16), rgba(242, 139, 130, 0.06) 42%, transparent 72%)`;
  });

  const computeCoords = useCallback((): MenuCoords | null => {
    const btn = triggerRef.current;
    if (!btn) return null;
    const rect = btn.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const gap = 8;
    const margin = 12;

    const spaceBelow = vh - rect.bottom - margin - gap;
    const spaceAbove = rect.top - margin - gap;
    const placement: 'bottom' | 'top' =
      spaceBelow < 220 && spaceAbove > spaceBelow ? 'top' : 'bottom';

    const width = Math.min(Math.max(rect.width, 168), vw - margin * 2);
    const left = Math.max(margin, Math.min(rect.left, vw - width - margin));
    const maxHeight = Math.max(
      140,
      Math.min(288, placement === 'bottom' ? spaceBelow : spaceAbove)
    );

    if (placement === 'top') {
      return {
        bottom: vh - rect.top + gap,
        left,
        width,
        maxHeight,
        placement,
      };
    }

    return {
      top: rect.bottom + gap,
      left,
      width,
      maxHeight,
      placement,
    };
  }, []);

  const openMenu = useCallback(() => {
    if (disabled || normalizedOptions.length === 0) return;
    const nextCoords = computeCoords();
    if (nextCoords) {
      setCoords(nextCoords);
    }
    setHighlightedIndex(selectedIndex >= 0 ? selectedIndex : 0);
    pointerX.set(0.5);
    pointerY.set(0.5);
    setOpen(true);
  }, [computeCoords, disabled, normalizedOptions.length, pointerX, pointerY, selectedIndex]);

  const closeMenu = useCallback((restoreFocus = false) => {
    setOpen(false);
    if (restoreFocus) {
      requestAnimationFrame(() => triggerRef.current?.focus());
    }
  }, []);

  const selectOption = useCallback(
    (option: GlassSelectOption) => {
      onChange(option.value);
      closeMenu(true);
    },
    [closeMenu, onChange]
  );

  // Sync position on resize / external scroll and dismiss on outside clicks
  useEffect(() => {
    if (!open) return;

    function handleMouseDown(e: MouseEvent) {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      closeMenu(false);
    }

    function handleReposition(e: Event) {
      if (e.type === 'scroll' && menuRef.current?.contains(e.target as Node)) {
        return;
      }
      const btn = triggerRef.current;
      if (!btn) {
        closeMenu(false);
        return;
      }
      const rect = btn.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > window.innerHeight) {
        closeMenu(false);
        return;
      }
      const next = computeCoords();
      if (next) setCoords(next);
    }

    document.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('resize', handleReposition);
    window.addEventListener('scroll', handleReposition, true);
    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('resize', handleReposition);
      window.removeEventListener('scroll', handleReposition, true);
    };
  }, [closeMenu, computeCoords, open]);

  // Scroll highlighted option into view when opened or navigated
  useEffect(() => {
    if (!open || !listRef.current) return;
    const el = listRef.current.querySelector<HTMLElement>(
      `[data-option-index="${highlightedIndex}"]`
    );
    el?.scrollIntoView({ block: 'nearest' });
  }, [highlightedIndex, open]);

  function handleMenuMouseMove(e: ReactMouseEvent<HTMLDivElement>) {
    if (reducedMotion || !menuRef.current) return;
    const rect = menuRef.current.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    pointerX.set(Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)));
    pointerY.set(Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height)));
  }

  function handleMenuMouseLeave() {
    pointerX.set(0.5);
    pointerY.set(0.5);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLButtonElement | HTMLDivElement>) {
    if (disabled) return;
    const count = normalizedOptions.length;
    if (count === 0) return;

    if (e.key === 'Escape') {
      if (open) {
        e.preventDefault();
        closeMenu(true);
      }
      return;
    }

    if (e.key === 'Tab') {
      if (open) closeMenu(false);
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!open) {
        openMenu();
      } else {
        setHighlightedIndex((prev) => (prev + 1) % count);
      }
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!open) {
        openMenu();
      } else {
        setHighlightedIndex((prev) => (prev - 1 + count) % count);
      }
      return;
    }

    if (e.key === 'Home') {
      if (open) {
        e.preventDefault();
        setHighlightedIndex(0);
      }
      return;
    }

    if (e.key === 'End') {
      if (open) {
        e.preventDefault();
        setHighlightedIndex(count - 1);
      }
      return;
    }

    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (!open) {
        openMenu();
      } else {
        const option = normalizedOptions[highlightedIndex];
        if (option) selectOption(option);
      }
      return;
    }

    // Type-ahead jump when typing printable single characters
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      const store = typeAheadRef.current;
      store.query += e.key.toLowerCase();
      if (store.timer) window.clearTimeout(store.timer);
      store.timer = window.setTimeout(() => {
        store.query = '';
      }, 550);

      const matchIdx = normalizedOptions.findIndex((opt) =>
        opt.label.toLowerCase().startsWith(store.query)
      );
      if (matchIdx >= 0) {
        setHighlightedIndex(matchIdx);
        if (!open) {
          onChange(normalizedOptions[matchIdx].value);
        }
      }
    }
  }

  return (
    <div className={`relative ${className}`}>
      <button
        ref={triggerRef}
        id={controlId}
        type="button"
        disabled={disabled}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        onClick={() => (open ? closeMenu(false) : openMenu())}
        onKeyDown={handleKeyDown}
        className={`w-full min-h-[44px] px-3.5 py-2 text-sm rounded-xl border flex items-center justify-between gap-2 text-left select-none transition-[border-color,box-shadow,background-color,transform] duration-150 ${
          open
            ? 'border-[#B3261E] bg-white/95 dark:bg-[#191513]/95 ring-2 ring-[#B3261E]/70 shadow-[0_10px_26px_-12px_rgba(179,38,30,0.45)]'
            : 'border-[#E2DDD6] dark:border-white/10 bg-white/85 dark:bg-[#141210]/85 hover:border-[#B3261E]/45 dark:hover:border-white/20'
        } text-[#1C1917] dark:text-[#F5F2EE] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#B3261E]/80 disabled:opacity-50 disabled:cursor-not-allowed ${triggerClassName}`}
      >
        <span className="truncate">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <motion.span
          aria-hidden="true"
          animate={reducedMotion ? undefined : { rotate: open ? 180 : 0 }}
          transition={IOS_SPRING}
          className="shrink-0 text-[#57534E] dark:text-[#A8A29E]"
        >
          <ChevronDown className="h-4 w-4" />
        </motion.span>
      </button>

      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {open && coords && (
              <div
                style={{
                  position: 'fixed',
                  top: coords.top,
                  bottom: coords.bottom,
                  left: coords.left,
                  width: coords.width,
                  zIndex: 120,
                  perspective: '950px',
                }}
              >
                <motion.div
                  ref={menuRef}
                  role="listbox"
                  id={listboxId}
                  aria-label={ariaLabel || 'Options'}
                  tabIndex={-1}
                  onMouseMove={handleMenuMouseMove}
                  onMouseLeave={handleMenuMouseLeave}
                  onKeyDown={handleKeyDown}
                  initial={
                    reducedMotion
                      ? { opacity: 0 }
                      : {
                          opacity: 0,
                          rotateX: coords.placement === 'bottom' ? -15 : 15,
                          y: coords.placement === 'bottom' ? -8 : 8,
                          scale: 0.94,
                        }
                  }
                  animate={
                    reducedMotion
                      ? { opacity: 1 }
                      : {
                          opacity: 1,
                          rotateX: 0,
                          y: 0,
                          scale: 1,
                        }
                  }
                  exit={
                    reducedMotion
                      ? { opacity: 0 }
                      : {
                          opacity: 0,
                          rotateX: coords.placement === 'bottom' ? -10 : 10,
                          y: coords.placement === 'bottom' ? -6 : 6,
                          scale: 0.96,
                        }
                  }
                  transition={
                    reducedMotion
                      ? { duration: 0.1 }
                      : {
                          type: 'spring',
                          stiffness: 360,
                          damping: 26,
                          mass: 0.8,
                        }
                  }
                  style={
                    reducedMotion
                      ? undefined
                      : {
                          transformOrigin:
                            coords.placement === 'bottom' ? 'top center' : 'bottom center',
                          transformStyle: 'preserve-3d',
                          rotateX: menuTiltX,
                          rotateY: menuTiltY,
                        }
                  }
                  className="relative overflow-hidden rounded-2xl border border-white/75 dark:border-white/15 bg-white/90 dark:bg-[#191614]/88 backdrop-blur-2xl backdrop-saturate-150 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_22px_50px_-14px_rgba(28,25,23,0.28)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_24px_56px_-12px_rgba(0,0,0,0.82),0_0_0_1px_rgba(255,255,255,0.04)] p-1.5"
                >
                  {/* Top liquid refraction rim */}
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-white/75 dark:via-white/30 to-transparent"
                  />

                  {/* Cursor-reactive liquid sheen */}
                  {!reducedMotion && (
                    <motion.div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-0"
                      style={{ background: sheenBg }}
                    />
                  )}

                  <div
                    ref={listRef}
                    style={{ maxHeight: coords.maxHeight }}
                    className="relative z-10 overflow-y-auto ios-glass-scroll space-y-0.5 pr-0.5"
                  >
                    {normalizedOptions.map((option, index) => {
                      const isSelected = option.value === value;
                      const isHighlighted = index === highlightedIndex;
                      return (
                        <motion.button
                          key={`${option.value}-${index}`}
                          type="button"
                          role="option"
                          aria-selected={isSelected}
                          data-option-index={index}
                          onMouseEnter={() => setHighlightedIndex(index)}
                          onClick={() => selectOption(option)}
                          initial={
                            reducedMotion
                              ? false
                              : {
                                  opacity: 0,
                                  y: coords.placement === 'bottom' ? -4 : 4,
                                }
                          }
                          animate={{ opacity: 1, y: 0 }}
                          transition={
                            reducedMotion
                              ? { duration: 0 }
                              : {
                                  duration: 0.16,
                                  delay: Math.min(index * 0.015, 0.12),
                                  ease: IOS_EASE,
                                }
                          }
                          whileHover={reducedMotion ? undefined : { x: 2 }}
                          whileTap={reducedMotion ? undefined : { scale: 0.985 }}
                          className={`w-full min-h-[38px] px-3 py-2 text-sm rounded-xl border flex items-center justify-between gap-2 text-left transition-colors duration-100 ${
                            isSelected
                              ? 'border-[#E6B8B5]/80 dark:border-[#B3261E]/45 bg-[#FBEAE8]/95 dark:bg-[#3A1513]/90 text-[#B3261E] dark:text-[#F28B82] font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]'
                              : isHighlighted
                                ? 'border-transparent bg-black/[0.05] dark:bg-white/[0.09] text-[#1C1917] dark:text-[#F5F2EE]'
                                : 'border-transparent text-[#1C1917] dark:text-[#F5F2EE] hover:bg-black/[0.04] dark:hover:bg-white/[0.07]'
                          }`}
                        >
                          <span className="truncate">{option.label}</span>
                          {isSelected && (
                            <Check
                              className="h-4 w-4 shrink-0 text-[#B3261E] dark:text-[#F28B82]"
                              aria-hidden="true"
                            />
                          )}
                        </motion.button>
                      );
                    })}
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
