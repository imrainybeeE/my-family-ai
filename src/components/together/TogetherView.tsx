import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { RefreshCw } from 'lucide-react';
import { useHousehold } from '../../context/HouseholdContext';
import { useUI } from '../../App';
import { FamilyPerson, useAiResource, useFamily } from '../../hooks/useFamily';
import { ai, aiErrorMessage, Insights } from '../../services/ai';
import { generateFamilyProfileReport } from '../../utils/familyProfileAnalysis';
import { PageHeader } from '../layout/TabBar';
import { Felt, FELT_FOR_STYLE, FlowerBadge } from '../art/Flower';
import { Strand, useWidth } from '../art/Garland';
import { SectionTitle, Thinking } from '../ui/bits';

/** One yarn colour per shared thing, used for its strand in the circle and its row below. */
const YARNS = ['#e86f8f', '#e0a526', '#5e93d1'];

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
      headline: 'What your answers share so far.',
      together: r.thingsWeEnjoyTogether.slice(0, 3).map((t) => ({ title: t.title, detail: t.detail, members: t.membersInvolved })),
      differences: r.interestingDifferences.slice(0, 2).map((d) => ({ title: d.title, detail: d.detail, bridge: d.positiveBridge, members: d.membersInvolved })),
      ideas: r.ideasWorthTrying.slice(0, 3).map((i) => ({ title: i.title, why: i.whyItFits, tip: i.funTip, members: [] })),
      missing: null,
    };
  }, [insights.error, members, responses]);
  const data = insights.data || fallback;
  const who = (names: string[]) => names.map(byName).filter(Boolean) as FamilyPerson[];

  return (
    <div className="page">
      <PageHeader title="Together" onProfile={ui.openSettings} />

      {!enabled ? (
        <section className="card flex items-center gap-3 py-4 pl-2 pr-4">
          <Felt name="bud" size={84} />
          <div className="flex-1">
            <h2 className="t-head">Nothing to share yet</h2>
            <p className="t-small ink-2 mt-0.5">This fills in once someone finds their flower.</p>
          </div>
          {!myAnswers.discoveryProfile && (
            <button type="button" className="btn btn-primary btn-sm" onClick={ui.openFoundation}>
              Start
            </button>
          )}
        </section>
      ) : (
        <>
          <FamilyCircle people={people} links={(data?.together || []).map((t) => who(t.members).map((p) => p.id))} onOpen={ui.openMember} />

          {!data ? (
            <div className="mt-4 grid gap-3" aria-busy>
              <Thinking label="Reading everyone’s answers" />
              <div className="skeleton h-7 w-full" />
              <div className="skeleton h-7 w-3/4" />
            </div>
          ) : (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <p className="t-head mt-2" style={{ fontSize: '1.25rem' }}>
                {data.headline}
              </p>
              {Boolean(insights.error) && <p className="t-small ink-2 mt-2">{aiErrorMessage(insights.error)}</p>}

              <SectionTitle>You all enjoy</SectionTitle>
              <ul className="card px-4" aria-label="Things you enjoy together">
                {data.together.map((t, i) => (
                  <Row key={i} first={i === 0} yarn={YARNS[i % YARNS.length]} people={who(t.members)} title={t.title} body={t.detail} />
                ))}
              </ul>

              {data.differences.length > 0 && (
                <>
                  <SectionTitle>Where you differ</SectionTitle>
                  <ul className="card px-4" aria-label="Where you differ">
                    {data.differences.map((d, i) => (
                      <Row key={i} first={i === 0} people={who(d.members)} title={d.title} body={d.detail}>
                        <p className="mt-2 flex gap-2 items-start" style={{ color: 'var(--accent-ink)', fontSize: '0.9375rem', lineHeight: 1.4, fontWeight: 500 }}>
                          <span aria-hidden className="shrink-0 rounded-full mt-2" style={{ width: 12, height: 4, background: 'var(--yarn)', transform: 'rotate(-20deg)' }} />
                          <span>{d.bridge}</span>
                        </p>
                      </Row>
                    ))}
                  </ul>
                </>
              )}

              <SectionTitle>Ideas to try</SectionTitle>
              <div className="-mx-5 px-5 -mt-1 -mb-5 flex gap-3 overflow-x-auto no-scrollbar pt-4 pb-8" style={{ scrollSnapType: 'x mandatory', scrollPaddingInline: 20 }} aria-label="Ideas to try, scroll for more">
                {data.ideas.map((idea, i) => (
                  <Ticket key={i} index={i} title={idea.title} why={idea.why} people={who(idea.members)} onPlan={() => ui.askAbout(`Help us plan this: ${idea.title}`)} />
                ))}
              </div>

              <div className="flex items-center justify-between gap-3 mt-2">
                <p className="t-small ink-3">{data.missing || 'Written by AI from your answers.'}</p>
                <button type="button" className="icon-btn shrink-0" style={{ background: 'transparent', boxShadow: 'none' }} onClick={insights.refresh} disabled={insights.loading} aria-label="Write it again">
                  <RefreshCw size={18} strokeWidth={2.2} />
                </button>
              </div>
            </motion.div>
          )}
        </>
      )}
    </div>
  );
}

/**
 * Everyone's flower in a ring, with a strand of yarn between people who share something.
 * Each shared thing has its own yarn colour, matched by its row below.
 */
