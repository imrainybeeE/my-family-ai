import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { RefreshCw } from 'lucide-react';
import { useHousehold } from '../../context/HouseholdContext';
import { useUI } from '../../App';
import { FamilyPerson, useAiResource, useFamily } from '../../hooks/useFamily';
import { ai, aiErrorMessage, Insights } from '../../services/ai';
import { generateFamilyProfileReport } from '../../utils/familyProfileAnalysis';
import { PageHeader } from '../layout/TabBar';
import { Flower, FlowerBadge, Sprout } from '../art/Flower';
import { SectionTitle, Thinking } from '../ui/bits';
import { FLOWERS, STYLE_ORDER } from '../../data/flowers';
import { advancedProgress } from '../../utils/member';
import { DiscoveryStyleId } from '../../types';

export function TogetherView() {
  const { brief, members, responses, myAnswers } = useHousehold();
  const ui = useUI();
  const { people, bloomed, byName } = useFamily();
  const enabled = bloomed.length > 0;
  const insights = useAiResource('insights', brief, (signal) => ai.insights(brief, signal), enabled);

  const fallback = useMemo<Insights | null>(() => {
    if (!insights.error) return null;
    const r = generateFamilyProfileReport(members, responses);
    return {
      headline: 'Here’s what your answers have in common so far.',
      together: r.thingsWeEnjoyTogether.map((t) => ({ title: t.title, detail: t.detail, members: t.membersInvolved })),
      differences: r.interestingDifferences.map((d) => ({ title: d.title, detail: d.detail, bridge: d.positiveBridge, members: d.membersInvolved })),
      ideas: r.ideasWorthTrying.map((i) => ({ title: i.title, why: i.whyItFits, tip: i.funTip, members: [] })),
      missing: null,
    };
  }, [insights.error, members, responses]);
  const data = insights.data || fallback;

  return (
    <div className="page">
      <PageHeader title="Together" subtitle="What your family shares, from everyone’s answers." onProfile={ui.openSettings} />

      {!enabled ? (
        <section className="panel panel-sun">
          <div className="absolute -right-2 -bottom-3" aria-hidden>
            <Sprout size={110} />
          </div>
          <div className="pr-24">
            <h2 className="t-title">Your garden needs its first flower</h2>
            <p className="t-small mt-2">Once someone finishes the Foundation questions, this page fills with what you share and ideas to try together.</p>
            {!myAnswers.discoveryProfile && (
              <button type="button" className="btn btn-ink mt-4" onClick={ui.openFoundation}>
                Find your flower
              </button>
            )}
          </div>
        </section>
      ) : (
        <>
          <Bouquet people={bloomed} />

          {!data ? (
            <div className="card p-5 mt-4 grid gap-3" aria-busy>
              <Thinking label="Reading everyone’s answers" />
              <div className="skeleton h-5 w-full" />
              <div className="skeleton h-5 w-4/5" />
            </div>
          ) : (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="contents">
              <p className="t-title mt-6 px-1" style={{ fontSize: '1.5rem' }}>
                {data.headline}
              </p>
              {Boolean(insights.error) && <p className="t-small ink-2 mt-2 px-1">{aiErrorMessage(insights.error)} Showing a simpler summary for now.</p>}

              <SectionTitle>You all enjoy</SectionTitle>
              <div className="grid gap-3">
                {data.together.map((t, i) => (
                  <InsightCard key={i} title={t.title} body={t.detail} names={t.members} byName={byName} tone="sun" />
                ))}
              </div>

              <SectionTitle>Where you differ</SectionTitle>
              <div className="grid gap-3">
                {data.differences.map((d, i) => (
                  <InsightCard key={i} title={d.title} body={d.detail} names={d.members} byName={byName} tone="sky">
                    <p className="t-small mt-3 pt-3 border-t" style={{ borderColor: 'var(--line)' }}>
                      <span className="font-bold">How it helps: </span>
                      {d.bridge}
                    </p>
                  </InsightCard>
                ))}
              </div>

              <SectionTitle>Ideas to try</SectionTitle>
              <div className="grid gap-3">
                {data.ideas.map((idea, i) => (
                  <InsightCard key={i} title={idea.title} body={idea.why} names={idea.members} byName={byName} tone="petal" label="Idea">
                    <p className="t-small mt-2 ink-2">{idea.tip}</p>
                    <button type="button" className="btn btn-sm mt-3" onClick={() => ui.askAbout(`Help us plan this: ${idea.title}`)}>
                      Plan this with the helper
                    </button>
                  </InsightCard>
                ))}
              </div>

              {data.missing && <p className="t-small ink-2 mt-5 px-1">{data.missing}</p>}
              <div className="flex items-center justify-between gap-3 mt-5 px-1">
                <p className="t-small ink-3">Written by AI from your answers. Talk it over; it can get things wrong.</p>
                <button type="button" className="icon-btn shrink-0" onClick={insights.refresh} disabled={insights.loading} aria-label="Write it again">
                  <RefreshCw size={18} strokeWidth={2.4} />
                </button>
              </div>
            </motion.div>
          )}
        </>
      )}

      <SectionTitle>Everyone</SectionTitle>
      <div className="grid grid-cols-2 gap-x-3 gap-y-4">
        {people.map((p, i) => (
          <Polaroid key={p.id} person={p} tilt={i % 2 ? 1.6 : -1.4} advanced={advancedProgress(responses[p.id]).complete} onOpen={() => ui.openMember(p.id)} />
        ))}
      </div>
    </div>
  );
}

