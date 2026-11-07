import React from 'react';
import { motion } from 'motion/react';
import { DiscoveryStyleId } from '../../types';
import { FLOWERS } from '../../data/flowers';

/*
 * The art is felt and yarn, rendered in Blender as flat-lay pieces with their own soft
 * shadow (scripts/felt/felt.py). Every piece is a square image with the object centred,
 * so pieces of the same kind line up at the same size.
 */

export type FeltName =
  | 'dandelion'
  | 'poppy'
  | 'daisy'
  | 'sunflower'
  | 'lavender'
  | 'iris'
  | 'bud'
  | 'yarnball'
  | 'eat'
  | 'do'
  | 'watch'
  | 'travel'
  | 'coin-heads'
  | 'coin-tails'
  | 'centre'
  | 'petal-explorer'
  | 'petal-creator'
  | 'petal-connector'
  | 'petal-achiever'
  | 'petal-chiller'
  | 'petal-thinker';

export const FELT_FOR_STYLE: Record<DiscoveryStyleId, FeltName> = {
  Explorer: 'dandelion',
  Creator: 'poppy',
  Connector: 'daisy',
  Achiever: 'sunflower',
  Chiller: 'lavender',
  Thinker: 'iris',
};

export function Felt({ name, size, className, style }: { name: FeltName; size: number; className?: string; style?: React.CSSProperties }) {
  return <img src={`${import.meta.env.BASE_URL}felt/${name}.webp`} width={size} height={size} alt="" aria-hidden className={`felt ${className || ''}`} style={style} draggable={false} decoding="async" />;
}

interface FlowerProps {
  style: DiscoveryStyleId;
  size?: number;
  /** Opens with a spring, as if pressed onto the page. */
  bloom?: boolean;
  delay?: number;
  className?: string;
  title?: string;
}

/** A person's flower: their top style as a felt flower. */
export function Flower({ style, size = 80, bloom = false, delay = 0, className, title }: FlowerProps) {
  return (
    <motion.span
      className={`inline-block ${className || ''}`}
      style={{ width: size, height: size }}
      role={title ? 'img' : undefined}
      aria-label={title}
      initial={bloom ? { scale: 0.4, rotate: -30, opacity: 0 } : false}
      animate={{ scale: 1, rotate: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 170, damping: 15, delay }}
    >
      <Felt name={FELT_FOR_STYLE[style]} size={size} />
    </motion.span>
  );
}

/** A closed felt bud, for someone who hasn't found their flower yet. */
export function Sprout({ size = 64, className }: { size?: number; className?: string }) {
  return <Felt name="bud" size={size} className={className} />;
}

/** A small round paper disc with the person's flower on it, used as an avatar. */
export function FlowerBadge({ style, size = 44, ring = true, label }: { style?: DiscoveryStyleId; size?: number; ring?: boolean; label?: string }) {
  const bg = style ? `color-mix(in srgb, ${FLOWERS[style].color} 22%, var(--card))` : 'var(--card-2)';
  return (
    <span
      className="inline-grid place-items-center rounded-full shrink-0 overflow-hidden"
      style={{ width: size, height: size, background: bg, boxShadow: ring ? '0 0 0 2px var(--card), 0 2px 6px -2px rgba(20,30,50,.35)' : undefined }}
      role={label ? 'img' : undefined}
      aria-label={label}
    >
      <Felt name={style ? FELT_FOR_STYLE[style] : 'bud'} size={Math.round(size * 1.08)} />
    </span>
  );
}
