import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateCommonGround,
  filterActivitiesForActiveGroup,
} from './tasteMatching';
import { HouseholdMember } from '../types';

const mockMembers: HouseholdMember[] = [
  { id: 'm1', role: 'Me', nickname: 'Alex', avatarColor: '#3B82F6' },
  { id: 'm2', role: 'Mum', nickname: 'Sarah', avatarColor: '#10B981' },
  { id: 'm3', role: 'Brother', nickname: 'Leo', avatarColor: '#F59E0B' },
];

test('calculateCommonGround handles zero responses gracefully', () => {
  const result = calculateCommonGround(mockMembers, {});
  assert.equal(result.answeredCount, 0);
  assert.equal(result.totalMembers, 3);
  assert.equal(result.allAnswered, false);
  assert.equal(result.topCuisines.length, 0);
  assert.equal(result.topMovieGenres.length, 0);
  assert.ok(result.suggestedMovies.length > 0);
});

test('calculateCommonGround tallies shared cuisines and tracks dietary dislikes', () => {
  const responses = {
    m1: {
      favoriteCuisines: ['Pizza & Italian', 'Tacos & Mexican'],
      foodDislikes: ['Mushrooms'],
      movieGenres: ['Animation & Family', 'Comedy & Laughs'],
      weekendActivities: ['Board game & card night'],
    },
    m2: {
      favoriteCuisines: ['Tacos & Mexican', 'Asian Stir Fry & Noodles'],
      foodDislikes: ['Too spicy'],
      movieGenres: ['Comedy & Laughs'],
      weekendActivities: ['Board game & card night', 'Baking cookies / cooking a treat'],
    },
    m3: {
      favoriteCuisines: ['Tacos & Mexican', 'Pizza & Italian'],
      foodDislikes: ['None / I eat anything'],
      movieGenres: ['Animation & Family', 'Action & Adventure'],
      weekendActivities: ['Video games & party co-op'],
    },
  };

  const result = calculateCommonGround(mockMembers, responses);

  assert.equal(result.answeredCount, 3);
  assert.equal(result.allAnswered, true);

  // Tacos & Mexican should be top cuisine with 3 votes
  assert.equal(result.topCuisines[0].name, 'Tacos & Mexican');
  assert.equal(result.topCuisines[0].count, 3);

  // Pizza & Italian second with 2 votes
  assert.equal(result.topCuisines[1].name, 'Pizza & Italian');
  assert.equal(result.topCuisines[1].count, 2);

  // Dietary dislikes should exclude 'None / I eat anything'
  assert.equal(result.dietaryNotes.length, 2);
  assert.deepEqual(result.dietaryNotes, [
    { memberName: 'Alex', note: 'Mushrooms' },
    { memberName: 'Sarah', note: 'Too spicy' },
  ]);

  // Comedy & Laughs and Animation & Family each have 2 votes
  const comedy = result.topMovieGenres.find((g) => g.name === 'Comedy & Laughs');
  assert.ok(comedy);
  assert.equal(comedy.count, 2);
});

test('filterActivitiesForActiveGroup returns rank for selected sub-group', () => {
  const responses = {
    m1: {
      weekendActivities: ['Board game & card night', 'Movie marathon on the couch'],
    },
    m2: {
      weekendActivities: ['Board game & card night', 'Walk in the park or bike ride'],
    },
    m3: {
      weekendActivities: ['Video games & party co-op'],
    },
  };

  // Group of m1 and m2 only
  const filtered = filterActivitiesForActiveGroup(['m1', 'm2'], responses);
  assert.equal(filtered[0].activity, 'Board game & card night');
  assert.equal(filtered[0].matchCount, 2);
});
