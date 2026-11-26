import { useId, useRef, type MouseEvent, type ReactNode, type RefObject } from 'react';
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from 'motion/react';
import { BloodDropletsCanvas } from './BloodDropletsCanvas.tsx';

export const IOS_EASE = [0.16, 1, 0.3, 1] as const;
export const IOS_SPRING = {
  type: 'spring' as const,
  stiffness: 220,
  damping: 26,
  mass: 0.9,
};

export function ScrollProgressBar({
  containerRef,
}: {
  containerRef?: RefObject<HTMLElement | null>;
} = {}) {
  const reducedMotion = useReducedMotion();
  const { scrollYProgress } = useScroll(
    containerRef ? { container: containerRef } : undefined
  );
  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 140,
    damping: 28,
    restDelta: 0.001,
  });

  if (reducedMotion) return null;

  return (
    <motion.div
      aria-hidden="true"
      style={{ scaleX: smoothProgress, transformOrigin: '0% 50%' }}
      className="no-print fixed top-0 left-0 right-0 h-[2.5px] z-50 bg-gradient-to-r from-[#B3261E] via-[#D94A3F] to-[#F28B82] pointer-events-none"
    />
  );
}

export function LiquidCrimsonBackdrop({
  containerRef,
}: {
  containerRef?: RefObject<HTMLElement | null>;
} = {}) {
  const reducedMotion = useReducedMotion();
  const { scrollY } = useScroll(
    containerRef ? { container: containerRef } : undefined
  );
  const smoothScrollY = useSpring(scrollY, {
    stiffness: 70,
    damping: 24,
    mass: 0.8,
  });

  const upperWaveY = useTransform(smoothScrollY, [0, 2400], [0, -110]);
  const lowerWaveY = useTransform(smoothScrollY, [0, 2400], [0, 85]);
  const ambientGlowY = useTransform(smoothScrollY, [0, 2400], [0, -60]);

  return (
    <div
      aria-hidden="true"
      className="no-print pointer-events-none fixed inset-0 z-0 overflow-hidden select-none"
    >
      {/* Ambient warm radial washes */}
      <motion.div
        style={reducedMotion ? undefined : { y: ambientGlowY }}
        className="absolute -inset-x-24 -top-24 h-[78vh] will-change-transform"
      >
        <div
          className="w-full h-full opacity-90 dark:opacity-100"
          style={{
            background:
              'radial-gradient(58% 46% at 15% 6%, rgba(179, 38, 30, 0.14) 0%, rgba(179, 38, 30, 0) 72%), radial-gradient(48% 40% at 86% 18%, rgba(120, 40, 32, 0.10) 0%, rgba(20, 18, 16, 0) 76%)',
          }}
        />
      </motion.div>

      {/* Primary sweeping organic crimson ribbon matching the signature theme */}
      <motion.svg
        style={reducedMotion ? undefined : { y: upperWaveY }}
        viewBox="0 0 1440 760"
        fill="none"
        preserveAspectRatio="xMidYMid slice"
        className="absolute -top-12 -right-24 w-[135vw] max-w-[1680px] min-w-[900px] h-auto opacity-55 dark:opacity-75 will-change-transform"
      >
        <path
          d="M-60 520C140 610 310 645 485 520C640 408 730 165 965 110C1150 66 1315 118 1510 58"
          stroke="url(#globalCrimsonRibbonMain)"
          strokeWidth="76"
          strokeLinecap="round"
        />
        <defs>
          <linearGradient
            id="globalCrimsonRibbonMain"
            x1="-60"
            y1="520"
            x2="1510"
            y2="58"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#5D1B17" stopOpacity="0.16" />
            <stop offset="0.45" stopColor="#8E221B" stopOpacity="0.34" />
            <stop offset="1" stopColor="#B3261E" stopOpacity="0.28" />
          </linearGradient>
        </defs>
      </motion.svg>

      {/* Secondary lower flowing ribbon for depth on deeper scroll */}
      <motion.svg
        style={reducedMotion ? undefined : { y: lowerWaveY }}
        viewBox="0 0 1440 640"
        fill="none"
        preserveAspectRatio="xMidYMid slice"
        className="absolute bottom-[-140px] -left-24 w-[125vw] max-w-[1560px] min-w-[820px] h-auto opacity-35 dark:opacity-50 will-change-transform"
      >
        <path
          d="M-100 180C160 85 350 110 530 270C700 420 890 480 1160 365C1305 304 1420 265 1540 285"
          stroke="url(#globalCrimsonRibbonSub)"
          strokeWidth="62"
          strokeLinecap="round"
        />
        <defs>
          <linearGradient
            id="globalCrimsonRibbonSub"
            x1="-100"
            y1="180"
            x2="1540"
            y2="285"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#8E221B" stopOpacity="0.26" />
            <stop offset="0.55" stopColor="#631C18" stopOpacity="0.22" />
            <stop offset="1" stopColor="#B3261E" stopOpacity="0.1" />
          </linearGradient>
        </defs>
      </motion.svg>

      {/* HiDPI 4K fluid physics canvas: tiny blood droplets dropping into undulating crimson blood band */}
      <BloodDropletsCanvas />
    </div>
  );
}

