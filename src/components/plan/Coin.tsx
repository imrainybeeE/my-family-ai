import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Felt } from '../art/Flower';
import { feel } from '../../feel/feel';

/** Flip a sewing button: yellow side up for the first choice, pink for the second. */
export function Coin() {
  const [a, setA] = useState('Pizza');
  const [b, setB] = useState('Dumplings');
  const [turns, setTurns] = useState(0);
  const [landed, setLanded] = useState<'a' | 'b' | null>(null);
  const [flipping, setFlipping] = useState(false);
  const landTimer = useRef<number | null>(null);
  useEffect(() => () => {
    if (landTimer.current !== null) window.clearTimeout(landTimer.current);
  }, []);

  const flip = () => {
    if (!a.trim() || !b.trim() || flipping) return;
    const side: 'a' | 'b' = Math.random() < 0.5 ? 'a' : 'b';
    // Whole turns keep the yellow face forward; a half turn more lands on pink.
    const base = Math.ceil(turns / 360) * 360 + 360 * 5;
    setTurns(base + (side === 'b' ? 180 : 0));
    setLanded(null);
    setFlipping(true);
    feel('flip');
    landTimer.current = window.setTimeout(() => {
      setLanded(side);
      setFlipping(false);
      feel('land');
    }, 1450);
  };

  const winner = landed === 'a' ? a : landed === 'b' ? b : null;

  return (
    <section className="card p-5">
      <div className="grid grid-cols-2 gap-2">
        <label className="grid gap-1.5">
          <span className="t-label flex items-center gap-1.5">
            <span aria-hidden className="w-3 h-3 rounded-full" style={{ background: '#f4c542' }} />
            Yellow
          </span>
          <input className="field" value={a} maxLength={30} onChange={(e) => setA(e.target.value)} />
        </label>
        <label className="grid gap-1.5">
          <span className="t-label flex items-center gap-1.5">
            <span aria-hidden className="w-3 h-3 rounded-full" style={{ background: '#f08aa6' }} />
            Pink
          </span>
          <input className="field" value={b} maxLength={30} onChange={(e) => setB(e.target.value)} />
        </label>
      </div>

      <div className="flex flex-col items-center mt-4" style={{ perspective: 700 }}>
        <motion.div
          className="relative"
          style={{ width: 132, height: 132, transformStyle: 'preserve-3d' }}
          animate={{ rotateY: turns, y: flipping ? [0, -96, 0] : 0 }}
          transition={{ rotateY: { duration: 1.4, ease: [0.2, 0.7, 0.3, 1] }, y: { duration: 1.4, ease: 'easeOut' } }}
        >
          <Face name="coin-heads" />
          <Face name="coin-tails" back />
        </motion.div>
        <p className="t-title mt-2 min-h-[1.4em] text-center" aria-live="polite">
          {winner ? `${winner}!` : flipping ? '' : ' '}
        </p>
        <button type="button" className="btn btn-primary mt-3 w-full" onClick={flip} disabled={flipping || !a.trim() || !b.trim()}>
          Flip the button
        </button>
      </div>
    </section>
  );
}

function Face({ name, back }: { name: 'coin-heads' | 'coin-tails'; back?: boolean }) {
  return (
    <div className="absolute inset-0" style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', transform: back ? 'rotateY(180deg)' : undefined }}>
      <Felt name={name} size={132} />
    </div>
  );
}
