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
import { Building2, CalendarDays, Check, ChevronDown, Droplets, UserCheck } from 'lucide-react';
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from 'motion/react';
import { IOS_EASE, IOS_SPRING } from './SmoothSection.tsx';

export interface AssignmentOptionItem {
  id: string;
  label: string;
  subtitle: string;
  category: 'Blood Bank' | 'Hospital' | 'Medical College' | 'Camp' | 'Donor';
  badge?: string;
}

export interface GlassAssignmentComboboxProps {
  id?: string;
  city: string;
  bloodGroup?: string;
  value: string;
  onChange: (value: string) => void;
  options: ReadonlyArray<AssignmentOptionItem>;
  placeholder?: string;
  ariaLabel?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

interface MenuCoords {
  top?: number;
  bottom?: number;
  left: number;
  width: number;
  maxHeight: number;
  placement: 'bottom' | 'top';
}

export function GlassAssignmentCombobox({
  id,
  city,
  bloodGroup,
  value,
  onChange,
  options,
  placeholder,
  ariaLabel = 'Donor Name or Blood Bank',
  required = false,
  disabled = false,
  className = '',
}: GlassAssignmentComboboxProps) {
  const generatedId = useId();
  const controlId = id || generatedId;
  const listboxId = `${controlId}-assignment-listbox`;

  const reducedMotion = useReducedMotion();
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  const [open, setOpen] = useState(false);
  const [showAll, setShowAll] = useState(true);
  const [coords, setCoords] = useState<MenuCoords | null>(null);
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const visibleOptions = useMemo(() => {
    const q = value.trim().toLowerCase();
    if (showAll || !q) return options;
    const matches = options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(q) ||
        opt.subtitle.toLowerCase().includes(q) ||
        opt.category.toLowerCase().includes(q)
    );
    if (matches.length === 0) return options;
    const exactMatch = options.some((opt) => opt.label.toLowerCase() === q);
    if (exactMatch) return options;
    return matches;
  }, [options, showAll, value]);

  // 3D pointer tilt & radial liquid sheen
  const pointerX = useMotionValue(0.5);
  const pointerY = useMotionValue(0.5);
  const smoothX = useSpring(pointerX, { stiffness: 260, damping: 24, mass: 0.6 });
  const smoothY = useSpring(pointerY, { stiffness: 260, damping: 24, mass: 0.6 });
  const menuTiltX = useTransform(smoothY, [0, 1], [2.2, -2.2]);
  const menuTiltY = useTransform(smoothX, [0, 1], [-2.2, 2.2]);
  const sheenBg = useTransform([smoothX, smoothY], ([x, y]) => {
    const px = `${(Number(x) * 100).toFixed(1)}%`;
    const py = `${(Number(y) * 100).toFixed(1)}%`;
    return `radial-gradient(260px circle at ${px} ${py}, rgba(255, 255, 255, 0.16), rgba(242, 139, 130, 0.07) 42%, transparent 72%)`;
  });

