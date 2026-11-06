import React from 'react';
import { motion } from 'motion/react';
import { DiscoveryStyleId } from '../../types';
import { Flower, Sprout } from './Flower';

export interface GardenPlant {
  id: string;
  name: string;
  style?: DiscoveryStyleId;
  isYou?: boolean;
}

const STEMS = [78, 120, 58, 104, 46, 112, 66, 92];
const SIZES = [64, 70, 62, 68, 60, 66, 62, 64];

/**
 * The family as a pop-up paper garden: cut-paper hills with each person standing on them
 * as their flower, named on a wooden marker. Sun and paper clouds by day; moon, stars and
 * fireflies by night. Tapping a flower opens that person.
 */
export function PopupGarden({
  plants,
  onSelect,
  children,
  height = 340,
  markers = true,
  decor,
  clouds = [
    [8, 38, 92],
    [58, 30, 70],
  ],
}: {
  plants: GardenPlant[];
  onSelect?: (id: string) => void;
  children?: React.ReactNode;
  height?: number;
  markers?: boolean;
  /** Extra art layered behind the plants, e.g. an oversized flower on the welcome poster. */
  decor?: React.ReactNode;
  /** Paper clouds as [left %, top %, width px]. */
  clouds?: number[][];
}) {
  const n = Math.max(plants.length, 1);
  const scale = n > 6 ? 0.78 : n > 5 ? 0.86 : 1;
  return (
    <div className="panel panel-leaf" style={{ height, padding: 0 }}>
      <div
        aria-hidden
        className="absolute rounded-full"
        style={{ right: 24, top: 22, width: 52, height: 52, background: 'var(--orb)', boxShadow: '0 0 0 10px color-mix(in srgb, var(--orb) 16%, transparent), 0 0 0 22px color-mix(in srgb, var(--orb) 8%, transparent)' }}
      />
      <Sky clouds={clouds} />
      {decor}
      {children && <div className="relative z-[3] px-5 pt-5">{children}</div>}

      <Hill style={{ left: '-20%', right: '30%', bottom: -60, height: 196, background: 'var(--hill-1)' }} />
      <Hill style={{ left: '34%', right: '-26%', bottom: -78, height: 182, background: 'var(--hill-2)' }} />
      <Hill style={{ left: '-14%', right: '-14%', bottom: -116, height: 176, background: 'var(--hill-3)' }} />

      <div className="absolute inset-x-1 bottom-[16px] z-[2] flex items-end justify-around">
        {plants.map((p, i) => {
          const stem = STEMS[i % STEMS.length];
          const size = SIZES[i % SIZES.length] * scale;
          const content = (
            <>
              <motion.div
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 170, damping: 18, delay: 0.06 * i }}
                style={{ filter: 'drop-shadow(0 6px 0 rgba(0,0,0,.14))' }}
              >
                {p.style ? <Flower style={p.style} size={size} stem={stem} sway bloom delay={0.15 + i * 0.12} /> : <Sprout size={size * 0.8} />}
              </motion.div>
              {markers && (
                <span className="marker -mt-2 relative z-[3]" style={{ transform: `rotate(${i % 2 ? 2.5 : -3}deg)` }}>
                  {p.name}
                  {p.isYou && <span className="sr-only"> (you)</span>}
                </span>
              )}
            </>
          );
          return onSelect ? (
            <button
              key={p.id}
              type="button"
              onClick={() => onSelect(p.id)}
              className="flex flex-col items-center bg-transparent border-0 p-0 min-w-[44px] transition-transform active:scale-95"
              aria-label={`${p.name}${p.isYou ? ' (you)' : ''}: ${p.style ? `${p.style} style` : 'not bloomed yet'}`}
            >
              {content}
            </button>
          ) : (
            <div key={p.id} className="flex flex-col items-center">
              {content}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Hill({ style }: { style: React.CSSProperties }) {
  return <div aria-hidden className="absolute z-[1]" style={{ borderRadius: '50% 50% 0 0 / 100% 100% 0 0', boxShadow: '0 -5px 0 rgba(0,0,0,.12)', ...style }} />;
}

/** Paper clouds by day; stars and fireflies by night. */
function Sky({ clouds }: { clouds: number[][] }) {
  return (
    <div aria-hidden className="absolute inset-0 pointer-events-none">
      <div className="dark:hidden">
        {clouds.map(([x, y, w], i) => (
          <Cloud key={i} style={{ left: `${x}%`, top: `${y}%`, width: w }} flip={i % 2 === 1} />
        ))}
      </div>
      <div className="hidden dark:block">
        {[
          [12, 20, 1],
          [30, 34, 0.7],
          [48, 16, 0.9],
          [66, 40, 0.6],
          [20, 46, 0.5],
          [80, 52, 0.8],
        ].map(([x, y, o], i) => (
          <svg key={i} className="absolute" style={{ left: `${x}%`, top: `${y}%`, opacity: o }} width="10" height="10" viewBox="0 0 10 10">
            <path d="M5 0 L6 4 L10 5 L6 6 L5 10 L4 6 L0 5 L4 4 Z" fill="#f3efd8" />
          </svg>
        ))}
        {[
          [24, 58],
          [52, 50],
          [74, 62],
        ].map(([x, y], i) => (
          <motion.span
            key={`f${i}`}
            className="absolute rounded-full"
            style={{ left: `${x}%`, top: `${y}%`, width: 5, height: 5, background: '#fff6a8', boxShadow: '0 0 10px 3px rgba(255,240,140,.55)' }}
            animate={{ opacity: [0.2, 1, 0.2], y: [0, -8, 0] }}
            transition={{ duration: 3 + i * 0.8, repeat: Infinity, ease: 'easeInOut', delay: i * 0.6 }}
          />
        ))}
      </div>
    </div>
  );
}

function Cloud({ style, flip }: { style: React.CSSProperties; flip?: boolean }) {
  return (
    <svg className="absolute" style={{ ...style, transform: flip ? 'scaleX(-1)' : undefined, filter: 'drop-shadow(0 4px 0 rgba(0,0,0,.10))' }} viewBox="0 0 100 44">
      <path d="M8 40 C 0 40, 0 26, 12 26 C 12 14, 28 10, 36 18 C 40 4, 64 2, 68 18 C 78 12, 94 18, 90 30 C 100 32, 98 40, 90 40 Z" fill="#ffffff" opacity=".92" />
    </svg>
  );
}
