import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronLeft } from 'lucide-react';
import { Sheet } from '../ui/Sheet';
import { SeedMark, Thinking } from '../ui/bits';
import { onRovingKeyDown, rovingTabIndex } from '../ui/roving';
import { SpecimenCard } from '../profile/SpecimenCard';
import { Flower, Sprout } from '../art/Flower';
import { DoArt, EatArt, TravelArt } from '../art/Icons';
import { useHousehold } from '../../context/HouseholdContext';
import { useUI } from '../../App';
import { FOUNDATION_QUESTIONS, FOUNDATION_SECTIONS } from '../../data/foundationQuestions';
import { scoreDiscoveryProfile } from '../../utils/discoveryScoring';
import { buildBrief } from '../../services/brief';
import { ai } from '../../services/ai';
import { memberName } from '../../utils/member';
import { BloomNote, DiscoveryProfile } from '../../types';

const SECTION_LOOK: Record<string, { panel: string; art: React.ReactNode }> = {
  'Free Time & Me Time': { panel: 'panel-lilac', art: <Flower style="Chiller" size={52} /> },
  Food: { panel: 'panel-sun', art: <Sticker tint="#ffe1d8"><EatArt size={40} /></Sticker> },
  'Travel & Experiences': { panel: 'panel-sky', art: <Sticker tint="#fff4cc"><TravelArt size={40} /></Sticker> },
  'Interests & Together Time': { panel: 'panel-mint', art: <Sticker tint="#ffe2ec"><DoArt size={40} /></Sticker> },
  'How I Approach Things': { panel: 'panel-poppy', art: <Flower style="Thinker" size={52} /> },
  'Family & Support': { panel: 'panel-petal', art: <Flower style="Connector" size={52} /> },
};

