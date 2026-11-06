import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { RefreshCw, Share2 } from 'lucide-react';
import { useHousehold } from '../../context/HouseholdContext';
import { useUI } from '../../App';
import { useAiResource, useFamily } from '../../hooks/useFamily';
import { ai, aiErrorMessage, Spark } from '../../services/ai';
import { PageHeader } from '../layout/TabBar';
import { PopupGarden } from '../art/PopupGarden';
import { Flower, FlowerBadge, Sprout } from '../art/Flower';
import { DoArt, EatArt, TravelArt, WatchArt } from '../art/Icons';
import { SeedPacket } from '../onboarding/SeedPacket';
import { CopyButton, SectionTitle, useToast } from '../ui/bits';
import { advancedProgress, joinNames } from '../../utils/member';
import { PlanTask } from '../../types';

export function GardenView() {
  const { household, isDemo } = useHousehold();
  const ui = useUI();
  const { people, bloomed } = useFamily();
  const waiting = people.filter((p) => !p.style);

  const subtitle =
    bloomed.length === 0
      ? 'Nobody has bloomed yet. Be the first.'
      : waiting.length === 0
        ? `All ${people.length} of you are in bloom.`
        : `${bloomed.length} of ${people.length} in bloom. ${joinNames(waiting.map((p) => p.name))} ${waiting.length === 1 ? 'hasn’t' : 'haven’t'} started yet.`;

  return (
    <div className="page">
      <PageHeader title={household?.name || 'Our family'} subtitle={subtitle} onProfile={ui.openSettings} />

      <PopupGarden
        plants={people.map((p) => ({ id: p.id, name: p.name, style: p.style, isYou: p.isYou }))}
        onSelect={ui.openMember}
      />

      <NextStep />
      <TableQuestion />

      <SectionTitle>Plan something together</SectionTitle>
      <PlanTiles onPick={ui.startPlan} />

      <SectionTitle>Invite the family</SectionTitle>
      <SeedPacket code={household?.code || ''} name={household?.name} styles={people.map((p) => p.style)}>
        <div className="grid grid-cols-2 gap-2">
          <CopyButton value={household?.code || ''} label="Copy code" />
          <ShareButton code={household?.code || ''} disabled={isDemo} />
        </div>
      </SeedPacket>
    </div>
  );
}

function ShareButton({ code, disabled }: { code: string; disabled?: boolean }) {
  const toast = useToast();
  return (
    <button
      type="button"
      className="btn btn-sm btn-primary"
      disabled={disabled}
      onClick={async () => {
        const text = `Join our family garden on My Family AI. Our family code is ${code}.`;
        try {
          if (navigator.share) await navigator.share({ title: 'My Family AI', text, url: window.location.origin });
          else {
            await navigator.clipboard.writeText(`${text} ${window.location.origin}`);
            toast('Invite copied');
          }
        } catch {
          // Share sheet dismissed.
        }
      }}
    >
      <Share2 size={17} strokeWidth={2.4} />
      Share
    </button>
  );
}

/** The single most useful next thing for the person holding the phone. */
function NextStep() {
  const { myAnswers, selectActiveMember } = useHousehold();
  const ui = useUI();
  const { people } = useFamily();
  const toast = useToast();
  const adv = advancedProgress(myAnswers);
  const waiting = people.filter((p) => !p.style && !p.isYou);

  let panel = 'panel-sun';
  let art: React.ReactNode = <Sprout size={92} />;
  let title = '';
  let body = '';
  let action = '';
  let onAction = () => {};
  let meta: string | null = null;

  if (!myAnswers.discoveryProfile) {
    title = 'Find your flower';
    body = '18 quick picks in six short sections. No wrong answers, and it takes about five minutes.';
    action = 'Start';
    onAction = ui.openFoundation;
    meta = 'Foundation not started';
  } else if (!adv.complete) {
    panel = 'panel-lilac';
    art = <Flower style={myAnswers.discoveryProfile.primaryStyle} size={92} stem={40} />;
    title = 'Grow deeper roots';
    body = 'Twelve bigger questions about support, decisions and dream days. The AI helper asks a follow-up only when it helps.';
    action = adv.done ? 'Keep going' : 'Start';
    onAction = ui.openRoots;
    meta = `Foundation complete. Advanced: ${adv.done} of ${adv.total} answered`;
  } else if (waiting.length) {
    const next = waiting[0];
    panel = 'panel-sky';
    title = `${next.name} hasn’t bloomed yet`;
    body = `Pass the phone to ${next.name} so they can find their flower, or send them your family code.`;
    action = `Pass the phone to ${next.name}`;
    onAction = async () => {
      await selectActiveMember(next.id);
      toast(`Hi ${next.name}! This phone is yours for now.`);
    };
  } else {
    panel = 'panel-petal';
    art = <Flower style="Connector" size={92} stem={30} />;
    title = 'Your garden is in full bloom';
    body = 'Everyone has found their flower. See what you have in common.';
    action = 'See what we share';
    onAction = () => ui.goTab('together');
  }

  return (
    <motion.section
      className={`panel ${panel} mt-4`}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25 }}
      aria-label={title}
    >
      <div className="absolute -right-3 -bottom-4 pointer-events-none" aria-hidden>
        {art}
      </div>
      <div className="relative pr-20">
        <h2 className="t-title">{title}</h2>
        <p className="t-small mt-2 opacity-90">{body}</p>
        {meta && <p className="t-label mt-3 opacity-75">{meta}</p>}
        <button type="button" className={`btn ${panel === 'panel-sun' ? 'btn-ink' : 'btn-primary'} mt-4`} onClick={onAction}>
          {action}
        </button>
      </div>
    </motion.section>
  );
}

