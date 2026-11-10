import React, { useMemo } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { STYLE_ORDER } from '../../data/flowers';
import { Felt } from './Flower';
import { PETAL } from './StitchedFlower';
import { DiscoveryStyleId } from '../../types';

/**
 * A burst of felt petals thrown out from a flower as it opens: the same rendered petals the quiz sews
 * on, arcing out, tumbling and settling with a little gravity. Played once; skipped with reduced motion.
 */
export function PetalBurst({ styles, count = 10, delay = 0, radius = 170, floor = Infinity }: { styles: DiscoveryStyleId[]; count?: number; delay?: number; radius?: number; /** How far below the centre a falling petal may reach, in px, so it never crosses text under the flower. */ floor?: number }) {
  const reduce = useReducedMotion();
  const petals = useMemo(() => {
    const palette = styles.length ? styles : STYLE_ORDER;
    return Array.from({ length: count }, (_, i) => {
      // Spread evenly with a little jitter, so the burst reads as a ring and not a spray.
      const angle = (i / count) * Math.PI * 2 + Math.sin(i * 12.9898) * 0.25;
      const reach = radius * (0.7 + ((i * 7) % 5) * 0.08);
      const size = 34 + ((i * 5) % 4) * 6;
      const fall = 40 + ((i * 13) % 4) * 18;
      return {
        x: Math.cos(angle) * reach,
        // Petals thrown downward land short of the floor, spreading sideways instead.
        y: Math.min(Math.sin(angle) * reach * 0.85, floor - fall - size / 2),
        fall,
        spin: (i % 2 ? 1 : -1) * (160 + ((i * 31) % 5) * 50),
        size,
        style: palette[i % palette.length],
        tilt: (angle * 180) / Math.PI + 90,
      };
    });
  }, [styles, count, radius, floor]);

  if (reduce) return null;
  return (
    <div className="absolute inset-0 grid place-items-center pointer-events-none" aria-hidden>
      {petals.map((p, i) => (
        <motion.div
          key={i}
          className="absolute"
          style={{ width: p.size, height: p.size, transformPerspective: 400 }}
          initial={{ x: p.x * 0.3, y: p.y * 0.3, opacity: 0, scale: 0.6, rotate: p.tilt, rotateX: 0 }}
          animate={{ x: [p.x * 0.3, p.x, p.x * 1.05], y: [p.y * 0.3, p.y, p.y + p.fall], opacity: [0, 1, 1, 0], scale: [0.6, 1, 1], rotate: [p.tilt, p.tilt + p.spin], rotateX: [0, 55] }}
          transition={{ duration: 1.6, delay: delay + (i % 6) * 0.015, ease: [0.2, 0.7, 0.3, 1], times: [0, 0.4, 1], opacity: { duration: 1.6, delay, times: [0, 0.1, 0.7, 1] } }}
        >
          <Felt name={PETAL[p.style]} size={p.size} />
        </motion.div>
      ))}
    </div>
  );
}
