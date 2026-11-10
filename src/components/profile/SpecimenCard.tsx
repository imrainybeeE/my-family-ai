import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { DiscoveryStyleId } from '../../types';
import { FLOWERS } from '../../data/flowers';
import { Flower } from '../art/Flower';

/**
 * A scrapbook page for one person: their top style as a big felt flower taped in, their
 * second style pinned beside it, and their name in handwriting. Only these two are shown.
 */
/**
 * `bloom` animates the card in as a result; `pinOnly` keeps the main flower still (it has just opened
 * on the screen before) and only pins the second flower on.
 */
export function SpecimenCard({ name, top, second, bloom = false, pinOnly = false }: { name: string; top: DiscoveryStyleId; second: DiscoveryStyleId; bloom?: boolean; pinOnly?: boolean }) {
  const f = FLOWERS[top];
  const reduce = useReducedMotion();
  return (
    <div className="relative pt-4">
      <span className="tape" style={{ top: -2, left: 16, transform: 'rotate(-7deg)' }} aria-hidden />
      <span className="tape tape-sky" style={{ top: 0, right: 84, transform: 'rotate(6deg)' }} aria-hidden />
      <div className="card overflow-hidden">
        <div className="relative grid place-items-center" style={{ height: 208, background: `color-mix(in srgb, ${f.color} 20%, var(--card))` }}>
          {pinOnly && !reduce ? (
            // The opened flower is still flying in from the bloom; this one appears as it lands.
            <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.38, duration: 0.04 }}>
              <Flower style={top} size={168} />
            </motion.span>
          ) : (
            <Flower style={top} size={168} bloom={bloom && !pinOnly} delay={0.15} />
          )}
          <motion.div
            className="absolute right-3 bottom-2"
            initial={bloom ? { opacity: 0, scale: 0.6 } : false}
            animate={{ opacity: 1, scale: 1, rotate: 10 }}
            transition={{ type: 'spring', stiffness: 200, damping: 16, delay: bloom ? 0.8 : 0 }}
          >
            <Flower style={second} size={64} />
          </motion.div>
        </div>
        <motion.div className="px-5 pt-4 pb-5" initial={pinOnly && !reduce ? { opacity: 0 } : false} animate={{ opacity: 1 }} transition={{ delay: 0.2, duration: 0.12 }}>
          <p className="t-hand ink-2">{name}</p>
          <h3 className="t-title mt-1">
            {top} <span aria-hidden className="ink-3">·</span>
            <span className="sr-only">,</span> {second}
          </h3>
          <p className="t-small ink-2 mt-1">
            {f.flower} with a touch of {FLOWERS[second].flower.toLowerCase()}
          </p>
        </motion.div>
      </div>
    </div>
  );
}
