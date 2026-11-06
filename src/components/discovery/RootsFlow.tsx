import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronLeft } from 'lucide-react';
import { Sheet } from '../ui/Sheet';
import { Thinking } from '../ui/bits';
import { Flower } from '../art/Flower';
import { useHousehold } from '../../context/HouseholdContext';
import { ADVANCED_QUESTIONS } from '../../data/advancedQuestions';
import { ai } from '../../services/ai';
import { memberName } from '../../utils/member';
import { AdvancedAnswer } from '../../types';

type Stage = 'intro' | 'ask' | 'reflect' | 'done';

export function RootsFlow({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { activeMember, myAnswers, updateMyAnswers, brief } = useHousehold();
  const [stage, setStage] = useState<Stage>('intro');
  const [index, setIndex] = useState(0);
  const [text, setText] = useState('');
  const [reflection, setReflection] = useState<{ text: string; followUp: string | null } | null>(null);
  const [reflecting, setReflecting] = useState(false);
  const [followText, setFollowText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const saved = myAnswers.advancedAnswers || {};
  const savedRef = useRef(saved);
  savedRef.current = saved;
  const name = activeMember ? memberName(activeMember) : 'You';
  const q = ADVANCED_QUESTIONS[index];
  const answeredCount = ADVANCED_QUESTIONS.filter((x) => saved[x.id]).length;

  useEffect(() => {
    if (!open) return;
    const firstOpen = ADVANCED_QUESTIONS.findIndex((x) => !savedRef.current[x.id]);
    setIndex(firstOpen === -1 ? 0 : firstOpen);
    setStage('intro');
    setReflection(null);
    setError(null);
  }, [open]);

  useEffect(() => {
    setText(saved[q.id]?.answer || '');
    setFollowText('');
    // Only when the question changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  const write = (id: string, value: AdvancedAnswer) =>
    updateMyAnswers({ advancedAnswers: { ...savedRef.current, [id]: value } });

  const next = async () => {
    setReflection(null);
    if (index < ADVANCED_QUESTIONS.length - 1) {
      setIndex((i) => i + 1);
      setStage('ask');
    } else {
      setStage('done');
      if (!myAnswers.advancedCompletedAt) await updateMyAnswers({ advancedCompletedAt: new Date().toISOString() });
    }
  };

  const submit = async () => {
    const answer = text.trim();
    if (!answer) return;
    setError(null);
    const entry: AdvancedAnswer = { answer, answeredAt: new Date().toISOString() };
    try {
      await write(q.id, entry);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Couldn’t save that answer.');
      return;
    }
    setStage('reflect');
    setReflecting(true);
    try {
      const r = await ai.roots(brief, name, q.question, answer, false);
      setReflection({ text: r.reflection, followUp: r.followUp });
      await write(q.id, { ...entry, reflection: r.reflection });
    } catch {
      setReflection({ text: 'Thanks. That’s saved for your family to see.', followUp: null });
    } finally {
      setReflecting(false);
    }
  };

  const submitFollowUp = async () => {
    const a = followText.trim();
    const current = savedRef.current[q.id];
    if (!a || !reflection?.followUp || !current) return next();
    try {
      await write(q.id, { ...current, followUpQuestion: reflection.followUp, followUpAnswer: a });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Couldn’t save that answer.');
      return;
    }
    next();
  };

  const quickPicks = q.options || q.starters || [];

  return (
    <Sheet
      open={open}
      onClose={onClose}
      full
      title={stage === 'done' ? 'Deeper roots' : 'Advanced discovery'}
      leading={
        stage === 'ask' ? (
          <button type="button" className="icon-btn" aria-label="Previous question" onClick={() => (index === 0 ? setStage('intro') : setIndex((i) => i - 1))}>
            <ChevronLeft size={22} strokeWidth={2.4} />
          </button>
        ) : undefined
      }
    >
      <AnimatePresence mode="wait" initial={false}>
        {stage === 'intro' && (
          <motion.div key="intro" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="grid gap-5 pt-2">
            <div className="panel panel-lilac">
              <div className="absolute -right-2 -bottom-3" aria-hidden>
                <RootsArt size={120} />
              </div>
              <div className="pr-24">
                <h3 className="t-title">Grow deeper roots</h3>
                <p className="t-small mt-2">Twelve bigger questions about feeling appreciated, support, decisions and your perfect family day.</p>
              </div>
            </div>
            <ul className="prose-ai t-body ink-2 px-1">
              <li>Answer in your own words, or tap a quick pick.</li>
              <li>Skip anything you’d rather not answer. There’s no score.</li>
              <li>Sometimes the AI helper asks one short follow-up when a detail would help your family plan.</li>
              <li>Your family can see these answers, and the AI helper uses them for ideas.</li>
            </ul>
            <p className="t-label px-1" style={{ color: 'var(--leaf-ink)' }}>
              {myAnswers.advancedCompletedAt ? 'Advanced complete. ' : ''}
              {answeredCount} of {ADVANCED_QUESTIONS.length} answered
            </p>
            <button type="button" className="btn btn-primary btn-block" onClick={() => setStage('ask')}>
              {answeredCount ? 'Keep going' : 'Start'}
            </button>
          </motion.div>
        )}

        {stage === 'ask' && (
          <motion.div key={`q${q.id}`} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.22 }} className="grid gap-4 pt-1">
            <div>
              <p className="t-label" style={{ color: 'var(--leaf-ink)' }}>
                {q.theme}
              </p>
              <p className="t-small ink-3 mt-0.5">
                Question {index + 1} of {ADVANCED_QUESTIONS.length}
              </p>
              <h3 className="t-title mt-3">{q.question}</h3>
            </div>
            {quickPicks.length > 0 && (
              <div className="flex flex-wrap gap-2" role={q.options ? 'radiogroup' : 'group'} aria-label={q.options ? 'Choose one' : 'Quick picks'}>
                {quickPicks.map((o) => {
                  const on = q.options ? text === o : false;
                  return (
                    <button
                      key={o}
                      type="button"
                      className="chip"
                      role={q.options ? 'radio' : undefined}
                      aria-checked={q.options ? on : undefined}
                      onClick={() => setText(q.options ? o : text ? `${text} ${o}` : o)}
                    >
                      {o}
                    </button>
                  );
                })}
              </div>
            )}
            <label className="grid gap-2">
              <span className="t-label ink-2">{q.options ? 'Or say it your way' : 'Your answer'}</span>
              <textarea className="field" rows={4} maxLength={600} value={text} onChange={(e) => setText(e.target.value)} placeholder="Type as much or as little as you like" />
            </label>
            {error && (
              <p role="alert" className="t-small" style={{ color: 'var(--danger)' }}>
                {error}
              </p>
            )}
            <div className="grid grid-cols-[1fr_2fr] gap-2">
              <button type="button" className="btn" onClick={next}>
                Skip
              </button>
              <button type="button" className="btn btn-primary" disabled={!text.trim()} onClick={submit}>
                Save answer
              </button>
            </div>
          </motion.div>
        )}

        {stage === 'reflect' && (
          <motion.div key={`r${q.id}`} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="grid gap-4 pt-2">
            <div className="card p-4">
              <p className="t-small ink-3">{q.question}</p>
              <p className="t-body font-semibold mt-1">{text.trim()}</p>
            </div>
            <div className="flex gap-2.5 items-start">
              <span className="shrink-0 w-9 h-9 rounded-full grid place-items-center" style={{ background: 'var(--lilac-bg)' }} aria-hidden>
                <Flower style="Thinker" size={28} />
              </span>
              <div className="card px-4 py-3.5 flex-1" style={{ borderRadius: '6px 22px 22px 22px' }} aria-live="polite">
                {reflecting ? (
                  <Thinking label="Listening" />
                ) : (
                  <>
                    <p className="t-body">{reflection?.text}</p>
                    {reflection?.followUp && <p className="t-body font-semibold mt-2">{reflection.followUp}</p>}
                  </>
                )}
              </div>
            </div>
            {!reflecting && reflection?.followUp && (
              <label className="grid gap-2">
                <span className="sr-only">{reflection.followUp}</span>
                <textarea className="field" rows={3} maxLength={600} value={followText} onChange={(e) => setFollowText(e.target.value)} placeholder="Answer if you like" />
              </label>
            )}
            {error && (
              <p role="alert" className="t-small" style={{ color: 'var(--danger)' }}>
                {error}
              </p>
            )}
            {!reflecting && (
              <button type="button" className="btn btn-primary btn-block" onClick={reflection?.followUp && followText.trim() ? submitFollowUp : next}>
                {reflection?.followUp && followText.trim() ? 'Save and continue' : index === ADVANCED_QUESTIONS.length - 1 ? 'Finish' : 'Next question'}
              </button>
            )}
          </motion.div>
        )}

        {stage === 'done' && (
          <motion.div key="done" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid gap-5 pt-6 text-center justify-items-center">
            <RootsArt size={180} />
            <h3 className="t-title">Advanced complete</h3>
            <p className="t-body ink-2 max-w-[22rem]">
              Your roots are in. The AI helper can now use these answers for ideas and plans. You can change any answer later from your profile.
            </p>
            <button type="button" className="btn btn-primary btn-block" onClick={onClose}>
              Back to the garden
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </Sheet>
  );
}

function RootsArt({ size = 120 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" aria-hidden style={{ overflow: 'visible' }}>
      <rect x="0" y="70" width="120" height="50" rx="10" fill="#6d4c3d" opacity=".85" />
      <g stroke="#f1e2c2" strokeWidth="2.4" fill="none" strokeLinecap="round">
        <path d="M60 72 C 58 84, 50 92, 40 104 M60 72 C 62 86, 72 94, 84 108 M60 72 C 60 88, 58 100, 60 116 M48 92 C 40 92, 32 96, 24 94 M74 94 C 84 92, 92 96, 100 92" />
      </g>
      <g transform="translate(22 -8) scale(.76)">
        <path d="M50 100 C 52 90, 48 80, 50 62" stroke="#2f7a4f" strokeWidth="4" fill="none" strokeLinecap="round" />
        <path d="M50 84 C 62 74, 74 78, 80 70 C 70 88, 60 90, 50 88 Z" fill="#7cc48f" stroke="var(--art-ink)" strokeWidth="2" strokeLinejoin="round" />
        {[0, 51, 103, 154, 206, 257, 309].map((r) => (
          <ellipse key={r} cx="50" cy="28" rx="7" ry="15" fill="#bba8f5" stroke="var(--art-ink)" strokeWidth="2" transform={`rotate(${r} 50 44)`} />
        ))}
        <circle cx="50" cy="44" r="9" fill="#ffd23f" stroke="var(--art-ink)" strokeWidth="2.2" />
      </g>
    </svg>
  );
}