const TONES = {
  sun: 'var(--sun-bg)',
  sky: 'var(--sky-bg)',
  petal: 'var(--petal-bg)',
};

function InsightCard({
  title,
  body,
  names,
  byName,
  tone,
  label,
  children,
}: {
  title: string;
  body: string;
  names: string[];
  byName: (n: string) => FamilyPerson | undefined;
  tone: keyof typeof TONES;
  label?: string;
  children?: React.ReactNode;
}) {
  const known = names.map((n) => byName(n)).filter(Boolean) as FamilyPerson[];
  return (
    <article className="card p-4 pl-5 overflow-hidden">
      <span aria-hidden className="absolute left-0 top-0 bottom-0 w-[6px]" style={{ background: TONES[tone] }} />
      <div className="flex items-start justify-between gap-3">
        <h3 className="t-head" style={{ fontSize: '1.125rem' }}>
          {label && (
            <span className="t-label align-middle mr-2 px-2 py-0.5 rounded-md" style={{ background: TONES[tone], fontSize: '0.75rem' }}>
              {label}
            </span>
          )}
          {title}
        </h3>
        {known.length > 0 && (
          <span className="flex -space-x-2 shrink-0" aria-label={known.map((p) => p.name).join(', ')}>
            {known.slice(0, 4).map((p) => (
              <FlowerBadge key={p.id} style={p.style} size={30} />
            ))}
          </span>
        )}
      </div>
      <p className="t-small ink-2 mt-1.5">{body}</p>
      {children}
    </article>
  );
}

/** Which flowers grow in this family. Counts people, never scores. */
function Bouquet({ people }: { people: FamilyPerson[] }) {
  const groups = STYLE_ORDER.map((s) => ({ style: s, names: people.filter((p) => p.style === s).map((p) => p.name) })).filter((g) => g.names.length);
  return (
    <section className="panel panel-card" aria-label="Your family bouquet">
      <h2 className="t-label ink-2">Your family bouquet</h2>
      <div className="flex gap-4 overflow-x-auto no-scrollbar mt-3 -mx-1 px-1 pb-1">
        {groups.map((g) => (
          <div key={g.style} className="flex flex-col items-center shrink-0 text-center" style={{ minWidth: 76 }}>
            <Flower style={g.style as DiscoveryStyleId} size={56} />
            <span className="t-label mt-1">{FLOWERS[g.style].flower}</span>
            <span className="t-small ink-2" style={{ fontSize: '0.8125rem' }}>
              {g.names.join(', ')}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

function Polaroid({ person, tilt, advanced, onOpen }: { person: FamilyPerson; tilt: number; advanced: boolean; onOpen: () => void }) {
  const bg = person.style ? `color-mix(in srgb, ${FLOWERS[person.style].color} 35%, var(--card))` : 'var(--leaf-soft)';
  return (
    <button
      type="button"
      onClick={onOpen}
      className="relative border-0 p-2.5 pb-3 text-left transition-transform active:scale-95"
      style={{ background: 'var(--card)', transform: `rotate(${tilt}deg)`, boxShadow: 'var(--shadow-card)', borderRadius: 6 }}
    >
      <span className="tape" style={{ top: -10, left: '50%', marginLeft: -37, transform: `rotate(${-tilt * 2}deg)` }} aria-hidden />
      <span className="grid place-items-center aspect-square rounded-[3px]" style={{ background: bg }}>
        {person.style ? <Flower style={person.style} size={92} /> : <Sprout size={76} />}
      </span>
      <span className="block t-hand mt-2" style={{ fontSize: '1.125rem' }}>
        {person.name}
        {person.isYou && <span className="ink-3"> (you)</span>}
      </span>
      <span className="block t-small ink-2" style={{ fontSize: '0.8125rem' }}>
        {person.style ? `${FLOWERS[person.style].flower}${advanced ? ', deep roots' : ''}` : 'Not bloomed yet'}
      </span>
    </button>
  );
}
