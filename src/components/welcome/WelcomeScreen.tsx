import React from 'react';
import { PlusCircle, Smartphone, Shield } from 'lucide-react';

interface WelcomeScreenProps {
  onCreateHousehold: () => void;
  onJoinHousehold: () => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
  onCreateHousehold,
  onJoinHousehold,
}) => {
  return (
    <div className="flex-1 flex flex-col justify-between p-6">
      {/* Top Header */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            School AI Project
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            Family Sync
          </span>
        </div>

        {/* Hero headline & introduction */}
        <div className="space-y-3 pt-2">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight leading-snug">
            Help everyone at home understand each other and find things to enjoy together.
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            One household code connects every phone in the house. No passwords, no accounts, and no personal data.
          </p>
        </div>

        {/* Visual Family Pass Card */}
        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">How it connects</span>
            <span className="text-[11px] font-mono-code text-indigo-600 dark:text-indigo-400 font-bold bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded">
              AX-PAN-4827
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="p-2 bg-slate-50 dark:bg-slate-800/80 rounded-xl text-center border border-slate-100 dark:border-slate-800">
              <span className="text-lg block">🎒</span>
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block mt-0.5">Me</span>
              <span className="text-[10px] text-slate-400 dark:text-slate-500">Student</span>
            </div>
            <div className="p-2 bg-slate-50 dark:bg-slate-800/80 rounded-xl text-center border border-slate-100 dark:border-slate-800">
              <span className="text-lg block">🌸</span>
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block mt-0.5">Mum</span>
              <span className="text-[10px] text-slate-400 dark:text-slate-500">Parent</span>
            </div>
            <div className="p-2 bg-slate-50 dark:bg-slate-800/80 rounded-xl text-center border border-slate-100 dark:border-slate-800">
              <span className="text-lg block">🎮</span>
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block mt-0.5">Brother</span>
              <span className="text-[10px] text-slate-400 dark:text-slate-500">Sibling</span>
            </div>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed pt-1 border-t border-slate-100 dark:border-slate-800">
            Pick your letters to form a Family Code, list your household members, and let everyone claim their profile from their own phone.
          </p>
        </div>

        {/* Privacy Note */}
        <div className="flex items-start gap-2.5 text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border border-slate-200/60 dark:border-slate-800">
          <Shield className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          <span>
            Strict privacy: No passwords, emails, street addresses, health, or financial info.
          </span>
        </div>
      </div>

      {/* Primary Actions */}
      <div className="space-y-2.5 pt-6 pb-1">
        <button
          onClick={onCreateHousehold}
          type="button"
          className="w-full py-3.5 px-4 bg-slate-900 dark:bg-indigo-600 hover:bg-slate-800 dark:hover:bg-indigo-500 active:scale-[0.99] text-white text-sm font-semibold rounded-2xl shadow-sm flex items-center justify-center gap-2 transition cursor-pointer"
        >
          <PlusCircle className="w-4 h-4 text-indigo-300 dark:text-indigo-200" />
          <span>Create a household</span>
        </button>

        <button
          onClick={onJoinHousehold}
          type="button"
          className="w-full py-3.5 px-4 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 active:scale-[0.99] text-slate-800 dark:text-slate-200 text-sm font-semibold rounded-2xl border border-slate-200/90 dark:border-slate-700 shadow-2xs flex items-center justify-center gap-2 transition cursor-pointer"
        >
          <Smartphone className="w-4 h-4 text-slate-500 dark:text-slate-400" />
          <span>Join from another phone</span>
        </button>
      </div>
    </div>
  );
};
