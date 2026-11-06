import React from 'react';
import { motion } from 'motion/react';
import { DiscoveryStyleId } from '../../types';
import { FLOWERS } from '../../data/flowers';
import { DISCOVERY_STYLES_INFO } from '../../data/foundationQuestions';
import { Flower } from '../art/Flower';

/**
 * A scrapbook page for one person: their top style as a big felt flower taped in, their
 * second style pinned beside it, and their name in handwriting. Only these two are shown.
 */
export function SpecimenCard({ name, top, second, bloom = false }: { name: string; top: DiscoveryStyleId; second: DiscoveryStyleId; bloom?: boolean }) {
  const f = FLOWERS[top];
  return (
    <div className="relative pt-2">
      <span className="tape" style={{ top: -2, left: 16, transform: 'rotate(-7deg)' }} aria-hidden />
      <span className="tape tape-sky" style={{ top: 0, right: 16, transform: 'rotate(6deg)' }} aria-hidden />
      <div className="card overflow-hidden">
        <div className="relative grid place-items-center pt-6 pb-4" style={{ background: `color-mix(in srgb, ${f.color} 20%, var(--card))` }}>
          <Flower style={top} size={210} bloom={bloom} delay={0.15} />
          <motion.div
            className="absolute right-3 bottom-2"
            initial={bloom ? { opacity: 0, scale: 0.6 } : false}
            animate={{ opacity: 1, scale: 1, rotate: 10 }}
            transition={{ type: 'spring', stiffness: 200, damping: 16, delay: bloom ? 0.8 : 0 }}
          >
            <Flower style={second} size={84} />
          </motion.div>
        </div>
        <div className="px-5 pt-4 pb-5">
          <p className="t-hand ink-2" style={{ fontSize: '1.0625rem' }}>
            {name}
          </p>
          <h3 className="t-display mt-0.5">{f.flower}</h3>
          <p className="t-head mt-1.5">
            {DISCOVERY_STYLES_INFO[top].title}
            <span className="ink-2" style={{ fontWeight: 500 }}>
              {' '}
              with a touch of {FLOWERS[second].flower}
            </span>
          </p>
          <p className="t-body ink-2 mt-1">{f.tagline}</p>
        </div>
      </div>
    </div>
  );
}
