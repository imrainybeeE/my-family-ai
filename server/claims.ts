// Checks the AI's claims about who likes what against the family's saved taste picks.
// A sentence that names people next to a pick (a food, genre, activity or food they avoid)
// must only name people who actually chose it.

import type { FamilyBrief } from './familyBrief.ts';

/** Taste questions whose picks are concrete enough to check. Moods and energy are too loose. */
const CHECKED = new Set(['Favourite food', 'Food they avoid', 'Favourite film and show genres', 'Favourite weekend activities', 'Favourite snack']);

const STOP = new Set(
  'and with or the a an of in on for to out own your new food foods dish dishes game games party show shows film films family night time day days home style fast paced playful active quick calm cosy simple'.split(' ')
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

function namesIn(text: string, names: string[]): string[] {
  return names.filter((n) => new RegExp(`\\b${n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(text));
}

function picksIn(text: string, picks: Pick[]): Pick[] {
  const ws = words(text);
  return picks.filter((p) => p.keys.some((k) => ws.some((w) => hits(k, w))));
}

/** Splits text into sentences, keeping their punctuation. */
export function sentences(text: string): string[] {
  return text.match(/[^.!?]+[.!?]*\s*/g)?.map((s) => s.trim()).filter(Boolean) || [text];
}

/** Finds sentences that tie a pick to someone who didn't choose it. */
export function checkClaims(value: unknown, brief: FamilyBrief): ClaimIssue[] {
  const picks = tastePicks(brief);
  const names = brief.members.map((m) => m.name).sort((a, b) => b.length - a.length);
  const issues: ClaimIssue[] = [];
  const walk = (v: unknown, path: (string | number)[]) => {
    if (typeof v === 'string') {
      for (const sentence of sentences(v)) {
        // "Nai Nai" also contains no other member's name, but "Nai" could; take whole names only.
        const who = namesIn(sentence, names);
        if (!who.length) continue;
        const matched = picksIn(sentence, picks);
        if (!matched.length) continue;
        const allowed = new Set(matched.flatMap((p) => p.people));
        const wrong = who.filter((n) => !allowed.has(n));
        if (wrong.length) {
          const truth = matched.map((p) => `"${p.option}" was picked by ${p.people.join(', ')}`).join('; ');
          issues.push({ path, sentence, message: `"${sentence}" names ${wrong.join(', ')}, but ${truth}` });
        }
      }
      return;
    }
    if (Array.isArray(v)) return v.forEach((x, i) => walk(x, [...path, i]));
    if (v && typeof v === 'object') {
      for (const [k, child] of Object.entries(v)) if (k !== 'members' && k !== 'id' && k !== 'options') walk(child, [...path, k]);
    }
  };
  walk(value, []);
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
    if (kept) {
      parent[last] = kept;
      continue;
    }
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
