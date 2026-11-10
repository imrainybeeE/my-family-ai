// Checks the AI's claims about who likes what against the family's saved taste picks.
// A sentence that names people next to a pick (a food, genre, activity or food they avoid)
// must only name people who actually chose it.

import type { FamilyBrief } from './familyBrief.ts';

/** Taste questions whose picks are concrete enough to check. Moods and energy are too loose. */
const CHECKED = new Set(['Favourite food', 'Food they avoid', 'Favourite film and show genres', 'Favourite weekend activities', 'Favourite snack']);

const STOP = new Set(
  // Generic words that also appear in ordinary sentences, so they never count as evidence of a pick.
  'and with or the a an of in on for to out own your new food foods dish dishes game games party show shows film films family night time day days home style fast paced playful active quick calm cosy simple quiet creative hobbies reading healthy dinner none anything fresh couch cooking treat building project adventure light funny laughs sweet salty space'.split(' ')
);

export interface Pick {
  label: string;
  option: string;
  people: string[];
  keys: string[];
}

export interface ClaimIssue {
  path: (string | number)[];
  sentence: string;
  message: string;
}

const words = (s: string) => s.toLowerCase().match(/[a-z]+/g) || [];

function keysOf(option: string): string[] {
  return [...new Set(words(option).filter((w) => w.length >= 4 && !STOP.has(w)))];
}

/**
 * Words are compared by their stem, so plurals and verb forms match ("mysteries" and "mystery",
 * "baking" and "bake") but different words don't ("animation" and "animals").
 */
export function stem(word: string): string {
  return word
    .toLowerCase()
    .replace(/ies$/, 'y')
    .replace(/(ing|ed|es|s)$/, '')
    .replace(/e$/, '');
}

/** True when two texts share a meaningful word (by stem), such as a headline and the row it sums up. */
export function sharesTopic(a: string, b: string, names: string[] = []): boolean {
  const skip = new Set([...STOP, ...names.flatMap((n) => words(n))]);
  const keys = new Set(words(b).filter((w) => w.length >= 4 && !skip.has(w)).map(stem));
  return words(a).some((w) => w.length >= 4 && !skip.has(w) && keys.has(stem(w)));
}

function hits(key: string, word: string): boolean {
  return stem(key) === stem(word);
}

/** Every checked taste pick, with everyone who chose it. */
export function tastePicks(brief: FamilyBrief): Pick[] {
  const map = new Map<string, Pick>();
  for (const m of brief.members) {
    for (const qa of m.tastes || []) {
      if (!CHECKED.has(qa.q)) continue;
      for (const option of qa.a) {
        const id = `${qa.q}\u0000${option}`;
        const pick = map.get(id) || { label: qa.q, option, people: [], keys: keysOf(option) };
        if (!pick.people.includes(m.name)) pick.people.push(m.name);
        map.set(id, pick);
      }
    }
  }
  return [...map.values()].filter((p) => p.keys.length);
}

/** A true headline from the saved picks: the pick the most people share, said plainly. */
export function sharedHeadline(brief: FamilyBrief): string {
  const top = tastePicks(brief)
    .filter((p) => p.label !== 'Food they avoid' && p.people.length > 1)
    .sort((a, b) => b.people.length - a.people.length)[0];
  if (!top) return 'No shared picks yet';
  const who = top.people.length === 2 ? `${top.people[0]} and ${top.people[1]} both` : `${top.people.slice(0, -1).join(', ')} and ${top.people[top.people.length - 1]}`;
  const option = top.option.replace(/\s*&\s*/g, ' and ').toLowerCase().replace(/\b(asian|italian|mexican)\b/g, (w) => w[0].toUpperCase() + w.slice(1));
  return `${who} picked ${option}`;
}

const COUNT = ['', 'One person', 'Two people', 'Three people', 'Four people', 'Five people', 'Six people'];
/**
 * "Maya and Nai Nai both like Asian stir fry": a headline written from a shared row. When the names
 * would make it too long for the 60-character headline, it counts the people instead, never cut short.
 */
