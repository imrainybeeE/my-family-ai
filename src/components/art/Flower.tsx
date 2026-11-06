import React from 'react';
import { motion } from 'motion/react';
import { DiscoveryStyleId } from '../../types';
import { FLOWERS } from '../../data/flowers';

/*
 * Hand-drawn flowers, one per discovery style. Ink outlines sit slightly off their colour
 * fills, like a two-colour print. Every head is drawn in a 100x100 box centred on (50, 50).
 */

const INK = 'var(--art-ink)';
const range = (n: number) => Array.from({ length: n }, (_, i) => i);
const polar = (deg: number, r: number) => {
  const a = (deg * Math.PI) / 180;
  return [50 + Math.cos(a) * r, 50 + Math.sin(a) * r] as const;
};

function Dandelion() {
  const f = FLOWERS.Explorer;
  return (
    <>
      <circle cx="52" cy="52" r="34" fill={f.color} opacity={0.9} />
      <g stroke={INK} strokeWidth={1.8} strokeLinecap="round" fill="none">
        {range(16).map((i) => {
          const deg = i * 22.5;
          const [x1, y1] = polar(deg, 7);
          const [x2, y2] = polar(deg, 28);
          const tip = (d: number) => polar(deg + d, 35);
          const [ax, ay] = tip(-7);
          const [bx, by] = tip(0);
          const [cx, cy] = tip(7);
          return (
            <path key={i} d={`M${x1},${y1} L${x2},${y2} L${ax},${ay} M${x2},${y2} L${bx},${by} M${x2},${y2} L${cx},${cy}`} />
          );
        })}
        <path d="M84 22 l8 -8 M92 14 l-1 -4 M92 14 l4 -1 M92 14 l3 3" />
        <path d="M76 9 l5 -4 M81 5 l0 -3 M81 5 l3 0 M81 5 l2 2" />
      </g>
      <circle cx="50" cy="50" r="6.5" fill={INK} />
    </>
  );
}

const POPPY_PETAL = 'M50 50 C 26 44, 18 14, 44 9 C 58 5, 76 12, 70 30 C 66 42, 58 48, 50 50 Z';
function Poppy() {
  const f = FLOWERS.Creator;
  const angles = [12, 102, 192, 282];
  return (
    <>
      <g transform="translate(2.5 2.5)" fill={f.color}>
        {angles.map((a) => (
          <path key={a} transform={`rotate(${a} 50 50)`} d={POPPY_PETAL} />
        ))}
      </g>
      <g fill="none" stroke={INK} strokeWidth={2.4} strokeLinejoin="round">
        {angles.map((a) => (
          <path key={a} transform={`rotate(${a} 50 50)`} d={POPPY_PETAL} />
        ))}
        <path d="M38 22 C 42 28, 44 34, 45 40 M78 38 C 72 42, 66 44, 60 45" strokeWidth={1.4} opacity={0.5} />
      </g>
      <circle cx="50" cy="50" r="10" fill={INK} />
      {range(12).map((i) => {
        const [x, y] = polar(i * 30, 14.5);
        return <circle key={i} cx={x} cy={y} r={1.7} fill={INK} />;
      })}
      <path d="M45 50 h10 M50 45 v10 M46.5 46.5 l7 7 M53.5 46.5 l-7 7" stroke={f.color} strokeWidth={1.5} strokeLinecap="round" />
    </>
  );
}

function Daisy() {
  const f = FLOWERS.Connector;
  return (
    <>
      {range(14).map((i) => {
        const deg = i * (360 / 14);
        return (
          <g key={i} transform={`rotate(${deg} 50 50)`}>
            <ellipse cx="50" cy={24 + (i % 2)} rx="6.5" ry="16" fill="#fffdfb" stroke={INK} strokeWidth={2} />
            <ellipse cx="50" cy={13 + (i % 2)} rx="4" ry="5" fill={f.color} />
          </g>
        );
      })}
      <circle cx="51.5" cy="51.5" r="12" fill="#ffd23f" />
      <circle cx="50" cy="50" r="12" fill="none" stroke={INK} strokeWidth={2.4} />
      <g fill={INK}>
        <circle cx="46" cy="47" r="1.4" />
        <circle cx="53" cy="45" r="1.4" />
        <circle cx="55" cy="52" r="1.4" />
        <circle cx="48" cy="54" r="1.4" />
      </g>
    </>
  );
}

