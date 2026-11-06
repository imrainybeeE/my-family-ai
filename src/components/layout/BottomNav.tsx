import React from 'react';
import { Home, Compass, Users, MessageSquare, Settings } from 'lucide-react';
import { TabType } from '../../types';

interface BottomNavProps {
  activeTab: TabType;
  onChangeTab: (tab: TabType) => void;
}

interface NavItem {
  id: TabType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'discover', label: 'Results', icon: Compass },
  { id: 'family', label: 'Family', icon: Users },
  { id: 'ask-ai', label: 'Ask AI', icon: MessageSquare },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onChangeTab }) => {
  return (
    <div className="bg-white dark:bg-slate-900 border-t border-slate-200/80 dark:border-slate-800 px-2 py-1.5 flex items-center justify-around transition-colors">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive = activeTab === item.id;

        return (
          <button
            key={item.id}
            onClick={() => onChangeTab(item.id)}
            type="button"
            className={`flex-1 py-1 px-1 flex flex-col items-center justify-center transition relative rounded-xl ${
              isActive
                ? 'text-indigo-600 dark:text-indigo-400'
                : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 active:scale-95'
            }`}
            aria-label={`${item.label} tab`}
            aria-selected={isActive}
            role="tab"
          >
            <div className="relative">
              <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-105 stroke-[2.2]' : 'stroke-[1.7]'}`} />
            </div>
            <span
              className={`text-[11px] mt-1 transition-colors ${
                isActive ? 'font-semibold text-indigo-600 dark:text-indigo-400' : 'font-medium text-slate-500 dark:text-slate-400'
              }`}
            >
              {item.label}
            </span>
          </button>
        );
      })}
    </div>
  );
};
