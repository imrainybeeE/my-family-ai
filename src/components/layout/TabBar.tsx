import React from 'react';
import { motion } from 'motion/react';
import { TabType } from '../../types';
import { AskIcon, GardenIcon, PlanIcon, TogetherIcon } from '../art/Icons';
import { useHousehold } from '../../context/HouseholdContext';
import { FlowerBadge } from '../art/Flower';
import { onRovingKeyDown } from '../ui/roving';

const TABS: { id: TabType; label: string; Icon: typeof GardenIcon }[] = [
  { id: 'garden', label: 'Garden', Icon: GardenIcon },
  { id: 'together', label: 'Together', Icon: TogetherIcon },
  { id: 'plan', label: 'Plan', Icon: PlanIcon },
  { id: 'ask', label: 'Ask', Icon: AskIcon },
];

export function TabBar({ tab, onChange }: { tab: TabType; onChange: (t: TabType) => void }) {
  return (
    <nav className="tabbar" role="tablist" aria-label="Sections" onKeyDown={(e) => onRovingKeyDown(e, 'tab')}>
      {TABS.map(({ id, label, Icon }) => {
        const on = tab === id;
        return (
          <button key={id} type="button" role="tab" aria-selected={on} aria-controls="main" tabIndex={on ? 0 : -1} onClick={() => onChange(id)}>
            {on && <motion.span layoutId="tab-well" className="tab-well" transition={{ type: 'spring', stiffness: 500, damping: 38 }} />}
            <Icon active={on} />
            {label}
          </button>
        );
      })}
    </nav>
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
    <header className="flex items-start justify-between gap-3 pb-3">
      <div className="min-w-0">
        <h1 className="t-display">{title}</h1>
        {subtitle && <p className="t-small ink-2 mt-1.5">{subtitle}</p>}
        {isDemo && demoNote && (
          <p className="t-hand ink-3 mt-1" style={{ fontSize: '0.875rem' }}>
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