function Sunflower() {
  const f = FLOWERS.Achiever;
  return (
    <>
      {range(16).map((i) => (
        <path
          key={`b${i}`}
          transform={`rotate(${i * 22.5 + 11} 50 50)`}
          d="M50 32 C 44 22, 46 10, 50 3 C 54 10, 56 22, 50 32 Z"
          fill="#f0b81c"
          stroke={INK}
          strokeWidth={1.8}
          strokeLinejoin="round"
        />
      ))}
      {range(16).map((i) => (
        <path
          key={`f${i}`}
          transform={`rotate(${i * 22.5} 50 50)`}
          d="M50 34 C 43 25, 45 14, 50 8 C 55 14, 57 25, 50 34 Z"
          fill={f.color}
          stroke={INK}
          strokeWidth={2}
          strokeLinejoin="round"
        />
      ))}
      <circle cx="51.5" cy="51.5" r="17" fill="#5b3a2c" />
      <circle cx="50" cy="50" r="17" fill="none" stroke={INK} strokeWidth={2.4} />
      <g fill="#c99a6b">
        {range(10).map((i) => {
          const [x, y] = polar(i * 36, 10);
          return <circle key={i} cx={x} cy={y} r={1.5} />;
        })}
        {range(5).map((i) => {
          const [x, y] = polar(i * 72 + 18, 4.5);
          return <circle key={`c${i}`} cx={x} cy={y} r={1.3} />;
        })}
      </g>
    </>
  );
}

function Lavender() {
  const f = FLOWERS.Chiller;
  return (
    <>
      {[-14, 0, 14].map((dx, k) => (
        <g key={dx} transform={`rotate(${dx * 0.9} 50 100)`}>
          <path d={`M${50 + dx} 100 L${50 + dx} 30`} stroke="#3f8a5f" strokeWidth={2.2} />
          {range(7).map((i) => {
            const y = 90 - i * 11 - (k === 1 ? 6 : 0);
            const s = 1 - i * 0.07;
            return (
              <g key={i}>
                <ellipse cx={50 + dx - 4.5 * s} cy={y} rx={5 * s} ry={6.5 * s} fill={i % 2 ? f.color : f.deep} stroke={INK} strokeWidth={1.7} />
                <ellipse cx={50 + dx + 4.5 * s} cy={y - 3} rx={5 * s} ry={6.5 * s} fill={i % 2 ? f.deep : f.color} stroke={INK} strokeWidth={1.7} />
              </g>
            );
          })}
        </g>
      ))}
    </>
  );
}

function Iris() {
  const f = FLOWERS.Thinker;
  return (
    <>
      <path d="M50 52 C 22 50, 8 66, 14 84 C 26 80, 40 70, 50 56 Z" fill={f.deep} stroke={INK} strokeWidth={2.4} strokeLinejoin="round" />
      <path d="M50 52 C 78 50, 92 66, 86 84 C 74 80, 60 70, 50 56 Z" fill={f.deep} stroke={INK} strokeWidth={2.4} strokeLinejoin="round" />
      <path
        d="M50 54 C 36 40, 30 22, 40 10 C 46 4, 50 8, 50 14 C 50 8, 54 4, 60 10 C 70 22, 64 40, 50 54 Z"
        fill={f.color}
        stroke={INK}
        strokeWidth={2.4}
        strokeLinejoin="round"
      />
      <path d="M50 18 C 50 30, 50 42, 50 52" stroke={INK} strokeWidth={1.6} fill="none" strokeLinecap="round" />
      <path d="M22 72 C 28 68, 34 66, 40 62 M78 72 C 72 68, 66 66, 60 62" stroke="#ffd23f" strokeWidth={3.2} strokeLinecap="round" fill="none" />
    </>
  );
}

const HEADS: Record<DiscoveryStyleId, () => React.ReactElement> = {
  Explorer: Dandelion,
  Creator: Poppy,
  Connector: Daisy,
  Achiever: Sunflower,
  Chiller: Lavender,
  Thinker: Iris,
};

