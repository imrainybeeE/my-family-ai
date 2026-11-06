import { DiscoveryStyleId, DiscoveryStyleInfo } from '../types';

export interface FoundationOptionMapping {
  optionText: string;
  styles: DiscoveryStyleId[];
}

export interface FoundationQuestion {
  id: number;
  section: string;
  question: string;
  subtitle?: string;
  isMultiSelect?: boolean;
  maxSelections?: number;
  options: string[];
}

/**
 * The 6 Foundation Discovery Sections in mandatory order:
 * 1. Free Time & Me Time
 * 2. Food
 * 3. Travel & Experiences
 * 4. Interests & Together Time
 * 5. How I Approach Things
 * 6. Family & Support
 */
export const FOUNDATION_SECTIONS = [
  'Free Time & Me Time',
  'Food',
  'Travel & Experiences',
  'Interests & Together Time',
  'How I Approach Things',
  'Family & Support',
] as const;

export type FoundationSectionName = (typeof FOUNDATION_SECTIONS)[number];

/**
 * Descriptions, recharge suggestions, and family insights for the 6 styles.
 * Strict rule: Positive, non-diagnostic, fun discovery descriptions only.
 */
export const DISCOVERY_STYLES_INFO: Record<DiscoveryStyleId, DiscoveryStyleInfo> = {
  Explorer: {
    id: 'Explorer',
    title: 'The Explorer',
    badge: 'Compass & Trail',
    color: 'text-emerald-700',
    accentBg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    borderColor: 'border-emerald-200',
    positiveDescription:
      'Curious, spontaneous, and energized by unfamiliar places, new sights, and fresh experiences.',
    weekendRecharge:
      'An impromptu bike ride down a new neighborhood path, visiting a weekend farmer’s market, or wandering a scenic nature trail.',
    familyInsight:
      'Bring the Explorer along to scout out new dinner spots, test fresh road trip routes, or break the family out of predictable weekend ruts.',
  },
  Creator: {
    id: 'Creator',
    title: 'The Creator',
    badge: 'Palette & Spark',
    color: 'text-amber-700',
    accentBg: 'bg-amber-50 text-amber-800 border-amber-200',
    borderColor: 'border-amber-200',
    positiveDescription:
      'Imaginative, expressive, and inspired to bring new ideas, art, flavors, and creative twists into the home.',
    weekendRecharge:
      'A quiet morning crafting, sketching, testing an original recipe twist, or tinkering with building materials without a strict timetable.',
    familyInsight:
      'Give the Creator room to personalize holiday decorations, suggest creative twists to family game night, or document memories with photos.',
  },
  Connector: {
    id: 'Connector',
    title: 'The Connector',
    badge: 'Heart & Hearth',
    color: 'text-rose-700',
    accentBg: 'bg-rose-50 text-rose-800 border-rose-200',
    borderColor: 'border-rose-200',
    positiveDescription:
      'Warm, empathetic, and attentive to how everyone is feeling; you thrive when the household is laughing together.',
    weekendRecharge:
      'A relaxed living room catch-up over warm drinks, sharing funny stories, or having a long unhurried phone call with someone dear.',
    familyInsight:
      'The Connector is the emotional glue of the house—turn to them when planning cozy family traditions or making sure everyone feels heard.',
  },
  Achiever: {
    id: 'Achiever',
    title: 'The Achiever',
    badge: 'Summit & Pace',
    color: 'text-indigo-700',
    accentBg: 'bg-indigo-50 text-indigo-800 border-indigo-200',
    borderColor: 'border-indigo-200',
    positiveDescription:
      'Motivated, purposeful, and energized by setting goals, mastering skills, and celebrating tangible progress.',
    weekendRecharge:
      'Knocking out an active physical workout, checking off an overdue personal project, or organizing a clean, inspiring workspace.',
    familyInsight:
      'Celebrate their milestones with genuine warmth, and lean on their natural momentum when the family needs someone to get a big task organized.',
  },
  Chiller: {
    id: 'Chiller',
    title: 'The Chiller',
    badge: 'Hammock & Breeze',
    color: 'text-sky-700',
    accentBg: 'bg-sky-50 text-sky-800 border-sky-200',
    borderColor: 'border-sky-200',
    positiveDescription:
      'Easygoing, grounded, and a comforting steady presence who protects peace and reminds everyone to breathe.',
    weekendRecharge:
      'A zero-agenda morning in soft loungewear with cozy blankets, gentle music, and no alarms or obligations.',
    familyInsight:
      'When household routines get busy and hurried, the Chiller’s peaceful presence keeps tension down and helps everyone decompress.',
  },
  Thinker: {
    id: 'Thinker',
    title: 'The Thinker',
    badge: 'Lantern & Mind',
    color: 'text-violet-700',
    accentBg: 'bg-violet-50 text-violet-800 border-violet-200',
    borderColor: 'border-violet-200',
    positiveDescription:
      'Observant, thoughtful, and endlessly fascinated by how things work, enjoying deep reflections and clever solutions.',
    weekendRecharge:
      'Diving deep into an intriguing book, documentary, or podcast series, or solving strategy puzzles and chess problems undisturbed.',
    familyInsight:
      'Ask the Thinker for their take when troubleshooting a problem or choosing strategy games—they love offering structured, clear perspective.',
  },
};

