import React, { useLayoutEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { useWidth } from './Garland';

/**
 * A strand of yarn that grows across the top as you answer, threaded with a bead at the end of each
 * stage. The beads sit on the curve itself: their centres come from the same path the yarn follows.
 */
export function YarnProgress({ progress, beads, label }: { progress: number; beads: number; label?: string }) {
  const [ref, w] = useWidth<HTMLDivElement>(240);
  const pathRef = useRef<SVGPathElement>(null);
  const [points, setPoints] = useState<{ x: number; y: number }[]>([]);
  const d = `M 6 22 C ${w * 0.2} 12, ${w * 0.32} 32, ${w * 0.5} 22 S ${w * 0.8} 12, ${w - 6} 22`;

  useLayoutEffect(() => {
    const path = pathRef.current;
    if (!path) return;
    const length = path.getTotalLength();
    setPoints(
      Array.from({ length: beads }, (_, i) => {
        const p = path.getPointAtLength((length * (i + 1)) / beads - (i === beads - 1 ? 6 : 0));
        return { x: p.x, y: p.y };
      })
    );
  }, [d, beads]);

  return (
    <div className="flex-1 flex items-center gap-2 min-w-0">
    <div ref={ref} className="flex-1 relative h-11" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)} aria-valuetext={label ? `Question ${label}` : undefined} aria-label="Progress">
      <svg width={w} height={44} className="absolute inset-0 overflow-visible" aria-hidden>
        <path ref={pathRef} d={d} stroke="var(--line-strong)" strokeWidth="2" fill="none" strokeLinecap="round" strokeDasharray="2 6" />
        <motion.path d={d} stroke="var(--yarn)" strokeWidth="3.4" fill="none" strokeLinecap="round" initial={false} animate={{ pathLength: Math.max(progress, 0.02) }} transition={{ type: 'spring', stiffness: 120, damping: 20 }} />
        {points.map((p, i) => {
          const done = progress >= (i + 1) / beads - 1e-6;
          return (
            <motion.circle
              key={i}
              cx={p.x}
              cy={p.y}
              initial={false}
              animate={{ r: done ? 5.5 : 4.5, scale: done ? [1, 1.45, 1] : 1 }}
              transition={{ duration: 0.45, ease: [0.3, 0.7, 0.4, 1] }}
              style={{ transformOrigin: `${p.x}px ${p.y}px`, transformBox: 'view-box' }}
              fill={done ? 'var(--yarn)' : 'var(--card)'}
              stroke={done ? 'none' : 'var(--line-strong)'}
              strokeWidth={1.5}
            />
          );
        })}
      </svg>
    </div>
      {label && (
        <span className="shrink-0 tabular-nums ink-2" style={{ fontSize: 13, fontWeight: 600 }} aria-hidden>
          {label}
        </span>
      )}
    </div>
  );
}
