import React, { useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { motion } from 'motion/react';
import { Sheet } from '../ui/Sheet';
import { SpecimenCard } from './SpecimenCard';
import { useHousehold } from '../../context/HouseholdContext';
import { useUI } from '../../App';
import { Sprout } from '../art/Flower';
import { DISCOVERY_STYLES_INFO } from '../../data/foundationQuestions';
import { ADVANCED_QUESTIONS } from '../../data/advancedQuestions';
import { buildIndividualProfile } from '../../utils/familyProfileAnalysis';
import { advancedProgress, memberName } from '../../utils/member';
import { FLOWERS } from '../../data/flowers';

export function MemberSheet({ memberId, onClose }: { memberId: string | null; onClose: () => void }) {
  const { members, responses, activeMember } = useHousehold();
  const ui = useUI();
  const member = members.find((m) => m.id === memberId);
  const answers = member ? responses[member.id] || {} : {};
  const profile = answers.discoveryProfile;
  const isYou = member?.id === activeMember?.id;
  const name = member ? memberName(member) : '';
  const adv = advancedProgress(answers);
  const individual = member ? buildIndividualProfile(member, answers) : null;

  return (
    <Sheet open={Boolean(member)} onClose={onClose} title={isYou ? `${name} (you)` : name} hideTitle>
      {member && (
        <div className="grid gap-4 pb-4">
          {profile ? (
            <SpecimenCard name={name} top={profile.primaryStyle} second={profile.secondaryStyle} />
          ) : (
            <div className="card flex items-center gap-3 py-4 pl-2 pr-4">
              <Sprout size={84} />
              <div className="flex-1">
                <p className="t-head">{isYou ? 'No flower yet' : `${name} hasn’t bloomed`}</p>
                <p className="t-small ink-2 mt-0.5">{isYou ? '18 quick picks' : 'Their flower appears when they finish'}</p>
              </div>
              {isYou && (
                <button type="button" className="btn btn-primary btn-sm" onClick={ui.openFoundation}>
                  Start
                </button>
              )}
            </div>
          )}

          {answers.bloomNote && profile && (
            <section className="card p-5" aria-label={`A note for ${name}`}>
              <p className="t-body">{answers.bloomNote.note}</p>
              <p className="t-small mt-3 stock stock-butter" style={{ padding: '10px 12px', boxShadow: 'none' }}>
                <span className="font-bold">Try this week: </span>
                {answers.bloomNote.tryThis}
              </p>
            </section>
          )}

          <ul className="card px-4" aria-label="Discovery progress">
            <Status first done={Boolean(profile)} label="Foundation" detail={profile ? 'Done' : 'Not started'} />
            <Status done={adv.complete} part={adv.done / adv.total} label="Deeper roots" detail={adv.complete ? 'Done' : adv.done ? `${adv.done} of ${adv.total}` : 'Not started'} />
          </ul>

          {profile && (
            <Collapsible title={`About the ${DISCOVERY_STYLES_INFO[profile.primaryStyle].title.replace(/^The /, '')}`}>
              <div className="grid gap-3">
                <p className="t-body">{FLOWERS[profile.primaryStyle].tagline}</p>
                <p className="t-small ink-2">{DISCOVERY_STYLES_INFO[profile.primaryStyle].positiveDescription}</p>
                <Fact label="Recharges with" value={DISCOVERY_STYLES_INFO[profile.primaryStyle].weekendRecharge} />
                <Fact label="In the family" value={DISCOVERY_STYLES_INFO[profile.primaryStyle].familyInsight} />
                <Fact label={`A touch of ${FLOWERS[profile.secondaryStyle].flower}`} value={DISCOVERY_STYLES_INFO[profile.secondaryStyle].positiveDescription} />
              </div>
            </Collapsible>
          )}

          {individual && (individual.topTasteCuisines.length > 0 || individual.topMovieGenres.length > 0 || individual.weekendActivities.length > 0) && (
            <section className="card p-4">
              <h3 className="t-head">Tastes</h3>
              <TasteRow label="Loves eating" values={individual.topTasteCuisines} />
              <TasteRow label="Would rather skip" values={individual.dietaryDislikes} />
              <TasteRow label="Watches" values={individual.topMovieGenres} />
              <TasteRow label="Weekends" values={individual.weekendActivities} />
            </section>
          )}

          {individual && individual.actualAnswersSummary.length > 0 && (
            <Collapsible title={`${isYou ? 'Your' : `${name}’s`} Foundation picks`}>
              <ul className="grid gap-3">
                {individual.actualAnswersSummary.map((a) => (
                  <li key={a.questionId}>
                    <p className="t-small ink-3">{a.questionText}</p>
                    <p className="t-small font-semibold mt-0.5">{a.answerText.join('; ')}</p>
                  </li>
                ))}
              </ul>
            </Collapsible>
          )}

          {adv.done > 0 && (
            <Collapsible title={`${isYou ? 'Your' : `${name}’s`} deeper answers`}>
              <ul className="grid gap-3">
                {ADVANCED_QUESTIONS.filter((q) => answers.advancedAnswers?.[q.id]).map((q) => {
                  const a = answers.advancedAnswers![q.id];
                  return (
                    <li key={q.id}>
                      <p className="t-small ink-3">{q.question}</p>
                      <p className="t-small font-semibold mt-0.5">{a.answer}</p>
                      {a.followUpQuestion && a.followUpAnswer && (
                        <p className="t-small mt-1 ink-2">
                          {a.followUpQuestion} <span className="font-semibold" style={{ color: 'var(--ink)' }}>{a.followUpAnswer}</span>
                        </p>
                      )}
                    </li>
                  );
                })}
              </ul>
            </Collapsible>
          )}

          {isYou && (
            <div className="grid gap-2 mt-1">
              {profile && (
                <button type="button" className="btn btn-primary btn-block" onClick={ui.openRoots}>
                  {adv.complete ? 'Review deeper answers' : adv.done ? 'Continue deeper roots' : 'Grow deeper roots'}
                </button>
              )}
              <button type="button" className="btn btn-block" onClick={ui.openTastes}>
                Edit tastes
              </button>
              {profile && (
                <button type="button" className="btn btn-quiet btn-block" onClick={ui.openFoundation}>
                  Retake Foundation
                </button>
              )}
            </div>
          )}

          {profile && <p className="t-small ink-3 text-center px-4">A fun profile from this app’s questions, not a psychological test.</p>}
        </div>
      )}
    </Sheet>
  );
}

/** A row with a stitched ring that fills with yarn as the part gets done, then turns into a tick. */
function Status({ first, done, part = 0, label, detail }: { first?: boolean; done: boolean; part?: number; label: string; detail: string }) {
  return (
    <li className="flex items-center gap-3 py-3.5" style={{ borderTop: first ? 0 : '1px solid var(--line)' }}>
      {done ? (
        <span className="w-7 h-7 rounded-full grid place-items-center shrink-0" style={{ background: 'var(--accent)', color: 'var(--on-accent)' }} aria-hidden>
          <Check size={15} strokeWidth={3} />
        </span>
      ) : (
        <svg width="28" height="28" viewBox="0 0 28 28" className="shrink-0 -rotate-90" aria-hidden>
          <circle cx="14" cy="14" r="12" fill="none" stroke="var(--line)" strokeWidth="1.5" />
          {part > 0 && (
            <motion.circle cx="14" cy="14" r="12" fill="none" stroke="var(--yarn)" strokeWidth="3" strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: part }} transition={{ type: 'spring', stiffness: 120, damping: 20 }} />
          )}
        </svg>
      )}
      <span className="flex-1 font-semibold">{label}</span>
      <span className="t-small ink-2">{detail}</span>
    </li>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="t-label">{label}</p>
      <p className="t-small ink-2 mt-0.5">{value}</p>
    </div>
  );
}

function TasteRow({ label, values }: { label: string; values: string[] }) {
  if (!values.length) return null;
  return (
    <div className="mt-3">
      <p className="t-small ink-3">{label}</p>
      <div className="flex flex-wrap gap-1.5 mt-1">
        {values.map((v) => (
          <span key={v} className="t-small px-2.5 py-1 rounded-lg font-semibold" style={{ background: 'var(--card-2)' }}>
            {v}
          </span>
        ))}
      </div>
    </div>
  );
}

function Collapsible({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <section className="card">
      <button type="button" className="w-full flex items-center justify-between gap-3 p-4 bg-transparent border-0 text-left" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <span className="t-head">{title}</span>
        <ChevronDown size={20} strokeWidth={2.4} style={{ transform: open ? 'rotate(180deg)' : undefined, transition: 'transform 200ms' }} />
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </section>
  );
}
