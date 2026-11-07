import React from 'react';
import { Felt } from './Flower';

/* Tab icons are crisp line drawings; the felt pieces carry the craft. */

type P = { size?: number; className?: string; active?: boolean };
const base = (size: number, className?: string) => ({
  width: size,
  height: size,
  viewBox: '0 0 28 28',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.9,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  className,
  'aria-hidden': true,
});
const fill = (active?: boolean) => (active ? { fill: 'currentColor', fillOpacity: 0.16 } : {});

export function GardenIcon({ size = 26, className, active }: P) {
  return (
    <svg {...base(size, className)}>
      {[0, 72, 144, 216, 288].map((r) => (
        <ellipse key={r} cx="14" cy="8.2" rx="3.4" ry="4.8" transform={`rotate(${r} 14 13)`} {...fill(active)} />
      ))}
      <circle cx="14" cy="13" r="2.3" fill="currentColor" />
    </svg>
  );
}

/** Two loops of yarn, linked. */
export function TogetherIcon({ size = 26, className, active }: P) {
  return (
    <svg {...base(size, className)}>
      <circle cx="10.5" cy="14" r="6.5" {...fill(active)} />
      <circle cx="17.5" cy="14" r="6.5" {...fill(active)} />
    </svg>
  );
}

/** A ticket. */
export function PlanIcon({ size = 26, className, active }: P) {
  return (
    <svg {...base(size, className)}>
      <path d="M4 8.5A1.5 1.5 0 0 1 5.5 7h17A1.5 1.5 0 0 1 24 8.5v3a2.5 2.5 0 0 0 0 5v3a1.5 1.5 0 0 1-1.5 1.5h-17A1.5 1.5 0 0 1 4 19.5v-3a2.5 2.5 0 0 0 0-5z" {...fill(active)} />
      <path d="M17 7.5v2M17 13v2M17 18.5v2" />
    </svg>
  );
}

/** A speech bubble with a running stitch. */
export function AskIcon({ size = 26, className, active }: P) {
  return (
    <svg {...base(size, className)}>
      <path d="M5 8a3.5 3.5 0 0 1 3.5-3.5h11A3.5 3.5 0 0 1 23 8v7.5a3.5 3.5 0 0 1-3.5 3.5H13l-5 4v-4h0A3.5 3.5 0 0 1 5 15.5z" {...fill(active)} />
      <path d="M9.5 11.8h1.6M13.2 11.8h1.6M16.9 11.8h1.6" />
    </svg>
  );
}

/* The four plan pieces differ in silhouette, so each gets a small optical correction to look the same size. */
export const EatArt = ({ size = 72 }: { size?: number }) => <Felt name="eat" size={size} />;
export const DoArt = ({ size = 72 }: { size?: number }) => <Felt name="do" size={size} style={{ transform: 'scale(0.95) translateY(4px)' }} />;
export const WatchArt = ({ size = 72 }: { size?: number }) => <Felt name="watch" size={size} style={{ transform: 'scale(1.1)' }} />;
export const TravelArt = ({ size = 72 }: { size?: number }) => <Felt name="travel" size={size} style={{ transform: 'scale(0.92)' }} />;