  const computeCoords = useCallback((): MenuCoords | null => {
    const wrap = wrapperRef.current;
    if (!wrap) return null;
    const rect = wrap.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const gap = 8;
    const margin = 12;

    const spaceBelow = vh - rect.bottom - margin - gap;
    const spaceAbove = rect.top - margin - gap;
    const placement: 'bottom' | 'top' =
      spaceBelow < 220 && spaceAbove > spaceBelow ? 'top' : 'bottom';

    const width = Math.min(Math.max(rect.width, 260), vw - margin * 2);
    const left = Math.max(margin, Math.min(rect.left, vw - width - margin));
    const maxHeight = Math.max(
      170,
      Math.min(310, placement === 'bottom' ? spaceBelow : spaceAbove)
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

  const openMenu = useCallback(
    (forceAll = true) => {
      if (disabled) return;
      setShowAll(forceAll);
      const next = computeCoords();
      if (next) setCoords(next);
      const selectedIdx = options.findIndex(
        (opt) => opt.label.toLowerCase() === value.trim().toLowerCase()
      );
      setHighlightedIndex(selectedIdx >= 0 ? selectedIdx : 0);
      pointerX.set(0.5);
      pointerY.set(0.5);
      setOpen(true);
    },
    [computeCoords, disabled, options, pointerX, pointerY, value]
  );

  const closeMenu = useCallback(() => {
    setOpen(false);
  }, []);

  useEffect(() => {
    if (!open) return;

    function handleMouseDown(e: MouseEvent) {
      const target = e.target as Node;
      if (wrapperRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      closeMenu();
    }

    function handleReposition(e: Event) {
      if (e.type === 'scroll' && menuRef.current?.contains(e.target as Node)) {
        return;
      }
      const wrap = wrapperRef.current;
      if (!wrap) {
        closeMenu();
        return;
      }
      const rect = wrap.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > window.innerHeight) {
        closeMenu();
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

  useEffect(() => {
    if (!open || !listRef.current) return;
    const el = listRef.current.querySelector<HTMLElement>(
      `[data-assignment-index="${highlightedIndex}"]`
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

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (disabled) return;
    if (e.key === 'Escape') {
      if (open) {
        e.preventDefault();
        closeMenu();
      }
      return;
    }
    if (e.key === 'Tab') {
      if (open) closeMenu();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!open) {
        openMenu(true);
      } else if (visibleOptions.length > 0) {
        setHighlightedIndex((prev) => (prev + 1) % visibleOptions.length);
      }
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!open) {
        openMenu(true);
      } else if (visibleOptions.length > 0) {
        setHighlightedIndex(
          (prev) => (prev - 1 + visibleOptions.length) % visibleOptions.length
        );
      }
      return;
    }
    if (e.key === 'Enter' && open && visibleOptions[highlightedIndex]) {
      e.preventDefault();
      onChange(visibleOptions[highlightedIndex].label);
      closeMenu();
    }
  }

  function renderIcon(category: AssignmentOptionItem['category']) {
    if (category === 'Blood Bank') {
      return <Droplets className="h-3.5 w-3.5 shrink-0 text-[#B3261E] dark:text-[#F28B82]" aria-hidden="true" />;
    }
    if (category === 'Camp') {
      return <CalendarDays className="h-3.5 w-3.5 shrink-0 text-[#0369A1] dark:text-[#7DD3FC]" aria-hidden="true" />;
    }
    if (category === 'Donor') {
      return <UserCheck className="h-3.5 w-3.5 shrink-0 text-[#155E3A] dark:text-[#7CE0A9]" aria-hidden="true" />;
    }
    return <Building2 className="h-3.5 w-3.5 shrink-0 text-[#9A5B00] dark:text-[#F6C86E]" aria-hidden="true" />;
  }

  const centreCount = options.filter(
    (o) => o.category === 'Hospital' || o.category === 'Blood Bank' || o.category === 'Medical College'
  ).length;
  const campCount = options.filter((o) => o.category === 'Camp').length;
  const donorCount = options.filter((o) => o.category === 'Donor').length;

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      <div
        className={`relative flex items-center rounded-xl border transition-[border-color,box-shadow,background-color] duration-150 ${
          open
            ? 'border-[#B3261E] bg-white/95 dark:bg-[#191513]/95 ring-2 ring-[#B3261E]/70 shadow-[0_10px_26px_-12px_rgba(179,38,30,0.45)]'
            : 'border-[#E2DDD6] dark:border-white/10 bg-white/85 dark:bg-[#141210]/85 hover:border-[#B3261E]/45 dark:hover:border-white/20'
        }`}
      >
        <input
          ref={inputRef}
          id={controlId}
          type="text"
          role="combobox"
          aria-label={ariaLabel}
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={open ? listboxId : undefined}
          required={required}
          disabled={disabled}
          value={value}
          onFocus={() => openMenu(value.trim().length === 0)}
          onClick={() => {
            if (!open) openMenu(value.trim().length === 0);
          }}
          onChange={(e) => {
            onChange(e.target.value);
            setShowAll(false);
            setHighlightedIndex(0);
            if (!open) {
              const next = computeCoords();
              if (next) setCoords(next);
              setOpen(true);
            }
          }}
          onKeyDown={handleKeyDown}
          placeholder={
            placeholder || `Select hospital, blood bank, or donor in ${city}`
          }
          autoComplete="off"
          className="w-full min-h-[44px] pl-3.5 pr-9 py-2 text-sm bg-transparent text-[#1C1917] dark:text-[#F5F2EE] placeholder:text-[#78716C] dark:placeholder:text-[#78716C] focus:outline-none disabled:opacity-50"
        />
        <button
          type="button"
          tabIndex={-1}
          disabled={disabled}
          aria-label={
            open
              ? 'Hide regional hospital and donor options'
              : 'Show regional hospital and donor options'
          }
          onClick={() => {
            if (open) {
              closeMenu();
            } else {
              openMenu(true);
              inputRef.current?.focus();
            }
          }}
          className="absolute right-1.5 top-1/2 -translate-y-1/2 h-8 w-8 flex items-center justify-center rounded-lg text-[#57534E] dark:text-[#A8A29E] hover:text-[#1C1917] dark:hover:text-[#F5F2EE] transition-colors"
        >
          <motion.span
            aria-hidden="true"
            animate={reducedMotion ? undefined : { rotate: open ? 180 : 0 }}
            transition={IOS_SPRING}
            className="inline-flex"
          >
            <ChevronDown className="h-4 w-4" />
          </motion.span>
        </button>
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
                  perspective: '950px',
                }}
              >
                <motion.div
                  ref={menuRef}
                  role="listbox"
                  id={listboxId}
                  aria-label={`${city} hospitals, blood banks, and donors`}
                  onMouseMove={handleMenuMouseMove}
                  onMouseLeave={handleMenuMouseLeave}
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
                      : { opacity: 1, rotateX: 0, y: 0, scale: 1 }
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
                      : { type: 'spring', stiffness: 360, damping: 26, mass: 0.8 }
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
                  className="relative overflow-hidden rounded-2xl border border-white/75 dark:border-white/15 bg-white/92 dark:bg-[#191614]/92 backdrop-blur-2xl backdrop-saturate-150 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_22px_50px_-14px_rgba(28,25,23,0.28)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_24px_56px_-12px_rgba(0,0,0,0.82),0_0_0_1px_rgba(255,255,255,0.04)] p-1.5"
                >
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-white/75 dark:via-white/30 to-transparent"
                  />

                  {!reducedMotion && (
                    <motion.div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-0"
                      style={{ background: sheenBg }}
                    />
                  )}

                  <div className="relative z-10 px-2.5 py-1.5 flex items-center justify-between gap-2 text-[11px] font-semibold uppercase tracking-wider text-[#57534E] dark:text-[#A8A29E] border-b border-black/[0.06] dark:border-white/[0.08] mb-1">
                    <span className="inline-flex items-center gap-1.5 truncate">
                      <Building2
                        className="h-3 w-3 shrink-0 text-[#B3261E] dark:text-[#F28B82]"
                        aria-hidden="true"
                      />
                      <span className="truncate">
                        {city} Centres ({centreCount})
                        {campCount > 0 ? ` · Camps (${campCount})` : ''}
                        {donorCount > 0 ? ` · ${donorCount} ${bloodGroup || ''} Donors` : ''}
                      </span>
                    </span>
                    {!showAll && visibleOptions.length < options.length && (
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => setShowAll(true)}
                        className="text-[11px] font-semibold text-[#B3261E] dark:text-[#F28B82] hover:underline normal-case tracking-normal shrink-0"
                      >
                        Show all
                      </button>
                    )}
                  </div>

                  <div
                    ref={listRef}
                    style={{ maxHeight: coords.maxHeight }}
                    className="relative z-10 overflow-y-auto ios-glass-scroll space-y-0.5 pr-0.5"
                  >
                    {visibleOptions.length === 0 ? (
                      <div className="px-3 py-3 text-xs text-[#57534E] dark:text-[#A8A29E]">
                        No regional centres listed yet for {city}. Enter a hospital or donor name above.
                      </div>
                    ) : (
                      visibleOptions.map((opt, index) => {
                        const isSelected =
                          opt.label.toLowerCase() === value.trim().toLowerCase();
                        const isHighlighted = index === highlightedIndex;
                        return (
                          <motion.button
                            key={opt.id}
                            type="button"
                            role="option"
                            aria-selected={isSelected}
                            data-assignment-index={index}
                            onMouseDown={(e) => e.preventDefault()}
                            onMouseEnter={() => setHighlightedIndex(index)}
                            onClick={() => {
                              onChange(opt.label);
                              closeMenu();
                            }}
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
                                    duration: 0.15,
                                    delay: Math.min(index * 0.012, 0.1),
                                    ease: IOS_EASE,
                                  }
                            }
                            whileHover={reducedMotion ? undefined : { x: 2 }}
                            whileTap={reducedMotion ? undefined : { scale: 0.985 }}
                            className={`w-full min-h-[40px] px-3 py-2 text-sm rounded-xl border flex items-center justify-between gap-2 text-left transition-colors duration-100 ${
                              isSelected
                                ? 'border-[#E6B8B5]/80 dark:border-[#B3261E]/45 bg-[#FBEAE8]/95 dark:bg-[#3A1513]/90 text-[#B3261E] dark:text-[#F28B82] font-semibold'
                                : isHighlighted
                                  ? 'border-transparent bg-black/[0.05] dark:bg-white/[0.09] text-[#1C1917] dark:text-[#F5F2EE]'
                                  : 'border-transparent text-[#1C1917] dark:text-[#F5F2EE] hover:bg-black/[0.04] dark:hover:bg-white/[0.07]'
                            }`}
                          >
                            <div className="min-w-0 flex items-center gap-2.5">
                              {renderIcon(opt.category)}
                              <div className="min-w-0">
                                <span className="block truncate">{opt.label}</span>
                                <span className="block text-[11px] font-normal text-[#57534E] dark:text-[#A8A29E] truncate">
                                  {opt.subtitle}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {opt.badge && (
                                <span className="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-[#B3261E]/12 text-[#B3261E] dark:bg-[#F28B82]/15 dark:text-[#F28B82]">
                                  {opt.badge}
                                </span>
                              )}
                              {isSelected && (
                                <Check
                                  className="h-4 w-4 text-[#B3261E] dark:text-[#F28B82]"
                                  aria-hidden="true"
                                />
                              )}
                            </div>
                          </motion.button>
                        );
                      })
                    )}
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
