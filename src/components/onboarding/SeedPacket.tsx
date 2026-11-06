import React from 'react';
import { DiscoveryStyleId } from '../../types';
import { Flower, Sprout } from '../art/Flower';

/**
 * The family code printed on a paper seed packet. Sharing the packet is how
 * everyone else joins the garden.
 */
export function SeedPacket({
  code,
  name,
  styles,
  children,
}: {
  code: string;
  name?: string;
  styles: (DiscoveryStyleId | undefined)[];
  children?: React.ReactNode;
}) {
  const shown = styles.slice(0, 5);
  return (
    <div className="relative mx-auto" style={{ maxWidth: 360 }}>
      {/* Envelope flap */}
      <svg viewBox="0 0 360 44" className="block w-full" aria-hidden style={{ marginBottom: -1 }}>
        <path d="M6 44 L30 8 Q34 2 42 2 H318 Q326 2 330 8 L354 44 Z" fill="var(--card)" stroke="var(--line-strong)" strokeWidth="1.5" />
        <path d="M30 40 H330" stroke="var(--line)" strokeWidth="2" strokeDasharray="2 6" strokeLinecap="round" />
      </svg>
      <div className="card px-5 pt-4 pb-5" style={{ borderRadius: '0 0 22px 22px', boxShadow: 'var(--shadow-card)' }}>
        <div className="rounded-[18px] overflow-hidden relative" style={{ background: 'var(--sky-bg)', height: 112 }}>
          <div className="absolute inset-x-0 bottom-0 h-8" style={{ background: 'var(--hill-3)' }} />
          <div className="absolute inset-x-3 bottom-2 flex items-end justify-around">
            {shown.length === 0 && <Sprout size={56} />}
            {shown.map((s, i) => (
              <div key={i} style={{ transform: `translateY(${i % 2 ? 4 : 0}px)` }}>
                {s ? <Flower style={s} size={48} stem={[40, 60, 24, 52, 32][i]} /> : <Sprout size={44} />}
              </div>
            ))}
          </div>
        </div>
        <p className="t-label ink-2 mt-4">{name ? `${name} seed packet` : 'Your family seed packet'}</p>
        <p
          className="mt-1 font-extrabold tracking-[0.06em] tabular-nums"
          style={{ fontSize: '2rem', lineHeight: 1.1, fontVariationSettings: "'opsz' 96" }}
          aria-label={`Family code ${code.split('').join(' ')}`}
        >
          {code}
        </p>
        <p className="t-small ink-2 mt-1">Plant this code on each family phone to join the garden.</p>
        {children && <div className="mt-4">{children}</div>}
      </div>
    </div>
  );
}