/**
 * ============================================================================
 * QUESTION BANK (Questions 1–18)
 * Organized into 6 sections in exact order (3 questions per section).
 * Uses multiple-choice and multi-select with large, mobile-friendly touch targets.
 * ============================================================================
 */
export const FOUNDATION_QUESTIONS: FoundationQuestion[] = [
  // --------------------------------------------------------------------------
  // SECTION 1: Free Time & Me Time (Questions 1–3)
  // --------------------------------------------------------------------------
  {
    id: 1,
    section: 'Free Time & Me Time',
    question: 'When you have a completely free afternoon to recharge, what sounds best?',
    subtitle: 'Pick the option that calls to you most today.',
    isMultiSelect: false,
    options: [
      'Exploring a new neighborhood, scenic trail, or local market',
      'Drawing, building, tinkering, or working on an open project',
      'Catching up with a close friend or hanging out in the living room',
      'Crushing a workout, setting personal goals, or finishing tasks',
      'Curling up with a cozy blanket, nap, or watching comfort TV',
      'Diving deep into an interesting book, podcast, or documentary',
    ],
  },
  {
    id: 2,
    section: 'Free Time & Me Time',
    question: 'What is your favorite way to spend quiet alone time at home?',
    subtitle: 'How you love to fill your solo hours.',
    isMultiSelect: false,
    options: [
      'Taking a solo wander or bike ride to see somewhere fresh',
      'Making music, crafting, coding, or writing ideas down',
      'Texting funny memes, sending voice notes, or calling someone dear',
      'Organizing my space or setting up my schedule for the week ahead',
      'Doing absolutely nothing with no alarms and zero agenda',
      'Solving puzzles, crosswords, chess, or researching rabbit holes',
    ],
  },
  {
    id: 3,
    section: 'Free Time & Me Time',
    question: 'How do you know when your personal battery is fully recharged?',
    subtitle: 'Select up to 2 feelings that best signal you are refreshed.',
    isMultiSelect: true,
    maxSelections: 2,
    options: [
      'I feel restless and ready to head out on a new adventure',
      'A rush of creative inspiration hits and I want to make things',
      'I feel warm and eager to see my favorite people again',
      'I feel energized, focused, and ready to tackle my to-do list',
      'I feel calm, peaceful, and completely unhurried',
      'My head feels clear and I am curious to learn something new',
    ],
  },

  // --------------------------------------------------------------------------
  // SECTION 2: Food (Questions 4–6)
  // --------------------------------------------------------------------------
  {
    id: 4,
    section: 'Food',
    question: 'How do you usually like to decide what to eat for dinner?',
    subtitle: 'What guides your appetite when mealtime rolls around?',
    isMultiSelect: false,
    options: [
      'Try a brand-new restaurant or an exotic cuisine we haven’t tasted',
      'Invent a new recipe or improvise with ingredients in the fridge',
      'Whatever meal brings the whole family around the table together',
      'A balanced, nourishing meal that fuels my energy and daily goals',
      'Easy comfort food that requires minimal effort or cleanup',
      'Compare reviews, ingredients, or cooking techniques before picking',
    ],
  },
  {
    id: 5,
    section: 'Food',
    question: 'When helping out around the kitchen, what role fits you naturally?',
    subtitle: 'Where you shine during meal prep.',
    isMultiSelect: false,
    options: [
      'Hunting down unique spices, sauces, or unusual ingredients',
      'Plating the dish artfully or adding custom seasoning twists',
      'Chatting with everyone while keeping company and setting the table',
      'Keeping the cooking timeline on track and prepping efficiently',
      'Taste tester and quiet dishwasher helper when the rush is over',
      'Reading the recipe method, timing steps, and measuring accurately',
    ],
  },
  {
    id: 6,
    section: 'Food',
    question: 'What sounds like your ideal weekend breakfast or brunch vibe?',
    subtitle: 'Pick the morning setting you would love most.',
    isMultiSelect: false,
    options: [
      'Discovering a hidden cafe spot on the other side of town',
      'Homemade pancake stack with fun toppings and creative coffee art',
      'A long, lively family breakfast with everyone sharing funny stories',
      'A quick protein-packed smoothie before heading out to be active',
      'Breakfast in bed or a pajama morning with warm coffee and no rush',
      'Sipping slow-drip coffee while reading weekend essays or books',
    ],
  },

  // --------------------------------------------------------------------------
  // SECTION 3: Travel & Experiences (Questions 7–9)
  // --------------------------------------------------------------------------
  {
    id: 7,
    section: 'Travel & Experiences',
    question: 'What kind of family trip or day outing excites you most?',
    subtitle: 'The kind of trip you would book right now.',
    isMultiSelect: false,
    options: [
      'An off-the-beaten-path road trip exploring unfamiliar landmarks',
      'A cultural retreat with workshops, craft markets, and art spaces',
      'A fun gathering with relatives or close friends sharing a cabin',
      'An active challenge like hiking a summit or running a 5K fun run',
      'A breezy beach or quiet countryside where no one asks for anything',
      'A historic city with museums, architecture, and walking tours',
    ],
  },
  {
    id: 8,
    section: 'Travel & Experiences',
    question: 'How do you prefer to pack and prepare for an outing?',
    subtitle: 'Your style for getting ready to leave the house.',
    isMultiSelect: false,
    options: [
      'Pack light with comfortable sneakers, ready for spontaneous detours',
      'Pack a sketchbook, camera, journal, or creative playlist',
      'Coordinate group snacks, carpool songs, and check on everyone',
      'Pack the night before with a checklist to maximize every hour',
      'Pack only cozy essentials and go with the general flow',
      'Research maps, weather forecasts, and parking tips ahead of time',
    ],
  },
  {
    id: 9,
    section: 'Travel & Experiences',
    question: 'When something unexpected changes the travel itinerary, you usually:',
    subtitle: 'How you instinctively react to sudden change of plans.',
    isMultiSelect: false,
    options: [
      'See it as an exciting detour and scout what interesting spots are nearby',
      'Find a creative alternative or turn it into a memorable story',
      'Check in on how everyone is feeling and keep spirits warm and high',
      'Quickly adapt the schedule to make sure we still reach key targets',
      'Shrug, relax, and enjoy having extra unscheduled time to lounge',
      'Analyze the options systematically to find the smartest route',
    ],
  },

  // --------------------------------------------------------------------------
  // SECTION 4: Interests & Together Time (Questions 10–12)
  // --------------------------------------------------------------------------
  {
    id: 10,
    section: 'Interests & Together Time',
    question: 'What kind of activity brings you the most joy during family time?',
    subtitle: 'Pick what creates the fondest household memories for you.',
    isMultiSelect: false,
    options: [
      'Exploring a new park, neighborhood festival, or botanical garden',
      'Collaborative craft, baking, LEGO building, or music jam session',
      'Hearty storytelling, party games, and laughing over old memories',
      'Friendly sports match, yard competition, or board game tournament',
      'Movie night in sweatpants with cozy blankets and popcorn',
      'Trivia night, strategy board games, or watching a documentary',
    ],
  },
  {
    id: 11,
    section: 'Interests & Together Time',
    question: 'When picking an evening entertainment together, what do you lean toward?',
    subtitle: 'The kind of screen or story you want to gather around.',
    isMultiSelect: false,
    options: [
      'A travel documentary, nature adventure, or globe-trotting quest',
      'An imaginative animation, fantasy world, or visually stunning film',
      'A feel-good comedy or warm story with lovable ensemble characters',
      'An inspiring true-story sports drama or underdog triumph story',
      'A soothing comfort show that is familiar, gentle, and relaxing',
      'A clever mystery, mind-bending whodunnit, or detective puzzle',
    ],
  },
  {
    id: 12,
    section: 'Interests & Together Time',
    question: 'If you could choose a one-day family workshop together, what would it be?',
    subtitle: 'A shared learning experience for the house.',
    isMultiSelect: false,
    options: [
      'Wilderness navigation, geocaching, or outdoor survival skills',
      'Pottery, woodworking, filmmaking, or creative culinary decorating',
      'Team improv comedy, storytelling, or community volunteering',
      'Mastering a sport, fitness boot camp, or personal goal sprint',
      'Mindful rest, hammock lounging, and calming sound relaxation',
      'Astronomy, coding basics, or forensic science investigation',
    ],
  },

  // --------------------------------------------------------------------------
  // SECTION 5: How I Approach Things (Questions 13–15)
  // --------------------------------------------------------------------------
  {
    id: 13,
    section: 'How I Approach Things',
    question: 'When starting a brand-new project at home or school, you first:',
    subtitle: 'Your natural first instinct when faced with something new.',
    isMultiSelect: false,
    options: [
      'Dive straight in to test things hands-on and see what happens',
      'Brainstorm unusual ideas and sketch out creative, fresh concepts',
      'Talk it over with someone to bounce thoughts and share perspectives',
      'Break it into clear milestones, deadlines, and action steps to conquer',
      'Take a deep breath and pace myself so it stays completely calm',
      'Gather facts, read the instructions, and study how it works first',
    ],
  },
  {
    id: 14,
    section: 'How I Approach Things',
    question: 'How do you like your personal space or living area to feel?',
    subtitle: 'The environment that puts your mind at ease.',
    isMultiSelect: false,
    options: [
      'Dynamic and fluid, with gear ready for spontaneous adventures',
      'Full of inspiring colors, projects-in-progress, and maker tools',
      'Warm, welcoming, and set up for people to sit down and chat',
      'Tidy, streamlined, and optimized for getting things done quickly',
      'Soft, cozy, and comfortable, with soft lighting and zero clutter',
      'Systematic and categorized, with books and notes neatly organized',
    ],
  },
  {
    id: 15,
    section: 'How I Approach Things',
    question: 'What kind of compliment feels most meaningful to hear from family?',
    subtitle: 'The kind of appreciation that lands deepest.',
    isMultiSelect: false,
    options: [
      '“You are so brave and always open to trying new things!”',
      '“You have such an original, imaginative way of thinking!”',
      '“You bring people together and make everyone feel included!”',
      '“You worked so hard and crushed your goals!”',
      '“You bring such a calming, steady peace to our home!”',
      '“You gave such thoughtful insight and figured that out!”',
    ],
  },

  // --------------------------------------------------------------------------
  // SECTION 6: Family & Support (Questions 16–18)
  // --------------------------------------------------------------------------
  {
    id: 16,
    section: 'Family & Support',
    question: 'When someone at home has had a tiring day, how do you naturally help?',
    subtitle: 'Your instinct for bringing comfort to a family member.',
    isMultiSelect: false,
    options: [
      'Offer to get them outside for a brisk walk or fresh change of scenery',
      'Make them a little homemade treat, card, or fun creative doodle',
      'Sit with them, listen attentively, and give them a warm hug',
      'Step in to take a task off their plate so their load is lighter',
      'Give them peaceful quiet space and put on comforting tea or music',
      'Help them calmly think through whatever problem is bothering them',
    ],
  },
  {
    id: 17,
    section: 'Family & Support',
    question: 'What makes you feel most supported and appreciated by your family?',
    subtitle: 'Select up to 2 that make you feel truly valued.',
    isMultiSelect: true,
    maxSelections: 2,
    options: [
      'When they cheer on my curious adventures and join me in exploring',
      'When they notice and appreciate the unique things I create',
      'When they ask how my heart is doing and spend genuine quality time',
      'When they celebrate my milestones and respect my focus',
      'When they let me rest without pressure and respect my downtime',
      'When they listen to my reasoning and value my perspective',
    ],
  },
  {
    id: 18,
    section: 'Family & Support',
    question: 'What is one family tradition or habit you value the most?',
    subtitle: 'The anchor tradition that feels like home to you.',
    isMultiSelect: false,
    options: [
      'Annual road trips or trying out new places together',
      'Holiday decorating, baking traditions, or holiday crafts',
      'Family dinner table conversations where everyone shares their day',
      'Setting family goals, cheering each other on at events or games',
      'Lazy Sunday mornings with no rush, soft music, and lounging',
      'Family game night with trivia, strategy, and deep discussions',
    ],
  },
];

