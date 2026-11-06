import React from 'react';
import { DiscoveryProfile } from '../../types';
import { DISCOVERY_STYLES_INFO } from '../../data/foundationQuestions';
import { Compass, Sparkles, Heart, Sun, Info, Check } from 'lucide-react';

interface FoundationResultCardProps {
  profile: DiscoveryProfile;
  memberName: string;
  onRetake?: () => void;
  onClose?: () => void;
}

export const FoundationResultCard: React.FC<FoundationResultCardProps> = ({
  profile,
  memberName,
  onRetake,
  onClose,
}) => {
  const primaryInfo = DISCOVERY_STYLES_INFO[profile.primaryStyle];
  const secondaryInfo = DISCOVERY_STYLES_INFO[profile.secondaryStyle];

  return (
    <div className="space-y-5">
      {/* Header Banner */}
      <div className="text-center space-y-1.5 pt-1">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900/60 text-indigo-700 dark:text-indigo-300 text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Foundation Discovery Profile</span>
        </div>
        <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
          {memberName}’s Living Room Style
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
          Here is how you love to recharge, create, and connect at home.
        </p>
      </div>

      {/* Your Primary Style */}
      <div className={`p-4 rounded-2xl border ${primaryInfo.borderColor} ${primaryInfo.accentBg.split(' ')[0]} dark:bg-slate-900 dark:border-indigo-900/60 space-y-3.5`}>
        <div className="flex items-start justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Your Style
            </span>
            <h4 className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-0.5">
              {primaryInfo.title}
            </h4>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-white/80 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700 shadow-2xs text-slate-700 dark:text-slate-200">
            {primaryInfo.badge}
          </span>
        </div>

        <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
          {primaryInfo.positiveDescription}
        </p>

        {/* Weekend Recharge */}
        <div className="p-3 bg-white/90 dark:bg-slate-800/90 rounded-xl border border-slate-200/60 dark:border-slate-700 space-y-1">
          <div className="flex items-center gap-1.5 text-slate-800 dark:text-slate-200 text-xs font-semibold">
            <Sun className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span>Ideal Weekend Recharge</span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-normal pl-5">
            {primaryInfo.weekendRecharge}
          </p>
        </div>

        {/* Family Insight */}
        <div className="p-3 bg-white/90 dark:bg-slate-800/90 rounded-xl border border-slate-200/60 dark:border-slate-700 space-y-1">
          <div className="flex items-center gap-1.5 text-slate-800 dark:text-slate-200 text-xs font-semibold">
            <Heart className="w-3.5 h-3.5 text-rose-500 shrink-0" />
            <span>Family-Friendly Insight</span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-normal pl-5">
            {primaryInfo.familyInsight}
          </p>
        </div>
      </div>

      {/* Your Second Style */}
      <div className={`p-4 rounded-2xl border ${secondaryInfo.borderColor} ${secondaryInfo.accentBg.split(' ')[0]} dark:bg-slate-900 dark:border-indigo-900/60 space-y-3.5`}>
        <div className="flex items-start justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Your Second Style
            </span>
            <h4 className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-0.5">
              {secondaryInfo.title}
            </h4>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-white/80 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700 shadow-2xs text-slate-700 dark:text-slate-200">
            {secondaryInfo.badge}
          </span>
        </div>

        <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
          {secondaryInfo.positiveDescription}
        </p>

        {/* Weekend Recharge */}
        <div className="p-3 bg-white/90 dark:bg-slate-800/90 rounded-xl border border-slate-200/60 dark:border-slate-700 space-y-1">
          <div className="flex items-center gap-1.5 text-slate-800 dark:text-slate-200 text-xs font-semibold">
            <Sun className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span>Ideal Weekend Recharge</span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-normal pl-5">
            {secondaryInfo.weekendRecharge}
          </p>
        </div>

        {/* Family Insight */}
        <div className="p-3 bg-white/90 dark:bg-slate-800/90 rounded-xl border border-slate-200/60 dark:border-slate-700 space-y-1">
          <div className="flex items-center gap-1.5 text-slate-800 dark:text-slate-200 text-xs font-semibold">
            <Heart className="w-3.5 h-3.5 text-rose-500 shrink-0" />
            <span>Family-Friendly Insight</span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-normal pl-5">
            {secondaryInfo.familyInsight}
          </p>
        </div>
      </div>

      {/* Mandatory Non-Diagnostic Disclaimer */}
      <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 flex items-start gap-2.5">
        <Info className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0 mt-0.5" />
        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
          This is a fun discovery profile based on your answers in this app, not a psychological assessment or personality diagnosis.
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2 pt-1">
        {onRetake && (
          <button
            onClick={onRetake}
            type="button"
            className="flex-1 py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition active:scale-98 cursor-pointer"
          >
            Retake questionnaire
          </button>
        )}
        {onClose && (
          <button
            onClick={onClose}
            type="button"
            className="flex-1 py-2.5 px-3 rounded-xl bg-slate-900 dark:bg-indigo-600 text-white text-xs font-semibold hover:bg-slate-800 dark:hover:bg-indigo-500 transition active:scale-98 flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Done</span>
          </button>
        )}
      </div>
    </div>
  );
};
