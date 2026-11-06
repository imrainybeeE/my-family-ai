import React from 'react';

/* Hand-drawn icons for the places in the app. Line icons from lucide cover small utilities. */

type P = { size?: number; className?: string };
const base = (size: number, className?: string) => ({
  width: size,
  height: size,
  viewBox: '0 0 28 28',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2.1,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  className,
  'aria-hidden': true,
});

export function GardenIcon({ size = 28, className, active }: P & { active?: boolean }) {
  return (
    <svg {...base(size, className)}>
      {active && <circle cx="14" cy="9.5" r="6.5" fill="#ffd23f" stroke="none" />}
      <circle cx="14" cy="9.5" r="2.6" />
      <path d="M14 3.6v.1M8.6 6.4l.1.1M19.4 6.4l-.1.1M8 11.6h.1M20 11.6h-.1M14 12.5V25M14 20c-3.2-3.4-6.6-2.6-8-1.4M14 17.6c3.2-3.4 6.6-2.6 8-1.4" />
    </svg>
  );
}

export function TogetherIcon({ size = 28, className, active }: P & { active?: boolean }) {
  return (
    <svg {...base(size, className)}>
      {active && <path d="M10 23c-4.5-3.3-7-6.6-7-10a4 4 0 0 1 7-2.8A4 4 0 0 1 17 13c0 3.4-2.5 6.7-7 10z" fill="#ffc9dc" stroke="none" />}
      <path d="M10 23c-4.5-3.3-7-6.6-7-10a4 4 0 0 1 7-2.8A4 4 0 0 1 17 13c0 3.4-2.5 6.7-7 10z" />
      <path d="M17.5 7.2A4 4 0 0 1 25 9.8c0 3.4-2.5 6.7-7 10" />
    </svg>
  );
}

export function PlanIcon({ size = 28, className, active }: P & { active?: boolean }) {
  return (
    <svg {...base(size, className)}>
      {active && <path d="M4.5 12h19l-2.2 11H6.7z" fill="#c4e5f6" stroke="none" />}
      <path d="M4.5 12h19l-2.2 11H6.7z" />
      <path d="M9 12l3.2-6.5M19 12l-3.2-6.5M10.5 16v3.5M14 16v3.5M17.5 16v3.5" />
    </svg>
  );
}

export function AskIcon({ size = 28, className, active }: P & { active?: boolean }) {
  return (
    <svg {...base(size, className)}>
      {active && <path d="M5 7.5A3.5 3.5 0 0 1 8.5 4h11A3.5 3.5 0 0 1 23 7.5v8a3.5 3.5 0 0 1-3.5 3.5H13l-5.5 4.5V19A3.5 3.5 0 0 1 5 15.5z" fill="#dcd1ff" stroke="none" />}
      <path d="M5 7.5A3.5 3.5 0 0 1 8.5 4h11A3.5 3.5 0 0 1 23 7.5v8a3.5 3.5 0 0 1-3.5 3.5H13l-5.5 4.5V19A3.5 3.5 0 0 1 5 15.5z" />
      <path d="M14 8.2l1.1 2.6 2.6 1.1-2.6 1.1L14 15.6l-1.1-2.6-2.6-1.1 2.6-1.1z" fill="currentColor" strokeWidth={1.2} />
    </svg>
  );
}

/* Planner pictograms, drawn as small coloured illustrations. */
export function EatArt({ size = 56 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
      <ellipse cx="33" cy="40" rx="24" ry="10" fill="#ff6a4d" />
      <path d="M8 36c0 9 11 16 24 16s24-7 24-16z" fill="#fffdfb" stroke="var(--art-ink)" strokeWidth="2.4" strokeLinejoin="round" />
      <path d="M17 33c3-6 8-3 11-7 3 4 8 1 11 7M26 22c-1-4 2-6 0-10M33 22c-1-4 2-6 0-10" stroke="var(--art-ink)" strokeWidth="2.2" fill="none" strokeLinecap="round" />
      <path d="M44 30l12-18M48 31l12-16" stroke="var(--art-ink)" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

export function DoArt({ size = 56 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
      <path d="M32 6c9 0 15 7 15 16 0 10-8 17-15 17s-15-7-15-17C17 13 23 6 32 6z" fill="#7cc48f" transform="translate(2 2)" />
      <path d="M32 6c9 0 15 7 15 16 0 10-8 17-15 17s-15-7-15-17C17 13 23 6 32 6z" fill="none" stroke="var(--art-ink)" strokeWidth="2.4" />
      <path d="M32 39l-2 4h4zM32 43c-2 6 4 8 0 15" stroke="var(--art-ink)" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M25 16c2-3 5-4 8-4" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" />
    </svg>
  );
}

export function WatchArt({ size = 56 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
      <path d="M16 24h32l-4 32H20z" fill="#ff6a4d" transform="translate(2 2)" />
      <path d="M16 24h32l-4 32H20z" fill="none" stroke="var(--art-ink)" strokeWidth="2.4" strokeLinejoin="round" />
      <path d="M26 24l1 32M38 24l-1 32" stroke="#fffdfb" strokeWidth="4" />
      <g fill="#fffdfb" stroke="var(--art-ink)" strokeWidth="2">
        <circle cx="22" cy="20" r="6" />
        <circle cx="32" cy="15" r="7" />
        <circle cx="42" cy="20" r="6" />
        <circle cx="28" cy="22" r="5" />
        <circle cx="37" cy="23" r="5" />
      </g>
    </svg>
  );
}

export function TravelArt({ size = 56 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
      <rect x="12" y="20" width="40" height="32" rx="6" fill="#9fd3ef" transform="translate(2 2)" />
      <rect x="12" y="20" width="40" height="32" rx="6" fill="none" stroke="var(--art-ink)" strokeWidth="2.4" />
      <path d="M24 20v-6a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v6M22 20v32M42 20v32" stroke="var(--art-ink)" strokeWidth="2.4" fill="none" />
      <circle cx="32" cy="36" r="5" fill="#ffd23f" stroke="var(--art-ink)" strokeWidth="2" />
    </svg>
  );
}
