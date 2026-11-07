import { test } from 'node:test';
import assert from 'node:assert/strict';
import { caseTastes, dropFiller, sentenceCase, tidyChatLine, youify } from './ai.ts';

const names = ['Maya', 'Mum', 'Dad', 'Nai Nai', 'Leo', 'The Tan family'];

test('lower-cases Title Case words but keeps the first word', () => {
  assert.equal(sentenceCase('Family Table Time', names), 'Family table time');
  assert.equal(sentenceCase('Mystery And Puzzles', names), 'Mystery and puzzles');
});

test('keeps family names, the surname, proper adjectives and acronyms', () => {
  assert.equal(sentenceCase('Dinner Brings The Tans Together', names), 'Dinner brings the Tans together');
  assert.equal(sentenceCase('Walks With Nai Nai', names), 'Walks with Nai Nai');
  assert.equal(sentenceCase('Asian Stir Fry Night', names), 'Asian stir fry night');
  assert.equal(sentenceCase('DIY Taco Bar', names), 'DIY taco bar');
  assert.equal(sentenceCase("Maya's Sunday Market Walk", names), "Maya's Sunday market walk");
});

test('leaves sentence case alone', () => {
  assert.equal(sentenceCase('Explore a hidden park', names), 'Explore a hidden park');
  assert.equal(sentenceCase('Pizza', names), 'Pizza');
});

test('tidies streamed chat lines: bold ideas in sentence case, British spelling', () => {
  assert.equal(tidyChatLine('- **Curry & Rice** with Nai Nai\n', names), '- **Curry and rice** with Nai Nai\n');
  assert.equal(tidyChatLine('A **Movie Night** with your favorite snacks.', names), 'A **Film night** with your favourite snacks.');
  assert.equal(tidyChatLine('Try **Walks With Nai Nai** this Sunday.', names), 'Try **Walks with Nai Nai** this Sunday.');
});

test('writes taste labels as words inside sentences', () => {
  const options = ['Asian Stir Fry & Noodles', 'Curry & Rice', 'Mystery & Whodunnit'];
  assert.equal(caseTastes('Maya and Nai Nai picked Asian Stir Fry and Noodles.', options), 'Maya and Nai Nai picked Asian stir fry and noodles.');
  assert.equal(caseTastes('Curry & Rice is Mum’s pick.', options), 'Curry and rice is Mum’s pick.');
  assert.equal(caseTastes('- Mystery & Whodunnit for Nai Nai', options), '- Mystery and whodunnit for Nai Nai');
});

test('drops decorative adjectives but keeps meaning', () => {
  assert.equal(dropFiller('Prepare a warm curry meal indoors.'), 'Prepare a curry meal indoors.');
  assert.equal(dropFiller('Cook a fragrant, warm curry with Mum.'), 'Cook a curry with Mum.');
  assert.equal(dropFiller('An amazing evening walk.'), 'An evening walk.');
  assert.equal(dropFiller('Have fun together outside.'), 'Have fun together outside.');
  assert.equal(dropFiller('Fresh fruit and smoothies.'), 'Fresh fruit and smoothies.');
});

test('re-chooses only the article in front of a removed word', () => {
  assert.equal(dropFiller('It takes an hour.'), 'It takes an hour.');
  assert.equal(dropFiller('Try a unique dish and a one-pot meal.'), 'Try a unique dish and a one-pot meal.');
  assert.equal(dropFiller('Plan A or B.'), 'Plan A or B.');
  assert.equal(dropFiller('Bake a warm apple pie.'), 'Bake an apple pie.');
  assert.equal(dropFiller('An amazing picnic.'), 'A picnic.');
});

test('calls the person asking "you"', () => {
  assert.equal(youify('Maya and Dad both enjoy walks.', 'Maya'), 'You and Dad both enjoy walks.');
  assert.equal(youify('- Nai Nai shares noodles with Maya.', 'Maya'), '- Nai Nai shares noodles with you.');
  assert.equal(youify('Maya likes tacos.', 'Maya'), 'You like tacos.');
  assert.equal(youify("Try Maya's favourite park.", 'Maya'), 'Try your favourite park.');
});

test('removes a run of adjectives before choosing the article', () => {
  assert.equal(dropFiller('Bake a warm, fragrant apple pie.'), 'Bake an apple pie.');
  assert.equal(youify('Try Maya’s favourite park.', 'Maya'), 'Try your favourite park.');
});
