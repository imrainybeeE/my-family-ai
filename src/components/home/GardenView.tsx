import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { RefreshCw, Share2 } from 'lucide-react';
import { useHousehold } from '../../context/HouseholdContext';
import { useUI } from '../../App';
import { useAiResource, useFamily } from '../../hooks/useFamily';
import { ai, aiErrorMessage, Spark } from '../../services/ai';
import { PageHeader } from '../layout/TabBar';
import { Garland } from '../art/Garland';
import { Felt, FELT_FOR_STYLE } from '../art/Flower';
import { DoArt, EatArt, TravelArt, WatchArt } from '../art/Icons';
import { CopyButton, SectionTitle, useToast } from '../ui/bits';
import { CodeCard } from '../onboarding/CodeCard';
import { advancedProgress } from '../../utils/member';
import { PlanTask } from '../../types';

export function GardenView() {
  const { household } = useHousehold();
  const ui = useUI();
  const { people } = useFamily();

  return (
    <div className="page">
      <PageHeader title={household?.name || 'Our family'} onProfile={ui.openSettings} demoNote />
      <Garland plants={people.map((p) => ({ id: p.id, name: p.name, style: p.style, isYou: p.isYou }))} onSelect={ui.openMember} />
      <NextStep />
      <TableQuestion />
      <SectionTitle>Plan something</SectionTitle>
      <PlanTiles onPick={ui.startPlan} />
      <div className="mt-8">
        <FamilyCode />
      </div>
    </div>
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
  const mine = myAnswers.discoveryProfile?.primaryStyle;

  let step: { art: React.ReactNode; title: string; detail: string; action: string; run: () => void };
  if (!mine) {
    step = { art: <Felt name="bud" size={76} />, title: 'Find your flower', detail: '18 quick picks', action: 'Start', run: ui.openFoundation };
  } else if (!adv.complete) {
    step = {
      art: <Felt name={FELT_FOR_STYLE[mine]} size={76} />,
      title: 'Deeper roots',
      detail: adv.done ? `${adv.done} of ${adv.total} answered` : `${adv.total} bigger questions`,
      action: adv.done ? 'Continue' : 'Start',
      run: ui.openRoots,
    };
  } else if (waiting.length) {
    const next = waiting[0];
    step = {
      art: <Felt name="bud" size={76} />,
      title: `${next.name}’s turn`,
      detail: 'Pass the phone over',
      action: `Switch to ${next.name}`,
      run: async () => {
        await selectActiveMember(next.id);
        toast(`Hi ${next.name}`);
      },
    };
  } else {
    step = { art: <Felt name="daisy" size={76} />, title: 'Everyone’s in bloom', detail: 'See what you share', action: 'Open', run: () => ui.goTab('together') };
  }

  return (
    <motion.section
      className="card mt-2 flex items-center gap-3 py-3 pl-2 pr-4"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.7 }}
      aria-label={step.title}
    >
      <span className="shrink-0 -my-2">{step.art}</span>
      <span className="flex-1 min-w-0">
        <span className="block t-head">{step.title}</span>
        <span className="block t-small ink-2">{step.detail}</span>
      </span>
      <button type="button" className="btn btn-primary btn-sm shrink-0" onClick={step.run}>
        {step.action}
      </button>
    </motion.section>
  );
}

const OFFLINE_SPARKS: Spark[] = [
  { question: 'What was the best moment of your week?', why: '', members: [] },
  { question: 'How would you spend a free Saturday?', why: '', members: [] },
  { question: 'What surprised you this week?', why: '', members: [] },
];

/** Tonight's question, on an index card taped to the page. */
function TableQuestion() {
  const { brief } = useHousehold();
  const today = new Date().toISOString().slice(0, 10);
  const [recent, setRecent] = useState<string[]>([]);
  const input = useMemo(() => ({ brief, today }), [brief, today]);
  const spark = useAiResource('spark', input, (signal) => ai.spark(brief, recent, signal));
  const fallback = OFFLINE_SPARKS[new Date().getDate() % OFFLINE_SPARKS.length];
  const data = spark.data || (spark.error ? fallback : null);

  return (
    <section className="card mt-8 px-5 pt-6 pb-5" aria-label="Tonight’s table question" aria-busy={spark.loading}>
      <span className="tape" style={{ top: -10, left: '50%', marginLeft: -38, transform: 'rotate(-2deg)' }} aria-hidden />
      <div className="flex items-center justify-between gap-2">
        <h2 className="t-hand ink-2">
          Tonight at the table
        </h2>
        <button
          type="button"
          className="icon-btn -my-2 -mr-2"
          style={{ boxShadow: 'none', background: 'transparent' }}
          aria-label="Another question"
          disabled={spark.loading}
          onClick={() => {
            if (spark.data) setRecent((r) => [spark.data!.question, ...r].slice(0, 6));
            spark.refresh();
          }}
        >
          <motion.span animate={spark.loading ? { rotate: 360 } : { rotate: 0 }} transition={spark.loading ? { duration: 1, repeat: Infinity, ease: 'linear' } : {}}>
            <RefreshCw size={18} strokeWidth={2.2} />
          </motion.span>
        </button>
      </div>
      {data && !spark.loading ? (
        <motion.p key={data.question} className="t-title mt-1" style={{ fontSize: '1.375rem', lineHeight: '26px' }} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
          {data.question}
        </motion.p>
      ) : (
        <div className="mt-2 grid gap-2" aria-hidden>
          <div className="skeleton h-7 w-11/12" />
          <div className="skeleton h-7 w-2/3" />
        </div>
      )}
      {Boolean(spark.error) && <p className="t-small ink-3 mt-2">{aiErrorMessage(spark.error)}</p>}
    </section>
  );
}

const TILES: { task: PlanTask; label: string; Art: typeof EatArt }[] = [
  { task: 'eat', label: 'Eat', Art: EatArt },
  { task: 'do', label: 'Do', Art: DoArt },
  { task: 'watch', label: 'Watch', Art: WatchArt },
  { task: 'travel', label: 'Travel', Art: TravelArt },
];

/** Four felt pieces on the page. Each one starts a plan. */
export function PlanTiles({ onPick }: { onPick: (t: PlanTask) => void }) {
  return (
    <div className="grid grid-cols-4 -mx-2">
      {TILES.map(({ task, label, Art }) => (
        <button
          key={task}
          type="button"
          onClick={() => onPick(task)}
          className="flex flex-col items-center gap-1 bg-transparent border-0 py-1 rounded-2xl transition-transform active:scale-95"
          aria-label={`Plan: ${label}`}
        >
          <Art size={84} />
          <span className="t-label">{label}</span>
        </button>
      ))}
    </div>
  );
}

/** The family code, with copy and share. The demo family has nothing to share. */
function FamilyCode() {
  const { household, isDemo } = useHousehold();
  const toast = useToast();
  const code = household?.code || '';
  return (
    <CodeCard code={code}>
      <div className={`grid gap-2 ${isDemo ? '' : 'grid-cols-2'}`}>
        <CopyButton value={code} label="Copy" />
        {!isDemo && (
          <button
            type="button"
            className="btn btn-sm btn-primary"
            onClick={async () => {
              const text = `Join our family on My Family AI with the code ${code}.`;
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
            <Share2 size={17} strokeWidth={2.2} />
            Share
          </button>
        )}
      </div>
    </CodeCard>
  );
}
