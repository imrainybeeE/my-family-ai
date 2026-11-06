import React, { useState } from 'react';
import {
  Compass,
  Users,
  Sparkles,
  Heart,
  Lightbulb,
  Utensils,
  Film,
  Sun,
  Info,
  Check,
  ChevronRight,
} from 'lucide-react';
import { useHousehold } from '../../context/HouseholdContext';
import {
  generateFamilyProfileReport,
  buildIndividualProfile,
} from '../../utils/familyProfileAnalysis';
import { filterActivitiesForActiveGroup } from '../../utils/tasteMatching';
import { ROLE_ICONS } from '../../utils/familyCode';
import { DISCOVERY_STYLES_INFO } from '../../data/foundationQuestions';

interface DiscoverViewProps {
  onOpenSurvey: () => void;
  onOpenFoundation?: (showResult?: boolean) => void;
}

export const DiscoverView: React.FC<DiscoverViewProps> = ({
  onOpenSurvey,
  onOpenFoundation,
}) => {
  const { household, members, responses, activeMember } = useHousehold();

  // Sub-tab toggle: "Meet My Family" vs "Individual Profiles"
  const [activeSubTab, setActiveSubTab] = useState<'family' | 'individual'>('family');

  // Selected member for Individual Profile inspection
  const [selectedMemberId, setSelectedMemberId] = useState<string>(
    activeMember?.id || members[0]?.id || ''
  );

  // Active group filter for "Who is hanging out right now?"
  const [selectedGroupMemberIds, setSelectedGroupMemberIds] = useState<string[]>(() =>
    members.map((m) => m.id)
  );

  const toggleGroupMember = (id: string) => {
    if (selectedGroupMemberIds.includes(id)) {
      if (selectedGroupMemberIds.length > 1) {
        setSelectedGroupMemberIds(selectedGroupMemberIds.filter((mId) => mId !== id));
      }
    } else {
      setSelectedGroupMemberIds([...selectedGroupMemberIds, id]);
    }
  };

  const familyReport = generateFamilyProfileReport(members, responses);
  const groupActivities = filterActivitiesForActiveGroup(selectedGroupMemberIds, responses);

  // Target member for Individual Profile
  const currentInspectMember =
    members.find((m) => m.id === selectedMemberId) || activeMember || members[0];
  const individualProfile = currentInspectMember
    ? buildIndividualProfile(currentInspectMember, responses[currentInspectMember.id])
    : null;

  return (
    <div className="p-4 sm:p-5 space-y-4">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Compass className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Results & Discovery
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {familyReport.answeredCount} of {members.length} members completed discovery
          </p>
        </div>

        {/* Action button */}
        {onOpenFoundation && (
          <button
            type="button"
            onClick={() => onOpenFoundation(false)}
            className="px-3 py-1.5 bg-indigo-50 dark:bg-slate-800 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 text-xs font-semibold rounded-xl border border-indigo-200 dark:border-slate-700 transition cursor-pointer"
          >
            {activeMember && responses[activeMember.id]?.discoveryProfile
              ? 'Update answers'
              : 'Take discovery'}
          </button>
        )}
      </div>

      {/* Sub-tab Switcher: Meet My Family vs Reveal My Style */}
      <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-medium">
        <button
          type="button"
          onClick={() => setActiveSubTab('family')}
          className={`py-2 px-2 rounded-lg text-center transition cursor-pointer flex items-center justify-center gap-1.5 ${
            activeSubTab === 'family'
              ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 font-semibold shadow-2xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Meet My Family</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab('individual')}
          className={`py-2 px-2 rounded-lg text-center transition cursor-pointer flex items-center justify-center gap-1.5 ${
            activeSubTab === 'individual'
              ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 font-semibold shadow-2xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Individual Profiles</span>
        </button>
      </div>

      {/* ==================================================================== */}
      {/* VIEW A: MEET MY FAMILY (FAMILY PROFILE) */}
      {/* ==================================================================== */}
      {activeSubTab === 'family' && (
        <div className="space-y-4">
          {/* Section 1: Things We Enjoy Together */}
          <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/90 dark:border-slate-700 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <Heart className="w-4 h-4 text-rose-500" />
                Things We Enjoy Together
              </span>
              <span className="text-[10px] text-slate-400">Shared favorites</span>
            </div>

            <div className="space-y-2">
              {familyReport.thingsWeEnjoyTogether.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-slate-50 dark:bg-slate-900/90 rounded-xl border border-slate-200/80 dark:border-slate-700/80 space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      {item.title}
                    </span>
                    {item.membersInvolved.length > 0 && (
                      <span className="text-[10px] font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900/80 px-2 py-0.5 rounded-md">
                        {item.membersInvolved.join(' & ')}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    {item.detail}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Section 2: Interesting Differences */}
          <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/90 dark:border-slate-700 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-500" />
                Interesting Differences
              </span>
              <span className="text-[10px] text-slate-400">Complementary strengths</span>
            </div>

            <div className="space-y-2.5">
              {familyReport.interestingDifferences.map((diff, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-slate-50 dark:bg-slate-900/90 rounded-xl border border-slate-200/80 dark:border-slate-700/80 space-y-2"
                >
                  <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    {diff.title}
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    {diff.detail}
                  </p>
                  <div className="p-2.5 bg-white dark:bg-slate-950/70 rounded-lg border border-slate-200/80 dark:border-slate-800 text-[11px] text-slate-700 dark:text-slate-200 leading-relaxed">
                    <span className="font-semibold text-indigo-600 dark:text-indigo-400">Living room balance: </span>
                    {diff.positiveBridge}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 3: Ideas Worth Trying */}
          <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/90 dark:border-slate-700 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <Lightbulb className="w-4 h-4 text-indigo-500" />
                Ideas Worth Trying
              </span>
              <span className="text-[10px] text-slate-400">Practical family plans</span>
            </div>

            <div className="space-y-2.5">
              {familyReport.ideasWorthTrying.map((idea, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-indigo-50/50 dark:bg-slate-900/90 rounded-xl border border-indigo-100/80 dark:border-slate-700/80 space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-indigo-950 dark:text-indigo-200">
                      {idea.title}
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                      {idea.category}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    {idea.whyItFits}
                  </p>
                  <p className="text-[11px] text-indigo-700 dark:text-indigo-300 italic pt-0.5">
                    💡 Tip: {idea.funTip}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Group Activity Matcher ("Who's in the room right now?") */}
          <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/90 dark:border-slate-700 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 block">
                  Who is hanging out right now?
                </span>
                <span className="text-[10px] text-slate-400">Tap to toggle members</span>
              </div>
              <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900/60 px-2 py-0.5 rounded-full">
                {selectedGroupMemberIds.length} active
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              {members.map((m) => {
                const isSelected = selectedGroupMemberIds.includes(m.id);
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => toggleGroupMember(m.id)}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-medium flex items-center gap-1.5 transition cursor-pointer ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/70 text-indigo-900 dark:text-indigo-200 font-semibold'
                        : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/70 text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    <span>{ROLE_ICONS[m.role] || '👤'}</span>
                    <span>{m.nickname || m.role}</span>
                  </button>
                );
              })}
            </div>

            <div className="space-y-1.5 pt-1">
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">
                Top matches for this group:
              </span>
              {groupActivities.length > 0 ? (
                groupActivities.slice(0, 3).map((act, i) => (
                  <div
                    key={i}
                    className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-700 flex items-center justify-between text-xs"
                  >
                    <span className="font-medium text-slate-800 dark:text-slate-200">{act.activity}</span>
                    <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold bg-white dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                      {act.matchCount} shared
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400 italic">
                  Selected members haven’t added weekend activities yet.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* VIEW B: INDIVIDUAL PROFILES (REVEAL MY STYLE) */}
      {/* ==================================================================== */}
      {activeSubTab === 'individual' && individualProfile && (
        <div className="space-y-4">
          {/* Member Picker Strip */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
            {members.map((m) => {
              const isSelected = m.id === selectedMemberId;
              const hasAnswers = Boolean(responses[m.id]?.discoveryProfile);

              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setSelectedMemberId(m.id)}
                  className={`shrink-0 px-3 py-2 rounded-xl border flex items-center gap-2 transition cursor-pointer ${
                    isSelected
                      ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-950 dark:text-indigo-200 font-semibold shadow-2xs'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <span
                    className="w-5 h-5 rounded-full flex items-center justify-center text-[11px] text-white shrink-0"
                    style={{ backgroundColor: m.avatarColor }}
                  >
                    {ROLE_ICONS[m.role] || '👤'}
                  </span>
                  <span className="text-xs">{m.nickname || m.role}</span>
                  {hasAnswers && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Profile Content */}
          {individualProfile.discoveryProfile ? (
            <div className="space-y-4">
              {/* Primary & Secondary Style Card (ONLY Top & Second Style shown) */}
              <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/90 dark:border-slate-700 shadow-xs space-y-4">
                <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-700/80 pb-3">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Discovery Profile
                    </span>
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                      {individualProfile.member.nickname || individualProfile.member.role}’s Style
                    </h3>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-slate-700 text-indigo-700 dark:text-indigo-300">
                    {individualProfile.answeredCount} questions answered
                  </span>
                </div>

                {/* Primary Style */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 block">
                        Your Style
                      </span>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        {DISCOVERY_STYLES_INFO[individualProfile.discoveryProfile.primaryStyle].title}
                      </h4>
                    </div>
                    <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                      {DISCOVERY_STYLES_INFO[individualProfile.discoveryProfile.primaryStyle].badge}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                    {DISCOVERY_STYLES_INFO[individualProfile.discoveryProfile.primaryStyle].positiveDescription}
                  </p>
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-900/90 rounded-xl text-xs space-y-1 border border-slate-200/60 dark:border-slate-700/80">
                    <span className="font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                      <Sun className="w-3.5 h-3.5 text-amber-500" />
                      Weekend Recharge:
                    </span>
                    <p className="text-slate-500 dark:text-slate-300 text-[11px] pl-5">
                      {DISCOVERY_STYLES_INFO[individualProfile.discoveryProfile.primaryStyle].weekendRecharge}
                    </p>
                  </div>
                </div>

                {/* Second Style */}
                <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-700/80">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 block">
                        Your Second Style
                      </span>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        {DISCOVERY_STYLES_INFO[individualProfile.discoveryProfile.secondaryStyle].title}
                      </h4>
                    </div>
                    <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                      {DISCOVERY_STYLES_INFO[individualProfile.discoveryProfile.secondaryStyle].badge}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                    {DISCOVERY_STYLES_INFO[individualProfile.discoveryProfile.secondaryStyle].positiveDescription}
                  </p>
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-900/90 rounded-xl text-xs space-y-1 border border-slate-200/60 dark:border-slate-700/80">
                    <span className="font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                      <Heart className="w-3.5 h-3.5 text-rose-500" />
                      Family Insight:
                    </span>
                    <p className="text-slate-500 dark:text-slate-300 text-[11px] pl-5">
                      {DISCOVERY_STYLES_INFO[individualProfile.discoveryProfile.secondaryStyle].familyInsight}
                    </p>
                  </div>
                </div>

                {/* Non-diagnostic disclaimer */}
                <div className="p-3 bg-slate-50 dark:bg-slate-900/90 rounded-xl flex items-start gap-2 text-[11px] text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/80">
                  <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <span>
                    This is a fun discovery profile based on answers in this app, not a psychological assessment or personality diagnosis.
                  </span>
                </div>
              </div>

              {/* What this member actually answered */}
              <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/90 dark:border-slate-700 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    What {individualProfile.member.nickname || individualProfile.member.role} Actually Answered
                  </span>
                  <span className="text-[10px] text-slate-400">Summarized answers</span>
                </div>

                <div className="space-y-2">
                  {individualProfile.actualAnswersSummary.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 bg-slate-50 dark:bg-slate-900/90 rounded-xl border border-slate-200/80 dark:border-slate-700 text-xs space-y-0.5"
                    >
                      <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 block">
                        {item.category}
                      </span>
                      <span className="font-medium text-slate-800 dark:text-slate-200 block">
                        {item.questionText}
                      </span>
                      <div className="flex flex-wrap gap-1 pt-1">
                        {item.answerText.map((ans, aIdx) => (
                          <span
                            key={aIdx}
                            className="bg-white dark:bg-slate-800 px-2 py-0.5 rounded text-[11px] text-slate-700 dark:text-slate-200 font-medium border border-slate-200/70 dark:border-slate-700"
                          >
                            {ans}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* Member has not answered yet */
            <div className="p-6 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-xl mx-auto">
                {ROLE_ICONS[individualProfile.member.role] || '👤'}
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {individualProfile.member.nickname || individualProfile.member.role} hasn’t answered yet
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
                Based on the answers provided... there is no discovery profile for this member yet. Switch to this profile on their phone to complete the 18 questions!
              </p>
              {onOpenFoundation && individualProfile.member.id === activeMember?.id && (
                <button
                  type="button"
                  onClick={() => onOpenFoundation(false)}
                  className="px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-xl hover:bg-indigo-700 transition"
                >
                  Start my questionnaire
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
