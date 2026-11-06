import { test } from 'node:test';
import assert from 'node:assert/strict';
import { breaksSetting, settingOf } from './ai.ts';

test('reads where the family chose to eat', () => {
  assert.equal(settingOf('Order take-out'), 'takeout');
  assert.equal(settingOf('Eat at home'), 'home');
  assert.equal(settingOf('Cook together'), 'home');
  assert.equal(settingOf('Go out to eat'), 'out');
  assert.equal(settingOf('Under $20'), null);
});

test('rejects ideas that ignore that choice', () => {
  assert.deepEqual(breaksSetting('Taco night. Order tacos from a nearby place for delivery.', 'takeout'), []);
  assert.equal(breaksSetting('Build your own tacos. Set out fillings at home.', 'takeout').length, 1);
  assert.equal(breaksSetting('Dim sum. Try a dim sum restaurant.', 'home').length, 1);
  assert.deepEqual(breaksSetting('Curry night. Cook a big pot together.', 'home'), []);
  assert.equal(breaksSetting('Pizza night. Bake pizzas in the kitchen.', 'out').length, 1);
});
