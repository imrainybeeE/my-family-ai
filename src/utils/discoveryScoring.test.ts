import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scoreDiscoveryProfile } from './discoveryScoring';
import { FOUNDATION_QUESTIONS } from '../data/foundationQuestions';

test('scoreDiscoveryProfile correctly identifies Explorer as primary style', () => {
  // Select explorer-mapped option for all questions
  const answers: Record<number, string> = {};
  for (const q of FOUNDATION_QUESTIONS) {
    // Pick the first option which maps to Explorer
    answers[q.id] = q.options[0];
  }

  const result = scoreDiscoveryProfile(answers);
  assert.equal(result.primaryStyle, 'Explorer');
  assert.ok(result.scores.Explorer > 0);
  assert.notEqual(result.secondaryStyle, null);
  assert.ok(result.completedAt);
});

test('scoreDiscoveryProfile handles multi-select and ties', () => {
  const answers = {
    1: 'Drawing, building, tinkering, or working on an open project', // Creator
    2: 'Making music, crafting, coding, or writing ideas down', // Creator
    3: [
      'A rush of creative inspiration hits and I want to make things', // Creator
      'I feel warm and eager to see my favorite people again', // Connector
    ],
    4: 'Whatever meal brings the whole family around the table together', // Connector
    5: 'Chatting with everyone while keeping company and setting the table', // Connector
  };

  const result = scoreDiscoveryProfile(answers);
  assert.equal(result.primaryStyle, 'Creator');
  assert.equal(result.secondaryStyle, 'Connector');
  assert.equal(result.scores.Creator, 3);
  assert.equal(result.scores.Connector, 3); // tie-breaker picks earlier in ALL_DISCOVERY_STYLES (Creator then Connector)
});

test('scoreDiscoveryProfile handles empty or partial answers safely', () => {
  const emptyResult = scoreDiscoveryProfile({});
  assert.ok(emptyResult.primaryStyle);
  assert.ok(emptyResult.secondaryStyle);
  assert.equal(emptyResult.scores.Explorer, 0);
  assert.equal(emptyResult.scores.Creator, 0);
});
