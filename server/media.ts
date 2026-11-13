// Pictures and trending charts for plans, from free sources that need no key: Wikipedia for
// dishes, activities and landmarks, TVmaze for series posters, and Netflix's public Top 10.
// Every lookup is cached in memory and allowed to fail: a card without a picture still works.

const UA = 'MyFamilyAI/1.0 (student project; https://imrainybeee.github.io/my-family-ai/)';

export interface Picture {
  url: string;
  /** Set when the picture shows the kind of thing (a dish, an activity) rather than this exact place. */
  example: string | null;
}

const cache = new Map<string, { at: number; value: unknown }>();
async function cached<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < ttlMs) return hit.value as T;
  const value = await load();
  cache.set(key, { at: Date.now(), value });
  if (cache.size > 2000) cache.delete(cache.keys().next().value!);
  return value;
}

async function getJson(url: string, ms = 5000): Promise<any> {
  const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' }, signal: AbortSignal.timeout(ms) });
  if (!res.ok) throw new Error(`${res.status} from ${new URL(url).host}`);
  return res.json();
}

const DAY = 24 * 60 * 60_000;
const norm = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, ' ').trim();
/** Wikipedia thumbnails come in fixed widths; 640 is sharp on a phone at 2x without being heavy. */
const sized = (url: string) => url.replace(/\?utm_[^]*$/, '');

/** Logos, maps, flags and diagrams make poor card pictures. */
export function photoLike(url: string): boolean {
  return !/\.svg|logo|flag|map|locator|diagram|icon|coat_of_arms|seal_of/i.test(url);
}

/** The lead picture of a Wikipedia search's best match, if it's a photo. */
export async function wikiImage(query: string, opts: { mustMatch?: string } = {}): Promise<string | null> {
  if (!opts.mustMatch) return (await wikiImages(query))[0]?.url || null;
  const q = query.trim().slice(0, 80);
  if (!q) return null;
  return cached(`wiki:${q}|${opts.mustMatch}`, 7 * DAY, async () => {
    const params = new URLSearchParams({ action: 'query', generator: 'search', gsrsearch: q, gsrlimit: '3', prop: 'pageimages', piprop: 'thumbnail', pithumbsize: '640', format: 'json', formatversion: '2' });
    const data = await getJson(`https://en.wikipedia.org/w/api.php?${params}`).catch(() => null);
    const pages: any[] = (data?.query?.pages || []).sort((a: any, b: any) => a.index - b.index);
    for (const p of pages) {
      if (opts.mustMatch && !sameName(p.title, opts.mustMatch)) continue;
      const src = p.thumbnail?.source;
      if (src && photoLike(src)) return sized(src);
      if (opts.mustMatch) return null;
    }
    return null;
  });
}

/** Photos from a Wikipedia search's top three matches, best first, so cards can avoid repeats. */
export async function wikiImages(query: string): Promise<{ url: string; title: string }[]> {
  const q = query.trim().slice(0, 80);
  if (!q) return [];
  return cached(`wikis:${q}`, 7 * DAY, async () => {
    const params = new URLSearchParams({ action: 'query', generator: 'search', gsrsearch: q, gsrlimit: '3', prop: 'pageimages', piprop: 'thumbnail', pithumbsize: '640', format: 'json', formatversion: '2' });
    const data = await getJson(`https://en.wikipedia.org/w/api.php?${params}`).catch(() => null);
    const pages: any[] = (data?.query?.pages || []).sort((a: any, b: any) => a.index - b.index);
    return pages.filter((p) => p.thumbnail?.source && photoLike(p.thumbnail.source)).map((p) => ({ url: sized(p.thumbnail.source), title: String(p.title).replace(/\s*\(.*\)$/, '') }));
  });
}

/** The lead picture of one Wikipedia article, by its exact title ("en:Batu Caves" or "Batu Caves"). */
export async function wikiPageImage(title: string): Promise<string | null> {
  const [lang, name] = title.includes(':') ? title.split(/:(.+)/) : ['en', title];
  if (!/^[a-z]{2,3}$/.test(lang) || !name) return null;
  return cached(`page:${lang}:${name}`, 7 * DAY, async () => {
    const params = new URLSearchParams({ action: 'query', titles: name, prop: 'pageimages', piprop: 'thumbnail', pithumbsize: '640', format: 'json', formatversion: '2', redirects: '1' });
    const data = await getJson(`https://${lang}.wikipedia.org/w/api.php?${params}`).catch(() => null);
    const src = data?.query?.pages?.[0]?.thumbnail?.source;
    return src && photoLike(src) ? sized(src) : null;
  });
}

