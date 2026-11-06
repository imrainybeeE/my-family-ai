import React, { useState } from 'react';
import { Copy, Check, Users, Sun, Moon } from 'lucide-react';
import { useHousehold } from '../../context/HouseholdContext';
import { useTheme } from '../../context/ThemeContext';
import { ROLE_ICONS } from '../../utils/familyCode';

interface HeaderProps {
  onOpenFamily?: () => void;
  onOpenSettings?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenFamily, onOpenSettings }) => {
  const { household, activeMember } = useHousehold();
  const { isDark, toggleTheme } = useTheme();
  const [copied, setCopied] = useState(false);

  const handleCopyCode = async () => {
    if (!household?.code) return;
    try {
      await navigator.clipboard.writeText(household.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800 px-4 py-2.5 flex items-center justify-between transition-colors">
      {/* Brand title */}
      <div>
        <h1 className="text-sm font-bold text-slate-900 dark:text-slate-100 tracking-tight leading-tight">
          My Family AI
        </h1>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-none">School Project</p>
      </div>

      {/* Household code, theme toggle & active profile */}
      <div className="flex items-center gap-2">
        {/* Quick Theme Toggle */}
        <button
          type="button"
          onClick={toggleTheme}
          className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {isDark ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-slate-600" />
          )}
        </button>

        {household && (
          <>
            {/* Family Code Pill */}
            <button
              onClick={handleCopyCode}
              type="button"
              className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200/70 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 active:scale-95 transition rounded-lg text-xs font-mono-code font-bold tracking-tight"
              title="Copy Family Code"
              aria-label={`Family Code ${household.code}. Tap to copy.`}
            >
              <span>{household.code}</span>
              {copied ? (
                <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[2.5]" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-slate-400" />
              )}
            </button>

            {/* Active Profile Pill */}
            {activeMember ? (
              <button
                onClick={onOpenSettings || onOpenFamily}
                type="button"
                className="flex items-center gap-1.5 pl-1 pr-2.5 py-1 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 active:scale-95 transition"
                title={`Switch active profile (${activeMember.nickname || activeMember.role})`}
                aria-label={`Active as ${activeMember.nickname || activeMember.role}`}
              >
                <span
                  className="w-5 h-5 rounded-full flex items-center justify-center text-[11px] text-white shrink-0"
                  style={{ backgroundColor: activeMember.avatarColor }}
                >
                  {ROLE_ICONS[activeMember.role] || '👤'}
                </span>
                <span className="text-xs font-medium text-slate-800 dark:text-slate-200 max-w-[80px] truncate">
                  {activeMember.nickname || activeMember.role}
                </span>
              </button>
            ) : (
              <button
                onClick={onOpenFamily}
                type="button"
                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                aria-label="View family roster"
              >
                <Users className="w-4 h-4" />
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
};