export function headlineFor(title: string, members: string[]): string {
  const topic = /^(Asian|Italian|Mexican|Indian|Chinese|Japanese|Thai|Korean|French|Greek)\b/.test(title) ? title : title[0].toLowerCase() + title.slice(1);
  const who = members.length === 2 ? `${members[0]} and ${members[1]} both` : `${members.slice(0, -1).join(', ')} and ${members[members.length - 1]} all`;
  const named = `${who} like ${topic}`;
  if (named.length <= 60) return named;
  const counted = `${COUNT[members.length] || `${members.length} people`} like ${topic}`;
  return counted.length <= 60 ? counted : title;
}

/**
 * True when a line only restates its title (and who it is for): once names and filler are dropped,
 * every word it has left is already in the title. Such a line adds nothing under the title.
 */
export function restates(line: string, title: string, names: string[] = []): boolean {
  const skip = new Set([...STOP, ...names.flatMap((n) => words(n)), 'both', 'all', 'everyone', 'together', 'like', 'likes', 'love', 'loves', 'enjoy', 'enjoys', 'want', 'wants', 'picked', 'chose', 'would', 'could', 'some', 'this', 'that', 'they', 'them', 'their', 'you', 'who']);
  const keys = new Set(words(title).map(stem));
  const rest = words(line).filter((w) => w.length >= 3 && !skip.has(w));
  return rest.length > 0 ? rest.every((w) => keys.has(stem(w))) : true;
}

/** A plan line that sounds specific but names no real work ("measures the precise ingredients", "helps around the table"). */
export function vagueDetail(text: string): boolean {
  return /\b(the |some |all the )?(precise |fresh |main |right |needed |basic )?ingredients\b|\bhelps? (out )?(around|with (everything|the cooking|cooking|prep|the prep))\b|\bsets? up the (cooking )?station\b|\beveryone helps\b|\bgathers? (a)?round the (\w+ )?table\b/i.test(text);
}

/** Padding a short question doesn't need: "go explore together next" is just "explore". */
export function paddedQuestion(text: string): boolean {
  return /\btogether next\b|\bgo (explore|visit|try|discover)\b|\b(explore|visit|try|discover|go|watch|play|read) together\?$|\bnext\?$/i.test(text);
}

/** A suggestion built as "What baking should…", which nobody would type. */
export function awkwardAsk(text: string): boolean {
  return /^what \w+ing (should|could|can)\b/i.test(text.trim());
}

/** Lines for the prompt: who shares each pick, so the model never has to work it out. */
export function sharedPickLines(brief: FamilyBrief): string[] {
  return tastePicks(brief)
    .filter((p) => p.people.length > 1)
    .map((p) => `${p.label}, "${p.option}": ${p.people.join(', ')}`);
}

function picksIn(text: string, picks: Pick[]): Pick[] {
  const ws = words(text);
  return picks.filter((p) => p.keys.some((k) => ws.some((w) => hits(k, w))));
}

/** Splits text into sentences, keeping their punctuation. */
export function sentences(text: string): string[] {
  return text.match(/[^.!?]+[.!?]*\s*/g)?.map((s) => s.trim()).filter(Boolean) || [text];
}

/** Fields that state facts. Suggestions (ideas, tips, titles, questions) are not checked. */
const FACT_KEYS = new Set(['answer', 'facts', 'detail', 'why', 'known', 'headline', 'note', 'reflection']);
const NEGATIVE = /\b(avoid|avoids|avoiding|skip|skips|dislike|dislikes|hate|hates|no|not|never|without|won't|doesn't|don't|isn't|aren't|can't)\b/i;
const POSITIVE = /\b(like|likes|liked|love|loves|loved|enjoy|enjoys|enjoyed|pick|picks|picked|prefer|prefers|chose|choose|share|shares|want|wants)\b/i;
const EVERYONE = /\b(everyone|everybody|whole family|all of you|the family)\b/i;
const AVOID_LABEL = 'Food they avoid';
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

interface Mention {
  name: string;
  start: number;
  end: number;
}

/**
 * Splits a sentence into claims: a group of people ("Mum and Nai Nai", "you") and what is said
 * about them, up to the next group or the end of the clause. "You" is the person asking.
 */
