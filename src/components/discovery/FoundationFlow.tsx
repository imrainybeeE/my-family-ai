import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronLeft } from 'lucide-react';
import { Sheet } from '../ui/Sheet';
import { SeedMark, Thinking } from '../ui/bits';
import { onRovingKeyDown, rovingTabIndex } from '../ui/roving';
import { SpecimenCard } from '../profile/SpecimenCard';
import { Felt, FeltName, Flower } from '../art/Flower';
import { useWidth } from '../art/Garland';
import { useHousehold } from '../../context/HouseholdContext';
import { useUI } from '../../App';
import { FOUNDATION_QUESTIONS, FOUNDATION_SECTIONS } from '../../data/foundationQuestions';
import { scoreDiscoveryProfile } from '../../utils/discoveryScoring';
import { buildBrief } from '../../services/brief';
import { ai } from '../../services/ai';
import { memberName } from '../../utils/member';
import { BloomNote, DiscoveryProfile } from '../../types';

const SECTION_LOOK: Record<string, { stock: string; art: FeltName }> = {
  'Free Time & Me Time': { stock: 'stock-lilac', art: 'lavender' },
  Food: { stock: 'stock-butter', art: 'eat' },
  'Travel & Experiences': { stock: 'stock-sky', art: 'travel' },
  'Interests & Together Time': { stock: 'stock-mint', art: 'do' },
  'How I Approach Things': { stock: 'stock-coral', art: 'iris' },
  'Family & Support': { stock: 'stock-pink', art: 'daisy' },
};

const SECTION_LABEL: Record<string, string> = {
  'Free Time & Me Time': 'Free time and me time',
  Food: 'Food',
  'Travel & Experiences': 'Travel and experiences',
  'Interests & Together Time': 'Interests and together time',
  'How I Approach Things': 'How I approach things',
  'Family & Support': 'Family and support',
};

type Stage = 'intro' | 'ask' | 'blooming' | 'reveal';
type Answers = Record<string, string | string[]>;

