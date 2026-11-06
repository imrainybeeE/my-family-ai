import React, { useState } from 'react';
import { X, ChevronLeft, ChevronRight, Check, Sparkles, Loader2, Edit3, PlusCircle } from 'lucide-react';
import { useHousehold } from '../../context/HouseholdContext';
import {
  FOUNDATION_QUESTIONS,
  CUSTOM_FOUNDATION_QUESTIONS,
  FOUNDATION_SECTIONS,
  FoundationQuestion,
} from '../../data/foundationQuestions';
import { scoreDiscoveryProfile } from '../../utils/discoveryScoring';
import { FoundationResultCard } from './FoundationResultCard';
import { DiscoveryProfile } from '../../types';

interface FoundationModalProps {
  onClose: () => void;
  initialShowResult?: boolean;
}

type ModalScreen = 'questionnaire' | 'review' | 'result';

export const FoundationModal: React.FC<FoundationModalProps> = ({
  onClose,
  initialShowResult = false,
}) => {
  const { activeMember, responses, saveMyFoundationAnswers } = useHousehold();

  // Combine standard 18 questions + custom questions (currently empty placeholder)
  const allQuestions: FoundationQuestion[] = [
    ...FOUNDATION_QUESTIONS,
    ...CUSTOM_FOUNDATION_QUESTIONS,
  ];

  const totalQuestions = allQuestions.length;

  // Active member's existing responses if any
  const memberAnswers = activeMember ? responses[activeMember.id] : undefined;
  const existingProfile = memberAnswers?.discoveryProfile;
  const existingFoundationAnswers = memberAnswers?.foundationAnswers || {};

  // Local state for answers being drafted: maps question ID to string or string[]
  const [answers, setAnswers] = useState<Record<number, string | string[]>>(() => {
    const initial: Record<number, string | string[]> = {};
    for (const [key, val] of Object.entries(existingFoundationAnswers)) {
      const numKey = Number(key);
      if (!Number.isNaN(numKey)) {
        initial[numKey] = val;
      }
    }
    return initial;
  });

  const [currentIdx, setCurrentIdx] = useState(0);
  const [screen, setScreen] = useState<ModalScreen>(() => {
    if (initialShowResult && existingProfile) return 'result';
    return 'questionnaire';
  });
  const [isSaving, setIsSaving] = useState(false);
  const [computedProfile, setComputedProfile] = useState<DiscoveryProfile | null>(
    existingProfile || null
  );

  const currentQ = allQuestions[currentIdx] || allQuestions[0];
  const currentAnswer = answers[currentQ.id];

  // Helper to handle option selection
  const handleSelectOption = (option: string) => {
    if (currentQ.isMultiSelect) {
      const currentList: string[] = Array.isArray(currentAnswer)
        ? [...currentAnswer]
        : currentAnswer
        ? [currentAnswer]
        : [];

      const maxLimit = currentQ.maxSelections || 2;

      if (currentList.includes(option)) {
        // Deselect
        const nextList = currentList.filter((item) => item !== option);
        setAnswers((prev) => ({ ...prev, [currentQ.id]: nextList }));
      } else {
        // Select if under max limit
        if (currentList.length < maxLimit) {
          const nextList = [...currentList, option];
          setAnswers((prev) => ({ ...prev, [currentQ.id]: nextList }));
        } else {
          // Replace last selection
          const nextList = [...currentList.slice(1), option];
          setAnswers((prev) => ({ ...prev, [currentQ.id]: nextList }));
        }
      }
    } else {
      // Single choice
      setAnswers((prev) => ({ ...prev, [currentQ.id]: option }));
    }
  };

  const isCurrentQAnswered = Boolean(
    currentAnswer &&
      (Array.isArray(currentAnswer) ? currentAnswer.length > 0 : currentAnswer.trim().length > 0)
  );

  const handleNext = () => {
    if (currentIdx < totalQuestions - 1) {
      setCurrentIdx((prev) => prev + 1);
    } else {
      // Reached the end -> Go to review screen
      setScreen('review');
    }
  };

  const handleBack = () => {
    if (currentIdx > 0) {
      setCurrentIdx((prev) => prev - 1);
    }
  };

  const jumpToQuestion = (qId: number) => {
    const targetIdx = allQuestions.findIndex((q) => q.id === qId);
    if (targetIdx !== -1) {
      setCurrentIdx(targetIdx);
      setScreen('questionnaire');
    }
  };

  const handleSubmitProfile = async () => {
    setIsSaving(true);
    try {
      // Calculate profile
      const profile = scoreDiscoveryProfile(answers);
      setComputedProfile(profile);

      // Serialize answers with string keys for Firestore safety
      const serializedAnswers: Record<string, string | string[]> = {};
      for (const [k, v] of Object.entries(answers)) {
        serializedAnswers[String(k)] = v;
      }

      await saveMyFoundationAnswers(serializedAnswers, profile);
      setScreen('result');
    } catch (err) {
      console.error('Failed to submit discovery questionnaire:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const memberDisplayName = activeMember
    ? activeMember.nickname || activeMember.role
    : 'Household Member';

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-t-3xl sm:rounded-2xl max-h-[92vh] flex flex-col shadow-xl overflow-hidden border border-slate-200 dark:border-slate-800 animate-in slide-in-from-bottom duration-200">
        {/* Top Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/80">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900/60 flex items-center justify-center text-indigo-700 dark:text-indigo-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Foundation Discovery
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {screen === 'questionnaire' && `Question ${currentIdx + 1} of ${totalQuestions}`}
                {screen === 'review' && 'Final Review before submitting'}
                {screen === 'result' && `Results for ${memberDisplayName}`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Progress bar (when in questionnaire mode) */}
        {screen === 'questionnaire' && (
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-1">
            <div
              className="bg-indigo-600 h-1 transition-all duration-300 ease-out"
              style={{ width: `${((currentIdx + 1) / totalQuestions) * 100}%` }}
            />
          </div>
        )}

        {/* Scrollable Body Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {/* ============================================================= */}
          {/* SCREEN 1: QUESTIONNAIRE MODE */}
          {/* ============================================================= */}
          {screen === 'questionnaire' && (
            <div className="space-y-4">
              {/* Section Header Badge */}
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-1 rounded-full border border-indigo-100 dark:border-indigo-900/60">
                  {currentQ.section}
                </span>
                <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500">
                  Q{currentQ.id} / 18
                </span>
              </div>

              {/* Question Text */}
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 leading-snug">
                  {currentQ.question}
                </h3>
                {currentQ.subtitle && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    {currentQ.subtitle}
                  </p>
                )}
              </div>

              {/* Options List with Large Mobile-Friendly Buttons */}
              <div className="space-y-2.5 pt-1">
                {currentQ.options.map((opt, idx) => {
                  const isSelected = currentQ.isMultiSelect
                    ? Array.isArray(currentAnswer) && currentAnswer.includes(opt)
                    : currentAnswer === opt;

                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectOption(opt)}
                      className={`w-full text-left p-3.5 rounded-xl border transition flex items-start justify-between gap-3 min-h-[52px] cursor-pointer ${
                        isSelected
                          ? 'border-indigo-600 dark:border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/50 text-indigo-950 dark:text-indigo-200 font-medium shadow-2xs'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <span className="text-xs leading-relaxed flex-1">
                        {opt}
                      </span>
                      <div
                        className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                          isSelected
                            ? 'bg-indigo-600 border-indigo-600 text-white'
                            : 'border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800'
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Helper indicator if multi-select */}
              {currentQ.isMultiSelect && (
                <p className="text-[11px] text-slate-400 dark:text-slate-500 italic text-right">
                  Choose up to {currentQ.maxSelections || 2} options
                </p>
              )}
            </div>
          )}

          {/* ============================================================= */}
          {/* SCREEN 2: FINAL REVIEW SCREEN */}
          {/* ============================================================= */}
          {screen === 'review' && (
            <div className="space-y-5">
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Review Your Answers
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Check your responses across all 6 sections below before discovering your style.
                </p>
              </div>

              {/* 6 Sections Grouping */}
              <div className="space-y-4">
                {FOUNDATION_SECTIONS.map((secName, sIdx) => {
                  const secQuestions = allQuestions.filter((q) => q.section === secName);
                  return (
                    <div
                      key={sIdx}
                      className="p-3.5 bg-slate-50/80 dark:bg-slate-950/40 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-2.5"
                    >
                      <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-800 pb-2">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          {sIdx + 1}. {secName}
                        </span>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                          {secQuestions.length} questions
                        </span>
                      </div>

                      <div className="space-y-2">
                        {secQuestions.map((q) => {
                          const ans = answers[q.id];
                          const hasAns = Boolean(
                            ans && (Array.isArray(ans) ? ans.length > 0 : ans.trim())
                          );

                          return (
                            <div
                              key={q.id}
                              className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200/70 dark:border-slate-800 text-xs space-y-1"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <span className="font-semibold text-slate-800 dark:text-slate-200 line-clamp-1 flex-1">
                                  Q{q.id}. {q.question}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => jumpToQuestion(q.id)}
                                  className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-medium text-[11px] flex items-center gap-1 shrink-0 p-1 -m-1 cursor-pointer"
                                >
                                  <Edit3 className="w-3 h-3" />
                                  <span>Edit</span>
                                </button>
                              </div>
                              <div className="text-[11px] text-slate-600 dark:text-slate-300">
                                {hasAns ? (
                                  Array.isArray(ans) ? (
                                    <div className="flex flex-wrap gap-1 mt-1">
                                      {ans.map((a, i) => (
                                        <span
                                          key={i}
                                          className="bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded font-medium"
                                        >
                                          {a}
                                        </span>
                                      ))}
                                    </div>
                                  ) : (
                                    <span className="text-slate-700 dark:text-slate-300 font-medium">
                                      {ans}
                                    </span>
                                  )
                                ) : (
                                  <span className="text-amber-600 dark:text-amber-400 italic">
                                    Not answered yet
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}

                {/* Clearly Labelled Area for 3–5 Custom Questions (Empty for now) */}
                <div className="p-3.5 bg-dashed rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 text-center space-y-1.5 bg-slate-50/40 dark:bg-slate-950/20">
                  <div className="inline-flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-xs font-semibold">
                    <PlusCircle className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                    <span>Custom Household Questions Area</span>
                  </div>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 max-w-xs mx-auto leading-relaxed">
                    Reserved slot for 3–5 custom household questions. (Currently empty — ready for your future additions in config).
                  </p>
                </div>
              </div>

              {/* Non-diagnostic notice */}
              <p className="text-[11px] text-slate-400 dark:text-slate-500 text-center leading-normal">
                This is a fun discovery profile based on answers in this app, not a psychological assessment.
              </p>
            </div>
          )}

          {/* ============================================================= */}
          {/* SCREEN 3: RESULT SCREEN */}
          {/* ============================================================= */}
          {screen === 'result' && computedProfile && (
            <FoundationResultCard
              profile={computedProfile}
              memberName={memberDisplayName}
              onRetake={() => {
                setScreen('questionnaire');
                setCurrentIdx(0);
              }}
              onClose={onClose}
            />
          )}
        </div>

        {/* Modal Footer Controls */}
        {screen === 'questionnaire' && (
          <div className="p-3.5 sm:p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/80 flex items-center justify-between gap-3">
            <button
              onClick={handleBack}
              disabled={currentIdx === 0}
              type="button"
              className={`px-3.5 py-2.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition ${
                currentIdx === 0
                  ? 'border-slate-200 dark:border-slate-800 text-slate-300 dark:text-slate-600 cursor-not-allowed bg-slate-100/50 dark:bg-slate-800/40'
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 active:scale-98 cursor-pointer'
              }`}
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Back</span>
            </button>

            <button
              onClick={handleNext}
              disabled={!isCurrentQAnswered}
              type="button"
              className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                isCurrentQAnswered
                  ? 'bg-indigo-600 text-white hover:bg-indigo-700 active:scale-98 shadow-xs'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed'
              }`}
            >
              <span>{currentIdx < totalQuestions - 1 ? 'Next question' : 'Review all answers'}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {screen === 'review' && (
          <div className="p-3.5 sm:p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/80 flex items-center justify-between gap-3">
            <button
              onClick={() => {
                setCurrentIdx(totalQuestions - 1);
                setScreen('questionnaire');
              }}
              type="button"
              className="px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 active:scale-98 flex items-center gap-1 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Back to Q{totalQuestions}</span>
            </button>

            <button
              onClick={handleSubmitProfile}
              disabled={isSaving}
              type="button"
              className="flex-1 py-2.5 px-4 rounded-xl bg-slate-900 dark:bg-indigo-600 text-white text-xs font-semibold hover:bg-slate-800 dark:hover:bg-indigo-500 active:scale-98 transition flex items-center justify-center gap-2 shadow-xs cursor-pointer"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Calculating your style...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>Discover My Style</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
