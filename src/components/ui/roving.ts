import type React from 'react';

/**
 * Arrow-key navigation for radio groups and tab lists (WAI-ARIA pattern): only the selected
 * item is in the Tab order, arrows move focus and select. Attach to the group's onKeyDown.
 */
export function onRovingKeyDown(e: React.KeyboardEvent<HTMLElement>, role: 'radio' | 'tab' = 'radio') {
  const forward = ['ArrowDown', 'ArrowRight'];
  const back = ['ArrowUp', 'ArrowLeft'];
  if (![...forward, ...back, 'Home', 'End'].includes(e.key)) return;
  const items = Array.from(e.currentTarget.querySelectorAll<HTMLElement>(`[role="${role}"]`)).filter(
    (el) => !el.hasAttribute('disabled')
  );
  const at = items.indexOf(document.activeElement as HTMLElement);
  if (at === -1 || items.length < 2) return;
  e.preventDefault();
  const next =
    e.key === 'Home' ? 0 : e.key === 'End' ? items.length - 1 : (at + (forward.includes(e.key) ? 1 : -1) + items.length) % items.length;
  items[next].focus();
  items[next].click();
}

/** tabIndex for item `i` when `selected` is the selected index (-1 for none). */
export const rovingTabIndex = (i: number, selected: number) => (i === (selected >= 0 ? selected : 0) ? 0 : -1);
