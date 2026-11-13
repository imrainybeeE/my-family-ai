import { test } from 'node:test';
import assert from 'node:assert/strict';
import { distanceKm, firstJson, linkFor, osmCandidates, osmKind, roundCoord, validCoords, viewbox } from './real.ts';

test('coordinates are rounded to about a kilometre', () => {
  assert.equal(roundCoord(3.034232), 3.03);
  assert.equal(roundCoord(101.61703), 101.62);
  assert.ok(validCoords(3.03, 101.62));
  assert.ok(!validCoords('3', 101));
  assert.ok(!validCoords(95, 10));
});

test('a viewbox surrounds the point', () => {
  const [left, top, right, bottom] = viewbox({ lat: 3, lon: 101.6 }, 6).split(',').map(Number);
  assert.ok(left < 101.6 && right > 101.6 && top > 3 && bottom < 3);
  assert.ok(Math.abs(top - 3 - 6 / 111) < 0.001);
});

test('OpenStreetMap hits become named, deduplicated candidates, nearest first', () => {
  const at = { lat: 3.03, lon: 101.62 };
  const out = osmCandidates(
    [
      { name: 'Far Noodles', lat: '3.08', lon: '101.62', type: 'restaurant', extratags: { cuisine: 'chinese;noodle' }, address: { suburb: 'Puchong Jaya' } },
      { name: 'Near Café', lat: '3.031', lon: '101.62', type: 'cafe', extratags: { opening_hours: 'Mo-Su 08:00-22:00' }, address: {} },
      { name: 'near café', lat: '3.031', lon: '101.62', type: 'cafe' },
      { name: '', lat: '3.03', lon: '101.62', type: 'restaurant' },
    ],
    at
  );
  assert.deepEqual(out.map((c) => c.name), ['Near Café', 'Far Noodles']);
  assert.equal(out[1].kind, 'Chinese, noodle restaurant');
  assert.equal(out[1].area, 'Puchong Jaya');
  assert.equal(out[0].facts[0], 'Hours listed: Mo-Su 08:00-22:00');
  assert.ok(out[0].url.startsWith('https://www.google.com/maps/search/'));
  assert.equal(out[1].trend, null);
});

test('kinds read naturally', () => {
  assert.equal(osmKind('fast_food'), 'Casual restaurant');
  assert.equal(osmKind('theme_park'), 'Theme park');
  assert.equal(osmKind('restaurant', 'korean'), 'Korean restaurant');
});

test('distance is in kilometres to one decimal', () => {
  assert.equal(distanceKm({ lat: 3, lon: 101 }, { lat: 3.1, lon: 101 }), 11.1);
});

test('grounded replies yield their JSON, and names find their source links', () => {
  assert.deepEqual(firstJson('Here you go:\n```json\n{"items":[{"name":"A"}]}\n```'), { items: [{ name: 'A' }] });
  assert.equal(firstJson('no json here'), null);
  const chunks = [{ title: 'Shaanxi Noodle House', uri: 'https://maps.google.com/?cid=1' }];
  assert.equal(linkFor('Shaanxi Noodle House', chunks), 'https://maps.google.com/?cid=1');
  assert.equal(linkFor('Pizza Hut', chunks), null);
});
