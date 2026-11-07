import React, { useMemo } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { FLOWERS, STYLE_ORDER } from '../../data/flowers';
import { DiscoveryStyleId } from '../../types';

/**
 * A burst of felt petals thrown out from a flower as it opens: each petal is a stitched felt shape
 * that arcs out, tumbles and settles with a little gravity. Played once; skipped with reduced motion.
 */
export function PetalBurst({ styles, count = 18, delay = 0, radius = 170 }: { styles: DiscoveryStyleId[]; count?: number; delay?: number; radius?: number }) {
  const reduce = useReducedMotion();
  const petals = useMemo(() => {
    const palette = styles.length ? styles : STYLE_ORDER;
    return Array.from({ length: count }, (_, i) => {
      // Spread evenly with a little jitter, so the burst reads as a ring and not a spray.
      const angle = (i / count) * Math.PI * 2 + Math.sin(i * 12.9898) * 0.25;
      const reach = radius * (0.7 + ((i * 7) % 5) * 0.08);
      return {
        x: Math.cos(angle) * reach,
        y: Math.sin(angle) * reach * 0.85,
        fall: 40 + ((i * 13) % 4) * 18,
        spin: (i % 2 ? 1 : -1) * (160 + ((i * 31) % 5) * 50),
        size: 16 + ((i * 5) % 3) * 5,
        color: FLOWERS[palette[i % palette.length]].color,
        tilt: (angle * 180) / Math.PI + 90,
      };
    });
  }, [styles, count, radius]);

  if (reduce) return null;
  return (
    <div className="absolute inset-0 grid place-items-center pointer-events-none" aria-hidden>
      {petals.map((p, i) => (
        <motion.svg
          key={i}
          width={p.size}
          height={p.size * 1.6}
          viewBox="0 0 20 32"
          className="absolute"
          style={{ filter: 'drop-shadow(0 2px 2px rgba(30,42,68,.22))' }}
          initial={{ x: 0, y: 0, opacity: 0, scale: 0.3, rotate: p.tilt }}
          animate={{ x: [0, p.x, p.x * 1.05], y: [0, p.y, p.y + p.fall], opacity: [0, 1, 1, 0], scale: [0.3, 1, 0.9], rotate: [p.tilt, p.tilt + p.spin] }}
          transition={{ duration: 1.6, delay: delay + (i % 6) * 0.015, ease: [0.2, 0.7, 0.3, 1], times: [0, 0.4, 1], opacity: { duration: 1.6, delay, times: [0, 0.1, 0.7, 1] } }}
        >
          <path d="M10 1 C 18 8, 18 22, 10 31 C 2 22, 2 8, 10 1 Z" fill={p.color} />
          <path d="M10 5 C 15 10, 15 21, 10 27 C 5 21, 5 10, 10 5 Z" fill="none" stroke="rgba(255,255,255,.55)" strokeWidth="1.1" strokeDasharray="2 2.2" />
        </motion.svg>
      ))}
    </div>
  );
}
