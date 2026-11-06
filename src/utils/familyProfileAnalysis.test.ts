import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  generateFamilyProfileReport,
  buildIndividualProfile,
} from './familyProfileAnalysis';
import { HouseholdMember, MemberTasteAnswers } from '../types';

const mockMembers: HouseholdMember[] = [
  { id: 'm1', role: 'Me', nickname: 'Alex', avatarColor: '#6366f1' },
  { id: 'm2', role: 'Mum', nickname: 'Sarah', avatarColor: '#ec4899' },
];

const mockResponses: Record<string, MemberTasteAnswers> = {
  m1: {
    favoriteCuisines: ['Pizza & Italian', 'Tacos & Mexican'],
    movieGenres: ['Animation & Family'],
    weekendActivities: ['Board game & card night'],
    foodDislikes: ['Too spicy'],
    foundationAnswers: {
      1: 'Exploring a new neighborhood, scenic trail, or local market',
      2: 'Taking a solo wander or bike ride to see somewhere fresh',
    },
    discoveryProfile: {
      primaryStyle: 'Explorer',
      secondaryStyle: 'Creator',
      scores: { Explorer: 5, Creator: 3, Connector: 2, Achiever: 1, Chiller: 1, Thinker: 1 },
      completedAt: new Date().toISOString(),
    },
  },
  m2: {
    favoriteCuisines: ['Pizza & Italian', 'Healthy Bowls & Salads'],
    movieGenres: ['Animation & Family', 'Mystery & Whodunnit'],
    weekendActivities: ['Board game & card night', 'Walk in the park or bike ride'],
    foodDislikes: ['Seafood / Fish'],
    foundationAnswers: {
      1: 'Curling up with a cozy blanket, nap, or watching comfort TV',
      2: 'Doing absolutely nothing with no alarms and zero agenda',
    },
    discoveryProfile: {
      primaryStyle: 'Chiller',
      secondaryStyle: 'Connector',
      scores: { Explorer: 1, Creator: 2, Connector: 4, Achiever: 1, Chiller: 6, Thinker: 1 },
      completedAt: new Date().toISOString(),
    },
  },
};

test('buildIndividualProfile accurately summarizes only what the person answered', () => {
  const profile = buildIndividualProfile(mockMembers[0], mockResponses.m1);
  assert.equal(profile.member.id, 'm1');
  assert.equal(profile.hasProfile, true);
  assert.equal(profile.discoveryProfile?.primaryStyle, 'Explorer');
  assert.equal(profile.discoveryProfile?.secondaryStyle, 'Creator');
  assert.ok(profile.actualAnswersSummary.length >= 2);
  assert.ok(profile.topTasteCuisines.includes('Pizza & Italian'));
});

test('generateFamilyProfileReport creates Things We Enjoy Together, Interesting Differences, and Ideas Worth Trying', () => {
  const report = generateFamilyProfileReport(mockMembers, mockResponses);
  assert.equal(report.hasSufficientData, true);
  assert.equal(report.answeredCount, 2);

  // Check section 1: Things We Enjoy Together
  assert.ok(report.thingsWeEnjoyTogether.length > 0);
  const pizzaConsensus = report.thingsWeEnjoyTogether.find((t) => t.title.includes('Pizza & Italian'));
  assert.ok(pizzaConsensus);
  assert.ok(pizzaConsensus.detail.startsWith('Based on the answers provided...'));

  // Check section 2: Interesting Differences
  assert.ok(report.interestingDifferences.length > 0);
  const diff = report.interestingDifferences[0];
  assert.ok(diff.detail.startsWith('Based on the answers provided...'));
  assert.ok(diff.positiveBridge);

  // Check section 3: Ideas Worth Trying
  assert.ok(report.ideasWorthTrying.length > 0);
  assert.ok(report.ideasWorthTrying[0].title);
  assert.ok(report.ideasWorthTrying[0].funTip);
});

test('generateFamilyProfileReport handles empty or single member safely', () => {
  const emptyReport = generateFamilyProfileReport(mockMembers, {});
  assert.equal(emptyReport.hasSufficientData, false);
  assert.ok(emptyReport.thingsWeEnjoyTogether.length > 0);
  assert.ok(emptyReport.ideasWorthTrying.length > 0);
});
