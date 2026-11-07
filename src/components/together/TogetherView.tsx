import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { useHousehold } from '../../context/HouseholdContext';
import { useUI } from '../../App';
import { FamilyPerson, useAiResource, useFamily } from '../../hooks/useFamily';
import { ai, aiErrorMessage, Insights } from '../../services/ai';
import { generateFamilyProfileReport } from '../../utils/familyProfileAnalysis';
import { PageHeader } from '../layout/TabBar';
import { Felt, FELT_FOR_STYLE, FlowerBadge } from '../art/Flower';
import { Strand, useWidth } from '../art/Garland';
import { SectionTitle, Thinking } from '../ui/bits';
import { seatRing } from '../../utils/ring';
import { feel } from '../../feel/feel';

/** One yarn colour per shared thing, used for its strand in the circle and its row below. */
const YARNS = ['#e86f8f', '#648b79', '#5e93d1'];

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
  const links = useMemo(
    () => (data?.together || []).map((t) => t.members.map(byName).filter((p): p is FamilyPerson => Boolean(p)).map((p) => p.id)),
    [data, byName]
  );

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
          <FamilyCircle people={people} links={links} onOpen={ui.openMember} />

          {!data ? (
            <div className="mt-4 grid gap-3" aria-busy>
              <Thinking label="Reading everyone’s answers" />
              <div className="skeleton h-7 w-full" />
              <div className="skeleton h-7 w-3/4" />
            </div>
          ) : (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <p className="t-head mt-2" style={{ fontSize: '1.375rem', lineHeight: '26px' }}>
                {data.headline}
              </p>
              {Boolean(insights.error) && <p className="t-small ink-2 mt-2">{aiErrorMessage(insights.error)}</p>}

              <SectionTitle>Shared interests</SectionTitle>
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
                        <p className="t-small mt-2 flex gap-2 items-start font-medium" style={{ color: 'var(--accent-ink)' }}>
                          <span aria-hidden className="shrink-0 rounded-full mt-2" style={{ width: 12, height: 4, background: 'var(--yarn)', transform: 'rotate(-20deg)' }} />
                          <span>{d.bridge}</span>
                        </p>
                      </Row>
                    ))}
                  </ul>
                </>
              )}

              <SectionTitle>Ideas to try</SectionTitle>
              <IdeaPager count={data.ideas.length}>
                {(i) => {
                  const idea = data.ideas[i];
                  return <Ticket index={i} title={idea.title} why={idea.why} people={who(idea.members)} onPlan={() => ui.askAbout(`Help us plan this: ${idea.title}`)} />;
                }}
              </IdeaPager>

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
function FamilyCircle({ people: given, links, onOpen }: { people: FamilyPerson[]; links: string[][]; onOpen: (id: string) => void }) {
  const people = useMemo(() => seatRing(given, links), [given, links]);
  const [ref, w] = useWidth<HTMLDivElement>();
  const n = Math.max(people.length, 1);
  const size = n > 6 ? 78 : n > 4 ? 90 : 104;
  const H = n > 2 ? 300 : 190;
  const cx = w / 2;
  const cy = H / 2 - 4;
  const rx = Math.max(w / 2 - size / 2 - 8, 60);
  const ry = n > 2 ? H / 2 - size / 2 - 10 : 0;
  const angleOf = (i: number) => -Math.PI / 2 + (2 * Math.PI * i) / n + (n === 2 ? Math.PI / 2 : 0);
  const pos = new Map(people.map((p, i) => [p.id, { x: cx + rx * Math.cos(angleOf(i)), y: cy + ry * Math.sin(angleOf(i)) }] as const));
  const order = new Map(people.map((p, i) => [p.id, i]));
  // Every strand follows the ring the short way round, in its own lane, so strands never cut across the middle or each other.
  const strands: { d: string; color: string; key: string }[] = [];
  const lanes = links.length;
  links.forEach((ids, li) => {
    const chain = ids.filter((id) => order.has(id)).sort((a, b) => order.get(a)! - order.get(b)!);
    const off = (li - (lanes - 1) / 2) * 7;
    const lrx = rx + off;
    const lry = Math.max(ry, 24) + off;
    // People outside this group must never look tied to it: the strand goes round the ring the way
    // that passes none of them, or, when both ways would, crosses inside the ring in one curve.
    const others = people.filter((p) => !ids.includes(p.id)).map((p) => order.get(p.id)!);
    const passes = (ia: number, step: number, ib: number) => {
      for (let i = (ia + step + n) % n; i !== ib; i = (i + step + n) % n) if (others.includes(i)) return true;
      return false;
    };
    for (let k = 0; k + 1 < chain.length; k++) {
      const ia = order.get(chain[k])!;
      const ib = order.get(chain[k + 1])!;
      const from = angleOf(ia);
      let delta = angleOf(ib) - from;
      if (delta > Math.PI) delta -= 2 * Math.PI;
      const forward = delta >= 0;
      const shortClear = !passes(ia, forward ? 1 : -1, ib);
      const longClear = !passes(ia, forward ? -1 : 1, ib);
      if (!shortClear && longClear) delta = forward ? delta - 2 * Math.PI : delta + 2 * Math.PI;
      if (!shortClear && !longClear) {
        const a = { x: cx + lrx * Math.cos(from), y: cy + lry * Math.sin(from) };
        const b = { x: cx + lrx * Math.cos(angleOf(ib)), y: cy + lry * Math.sin(angleOf(ib)) };
        const mx = cx + ((a.x + b.x) / 2 - cx) * 0.35;
        const my = cy + ((a.y + b.y) / 2 - cy) * 0.35;
        strands.push({ d: `M ${a.x.toFixed(1)} ${a.y.toFixed(1)} Q ${mx.toFixed(1)} ${my.toFixed(1)} ${b.x.toFixed(1)} ${b.y.toFixed(1)}`, color: YARNS[li % YARNS.length], key: `${li}-${k}` });
        continue;
      }
      const steps = Math.max(12, Math.round((Math.abs(delta) / Math.PI) * 48));
      const pts = Array.from({ length: steps + 1 }, (_, j) => {
        const t = from + (delta * j) / steps;
        return `${(cx + lrx * Math.cos(t)).toFixed(1)} ${(cy + lry * Math.sin(t)).toFixed(1)}`;
      });
      strands.push({ d: `M ${pts.join(' L ')}`, color: YARNS[li % YARNS.length], key: `${li}-${k}` });
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
        <h3 className="t-head flex items-start gap-2">
          {yarn && <span aria-hidden className="shrink-0 rounded-full mt-[0.55em]" style={{ width: 14, height: 4, background: yarn }} />}
          {title}
        </h3>
        <p className="t-small ink-2 mt-1">{body}</p>
        {children}
      </div>
    </li>
  );
}

/** One idea at a time, full width: swipe, or use the arrows. */
function IdeaPager({ count, children }: { count: number; children: (i: number) => React.ReactNode }) {
  const [[i, dir], setPage] = useState<[number, number]>([0, 0]);
  const at = Math.min(i, count - 1);
  const go = (d: number) => {
    const target = Math.max(0, Math.min(count - 1, i + d));
    if (target === i) return;
    feel('page');
    setPage([target, d]);
  };
  if (count < 1) return null;
  return (
    <section aria-roledescription="carousel" aria-label="Ideas to try">
      <div className="pt-3 overflow-hidden -mx-2 px-2 pb-2">
        <AnimatePresence mode="popLayout" initial={false} custom={dir}>
          <motion.div
            key={at}
            custom={dir}
            initial={{ opacity: 0, x: dir * 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: dir * -40 }}
            transition={{ duration: 0.22, ease: [0.3, 0.7, 0.4, 1] }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onDragEnd={(_, info) => {
              if (info.offset.x < -50) go(1);
              else if (info.offset.x > 50) go(-1);
            }}
            aria-roledescription="slide"
            aria-label={`${at + 1} of ${count}`}
          >
            {children(at)}
          </motion.div>
        </AnimatePresence>
      </div>
      {count > 1 && (
        <div className="flex items-center justify-between mt-2">
          <button type="button" className="icon-btn" style={{ background: 'transparent', boxShadow: 'none' }} onClick={() => go(-1)} disabled={at === 0} aria-label="Previous idea">
            <ChevronLeft size={22} strokeWidth={2.2} style={{ opacity: at === 0 ? 0.3 : 1 }} />
          </button>
          <span className="flex gap-2" aria-hidden>
            {Array.from({ length: count }, (_, d) => (
              <span key={d} className="rounded-full transition-colors" style={{ width: 7, height: 7, background: d === at ? 'var(--ink)' : 'var(--line-strong)' }} />
            ))}
          </span>
          <button type="button" className="icon-btn" style={{ background: 'transparent', boxShadow: 'none' }} onClick={() => go(1)} disabled={at === count - 1} aria-label="Next idea">
            <ChevronRight size={22} strokeWidth={2.2} style={{ opacity: at === count - 1 ? 0.3 : 1 }} />
          </button>
        </div>
      )}
    </section>
  );
}

const TICKETS = ['stock-butter', 'stock-pink', 'stock-sky'];
const TAPES = ['tape-sky', '', 'tape-butter'];

/** An idea as a ticket taped to the page: the title is the thing, the reason stays short. */
function Ticket({ index, title, why, people, onPlan }: { index: number; title: string; why: string; people: FamilyPerson[]; onPlan: () => void }) {
  return (
    <article className={`stock ${TICKETS[index % 3]} relative flex flex-col`} style={{ padding: 16, minHeight: 176, transform: `rotate(${index % 2 ? 0.6 : -0.6}deg)` }}>
      <span className={`tape ${TAPES[index % 3]}`} style={{ top: -10, left: 18, transform: 'rotate(-4deg)' }} aria-hidden />
      <h3 className="t-title mt-1" style={{ fontSize: '1.375rem', lineHeight: '26px' }}>{title}</h3>
      <p className="t-small mt-2 opacity-85">{why}</p>
      <div className="flex items-center justify-between gap-2 mt-auto pt-4">
        <span className="flex -space-x-2" aria-label={people.length ? `Suits ${people.map((p) => p.name).join(', ')}` : undefined}>
          {people.slice(0, 4).map((p) => (
            <FlowerBadge key={p.id} style={p.style} size={30} />
          ))}
        </span>
        <button type="button" className="btn btn-sm btn-soft" onClick={onPlan}>
          Plan it
        </button>
      </div>
    </article>
  );
}