export function FoundationFlow({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { activeMember, myAnswers, updateMyAnswers, household, members, responses } = useHousehold();
  const ui = useUI();
  const draftKey = `mfa:foundation-draft:${activeMember?.id}`;
  const [stage, setStage] = useState<Stage>('intro');
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [profile, setProfile] = useState<DiscoveryProfile | null>(null);
  const [note, setNote] = useState<BloomNote | null>(null);
  const [noteState, setNoteState] = useState<'idle' | 'loading' | 'failed'>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);
  // Latest answers and the pending auto-advance, so a quick change of mind always wins and
  // Back or Close cancels the move.
  const answersRef = useRef<Answers>({});
  answersRef.current = answers;
  const advanceTimer = useRef<number | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const cancelAdvance = () => {
    if (advanceTimer.current !== null) window.clearTimeout(advanceTimer.current);
    advanceTimer.current = null;
  };
  useEffect(() => cancelAdvance, [index, stage, open]);
  useEffect(() => {
    if (stage === 'ask') headingRef.current?.focus({ preventScroll: true });
  }, [index, stage]);

  useEffect(() => {
    if (!open) return;
    let draft: { answers: Answers; index: number } | null = null;
    try {
      draft = JSON.parse(sessionStorage.getItem(draftKey) || 'null');
    } catch {
      // ignore
    }
    setAnswers(draft?.answers || {});
    setIndex(draft?.index || 0);
    setStage('intro');
    setProfile(null);
    setNote(null);
    setNoteState('idle');
    setSaveError(null);
  }, [open, draftKey]);

  useEffect(() => {
    if (stage !== 'ask') return;
    try {
      sessionStorage.setItem(draftKey, JSON.stringify({ answers, index }));
    } catch {
      // ignore
    }
  }, [answers, index, stage, draftKey]);

  const q = FOUNDATION_QUESTIONS[index];
  const value = answers[String(q.id)];
  const selected = Array.isArray(value) ? value : value ? [value] : [];
  const answered = selected.length > 0;
  const sectionIndex = FOUNDATION_SECTIONS.indexOf(q.section as (typeof FOUNDATION_SECTIONS)[number]);
  const name = activeMember ? memberName(activeMember) : 'You';

  const finish = async (final: Answers) => {
    setStage('blooming');
    setSaveError(null);
    const p = scoreDiscoveryProfile(final);
    setProfile(p);
    const started = Date.now();
    try {
      await updateMyAnswers({ foundationAnswers: final, discoveryProfile: p, bloomNote: undefined });
      try {
        sessionStorage.removeItem(draftKey);
      } catch {
        // ignore
      }
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Couldn’t save your answers.');
      setStage('ask');
      return;
    }
    window.setTimeout(() => setStage('reveal'), Math.max(0, 1700 - (Date.now() - started)));

    // Ask the AI for a personal note about this bloom, then keep it with the answers.
    if (!activeMember) return;
    setNoteState('loading');
    const brief = buildBrief(
      household?.name,
      members,
      { ...responses, [activeMember.id]: { ...myAnswers, foundationAnswers: final, discoveryProfile: p } },
      activeMember.id
    );
    try {
      const r = await ai.bloom(brief, name);
      const bloomNote: BloomNote = { ...r, forProfileAt: p.completedAt };
      setNote(bloomNote);
      setNoteState('idle');
      await updateMyAnswers({ bloomNote });
    } catch {
      setNoteState('failed');
    }
  };

  const goNext = () => {
    cancelAdvance();
    const latest = answersRef.current;
    const v = latest[String(q.id)];
    if (!(Array.isArray(v) ? v.length : v)) return;
    if (index < FOUNDATION_QUESTIONS.length - 1) setIndex((i) => i + 1);
    else finish(latest);
  };

  /** Picks an option. A tap or click on a single-choice question moves on after a beat. */
  const choose = (option: string, byPointer: boolean) => {
    const id = String(q.id);
    if (q.isMultiSelect) {
      const max = q.maxSelections || 2;
      const next = selected.includes(option) ? selected.filter((o) => o !== option) : selected.length >= max ? [...selected.slice(1), option] : [...selected, option];
      setAnswers((a) => ({ ...a, [id]: next }));
      return;
    }
    const next = { ...answersRef.current, [id]: option };
    answersRef.current = next;
    setAnswers(next);
    cancelAdvance();
    if (byPointer) advanceTimer.current = window.setTimeout(goNext, 380);
  };

  const title = stage === 'reveal' ? 'Your flower' : 'Find your flower';

  return (
    <Sheet
      open={open}
      onClose={onClose}
      full
      title={title}
      hideTitle={stage === 'ask'}
      leading={
        stage === 'ask' ? (
          <div className="flex-1 flex items-center gap-2">
            <button
              type="button"
              className="icon-btn"
              onClick={() => {
                cancelAdvance();
                if (index === 0) setStage('intro');
                else setIndex((i) => i - 1);
              }}
              aria-label="Previous question"
            >
              <ChevronLeft size={22} strokeWidth={2.4} />
            </button>
            <Vine progress={(index + (answered ? 1 : 0)) / FOUNDATION_QUESTIONS.length} section={sectionIndex} />
          </div>
        ) : undefined
      }
      footer={
        stage === 'ask' ? (
          <button type="button" className="btn btn-primary btn-block" disabled={!answered} onClick={goNext}>
            {index === FOUNDATION_QUESTIONS.length - 1 ? 'See my flower' : 'Next'}
          </button>
        ) : undefined
      }
    >
      <AnimatePresence mode="wait" initial={false}>
        {stage === 'intro' && (
          <motion.div key="intro" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center text-center pt-6">
            <Felt name="bud" size={180} />
            <h3 className="t-display mt-2">18 quick picks</h3>
            <p className="t-body ink-2 mt-2 max-w-[19rem]">Pick what sounds most like you today. Your family can see your answers.</p>
            {myAnswers.discoveryProfile && <p className="t-small ink-3 mt-2">This replaces your current flower.</p>}
            <button type="button" className="btn btn-primary btn-block mt-8" onClick={() => setStage('ask')}>
              {index > 0 ? `Continue from ${index + 1}` : 'Start'}
            </button>
          </motion.div>
        )}

        {stage === 'ask' && (
          <motion.div key={`q${q.id}`} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.22 }} className="pt-1">
            <section className={`stock ${SECTION_LOOK[q.section].stock} pr-24`}>
              <span className="absolute -right-2 -top-3" aria-hidden>
                <Felt name={SECTION_LOOK[q.section].art} size={104} />
              </span>
              <p className="t-hand" style={{ fontSize: '0.9375rem' }}>
                {SECTION_LABEL[q.section]}
              </p>
              <h3 ref={headingRef} tabIndex={-1} className="t-title mt-1.5 outline-none">
                {q.question}
              </h3>
              <p className="t-small mt-2 opacity-80">
                {q.isMultiSelect ? `Pick up to ${q.maxSelections || 2}` : q.subtitle}
                <span className="sr-only">. Question {index + 1} of {FOUNDATION_QUESTIONS.length}.</span>
              </p>
            </section>
            {saveError && (
              <p role="alert" className="t-small mt-3" style={{ color: 'var(--danger)' }}>
                {saveError}
              </p>
            )}
            <div
              className="grid gap-2.5 mt-5"
              role={q.isMultiSelect ? 'group' : 'radiogroup'}
              aria-label={q.question}
              onKeyDown={q.isMultiSelect ? undefined : (e) => onRovingKeyDown(e)}
            >
              {q.options.map((o, i) => {
                const on = selected.includes(o);
                return (
                  <button
                    key={o}
                    type="button"
                    role={q.isMultiSelect ? 'checkbox' : 'radio'}
                    aria-checked={on}
                    tabIndex={q.isMultiSelect ? undefined : rovingTabIndex(i, q.options.indexOf(selected[0]))}
                    className="option"
                    onClick={(e) => choose(o, e.detail > 0)}
                  >
                    <SeedMark on={on} />
                    <span className="flex-1">{o}</span>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}

        {stage === 'blooming' && profile && (
          <motion.div key="blooming" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="grid place-items-center text-center pt-24 gap-4">
            <Flower style={profile.primaryStyle} size={220} bloom delay={0.3} />
            <p className="t-head ink-2">Stitching your flower…</p>
          </motion.div>
        )}

        {stage === 'reveal' && profile && (
          <motion.div key="reveal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid gap-5 pt-2">
            <SpecimenCard name={name} top={profile.primaryStyle} second={profile.secondaryStyle} bloom />
            <section className="card p-5" aria-live="polite">
              <p className="t-hand ink-2">A note for you</p>
              {noteState === 'loading' && (
                <div className="mt-2">
                  <Thinking label="Reading your picks" />
                </div>
              )}
              {note && (
                <>
                  <h3 className="t-head mt-1">{note.headline}</h3>
                  <p className="t-body ink-2 mt-2">{note.note}</p>
                  <p className="t-small mt-3 stock stock-butter" style={{ padding: '10px 12px', boxShadow: 'none' }}>
                    <span className="font-bold">Try this week: </span>
                    {note.tryThis}
                  </p>
                </>
              )}
              {noteState === 'failed' && <p className="t-small ink-2 mt-2">The note didn’t load. Your flower is saved.</p>}
            </section>
            <div className="grid gap-2">
              <button type="button" className="btn btn-primary btn-block" onClick={() => { onClose(); ui.openRoots(); }}>
                Grow deeper roots
              </button>
              <button type="button" className="btn btn-block" onClick={() => { onClose(); ui.goTab('garden'); }}>
                Done
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Sheet>
  );
}

/** A strand of yarn that grows across the top as you answer, with a bead for each section. */
function Vine({ progress, section }: { progress: number; section: number }) {
  const [ref, w] = useWidth<HTMLDivElement>(240);
  const d = `M 6 22 C ${w * 0.2} 12, ${w * 0.32} 32, ${w * 0.5} 22 S ${w * 0.8} 12, ${w - 6} 22`;
  return (
    <div ref={ref} className="flex-1 relative h-11" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)} aria-label="Progress">
      <svg width={w} height={44} className="absolute inset-0 overflow-visible" aria-hidden>
        <path d={d} stroke="var(--line-strong)" strokeWidth="2" fill="none" strokeLinecap="round" strokeDasharray="2 6" />
        <motion.path d={d} stroke="var(--yarn)" strokeWidth="3.4" fill="none" strokeLinecap="round" initial={false} animate={{ pathLength: Math.max(progress, 0.02) }} transition={{ type: 'spring', stiffness: 120, damping: 20 }} />
      </svg>
      <div className="absolute inset-0 flex justify-between items-center px-[9%]" aria-hidden>
        {FOUNDATION_SECTIONS.map((s, i) => {
          const done = i < section || (i === section && progress >= (i + 1) / 6);
          return (
            <motion.span
              key={s}
              className="block rounded-full"
              animate={{ scale: done ? 1 : 0.8 }}
              style={{ width: 11, height: 11, marginTop: [6, -10, 4, -6, 8, -4][i], background: done ? 'var(--yarn)' : 'var(--card)', boxShadow: done ? 'none' : 'inset 0 0 0 1.5px var(--line-strong)' }}
            />
          );
        })}
      </div>
    </div>
  );
}
