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
  const who = (names: string[]) => names.map(byName).filter(Boolean) as FamilyPerson[];

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
            <div className="mt-6 grid gap-3 px-1" aria-busy>
              <Thinking label="Reading everyone’s answers" />
              <div className="skeleton h-7 w-full" />
              <div className="skeleton h-7 w-3/4" />
            </div>
          ) : (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <p className="t-title mt-7 px-1" style={{ fontSize: '1.625rem' }}>
                {data.headline}
              </p>
              {Boolean(insights.error) && <p className="t-small ink-2 mt-2 px-1">{aiErrorMessage(insights.error)} Showing a simpler summary for now.</p>}

              <SectionTitle>You all enjoy</SectionTitle>
              <ul className="card px-4" aria-label="Things you enjoy together">
                {data.together.map((t, i) => (
                  <Row key={i} first={i === 0} people={who(t.members)} title={t.title} body={t.detail} />
                ))}
              </ul>

              {data.differences.length > 0 && (
                <>
                  <SectionTitle>Where you differ</SectionTitle>
                  <ul className="card px-4" aria-label="Where you differ">
                    {data.differences.map((d, i) => (
                      <Row key={i} first={i === 0} people={who(d.members)} title={d.title} body={d.detail}>
                        <p className="t-hand mt-2 flex gap-2 items-start" style={{ color: 'var(--leaf-ink)', fontSize: '0.9375rem', lineHeight: 1.35 }}>
                          <LeafMark />
                          <span>{d.bridge}</span>
                        </p>
                      </Row>
                    ))}
                  </ul>
                </>
              )}

              <SectionTitle>Ideas to try</SectionTitle>
              <div className="-mx-4 px-4 flex gap-3 overflow-x-auto no-scrollbar pb-3" style={{ scrollSnapType: 'x mandatory', scrollPaddingInline: 16 }} aria-label="Ideas to try, scroll for more">
                {data.ideas.map((idea, i) => (
                  <Ticket key={i} index={i} title={idea.title} why={idea.why} tip={idea.tip} people={who(idea.members)} onPlan={() => ui.askAbout(`Help us plan this: ${idea.title}`)} />
                ))}
              </div>

              {data.missing && <p className="t-small ink-2 mt-3 px-1">{data.missing}</p>}
              <div className="flex items-center justify-between gap-3 mt-4 px-1">
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

/** One flat observation: who, what, and an optional margin note. */
function Row({ first, people, title, body, children }: { first: boolean; people: FamilyPerson[]; title: string; body: string; children?: React.ReactNode }) {
  return (
    <li className="py-4 flex gap-3" style={{ borderTop: first ? 0 : '1.5px dashed var(--line-strong)' }}>
      <span className="flex flex-col -space-y-2 shrink-0 pt-0.5" aria-label={people.map((p) => p.name).join(', ')}>
        {people.slice(0, 3).map((p) => (
          <FlowerBadge key={p.id} style={p.style} size={30} />
        ))}
      </span>
      <div className="min-w-0">
        <h3 className="font-bold" style={{ fontSize: '1.0625rem', lineHeight: 1.3 }}>
          {title}
        </h3>
        <p className="t-small ink-2 mt-1">{body}</p>
        {children}
      </div>
    </li>
  );
}

function LeafMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" className="shrink-0 mt-0.5" aria-hidden>
      <path d="M3 17 C 3 8, 9 3, 17 3 C 17 11, 12 17, 3 17 Z" fill="#7cc48f" stroke="var(--art-ink)" strokeWidth="1.8" />
    </svg>
  );
}

const TICKETS = ['var(--sun-bg)', 'var(--petal-bg)', 'var(--sky-bg)'];
const TICKET_INK = ['var(--sun-ink)', 'var(--petal-ink)', 'var(--sky-ink)'];

/** An idea as a die-cut ticket: the title is the thing, details stay short. */
function Ticket({ index, title, why, tip, people, onPlan }: { index: number; title: string; why: string; tip: string; people: FamilyPerson[]; onPlan: () => void }) {
  const notch = { width: 22, height: 22, borderRadius: '50%', background: 'var(--paper)', position: 'absolute' as const, top: 112 };
  return (
    <article
      className="relative shrink-0 flex flex-col"
      style={{ width: '78%', scrollSnapAlign: 'start', background: TICKETS[index % 3], color: TICKET_INK[index % 3], borderRadius: 22, padding: '18px 18px 16px', minHeight: 300 }}
    >
      <span style={{ ...notch, left: -11 }} aria-hidden />
      <span style={{ ...notch, right: -11 }} aria-hidden />
      <div className="flex items-center justify-between gap-2">
        <span className="flex -space-x-2" aria-label={people.length ? `Suits ${people.map((p) => p.name).join(', ')}` : undefined}>
          {people.slice(0, 4).map((p) => (
            <FlowerBadge key={p.id} style={p.style} size={32} />
          ))}
        </span>
        <span className="t-label opacity-70">Idea</span>
      </div>
      <h3 className="t-title mt-3" style={{ fontSize: '1.375rem', minHeight: '3.1rem' }}>
        {title}
      </h3>
      <div className="mt-4 pt-4" style={{ borderTop: '2px dashed color-mix(in srgb, currentColor 30%, transparent)' }}>
        <p className="t-small">{why}</p>
        <p className="t-small mt-2 opacity-80">{tip}</p>
      </div>
      <button type="button" className="btn btn-sm mt-auto self-start" style={{ marginTop: 16 }} onClick={onPlan}>
        Plan it with the helper
      </button>
    </article>
  );
}

/** Which flowers grow in this family. Counts people, never scores. */
function Bouquet({ people }: { people: FamilyPerson[] }) {
  const groups = STYLE_ORDER.map((s) => ({ style: s, names: people.filter((p) => p.style === s).map((p) => p.name) })).filter((g) => g.names.length);
  const cols = Math.min(groups.length, 4);
  return (
    <section className="panel panel-card" aria-label="Your family bouquet">
      <h2 className="t-label ink-2">Your family bouquet</h2>
      <ul className="grid gap-x-2 gap-y-4 mt-3" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
        {groups.map((g) => (
          <li key={g.style} className="flex flex-col items-center text-center min-w-0">
            <Flower style={g.style} size={56} />
            <span className="t-label mt-1">{FLOWERS[g.style].flower}</span>
            <span className="t-small ink-2" style={{ fontSize: '0.8125rem', lineHeight: 1.3 }}>
              {g.names.join(', ')}
            </span>
          </li>
        ))}
      </ul>
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
