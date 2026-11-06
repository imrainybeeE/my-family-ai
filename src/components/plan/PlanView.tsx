import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronLeft, Sparkles } from 'lucide-react';
import { useHousehold } from '../../context/HouseholdContext';
import { useUI } from '../../App';
import { useFamily } from '../../hooks/useFamily';
import { ai, aiErrorMessage, PlanAsk, PlanIdea, PlanIdeas } from '../../services/ai';
import { calculateCommonGround } from '../../utils/tasteMatching';
import { generateFamilyProfileReport } from '../../utils/familyProfileAnalysis';
import { PageHeader } from '../layout/TabBar';
import { PlanTiles } from '../home/GardenView';
import { FlowerBadge } from '../art/Flower';
import { DoArt, EatArt, TravelArt, WatchArt } from '../art/Icons';
import { SectionTitle, Thinking } from '../ui/bits';
import { Coin } from './Coin';
import { PlanTask } from '../../types';

const TASK: Record<PlanTask, { title: string; Art: typeof EatArt }> = {
  eat: { title: 'What should we eat?', Art: EatArt },
  do: { title: 'What should we do?', Art: DoArt },
  watch: { title: 'What should we watch?', Art: WatchArt },
  travel: { title: 'Where should we travel?', Art: TravelArt },
};

type Stage = 'who' | 'asking' | 'questions' | 'thinking' | 'ideas';