const OFFLINE_SPARKS: Spark[] = [
  { question: 'What was the best moment of your week, and who was there?', why: 'A favourite for any family table.', members: [] },
  { question: 'If we had a free Saturday with no plans, how would you want to spend it?', why: 'A favourite for any family table.', members: [] },
  { question: 'What’s something you’ve learned recently that surprised you?', why: 'A favourite for any family table.', members: [] },
];

function TableQuestion() {
  const { brief } = useHousehold();
  const { byName } = useFamily();
  const today = new Date().toISOString().slice(0, 10);
  const [recent, setRecent] = useState<string[]>([]);
  const input = useMemo(() => ({ brief, today }), [brief, today]);
  const spark = useAiResource('spark', input, (signal) => ai.spark(brief, recent, signal));
  const fallback = OFFLINE_SPARKS[new Date().getDate() % OFFLINE_SPARKS.length];
  const data = spark.data || (spark.error ? fallback : null);

  return (
    <section className="panel panel-petal mt-4" aria-label="Tonight’s table question" aria-busy={spark.loading}>
      <div className="flex items-center justify-between gap-2">
        <h2 className="t-label opacity-80">Tonight’s table question</h2>
        <button
          type="button"
          className="icon-btn"
          style={{ background: 'color-mix(in srgb, var(--card) 70%, transparent)' }}
          aria-label="Another question"
          disabled={spark.loading}
          onClick={() => {
            if (spark.data) setRecent((r) => [spark.data!.question, ...r].slice(0, 6));
            spark.refresh();
          }}
        >
          <motion.span animate={spark.loading ? { rotate: 360 } : { rotate: 0 }} transition={spark.loading ? { duration: 1, repeat: Infinity, ease: 'linear' } : {}}>
            <RefreshCw size={18} strokeWidth={2.4} />
          </motion.span>
        </button>
      </div>
      {data && !spark.loading ? (
        <motion.div key={data.question} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
          <p className="t-title mt-2" style={{ fontSize: '1.5rem' }}>
            {data.question}
          </p>
          <div className="flex items-center gap-2 mt-3">
            {data.members.length > 0 && (
              <span className="flex -space-x-2" aria-hidden>
                {data.members.slice(0, 4).map((n) => (
                  <FlowerBadge key={n} style={byName(n)?.style} size={28} />
                ))}
              </span>
            )}
            <p className="t-small opacity-85">{spark.error ? `${aiErrorMessage(spark.error)}` : data.why}</p>
          </div>
        </motion.div>
      ) : (
        <div className="mt-3 grid gap-2" aria-hidden>
          <div className="skeleton h-6 w-11/12" />
          <div className="skeleton h-6 w-3/4" />
          <div className="skeleton h-4 w-1/2 mt-2" />
        </div>
      )}
    </section>
  );
}

const TILES: { task: PlanTask; label: string; hint: string; Art: typeof EatArt; tint: string }[] = [
  { task: 'eat', label: 'Eat', hint: 'What’s for dinner', Art: EatArt, tint: '#ffe1d8' },
  { task: 'do', label: 'Do', hint: 'A day or an evening', Art: DoArt, tint: '#d9f2e3' },
  { task: 'watch', label: 'Watch', hint: 'Film night', Art: WatchArt, tint: '#ffe2ec' },
  { task: 'travel', label: 'Travel', hint: 'A trip away', Art: TravelArt, tint: '#dcf0fa' },
];

export function PlanTiles({ onPick }: { onPick: (t: PlanTask) => void }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {TILES.map(({ task, label, hint, Art, tint }) => (
        <button
          key={task}
          type="button"
          onClick={() => onPick(task)}
          className="card text-left p-4 border-0 transition-transform active:scale-[0.97] flex flex-col gap-2"
          style={{ minHeight: 132 }}
        >
          <span className="sticker" style={{ background: tint, width: 64, height: 64, transform: `rotate(${task === 'do' || task === 'travel' ? 3 : -3}deg)` }}>
            <Art size={48} />
          </span>
          <span className="t-head mt-1">{label}</span>
          <span className="t-small ink-2 -mt-1.5">{hint}</span>
        </button>
      ))}
    </div>
  );
}