function Sticker({ tint, children }: { tint: string; children: React.ReactNode }) {
  return (
    <span className="sticker" style={{ background: tint, width: 54, height: 54, borderRadius: 16, transform: 'rotate(-6deg)' }}>
      {children}
    </span>
  );
}

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
          <motion.div key="intro" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="grid gap-5 pt-2">
            <div className="panel panel-sun">
              <div className="absolute right-2 -bottom-2" aria-hidden>
                <Sprout size={110} />
              </div>
              <div className="pr-24">
                <h3 className="t-title">18 quick picks</h3>
                <p className="t-small mt-2">Six short sections about free time, food, trips, interests, how you do things and family. Pick what sounds most like you today.</p>
              </div>
            </div>
            <ol className="grid gap-2">
              {FOUNDATION_SECTIONS.map((s, i) => (
                <li key={s} className="card px-4 py-3 flex items-center gap-3">
                  <Leaf filled={false} />
                  <span className="flex-1 font-semibold">{SECTION_LABEL[s]}</span>
                  <span className="t-small ink-3">3 questions</span>
                  <span className="sr-only">Section {i + 1}</span>
                </li>
              ))}
            </ol>
            <p className="t-small ink-2 px-1">
              You’ll get a top style and a second style, each shown as a flower. It’s a fun discovery profile from this app, not a psychological test. Your family can see your answers.
            </p>
            {myAnswers.discoveryProfile && <p className="t-small ink-2 px-1">Your new answers will replace your current flower.</p>}
            <button type="button" className="btn btn-primary btn-block" onClick={() => setStage('ask')}>
              {index > 0 ? `Continue from question ${index + 1}` : 'Start'}
            </button>
          </motion.div>
        )}

        {stage === 'ask' && (
          <motion.div key={`q${q.id}`} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.22 }} className="pt-1">
            <section className={`panel ${SECTION_LOOK[q.section].panel}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="t-label">{SECTION_LABEL[q.section]}</p>
                  <p className="t-small opacity-75 mt-0.5">
                    Question {index + 1} of {FOUNDATION_QUESTIONS.length}
                  </p>
                </div>
                <div className="-mt-1 -mr-1 shrink-0" aria-hidden>
                  {SECTION_LOOK[q.section].art}
                </div>
              </div>
              <h3 ref={headingRef} tabIndex={-1} className="t-title mt-2 outline-none">
                {q.question}
              </h3>
              <p className="t-small mt-2 opacity-90">
                {q.isMultiSelect ? `Pick up to ${q.maxSelections || 2}.${selected.length ? ` ${selected.length} of ${q.maxSelections || 2} picked.` : ''}` : q.subtitle}
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
            <Flower style={profile.primaryStyle} size={170} stem={50} bloom delay={0.3} />
            <p className="t-head">Your flower is opening…</p>
          </motion.div>
        )}

        {stage === 'reveal' && profile && (
          <motion.div key="reveal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid gap-5 pt-2">
            <SpecimenCard name={name} top={profile.primaryStyle} second={profile.secondaryStyle} bloom />
            <section className="card p-5" aria-live="polite">
              <p className="t-label" style={{ color: 'var(--leaf-ink)' }}>
                A note from the AI helper
              </p>
              {noteState === 'loading' && (
                <div className="mt-2">
                  <Thinking label="Reading your picks" />
                </div>
              )}
              {note && (
                <>
                  <h3 className="t-head mt-1">{note.headline}</h3>
                  <p className="t-body ink-2 mt-2">{note.note}</p>
                  <p className="t-small mt-3 rounded-xl px-3 py-2" style={{ background: 'var(--sun-bg)', color: 'var(--sun-ink)' }}>
                    <span className="font-bold">Try this week: </span>
                    {note.tryThis}
                  </p>
                </>
              )}
              {noteState === 'failed' && <p className="t-small ink-2 mt-2">The AI helper couldn’t write your note this time. Your flower is saved either way.</p>}
            </section>
            <div className="grid gap-2">
              <button type="button" className="btn btn-primary btn-block" onClick={() => { onClose(); ui.openRoots(); }}>
                Grow deeper roots
              </button>
              <button type="button" className="btn btn-block" onClick={() => { onClose(); ui.goTab('garden'); }}>
                Back to the garden
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Sheet>
  );
}

/** A vine that grows along the top as you answer; one leaf per section. */
function Vine({ progress, section }: { progress: number; section: number }) {
  return (
    <div className="flex-1 relative h-11" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)} aria-label="Progress">
      <svg viewBox="0 0 240 44" className="w-full h-full" preserveAspectRatio="none" aria-hidden>
        <path d="M4 26 C 44 14, 76 36, 120 24 S 196 14, 236 24" stroke="var(--line-strong)" strokeWidth="3" fill="none" strokeLinecap="round" strokeDasharray="2 7" />
        <motion.path
          d="M4 26 C 44 14, 76 36, 120 24 S 196 14, 236 24"
          stroke="#2f7a4f"
          strokeWidth="3.6"
          fill="none"
          strokeLinecap="round"
          initial={false}
          animate={{ pathLength: Math.max(progress, 0.02) }}
          transition={{ type: 'spring', stiffness: 120, damping: 20 }}
        />
      </svg>
      <div className="absolute inset-0 flex justify-between items-center px-[6%]" aria-hidden>
        {FOUNDATION_SECTIONS.map((s, i) => (
          <motion.span key={s} animate={{ scale: i <= section ? 1 : 0.7, opacity: i <= section ? 1 : 0.5 }} style={{ marginTop: i % 2 ? -14 : 10 }}>
            <Leaf filled={i < section || (i === section && progress >= (i + 1) / 6)} />
          </motion.span>
        ))}
      </div>
    </div>
  );
}

function Leaf({ filled }: { filled: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden>
      <path d="M3 17 C 3 8, 9 3, 17 3 C 17 11, 12 17, 3 17 Z" fill={filled ? '#7cc48f' : 'var(--card)'} stroke="var(--art-ink)" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M4 16 L 12 8" stroke="var(--art-ink)" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}
