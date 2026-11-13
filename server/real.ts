// Real places and films for a chosen plan idea. Facts come from a data source (Google Maps or
// Search through Gemini grounding, OpenStreetMap, or Apple's film chart); the AI only chooses
// which of them suit the family and says why. Nothing here is stored.

const UA = 'MyFamilyAI/1.0 (student project; https://imrainybeee.github.io/my-family-ai/)';
const FETCH_MS = 12_000;

export type RealSource = 'google-maps' | 'google-search' | 'openstreetmap' | 'netflix' | 'apple-chart';

/** One real thing the family could go to or watch, with facts from the source only. */
export interface Candidate {
  id: string;
  name: string;
  /** What it is: "Chinese restaurant", "Park", "Action & Adventure". */
  kind: string;
  area: string | null;
  distanceKm: number | null;
  /** Short facts from the source: rating, opening hours, chart position, release year. */
  facts: string[];
  /** Why it's popular right now, only when the source says so. */
  trend: string | null;
  url: string;
  image: string | null;
  /** Where a picture of this exact place might be: OpenStreetMap's image or Wikipedia tags. */
  source?: { image?: string; wikipedia?: string; landmark?: boolean };
}

/** Kinds of place famous enough to have their own Wikipedia photo. */
const LANDMARKS = /museum|gallery|zoo|aquarium|theme_park|attraction|park|nature_reserve|viewpoint|castle|monument|temple|place_of_worship|beach|waterfall|peak|mall|stadium/;

export interface Place {
  lat: number;
  lon: number;
  label: string;
  country: string | null;
}

async function getJson(url: string, init: RequestInit = {}): Promise<any> {
  const res = await fetch(url, { ...init, headers: { 'User-Agent': UA, Accept: 'application/json', ...(init.headers || {}) }, signal: AbortSignal.timeout(FETCH_MS) });
  if (!res.ok) throw new Error(`${res.status} from ${new URL(url).host}`);
  return res.json();
}

/** Coordinates are rounded to about a kilometre before they leave the server or reach a log. */
export const roundCoord = (n: number) => Math.round(n * 100) / 100;

export function validCoords(lat: unknown, lon: unknown): lat is number {
  return typeof lat === 'number' && typeof lon === 'number' && Math.abs(lat) <= 90 && Math.abs(lon) <= 180 && Number.isFinite(lat + lon);
}

/** Turns a typed area, postcode or town into a point, with OpenStreetMap's geocoder. */
export async function geocode(area: string): Promise<Place | null> {
  const q = new URLSearchParams({ q: area, format: 'json', limit: '1', addressdetails: '1' });
  const hits = await getJson(`https://nominatim.openstreetmap.org/search?${q}`);
  const hit = Array.isArray(hits) ? hits[0] : null;
  if (!hit) return null;
  const a = hit.address || {};
  const label = [a.suburb || a.town || a.city || a.village || hit.name, a.state || a.country].filter(Boolean).join(', ');
  return { lat: roundCoord(Number(hit.lat)), lon: roundCoord(Number(hit.lon)), label: label || area, country: typeof a.country_code === 'string' ? a.country_code : null };
}

/** Names the area around a shared location, so the screen can say where it looked. */
export async function reverseGeocode(lat: number, lon: number): Promise<Place> {
  try {
    const q = new URLSearchParams({ lat: String(lat), lon: String(lon), format: 'json', zoom: '14', addressdetails: '1' });
    const hit = await getJson(`https://nominatim.openstreetmap.org/reverse?${q}`);
    const a = hit?.address || {};
    const label = [a.suburb || a.town || a.city || a.village, a.state || a.country].filter(Boolean).join(', ');
    return { lat, lon, label: label || 'Near you', country: typeof a.country_code === 'string' ? a.country_code : null };
  } catch {
    return { lat, lon, label: 'Near you', country: null };
  }
}

export function distanceKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)) * 10) / 10;
}

export const mapsSearchUrl = (query: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;

// --- OpenStreetMap ---------------------------------------------------------------------------

const titleCase = (s: string) => s.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());

/** A readable kind for an OpenStreetMap place: "Chinese restaurant", "Park". */
export function osmKind(type: string, cuisine?: string): string {
  const kind = titleCase(type === 'fast_food' ? 'casual restaurant' : type || 'place');
  const c = cuisine
    ? cuisine
        .split(';')
        .slice(0, 2)
        .map((x) => x.replace(/_/g, ' ').trim())
        .join(', ')
    : '';
  return c ? `${titleCase(c)} ${kind.toLowerCase()}` : kind;
}

