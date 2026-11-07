import { DiscoveryProfile, DiscoveryStyleId } from '../types';
import {
  FOUNDATION_QUESTIONS,
  CUSTOM_FOUNDATION_QUESTIONS,
  STYLE_MAPPING_CONFIG,
} from '../data/foundationQuestions';

export const ALL_DISCOVERY_STYLES: DiscoveryStyleId[] = [
  'Explorer',
  'Creator',
  'Connector',
  'Achiever',
  'Chiller',
  'Thinker',
];

/**
 * Computes the internal scores for all 6 discovery styles based on member's answers,
 * and determines the Primary ("Your Style") and Secondary ("Your Second Style") styles.
 *
 * Strict constraint: Internal scoring only; percentages and full rank order are never
 * displayed to the user to avoid negative comparisons or diagnostic framing.
 */
export function scoreDiscoveryProfile(
  answers: Record<number | string, string | string[]>
): DiscoveryProfile {
  const scores: Record<DiscoveryStyleId, number> = {
    Explorer: 0,
    Creator: 0,
    Connector: 0,
    Achiever: 0,
    Chiller: 0,
    Thinker: 0,
  };

  const allQuestions = [...FOUNDATION_QUESTIONS, ...CUSTOM_FOUNDATION_QUESTIONS];

  for (const q of allQuestions) {
    const rawAnswer = answers[q.id] || answers[String(q.id)];
    if (!rawAnswer) continue;

    const selectedOptions = Array.isArray(rawAnswer) ? rawAnswer : [rawAnswer];
    const qMapping = STYLE_MAPPING_CONFIG[q.id] || {};

    for (const opt of selectedOptions) {
      const mappedStyles = qMapping[opt];
      if (mappedStyles && Array.isArray(mappedStyles)) {
        for (const style of mappedStyles) {
          if (scores[style] !== undefined) {
            scores[style] += 1;
          }
        }
      }
    }
  }

  // Sort styles by descending score, breaking ties deterministically
  const sorted = [...ALL_DISCOVERY_STYLES].sort((a, b) => {
    const diff = scores[b] - scores[a];
    if (diff !== 0) return diff;
    return ALL_DISCOVERY_STYLES.indexOf(a) - ALL_DISCOVERY_STYLES.indexOf(b);
  });

  const primaryStyle = sorted[0];
  const secondaryStyle = sorted[1] || sorted[0];

  return {
    primaryStyle,
    secondaryStyle,
    scores,
    completedAt: new Date().toISOString(),
  };
}

/**
 * The petals sewn so far: for each answered question in order, one petal per style its
 * picked options lean towards. Drives the flower that grows during the Foundation questions.
 */
export function petalsFor(answers: Record<number | string, string | string[]>): DiscoveryStyleId[] {
  const petals: DiscoveryStyleId[] = [];
  for (const q of FOUNDATION_QUESTIONS) {
    const raw = answers[q.id] || answers[String(q.id)];
    if (!raw) continue;
    for (const opt of Array.isArray(raw) ? raw : [raw]) {
      for (const style of STYLE_MAPPING_CONFIG[q.id]?.[opt] || []) petals.push(style);
    }
  }
  return petals;
}