function FamilyCircle({ people, links, onOpen }: { people: FamilyPerson[]; links: string[][]; onOpen: (id: string) => void }) {
  const [ref, w] = useWidth<HTMLDivElement>();
  const n = Math.max(people.length, 1);
  const size = n > 6 ? 78 : n > 4 ? 90 : 104;
  const H = n > 2 ? 300 : 190;
  const cx = w / 2;
  const cy = H / 2 - 4;
  const rx = Math.max(w / 2 - size / 2 - 8, 60);
  const ry = n > 2 ? H / 2 - size / 2 - 10 : 0;
  const pos = new Map(
    people.map((p, i) => {
      const a = -Math.PI / 2 + (2 * Math.PI * i) / n + (n === 2 ? Math.PI / 2 : 0);
      return [p.id, { x: cx + rx * Math.cos(a), y: cy + ry * Math.sin(a) }] as const;
    })
  );
  const order = new Map(people.map((p, i) => [p.id, i]));
  // Where a strand meets each flower: the middle of the bloom, which sits high on the lavender sprig.
  const anchor = (id: string) => {
    const at = pos.get(id)!;
    const person = people[order.get(id)!];
    return person.style === 'Chiller' ? { x: at.x, y: at.y - size * 0.2 } : at;
  };
  const strands: { d: string; color: string; key: string }[] = [];
  links.forEach((ids, li) => {
    // Chain people in their order around the ring, so strands follow the circle instead of crossing.
    const pts = ids
      .filter((id) => pos.has(id))
      .sort((a, b) => order.get(a)! - order.get(b)!)
      .map(anchor);
    for (let i = 0; i + 1 < pts.length; i++) {
      const a = pts[i];
      const b = pts[i + 1];
      // Bow each strand towards the middle, a little differently per shared thing.
      const pull = 0.35 + li * 0.12;
      const mx = (a.x + b.x) / 2 + (cx - (a.x + b.x) / 2) * pull;
      const my = (a.y + b.y) / 2 + (cy - (a.y + b.y) / 2) * pull + 10;
      strands.push({ d: `M ${a.x} ${a.y} Q ${mx} ${my} ${b.x} ${b.y}`, color: YARNS[li % YARNS.length], key: `${li}-${i}` });
    }
  });
  return (
    <div ref={ref} className="relative -mx-5 mt-1" style={{ height: H }}>
      <svg className="absolute inset-0 overflow-visible" width={w} height={H} aria-hidden>
        {strands.map((s, i) => (
          <Strand key={s.key} d={s.d} color={s.color} delay={0.2 + i * 0.12} width={3} />
        ))}
      </svg>
      <ul aria-label="Everyone">
        {people.map((p, i) => {
          const at = pos.get(p.id)!;
          const s = p.style ? size : Math.round(size * 0.85);
          return (
            <li key={p.id} className="absolute" style={{ left: at.x - s / 2, top: at.y - s / 2, width: s }}>
              <button type="button" className="flex flex-col items-center bg-transparent border-0 p-0 w-full transition-transform active:scale-95" onClick={() => onOpen(p.id)} aria-label={`${p.name}${p.isYou ? ' (you)' : ''}`}>
                <motion.span initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1, rotate: [-6, 5, -3, 7, -5, 4][i % 6] }} transition={{ type: 'spring', stiffness: 220, damping: 17, delay: 0.05 * i }}>
                  <Felt name={p.style ? FELT_FOR_STYLE[p.style] : 'bud'} size={s} />
                </motion.span>
                <span className="tag -mt-4 relative" style={{ transform: `rotate(${i % 2 ? 3 : -3}deg)` }}>
                  {p.name}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** One observation: who, what, and an optional handwritten note. */
function Row({ first, people, title, body, yarn, children }: { first: boolean; people: FamilyPerson[]; title: string; body: string; yarn?: string; children?: React.ReactNode }) {
  return (
    <li className="py-4 flex gap-3" style={{ borderTop: first ? 0 : '1px solid var(--line)' }}>
      <span className="flex flex-col -space-y-2 shrink-0 pt-0.5" aria-label={people.map((p) => p.name).join(', ')}>
        {people.slice(0, 3).map((p) => (
          <FlowerBadge key={p.id} style={p.style} size={30} />
        ))}
      </span>
      <div className="min-w-0 flex-1">
        <h3 className="font-bold flex items-start gap-2" style={{ fontSize: '1.0625rem', lineHeight: 1.3 }}>
          {yarn && <span aria-hidden className="shrink-0 rounded-full mt-[0.55em]" style={{ width: 14, height: 4, background: yarn }} />}
          {title}
        </h3>
        <p className="t-small ink-2 mt-1">{body}</p>
        {children}
      </div>
    </li>
  );
}

const TICKETS = ['stock-butter', 'stock-pink', 'stock-sky'];
const TAPES = ['tape-sky', '', 'tape-butter'];

/** An idea as a ticket taped to the page: the title is the thing, the reason stays short. */
function Ticket({ index, title, why, people, onPlan }: { index: number; title: string; why: string; people: FamilyPerson[]; onPlan: () => void }) {
  return (
    <article className={`stock ${TICKETS[index % 3]} relative shrink-0 flex flex-col`} style={{ width: '74%', scrollSnapAlign: 'start', minHeight: 220, transform: `rotate(${index % 2 ? 1 : -1}deg)` }}>
      <span className={`tape ${TAPES[index % 3]}`} style={{ top: -10, left: 18, transform: 'rotate(-4deg)' }} aria-hidden />
      <h3 className="t-title mt-1">{title}</h3>
      <p className="t-small mt-2 opacity-85">{why}</p>
      <div className="flex items-center justify-between gap-2 mt-auto pt-4">
        <span className="flex -space-x-2" aria-label={people.length ? `Suits ${people.map((p) => p.name).join(', ')}` : undefined}>
          {people.slice(0, 4).map((p) => (
            <FlowerBadge key={p.id} style={p.style} size={30} />
          ))}
        </span>
        <button type="button" className="btn btn-sm" onClick={onPlan}>
          Plan it
        </button>
      </div>
    </article>
  );
}
