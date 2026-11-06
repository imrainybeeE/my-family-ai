import React, { useState } from 'react';
import { motion } from 'motion/react';
import { useHousehold } from '../../context/HouseholdContext';
import { CreateFamily } from '../onboarding/CreateFamily';
import { JoinFamily } from '../onboarding/JoinFamily';
import { Felt, FeltName } from '../art/Flower';
import { Strand, useWidth } from '../art/Garland';

/** The flat-lay on the cover, laid out for a 393px-wide page and scaled to fit. */
const SPREAD: { name: FeltName; x: number; y: number; size: number; r: number }[] = [
  { name: 'sunflower', x: 236, y: -46, size: 210, r: 8 },
  { name: 'poppy', x: -58, y: 14, size: 196, r: -10 },
  { name: 'yarnball', x: 136, y: 22, size: 128, r: 0 },
  { name: 'daisy', x: 96, y: 150, size: 176, r: 12 },
  { name: 'lavender', x: 252, y: 140, size: 176, r: 16 },
  { name: 'iris', x: -34, y: 236, size: 164, r: -6 },
  { name: 'dandelion', x: 230, y: 292, size: 148, r: -4 },
];
const HERO = 430;

export function Welcome() {
  const { startDemo, error, clearError } = useHousehold();
  const [sheet, setSheet] = useState<'create' | 'join' | null>(null);
  const [ref, w] = useWidth<HTMLDivElement>();
  const k = w / 393;

  return (
    <div className="min-h-[100dvh] flex flex-col overflow-hidden" style={{ paddingBottom: 'calc(24px + var(--safe-b))' }}>
      <div ref={ref} className="relative shrink-0" style={{ height: HERO * k }} aria-hidden>
        <svg className="absolute inset-0 overflow-visible" width={w} height={HERO * k}>
          <g transform={`scale(${k})`}>
            <Strand d="M 204 92 C 150 150, 330 170, 250 236 S 110 300, 170 360 S 320 420, 420 384" delay={0.5} width={3.4 / k} />
          </g>
        </svg>
        {SPREAD.map((f, i) => (
          <motion.div
            key={f.name}
            className="absolute"
            style={{ left: f.x * k, top: f.y * k, width: f.size * k }}
            initial={{ opacity: 0, scale: 0.7, rotate: f.r - 20 }}
            animate={{ opacity: 1, scale: 1, rotate: f.r }}
            transition={{ type: 'spring', stiffness: 160, damping: 17, delay: 0.08 * i }}
          >
            <Felt name={f.name} size={Math.round(f.size * k)} />
          </motion.div>
        ))}
      </div>

      <motion.div className="px-6 flex-1 flex flex-col" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45, duration: 0.5 }}>
        <h1 className="t-display" style={{ fontSize: '2.75rem', lineHeight: '46px' }}>
          My Family AI
        </h1>
        <p className="t-body ink-2 mt-3" style={{ fontSize: '1.125rem', lineHeight: '26px', textWrap: 'balance' }}>
          Find your flower. Plan things everyone loves.
        </p>

        {error && (
          <div role="alert" className="mt-4 rounded-xl px-4 py-3 t-small flex items-start justify-between gap-3" style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}>
            <span>{error}</span>
            <button type="button" className="t-label underline bg-transparent border-0" onClick={clearError}>
              Dismiss
            </button>
          </div>
        )}

        <div className="mt-auto pt-8 grid gap-3">
          <button type="button" className="btn btn-primary btn-block" onClick={() => setSheet('create')}>
            Start your family
          </button>
          <button type="button" className="btn btn-block" onClick={() => setSheet('join')}>
            Join with a code
          </button>
          <button type="button" className="btn btn-quiet btn-block" onClick={startDemo}>
            Try a demo family
          </button>
        </div>
      </motion.div>

      <CreateFamily open={sheet === 'create'} onClose={() => setSheet(null)} />
      <JoinFamily open={sheet === 'join'} onClose={() => setSheet(null)} />
    </div>
  );
}
