import { ADVANCED_QUESTIONS } from '../data/advancedQuestions';
import { HouseholdMember, MemberTasteAnswers } from '../types';

export function memberName(m: Pick<HouseholdMember, 'nickname' | 'role'>): string {
  return m.nickname?.trim() || m.role;
}

export function hasBloomed(answers?: MemberTasteAnswers): boolean {
  return Boolean(answers?.discoveryProfile);
}

export function advancedProgress(answers?: MemberTasteAnswers): { done: number; total: number; complete: boolean } {
  const ids = new Set(ADVANCED_QUESTIONS.map((q) => q.id));
  const done = Object.keys(answers?.advancedAnswers || {}).filter((id) => ids.has(id)).length;
  return { done, total: ADVANCED_QUESTIONS.length, complete: Boolean(answers?.advancedCompletedAt) || done === ADVANCED_QUESTIONS.length };
}

export function hasTastes(answers?: MemberTasteAnswers): boolean {
  return Boolean(
    answers?.favoriteCuisines?.length || answers?.movieGenres?.length || answers?.weekendActivities?.length
  );
}

/** Joins names as "A", "A and B", "A, B and C". */
export function joinNames(names: string[]): string {
  if (names.length <= 1) return names[0] || '';
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}