interface SmoothRevealProps {
  children: ReactNode;
  className?: string;
  delay?: number;
}

export function SmoothReveal({ children, className, delay = 0 }: SmoothRevealProps) {
  const reducedMotion = useReducedMotion();

  if (reducedMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.99 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, amount: 0.06 }}
      transition={{ duration: 0.52, delay, ease: IOS_EASE }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

interface SmoothRowProps {
  children: ReactNode;
  index: number;
  className?: string;
}

export function SmoothRow({ children, index, className }: SmoothRowProps) {
  const reducedMotion = useReducedMotion();
  const cappedDelay = Math.min(index * 0.035, 0.21);

  if (reducedMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 14, scale: 0.992 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, amount: 0.05 }}
      transition={{ duration: 0.42, delay: cappedDelay, ease: IOS_EASE }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

interface Perspective3DCardProps {
  children: ReactNode;
  className?: string;
  tiltStrength?: number;
  animateEntrance?: boolean;
}

export function Perspective3DCard({
  children,
  className = '',
  tiltStrength = 4.5,
  animateEntrance = true,
}: Perspective3DCardProps) {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const reducedMotion = useReducedMotion();

  const pointerX = useMotionValue(0.5);
  const pointerY = useMotionValue(0.5);

  const smoothX = useSpring(pointerX, { stiffness: 210, damping: 24, mass: 0.7 });
  const smoothY = useSpring(pointerY, { stiffness: 210, damping: 24, mass: 0.7 });

  const rotateX = useTransform(smoothY, [0, 1], [tiltStrength, -tiltStrength]);
  const rotateY = useTransform(smoothX, [0, 1], [-tiltStrength, tiltStrength]);
  const sheenX = useTransform(smoothX, [0, 1], ['0%', '100%']);
  const sheenY = useTransform(smoothY, [0, 1], ['0%', '100%']);
  const sheenBackground = useTransform(
    [sheenX, sheenY],
    ([x, y]) =>
      `radial-gradient(460px circle at ${x} ${y}, rgba(255,255,255,0.42), rgba(242,139,130,0.08) 38%, transparent 65%)`
  );

  function handleMouseMove(e: MouseEvent<HTMLDivElement>) {
    if (reducedMotion || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    pointerX.set(x);
    pointerY.set(y);
  }

  function handleMouseLeave() {
    pointerX.set(0.5);
    pointerY.set(0.5);
  }

  return (
    <div style={{ perspective: '1200px' }}>
      <motion.div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={
          reducedMotion
            ? undefined
            : {
                rotateX,
                rotateY,
                transformStyle: 'preserve-3d',
              }
        }
        initial={
          animateEntrance && !reducedMotion
            ? { opacity: 0, y: 16, scale: 0.988 }
            : false
        }
        whileInView={
          animateEntrance && !reducedMotion
            ? { opacity: 1, y: 0, scale: 1 }
            : undefined
        }
        viewport={animateEntrance ? { once: true, amount: 0.04 } : undefined}
        transition={{ duration: 0.5, ease: IOS_EASE }}
        className={`relative overflow-hidden transition-shadow duration-200 ${className}`}
      >
        {!reducedMotion && (
          <motion.div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-40 dark:opacity-25"
            style={{ background: sheenBackground }}
          />
        )}
        <div className="relative z-10">{children}</div>
      </motion.div>
    </div>
  );
}

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

interface GlassSegmentedControlProps<T extends string> {
  options: ReadonlyArray<SegmentedOption<T>>;
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
  layoutId?: string;
  size?: 'sm' | 'md';
  fullWidth?: boolean;
  className?: string;
}

export function GlassSegmentedControl<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  layoutId,
  size = 'md',
  fullWidth = false,
  className = '',
}: GlassSegmentedControlProps<T>) {
  const autoId = useId();
  const groupLayoutId = layoutId ?? `glass-segment-${autoId}`;
  const reducedMotion = useReducedMotion();

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={`inline-flex flex-wrap items-center gap-1 p-1 rounded-2xl ios-glass-subtle ${
        fullWidth ? 'w-full' : ''
      } ${className}`}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.value)}
            className={`relative ${fullWidth ? 'flex-1' : ''} ${
              size === 'sm' ? 'min-h-[38px] px-3 py-1.5 text-xs' : 'min-h-[44px] px-3.5 py-2 text-xs sm:text-sm'
            } font-semibold rounded-xl transition-colors duration-150 whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-[#B3261E] ${
              active
                ? 'text-[#B3261E] dark:text-[#F28B82]'
                : 'text-[#57534E] dark:text-[#A8A29E] hover:text-[#1C1917] dark:hover:text-[#F5F2EE]'
            }`}
          >
            {active && (
              <motion.span
                layoutId={groupLayoutId}
                transition={reducedMotion ? { duration: 0.01 } : IOS_SPRING}
                aria-hidden="true"
                className="absolute inset-0 rounded-xl bg-white/90 dark:bg-[#2B2623]/95 border border-white/85 dark:border-white/15 shadow-[0_6px_16px_-4px_rgba(28,25,23,0.16)] dark:shadow-[0_8px_18px_-4px_rgba(0,0,0,0.6)]"
              />
            )}
            <span className="relative z-10">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}

