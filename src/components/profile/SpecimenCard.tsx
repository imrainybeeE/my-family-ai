import React from 'react';
import { motion } from 'motion/react';
import { DiscoveryStyleId } from '../../types';
import { FLOWERS } from '../../data/flowers';
import { DISCOVERY_STYLES_INFO } from '../../data/foundationQuestions';
import { Flower } from '../art/Flower';

/**
 * A pressed-flower specimen card: the person's top style as the main flower and their
 * second style as a smaller bud. Only these two styles are ever shown.
 */
export function SpecimenCard({
  name,
  top,
  second,
  bloom = false,
}: {
  name: string;
  top: DiscoveryStyleId;
  second: DiscoveryStyleId;
  bloom?: boolean;
}) {
  const f = FLOWERS[top];
  const s = FLOWERS[second];
  return (
    <div className="relative mx-auto pt-3" style={{ maxWidth: 380 }}>
      <span className="tape z-[2]" style={{ top: 0, left: 18, transform: 'rotate(-8deg)' }} aria-hidden />
      <span className="tape z-[2]" style={{ top: 2, right: 18, transform: 'rotate(7deg)', background: 'rgba(196,229,246,.7)' }} aria-hidden />
      <div className="card overflow-hidden" style={{ borderRadius: 10 }}>
        <div className="relative grid place-items-center pt-6 pb-2" style={{ background: `color-mix(in srgb, ${f.color} 26%, var(--card))`, minHeight: 250 }}>
          <div className="flex items-end gap-1">
            <Flower style={top} size={168} stem={46} bloom={bloom} delay={0.2} />
            <motion.div initial={bloom ? { opacity: 0, y: 20 } : false} animate={{ opacity: 1, y: 0 }} transition={{ delay: bloom ? 0.9 : 0 }}>
              <Flower style={second} size={70} stem={70} />
            </motion.div>
          </div>
        </div>
        <div className="px-5 pt-4 pb-5">
          <p className="t-hand ink-2" style={{ fontSize: '1rem' }}>
            {name}’s specimen
          </p>
          <h3 className="t-display mt-1" style={{ fontSize: '2.25rem' }}>
            {f.flower}
          </h3>
          <p className="t-head mt-1">
            {DISCOVERY_STYLES_INFO[top].title}
            <span className="ink-2 font-medium"> with a touch of {s.flower} ({second})</span>
          </p>
          <p className="t-body ink-2 mt-2">{f.tagline}</p>
          <div className="mt-4 pt-3 border-t border-dashed t-small ink-3" style={{ borderColor: 'var(--line-strong)' }}>
            A fun discovery profile from this app’s questions, not a psychological assessment.
          </div>
        </div>
      </div>
    </div>
  );
}
