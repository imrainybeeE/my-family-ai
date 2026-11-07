import { test } from 'node:test';
import assert from 'node:assert/strict';
import { seatRing } from './ring.ts';

const ids = (list: { id: string }[]) => list.map((p) => p.id);
const neighbours = (order: string[], a: string, b: string) => {
  const gap = Math.abs(order.indexOf(a) - order.indexOf(b));
  return gap === 1 || gap === order.length - 1;
};

test('seats people who share something side by side', () => {
  const people = ['maya', 'mum', 'dad', 'nainai', 'leo'].map((id) => ({ id }));
  const order = ids(seatRing(people, [['maya', 'nainai'], ['mum', 'nainai'], ['maya', 'dad']]));
  assert.equal(order[0], 'maya');
  assert.ok(neighbours(order, 'maya', 'nainai') && neighbours(order, 'mum', 'nainai') && neighbours(order, 'maya', 'dad'), order.join(' '));
});

test('keeps the order when there is nothing to improve', () => {
  const people = ['a', 'b', 'c', 'd'].map((id) => ({ id }));
  assert.deepEqual(ids(seatRing(people, [['a', 'b']])), ['a', 'b', 'c', 'd']);
  assert.deepEqual(ids(seatRing(people, [])), ['a', 'b', 'c', 'd']);
});
