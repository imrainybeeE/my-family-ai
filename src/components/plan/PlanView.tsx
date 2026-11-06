import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { onRovingKeyDown, rovingTabIndex } from '../ui/roving';
import { useHousehold } from '../../context/HouseholdContext';
import { useUI } from '../../App';
import { useFamily } from '../../hooks/useFamily';
import { ai, aiErrorMessage, PlanAsk, PlanIdea, PlanIdeas } from '../../services/ai';
import { calculateCommonGround } from '../../utils/tasteMatching';
import { generateFamilyProfileReport } from '../../utils/familyProfileAnalysis';
import { PageHeader } from '../layout/TabBar';
import { FlowerBadge } from '../art/Flower';
import { DoArt, EatArt, TravelArt, WatchArt } from '../art/Icons';
import { SectionTitle, Thinking } from '../ui/bits';
import { Coin } from './Coin';
import { PlanTask } from '../../types';

const TASK: Record<PlanTask, { label: string; hint: string; title: string; Art: typeof EatArt }> = {
  eat: { label: 'Eat', hint: 'Dinner tonight', title: 'What should we eat?', Art: EatArt },
  do: { label: 'Do', hint: 'A day or an evening', title: 'What should we do?', Art: DoArt },
  watch: { label: 'Watch', hint: 'Film night', title: 'What should we watch?', Art: WatchArt },
  travel: { label: 'Travel', hint: 'A trip away', title: 'Where should we go?', Art: TravelArt },
};

type Stage = 'who' | 'asking' | 'questions' | 'thinking' | 'ideas';