interface FlowerProps {
  style: DiscoveryStyleId;
  size?: number;
  /** Extra stem length below the head, in head units (0 = head only). */
  stem?: number;
  /** Animate the head opening. */
  bloom?: boolean;
  delay?: number;
  sway?: boolean;
  className?: string;
  title?: string;
}

export function Flower({ style, size = 80, stem = 0, bloom = false, delay = 0, sway = false, className, title }: FlowerProps) {
  const Head = HEADS[style];
  const h = 100 + stem;
  const isSpike = style === 'Chiller';
  return (
    <svg
      viewBox={`0 0 100 ${h}`}
      width={size}
      height={(size * h) / 100}
      className={className}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      style={{ overflow: 'visible' }}
    >
      {stem > 0 && (
        <g>
          <path
            d={`M50 ${isSpike ? 98 : 62} C 53 ${72 + stem * 0.3}, 47 ${82 + stem * 0.6}, 50 ${h}`}
            stroke="#2f7a4f"
            strokeWidth={3.4}
            fill="none"
            strokeLinecap="round"
          />
          <path
            d={`M50 ${80 + stem * 0.55} C 64 ${70 + stem * 0.55}, 76 ${74 + stem * 0.55}, 81 ${65 + stem * 0.55} C 71 ${84 + stem * 0.55}, 60 ${87 + stem * 0.55}, 50 ${85 + stem * 0.55} Z`}
            fill="#7cc48f"
            stroke={INK}
            strokeWidth={1.8}
            strokeLinejoin="round"
          />
        </g>
      )}
      <motion.g
        style={{ transformOrigin: isSpike ? '50px 100px' : '50px 50px', transformBox: 'view-box' }}
        initial={bloom ? { scale: 0.2, rotate: -40, opacity: 0 } : false}
        animate={
          sway
            ? { scale: 1, rotate: [0, 3, 0, -2.5, 0], opacity: 1 }
            : { scale: 1, rotate: 0, opacity: 1 }
        }
        transition={
          sway
            ? { rotate: { duration: 7, repeat: Infinity, ease: 'easeInOut', delay }, default: { type: 'spring', stiffness: 160, damping: 14, delay } }
            : { type: 'spring', stiffness: 160, damping: 14, delay }
        }
      >
        <Head />
      </motion.g>
    </svg>
  );
}

/** A seedling for someone who hasn't bloomed yet. */
export function Sprout({ size = 64, className }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className={className} aria-hidden style={{ overflow: 'visible' }}>
      <path d="M50 98 C 50 82, 49 72, 50 58" stroke="#2f7a4f" strokeWidth={3.4} fill="none" strokeLinecap="round" />
      <path d="M50 64 C 38 50, 24 54, 20 44 C 34 40, 46 48, 50 64 Z" fill="#a6dcb1" stroke={INK} strokeWidth={1.8} strokeLinejoin="round" />
      <path d="M50 60 C 60 44, 74 46, 80 36 C 66 34, 54 42, 50 60 Z" fill="#7cc48f" stroke={INK} strokeWidth={1.8} strokeLinejoin="round" />
    </svg>
  );
}

/** Round badge with a member's flower (or sprout), used as an avatar. */
export function FlowerBadge({
  style,
  size = 44,
  ring = true,
  label,
}: {
  style?: DiscoveryStyleId;
  size?: number;
  ring?: boolean;
  label?: string;
}) {
  const bg = style ? `color-mix(in srgb, ${FLOWERS[style].color} 32%, var(--card))` : 'var(--leaf-soft)';
  return (
    <span
      className="inline-grid place-items-center rounded-full shrink-0"
      style={{ width: size, height: size, background: bg, boxShadow: ring ? '0 0 0 2px var(--card), 0 2px 6px -2px rgba(0,0,0,.35)' : undefined }}
      role={label ? 'img' : undefined}
      aria-label={label}
    >
      {style ? <Flower style={style} size={size * 0.78} /> : <Sprout size={size * 0.72} />}
    </span>
  );
}
