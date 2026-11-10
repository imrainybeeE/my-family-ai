import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ChevronLeft } from 'lucide-react';
import { Sheet } from '../ui/Sheet';
import { QuestionHeading, Thinking } from '../ui/bits';
import { onRovingKeyDown, rovingTabIndex } from '../ui/roving';
import { SpecimenCard } from '../profile/SpecimenCard';
import { Flower } from '../art/Flower';
import { YarnProgress } from '../art/YarnProgress';
import { useHousehold } from '../../context/HouseholdContext';
import { useUI } from '../../App';
import { FOUNDATION_QUESTIONS, FOUNDATION_SECTIONS, STYLE_MAPPING_CONFIG } from '../../data/foundationQuestions';
import { petalsFor, scoreDiscoveryProfile } from '../../utils/discoveryScoring';
import { PETAL, PetalMark, StitchedFlower } from '../art/StitchedFlower';
import { Felt } from '../art/Flower';
import { buildBrief } from '../../services/brief';
import { ai } from '../../services/ai';
import { feel } from '../../feel/feel';
import { PetalBurst } from '../art/PetalBurst';
import { FLOWERS } from '../../data/flowers';
import { memberName } from '../../utils/member';
import { BloomNote, DiscoveryProfile, DiscoveryStyleId } from '../../types';

/** Each section has its own card stock colour, so a new section is felt at a glance. */
const SECTION_STOCK: Record<string, string> = {
  'Free Time & Me Time': 'stock-lilac',
  Food: 'stock-butter',
  'Travel & Experiences': 'stock-sky',
  'Interests & Together Time': 'stock-mint',
  'How I Approach Things': 'stock-coral',
  'Family & Support': 'stock-pink',
};

/** A few petals to show how the flower grows, before any answers. */
const INTRO_PETALS: DiscoveryStyleId[] = ['Explorer', 'Creator', 'Connector', 'Achiever', 'Chiller', 'Thinker'];

const SECTION_LABEL: Record<string, string> = {
  'Free Time & Me Time': 'Free time and me time',
  Food: 'Food',
  'Travel & Experiences': 'Travel and experiences',
  'Interests & Together Time': 'Interests and together time',
  'How I Approach Things': 'How I approach things',
  'Family & Support': 'Family and support',
};

