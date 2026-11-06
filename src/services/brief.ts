import { FOUNDATION_QUESTIONS } from '../data/foundationQuestions';
import { ADVANCED_QUESTIONS } from '../data/advancedQuestions';
import { FLOWERS } from '../data/flowers';
import { HouseholdMember, MemberTasteAnswers } from '../types';
import { advancedProgress, memberName } from '../utils/member';

/** Mirrors server/familyBrief.ts. The brief is the only family data sent to the AI. */
export interface FamilyBrief {
  householdName: string;
  asker: string;
  members: Array<{
    name: string;
    role: string;
    foundation: 'complete' | 'not started';
    topStyle?: string;
    secondStyle?: string;
    foundationAnswers?: { q: string; a: string[] }[];
    tastes?: { q: string; a: string[] }[];
    advanced?: { q: string; a: string; followUpQ?: string; followUpA?: string }[];
    advancedComplete?: boolean;
  }>;
}

const TASTE_LABELS: Array<[keyof MemberTasteAnswers, string]> = [
  ['favoriteCuisines', 'Favourite food'],
  ['foodDislikes', 'Food they avoid'],
  ['movieGenres', 'Favourite film and show genres'],
  ['movieVibe', 'Preferred film mood'],
  ['weekendActivities', 'Favourite weekend activities'],
  ['energyLevel', 'Usual weekend energy'],
  ['snackPreference', 'Favourite snack'],
];

const style = (id?: string) => (id && id in FLOWERS ? `${id} (${FLOWERS[id as keyof typeof FLOWERS].flower})` : undefined);

export function buildBrief(
  householdName: string | undefined,
  members: HouseholdMember[],
  responses: Record<string, MemberTasteAnswers>,
  askerId: string | undefined
): FamilyBrief {
  const asker = members.find((m) => m.id === askerId);
  return {
    householdName: householdName || 'Our family',
    asker: asker ? memberName(asker) : 'A family member',
    members: members.map((m) => {
      const r = responses[m.id] || {};
      const profile = r.discoveryProfile;
      const foundationAnswers = FOUNDATION_QUESTIONS.flatMap((q) => {
        const raw = r.foundationAnswers?.[String(q.id)];
        const a = Array.isArray(raw) ? raw : raw ? [raw] : [];
        return a.length ? [{ q: q.question, a }] : [];
      });
      const tastes = TASTE_LABELS.flatMap(([key, label]) => {
        const raw = r[key];
        const a = Array.isArray(raw) ? (raw as string[]) : typeof raw === 'string' && raw ? [raw] : [];
        return a.length ? [{ q: label, a }] : [];
      });
      const advanced = ADVANCED_QUESTIONS.flatMap((q) => {
        const ans = r.advancedAnswers?.[q.id];
        return ans?.answer
          ? [{ q: q.question, a: ans.answer, followUpQ: ans.followUpQuestion, followUpA: ans.followUpAnswer }]
          : [];
      });
      return {
        name: memberName(m),
        role: m.role === 'Me' ? 'Student (the person who set up the app)' : m.role,
        foundation: profile ? 'complete' : 'not started',
        topStyle: style(profile?.primaryStyle),
        secondStyle: style(profile?.secondaryStyle),
        foundationAnswers,
        tastes,
        advanced,
        advancedComplete: advancedProgress(r).complete,
      };
    }),
  };
}

/** Stable short hash for caching AI results against the exact data they were made from. */
export function hashBrief(value: unknown): string {
  const s = JSON.stringify(value);
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}
