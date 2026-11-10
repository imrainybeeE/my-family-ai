import React, { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { feel } from '../../feel/feel';
import { MotionValue, motion, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform, useVelocity } from 'motion/react';
import { DiscoveryStyleId } from '../../types';
import { Felt, FELT_FOR_STYLE } from './Flower';

export interface GardenPlant {
  id: string;
  name: string;
  style?: DiscoveryStyleId;
  isYou?: boolean;
}

/** How many people share one strand, by family size. */
function rows(n: number): number[] {
  if (n <= 4) return [n];
  if (n <= 6) return [Math.ceil(n / 2), Math.floor(n / 2)];
  if (n <= 8) return [4, n - 4];
  return [4, 4, n - 8];
}

const SIZE: Record<number, number> = { 1: 136, 2: 128, 3: 116, 4: 94 };
const SAG = 24;
const TILTS = [-7, 5, -3, 8, -5, 4, -8, 6];

/** The element's width, kept up to date. */
export function useWidth<T extends HTMLElement>(fallback = 393) {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(fallback);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    setWidth(el.clientWidth);
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

/**
 * The family as a garland: a strand of yarn hung across the page with each person's felt
 * flower threaded on it and a paper name tag below. People who haven't found their flower
 * yet hang as a closed bud. The yarn draws itself in, then the flowers are pinned on.
 *
 * The flowers are hung, not printed: pull one sideways and it swings on the yarn and settles,
 * its neighbours stir with it, and scrolling sends a breeze along the strand.
 */
export function Garland({ plants, onSelect }: { plants: GardenPlant[]; onSelect?: (id: string) => void }) {
  const [ref, w] = useWidth<HTMLDivElement>();
  const reduce = useReducedMotion();
  // Scrolling is a breeze: the faster the page moves, the further the flowers lean, then they settle.
  const { scrollY } = useScroll();
  const speed = useVelocity(scrollY);
  const breeze = useSpring(useTransform(speed, [-1800, 1800], [9, -9], { clamp: true }), { stiffness: 70, damping: 6, mass: 0.9 });
  // Every hung flower's pull, by position, so a tug on one stirs the ones beside it.
  const pulls = useRef(new Map<number, MotionValue<number>>());
  const stir = (n: number, angle: number) => {
    pulls.current.get(n - 1)?.set(angle * 0.32);
    pulls.current.get(n + 1)?.set(angle * 0.32);
  };
  // A breeze passes along the strand as the page opens, and again now and then, so the flowers
  // read as hung (and worth a pull) before anyone touches them. It never fights a finger.
  const grabbed = useRef(false);
  useEffect(() => {
    if (reduce) return;
    const timers = new Set<number>();
    const later = (fn: () => void, ms: number) => {
      const t = window.setTimeout(() => {
        timers.delete(t);
        if (!grabbed.current) fn();
      }, ms);
      timers.add(t);
    };
    const gust = (lean: number) =>
      pulls.current.forEach((pull, n) => {
        later(() => pull.set(lean * (n % 2 ? 1 : 0.7)), n * 90);
        later(() => pull.set(0), n * 90 + 240);
      });
    later(() => gust(10), 1500);
    const every = window.setInterval(() => document.visibilityState === 'visible' && gust(Math.random() < 0.5 ? 5 : -5), 9000);
    return () => {
      window.clearInterval(every);
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, [reduce]);
  let start = 0;
  return (
    <div ref={ref} className="-mx-5" role="list" aria-label="Your family">
      {rows(Math.max(plants.length, 1)).map((count, r) => {
        const row = plants.slice(start, start + count);
        const offset = start;
        start += count;
        const size = SIZE[Math.min(count, 4)];
        const y0 = 22;
        const height = y0 + SAG + size / 2 + 30;
        // A quadratic sag from just off one edge to just off the other; its x is linear in t.
        const x0 = -12;
        const x1 = w + 12;
        const path = `M ${x0} ${y0} Q ${w / 2} ${y0 + 2 * SAG} ${x1} ${y0}`;
        return (
          <div key={r} className="relative" style={{ height }}>
            <svg className="absolute inset-0 overflow-visible" width={w} height={height} aria-hidden>
              <Strand d={path} delay={r * 0.15} />
            </svg>
            {row.map((p, i) => {
              const x = ((i + 0.5) / count) * w;
              const t = (x - x0) / (x1 - x0);
              const y = y0 + 4 * SAG * t * (1 - t);
              const s = p.style ? size : Math.round(size * 0.9);
              return (
                <div key={p.id} role="listitem" className="absolute" style={{ left: x - s / 2, top: y - s / 2, width: s }}>
                  <Hanging plant={p} n={offset + i} size={s} breeze={reduce ? null : breeze} pulls={pulls.current} stir={stir} grabbed={grabbed} onSelect={onSelect} />
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

/** How far a flower can be pulled round, in degrees, and how much of a finger's travel becomes swing. */
const MAX_SWING = 44;
const SWING_PER_PX = 0.5;

/** One flower threaded on the yarn, with its name tag hanging below: a pendulum about the flower's centre. */
function Hanging({
  plant: p,
  n,
  size: s,
  breeze,
  pulls,
  stir,
  grabbed,
  onSelect,
}: {
  plant: GardenPlant;
  n: number;
  size: number;
  breeze: MotionValue<number> | null;
  pulls: Map<number, MotionValue<number>>;
  stir: (n: number, angle: number) => void;
  grabbed: React.RefObject<boolean>;
  onSelect?: (id: string) => void;
}) {
  const pull = useMotionValue(0);
  // Lightly damped, so a released flower swings past centre a few times before it rests.
  const swing = useSpring(pull, { stiffness: 95, damping: 4.2, mass: 1 });
  const still = useMotionValue(0);
  const rotate = useTransform([swing, breeze || still], ([a, b]: number[]) => a + b * (n % 2 ? 1 : 0.7));
  useEffect(() => {
    pulls.set(n, pull);
    return () => void pulls.delete(n);
  }, [n, pull, pulls]);

  const grab = useRef<{ x: number; dragged: boolean } | null>(null);
  const dragged = useRef(false);
  const release = () => {
    if (!grab.current) return;
    if (grab.current.dragged) feel('tap');
    grab.current = null;
    grabbed.current = false;
    pull.set(0);
    stir(n, 0);
  };
  const bud = !p.style;
  const label = `${p.name}${p.isYou ? ' (you)' : ''}, ${p.style ? `${p.style}` : 'not bloomed yet'}`;
  const body = (
    <motion.span
      className="flex flex-col items-center"
      initial={{ scale: 0.5, rotate: -25, opacity: 0 }}
      animate={{ scale: 1, rotate: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 220, damping: 16, delay: 0.35 + n * 0.08 }}
    >
      <motion.span className="flex flex-col items-center" style={{ rotate, transformOrigin: `50% ${s / 2}px` }}>
        <span className="block" style={{ transform: `rotate(${TILTS[n % 8]}deg)` }}>
          <Felt name={bud ? 'bud' : FELT_FOR_STYLE[p.style!]} size={s} />
        </span>
        <span className="tag -mt-4 relative" style={{ transform: `rotate(${n % 2 ? 3 : -3}deg)`, background: p.isYou ? '#fbe2ea' : undefined }}>
          {p.name}
        </span>
      </motion.span>
    </motion.span>
  );
  if (!onSelect) {
    return (
      <div className="flex flex-col items-center" aria-label={label}>
        {body}
      </div>
    );
  }
  return (
    <button
      type="button"
      className="hanging flex flex-col items-center bg-transparent border-0 p-0 w-full"
      aria-label={label}
      onPointerDown={(e) => {
        feel('tap');
        dragged.current = false;
        if (!breeze) return;
        grab.current = { x: e.clientX, dragged: false };
        grabbed.current = true;
        e.currentTarget.setPointerCapture?.(e.pointerId);
      }}
      onPointerMove={(e) => {
        const g = grab.current;
        if (!g) return;
        const dx = e.clientX - g.x;
        if (!g.dragged && Math.abs(dx) < 8) return;
        g.dragged = dragged.current = true;
        // The tag follows the finger, so the flower turns the other way.
        const angle = Math.max(-MAX_SWING, Math.min(MAX_SWING, -dx * SWING_PER_PX));
        pull.set(angle);
        stir(n, angle);
      }}
      onPointerUp={release}
      onPointerCancel={release}
      onClick={() => {
        // A pull is play, not a tap: only a still press opens the person.
        if (!dragged.current) onSelect(p.id);
        dragged.current = false;
      }}
    >
      {body}
    </button>
  );
}

/** A strand of two-ply yarn: a body, a twist and a soft blurred shadow on the page. */
export function Strand({ d, color = 'var(--yarn)', delay = 0, width = 3.4 }: { d: string; color?: string; delay?: number; width?: number }) {
  const blur = useId();
  const draw = { initial: { pathLength: 0 }, animate: { pathLength: 1 }, transition: { duration: 0.9, ease: [0.3, 0.6, 0.2, 1] as const, delay } };
  return (
    <g fill="none" strokeLinecap="round">
      <filter id={blur} x="-10%" y="-50%" width="120%" height="200%">
        <feGaussianBlur stdDeviation="1.6" />
      </filter>
      <motion.path d={d} stroke="rgb(20,30,50)" strokeOpacity={0.12} strokeWidth={width + 1} transform="translate(0 3.5)" filter={`url(#${blur})`} {...draw} />
      <motion.path d={d} stroke={color} strokeWidth={width} {...draw} />
      <motion.path
        d={d}
        stroke="rgba(0,0,0,.25)"
        strokeWidth={width}
        strokeDasharray="1.6 2.8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: delay + 0.85, duration: 0.3 }}
      />
    </g>
  );
}