export function PlanView({ initialTask, onConsumeTask }: { initialTask: PlanTask | null; onConsumeTask: () => void }) {
  const { brief, members, responses, myAnswers } = useHousehold();
  const ui = useUI();
  const { people, byName } = useFamily();
  const [task, setTask] = useState<PlanTask | null>(initialTask);
  const [stage, setStage] = useState<Stage>('who');
  const [whoIds, setWhoIds] = useState<string[]>(() => people.map((p) => p.id));
  const who = people.filter((p) => whoIds.includes(p.id)).map((p) => p.name);
  const [ask, setAsk] = useState<PlanAsk | null>(null);
  const [picks, setPicks] = useState<Record<string, string[]>>({});
  const [extra, setExtra] = useState('');
  const [result, setResult] = useState<PlanIdeas | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [chosen, setChosen] = useState<number | null>(null);

  useEffect(() => {
    if (initialTask) onConsumeTask();
  }, [initialTask, onConsumeTask]);

  const reset = () => {
    setTask(null);
    setStage('who');
    setAsk(null);
    setPicks({});
    setExtra('');
    setResult(null);
    setError(null);
    setChosen(null);
  };

  const start = async () => {
    if (!task) return;
    setStage('asking');
    setError(null);
    try {
      const a = await ai.planAsk(brief, task, who);
      setAsk({ known: a.known.slice(0, 4), questions: a.questions.slice(0, 3) });
      setPicks({});
      setStage('questions');
    } catch (err) {
      setError(aiErrorMessage(err));
      setAsk({ known: [], questions: [] });
      setStage('questions');
    }
  };

  const answers = useMemo(() => {
    const list = (ask?.questions || [])
      .filter((q) => picks[q.id]?.length)
      .map((q) => ({ question: q.question, answer: picks[q.id].join(', ') }));
    if (extra.trim()) list.push({ question: 'Anything else', answer: extra.trim() });
    return list;
  }, [ask, picks, extra]);

  const getIdeas = async () => {
    if (!task) return;
    setStage('thinking');
    setError(null);
    setChosen(null);
    try {
      const r = await ai.planIdeas(brief, task, who, answers);
      setResult({ ...r, ideas: r.ideas.slice(0, 3) });
    } catch (err) {
      setError(aiErrorMessage(err));
      setResult(offlineIdeas(task, members, responses));
    }
    setStage('ideas');
  };

  if (!task) {
    return (
      <div className="page">
        <PageHeader title="Plan" onProfile={ui.openSettings} />
        <div className="grid grid-cols-2 gap-3">
          {(Object.keys(TASK) as PlanTask[]).map((t) => {
            const { label, hint, Art } = TASK[t];
            return (
              <button key={t} type="button" onClick={() => setTask(t)} className="card border-0 text-left px-4 pt-2 pb-4 flex flex-col transition-transform active:scale-[0.97]">
                <span className="-ml-2">
                  <Art size={104} />
                </span>
                <span className="t-head">{label}</span>
                <span className="t-small ink-2">{hint}</span>
              </button>
            );
          })}
        </div>
        {!myAnswers.favoriteCuisines?.length && (
          <button type="button" className="card w-full text-left py-3.5 px-4 mt-3 border-0 flex items-center gap-3 active:scale-[0.98] transition-transform" onClick={ui.openTastes}>
            <span className="flex-1">
              <span className="block font-semibold">Add your tastes</span>
              <span className="block t-small ink-2">Food, films and weekends</span>
            </span>
            <ChevronRight size={20} strokeWidth={2.2} className="ink-3" />
          </button>
        )}
        <SectionTitle>Can’t decide?</SectionTitle>
        <Coin />
      </div>
    );
  }

  const { title, Art } = TASK[task];

  return (
    <div className="page">
      <header className="flex items-center gap-2 pb-3">
        <button type="button" className="icon-btn shrink-0" onClick={reset} aria-label="Back to all plans">
          <ChevronLeft size={22} strokeWidth={2.4} />
        </button>
        <h1 className="t-title flex-1">{title}</h1>
        <span className="-my-4 -mr-2 shrink-0">
          <Art size={84} />
        </span>
      </header>

      <AnimatePresence mode="wait">
        <motion.div key={stage} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }}>
          {stage === 'who' && (
            <section className="card p-5">
              <h2 className="t-head">Who’s coming?</h2>
              <div className="flex flex-wrap gap-2 mt-3" role="group" aria-label="Who’s joining">
                {people.map((p) => {
                  const on = whoIds.includes(p.id);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      className="chip"
                      aria-pressed={on}
                      onClick={() => setWhoIds((w) => (on ? w.filter((id) => id !== p.id) : [...w, p.id]))}
                    >
                      <FlowerBadge style={p.style} size={26} ring={false} />
                      {p.name}
                    </button>
                  );
                })}
              </div>
              <button type="button" className="btn btn-primary btn-block mt-5" disabled={!who.length} onClick={start}>
                Continue
              </button>
            </section>
          )}

          {(stage === 'asking' || stage === 'thinking') && (
            <section className="card p-5 grid gap-3" aria-busy>
              <Thinking label={stage === 'asking' ? 'Checking what we know' : 'Finding three ideas'} />
              <div className="skeleton h-5 w-full" />
              <div className="skeleton h-5 w-5/6" />
              <div className="skeleton h-5 w-2/3" />
            </section>
          )}

          {stage === 'questions' && ask && (
            <div className="grid gap-4">
              {error && <p className="t-small px-1" style={{ color: 'var(--danger)' }}>{error}</p>}
              {ask.known.length > 0 && (
                <section className="stock stock-sky">
                  <h2 className="t-hand" style={{ fontSize: '0.9375rem' }}>We already know</h2>
                  <ul className="prose-ai t-small mt-1">
                    {ask.known.map((k, i) => (
                      <li key={i}>{k}</li>
                    ))}
                  </ul>
                </section>
              )}
              {ask.questions.map((q) => (
                <section key={q.id} className="card p-5">
                  <h2 className="t-head" style={{ fontSize: '1.125rem' }}>
                    {q.question}
                  </h2>
                  {q.multi && <p className="t-small ink-3">Pick any</p>}
                  <div
                    className="flex flex-wrap gap-2 mt-3"
                    role={q.multi ? 'group' : 'radiogroup'}
                    aria-label={q.question}
                    onKeyDown={q.multi ? undefined : (e) => onRovingKeyDown(e)}
                  >
                    {q.options.map((o, oi) => {
                      const on = picks[q.id]?.includes(o) || false;
                      return (
                        <button
                          key={o}
                          type="button"
                          className="chip"
                          role={q.multi ? undefined : 'radio'}
                          aria-checked={q.multi ? undefined : on}
                          tabIndex={q.multi ? undefined : rovingTabIndex(oi, q.options.indexOf(picks[q.id]?.[0] ?? ''))}
                          aria-pressed={q.multi ? on : undefined}
                          onClick={() =>
                            setPicks((p) => {
                              const cur = p[q.id] || [];
                              const nextVal = q.multi ? (on ? cur.filter((x) => x !== o) : [...cur, o]) : on ? [] : [o];
                              return { ...p, [q.id]: nextVal };
                            })
                          }
                        >
                          {o}
                        </button>
                      );
                    })}
                  </div>
                </section>
              ))}
              <label className="grid gap-2 px-1">
                <span className="t-label">Anything else?</span>
                <input className="field" value={extra} onChange={(e) => setExtra(e.target.value)} placeholder={task === 'eat' ? 'Nai Nai’s birthday, something soft…' : 'It might rain, we have a toddler…'} />
              </label>
              <button type="button" className="btn btn-primary btn-block" onClick={getIdeas}>
                Get three ideas
              </button>
            </div>
          )}

          {stage === 'ideas' && result && (
            <div className="grid gap-3">
              {error && <p className="t-small px-1" style={{ color: 'var(--danger)' }}>{error} Here are some simpler ideas.</p>}
              {result.ideas.map((idea, i) => (
                <IdeaCard key={i} idea={idea} index={i} chosen={chosen} byName={byName} />
              ))}
              <p className="t-small ink-3 px-1">{result.note} Ideas by AI: check times and prices before you go.</p>
              <div className="grid grid-cols-2 gap-2 mt-1">
                <PickForUs count={result.ideas.length} onPick={setChosen} />
                <button type="button" className="btn" onClick={() => setStage('questions')}>
                  Change answers
                </button>
              </div>
              <button type="button" className="btn btn-quiet" onClick={reset}>
                Plan something else
              </button>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

const IDEA_STOCK = ['stock-butter', 'stock-pink', 'stock-sky'];

/** One idea: the title and one line up front; the reasoning one tap away. */
function IdeaCard({ idea, index, chosen, byName }: { idea: PlanIdea; index: number; chosen: number | null; byName: ReturnType<typeof useFamily>['byName'] }) {
  const [open, setOpen] = useState(false);
  const isChosen = chosen === index;
  const people = idea.members.map(byName).filter(Boolean);
  return (
    <motion.article
      layout
      className="card overflow-hidden"
      animate={{ scale: isChosen ? 1.02 : 1, opacity: chosen !== null && !isChosen ? 0.5 : 1 }}
      style={{ outline: isChosen ? '3px solid var(--accent)' : 'none', outlineOffset: 3 }}
      aria-current={isChosen || undefined}
    >
      <div className={`px-5 pt-4 pb-4 ${IDEA_STOCK[index % 3]}`}>
        <div className="flex items-start justify-between gap-3">
          <h3 className="t-head">{idea.title}</h3>
          {people.length > 0 && (
            <span className="flex -space-x-2 shrink-0" aria-label={`Suits ${idea.members.join(', ')}`}>
              {people.slice(0, 4).map((p) => (
                <FlowerBadge key={p!.id} style={p!.style} size={30} />
              ))}
            </span>
          )}
        </div>
        {isChosen && <p className="t-hand mt-1">This one!</p>}
      </div>
      <div className="px-5 pt-3 pb-4">
        <p className="t-body">{idea.summary}</p>
        <button
          type="button"
          className="t-label mt-2 bg-transparent border-0 p-0 min-h-[44px] flex items-center gap-1"
          style={{ color: 'var(--accent-ink)' }}
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          {open ? 'Hide details' : 'Why it fits'}
          <ChevronDown size={16} strokeWidth={2.6} style={{ transform: open ? 'rotate(180deg)' : undefined, transition: 'transform 180ms' }} />
        </button>
        {open && (
          <div className="grid gap-2 pb-1">
            <p className="t-small ink-2">{idea.why}</p>
            <p className="t-small ink-2">
              <span className="font-bold" style={{ color: 'var(--ink)' }}>
                Trade-off:{' '}
              </span>
              {idea.tradeoff}
            </p>
          </div>
        )}
        {idea.check && (
          <p className="t-small mt-2 flex gap-2 items-start ink-2">
            <span aria-hidden className="mt-2 shrink-0 rounded-full" style={{ width: 12, height: 4, background: 'var(--yarn)', transform: 'rotate(-20deg)' }} />
            <span>
              <span className="font-bold" style={{ color: 'var(--ink)' }}>
                Check first:{' '}
              </span>
              {idea.check}
            </span>
          </p>
        )}
      </div>
    </motion.article>
  );
}

/** Lands on one idea after a short shuffle, like spinning a bottle. */
function PickForUs({ count, onPick }: { count: number; onPick: (i: number) => void }) {
  const [spinning, setSpinning] = useState(false);
  return (
    <button
      type="button"
      className="btn"
      disabled={spinning || count === 0}
      onClick={() => {
        setSpinning(true);
        const final = Math.floor(Math.random() * count);
        const steps = count * 3 + final;
        let i = 0;
        const tick = () => {
          onPick(i % count);
          i += 1;
          if (i <= steps) window.setTimeout(tick, 70 + i * 12);
          else setSpinning(false);
        };
        tick();
      }}
    >
      {spinning ? 'Choosing…' : 'Pick for us'}
    </button>
  );
}

/** Simple ideas from saved answers when the AI helper can't be reached. */
function offlineIdeas(task: PlanTask, members: Parameters<typeof calculateCommonGround>[0], responses: Parameters<typeof calculateCommonGround>[1]): PlanIdeas {
  const cg = calculateCommonGround(members, responses);
  if (task === 'eat') {
    return {
      ideas: cg.suggestedDinners.slice(0, 3).map((d) => ({ title: d.title, summary: d.cuisine, why: d.why, members: [], tradeoff: 'Picked from saved tastes, without the AI helper.', check: null })),
      note: 'Matched to the food everyone picked.',
    };
  }
  if (task === 'watch') {
    return {
      ideas: cg.suggestedMovies.slice(0, 3).map((m) => ({ title: m.title, summary: `${m.genre}, ${m.vibe.toLowerCase()}`, why: m.why, members: [], tradeoff: 'Picked from saved tastes, without the AI helper.', check: 'Check the age rating and where to watch it.' })),
      note: 'Matched to the film genres everyone picked.',
    };
  }
  const r = generateFamilyProfileReport(members, responses as never);
  return {
    ideas: r.ideasWorthTrying.slice(0, 3).map((i) => ({ title: i.title, summary: i.category, why: i.whyItFits, members: [], tradeoff: i.funTip, check: task === 'travel' ? 'Check travel times, costs and bookings.' : null })),
    note: 'Based on the mix of styles in your family.',
  };
}
