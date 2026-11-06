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

/** A keyword matches a word in the text by its first five letters, or exactly (allowing a plural) when shorter. */
function hits(key: string, word: string): boolean {
  if (key.length >= 5) return word.startsWith(key.slice(0, 5));
  return word === key || word === `${key}s` || word === `${key}es`;
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
  const clauses = (t: string) => t.split(/[,;:]|\b(?:so|but|while|whereas|then|which|unlike)\b/i);
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
      const negative = NEGATIVE.test(about);
      for (const p of picksIn(about, picks)) {
        const avoid = p.label === AVOID_LABEL;
        for (const person of people) {
          const made = p.people.includes(person);
          if (avoid === negative && !made) problems.push(`${person} didn't pick "${p.option}" (${p.people.join(', ')} did)`);
          if (avoid !== negative && made) problems.push(`${person} ${avoid ? 'avoids' : 'picked'} "${p.option}", so the sentence gets it backwards`);
        }
      }
    }
    if (!claims.length && familyWide.test(sentence)) {
      for (const p of picksIn(sentence, picks)) {
        if (p.label !== AVOID_LABEL && tasters.some((n) => !p.people.includes(n))) problems.push(`only ${p.people.join(', ')} picked "${p.option}", not the whole family`);
      }
    }
    return problems.length ? `"${sentence}": ${[...new Set(problems)].join('; ')}` : null;
  };

  const walk = (v: unknown, path: (string | number)[], key: string) => {
    if (typeof v === 'string') {
      if (!FACT_KEYS.has(key)) return;
      for (const sentence of sentences(v)) {
        const message = checkSentence(sentence);
        if (message) issues.push({ path, sentence, message });
      }
      return;
    }
    if (Array.isArray(v)) return v.forEach((x, i) => walk(x, [...path, i], key));
    if (v && typeof v === 'object') for (const [k, child] of Object.entries(v)) walk(child, [...path, k], k);
  };
  walk(value, [], '');
  return issues;
}

/**
 * Removes flagged sentences. A field left empty drops its whole list item when the item sits in
 * a list (a "together" row, a known fact); otherwise the field keeps its other sentences.
 */
export function stripClaims<T>(value: T, issues: ClaimIssue[]): T {
  const copy = structuredClone(value) as any;
  const drop: { list: any[]; index: number }[] = [];
  for (const issue of issues) {
    let parent: any = copy;
    for (const key of issue.path.slice(0, -1)) parent = parent?.[key];
    const last = issue.path[issue.path.length - 1];
    if (!parent || typeof parent[last] !== 'string') continue;
    const kept = sentences(parent[last]).filter((s) => s !== issue.sentence).join(' ');
    // An emptied field stays empty: validation then rejects the reply rather than keep a false claim.
    parent[last] = kept;
    if (kept) continue;
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