export function PlanView({ initialTask, onConsumeTask }: { initialTask: PlanTask | null; onConsumeTask: () => void }) {
  const { brief, members, responses, myAnswers } = useHousehold();
  const ui = useUI();
  const { people, byName } = useFamily();
  const [task, setTask] = useState<PlanTask | null>(initialTask);
  const [stage, setStage] = useState<Stage>('who');
  const [who, setWho] = useState<string[]>(() => people.map((p) => p.name));
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
        <PageHeader title="Plan" subtitle="Ideas that fit everyone, using what your family already told the app." onProfile={ui.openSettings} />
        <PlanTiles onPick={(t) => setTask(t)} />
        {!myAnswers.favoriteCuisines?.length && (
          <button type="button" className="card w-full text-left p-4 mt-3 border-0 flex items-center gap-3 active:scale-[0.98] transition-transform" onClick={ui.openTastes}>
            <Sparkles size={22} style={{ color: 'var(--leaf)' }} />
            <span className="flex-1">
              <span className="block font-semibold">Add your tastes</span>
              <span className="block t-small ink-2">Favourite food, films and weekends make the ideas fit you better.</span>
            </span>
          </button>
        )}
        <SectionTitle>Stuck between two?</SectionTitle>
        <Coin />
      </div>
    );
  }

  const { title, Art } = TASK[task];

  return (
    <div className="page">
      <header className="flex items-center gap-3 px-1 pb-4">
        <button type="button" className="icon-btn" onClick={reset} aria-label="Back to all plans">
          <ChevronLeft size={22} strokeWidth={2.4} />
        </button>
        <h1 className="t-title flex-1">{title}</h1>
        <span className="sticker" style={{ background: '#fff7e0', width: 56, height: 56, transform: 'rotate(4deg)' }}>
          <Art size={42} />
        </span>
      </header>

      <AnimatePresence mode="wait">
        <motion.div key={stage} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }}>
          {stage === 'who' && (
            <section className="panel panel-card">
              <h2 className="t-head">Who’s joining?</h2>
              <div className="flex flex-wrap gap-2 mt-3" role="group" aria-label="Who’s joining">
                {people.map((p) => {
                  const on = who.includes(p.name);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      className="chip"
                      aria-pressed={on}
                      onClick={() => setWho((w) => (on ? w.filter((n) => n !== p.name) : [...w, p.name]))}
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
            <section className="panel panel-card grid gap-3" aria-busy>
              <Thinking label={stage === 'asking' ? 'Checking what we already know' : `Finding three ideas for ${who.length === people.length ? 'everyone' : who.join(', ')}`} />
              <div className="skeleton h-5 w-full" />
              <div className="skeleton h-5 w-5/6" />
              <div className="skeleton h-5 w-2/3" />
            </section>
          )}

          {stage === 'questions' && ask && (
            <div className="grid gap-4">
              {error && <p className="t-small px-1" style={{ color: 'var(--danger)' }}>{error}</p>}
              {ask.known.length > 0 && (
                <section className="panel panel-sky">
                  <h2 className="t-label opacity-80">What the app already knows</h2>
                  <ul className="prose-ai t-small mt-2">
                    {ask.known.map((k, i) => (
                      <li key={i}>{k}</li>
                    ))}
                  </ul>
                </section>
              )}
              {ask.questions.map((q) => (
                <section key={q.id} className="panel panel-card">
                  <h2 className="t-head" style={{ fontSize: '1.125rem' }}>
                    {q.question}
                  </h2>
                  {q.multi && <p className="t-small ink-3">Pick any that apply.</p>}
                  <div className="flex flex-wrap gap-2 mt-3" role={q.multi ? 'group' : 'radiogroup'} aria-label={q.question}>
                    {q.options.map((o) => {
                      const on = picks[q.id]?.includes(o) || false;
                      return (
                        <button
                          key={o}
                          type="button"
                          className="chip"
                          role={q.multi ? undefined : 'radio'}
                          aria-checked={q.multi ? undefined : on}
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
                <span className="t-label">Anything else? (optional)</span>
                <input className="field" value={extra} onChange={(e) => setExtra(e.target.value)} placeholder={task === 'eat' ? 'Nai Nai’s birthday, something soft…' : 'It might rain, we have a toddler…'} />
              </label>
              <button type="button" className="btn btn-primary btn-block" onClick={getIdeas}>
                <Sparkles size={19} strokeWidth={2.4} /> Get three ideas
              </button>
            </div>
          )}

          {stage === 'ideas' && result && (
            <div className="grid gap-3">
              {error && <p className="t-small px-1" style={{ color: 'var(--danger)' }}>{error} Here are some simpler ideas.</p>}
              {result.ideas.map((idea, i) => (
                <IdeaCard key={i} idea={idea} index={i} chosen={chosen} byName={byName} />
              ))}
              <p className="t-small ink-2 px-1">{result.note}</p>
              <p className="t-small ink-3 px-1">AI ideas based on your answers. Check opening times, prices and bookings yourself before you go.</p>
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

function IdeaCard({ idea, index, chosen, byName }: { idea: PlanIdea; index: number; chosen: number | null; byName: ReturnType<typeof useFamily>['byName'] }) {
  const isChosen = chosen === index;
  const people = idea.members.map(byName).filter(Boolean);
  return (
    <motion.article
      layout
      className="card p-5"
      animate={{ scale: isChosen ? 1.02 : 1, opacity: chosen !== null && !isChosen ? 0.55 : 1 }}
      style={{ outline: isChosen ? '3px solid var(--leaf)' : 'none', outlineOffset: 2 }}
      aria-current={isChosen || undefined}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="t-label" style={{ color: 'var(--leaf-ink)' }}>
            {isChosen ? 'The garden picked this one' : `Idea ${index + 1}`}
          </p>
          <h3 className="t-head mt-0.5">{idea.title}</h3>
        </div>
        {people.length > 0 && (
          <span className="flex -space-x-2 shrink-0" aria-label={`Suits ${idea.members.join(', ')}`}>
            {people.slice(0, 4).map((p) => (
              <FlowerBadge key={p!.id} style={p!.style} size={30} />
            ))}
          </span>
        )}
      </div>
      <p className="t-body mt-2">{idea.summary}</p>
      <p className="t-small ink-2 mt-2">
        <span className="font-bold" style={{ color: 'var(--ink)' }}>
          Why it fits:{' '}
        </span>
        {idea.why}
      </p>
      <p className="t-small ink-2 mt-1.5">
        <span className="font-bold" style={{ color: 'var(--ink)' }}>
          Trade-off:{' '}
        </span>
        {idea.tradeoff}
      </p>
      {idea.check && (
        <p className="t-small mt-3 rounded-xl px-3 py-2" style={{ background: 'var(--sun-bg)', color: 'var(--sun-ink)' }}>
          <span className="font-bold">Check first: </span>
          {idea.check}
        </p>
      )}
    </motion.article>
  );
}

/** Lands on one idea after a short shuffle, like spinning a bottle. */
function PickForUs({ count, onPick }: { count: number; onPick: (i: number) => void }) {
  const [spinning, setSpinning] = useState(false);
  return (
    <button
      type="button"
      className="btn btn-sun"
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
