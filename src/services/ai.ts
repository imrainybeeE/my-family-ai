import { FamilyBrief } from './brief';
import { PlanTask } from '../types';

export type AiErrorKind = 'offline' | 'unavailable' | 'busy' | 'error';

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

async function post<T>(path: string, body: object, signal?: AbortSignal): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api/ai/${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal,
    });
  } catch (err) {
    if ((err as Error)?.name === 'AbortError') throw err;
    throw new AiError('offline');
  }
  if (!res.ok) throw new AiError(kindFor(res.status));
  return (await res.json()) as T;
}

export interface Spark {
  question: string;
  why: string;
  members: string[];
}

export interface BloomNoteResult {
  headline: string;
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
  missing: string | null;
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

export interface PlanIdeas {
  ideas: PlanIdea[];
}

export const ai = {
  spark: (brief: FamilyBrief, recent: string[], signal?: AbortSignal) => post<Spark>('spark', { brief, recent }, signal),
  bloom: (brief: FamilyBrief, member: string) => post<BloomNoteResult>('bloom', { brief, member }),
  roots: (brief: FamilyBrief, member: string, question: string, answer: string, followUpAnswered: boolean) =>
    post<RootsResult>('roots', { brief, member, question, answer, followUpAnswered }),
  insights: (brief: FamilyBrief, signal?: AbortSignal) => post<Insights>('insights', { brief }, signal),
  planAsk: (brief: FamilyBrief, task: PlanTask, who: string[]) => post<PlanAsk>('plan/ask', { brief, task, who }),
  planIdeas: (brief: FamilyBrief, task: PlanTask, who: string[], answers: { question: string; answer: string }[]) =>
    post<PlanIdeas>('plan/ideas', { brief, task, who, answers }),
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
  let res: Response;
  try {
    res = await fetch('/api/ai/chat', {
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
      return 'The AI helper isn’t switched on for this app yet. Ask whoever set it up to add the Claude API key.';
    case 'busy':
      return 'The AI helper is busy right now. Try again in a minute.';
    default:
      return 'The AI helper couldn’t answer that time. Try again.';
  }
}
