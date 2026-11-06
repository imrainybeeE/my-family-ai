import { FOUNDATION_QUESTIONS } from './foundationQuestions';
import { STYLE_ORDER } from './flowers';
import { scoreDiscoveryProfile } from '../utils/discoveryScoring';
import { DiscoveryStyleId, Household, HouseholdMember, MemberTasteAnswers } from '../types';

/**
 * A sample household for exploring the app without creating data, and for screenshots
 * (the brief asks for assessment evidence to use sample data, never a real family's answers).
 * Nothing in demo mode is written to the database.
 */
export const DEMO_CODE = 'AX-TAN-2026';

const at = '2026-11-01T10:00:00.000Z';

export const DEMO_HOUSEHOLD: Household = {
  code: DEMO_CODE,
  name: 'The Tan family',
  createdBy: 'demo',
  createdAt: at,
  memberCount: 5,
};

export const DEMO_MEMBERS: HouseholdMember[] = [
  { id: 'demo_maya', role: 'Me', nickname: 'Maya', avatarColor: '#3f8fc0', createdAt: at },
  { id: 'demo_mum', role: 'Mum', nickname: 'Mum', avatarColor: '#e0628f', createdAt: at },
  { id: 'demo_dad', role: 'Dad', nickname: 'Dad', avatarColor: '#c99400', createdAt: at },
  { id: 'demo_nainai', role: 'Grandparent', nickname: 'Nai Nai', avatarColor: '#7d63d6', createdAt: at },
  { id: 'demo_leo', role: 'Brother', nickname: 'Leo', avatarColor: '#d8402a', createdAt: at },
];

/** Picks one option per question following a pattern of styles (options are listed in style order). */
function answersFor(pattern: DiscoveryStyleId[], multiExtra: DiscoveryStyleId): Record<string, string | string[]> {
  const out: Record<string, string | string[]> = {};
  FOUNDATION_QUESTIONS.forEach((q, i) => {
    const style = pattern[i % pattern.length];
    const pick = q.options[STYLE_ORDER.indexOf(style)];
    if (q.isMultiSelect) {
      const extra = q.options[STYLE_ORDER.indexOf(multiExtra === style ? pattern[(i + 1) % pattern.length] : multiExtra)];
      out[String(q.id)] = [pick, extra];
    } else {
      out[String(q.id)] = pick;
    }
  });
  return out;
}

function advanced(entries: Record<string, string | [string, string, string]>) {
  const out: NonNullable<MemberTasteAnswers['advancedAnswers']> = {};
  for (const [id, value] of Object.entries(entries)) {
    if (Array.isArray(value)) {
      out[id] = { answer: value[0], followUpQuestion: value[1], followUpAnswer: value[2], answeredAt: at };
    } else {
      out[id] = { answer: value, answeredAt: at };
    }
  }
  return out;
}

function withProfile(answers: MemberTasteAnswers): MemberTasteAnswers {
  if (!answers.foundationAnswers) return answers;
  return { ...answers, discoveryProfile: { ...scoreDiscoveryProfile(answers.foundationAnswers), completedAt: at } };
}

const E: DiscoveryStyleId = 'Explorer';
const Cr: DiscoveryStyleId = 'Creator';
const Co: DiscoveryStyleId = 'Connector';
const A: DiscoveryStyleId = 'Achiever';
const Ch: DiscoveryStyleId = 'Chiller';
const T: DiscoveryStyleId = 'Thinker';

export const DEMO_RESPONSES: Record<string, MemberTasteAnswers> = {
  demo_maya: withProfile({
    foundationAnswers: answersFor([E, Cr, E, Co, E, Cr, E, Cr, E], Cr),
    favoriteCuisines: ['Tacos & Mexican', 'Asian Stir Fry & Noodles'],
    foodDislikes: ['Mushrooms'],
    movieGenres: ['Animation & Family', 'Fantasy & Magic'],
    movieVibe: 'Exciting & fast-paced',
    weekendActivities: ['Walk in the park or bike ride', 'Video games & party co-op'],
    energyLevel: 'Active & playful',
    snackPreference: 'Chips & salsa or dip',
    advancedAnswers: advanced({
      a5: ['Go somewhere we have never been, even just a new park', 'What makes a new place fun for you?', 'Finding a hidden spot nobody else noticed'],
      a6: 'Learn to film and edit short videos',
      a8: 'I enjoy the spontaneity',
      a11: 'Funny stories',
    }),
  }),
  demo_mum: withProfile({
    foundationAnswers: answersFor([Co, T, Co, Co, T, Co, Cr, Co, T], T),
    favoriteCuisines: ['Curry & Rice', 'Healthy Bowls & Salads'],
    foodDislikes: ['Seafood / Fish'],
    movieGenres: ['Comedy & Laughs', 'Mystery & Whodunnit'],
    movieVibe: 'Warm & cozy',
    weekendActivities: ['Board game & card night', 'Baking cookies / cooking a treat'],
    energyLevel: 'Creative & hands-on',
    snackPreference: 'Fresh fruit & smoothies',
    advancedAnswers: advanced({
      a1: 'When someone notices the little things I do and says thanks',
      a2: 'Someone to talk to, then a cup of tea',
      a3: 'How everyone in the family will feel about it',
      a4: 'That I like quiet evenings too, not only busy weekends',
      a5: 'Eat dinner together without phones',
      a6: 'Learn to make proper dumplings with Nai Nai',
      a7: 'Helping someone',
      a8: 'I adapt after a while',
      a9: 'Discuss until we agree',
      a10: 'A slow breakfast, a walk by the water, and a board game after dinner',
      a11: 'Memories',
      a12: 'Sunday dumpling-folding with everyone',
    }),
    advancedCompletedAt: at,
  }),
  demo_dad: withProfile({
    foundationAnswers: answersFor([A, Ch, A, A, E, A, Ch, A, Co], Ch),
    favoriteCuisines: ['BBQ & Grilling', 'Pizza & Italian'],
    foodDislikes: ['Cilantro'],
    movieGenres: ['Sports & Underdogs', 'Action & Adventure'],
    movieVibe: 'Exciting & fast-paced',
    weekendActivities: ['Walk in the park or bike ride', 'Movie marathon on the couch'],
    energyLevel: 'Active & playful',
    snackPreference: 'Popcorn & salty pretzels',
  }),
  demo_nainai: withProfile({
    foundationAnswers: answersFor([Ch, T, Ch, Co, Ch, T, Ch, Cr, Ch], T),
    favoriteCuisines: ['Asian Stir Fry & Noodles', 'Curry & Rice'],
    foodDislikes: ['Heavy cheese / Dairy'],
    movieGenres: ['Nature & Animals', 'Mystery & Whodunnit'],
    movieVibe: 'Warm & cozy',
    weekendActivities: ['Quiet reading / creative hobbies', 'Baking cookies / cooking a treat'],
    energyLevel: 'Chill & low energy',
    snackPreference: 'Fresh fruit & smoothies',
    advancedAnswers: advanced({
      a12: 'Making dumplings together for the new year',
      a10: 'Everyone at my table, then a slow walk in the evening',
    }),
  }),
  demo_leo: {},
};

export const DEMO_ACTIVE_MEMBER = 'demo_maya';