function claimsIn(sentence: string, names: string[], asker: string): { people: string[]; about: string }[] {
  const found: Mention[] = [];
  for (const name of names) {
    for (const m of sentence.matchAll(new RegExp(`\\b${escape(name)}\\b`, 'g'))) found.push({ name, start: m.index!, end: m.index! + name.length });
  }
  for (const m of sentence.matchAll(/\b(you|your)\b/gi)) found.push({ name: asker, start: m.index!, end: m.index! + m[0].length });
  found.sort((a, b) => a.start - b.start || b.end - a.end);
  const mentions = found.filter((m, i) => !found.slice(0, i).some((o) => m.start < o.end));
  const groups: { people: string[]; start: number; end: number }[] = [];
  for (const m of mentions) {
    const last = groups[groups.length - 1];
    if (last && /^\s*(,\s*(and\s+)?|and\s+|&\s+)$/i.test(sentence.slice(last.end, m.start))) {
      last.people.push(m.name);
      last.end = m.end;
    } else groups.push({ people: [m.name], start: m.start, end: m.end });
  }
  // A claim runs to the next clause word or semicolon. Commas and colons stay inside it, so lists
  // ("tacos, curry and rice") and labels ("Maya: curry and rice") are checked whole.
  const clauses = (t: string) => t.split(/;|\b(?:so|but|while|whereas|then|which|unlike)\b/i);
  const clause = (t: string) => clauses(t)[0];
  return groups.map((g, i) => {
    const after = clause(sentence.slice(g.end, groups[i + 1]?.start ?? sentence.length));
    // "Curry is loved by Mum and Nai Nai": when nothing follows the names, the claim comes before them.
    const before = clauses(sentence.slice(groups[i - 1]?.end ?? 0, g.start)).pop() || '';
    return { people: [...new Set(g.people)], about: words(after).length > 1 ? after : `${before} ${after}` };
  });
}

/** Finds sentences that tie a pick to someone who didn't make it, or contradict what they avoid. */
export function checkClaims(value: unknown, brief: FamilyBrief): ClaimIssue[] {
  const picks = tastePicks(brief);
  const names = brief.members.map((m) => m.name).sort((a, b) => b.length - a.length);
  const tasters = brief.members.filter((m) => m.tastes?.length).map((m) => m.name);
  const surname = brief.householdName.replace(/^the\s+/i, '').replace(/\s+family$/i, '').trim();
  const familyWide = new RegExp(`${EVERYONE.source}|\\bthe ${escape(surname)}s?\\b`, 'i');
  const issues: ClaimIssue[] = [];

  const checkSentence = (sentence: string): string | null => {
    const problems: string[] = [];
    const claims = claimsIn(sentence, names, brief.asker);
    for (const { people, about } of claims) {
      // Each comma part is a like or an avoid: "no" carries on through a list until a liking verb.
      let negative = false;
      const parts = about.split(',').map((part) => {
        if (NEGATIVE.test(part)) negative = true;
        else if (POSITIVE.test(part)) negative = false;
        return { part, negative };
      });
      for (const { part, negative } of parts) for (const p of picksIn(part, picks)) {
        const avoid = p.label === AVOID_LABEL;
        for (const person of people) {
          const made = p.people.includes(person);
          if (avoid === negative && !made) problems.push(`${person} didn't pick "${p.option}" (${p.people.join(', ')} did)`);
          if (avoid !== negative && made) problems.push(`${person} ${avoid ? 'avoids' : 'picked'} "${p.option}", so the sentence gets it backwards`);
        }
      }
    }
    // "Everyone" is checked even when names come with it ("Mum and everyone love curry").
    if (familyWide.test(sentence)) {
      for (const p of picksIn(sentence, picks)) {
        if (p.label !== AVOID_LABEL && tasters.some((n) => !p.people.includes(n))) problems.push(`only ${p.people.join(', ')} picked "${p.option}", not the whole family`);
      }
    }
    return problems.length ? `"${sentence}": ${[...new Set(problems)].join('; ')}` : null;
  };

  const walk = (v: unknown, path: (string | number)[], key: string, title?: string) => {
    if (typeof v === 'string') {
      if (!FACT_KEYS.has(key)) return;
      for (const sentence of sentences(v)) {
        // A row's detail often points back at its title ("both picked this"): read it with the title in place.
        const read = title ? sentence.replace(/\b(this|these|it|them)\b/i, title) : sentence;
        const message = checkSentence(read);
        if (message) issues.push({ path, sentence, message });
      }
      return;
    }
    if (Array.isArray(v)) return v.forEach((x, i) => walk(x, [...path, i], key));
    if (v && typeof v === 'object') {
      const rowTitle = typeof (v as { title?: unknown }).title === 'string' ? (v as { title: string }).title : undefined;
      for (const [k, child] of Object.entries(v)) walk(child, [...path, k], k, k === 'detail' ? rowTitle : undefined);
    }
  };
  walk(value, [], '');
  return issues;
}

