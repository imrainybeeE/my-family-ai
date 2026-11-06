import React, { useState } from 'react';
import { Copy, Check, Users, Smartphone, Plus, Sparkles, Compass } from 'lucide-react';
import { useHousehold } from '../../context/HouseholdContext';
import { ROLE_ICONS } from '../../utils/familyCode';
import { calculateCommonGround } from '../../utils/tasteMatching';
import { TabType } from '../../types';

interface HomeViewProps {
  onNavigateTab: (tab: TabType) => void;
  onOpenSurvey: () => void;
  onOpenFoundation: (showResult?: boolean) => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  onNavigateTab,
  onOpenSurvey,
  onOpenFoundation,
}) => {
  const { household, members, activeMember, responses } = useHousehold();
  const [copied, setCopied] = useState(false);

  const myAnswers = activeMember ? responses[activeMember.id] : undefined;
  const hasTasteAnswered = Boolean(
    myAnswers &&
      (myAnswers.favoriteCuisines?.length ||
        myAnswers.movieGenres?.length ||
        myAnswers.weekendActivities?.length)
  );

  const myDiscoveryProfile = myAnswers?.discoveryProfile;
  const hasFoundationAnswered = Boolean(myDiscoveryProfile);

  // Count how many household members have completed Foundation Discovery
  const foundationCompletedCount = members.filter(
    (m) => Boolean(responses[m.id]?.discoveryProfile)
  ).length;

  const commonGround = calculateCommonGround(members, responses);

  const handleCopy = async () => {
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
      {/* Greeting */}
      <div className="space-y-1">
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
          Hi, {activeMember?.nickname || activeMember?.role || 'there'}
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {household?.name ? `${household.name} · ` : ''}Household connected & syncing
        </p>
      </div>

      {/* Foundation Discovery Card */}
      <div className="p-4 bg-gradient-to-br from-indigo-50/80 via-white to-violet-50/40 dark:from-indigo-950/40 dark:via-slate-900 dark:to-violet-950/30 rounded-2xl border border-indigo-200/80 dark:border-indigo-900/60 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-indigo-950 dark:text-indigo-300 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            Foundation Discovery
          </span>
          <span className="text-[11px] font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-100/70 dark:bg-indigo-900/50 px-2.5 py-0.5 rounded-full">
            {foundationCompletedCount} of {members.length} discovered
          </span>
        </div>

        {hasFoundationAnswered && myDiscoveryProfile ? (
          <div className="space-y-3">
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Your discovery style is set! Review your positive recharge traits, ideal weekend, and living room insights.
            </p>

            <div className="p-3 bg-white dark:bg-slate-800/80 rounded-xl border border-indigo-100/80 dark:border-indigo-900/60 shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-xs font-bold text-slate-900 dark:text-slate-100">
                <span>Your Style: The {myDiscoveryProfile.primaryStyle}</span>
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  Second: The {myDiscoveryProfile.secondaryStyle}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-0.5">
              <button
                type="button"
                onClick={() => onOpenFoundation(true)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-semibold text-xs rounded-xl shadow-xs transition cursor-pointer flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>View my style</span>
              </button>
              <button
                type="button"
                onClick={() => onOpenFoundation(false)}
                className="px-3 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 active:scale-95 text-slate-700 dark:text-slate-200 font-medium text-xs rounded-xl border border-slate-200 dark:border-slate-700 transition cursor-pointer"
              >
                Retake (18 Qs)
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              18 fun questions across Free Time, Food, Travel, Interests, Approach, and Support. Discover your recharge style at home!
            </p>

            <div className="flex items-center gap-2 pt-0.5">
              <button
                type="button"
                onClick={() => onOpenFoundation(false)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-semibold text-xs rounded-xl shadow-xs transition cursor-pointer flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Start Foundation Discovery</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Living Room Taste Survey Card */}
      <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
            <Compass className="w-4 h-4 text-slate-600 dark:text-slate-400" />
            Dinner & Movie Favorites
          </span>
          <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
            {commonGround.answeredCount} of {members.length} answered
          </span>
        </div>

        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          {hasTasteAnswered
            ? `Your meal and movie tastes are saved! You can update your favorite dishes and movies anytime.`
            : `Answer quick preferences about dinner cuisines and movie genres so the app can find what you all agree on.`}
        </p>

        <div className="flex items-center gap-2 pt-0.5">
          <button
            type="button"
            onClick={onOpenSurvey}
            className="px-3.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 text-slate-800 dark:text-slate-200 font-semibold text-xs rounded-xl transition cursor-pointer"
          >
            {hasTasteAnswered ? 'Edit dinner & movies' : 'Take 1-min taste survey'}
          </button>
          {commonGround.answeredCount > 0 && (
            <button
              type="button"
              onClick={() => onNavigateTab('discover')}
              className="px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 active:scale-95 text-slate-700 dark:text-slate-200 font-medium text-xs rounded-xl border border-slate-200 dark:border-slate-700 transition cursor-pointer flex items-center gap-1.5"
            >
              <Compass className="w-3.5 h-3.5 text-indigo-500" />
              <span>See matches</span>
            </button>
          )}
        </div>
      </div>

      {/* Household Pass Card */}
      <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Family Code</span>
          <span className="text-[11px] text-slate-400 dark:text-slate-500">Share with family</span>
        </div>

        <div className="flex items-center justify-between gap-3 bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
          <span className="text-2xl font-mono-code font-bold text-slate-900 dark:text-slate-100 tracking-wider">
            {household?.code}
          </span>

          <button
            onClick={handleCopy}
            type="button"
            className="px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 active:scale-95 text-slate-800 dark:text-slate-200 font-semibold text-xs rounded-lg border border-slate-200 dark:border-slate-700 shadow-2xs flex items-center gap-1.5 transition cursor-pointer shrink-0"
            title="Copy Family Code"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 stroke-[2.5]" />
                <span className="text-emerald-700 dark:text-emerald-400 font-medium">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>

        <div className="flex items-start gap-2 text-xs text-slate-500 dark:text-slate-400 leading-relaxed pt-0.5">
          <Smartphone className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
          <span>
            Family members can open this app on their own phone, choose <strong>Join from another phone</strong>, and enter this code.
          </span>
        </div>
      </div>

      {/* Household Roster Strip */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
            <Users className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            Household members ({members.length})
          </span>
          <button
            onClick={() => onNavigateTab('family')}
            type="button"
            className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 cursor-pointer"
          >
            View all
          </button>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          {members.map((m) => {
            const isMe = m.id === activeMember?.id;
            const hasMemberAnswered = Boolean(
              responses[m.id] && Object.keys(responses[m.id]).length > 0
            );

            const mProfile = responses[m.id]?.discoveryProfile;

            return (
              <div
                key={m.id}
                className={`shrink-0 flex flex-col items-center p-2.5 rounded-xl border transition-all ${
                  isMe
                    ? 'border-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/40'
                    : 'border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60'
                }`}
                style={{ width: '92px' }}
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-lg text-white shadow-2xs relative"
                  style={{ backgroundColor: m.avatarColor }}
                >
                  {ROLE_ICONS[m.role] || '👤'}
                  {isMe && (
                    <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-indigo-600 border-2 border-white dark:border-slate-900 rounded-full" />
                  )}
                </div>
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-1.5 truncate max-w-[84px] text-center">
                  {m.nickname || m.role}
                </span>
                <span
                  className={`text-[10px] truncate max-w-[84px] text-center font-medium ${
                    mProfile
                      ? 'text-indigo-600 dark:text-indigo-400 font-semibold'
                      : hasMemberAnswered
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-slate-400 dark:text-slate-500'
                  }`}
                >
                  {mProfile
                    ? mProfile.primaryStyle
                    : hasMemberAnswered
                    ? 'Taste ready'
                    : 'Not started'}
                </span>
              </div>
            );
          })}

          <button
            onClick={() => onNavigateTab('family')}
            type="button"
            className="shrink-0 flex flex-col items-center justify-center p-2.5 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600 text-slate-400 dark:text-slate-500 transition cursor-pointer"
            style={{ width: '88px', height: '90px' }}
          >
            <Plus className="w-5 h-5 mb-1" />
            <span className="text-[11px] font-medium">Add</span>
          </button>
        </div>
      </div>
    </div>
  );
};
