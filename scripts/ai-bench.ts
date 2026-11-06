// Times every structured AI feature against the demo family and prints token use.
// Usage: npm run bench:ai (set GEMINI_MODEL to try another model).
import dotenv from 'dotenv';
dotenv.config({ path: ['.env.local', '.env'], quiet: true });
process.env.AI_LOG_USAGE = '1';
import express from 'express';
import { buildBrief } from '../src/services/brief.ts';
import { DEMO_HOUSEHOLD, DEMO_MEMBERS, DEMO_RESPONSES, DEMO_ACTIVE_MEMBER } from '../src/data/demoFamily.ts';

const { aiRouter } = await import('../server/ai.ts');
const app = express();
app.use(express.json({ limit: '1mb' }));
app.use('/api/ai', aiRouter);
const server = app.listen(0);
const port = (server.address() as any).port;
const brief = buildBrief(DEMO_HOUSEHOLD.name, DEMO_MEMBERS, DEMO_RESPONSES, DEMO_ACTIVE_MEMBER);
const calls: [string, object][] = [
  ['spark', { brief, recent: [] }],
  ['insights', { brief }],
  ['plan/ask', { brief, task: 'eat', who: ['Maya', 'Mum', 'Dad', 'Nai Nai'] }],
  ['plan/ideas', { brief, task: 'eat', who: ['Maya', 'Mum', 'Dad', 'Nai Nai'], answers: [{ question: 'Home or out?', answer: 'At home' }] }],
  ['bloom', { brief, member: 'Maya' }],
  ['roots', { brief, member: 'Maya', question: 'What makes you feel most appreciated by people at home?', answer: 'When someone remembers the little things', followUpAnswered: false }],
  ['suggest', { brief }],
];
const out: Record<string, unknown> = {};
for (const [path, body] of calls) {
  const t = Date.now();
  const r = await fetch(`http://localhost:${port}/api/ai/${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const ms = Date.now() - t;
  const json = await r.json();
  out[path] = { status: r.status, ms, json };
  console.log(`${path} ${r.status} ${ms}ms`);
}
console.log('JSON ' + JSON.stringify(out));
server.close();
