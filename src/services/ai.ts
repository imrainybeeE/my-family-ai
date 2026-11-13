import { FamilyBrief } from './brief';
import { PlanTask } from '../types';

export type AiErrorKind = 'offline' | 'unavailable' | 'busy' | 'error' | 'unknown_area';

export class AiError extends Error {
  kind: AiErrorKind;
  constructor(kind: AiErrorKind) {
    super(kind);
    this.kind = kind;
  }
}

function kindFor(status: number): AiErrorKind {
  if (status === 503) return 'unavailable';
  if (status === 429) return 'busy';
  return 'error';
}

/**
 * Where the AI server lives. A static build (GitHub Pages) has no server of its own: unless
 * VITE_AI_URL points at one, AI features report that the helper is off and use built-in content.
 */
const AI_URL: string = import.meta.env.VITE_AI_URL || (import.meta.env.VITE_STATIC ? '' : '/api/ai');

async function post<T>(path: string, body: object, signal?: AbortSignal): Promise<T> {
  if (!AI_URL) throw new AiError('unavailable');
  let res: Response;
  try {
    res = await fetch(`${AI_URL}/${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal,
    });
  } catch (err) {
    if ((err as Error)?.name === 'AbortError') throw err;
    throw new AiError('offline');
  }
  if (!res.ok) {
    if (res.status === 404) throw new AiError('unknown_area');
    throw new AiError(kindFor(res.status));
  }
  return (await res.json()) as T;
}

export interface Spark {
  question: string;
  why: string;
  members: string[];
}

export interface BloomNoteResult {
  note: string;
  tryThis: string;
}

export interface RootsResult {
  reflection: string;
  followUp: string | null;
}

export interface Insights {
  headline: string;
  together: { title: string; detail: string; members: string[] }[];
  differences: { title: string; detail: string; bridge: string; members: string[] }[];
  ideas: { title: string; why: string; tip: string; members: string[] }[];
}

export interface PlanQuestion {
  id: string;
  question: string;
  options: string[];
  multi: boolean;
}

export interface PlanAsk {
  known: string[];
  questions: PlanQuestion[];
}

export interface PlanIdea {
  title: string;
  summary: string;
  why: string;
  members: string[];
  tradeoff: string;
  check: string | null;
}

/** A real place or film for a chosen idea: facts from the source, the fit line from the AI. */
export interface RealPick {
  id: string;
  name: string;
  kind: string;
  area: string | null;
  distanceKm: number | null;
  facts: string[];
  trend: string | null;
  url: string;
  image: string | null;
  fit: string | null;
  members: string[];
}

export type RealSource = 'google-maps' | 'google-search' | 'openstreetmap' | 'apple-chart';

export interface RealPicks {
  source: RealSource | null;
  near: string | null;
  picks: RealPick[];
  /** A live search for the same thing, for when the list is empty or they want more. */
  searchUrl: string;
}

/** Where to look: a rough position (rounded to about a kilometre) or a typed area. */
export type Where = { lat: number; lon: number } | { area: string } | null;

export interface PlanIdeas {
  ideas: PlanIdea[];
}

export const ai = {
  spark: (brief: FamilyBrief, recent: string[], signal?: AbortSignal) => post<Spark>('spark', { brief, recent }, signal),
  bloom: (brief: FamilyBrief, member: string, signal?: AbortSignal) => post<BloomNoteResult>('bloom', { brief, member }, signal),
  roots: (brief: FamilyBrief, member: string, question: string, answer: string, followUpAnswered: boolean, signal?: AbortSignal) =>
    post<RootsResult>('roots', { brief, member, question, answer, followUpAnswered }, signal),
  insights: (brief: FamilyBrief, signal?: AbortSignal) => post<Insights>('insights', { brief }, signal),
  planAsk: (brief: FamilyBrief, task: PlanTask, who: string[], signal?: AbortSignal) => post<PlanAsk>('plan/ask', { brief, task, who }, signal),
  planIdeas: (brief: FamilyBrief, task: PlanTask, who: string[], answers: { question: string; answer: string }[], signal?: AbortSignal) =>
    post<PlanIdeas>('plan/ideas', { brief, task, who, answers }, signal),
  planReal: (brief: FamilyBrief, task: PlanTask, who: string[], idea: { title: string; summary: string }, where: Where, signal?: AbortSignal) =>
    post<RealPicks>('plan/real', { brief, task, who, idea, where }, signal),
  suggest: (brief: FamilyBrief, last?: { question: string; answer: string }, signal?: AbortSignal) =>
    post<{ suggestions: string[] }>('suggest', { brief, lastQuestion: last?.question, lastAnswer: last?.answer }, signal),
};

export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

/** Streams a chat answer. Calls onText with each chunk; resolves when the answer is complete. */
export async function streamChat(
  brief: FamilyBrief,
  messages: ChatTurn[],
  onText: (chunk: string) => void,
  signal?: AbortSignal
): Promise<{ refused: boolean }> {
  if (!AI_URL) throw new AiError('unavailable');
  let res: Response;
  try {
    res = await fetch(`${AI_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ brief, messages }),
      signal,
    });
  } catch (err) {
    if ((err as Error)?.name === 'AbortError') throw err;
    throw new AiError('offline');
  }
  if (!res.ok || !res.body) throw new AiError(kindFor(res.status));

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let refused = false;
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let idx: number;
    while ((idx = buffer.indexOf('\n\n')) !== -1) {
      const line = buffer.slice(0, idx).trim();
      buffer = buffer.slice(idx + 2);
      if (!line.startsWith('data:')) continue;
      const event = JSON.parse(line.slice(5));
      if (event.t) onText(event.t);
      if (event.error) throw new AiError(event.error === 'rate_limited' ? 'busy' : 'error');
      if (event.done) refused = Boolean(event.refused);
    }
  }
  return { refused };
}

export function aiErrorMessage(err: unknown): string {
  const kind = err instanceof AiError ? err.kind : 'error';
  switch (kind) {
    case 'offline':
      return "You're offline. Check your connection and try again.";
    case 'unavailable':
      return 'The AI helper isn’t switched on for this app yet. Ask whoever set it up to add the Gemini API key.';
    case 'unknown_area':
      return 'We couldn’t find that place. Try a town, suburb or postcode.';
    case 'busy':
      return 'The AI helper is busy right now. Try again in a minute.';
    default:
      return 'The AI helper couldn’t answer that time. Try again.';
  }
}