interface Donor3DEligibilityRingProps {
  isCooldownActive: boolean;
  daysUntilEligible: number;
  totalCooldownDays?: number;
}

export function Donor3DEligibilityRing({
  isCooldownActive,
  daysUntilEligible,
  totalCooldownDays = 90,
}: Donor3DEligibilityRingProps) {
  const reducedMotion = useReducedMotion();
  const daysCompleted = isCooldownActive
    ? Math.max(0, Math.min(totalCooldownDays, totalCooldownDays - daysUntilEligible))
    : totalCooldownDays;
  const progress = daysCompleted / totalCooldownDays;

  const size = 104;
  const strokeWidth = 9;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - progress);

  return (
    <div
      className="relative inline-flex items-center justify-center shrink-0 select-none"
      style={{ perspective: '600px', width: size, height: size }}
    >
      <motion.div
        initial={reducedMotion ? undefined : { rotateX: 16, rotateY: -12, scale: 0.92 }}
        animate={reducedMotion ? undefined : { rotateX: 8, rotateY: -6, scale: 1 }}
        whileHover={reducedMotion ? undefined : { rotateX: 0, rotateY: 0, scale: 1.04 }}
        transition={IOS_SPRING}
        className="relative flex items-center justify-center rounded-full shadow-[0_14px_26px_-10px_rgba(179,38,30,0.28)] dark:shadow-[0_14px_28px_-10px_rgba(0,0,0,0.65)] bg-white/75 dark:bg-[#1C1917]/80 backdrop-blur-md border border-white/80 dark:border-white/10"
        style={{ width: size, height: size, transformStyle: 'preserve-3d' }}
      >
        <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-[#E2DDD6] dark:text-[#38322E]"
          />
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            stroke={isCooldownActive ? '#D97706' : '#16A34A'}
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: dashOffset }}
            transition={{ duration: 0.85, ease: IOS_EASE }}
          />
        </svg>
        <div
          className="absolute inset-0 flex flex-col items-center justify-center text-center"
          style={{ transform: 'translateZ(12px)' }}
        >
          <span
            className={`text-lg font-bold leading-none tabular-nums ${
              isCooldownActive
                ? 'text-[#B45309] dark:text-[#FBBF24]'
                : 'text-[#166534] dark:text-[#86EFAC]'
            }`}
          >
            {isCooldownActive ? `${daysUntilEligible}d` : '90/90'}
          </span>
          <span className="text-[10px] font-medium text-[#57534E] dark:text-[#A8A29E] mt-1">
            {isCooldownActive ? 'to wait' : 'eligible'}
          </span>
        </div>
      </motion.div>
    </div>
  );
}
