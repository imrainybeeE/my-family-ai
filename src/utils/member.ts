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

/**
 * Display names that are unique within the family, keyed by member id. A repeated name gets
 * a number ("Grandparent", "Grandparent 2"), so names can safely identify people in the UI
 * and in AI replies.
 */
export function uniqueNames(members: Array<Pick<HouseholdMember, 'id' | 'nickname' | 'role'>>): Map<string, string> {
  const totals = new Map<string, number>();
  for (const m of members) {
    const key = memberName(m).toLowerCase();
    totals.set(key, (totals.get(key) || 0) + 1);
  }
  const seen = new Map<string, number>();
  const out = new Map<string, string>();
  for (const m of members) {
    const base = memberName(m);
    const key = base.toLowerCase();
    const n = (seen.get(key) || 0) + 1;
    seen.set(key, n);
    out.set(m.id, (totals.get(key) || 0) > 1 && n > 1 ? `${base} ${n}` : base);
  }
  return out;
}

/** Merges a patch into a member's answers, dropping keys the patch clears with undefined. */
export function mergeAnswers(existing: MemberTasteAnswers | undefined, patch: Partial<MemberTasteAnswers>): MemberTasteAnswers {
  const merged: MemberTasteAnswers = { ...(existing || {}), ...patch };
  for (const key of Object.keys(merged) as Array<keyof MemberTasteAnswers>) {
    if (merged[key] === undefined) delete merged[key];
  }
  return merged;
}

/**
 * After a failed save, puts back what was there before, unless something newer has already
 * replaced the failed value.
 */
export function rollbackAnswers(
  current: Record<string, MemberTasteAnswers>,
  memberId: string,
  failed: MemberTasteAnswers,
  previous: MemberTasteAnswers | undefined
): Record<string, MemberTasteAnswers> {
  if (current[memberId] !== failed) return current;
  const next = { ...current };
  if (previous) next[memberId] = previous;
  else delete next[memberId];
  return next;
}