/**
 * Removes flagged sentences. A field left empty drops its whole list item when the item sits in
 * a list (a "together" row, a known fact); otherwise the field keeps its other sentences.
 */
export function stripClaims<T>(value: T, issues: ClaimIssue[], fill: Record<string, string> = {}): T {
  const copy = structuredClone(value) as any;
  const drop: { list: any[]; index: number }[] = [];
  for (const issue of issues) {
    let parent: any = copy;
    for (const key of issue.path.slice(0, -1)) parent = parent?.[key];
    const last = issue.path[issue.path.length - 1];
    if (!parent || typeof parent[last] !== 'string') continue;
    const kept = sentences(parent[last]).filter((s) => s !== issue.sentence).join(' ');
    // An emptied field takes a computed, true replacement when there is one (the headline); otherwise
    // it stays empty and validation rejects the reply rather than keep a false claim.
    parent[last] = kept || (typeof last === 'string' && fill[last]) || '';
    if (parent[last]) continue;
    // Find the nearest list above this field and drop that entry.
    for (let depth = issue.path.length - 1; depth >= 0; depth--) {
      if (typeof issue.path[depth] !== 'number') continue;
      let list: any = copy;
      for (const key of issue.path.slice(0, depth)) list = list?.[key];
      if (Array.isArray(list)) drop.push({ list, index: issue.path[depth] as number });
      break;
    }
  }
  const byList = new Map<any[], Set<number>>();
  for (const { list, index } of drop) byList.set(list, (byList.get(list) || new Set()).add(index));
  for (const [list, indexes] of byList) {
    const keep = list.filter((_, i) => !indexes.has(i));
    list.length = 0;
    list.push(...keep);
  }
  return copy;
}

/**
 * Narrows each item's members to the people who picked what the item is about, so the family
 * circle never ties someone to a pick they didn't make. Items about no checked pick are left alone.
 */
export function alignMembers<T>(value: T, brief: FamilyBrief): T {
  const picks = tastePicks(brief);
  const walk = (v: any): any => {
    if (Array.isArray(v)) return v.map(walk);
    if (!v || typeof v !== 'object') return v;
    const out: any = {};
    for (const [k, child] of Object.entries(v)) out[k] = walk(child);
    if (Array.isArray(out.members) && typeof out.title === 'string') {
      const about = picksIn(`${out.title} ${out.detail || ''}`, picks);
      if (about.length) {
        const allowed = new Set(about.flatMap((p) => p.people));
        out.members = out.members.filter((n: string) => allowed.has(n));
      }
    }
    return out;
  };
  return walk(value);
}

/**
 * Together's rows and ideas are about what people share. A row about a saved pick is pinned to
 * one exact option two or more people chose, and its people become exactly that group, so a row
 * can never merge different people's picks (Mum's curry with Dad's pizza). A row about a pick
 * nobody shares goes, as does any row or idea left with fewer than two people. With no shared
 * rows left, the headline says so.
 */
export function sharedOnly<T>(value: T, brief: FamilyBrief): T {
  const v = value as { headline?: string; together?: { title: string; members: string[] }[]; ideas?: { members: string[] }[] };
  if (!Array.isArray(v?.together)) return value;
  const picks = tastePicks(brief);
  const together = v.together.flatMap((row) => {
    const about = picksIn(row.title, picks);
    if (!about.length) return row.members.length >= 2 ? [row] : [];
    const shared = about
      .filter((p) => p.people.length >= 2)
      .sort((a, b) => overlap(b.people, row.members) - overlap(a.people, row.members) || b.people.length - a.people.length)[0];
    return shared ? [{ ...row, members: [...shared.people] }] : [];
  });
  const ideas = Array.isArray(v.ideas) ? v.ideas.filter((idea) => idea.members.length >= 2) : v.ideas;
  return { ...value, together, ...(ideas ? { ideas } : {}), ...(together.length ? {} : { headline: 'No shared picks yet' }) } as T;
}

const overlap = (a: string[], b: string[]) => a.filter((x) => b.includes(x)).length;
