import React, { useEffect, useRef, useState } from 'react';
import { TabType } from '../../types';
import { AskIcon, GardenIcon, PlanIcon, TogetherIcon } from '../art/Icons';
import { useHousehold } from '../../context/HouseholdContext';
import { FlowerBadge } from '../art/Flower';
import { onRovingKeyDown } from '../ui/roving';
import { feel } from '../../feel/feel';

const TABS: { id: TabType; label: string; Icon: typeof GardenIcon }[] = [
  { id: 'garden', label: 'Garden', Icon: GardenIcon },
  { id: 'together', label: 'Together', Icon: TogetherIcon },
  { id: 'plan', label: 'Plan', Icon: PlanIcon },
  { id: 'ask', label: 'Ask', Icon: AskIcon },
];

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Scrolling down past the top closes the bar into one circle; scrolling up, or reaching the top,
 * opens it again. Off on Ask, where the composer rides on top of the bar.
 */
function useMinimised(enabled: boolean) {
  const [min, setMin] = useState(false);
  useEffect(() => {
    if (!enabled) {
      setMin(false);
      return;
    }
    let last = window.scrollY;
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const y = window.scrollY;
        if (y < 80) setMin(false);
        else if (y - last > 8) setMin(true);
        else if (last - y > 8) setMin(false);
        last = y;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(raf);
    };
  }, [enabled]);
  return [min, setMin] as const;
}

/**
 * A floating glass capsule with a lens under the chosen tab. Press and the lens swells under the
 * finger; slide across the bar and it follows, with a tick for each tab crossed; let go on a tab to
 * go there. The lens lands with a small overshoot and stretches the way it travels.
 */