/**
 * ============================================================================
 * RESERVED AREA: CUSTOM QUESTIONS (INSERT 3–5 CUSTOM QUESTIONS HERE)
 *
 * To add custom questions for your household, push questions with IDs 19–23 into
 * this array following the FoundationQuestion interface. Leave empty for now.
 * ============================================================================
 */
export const CUSTOM_FOUNDATION_QUESTIONS: FoundationQuestion[] = [
  // Example future slot:
  // {
  //   id: 19,
  //   section: 'Free Time & Me Time',
  //   question: 'Custom Question 1: What is your favorite season for family outings?',
  //   isMultiSelect: false,
  //   options: ['Spring blossoms', 'Summer beach', 'Fall foliage', 'Winter snow'],
  // },
];

/**
 * ============================================================================
 * STYLE MAPPING CONFIG OBJECT
 *
 * Maps every question option to one or more of the 6 Discovery Styles:
 * - Explorer
 * - Creator
 * - Connector
 * - Achiever
 * - Chiller
 * - Thinker
 *
 * You can edit any mapping in this clearly commented config object.
 * ============================================================================
 */
export const STYLE_MAPPING_CONFIG: Record<number, Record<string, DiscoveryStyleId[]>> = {
  // --- Section 1: Free Time & Me Time ---
  1: {
    'Exploring a new neighborhood, scenic trail, or local market': ['Explorer'],
    'Drawing, building, tinkering, or working on an open project': ['Creator'],
    'Catching up with a close friend or hanging out in the living room': ['Connector'],
    'Crushing a workout, setting personal goals, or finishing tasks': ['Achiever'],
    'Curling up with a cozy blanket, nap, or watching comfort TV': ['Chiller'],
    'Diving deep into an interesting book, podcast, or documentary': ['Thinker'],
  },
  2: {
    'Taking a solo wander or bike ride to see somewhere fresh': ['Explorer'],
    'Making music, crafting, coding, or writing ideas down': ['Creator'],
    'Texting funny memes, sending voice notes, or calling someone dear': ['Connector'],
    'Organizing my space or setting up my schedule for the week ahead': ['Achiever'],
    'Doing absolutely nothing with no alarms and zero agenda': ['Chiller'],
    'Solving puzzles, crosswords, chess, or researching rabbit holes': ['Thinker'],
  },
  3: {
    'I feel restless and ready to head out on a new adventure': ['Explorer'],
    'A rush of creative inspiration hits and I want to make things': ['Creator'],
    'I feel warm and eager to see my favorite people again': ['Connector'],
    'I feel energized, focused, and ready to tackle my to-do list': ['Achiever'],
    'I feel calm, peaceful, and completely unhurried': ['Chiller'],
    'My head feels clear and I am curious to learn something new': ['Thinker'],
  },

  // --- Section 2: Food ---
  4: {
    'Try a brand-new restaurant or an exotic cuisine we haven’t tasted': ['Explorer'],
    'Invent a new recipe or improvise with ingredients in the fridge': ['Creator'],
    'Whatever meal brings the whole family around the table together': ['Connector'],
    'A balanced, nourishing meal that fuels my energy and daily goals': ['Achiever'],
    'Easy comfort food that requires minimal effort or cleanup': ['Chiller'],
    'Compare reviews, ingredients, or cooking techniques before picking': ['Thinker'],
  },
  5: {
    'Hunting down unique spices, sauces, or unusual ingredients': ['Explorer'],
    'Plating the dish artfully or adding custom seasoning twists': ['Creator'],
    'Chatting with everyone while keeping company and setting the table': ['Connector'],
    'Keeping the cooking timeline on track and prepping efficiently': ['Achiever'],
    'Taste tester and quiet dishwasher helper when the rush is over': ['Chiller'],
    'Reading the recipe method, timing steps, and measuring accurately': ['Thinker'],
  },
  6: {
    'Discovering a hidden cafe spot on the other side of town': ['Explorer'],
    'Homemade pancake stack with fun toppings and creative coffee art': ['Creator'],
    'A long, lively family breakfast with everyone sharing funny stories': ['Connector'],
    'A quick protein-packed smoothie before heading out to be active': ['Achiever'],
    'Breakfast in bed or a pajama morning with warm coffee and no rush': ['Chiller'],
    'Sipping slow-drip coffee while reading weekend essays or books': ['Thinker'],
  },

  // --- Section 3: Travel & Experiences ---
  7: {
    'An off-the-beaten-path road trip exploring unfamiliar landmarks': ['Explorer'],
    'A cultural retreat with workshops, craft markets, and art spaces': ['Creator'],
    'A fun gathering with relatives or close friends sharing a cabin': ['Connector'],
    'An active challenge like hiking a summit or running a 5K fun run': ['Achiever'],
    'A breezy beach or quiet countryside where no one asks for anything': ['Chiller'],
    'A historic city with museums, architecture, and walking tours': ['Thinker'],
  },
  8: {
    'Pack light with comfortable sneakers, ready for spontaneous detours': ['Explorer'],
    'Pack a sketchbook, camera, journal, or creative playlist': ['Creator'],
    'Coordinate group snacks, carpool songs, and check on everyone': ['Connector'],
    'Pack the night before with a checklist to maximize every hour': ['Achiever'],
    'Pack only cozy essentials and go with the general flow': ['Chiller'],
    'Research maps, weather forecasts, and parking tips ahead of time': ['Thinker'],
  },
  9: {
    'See it as an exciting detour and scout what interesting spots are nearby': ['Explorer'],
    'Find a creative alternative or turn it into a memorable story': ['Creator'],
    'Check in on how everyone is feeling and keep spirits warm and high': ['Connector'],
    'Quickly adapt the schedule to make sure we still reach key targets': ['Achiever'],
    'Shrug, relax, and enjoy having extra unscheduled time to lounge': ['Chiller'],
    'Analyze the options systematically to find the smartest route': ['Thinker'],
  },

  // --- Section 4: Interests & Together Time ---
  10: {
    'Exploring a new park, neighborhood festival, or botanical garden': ['Explorer'],
    'Collaborative craft, baking, LEGO building, or music jam session': ['Creator'],
    'Hearty storytelling, party games, and laughing over old memories': ['Connector'],
    'Friendly sports match, yard competition, or board game tournament': ['Achiever'],
    'Movie night in sweatpants with cozy blankets and popcorn': ['Chiller'],
    'Trivia night, strategy board games, or watching a documentary': ['Thinker'],
  },
  11: {
    'A travel documentary, nature adventure, or globe-trotting quest': ['Explorer'],
    'An imaginative animation, fantasy world, or visually stunning film': ['Creator'],
    'A feel-good comedy or warm story with lovable ensemble characters': ['Connector'],
    'An inspiring true-story sports drama or underdog triumph story': ['Achiever'],
    'A soothing comfort show that is familiar, gentle, and relaxing': ['Chiller'],
    'A clever mystery, mind-bending whodunnit, or detective puzzle': ['Thinker'],
  },
  12: {
    'Wilderness navigation, geocaching, or outdoor survival skills': ['Explorer'],
    'Pottery, woodworking, filmmaking, or creative culinary decorating': ['Creator'],
    'Team improv comedy, storytelling, or community volunteering': ['Connector'],
    'Mastering a sport, fitness boot camp, or personal goal sprint': ['Achiever'],
    'Mindful rest, hammock lounging, and calming sound relaxation': ['Chiller'],
    'Astronomy, coding basics, or forensic science investigation': ['Thinker'],
  },

  // --- Section 5: How I Approach Things ---
  13: {
    'Dive straight in to test things hands-on and see what happens': ['Explorer'],
    'Brainstorm unusual ideas and sketch out creative, fresh concepts': ['Creator'],
    'Talk it over with someone to bounce thoughts and share perspectives': ['Connector'],
    'Break it into clear milestones, deadlines, and action steps to conquer': ['Achiever'],
    'Take a deep breath and pace myself so it stays completely calm': ['Chiller'],
    'Gather facts, read the instructions, and study how it works first': ['Thinker'],
  },
  14: {
    'Dynamic and fluid, with gear ready for spontaneous adventures': ['Explorer'],
    'Full of inspiring colors, projects-in-progress, and maker tools': ['Creator'],
    'Warm, welcoming, and set up for people to sit down and chat': ['Connector'],
    'Tidy, streamlined, and optimized for getting things done quickly': ['Achiever'],
    'Soft, cozy, and comfortable, with soft lighting and zero clutter': ['Chiller'],
    'Systematic and categorized, with books and notes neatly organized': ['Thinker'],
  },
  15: {
    '“You are so brave and always open to trying new things!”': ['Explorer'],
    '“You have such an original, imaginative way of thinking!”': ['Creator'],
    '“You bring people together and make everyone feel included!”': ['Connector'],
    '“You worked so hard and crushed your goals!”': ['Achiever'],
    '“You bring such a calming, steady peace to our home!”': ['Chiller'],
    '“You gave such thoughtful insight and figured that out!”': ['Thinker'],
  },

  // --- Section 6: Family & Support ---
  16: {
    'Offer to get them outside for a brisk walk or fresh change of scenery': ['Explorer'],
    'Make them a little homemade treat, card, or fun creative doodle': ['Creator'],
    'Sit with them, listen attentively, and give them a warm hug': ['Connector'],
    'Step in to take a task off their plate so their load is lighter': ['Achiever'],
    'Give them peaceful quiet space and put on comforting tea or music': ['Chiller'],
    'Help them calmly think through whatever problem is bothering them': ['Thinker'],
  },
  17: {
    'When they cheer on my curious adventures and join me in exploring': ['Explorer'],
    'When they notice and appreciate the unique things I create': ['Creator'],
    'When they ask how my heart is doing and spend genuine quality time': ['Connector'],
    'When they celebrate my milestones and respect my focus': ['Achiever'],
    'When they let me rest without pressure and respect my downtime': ['Chiller'],
    'When they listen to my reasoning and value my perspective': ['Thinker'],
  },
  18: {
    'Annual road trips or trying out new places together': ['Explorer'],
    'Holiday decorating, baking traditions, or holiday crafts': ['Creator'],
    'Family dinner table conversations where everyone shares their day': ['Connector'],
    'Setting family goals, cheering each other on at events or games': ['Achiever'],
    'Lazy Sunday mornings with no rush, soft music, and lounging': ['Chiller'],
    'Family game night with trivia, strategy, and deep discussions': ['Thinker'],
  },
};
