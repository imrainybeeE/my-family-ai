import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mergeAnswers, rollbackAnswers, uniqueNames } from './member';

test('uniqueNames numbers repeated names so two unnamed grandparents stay distinct', () => {
  const names = uniqueNames([
    { id: 'a', role: 'Grandparent' },
    { id: 'b', role: 'Mum', nickname: 'Mum' },
    { id: 'c', role: 'Grandparent' },
    { id: 'd', role: 'Other', nickname: 'grandparent' },
  ]);
  assert.deepEqual([...names.values()], ['Grandparent', 'Mum', 'Grandparent 2', 'grandparent 3']);
});

test('mergeAnswers keeps other parts of the answers and drops cleared keys', () => {
  const existing = { favoriteCuisines: ['Curry & Rice'], foundationAnswers: { '1': 'x' }, bloomNote: { headline: 'h', note: 'n', tryThis: 't', forProfileAt: 'p' } };
  const merged = mergeAnswers(existing, { movieGenres: ['Comedy & Laughs'], bloomNote: undefined });
  assert.deepEqual(merged.foundationAnswers, { '1': 'x' });
  assert.deepEqual(merged.favoriteCuisines, ['Curry & Rice']);
  assert.deepEqual(merged.movieGenres, ['Comedy & Laughs']);
  assert.equal('bloomNote' in merged, false);
});

test('rollbackAnswers restores the previous answers after a failed save', () => {
  const previous = { favoriteCuisines: ['Pizza & Italian'] };
  const failed = mergeAnswers(previous, { foundationAnswers: { '1': 'x' } });
  const rolled = rollbackAnswers({ m1: failed, m2: {} }, 'm1', failed, previous);
  assert.equal(rolled.m1, previous);
  const fresh = rollbackAnswers({ m1: failed }, 'm1', failed, undefined);
  assert.equal('m1' in fresh, false);
});

test('rollbackAnswers leaves newer answers alone', () => {
  const failed = { favoriteCuisines: ['A'] };
  const newer = { favoriteCuisines: ['B'] };
  const current = { m1: newer };
  assert.equal(rollbackAnswers(current, 'm1', failed, undefined), current);
});
