import React from 'react';
import { motion } from 'motion/react';
import { useWidth } from './Garland';

const BEAD_OFFSETS = [6, -10, 4, -6, 8, -4];

/** A strand of yarn that grows across the top as you answer, threaded with a bead per stage. */
export function YarnProgress({ progress, beads }: { progress: number; beads: number }) {
  const [ref, w] = useWidth<HTMLDivElement>(240);
  const d = `M 6 22 C ${w * 0.2} 12, ${w * 0.32} 32, ${w * 0.5} 22 S ${w * 0.8} 12, ${w - 6} 22`;
  return (
    <div ref={ref} className="flex-1 relative h-11" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)} aria-label="Progress">
      <svg width={w} height={44} className="absolute inset-0 overflow-visible" aria-hidden>
        <path d={d} stroke="var(--line-strong)" strokeWidth="2" fill="none" strokeLinecap="round" strokeDasharray="2 6" />
        <motion.path d={d} stroke="var(--yarn)" strokeWidth="3.4" fill="none" strokeLinecap="round" initial={false} animate={{ pathLength: Math.max(progress, 0.02) }} transition={{ type: 'spring', stiffness: 120, damping: 20 }} />
      </svg>
      <div className="absolute inset-0 flex justify-between items-center px-[9%]" aria-hidden>
        {Array.from({ length: beads }, (_, i) => {
          const done = progress >= (i + 1) / beads - 1e-6;
          return (
            <motion.span
              key={i}
              className="block rounded-full"
              animate={{ scale: done ? 1 : 0.8 }}
              style={{ width: 11, height: 11, marginTop: BEAD_OFFSETS[i % BEAD_OFFSETS.length], background: done ? 'var(--yarn)' : 'var(--card)', boxShadow: done ? 'none' : 'inset 0 0 0 1.5px var(--line-strong)' }}
            />
          );
        })}
      </div>
    </div>
  );
}
