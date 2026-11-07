import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseBrief, renderBrief } from './familyBrief.ts';
import { buildBrief } from '../src/services/brief.ts';
import { DEMO_HOUSEHOLD, DEMO_MEMBERS, DEMO_RESPONSES } from '../src/data/demoFamily.ts';

test('parseBrief rejects briefs without members', () => {
  assert.equal(parseBrief(null), null);
  assert.equal(parseBrief({ householdName: 'x', members: [] }), null);
});

test('parseBrief trims oversized and unexpected input', () => {
  const brief = parseBrief({
    householdName: 'A'.repeat(500),
    members: Array.from({ length: 30 }, (_, i) => ({ name: `M${i}`, role: 'Other', foundation: 'yes please', advanced: [{ q: 'Q', a: 'B'.repeat(5000) }] })),
  });
  assert.ok(brief);
  assert.equal(brief.householdName.length, 60);
  assert.equal(brief.members.length, 12);
  assert.equal(brief.members[0].foundation, 'not started');
  assert.equal(brief.members[0].advanced?.[0].a.length, 600);
});

test('the demo family brief round-trips with question text and styles', () => {
  const client = buildBrief(DEMO_HOUSEHOLD.name, DEMO_MEMBERS, DEMO_RESPONSES, 'demo_maya');
  const brief = parseBrief(JSON.parse(JSON.stringify(client)));
  assert.ok(brief);
  assert.equal(brief.asker, 'Maya');
  const text = renderBrief(brief);
  assert.match(text, /## Maya \(role in the family: Student/);
  assert.match(text, /Top style: Explorer \(Dandelion\)\. Second style: Creator \(Poppy\)\./);
  assert.match(text, /When you have a completely free afternoon to recharge/);
  assert.match(text, /## Leo \(role in the family: Brother\)\nFoundation discovery: not answered yet\./);
});
