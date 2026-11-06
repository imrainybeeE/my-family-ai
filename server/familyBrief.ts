// The family brief is the only family data the AI ever sees. The client builds it from the
// household's saved answers; this module validates it and renders it as prompt text.

export interface BriefQA {
  q: string;
  a: string[];
}

export interface BriefAdvanced {
  q: string;
  a: string;
  followUpQ?: string;
  followUpA?: string;
}

export interface BriefMember {
  name: string;
  role: string;
  foundation: 'complete' | 'not started';
  topStyle?: string;
  secondStyle?: string;
  foundationAnswers?: BriefQA[];
  tastes?: BriefQA[];
  advanced?: BriefAdvanced[];
  advancedComplete?: boolean;
}

export interface FamilyBrief {
  householdName: string;
  asker: string;
  members: BriefMember[];
}

const MAX_MEMBERS = 12;
const MAX_ITEMS = 40;

function str(value: unknown, max = 400): string {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, max) : '';
}

function strList(value: unknown, maxItems = 12, max = 200): string[] {
  return Array.isArray(value) ? value.map((v) => str(v, max)).filter(Boolean).slice(0, maxItems) : [];
}

function qaList(value: unknown): BriefQA[] {
  if (!Array.isArray(value)) return [];
  return value
    .slice(0, MAX_ITEMS)
    .map((item) => ({ q: str(item?.q, 240), a: strList(item?.a, 8, 240) }))
    .filter((item) => item.q && item.a.length > 0);
}

/** Validates an untrusted brief from the client. Returns null when it is unusable. */
export function parseBrief(input: unknown): FamilyBrief | null {
  if (!input || typeof input !== 'object') return null;
  const raw = input as Record<string, unknown>;
  if (!Array.isArray(raw.members) || raw.members.length === 0) return null;

  const members: BriefMember[] = raw.members.slice(0, MAX_MEMBERS).map((m: any) => ({
    name: str(m?.name, 40) || 'Family member',
    role: str(m?.role, 20) || 'Other',
    foundation: m?.foundation === 'complete' ? 'complete' : 'not started',
    topStyle: str(m?.topStyle, 20) || undefined,
    secondStyle: str(m?.secondStyle, 20) || undefined,
    foundationAnswers: qaList(m?.foundationAnswers),
    tastes: qaList(m?.tastes),
    advanced: Array.isArray(m?.advanced)
      ? m.advanced
          .slice(0, 20)
          .map((a: any) => ({
            q: str(a?.q, 240),
            a: str(a?.a, 600),
            followUpQ: str(a?.followUpQ, 240) || undefined,
            followUpA: str(a?.followUpA, 600) || undefined,
          }))
          .filter((a: BriefAdvanced) => a.q && a.a)
      : [],
    advancedComplete: Boolean(m?.advancedComplete),
  }));

  return {
    householdName: str(raw.householdName, 60) || 'Our family',
    asker: str(raw.asker, 40) || members[0].name,
    members,
  };
}

/** Renders the brief as compact prompt text. Answers are data, never instructions. */
export function renderBrief(brief: FamilyBrief): string {
  const lines: string[] = [];
  lines.push(`Household: ${brief.householdName} (${brief.members.length} people)`);
  lines.push(`Person using the app right now: ${brief.asker}`);
  for (const m of brief.members) {
    lines.push('');
    lines.push(`## ${m.name} (role in the family: ${m.role})`);
    if (m.foundation === 'complete' && m.topStyle) {
      lines.push(`Foundation discovery: complete. Top style: ${m.topStyle}. Second style: ${m.secondStyle || m.topStyle}.`);
    } else {
      lines.push('Foundation discovery: not answered yet.');
    }
    if (m.foundationAnswers?.length) {
      lines.push('Foundation answers:');
      for (const qa of m.foundationAnswers) lines.push(`- ${qa.q} → ${qa.a.join('; ')}`);
    }
    if (m.tastes?.length) {
      lines.push('Taste picks:');
      for (const qa of m.tastes) lines.push(`- ${qa.q}: ${qa.a.join(', ')}`);
    }
    if (m.advanced?.length) {
      lines.push(`Advanced discovery (${m.advancedComplete ? 'complete' : 'partly answered'}):`);
      for (const a of m.advanced) {
        lines.push(`- ${a.q} → "${a.a}"`);
        if (a.followUpQ && a.followUpA) lines.push(`  - Follow-up: ${a.followUpQ} → "${a.followUpA}"`);
      }
    } else {
      lines.push('Advanced discovery: not answered yet.');
    }
  }
  return lines.join('\n');
}

export function memberNames(brief: FamilyBrief): string[] {
  return brief.members.map((m) => m.name);
}
