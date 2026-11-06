import React, { useState } from 'react';
import { motion } from 'motion/react';

/** A brass coin with a flower on each face. Type two options and flip it. */
export function Coin() {
  const [a, setA] = useState('Pizza');
  const [b, setB] = useState('Dumplings');
  const [turns, setTurns] = useState(0);
  const [landed, setLanded] = useState<'a' | 'b' | null>(null);
  const [flipping, setFlipping] = useState(false);

  const flip = () => {
    if (!a.trim() || !b.trim() || flipping) return;
    const side: 'a' | 'b' = Math.random() < 0.5 ? 'a' : 'b';
    // Whole turns keep face A forward; a half turn more lands on face B.
    const base = Math.ceil(turns / 360) * 360 + 360 * 5;
    setTurns(base + (side === 'b' ? 180 : 0));
    setLanded(null);
    setFlipping(true);
    window.setTimeout(() => {
      setLanded(side);
      setFlipping(false);
    }, 1450);
  };

  const winner = landed === 'a' ? a : landed === 'b' ? b : null;

  return (
    <section className="panel panel-card">
      <div className="grid grid-cols-2 gap-2">
        <label className="grid gap-1">
          <span className="t-label ink-2">Heads</span>
          <input className="field" value={a} maxLength={30} onChange={(e) => setA(e.target.value)} />
        </label>
        <label className="grid gap-1">
          <span className="t-label ink-2">Tails</span>
          <input className="field" value={b} maxLength={30} onChange={(e) => setB(e.target.value)} />
        </label>
      </div>

      <div className="flex flex-col items-center mt-5" style={{ perspective: 700 }}>
        <motion.div
          className="relative"
          style={{ width: 128, height: 128, transformStyle: 'preserve-3d' }}
          animate={{ rotateY: turns, y: flipping ? [0, -90, 0] : 0 }}
          transition={{ rotateY: { duration: 1.4, ease: [0.2, 0.7, 0.3, 1] }, y: { duration: 1.4, ease: 'easeOut' } }}
        >
          <CoinFace label={a} flower="#ffd23f" />
          <CoinFace label={b} flower="#ff6a4d" back />
        </motion.div>
        <div className="h-3 w-24 rounded-full mt-3" style={{ background: 'rgba(0,0,0,.12)', filter: 'blur(3px)' }} aria-hidden />
        <p className="t-head mt-3 min-h-[1.6em] text-center" aria-live="polite">
          {winner ? `${winner} it is!` : flipping ? 'Flipping…' : ' '}
        </p>
        <button type="button" className="btn btn-sun mt-2" onClick={flip} disabled={flipping || !a.trim() || !b.trim()}>
          Flip the coin
        </button>
      </div>
    </section>
  );
}

function CoinFace({ label, flower, back }: { label: string; flower: string; back?: boolean }) {
  return (
    <div
      className="absolute inset-0 rounded-full grid place-items-center text-center"
      style={{
        backfaceVisibility: 'hidden',
        WebkitBackfaceVisibility: 'hidden',
        transform: back ? 'rotateY(180deg)' : undefined,
        background: '#e3b94a',
        boxShadow: 'inset 0 0 0 6px #c99a2e, inset 0 0 0 8px #f3d27a, inset 0 -10px 18px rgba(120,80,0,.35), 0 6px 0 #a67a1c',
        color: '#4a3300',
      }}
    >
      <div className="flex flex-col items-center px-4">
        <svg width="34" height="34" viewBox="0 0 40 40" aria-hidden>
          {[0, 72, 144, 216, 288].map((r) => (
            <ellipse key={r} cx="20" cy="10" rx="6" ry="9" transform={`rotate(${r} 20 20)`} fill={flower} stroke="#4a3300" strokeWidth="1.8" />
          ))}
          <circle cx="20" cy="20" r="5" fill="#4a3300" />
        </svg>
        <span className="font-bold leading-tight mt-1 line-clamp-2" style={{ fontSize: label.length > 12 ? 13 : 15 }}>
          {label || '…'}
        </span>
      </div>
    </div>
  );
}
