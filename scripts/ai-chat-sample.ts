// Prints a few Ask answers for the demo family, to eyeball openings and length.
// Usage: npx tsx scripts/ai-chat-sample.ts [baseUrl]   (needs `npm run dev` running)
import { buildBrief } from '../src/services/brief.ts';
import { DEMO_HOUSEHOLD, DEMO_MEMBERS, DEMO_RESPONSES, DEMO_ACTIVE_MEMBER } from '../src/data/demoFamily.ts';

const base = process.argv[2] || 'http://localhost:3000';
const brief = buildBrief(DEMO_HOUSEHOLD.name, DEMO_MEMBERS, DEMO_RESPONSES, DEMO_ACTIVE_MEMBER);
const questions = ['What do we have in common?', 'What could Maya and Dad do this weekend?', 'What should we eat on Friday?', 'Why is Leo so quiet?'];

for (const q of questions) {
  const started = Date.now();
  const r = await fetch(`${base}/api/ai/chat`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ brief, messages: [{ role: 'user', content: q }] }) });
  const raw = await r.text();
  let out = '';
  for (const line of raw.split('\n')) {
    if (!line.startsWith('data: ')) continue;
    const d = JSON.parse(line.slice(6));
    if (d.t) out += d.t;
    if (d.error) out += `[error: ${d.error}]`;
  }
  console.log(`\n> ${q}  (${((Date.now() - started) / 1000).toFixed(1)}s, ${out.split(/\s+/).filter(Boolean).length} words)\n${out.trim()}`);
}
