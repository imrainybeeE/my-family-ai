import { test } from 'node:test';
import assert from 'node:assert/strict';
import { alignMembers, checkClaims, sharedPickLines, stripClaims } from './claims.ts';
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
  assert.match(issues[0].message, /names Dad/);
  assert.equal(checkClaims({ why: 'Dad avoids seafood, so skip the fish.' }, brief).length, 1);
});

test('lets true claims through', () => {
  assert.deepEqual(checkClaims({ detail: 'Mum and Nai Nai both love mysteries.' }, brief), []);
  assert.deepEqual(checkClaims({ detail: 'Mum avoids seafood.' }, brief), []);
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
