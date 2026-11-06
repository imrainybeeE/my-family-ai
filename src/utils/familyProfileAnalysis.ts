import { HouseholdMember, MemberTasteAnswers, DiscoveryProfile, DiscoveryStyleId } from '../types';
import { FOUNDATION_QUESTIONS, DISCOVERY_STYLES_INFO } from '../data/foundationQuestions';

export interface SharedObservation {
  title: string;
  detail: string;
  membersInvolved: string[];
  iconType: 'together' | 'food' | 'movie' | 'activity' | 'support';
}

export interface DifferenceObservation {
  title: string;
  detail: string;
  membersInvolved: string[];
  positiveBridge: string;
}

export interface IdeaSuggestion {
  title: string;
  category: string;
  whyItFits: string;
  funTip: string;
}

export interface FamilyProfileReport {
  hasSufficientData: boolean;
  answeredCount: number;
  totalMembers: number;
  thingsWeEnjoyTogether: SharedObservation[];
  interestingDifferences: DifferenceObservation[];
  ideasWorthTrying: IdeaSuggestion[];
  stylesRepresented: { style: DiscoveryStyleId; memberCount: number; memberNames: string[] }[];
}

export interface IndividualAnswerSummary {
  category: string;
  questionId: number;
  questionText: string;
  answerText: string[];
}

export interface MemberIndividualProfile {
  member: HouseholdMember;
  hasProfile: boolean;
  discoveryProfile?: DiscoveryProfile;
  answeredCount: number;
  totalQuestions: number;
  actualAnswersSummary: IndividualAnswerSummary[];
  topTasteCuisines: string[];
  topMovieGenres: string[];
  weekendActivities: string[];
  dietaryDislikes: string[];
}

/**
 * Builds an Individual Profile for a given household member,
 * summarizing ONLY what that person actually answered.
 */
export function buildIndividualProfile(
  member: HouseholdMember,
  answers?: MemberTasteAnswers
): MemberIndividualProfile {
  const foundationAnswers = answers?.foundationAnswers || {};
  const actualAnswersSummary: IndividualAnswerSummary[] = [];

  for (const q of FOUNDATION_QUESTIONS) {
    const rawVal = foundationAnswers[q.id] || foundationAnswers[String(q.id)];
    if (rawVal) {
      const arr = Array.isArray(rawVal) ? rawVal : [rawVal];
      if (arr.length > 0) {
        actualAnswersSummary.push({
          category: q.section,
          questionId: q.id,
          questionText: q.question,
          answerText: arr,
        });
      }
    }
  }

  const hasProfile = Boolean(answers?.discoveryProfile);

  return {
    member,
    hasProfile,
    discoveryProfile: answers?.discoveryProfile,
    answeredCount: actualAnswersSummary.length,
    totalQuestions: FOUNDATION_QUESTIONS.length,
    actualAnswersSummary,
    topTasteCuisines: answers?.favoriteCuisines || [],
    topMovieGenres: answers?.movieGenres || [],
    weekendActivities: answers?.weekendActivities || [],
    dietaryDislikes: answers?.foodDislikes || [],
  };
}

/**
 * Generates the Family Profile ("Meet My Family") showing:
 * 1. "Things We Enjoy Together"
 * 2. "Interesting Differences"
 * 3. "Ideas Worth Trying"
 *
 * Adheres strictly to non-diagnostic framing, prefixing with "Based on the answers provided...",
 * and celebrating complementary styles without ranking.
 */
