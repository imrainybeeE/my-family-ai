import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sharedOnly, alignMembers, awkwardAsk, checkClaims, headlineFor, paddedQuestion, restates, vagueDetail, sharedHeadline, sharedPickLines, sharesTopic, stem, stripClaims } from './claims.ts';
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
  assert.equal(checkClaims({ picks: [{ n: 1, fit: 'Dad picked tacos, so this suits him.', members: ['Dad'] }] }, brief).length, 1, 'real-pick fit lines are checked');
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

test('reads a row detail with its title, and checks "everyone" beside names', () => {
  assert.equal(checkClaims({ together: [{ title: 'Mystery shows', detail: 'Maya and Dad both picked this.', members: [] }] }, brief).length, 1);
  assert.deepEqual(checkClaims({ together: [{ title: 'Mystery shows', detail: 'Mum and Nai Nai both picked this.', members: [] }] }, brief), []);
  assert.equal(checkClaims({ answer: 'Mum and everyone love curry and rice.' }, brief).length, 1);
});

test('a shared name is not a shared topic', () => {
  assert.equal(sharesTopic('Maya and Dad enjoy park walks', 'Asian stir fry. Maya and Nai Nai both picked this.', ['Maya', 'Dad', 'Nai Nai']), false);
  assert.equal(sharesTopic('Maya and Nai Nai love stir fry', 'Asian stir fry', ['Maya', 'Nai Nai']), true);
});

test('a shared row is pinned to one pick two people share', () => {
  const brief = {
    householdName: 'The Tans',
    asker: 'Maya',
    members: [
      { name: 'Mum', tastes: [{ q: 'Favourite food', a: ['Curry & Rice'] }] },
      { name: 'Dad', tastes: [{ q: 'Favourite food', a: ['Pizza & Italian'] }] },
      { name: 'Nai Nai', tastes: [{ q: 'Favourite food', a: ['Curry & Rice'] }] },
    ],
  } as never;
  const out = sharedOnly({ headline: 'x', together: [{ title: 'Curry and pizza', detail: '', members: ['Mum', 'Dad'] }], ideas: [] }, brief);
  assert.deepEqual(out.together[0].members, ['Mum', 'Nai Nai']);
  const none = sharedOnly({ headline: 'x', together: [{ title: 'Pizza nights', detail: '', members: ['Dad', 'Mum'] }], ideas: [{ members: ['Dad'] }] }, brief);
  assert.deepEqual(none.together, []);
  assert.equal(none.headline, 'No shared picks yet');
  assert.deepEqual(none.ideas, []);
});

test('headlineFor names two people, and counts them when names run long', () => {
  assert.equal(headlineFor('Asian stir fry', ['Maya', 'Nai Nai']), 'Maya and Nai Nai both like Asian stir fry');
  assert.equal(headlineFor('Park walks', ['Maya', 'Dad']), 'Maya and Dad both like park walks');
  const long = headlineFor('Mystery films and shows', ['Grandma Rosalind', 'Uncle Bartholomew', 'Maximilian']);
  assert.equal(long, 'Three people like mystery films and shows');
});

test('restates spots a line that only repeats its title', () => {
  assert.equal(restates('Mum and Nai Nai both like baking cookies.', 'Baking cookies', ['Mum', 'Nai Nai']), true);
  assert.equal(restates('Mum and Nai Nai want to learn dumpling-folding.', 'Make dumplings', ['Mum', 'Nai Nai']), false);
});

test('writing checks catch filler, padding and awkward asks', () => {
  assert.equal(vagueDetail('Mum measures the precise ingredients while everyone helps around the table.'), true);
  assert.equal(vagueDetail('Mum measures the rice while Nai Nai chops carrots for the curry.'), false);
  assert.equal(paddedQuestion('Where should we go explore together next?'), true);
  assert.equal(paddedQuestion('Which new place should we explore?'), false);
  assert.equal(awkwardAsk('What baking should Mum and Nai Nai make?'), true);
  assert.equal(awkwardAsk('What could Mum and Nai Nai bake?'), false);
});

test('a question ending in "together" or "next" is padded', () => {
  assert.equal(paddedQuestion('Which new park or market should we explore next?'), true);
  assert.equal(paddedQuestion('Which new park or market should we explore together?'), true);
  assert.equal(paddedQuestion('What should we cook together on Sunday?'), false);
  assert.equal(vagueDetail('Dad preps the grill while the family gathers around the table together.'), true);
});

test('"next" at the end of a question is padding', () => {
  assert.equal(paddedQuestion('Which mystery show or film should we watch next?'), true);
});

test('a real pick with a false fit line keeps its place and loses the line', () => {
  const reply = { picks: [{ n: 1, fit: 'Dad picked tacos.', members: ['Dad'] }] };
  const kept = stripClaims(reply, checkClaims(reply, brief), { fit: ' ' });
  assert.equal(kept.picks.length, 1);
  assert.equal(kept.picks[0].fit.trim(), '');
});