type Stage = 'intro' | 'ask' | 'blooming' | 'reveal';
interface Flight {
  id: number;
  style: DiscoveryStyleId;
  x: number;
  y: number;
  dx: number;
  dy: number;
}
let flightId = 0;
/** How long a petal is in the air, in seconds. */
const FLIGHT = 0.44;
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
  const [limitNudge, setLimitNudge] = useState(0);
  useEffect(() => setLimitNudge(0), [index]);
  // Petals in the air: each pick flies from its answer to the flower, then is sewn on.
  const [flights, setFlights] = useState<Flight[]>([]);
  const flowerRef = useRef<HTMLDivElement>(null);
  const [spin, setSpin] = useState(0);
  // Latest answers and the pending auto-advance, so a quick change of mind always wins and
  // Back or Close cancels the move.
  const answersRef = useRef<Answers>({});
  answersRef.current = answers;
  const advanceTimer = useRef<number | null>(null);
  // Where the bloom's flower lands on the result card, measured as the reveal begins.
  const bloomBox = useRef<HTMLDivElement>(null);
  const [landing, setLanding] = useState<{ y: number; origin: string }>({ y: -150, origin: '50% 50%' });
  const cancelAdvance = () => {
    if (advanceTimer.current !== null) window.clearTimeout(advanceTimer.current);
    advanceTimer.current = null;
  };
  useEffect(() => cancelAdvance, [index, stage, open]);
  // The chime lands as the flower opens.
  const reduceMotion = useReducedMotion();
  // Sound isn't motion, so reduced-motion users still hear it, just sooner. Closing cancels it.
  useEffect(() => {
    if (stage !== 'blooming' || !open) return;
    if (!reduceMotion) feel('gather');
    const t = window.setTimeout(() => feel('bloom'), reduceMotion ? 150 : 780);
    return () => window.clearTimeout(t);
  }, [stage, open, reduceMotion]);
  // The finish run in flight: its reveal timer and bloom-note request. Closing, switching person or
  // starting again ends it, so nothing from it lands on a newer run or another person.
  const runRef = useRef<{ timer: number | null; abort: AbortController } | null>(null);
  const endRun = () => {
    if (runRef.current?.timer != null) window.clearTimeout(runRef.current.timer);
    runRef.current?.abort.abort();
    runRef.current = null;
  };
  useEffect(() => endRun, [open, draftKey]);

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
  const petals = petalsFor(answers);
  const value = answers[String(q.id)];
  const selected = Array.isArray(value) ? value : value ? [value] : [];
  const answered = selected.length > 0;
  const name = activeMember ? memberName(activeMember) : 'You';

  const finish = async (final: Answers) => {
    endRun();
    const run = { timer: null as number | null, abort: new AbortController() };
    runRef.current = run;
    const live = () => runRef.current === run;
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
      if (!live()) return;
      setSaveError(err instanceof Error ? err.message : 'Couldn’t save your answers.');
      setStage('ask');
      return;
    }
    if (!live()) return;
    // The bloom is the app's one big moment: the sewn flower comes to the middle and winds itself
    // tight, the real one springs open and throws its petals as its colour washes over the page,
    // and only then does the result card arrive.
    run.timer = window.setTimeout(() => {
      if (!live()) return;
      measureLanding();
      setStage('reveal');
    }, Math.max(0, (reduceMotion ? 900 : 2600) - (Date.now() - started)));

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
      const r = await ai.bloom(brief, name, run.abort.signal);
      if (!live()) return;
      const bloomNote: BloomNote = { ...r, forProfileAt: p.completedAt };
      setNote(bloomNote);
      setNoteState('idle');
      await updateMyAnswers({ bloomNote });
    } catch {
      if (live()) setNoteState('failed');
    }
  };

  /**
   * The opened flower flies to where the card's flower will be, so the two read as one. The card's
   * flower centre sits 136px below the top of the sheet body: 8px padding, 8px gap, 16px of tape and
   * half the 208px flower panel.
   */
  const measureLanding = () => {
    const box = bloomBox.current;
    const body = box?.closest('.sheet-body');
    const holder = box?.parentElement;
    if (!box || !body || !holder) return;
    const b = box.getBoundingClientRect();
    const h = holder.getBoundingClientRect();
    const target = body.getBoundingClientRect().top + 136;
    setLanding({ y: target - (b.top + b.height / 2), origin: `50% ${b.top + b.height / 2 - h.top}px` });
  };

  const goNext = () => {
    cancelAdvance();
    const latest = answersRef.current;
    const v = latest[String(q.id)];
    if (!(Array.isArray(v) ? v.length : v)) return;
    if (index < FOUNDATION_QUESTIONS.length - 1) {
      // A bead slides down the yarn when a section is finished.
      if (FOUNDATION_QUESTIONS[index + 1].section !== q.section) {
        feel('bead');
        setSpin((n) => n + 1);
      }
      setIndex((i) => i + 1);
    } else {
      // A tap you can feel as the flower starts (iOS only plays haptics from a tap).
      feel('select');
      finish(latest);
    }
  };

  /** Picks an option. A tap or click on a single-choice question moves on after a beat. */
  const fly = (option: string, from: Element | null) => {
    const style = STYLE_MAPPING_CONFIG[q.id]?.[option]?.[0];
    const seed = from?.querySelector('.seed')?.getBoundingClientRect();
    const target = flowerRef.current?.getBoundingClientRect();
    if (!style || !seed || !target || reduceMotion) return;
    const x = seed.left + seed.width / 2;
    const y = seed.top + seed.height / 2;
    setFlights((f) => [...f, { id: ++flightId, style, x, y, dx: target.left + target.width / 2 - x, dy: target.top + target.height / 2 - y }]);
  };

  const choose = (option: string, byPointer: boolean, from: Element | null = null) => {
    const id = String(q.id);
    if (q.isMultiSelect) {
      const max = q.maxSelections || 2;
      const removing = selected.includes(option);
      // A full question refuses a third pick (with a nudge) rather than quietly dropping the first.
      if (!removing && selected.length >= max) {
        feel('error');
        setLimitNudge((n) => n + 1);
        return;
      }
      const next = removing ? selected.filter((o) => o !== option) : [...selected, option];
      feel(removing ? 'tap' : 'stitch');
      if (!removing) fly(option, from);
      setAnswers((a) => ({ ...a, [id]: next }));
      return;
    }
    if (answersRef.current[id] !== option) {
      feel('stitch');
      fly(option, from);
    }
    const next = { ...answersRef.current, [id]: option };
    answersRef.current = next;
    setAnswers(next);
    cancelAdvance();
    // Long enough to watch the petal land before the next question slides in.
    if (byPointer) advanceTimer.current = window.setTimeout(goNext, reduceMotion ? 380 : 620);
  };

  const title = stage === 'reveal' || stage === 'blooming' ? 'Your flower' : 'Find your flower';
  // The stage takes about a fifth of the screen, so six answers still fit under it on a small phone.
  const stageSize = Math.round(Math.min(150, Math.max(96, window.innerHeight * 0.2 - 30)));

  return (
    <Sheet
      open={open}
      onClose={onClose}
      full
      title={title}
      hideTitle={stage === 'ask'}
      tone={stage === 'ask' ? `stage-tone ${SECTION_STOCK[q.section]}` : undefined}
      wash={(stage === 'blooming' || stage === 'reveal') && profile ? `color-mix(in srgb, ${FLOWERS[profile.primaryStyle].color} 22%, var(--wash-base))` : null}
      washDelay={reduceMotion ? 0 : 0.74}
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
            <YarnProgress progress={(index + (answered ? 1 : 0)) / FOUNDATION_QUESTIONS.length} beads={FOUNDATION_SECTIONS.length} label={`${index + 1} of ${FOUNDATION_QUESTIONS.length}`} />
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
            <StitchedFlower petals={INTRO_PETALS} size={200} />
            <h3 className="t-display mt-4">Sew your flower</h3>
            <p className="t-body ink-2 mt-2 max-w-[19rem]">18 quick picks. Every answer stitches on a petal. Your family can see your answers.</p>
            {myAnswers.discoveryProfile && <p className="t-small ink-3 mt-2">This replaces your current flower.</p>}
            <button type="button" className="btn btn-primary btn-block mt-8" onClick={() => setStage('ask')}>
              {index > 0 ? `Continue from ${index + 1}` : 'Start'}
            </button>
          </motion.div>
        )}

        {stage === 'ask' && (
          <motion.div key="ask" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
            {/* The stage: the flower being sewn, on the section's card stock. It stays put while the questions change. */}
            <div className={`quiz-stage ${SECTION_STOCK[q.section]}`}>
              <AnimatePresence mode="wait" initial={false}>
                <motion.p key={q.section} className="t-hand quiz-stage-label" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }}>
                  {SECTION_LABEL[q.section]}
                </motion.p>
              </AnimatePresence>
              <div ref={flowerRef} className="quiz-stage-flower">
                <StitchedFlower petals={petals} size={stageSize} landDelay={flights.length ? FLIGHT - 0.06 : 0} spin={spin} />
              </div>
            </div>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div key={`q${q.id}`} initial={{ opacity: 0, x: 28 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -28 }} transition={{ duration: 0.2, ease: [0.3, 0.7, 0.4, 1] }} className="pt-5">
                <QuestionHeading text={q.question} />
              <motion.p
                key={limitNudge}
                className="t-small ink-2 mt-1.5"
                aria-live="polite"
                animate={limitNudge ? { x: [0, -6, 6, -4, 4, 0] } : undefined}
                transition={{ duration: 0.36 }}
              >
                {q.isMultiSelect
                  ? selected.length >= (q.maxSelections || 2)
                    ? `${selected.length} of ${q.maxSelections || 2} picked${limitNudge ? '. Tap one to swap it.' : ''}`
                    : `Pick up to ${q.maxSelections || 2}`
                  : q.subtitle}
                <span className="sr-only">. Question {index + 1} of {FOUNDATION_QUESTIONS.length}.</span>
              </motion.p>
            {saveError && (
              <p role="alert" className="t-small mt-3" style={{ color: 'var(--danger)' }}>
                {saveError}
              </p>
            )}
            <div
              className="grid gap-2 mt-4"
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
                    onClick={(e) => choose(o, e.detail > 0, e.currentTarget)}
                  >
                    <PetalMark on={on} style={STYLE_MAPPING_CONFIG[q.id]?.[o]?.[0]} />
                    <span className="flex-1">{o}</span>
                  </button>
                );
              })}
            </div>
              </motion.div>
            </AnimatePresence>
          </motion.div>
        )}

      </AnimatePresence>
      {/* The bloom hands over to the result card: the two overlap, the leaving one lifted out of the flow. */}
      <AnimatePresence mode="popLayout">
        {stage === 'blooming' && profile && (
          <motion.div
            key="blooming"
            initial={{ opacity: 1 }}
            // The opened flower flies to its place on the card and shrinks to the card's size (168 of 230),
            // while the card fades in under it: one flower, never a blank frame.
            style={{ transformOrigin: landing.origin, zIndex: 5, position: 'relative' }}
            exit={reduceMotion ? { opacity: 0, transition: { duration: 0.15 } } : { y: landing.y, scale: 168 / 230, opacity: [1, 1, 0], transition: { duration: 0.42, ease: [0.3, 0.7, 0.4, 1], opacity: { duration: 0.46, times: [0, 0.88, 1] } } }}
            className="grid place-items-center place-content-center text-center gap-4 min-h-[calc(100dvh-160px-var(--safe-t)-var(--safe-b))]"
          >
            <div ref={bloomBox} className="relative grid place-items-center" style={{ width: 240, height: 240 }}>
              {/* The flower you sewed comes down from the stage, then winds itself tight. */}
              <motion.div
                className="absolute"
                initial={reduceMotion ? { opacity: 1 } : { opacity: 1, y: -190, scale: 0.6, rotate: 0 }}
                animate={reduceMotion ? { opacity: 0 } : { y: [-190, 0, 0], scale: [0.6, 1, 0.4], rotate: [0, 30, 560], opacity: [1, 1, 0] }}
                transition={reduceMotion ? { duration: 0.15 } : { duration: 0.9, times: [0, 0.38, 1], ease: [[0.2, 0.8, 0.3, 1], [0.7, 0, 0.9, 0.5]] }}
              >
                <StitchedFlower petals={petals} size={220} sewn />
              </motion.div>
              {/* The petals fly out from under the flower's rim once it is mostly open. */}
              <PetalBurst styles={[profile.primaryStyle, profile.secondaryStyle]} delay={0.86} count={14} floor={112} />
              <div className="relative">
                <Flower style={profile.primaryStyle} size={230} bloom delay={reduceMotion ? 0.15 : 0.74} />
              </div>
            </div>
            <motion.div className="relative" initial={{ opacity: 0, y: reduceMotion ? 0 : 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, transition: { duration: 0.1 } }} transition={{ delay: reduceMotion ? 0.25 : 1.55, duration: reduceMotion ? 0.2 : 0.4 }}>
              <p className="t-title">{FLOWERS[profile.primaryStyle].flower}</p>
              <p className="t-body ink-2 mt-1">{profile.primaryStyle}</p>
            </motion.div>
          </motion.div>
        )}

        {stage === 'reveal' && profile && (
          <motion.div key="reveal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: reduceMotion ? 0.2 : 0.32 }} className="grid gap-5 pt-2">
            <SpecimenCard name={name} top={profile.primaryStyle} second={profile.secondaryStyle} bloom pinOnly />
            <section className="card p-5" aria-live="polite" aria-label="A note for you">
              {noteState === 'loading' && (
                <div className="mt-2">
                  <Thinking label="Reading your picks" />
                </div>
              )}
              {note && (
                <>
                  <p className="t-body">{note.note}</p>
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
      {createPortal(
        flights.map((f) => (
          <motion.span
            key={f.id}
            className="petal-flight"
            style={{ left: f.x - 17, top: f.y - 17 }}
            initial={{ x: 0, y: 0, rotate: 25, scale: 1 }}
            animate={{ x: f.dx, y: f.dy, rotate: 25 + (f.dx > 0 ? 200 : -200), scale: 1.5 }}
            transition={{ duration: FLIGHT, x: { duration: FLIGHT, ease: [0.5, 0, 0.9, 0.6] }, y: { duration: FLIGHT, ease: [0.2, 0.9, 0.4, 1] } }}
            onAnimationComplete={() => setFlights((all) => all.filter((x) => x.id !== f.id))}
            aria-hidden
          >
            <Felt name={PETAL[f.style]} size={34} />
          </motion.span>
        )),
        document.body
      )}
    </Sheet>
  );
}

