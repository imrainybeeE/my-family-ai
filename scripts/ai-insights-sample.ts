// Calls the family profile a few times for the demo family and prints status, time and headline.
// Usage: npx tsx scripts/ai-insights-sample.ts [baseUrl] [runs]   (needs `npm run dev` running)
import { buildBrief } from '../src/services/brief.ts';
import { DEMO_HOUSEHOLD, DEMO_MEMBERS, DEMO_RESPONSES, DEMO_ACTIVE_MEMBER } from '../src/data/demoFamily.ts';

const base = process.argv[2] || 'http://localhost:3000';
const runs = Number(process.argv[3] || 4);
const brief = buildBrief(DEMO_HOUSEHOLD.name, DEMO_MEMBERS, DEMO_RESPONSES, DEMO_ACTIVE_MEMBER);
for (let i = 0; i < runs; i++) {
  const t = Date.now();
  const r = await fetch(`${base}/api/ai/insights`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ brief }) });
  const body = await r.json();
  console.log(r.status, `${Date.now() - t}ms`, body.headline || body.error, (body.together || []).map((x: { title: string }) => x.title).join(' | '));
}