/** True when two names are the same apart from case, punctuation and a trailing qualifier. */
export function sameName(a: string, b: string): boolean {
  const x = norm(a.replace(/\s*\(.*\)$/, ''));
  const y = norm(b);
  return x === y || (x.length > 6 && y.startsWith(x)) || (y.length > 6 && x.startsWith(y));
}

/** A series poster from TVmaze, which lists Netflix originals too. */
export async function seriesPoster(title: string): Promise<string | null> {
  return cached(`tv:${norm(title)}`, 7 * DAY, async () => {
    const show = await getJson(`https://api.tvmaze.com/singlesearch/shows?q=${encodeURIComponent(title)}`).catch(() => null);
    if (!show?.name || !sameName(show.name, title)) return null;
    return show.image?.medium || show.image?.original || null;
  });
}

/** A film's poster: Wikipedia's lead image for "<title> film" when it's the same film. */
export async function filmPoster(title: string): Promise<string | null> {
  return (await wikiImage(`${title} film`, { mustMatch: title })) || (await seriesPoster(title));
}

// --- Netflix Top 10 --------------------------------------------------------------------------

export interface ChartTitle {
  title: string;
  /** "Films" or "TV". */
  category: string;
  rank: number;
  season: string | null;
  weeks: number;
  week: string;
}

const NETFLIX_TSV = 'https://www.netflix.com/tudum/top10/data/all-weeks-countries.tsv';

/**
 * Reads one country's latest week from Netflix's public Top 10 file. The file is grouped by
 * country, newest week first, so the download stops as soon as that week has been read.
 */
export async function readNetflixTop10(lines: AsyncIterable<string>, iso2: string): Promise<ChartTitle[]> {
  const cc = iso2.toUpperCase();
  const out: ChartTitle[] = [];
  let week = '';
  for await (const line of lines) {
    const [, code, w, category, rank, title, season, weeks] = line.split('\t');
    if (code !== cc) {
      if (out.length) break;
      continue;
    }
    if (week && w !== week) break;
    week = w;
    if (!title) continue;
    out.push({ title: title.trim(), category, rank: Number(rank) || out.length + 1, season: season && season !== 'N/A' ? season.trim() : null, weeks: Number(weeks) || 1, week: w });
  }
  return out;
}

async function* streamLines(url: string, ms: number): AsyncGenerator<string> {
  const res = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(ms) });
  if (!res.ok || !res.body) throw new Error(`${res.status} from Netflix`);
  const decoder = new TextDecoder();
  let rest = '';
  for await (const chunk of res.body as unknown as AsyncIterable<Uint8Array>) {
    rest += decoder.decode(chunk, { stream: true });
    const parts = rest.split('\n');
    rest = parts.pop() || '';
    yield* parts;
  }
  if (rest) yield rest;
}

const netflix = new Map<string, { at: number; titles: ChartTitle[] }>();
const loading = new Map<string, Promise<ChartTitle[]>>();

/** Starts (or joins) a download of a country's Top 10; the result is kept for 12 hours. */
function loadNetflix(cc: string): Promise<ChartTitle[]> {
  const running = loading.get(cc);
  if (running) return running;
  const job = readNetflixTop10(streamLines(NETFLIX_TSV, 90_000), cc)
    .then((titles) => {
      if (titles.length) netflix.set(cc, { at: Date.now(), titles });
      return titles;
    })
    .finally(() => loading.delete(cc));
  job.catch((err) => console.warn('Netflix Top 10 unavailable', String(err).slice(0, 120)));
  loading.set(cc, job);
  return job;
}

/**
 * This week's Netflix Top 10 for a country, waiting at most `waitMs` for a fresh download. A
 * slow download carries on in the background, so the next family gets it.
 */
export async function netflixTop10(iso2: string, waitMs = 6000): Promise<ChartTitle[]> {
  const cc = iso2.toUpperCase();
  const hit = netflix.get(cc);
  if (hit && Date.now() - hit.at < 12 * 60 * 60_000) return hit.titles;
  const job = loadNetflix(cc);
  const timeout = new Promise<ChartTitle[]>((r) => setTimeout(() => r(hit?.titles || []), waitMs));
  return Promise.race([job.catch(() => hit?.titles || []), timeout]);
}

/** Warms the default country's chart when the server starts. */
export function warmNetflix(iso2 = process.env.DEFAULT_COUNTRY || 'my') {
  loadNetflix(iso2.toUpperCase()).catch(() => {});
}