/** A box about radiusKm across each way from a point, as Nominatim's viewbox (left,top,right,bottom). */
export function viewbox(at: { lat: number; lon: number }, radiusKm: number): string {
  const dLat = radiusKm / 111;
  const dLon = radiusKm / (111 * Math.max(Math.cos((at.lat * Math.PI) / 180), 0.2));
  const f = (n: number) => n.toFixed(4);
  return [f(at.lon - dLon), f(at.lat + dLat), f(at.lon + dLon), f(at.lat - dLat)].join(',');
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Turns Nominatim hits into candidates, closest and best-described first. */
export function osmCandidates(hits: any[], at: { lat: number; lon: number }): Candidate[] {
  const seen = new Set<string>();
  const out: Candidate[] = [];
  for (const h of hits) {
    const name = typeof h?.name === 'string' ? h.name.trim() : '';
    const lat = Number(h?.lat);
    const lon = Number(h?.lon);
    if (!name || !Number.isFinite(lat + lon) || seen.has(name.toLowerCase())) continue;
    seen.add(name.toLowerCase());
    const tags = h.extratags || {};
    const a = h.address || {};
    const area = a.suburb || a.neighbourhood || a.town || a.city || a.road || null;
    const facts: string[] = [];
    if (tags.opening_hours) facts.push(`Hours listed: ${String(tags.opening_hours).slice(0, 40)}`);
    if (tags['diet:vegetarian'] === 'yes' || tags['diet:vegetarian'] === 'only') facts.push('Vegetarian options');
    if (tags['diet:halal'] === 'yes') facts.push('Halal');
    out.push({
      id: `osm${out.length + 1}`,
      name,
      kind: osmKind(String(h.type || ''), tags.cuisine),
      area,
      distanceKm: distanceKm(at, { lat, lon }),
      facts,
      trend: null,
      url: mapsSearchUrl(`${name}, ${area || ''}`.replace(/,\s*$/, '')),
      image: null,
      source: {
        image: typeof tags.image === 'string' && /^https:\/\/\S+\.(jpe?g|png|webp)$/i.test(tags.image) ? tags.image : undefined,
        wikipedia: typeof tags.wikipedia === 'string' ? tags.wikipedia : undefined,
        landmark: LANDMARKS.test(String(h.type || '')),
      },
    });
  }
  return out.sort((x, y) => (x.distanceKm ?? 0) - (y.distanceKm ?? 0)).slice(0, 16);
}

/**
 * Real places from OpenStreetMap for up to three short searches ("chinese restaurant", "park"),
 * kept inside a box around the family. Searches run one a second, as Nominatim asks.
 */
export async function osmPlaces(searches: string[], at: { lat: number; lon: number }, radiusKm: number): Promise<Candidate[]> {
  const box = viewbox(at, radiusKm);
  const hits: any[] = [];
  for (const [i, q] of searches.slice(0, 3).entries()) {
    if (i) await wait(1100);
    const params = new URLSearchParams({ q: q.slice(0, 60), format: 'json', limit: '12', viewbox: box, bounded: '1', extratags: '1', addressdetails: '1' });
    try {
      const found = await getJson(`https://nominatim.openstreetmap.org/search?${params}`);
      if (Array.isArray(found)) hits.push(...found.filter((h) => h?.class !== 'place' && h?.class !== 'boundary' && h?.class !== 'highway'));
    } catch (err) {
      console.warn('Nominatim search failed', String(err).slice(0, 120));
    }
  }
  return osmCandidates(hits, at);
}

// --- Apple's film chart ---------------------------------------------------------------------

const countryName = (cc: string) => {
  try {
    return new Intl.DisplayNames(['en-GB'], { type: 'region' }).of(cc.toUpperCase()) || cc.toUpperCase();
  } catch {
    return cc.toUpperCase();
  }
};

/** The top films on Apple TV in a country this week: a real, current sign of what's trending. */
const charts = new Map<string, { at: number; films: Candidate[] }>();

/** The chart changes daily at most, so it's kept for an hour; a failed fetch gets one retry. */
export async function chartFilms(country: string): Promise<Candidate[]> {
  const cc = /^[a-z]{2}$/.test(country) ? country : 'my';
  const cached = charts.get(cc);
  if (cached && Date.now() - cached.at < 60 * 60_000) return cached.films;
  const films = await fetchChart(cc).catch(() => wait(800).then(() => fetchChart(cc)));
  if (films.length) charts.set(cc, { at: Date.now(), films });
  return films;
}

/** A poster for a title from this week's chart, when the title is on it. */
export async function chartPoster(title: string, country: string): Promise<string | null> {
  const t = title.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  if (!t) return null;
  const films = await chartFilms(country).catch(() => []);
  return films.find((f) => f.name.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().startsWith(t))?.image ?? null;
}

async function fetchChart(cc: string): Promise<Candidate[]> {
  const data = await getJson(`https://itunes.apple.com/${cc}/rss/topmovies/limit=40/json`);
  const entries: any[] = Array.isArray(data?.feed?.entry) ? data.feed.entry : [];
  return entries.map((e, i) => {
    const name = String(e?.['im:name']?.label || '').trim();
    const genre = String(e?.category?.attributes?.label || 'Film');
    const year = String(e?.['im:releaseDate']?.label || '').slice(0, 4);
    const links = Array.isArray(e?.link) ? e.link : [e?.link];
    const href = links.find((l: any) => l?.attributes?.rel === 'alternate')?.attributes?.href || links[0]?.attributes?.href || '';
    const images: any[] = Array.isArray(e?.['im:image']) ? e['im:image'] : [];
    const image = images.at(-1)?.label ? String(images.at(-1).label).replace(/\d+x\d+bb/, '300x450bb') : null;
    const summary = String(e?.summary?.label || '').replace(/\s+/g, ' ').slice(0, 220);
    return {
      id: `film${i + 1}`,
      name,
      kind: genre,
      area: null,
      distanceKm: null,
      facts: [year && `Released ${year}`, summary && `About: ${summary}`].filter(Boolean) as string[],
      trend: `#${i + 1} on Apple TV in ${countryName(cc)} this week`,
      url: href || `https://www.google.com/search?q=${encodeURIComponent(`${name} film`)}`,
      image,
    };
  }).filter((c) => c.name);
}

// --- Gemini grounding -----------------------------------------------------------------------

/** Pulls the first JSON object out of a grounded reply, which can't use JSON mode. */
export function firstJson(text: string): unknown {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

/** Uses the source's own link for a name when grounding returned one. */
export function linkFor(name: string, chunks: { title?: string; uri?: string }[]): string | null {
  const n = norm(name);
  if (!n) return null;
  const hit = chunks.find((c) => c.title && c.uri && (norm(c.title).includes(n) || n.includes(norm(c.title))));
  return hit?.uri || null;
}
