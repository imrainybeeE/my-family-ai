import React, { useState } from 'react';
import { motion } from 'motion/react';
import { useHousehold } from '../../context/HouseholdContext';
import { PopupGarden } from '../art/PopupGarden';
import { CreateFamily } from '../onboarding/CreateFamily';
import { JoinFamily } from '../onboarding/JoinFamily';
import { STYLE_ORDER, FLOWERS } from '../../data/flowers';
import { Flower } from '../art/Flower';

export function Welcome() {
  const { startDemo, error, clearError } = useHousehold();
  const [sheet, setSheet] = useState<'create' | 'join' | null>(null);

  return (
    <div className="page min-h-[100dvh] flex flex-col" style={{ paddingBottom: 'calc(28px + var(--safe-b))' }}>
      <PopupGarden
        height={470}
        markers={false}
        clouds={[
          [66, 60, 76],
          [6, 62, 54],
        ]}
        plants={STYLE_ORDER.map((s) => ({ id: s, name: FLOWERS[s].flower, style: s }))}
        decor={
          <motion.div
            aria-hidden
            className="absolute z-[1]"
            style={{ right: -92, top: -86 }}
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1, rotate: 360 }}
            transition={{ scale: { type: 'spring', stiffness: 90, damping: 14 }, opacity: { duration: 0.4 }, rotate: { duration: 90, repeat: Infinity, ease: 'linear' } }}
          >
            <Flower style="Achiever" size={270} />
          </motion.div>
        }
      >
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.5 }}>
          <h1 className="t-display max-w-[12rem]" style={{ color: 'var(--hero-ink)', fontSize: '3.25rem', lineHeight: 0.95 }}>
            My Family AI
          </h1>
          <p className="t-body mt-4 max-w-[13.5rem]" style={{ color: 'var(--hero-ink-2)', fontSize: '1.0625rem' }}>
            Find out how each of you blooms, and what you love doing together.
          </p>
        </motion.div>
      </PopupGarden>

      <motion.div
        className="mt-6 px-1"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.5 }}
      >
        <p className="t-small ink-2">
          Everyone answers a few playful questions on their own phone. You each get one of six flowers, the family garden grows,
          and an AI helper uses your answers to plan meals, days out and better conversations.
        </p>

        {error && (
          <div role="alert" className="mt-4 rounded-2xl px-4 py-3 t-small flex items-start justify-between gap-3" style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}>
            <span>{error}</span>
            <button type="button" className="t-label underline bg-transparent border-0" onClick={clearError}>
              Dismiss
            </button>
          </div>
        )}

        <div className="mt-6 grid gap-3">
          <button type="button" className="btn btn-primary btn-block" onClick={() => setSheet('create')}>
            Start your family
          </button>
          <button type="button" className="btn btn-block" onClick={() => setSheet('join')}>
            Join with a family code
          </button>
          <button type="button" className="btn btn-quiet btn-block" onClick={startDemo}>
            Look around a demo family
          </button>
        </div>

        <p className="t-small ink-3 mt-6 text-center">
          A student-built project for Axcel International School. No emails, passwords or addresses needed.
        </p>
      </motion.div>

      <CreateFamily open={sheet === 'create'} onClose={() => setSheet(null)} />
      <JoinFamily open={sheet === 'join'} onClose={() => setSheet(null)} />
    </div>
  );
}
