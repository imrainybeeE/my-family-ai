import React, { useEffect } from 'react';
import { motion, useAnimate, useReducedMotion } from 'motion/react';
import { DiscoveryStyleId } from '../../types';
import { Felt, FeltName } from './Flower';

export const PETAL: Record<DiscoveryStyleId, FeltName> = {
  Explorer: 'petal-explorer',
  Creator: 'petal-creator',
  Connector: 'petal-connector',
  Achiever: 'petal-achiever',
  Chiller: 'petal-chiller',
  Thinker: 'petal-thinker',
};

/** The golden angle spreads petals evenly however many there are, like a sunflower head. */
const GOLDEN = 137.508;
/** Where the petal's base sits in its image (the petal fills the square from 8% to 92%). */
const BASE = '50% 91%';

/**
 * The flower you sew during the Foundation questions: every pick adds a felt petal in the
 * colour of the style it leans towards, around a knotted felt centre.
 */
export function StitchedFlower({ petals, size = 120, landDelay = 0, spin = 0, sewn = false }: { petals: DiscoveryStyleId[]; size?: number; /** Seconds a new petal waits, while it flies in. */ landDelay?: number; /** Each change turns the flower once. */ spin?: number; /** Already sewn: the petals are there from the first frame. */ sewn?: boolean }) {
  const petalSize = size * 0.52;
  const centre = size * 0.34;
  const [scope, animate] = useAnimate();
  const reduce = useReducedMotion();
  // A little bounce each time a petal is sewn on (none with reduced motion).
  useEffect(() => {
    if (petals.length && !reduce && !sewn) animate(scope.current, { scale: [0.93, 1] }, { type: 'spring', stiffness: 500, damping: 12, delay: landDelay });
  }, [petals.length, animate, scope, reduce, landDelay]);
  useEffect(() => {
    if (spin && !reduce) animate(scope.current, { rotate: [0, 360] }, { type: 'spring', stiffness: 60, damping: 13 });
  }, [spin, animate, scope, reduce]);
  return (
    <div ref={scope} className="relative" style={{ width: size, height: size }} aria-hidden>
      {petals.map((style, i) => {
        const angle = (i * GOLDEN) % 360;
        return (
          <motion.span
            key={i}
            className="absolute"
            style={{ left: size / 2 - petalSize / 2, top: size / 2 - petalSize * 0.91, width: petalSize, height: petalSize, transformOrigin: BASE }}
            initial={sewn ? false : { scale: 0, rotate: angle - 40 }}
            animate={{ scale: 0.92 + ((i * 7) % 5) * 0.03, rotate: angle }}
            transition={{ type: 'spring', stiffness: 260, damping: 15, delay: reduce ? 0 : landDelay }}
          >
            <Felt name={PETAL[style]} size={petalSize} />
          </motion.span>
        );
      })}
      <span className="absolute" style={{ left: size / 2 - centre / 2, top: size / 2 - centre / 2 }}>
        <Felt name="centre" size={centre} />
      </span>
    </div>
  );
}

/** The tick on a picked answer: the petal that answer sews on. */
export function PetalMark({ style, on }: { style?: DiscoveryStyleId; on: boolean }) {
  return (
    <span className="seed" aria-hidden style={on && style ? { background: 'transparent', borderColor: 'transparent' } : undefined}>
      {on && style && (
        <motion.span initial={{ scale: 0, rotate: -60 }} animate={{ scale: 1, rotate: 25 }} transition={{ type: 'spring', stiffness: 420, damping: 14 }}>
          <Felt name={PETAL[style]} size={34} />
        </motion.span>
      )}
    </span>
  );
}