export function generateFamilyProfileReport(
  members: HouseholdMember[],
  responses: Record<string, MemberTasteAnswers>
): FamilyProfileReport {
  const answeredMembers = members.filter((m) => {
    const r = responses[m.id];
    return Boolean(
      r?.discoveryProfile ||
      r?.foundationAnswers ||
      r?.favoriteCuisines?.length ||
      r?.movieGenres?.length
    );
  });

  const totalMembers = members.length;
  const answeredCount = answeredMembers.length;
  const hasSufficientData = answeredCount >= 1;

  const thingsWeEnjoyTogether: SharedObservation[] = [];
  const interestingDifferences: DifferenceObservation[] = [];
  const ideasWorthTrying: IdeaSuggestion[] = [];

  // Tally styles across household
  const styleTally: Record<DiscoveryStyleId, string[]> = {
    Explorer: [],
    Creator: [],
    Connector: [],
    Achiever: [],
    Chiller: [],
    Thinker: [],
  };

  for (const m of answeredMembers) {
    const profile = responses[m.id]?.discoveryProfile;
    const name = m.nickname || m.role;
    if (profile) {
      styleTally[profile.primaryStyle].push(name);
      if (profile.secondaryStyle !== profile.primaryStyle) {
        styleTally[profile.secondaryStyle].push(name);
      }
    }
  }

  const stylesRepresented = (Object.keys(styleTally) as DiscoveryStyleId[])
    .filter((st) => styleTally[st].length > 0)
    .map((st) => ({
      style: st,
      memberCount: styleTally[st].length,
      memberNames: styleTally[st],
    }));

  // 1. THINGS WE ENJOY TOGETHER
  // Check for shared styles
  for (const st of Object.keys(styleTally) as DiscoveryStyleId[]) {
    const names = styleTally[st];
    if (names.length >= 2) {
      const styleInfo = DISCOVERY_STYLES_INFO[st];
      thingsWeEnjoyTogether.push({
        title: `Shared ${styleInfo.title} Energy`,
        detail: `Based on the answers provided... ${names.join(' and ')} both share the ${st} style: ${styleInfo.positiveDescription}`,
        membersInvolved: names,
        iconType: 'together',
      });
    }
  }

  // Check for shared cuisines
  const cuisineVotes: Record<string, string[]> = {};
  for (const m of answeredMembers) {
    const cuisines = responses[m.id]?.favoriteCuisines || [];
    const name = m.nickname || m.role;
    for (const c of cuisines) {
      if (!cuisineVotes[c]) cuisineVotes[c] = [];
      cuisineVotes[c].push(name);
    }
  }

  for (const [cuisine, names] of Object.entries(cuisineVotes)) {
    if (names.length >= 2) {
      thingsWeEnjoyTogether.push({
        title: `Consensus Meal: ${cuisine}`,
        detail: `Based on the answers provided... ${names.join(' and ')} all voted for ${cuisine} dinners.`,
        membersInvolved: names,
        iconType: 'food',
      });
    }
  }

  // Check for shared movie genres
  const genreVotes: Record<string, string[]> = {};
  for (const m of answeredMembers) {
    const genres = responses[m.id]?.movieGenres || [];
    const name = m.nickname || m.role;
    for (const g of genres) {
      if (!genreVotes[g]) genreVotes[g] = [];
      genreVotes[g].push(name);
    }
  }

  for (const [genre, names] of Object.entries(genreVotes)) {
    if (names.length >= 2) {
      thingsWeEnjoyTogether.push({
        title: `Shared Screen Taste: ${genre}`,
        detail: `Based on the answers provided... ${names.join(' and ')} enjoy ${genre} stories when gathering around the screen.`,
        membersInvolved: names,
        iconType: 'movie',
      });
    }
  }

  // Check for shared weekend activities
  const activityVotes: Record<string, string[]> = {};
  for (const m of answeredMembers) {
    const acts = responses[m.id]?.weekendActivities || [];
    const name = m.nickname || m.role;
    for (const a of acts) {
      if (!activityVotes[a]) activityVotes[a] = [];
      activityVotes[a].push(name);
    }
  }

  for (const [act, names] of Object.entries(activityVotes)) {
    if (names.length >= 2) {
      thingsWeEnjoyTogether.push({
        title: `Common Activity: ${act}`,
        detail: `Based on the answers provided... ${names.join(' and ')} enjoy ${act.toLowerCase()} for weekend downtime.`,
        membersInvolved: names,
        iconType: 'activity',
      });
    }
  }

  // Baseline if single member or no multi-member overlap yet
  if (thingsWeEnjoyTogether.length === 0) {
    if (answeredCount === 1) {
      const firstM = answeredMembers[0];
      const mName = firstM.nickname || firstM.role;
      const mProfile = responses[firstM.id]?.discoveryProfile;
      thingsWeEnjoyTogether.push({
        title: `First Profile: ${mName}`,
        detail: `Based on the answers provided so far by ${mName}${
          mProfile ? ` (${mProfile.primaryStyle} & ${mProfile.secondaryStyle})` : ''
        }, once more members answer, shared household matches will appear here.`,
        membersInvolved: [mName],
        iconType: 'together',
      });
    } else {
      thingsWeEnjoyTogether.push({
        title: 'Household Common Ground Awaits',
        detail: 'Based on the answers provided, complete more questionnaire sections across family phones to discover common favorite moments.',
        membersInvolved: [],
        iconType: 'together',
      });
    }
  }

  // 2. INTERESTING DIFFERENCES
  if (answeredMembers.length >= 2) {
    for (let i = 0; i < answeredMembers.length; i++) {
      for (let j = i + 1; j < answeredMembers.length; j++) {
        const m1 = answeredMembers[i];
        const m2 = answeredMembers[j];
        const name1 = m1.nickname || m1.role;
        const name2 = m2.nickname || m2.role;

        const p1 = responses[m1.id]?.discoveryProfile;
        const p2 = responses[m2.id]?.discoveryProfile;

        if (p1 && p2 && p1.primaryStyle !== p2.primaryStyle) {
          interestingDifferences.push({
            title: `Recharge Vibe: The ${p1.primaryStyle} & The ${p2.primaryStyle}`,
            detail: `Based on the answers provided... ${name1} leans toward ${p1.primaryStyle.toLowerCase()} experiences, while ${name2} gravitates toward ${p2.primaryStyle.toLowerCase()} moments.`,
            membersInvolved: [name1, name2],
            positiveBridge: `This gives your living room great balance: one person brings fresh ideas or outdoor momentum, while the other keeps things grounded and cozy.`,
          });
        }

        // Dietary contrasts
        const dislikes1 = responses[m1.id]?.foodDislikes || [];
        const dislikes2 = responses[m2.id]?.foodDislikes || [];
        if (dislikes1.length > 0 && dislikes2.length > 0 && dislikes1[0] !== dislikes2[0]) {
          interestingDifferences.push({
            title: `Kitchen Preferences`,
            detail: `Based on the answers provided... ${name1} avoids ${dislikes1.join(', ')}, while ${name2} is sensitive to ${dislikes2.join(', ')}.`,
            membersInvolved: [name1, name2],
            positiveBridge: `Customizable meals like taco bars or DIY personal pizzas satisfy both preferences effortlessly.`,
          });
        }
      }
    }
  }

  if (interestingDifferences.length === 0) {
    interestingDifferences.push({
      title: 'Diverse Perspectives Welcome',
      detail: 'Based on the answers provided... having different styles is a natural strength in any family. Different preferences keep weekends versatile and fresh.',
      membersInvolved: [],
      positiveBridge: 'When members have different recharge styles, alternate between quiet lounge afternoons and active family outings.',
    });
  }

  // 3. IDEAS WORTH TRYING
  // Tailored to styles represented
  const hasExplorer = styleTally.Explorer.length > 0;
  const hasCreator = styleTally.Creator.length > 0;
  const hasConnector = styleTally.Connector.length > 0;
  const hasChiller = styleTally.Chiller.length > 0;
  const hasThinker = styleTally.Thinker.length > 0;
  const hasAchiever = styleTally.Achiever.length > 0;

  if (hasExplorer && (hasChiller || hasConnector)) {
    ideasWorthTrying.push({
      title: 'Scenic Park Walk with Picnic Blankets',
      category: 'Outdoors & Rest',
      whyItFits: 'Satisfies the Explorer’s wish for fresh scenery while giving Chillers and Connectors a relaxed, low-pressure spot to lounge and chat.',
      funTip: 'Pack favorite finger foods, warm tea or lemonade, and let everyone stroll or sit as they like.',
    });
  }

  if (hasCreator || hasThinker) {
    ideasWorthTrying.push({
      title: 'Co-op Board Game or Mystery Trivia Evening',
      category: 'Creative Fun',
      whyItFits: 'Engages Thinkers with clever strategy while letting Creators enjoy narrative flair and playful twists.',
      funTip: 'Choose collaborative board games where the family works together as a team against the board.',
    });
  }

  ideasWorthTrying.push({
    title: 'Custom DIY Flatbread or Taco Station',
    category: 'Dinner Ritual',
    whyItFits: 'Based on the answers provided, customizable meals ensure everyone eats what they love without separate cooking sessions.',
    funTip: 'Put all sauces, cheeses, and toppings in ramekins on the dining table for family assemble-your-own fun.',
  });

  if (hasAchiever || hasExplorer) {
    ideasWorthTrying.push({
      title: 'Neighborhood Photo Scavenger Hunt',
      category: 'Weekend Quest',
      whyItFits: 'Provides Achievers with clear fun goals and gives Explorers spontaneous detours down streets they haven’t walked before.',
      funTip: 'Create a quick 5-item list: a bright red door, an unusual flower, a cat on a porch, a historic plaque, and a funny sign.',
    });
  }

  return {
    hasSufficientData,
    answeredCount,
    totalMembers,
    thingsWeEnjoyTogether: thingsWeEnjoyTogether.slice(0, 4),
    interestingDifferences: interestingDifferences.slice(0, 3),
    ideasWorthTrying: ideasWorthTrying.slice(0, 4),
    stylesRepresented,
  };
}
