import { test } from 'node:test';
import assert from 'node:assert/strict';
import { breaksSetting, breaksTiming, chosenMeal, leavesChosenMeal, repeatedDishes, settingOf, timingOf } from './ai.ts';

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

test('holds ideas to the chosen time', () => {
  assert.equal(timingOf('Right now'), 'now');
  assert.equal(timingOf('This weekend'), 'weekend');
  assert.equal(breaksTiming('Curry night. A curry this evening.', 'now').length, 1);
  assert.deepEqual(breaksTiming('Noodle bowls. Quick noodles in twenty minutes.', 'now'), []);
});

test('knows staying in, outings and later plans', () => {
  assert.equal(settingOf('Stay in'), 'home');
  assert.equal(breaksSetting('Park picnic. Take a picnic to the park.', 'home').length, 1);
  assert.equal(breaksTiming('Museum tour. Visit the museum tomorrow morning.', 'now').length, 1);
});

test('ignores what an idea says it does not need, and how long it takes', () => {
  assert.deepEqual(breaksSetting('Noodle night. Cook noodles at home. No restaurant trip needed.', 'home'), []);
  assert.deepEqual(breaksTiming('Curry tonight. Cook dinner tonight. Ready in an hour.', 'tonight'), []);
  assert.equal(breaksSetting('Dim sum. Try a dim sum restaurant.', 'home').length, 1);
});

test('three plan ideas are three different dishes', () => {
  assert.deepEqual(repeatedDishes(['Asian stir fry night. Cook noodles and vegetables.', 'Curry feast. A warm curry with rice.', 'Taco bar. Build your own tacos.']), []);
  assert.deepEqual(repeatedDishes(['Noodle night. Cook noodles.', 'Big noodle bowl. A family noodle bowl.', 'Pizza. Homemade pizza.']), ['ideas.1 repeats the noodle of ideas.0; pick a different dish']);
  assert.deepEqual(repeatedDishes(['Pizza night. Homemade pizza.', 'Dumplings. Fold dumplings.', 'Tacos. Build tacos.']), []);
});

test('a negation stops at the end of its clause', () => {
  assert.equal(breaksSetting('Pizza night. No cooking needed: order delivery.', 'home').length, 1);
  assert.equal(breaksTiming('Bake together. Cook together right now.', 'weekend').length, 1);
  assert.deepEqual(breaksTiming('Rice bowls. Start the rice now, then chop the vegetables.', 'tonight'), []);
});

test('ideas stay within the meal the family chose', () => {
  const meal = chosenMeal('At home Asian stir fry');
  assert.ok(meal.includes('stir fry') && meal.includes('asian'));
  assert.deepEqual(leavesChosenMeal(['Chicken stir fry. Wok-fried chicken and peppers.', 'Tofu stir-fry. Tofu with broccoli.'], ['stir fry']), []);
  assert.equal(leavesChosenMeal(['Dumpling night. Fold dumplings.'], ['stir fry']).length, 1);
  assert.deepEqual(repeatedDishes(['Stir fry noodles. Noodles.', 'Stir fry rice. Rice.', 'Stir fry tofu. Tofu.'], ['stir fry']), []);
});