export function TabBar({ tab, onChange }: { tab: TabType; onChange: (t: TabType) => void }) {
  const nav = useRef<HTMLElement>(null);
  const fill = useRef<HTMLSpanElement>(null);
  const press = useRef<{ at: number; x: number; captured?: boolean } | null>(null);
  const [pressAt, setPressAt] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);
  // The icon bounce and lens stretch answer a change of tab, never the first paint.
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(id);
  }, []);
  const [minimised, setMinimised] = useMinimised(tab !== 'ask');
  useEffect(() => setMinimised(false), [tab, setMinimised]);
  const active = Math.max(0, TABS.findIndex((t) => t.id === tab));
  const lensAt = pressAt ?? active;

  // The lens stretches the way it travels, more for a longer trip, and settles as it lands.
  const lastAt = useRef(lensAt);
  useEffect(() => {
    const from = lastAt.current;
    lastAt.current = lensAt;
    const el = fill.current;
    if (!ready || dragging || !el || from === lensAt || reducedMotion()) return;
    const d = Math.min(3, Math.abs(lensAt - from));
    el.style.transformOrigin = lensAt > from ? '0% 50%' : '100% 50%';
    el.animate([{ transform: 'scale(1, 1)' }, { transform: `scale(${1 + 0.12 * d}, ${1 - 0.06 * d})`, offset: 0.4 }, { transform: 'scale(1, 1)' }], {
      duration: 420,
      easing: 'cubic-bezier(0.3, 0, 0.2, 1)',
      composite: 'add',
    });
  }, [lensAt, ready, dragging]);

  const geometry = () => {
    const r = nav.current!.getBoundingClientRect();
    return { r, cell: (r.width - 8) / TABS.length };
  };
  const indexAt = (x: number) => {
    const { r, cell } = geometry();
    return Math.max(0, Math.min(TABS.length - 1, Math.floor((x - r.left - 4) / cell)));
  };
  const go = (i: number) => {
    if (TABS[i].id !== tab) feel('tap');
    onChange(TABS[i].id);
  };
  const onPointerDown = (e: React.PointerEvent) => {
    if ((e.pointerType === 'mouse' && e.button !== 0) || minimised) return;
    const i = indexAt(e.clientX);
    press.current = { at: i, x: e.clientX };
    nav.current!.style.setProperty('--px', `${e.clientX - nav.current!.getBoundingClientRect().left}px`);
    setPressAt(i);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const p = press.current;
    if (!p) return;
    const { r, cell } = geometry();
    nav.current!.style.setProperty('--px', `${e.clientX - r.left}px`);
    if (!p.captured && Math.abs(e.clientX - p.x) < 10) return; // a tap, not a slide
    if (!p.captured) {
      nav.current!.setPointerCapture?.(e.pointerId);
      p.captured = true;
      setDragging(true);
    }
    // While sliding, the lens sits exactly under the finger; it snaps to a tab only on release.
    nav.current!.style.setProperty('--lens-x', `${Math.max(0, Math.min((TABS.length - 1) * cell, e.clientX - r.left - 4 - cell / 2))}px`);
    const i = indexAt(e.clientX);
    if (i !== p.at) {
      p.at = i;
      setPressAt(i);
      feel('select');
    }
  };
  const onPointerEnd = (e: React.PointerEvent) => {
    const p = press.current;
    press.current = null;
    setPressAt(null);
    setDragging(false);
    // Slid onto a tab: go there. A plain tap is handled by the button's own click.
    if (p?.captured && e.type === 'pointerup') go(p.at);
  };

  return (
    <>
      <div aria-hidden className="tabbar-floor scrim" />
      <span aria-hidden className="tabbar-shade" data-min={minimised || undefined} />
      <nav
        ref={nav}
        className="tabbar glass"
        role="tablist"
        aria-label="Sections"
        data-liquid=""
        data-liquid-bezel="14"
        data-liquid-strength="14"
        data-liquid-frost="3"
        data-min={minimised || undefined}
        data-pressing={pressAt != null || undefined}
        data-dragging={dragging || undefined}
        data-ready={ready || undefined}
        style={{ ['--i' as string]: lensAt }}
        onKeyDown={(e) => onRovingKeyDown(e, 'tab')}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        onFocus={() => minimised && setMinimised(false)}
      >
        <span className="tabbar-lens" aria-hidden>
          <span ref={fill} className="tabbar-lens-fill" />
        </span>
        {TABS.map(({ id, label, Icon }, i) => {
          const on = tab === id;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              className="tab"
              aria-selected={on}
              aria-controls="main"
              tabIndex={on ? 0 : -1}
              onClick={() => {
                // Minimised, the circle opens the bar and goes nowhere; the next tap picks a tab.
                if (minimised && on) {
                  feel('tap');
                  setMinimised(false);
                  return;
                }
                go(i);
              }}
            >
              <span className="tab-plate">
                <Icon active={on} />
              </span>
              <span className="tab-label">{label}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
}

/** Large title for each tab, with the profile button that opens settings. */
export function PageHeader({
  title,
  subtitle,
  onProfile,
  demoNote = false,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  onProfile: () => void;
  /** Shows the demo-family reminder; only the home tab asks for it. */
  demoNote?: boolean;
}) {
  const { activeMember, myAnswers, isDemo } = useHousehold();
  return (
    <header className={`flex items-start justify-between gap-3 ${demoNote ? 'pb-5' : 'pb-3'}`}>
      <div className="min-w-0">
        <h1 className="t-display">{title}</h1>
        {subtitle && <p className="t-small ink-2 mt-1.5">{subtitle}</p>}
        {isDemo && demoNote && (
          <p className="t-hand ink-3 mt-1">
            Demo family, nothing is saved
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={onProfile}
        className="shrink-0 rounded-full border-0 bg-transparent p-0 transition-transform active:scale-95"
        aria-label={`Settings and profile for ${activeMember?.nickname || activeMember?.role || 'you'}`}
      >
        <FlowerBadge style={myAnswers.discoveryProfile?.primaryStyle} size={44} />
      </button>
    </header>
  );
}
