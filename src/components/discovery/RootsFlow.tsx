import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronLeft } from 'lucide-react';
import { Sheet } from '../ui/Sheet';
import { Thinking } from '../ui/bits';
import { onRovingKeyDown, rovingTabIndex } from '../ui/roving';
import { Felt } from '../art/Flower';
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
      title="Deeper roots"
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
          <motion.div key="intro" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="grid gap-8 pt-2">
            <div className="flex flex-col items-center text-center pt-4">
              <Felt name="yarnball" size={200} />
              <h3 className="t-display -mt-2">{ADVANCED_QUESTIONS.length} bigger questions</h3>
              <p className="t-body ink-2 mt-2 max-w-[19rem]">Type your own answer or tap a pick. Skip anything you like.</p>
              {answeredCount > 0 && (
                <p className="t-label mt-3" style={{ color: 'var(--accent-ink)' }}>
                  {answeredCount} of {ADVANCED_QUESTIONS.length} answered
                </p>
              )}
            </div>
            <button type="button" className="btn btn-primary btn-block" onClick={() => setStage('ask')}>
              {answeredCount ? 'Keep going' : 'Start'}
            </button>
          </motion.div>
        )}

        {stage === 'ask' && (
          <motion.div key={`q${q.id}`} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.22 }} className="grid gap-4 pt-1">
            <section className="stock stock-lilac">
              <div className="flex items-baseline justify-between gap-3">
                <p className="t-hand" style={{ fontSize: '0.9375rem' }}>
                  {q.theme}
                </p>
                <p className="t-small opacity-70 tabular-nums">
                  {index + 1} of {ADVANCED_QUESTIONS.length}
                </p>
              </div>
              <h3 className="t-title mt-1.5">{q.question}</h3>
            </section>
            {quickPicks.length > 0 && (
              <div
                className="flex flex-wrap gap-2"
                role={q.options ? 'radiogroup' : 'group'}
                aria-label={q.options ? 'Choose one' : 'Quick picks'}
                onKeyDown={q.options ? (e) => onRovingKeyDown(e) : undefined}
              >
                {quickPicks.map((o, oi) => {
                  const on = q.options ? text === o : false;
                  return (
                    <button
                      key={o}
                      type="button"
                      className="chip"
                      role={q.options ? 'radio' : undefined}
                      aria-checked={q.options ? on : undefined}
                      tabIndex={q.options ? rovingTabIndex(oi, q.options.indexOf(text)) : undefined}
                      onClick={() => setText(q.options ? o : text ? `${text} ${o}` : o)}
                    >
                      {o}
                    </button>
                  );
                })}
              </div>
            )}
            <label className="grid gap-2">
              <span className="t-label ink-2">{q.options ? 'Or in your words' : 'Your answer'}</span>
              <textarea className="field" rows={4} maxLength={600} value={text} onChange={(e) => setText(e.target.value)} placeholder="As much or as little as you like" />
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
                Save
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
              <span className="shrink-0 w-9 h-9 grid place-items-center -mt-0.5" aria-hidden>
                <Felt name="yarnball" size={52} />
              </span>
              <div className="card px-4 py-3.5 flex-1" style={{ borderRadius: '6px 20px 20px 20px' }} aria-live="polite">
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
            <Felt name="yarnball" size={200} />
            <h3 className="t-display -mt-2">All done</h3>
            <p className="t-body ink-2 max-w-[19rem]">Plans and ideas will use these now. Change any answer from your profile.</p>
            <button type="button" className="btn btn-primary btn-block mt-4" onClick={onClose}>
              Done
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </Sheet>
  );
}
