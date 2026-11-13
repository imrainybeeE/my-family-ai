import React, { createContext, useContext, useEffect, useLayoutEffect, useState } from 'react';
import { flushSync } from 'react-dom';

/** Light or dark paper, or follow the phone. */
export type ThemeMode = 'light' | 'dark' | 'system';
/** Which cardstock the scrapbook is made of: sky-blue Ocean, or the original green Forest. */
export type Palette = 'ocean' | 'forest';

export const PALETTES: { value: Palette; label: string }[] = [
  { value: 'ocean', label: 'Ocean' },
  { value: 'forest', label: 'Forest' },
];

interface ThemeContextType {
  mode: ThemeMode;
  isDark: boolean;
  setMode: (mode: ThemeMode, from?: { x: number; y: number }) => void;
  palette: Palette;
  setPalette: (palette: Palette, from?: { x: number; y: number }) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);
const MODE_KEY = 'myfamilyai_theme';
const PALETTE_KEY = 'myfamilyai_palette';
const query = () => window.matchMedia('(prefers-color-scheme: dark)');

function readMode(): ThemeMode {
  try {
    const param = new URLSearchParams(window.location.search).get('theme');
    if (param === 'light' || param === 'dark') return param;
    const stored = localStorage.getItem(MODE_KEY);
    if (stored === 'light' || stored === 'dark' || stored === 'system') return stored;
  } catch {
    // ignore
  }
  return 'system';
}

const isPalette = (v: unknown): v is Palette => v === 'ocean' || v === 'forest';

function readPalette(): Palette {
  try {
    const param = new URLSearchParams(window.location.search).get('palette');
    if (isPalette(param)) return param;
    const stored = localStorage.getItem(PALETTE_KEY);
    if (isPalette(stored)) return stored;
  } catch {
    // ignore
  }
  return 'ocean';
}

function store(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // ignore
  }
}

/**
 * Repaints the page by growing the new paper out of the tapped point, like a sheet being laid
 * over the old one. Falls back to an instant swap without View Transitions or with reduced motion.
 */
function repaint(change: () => void, from?: { x: number; y: number }) {
  const doc = document as Document & { startViewTransition?: (cb: () => void) => { ready: Promise<void> } };
  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!doc.startViewTransition || still || !from) return change();
  const transition = doc.startViewTransition(() => flushSync(change));
  const r = Math.hypot(Math.max(from.x, innerWidth - from.x), Math.max(from.y, innerHeight - from.y));
  transition.ready
    .then(() => {
      document.documentElement.animate(
        { clipPath: [`circle(0px at ${from.x}px ${from.y}px)`, `circle(${r}px at ${from.x}px ${from.y}px)`] },
        { duration: 620, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', pseudoElement: '::view-transition-new(root)' },
      );
    })
    .catch(() => {});
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setModeState] = useState<ThemeMode>(readMode);
  const [palette, setPaletteState] = useState<Palette>(readPalette);
  const [systemDark, setSystemDark] = useState(() => query().matches);

  useEffect(() => {
    const mq = query();
    const onChange = () => setSystemDark(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const isDark = mode === 'dark' || (mode === 'system' && systemDark);

  // Layout effect, so the view transition's "after" snapshot already has the new paper.
  useLayoutEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', isDark);
    root.dataset.theme = isDark ? 'dark' : 'light';
    root.dataset.palette = palette;
    const page = getComputedStyle(root).getPropertyValue('--page').trim();
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', page);
  }, [isDark, palette]);

  const setMode = (next: ThemeMode, from?: { x: number; y: number }) => {
    store(MODE_KEY, next);
    repaint(() => setModeState(next), from);
  };

  const setPalette = (next: Palette, from?: { x: number; y: number }) => {
    store(PALETTE_KEY, next);
    repaint(() => setPaletteState(next), from);
  };

  return <ThemeContext.Provider value={{ mode, isDark, setMode, palette, setPalette }}>{children}</ThemeContext.Provider>;
};

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within a ThemeProvider');
  return context;
}
