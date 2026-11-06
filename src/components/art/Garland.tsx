import React, { useLayoutEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
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
 */
export function Garland({ plants, onSelect }: { plants: GardenPlant[]; onSelect?: (id: string) => void }) {
  const [ref, w] = useWidth<HTMLDivElement>();
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
              const n = offset + i;
              const bud = !p.style;
              const s = bud ? Math.round(size * 0.9) : size;
              const label = `${p.name}${p.isYou ? ' (you)' : ''}, ${p.style ? `${p.style}` : 'not bloomed yet'}`;
              const body = (
                <>
                  <motion.span
                    className="block"
                    initial={{ scale: 0.5, rotate: TILTS[n % 8] - 25, opacity: 0 }}
                    animate={{ scale: 1, rotate: TILTS[n % 8], opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 220, damping: 16, delay: 0.35 + n * 0.08 }}
                  >
                    <Felt name={bud ? 'bud' : FELT_FOR_STYLE[p.style!]} size={s} />
                  </motion.span>
                  <span className="tag -mt-4 relative" style={{ transform: `rotate(${n % 2 ? 3 : -3}deg)`, background: p.isYou ? '#fbe2ea' : undefined }}>
                    {p.name}
                  </span>
                </>
              );
              return (
                <div key={p.id} role="listitem" className="absolute flex flex-col items-center" style={{ left: x - s / 2, top: y - s / 2, width: s }}>
                  {onSelect ? (
                    <button type="button" onClick={() => onSelect(p.id)} className="flex flex-col items-center bg-transparent border-0 p-0 transition-transform active:scale-95" aria-label={label}>
                      {body}
                    </button>
                  ) : (
                    <div className="flex flex-col items-center" aria-label={label}>
                      {body}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

/** A strand of two-ply yarn: a body, a twist and a soft shadow on the page. */
export function Strand({ d, color = 'var(--yarn)', delay = 0, width = 3.4 }: { d: string; color?: string; delay?: number; width?: number }) {
  const draw = { initial: { pathLength: 0 }, animate: { pathLength: 1 }, transition: { duration: 0.9, ease: [0.3, 0.6, 0.2, 1] as const, delay } };
  return (
    <g fill="none" strokeLinecap="round">
      <motion.path d={d} stroke="rgba(20,30,50,.14)" strokeWidth={width} transform="translate(1 3)" {...draw} />
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
