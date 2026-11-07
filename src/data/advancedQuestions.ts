/**
 * Advanced Discovery question bank (teacher-provided, wording unchanged).
 * Questions with `options` show those as quick picks; every question also accepts free text.
 */
export interface AdvancedQuestion {
  id: string;
  theme: string;
  question: string;
  options?: string[];
  starters?: string[];
}

export const ADVANCED_QUESTIONS: AdvancedQuestion[] = [
  {
    id: 'a1',
    theme: 'Feeling appreciated',
    question: 'What makes you feel most appreciated by people at home?',
    starters: ['When someone notices…', 'A small thank-you for…', 'When we spend time…'],
  },
  {
    id: 'a2',
    theme: 'Support',
    question: 'When you are worried or stressed, what kind of support usually helps first?',
    starters: ['Some quiet space', 'Someone to talk to', 'A hug', 'A distraction', 'Help fixing the problem'],
  },
  {
    id: 'a3',
    theme: 'Decisions',
    question: 'When you need to make an important decision, what matters most to you?',
    starters: ['Having all the facts', 'How everyone feels', 'Following my gut', 'Advice from family'],
  },
  {
    id: 'a4',
    theme: 'Understanding',
    question: 'What is something you would like your family to understand better about how you think or feel?',
  },
  {
    id: 'a5',
    theme: 'Together time',
    question: 'What is one thing you would like the family to do more often together?',
    starters: ['Eat dinner together', 'Go outside', 'Play games', 'Cook together', 'Just talk'],
  },
  {
    id: 'a6',
    theme: 'Growing',
    question: 'What is something new you would like to learn or try in the next year?',
  },
  {
    id: 'a7',
    theme: 'Pride',
    question:
      'What type of achievement makes you feel most proud: improving yourself, helping someone, winning/recognition, creating something, solving a difficult problem, or completing a goal?',
    options: [
      'Improving myself',
      'Helping someone',
      'Winning or recognition',
      'Creating something',
      'Solving a difficult problem',
      'Completing a goal',
    ],
  },
  {
    id: 'a8',
    theme: 'Change of plans',
    question:
      'When plans suddenly change, do you usually enjoy the spontaneity, adapt after a while, or prefer a clear new plan?',
    options: ['I enjoy the spontaneity', 'I adapt after a while', 'I prefer a clear new plan'],
  },
  {
    id: 'a9',
    theme: 'Fair decisions',
    question:
      'For a family decision, what feels fairest: everyone votes, discuss until agreement, take turns choosing, or let the person most affected decide?',
    options: ['Everyone votes', 'Discuss until we agree', 'Take turns choosing', 'The person most affected decides'],
  },
  {
    id: 'a10',
    theme: 'A perfect day',
    question: 'If you could design one perfect family day, what would it include?',
  },
  {
    id: 'a11',
    theme: 'Conversation',
    question:
      'What kind of conversation do you enjoy most: funny stories, future plans, ideas, memories, current events, personal experiences, or practical matters?',
    options: [
      'Funny stories',
      'Future plans',
      'Ideas',
      'Memories',
      'Current events',
      'Personal experiences',
      'Practical matters',
    ],
  },
  {
    id: 'a12',
    theme: 'Traditions',
    question: 'What is one family tradition you enjoy, or one new tradition you would like to start?',
  },
];
