import { test } from 'node:test';
import assert from 'node:assert/strict';
import { alignMembers, checkClaims, sharedHeadline, sharedPickLines, stem, stripClaims } from './claims.ts';
import { buildBrief } from '../src/services/brief.ts';
import { DEMO_HOUSEHOLD, DEMO_MEMBERS, DEMO_RESPONSES, DEMO_ACTIVE_MEMBER } from '../src/data/demoFamily.ts';

const brief = buildBrief(DEMO_HOUSEHOLD.name, DEMO_MEMBERS, DEMO_RESPONSES, DEMO_ACTIVE_MEMBER);

test('lists who shares each taste pick', () => {
  const lines = sharedPickLines(brief);
  assert.ok(lines.some((l) => l.includes('Mystery & Whodunnit') && l.endsWith('Mum, Nai Nai')), lines.join('\n'));
});

test('flags people credited with picks they did not make', () => {
  const issues = checkClaims({ together: [{ title: 'Mystery night', detail: 'Mum, Dad and Nai Nai love mysteries.', members: [] }] }, brief);
  assert.equal(issues.length, 1);
  assert.match(issues[0].message, /Dad didn't pick/);
  assert.equal(checkClaims({ why: 'Dad avoids seafood, so skip the fish.' }, brief).length, 1);
});

test('checks each person against their own claim', () => {
  assert.equal(checkClaims({ answer: 'Maya likes curry and Mum likes tacos.' }, brief).length, 1);
  assert.equal(checkClaims({ answer: 'Mum loves seafood.' }, brief).length, 1, 'Mum avoids seafood');
  assert.equal(checkClaims({ answer: 'Dad likes mysteries.' }, brief).length, 1);
  assert.equal(checkClaims({ facts: ['Asian stir fry is loved by you, Mum and Nai Nai.'] }, brief).length, 1, 'Mum did not pick stir fry');
  assert.equal(checkClaims({ headline: 'Everyone loves curry and rice.' }, brief).length, 1);
});

test('checks lists and labelled lines whole', () => {
  assert.equal(checkClaims({ known: ['Maya: curry and rice'] }, brief).length, 1);
  assert.equal(checkClaims({ answer: 'Maya likes tacos, curry and rice.' }, brief).length, 1);
  assert.equal(checkClaims({ answer: 'Maya likes curry and rice.' }, brief).length, 1);
  assert.deepEqual(checkClaims({ known: ['Maya: tacos and noodles, no mushrooms'] }, brief), []);
});

test('does not check suggestions', () => {
  assert.deepEqual(checkClaims({ ideas: ['Cook curry with Dad this weekend.'], tip: 'Ask Dad to try mysteries.' }, brief), []);
});

test('lets true claims through', () => {
  assert.deepEqual(checkClaims({ detail: 'Mum and Nai Nai both love mysteries.' }, brief), []);
  assert.deepEqual(checkClaims({ detail: 'Mum avoids seafood.' }, brief), []);
  assert.deepEqual(checkClaims({ answer: 'You and Nai Nai both love Asian stir fry and noodles.' }, brief), []);
  assert.deepEqual(checkClaims({ facts: ['Maya shares noodles with Nai Nai.'] }, brief), []);
  assert.deepEqual(checkClaims({ answer: 'Maya likes tacos, so cook curry with Mum.' }, brief), []);
  assert.deepEqual(checkClaims({ detail: 'A quiet evening for everyone.' }, brief), []);
});

test('removes a wrong sentence, or the whole row when nothing is left', () => {
  const reply = {
    together: [
      { title: 'Mysteries', detail: 'Dad and Mum love mysteries.', members: ['Dad', 'Mum'] },
      { title: 'Curry', detail: 'Mum and Nai Nai pick curry. Dad likes mysteries.', members: ['Mum', 'Nai Nai'] },
    ],
  };
  const fixed = stripClaims(reply, checkClaims(reply, brief));
  assert.equal(fixed.together.length, 1);
  assert.equal(fixed.together[0].detail, 'Mum and Nai Nai pick curry.');
});

test('narrows members to the people who made the pick', () => {
  const out = alignMembers({ together: [{ title: 'Mystery shows', detail: 'Whodunnits after dinner.', members: ['Mum', 'Dad', 'Nai Nai'] }] }, brief);
  assert.deepEqual(out.together[0].members, ['Mum', 'Nai Nai']);
});

test('replaces a false headline with a true one', () => {
  const reply = { headline: 'Asian stir fry brings the Tans together', together: [] };
  const fixed = stripClaims(reply, checkClaims(reply, brief), { headline: sharedHeadline(brief) });
  assert.equal(fixed.headline, sharedHeadline(brief));
  assert.deepEqual(checkClaims(fixed, brief), []);
  assert.match(sharedHeadline(brief), /both picked/);
});

test('matches words by stem, not by their first letters', () => {
  assert.equal(stem('mysteries'), stem('mystery'));
  assert.equal(stem('baking'), stem('bake'));
  assert.equal(stem('walks'), stem('walk'));
  assert.notEqual(stem('animation'), stem('animals'));
  assert.deepEqual(checkClaims({ answer: 'Maya likes animation while Dad prefers sports films.' }, brief), []);
});
