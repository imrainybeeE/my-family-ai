import { test } from 'node:test';
import assert from 'node:assert/strict';
import { photoLike, readNetflixTop10, sameName } from './media.ts';

async function* lines(text: string) {
  yield* text.trim().split('\n');
}

const TSV = `country_name\tcountry_iso2\tweek\tcategory\tweekly_rank\tshow_title\tseason_title\tcumulative_weeks_in_top_10
Lithuania\tLT\t2026-11-08\tFilms\t1\tOther Film\tN/A\t1
Malaysia\tMY\t2026-11-08\tFilms\t1\tKPop Demon Hunters\tN/A\t20
Malaysia\tMY\t2026-11-08\tTV\t1\tSquid Game\tSquid Game: Season 3\t3
Malaysia\tMY\t2026-11-01\tFilms\t1\tLast Week Film\tN/A\t2
Maldives\tMV\t2026-11-08\tFilms\t1\tElsewhere\tN/A\t1`;

test("reads only a country's latest week from Netflix's Top 10", async () => {
  const out = await readNetflixTop10(lines(TSV), 'my');
  assert.deepEqual(
    out.map((t) => [t.title, t.category, t.rank, t.season, t.weeks]),
    [
      ['KPop Demon Hunters', 'Films', 1, null, 20],
      ['Squid Game', 'TV', 1, 'Squid Game: Season 3', 3],
    ]
  );
  assert.deepEqual(await readNetflixTop10(lines(TSV), 'sg'), []);
});

test('names match apart from case, punctuation and qualifiers', () => {
  assert.ok(sameName('Zootopia 2 (film)', 'Zootopia 2'));
  assert.ok(sameName('Kuala Lumpur City Gallery', 'kuala lumpur city gallery'));
  assert.ok(!sameName('Kuala Lumpur City Centre', 'Kuala Lumpur City Gallery'));
});

test('logos and maps are not used as card photos', () => {
  assert.ok(!photoLike('https://upload.wikimedia.org/x/Squid_Game_logo.svg.png'));
  assert.ok(photoLike('https://upload.wikimedia.org/x/Char_kway_teow.jpg'));
});
