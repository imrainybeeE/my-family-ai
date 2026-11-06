import React, { useState } from 'react';
import {
  Settings,
  UserCheck,
  LogOut,
  ShieldCheck,
  Copy,
  Check,
  AlertTriangle,
  Sun,
  Moon,
} from 'lucide-react';
import { useHousehold } from '../../context/HouseholdContext';
import { useTheme } from '../../context/ThemeContext';
import { ROLE_ICONS } from '../../utils/familyCode';

export const SettingsView: React.FC = () => {
  const { household, members, activeMember, selectActiveMember, leaveHousehold } = useHousehold();
  const { theme, setTheme } = useTheme();
  const [copied, setCopied] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

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
    <div className="p-4 sm:p-5 space-y-4">
      {/* Title */}
      <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
        <Settings className="w-5 h-5 text-slate-500 dark:text-slate-400" />
        Settings
      </h2>

      {/* Theme Appearance Mode Toggle */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200/90 dark:border-slate-700 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
            Appearance & Theme
          </span>
          <span className="text-[11px] text-slate-400">Light or Dark</span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setTheme('light')}
            className={`p-3 rounded-xl border flex items-center gap-2.5 transition cursor-pointer text-left ${
              theme === 'light'
                ? 'border-indigo-600 bg-indigo-50/70 text-indigo-950 font-semibold shadow-2xs'
                : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/90 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Sun className={`w-4 h-4 shrink-0 ${theme === 'light' ? 'text-amber-500' : 'text-slate-400'}`} />
            <div>
              <span className="text-xs font-semibold block">Light Mode</span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-normal">Clean bright paper</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setTheme('dark')}
            className={`p-3 rounded-xl border flex items-center gap-2.5 transition cursor-pointer text-left ${
              theme === 'dark'
                ? 'border-indigo-500 bg-indigo-950/70 text-indigo-200 font-semibold shadow-2xs'
                : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/90 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Moon className={`w-4 h-4 shrink-0 ${theme === 'dark' ? 'text-indigo-400' : 'text-slate-400'}`} />
            <div>
              <span className="text-xs font-semibold block">Dark Mode</span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-normal">Cozy evening slate</span>
            </div>
          </button>
        </div>
      </div>

      {/* Active Profile Section */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200/90 dark:border-slate-700 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
            Active profile on this device
          </span>
          <span className="text-[11px] text-slate-400">Tap to switch</span>
        </div>

        <div className="grid grid-cols-1 gap-1.5">
          {members.map((m) => {
            const isCurrent = m.id === activeMember?.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => selectActiveMember(m.id)}
                className={`p-2.5 rounded-xl border flex items-center justify-between text-left transition cursor-pointer ${
                  isCurrent
                    ? 'border-indigo-500 bg-indigo-50/60 dark:bg-indigo-950/60 dark:border-indigo-500/80'
                    : 'border-slate-200/80 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-900/80 hover:bg-slate-100/80 dark:hover:bg-slate-800/80'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className="w-7 h-7 rounded-full flex items-center justify-center text-xs text-white shrink-0"
                    style={{ backgroundColor: m.avatarColor }}
                  >
                    {ROLE_ICONS[m.role] || '👤'}
                  </span>
                  <div>
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
                      {m.nickname || m.role}
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">{m.role}</span>
                  </div>
                </div>

                {isCurrent && (
                  <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                    <UserCheck className="w-3.5 h-3.5" /> Active
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Household Info */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200/90 dark:border-slate-700 shadow-xs space-y-3">
        <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 block">
          Household details
        </span>

        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-700">
            <span className="text-slate-500 dark:text-slate-400">Family Code:</span>
            <div className="flex items-center gap-2">
              <span className="font-mono-code font-bold text-slate-800 dark:text-slate-200">
                {household?.code}
              </span>
              <button
                onClick={handleCopyCode}
                type="button"
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                title="Copy code"
                aria-label="Copy code"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-700">
            <span className="text-slate-500 dark:text-slate-400">Connected members:</span>
            <span className="font-medium text-slate-800 dark:text-slate-200">{members.length}</span>
          </div>

          <div className="flex items-center justify-between py-1">
            <span className="text-slate-500 dark:text-slate-400">Save & sync status:</span>
            <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
              <Check className="w-3 h-3 stroke-[2.5]" />
              Saved to Cloud
            </span>
          </div>
        </div>
      </div>

      {/* Cloud Preservation Card */}
      <div className="bg-emerald-50/70 dark:bg-emerald-950/30 rounded-2xl p-4 border border-emerald-200/80 dark:border-emerald-900/50 space-y-2 text-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-semibold text-emerald-900 dark:text-emerald-300">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>Family Data Protection</span>
          </div>
          <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-100/80 dark:bg-emerald-900/60 px-2 py-0.5 rounded-full">
            Firestore Active
          </span>
        </div>
        <p className="text-[11px] text-emerald-800/80 dark:text-emerald-300/80 leading-relaxed">
          Your household, member profiles, and discovery answers are automatically saved to your cloud database and remembered on this device. Anyone with code <span className="font-mono-code font-bold">{household?.code}</span> can rejoin anytime.
        </p>
      </div>

      {/* School Safety Rules */}
      <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-4 border border-slate-200/70 dark:border-slate-700/60 space-y-2 text-xs">
        <div className="flex items-center gap-2 font-semibold text-slate-800 dark:text-slate-200">
          <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span>School privacy rules</span>
        </div>
        <ul className="space-y-1 text-slate-500 dark:text-slate-400 text-[11px] list-disc list-inside">
          <li>No passwords or emails required</li>
          <li>No street addresses or physical locations stored</li>
          <li>No health, medical, or financial information</li>
          <li>Non-diagnostic discovery styles and living room activities only</li>
        </ul>
      </div>

      {/* Disconnect Action */}
      <div className="pt-2">
        {!showLeaveConfirm ? (
          <button
            type="button"
            onClick={() => setShowLeaveConfirm(true)}
            className="w-full py-3 bg-white dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-slate-600 dark:text-slate-300 hover:text-rose-700 dark:hover:text-rose-400 text-xs font-semibold rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-rose-200 dark:hover:border-rose-900/50 flex items-center justify-center gap-2 transition cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Disconnect from this household</span>
          </button>
        ) : (
          <div className="p-4 bg-rose-50/80 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-2xl space-y-3">
            <div className="flex items-start gap-2 text-xs text-rose-900 dark:text-rose-200 leading-relaxed">
              <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <span>
                Disconnect this device? You can reconnect at any time using code{' '}
                <strong>{household?.code}</strong>.
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowLeaveConfirm(false)}
                className="flex-1 py-2 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={leaveHousehold}
                className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-xl"
              >
                Disconnect
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
