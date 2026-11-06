import React, { useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
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
    <Sheet open={Boolean(member)} onClose={onClose} title={isYou ? `${name} (you)` : name}>
      {member && (
        <div className="grid gap-5 pb-4">
          {profile ? (
            <SpecimenCard name={name} top={profile.primaryStyle} second={profile.secondaryStyle} />
          ) : (
            <div className="panel panel-sun flex items-center gap-4">
              <Sprout size={80} />
              <div>
                <p className="t-head">{isYou ? 'You haven’t bloomed yet' : `${name} hasn’t bloomed yet`}</p>
                <p className="t-small mt-1">{isYou ? '18 quick picks and you’ll find your flower.' : 'Their flower appears once they answer the Foundation questions.'}</p>
                {isYou && (
                  <button type="button" className="btn btn-ink btn-sm mt-3" onClick={ui.openFoundation}>
                    Find your flower
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2" aria-label="Discovery progress">
            <Status done={Boolean(profile)} label="Foundation" detail={profile ? 'Complete' : 'Not started'} />
            <Status done={adv.complete} label="Advanced" detail={adv.complete ? 'Complete' : adv.done ? `${adv.done} of ${adv.total} answered` : 'Not started'} />
          </div>

          {answers.bloomNote && profile && (
            <section className="card p-5">
              <p className="t-label" style={{ color: 'var(--leaf-ink)' }}>
                A note from the AI helper
              </p>
              <h3 className="t-head mt-1">{answers.bloomNote.headline}</h3>
              <p className="t-body ink-2 mt-2">{answers.bloomNote.note}</p>
              <p className="t-small mt-3 rounded-xl px-3 py-2" style={{ background: 'var(--sun-bg)', color: 'var(--sun-ink)' }}>
                <span className="font-bold">Try this week: </span>
                {answers.bloomNote.tryThis}
              </p>
            </section>
          )}

          {profile && (
            <section className="grid gap-3">
              {[profile.primaryStyle, profile.secondaryStyle].map((s, i) => (
                <div key={s} className="card p-4">
                  <p className="t-label ink-2">{i === 0 ? 'Top style' : 'Second style'}</p>
                  <h3 className="t-head mt-0.5">
                    {DISCOVERY_STYLES_INFO[s].title}, the {FLOWERS[s].flower.toLowerCase()}
                  </h3>
                  <p className="t-small ink-2 mt-1.5">{DISCOVERY_STYLES_INFO[s].positiveDescription}</p>
                  {i === 0 && (
                    <>
                      <p className="t-small mt-2">
                        <span className="font-bold">Recharges with: </span>
                        <span className="ink-2">{DISCOVERY_STYLES_INFO[s].weekendRecharge}</span>
                      </p>
                      <p className="t-small mt-1.5">
                        <span className="font-bold">In the family: </span>
                        <span className="ink-2">{DISCOVERY_STYLES_INFO[s].familyInsight}</span>
                      </p>
                    </>
                  )}
                </div>
              ))}
            </section>
          )}

          {individual && (individual.topTasteCuisines.length > 0 || individual.topMovieGenres.length > 0 || individual.weekendActivities.length > 0) && (
            <section className="card p-4">
              <h3 className="t-head" style={{ fontSize: '1.0625rem' }}>
                Tastes
              </h3>
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
            <Collapsible title={`${isYou ? 'Your' : `${name}’s`} Advanced answers`}>
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
            <div className="grid gap-2">
              {profile && (
                <button type="button" className="btn btn-primary btn-block" onClick={ui.openRoots}>
                  {adv.complete ? 'Review Advanced answers' : adv.done ? 'Continue Advanced discovery' : 'Start Advanced discovery'}
                </button>
              )}
              <button type="button" className="btn btn-block" onClick={ui.openTastes}>
                Edit tastes
              </button>
              {profile && (
                <button type="button" className="btn btn-quiet btn-block" onClick={ui.openFoundation}>
                  Retake the Foundation questions
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </Sheet>
  );
}

function Status({ done, label, detail }: { done: boolean; label: string; detail: string }) {
  return (
    <div className="card p-3.5 flex items-center gap-3">
      <span
        className="w-8 h-8 rounded-full grid place-items-center shrink-0"
        style={{ background: done ? 'var(--leaf)' : 'var(--paper-sunk)', color: done ? 'var(--on-leaf)' : 'var(--ink-3)', border: done ? 0 : '2px dashed var(--line-strong)' }}
        aria-hidden
      >
        {done && <Check size={17} strokeWidth={3} />}
      </span>
      <span className="min-w-0">
        <span className="block t-label">{label}</span>
        <span className="block t-small ink-2" style={{ fontSize: '0.8125rem' }}>
          {detail}
        </span>
      </span>
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
          <span key={v} className="t-small px-2.5 py-1 rounded-lg font-semibold" style={{ background: 'var(--paper-sunk)' }}>
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
        <span className="t-head" style={{ fontSize: '1.0625rem' }}>
          {title}
        </span>
        <ChevronDown size={20} strokeWidth={2.4} style={{ transform: open ? 'rotate(180deg)' : undefined, transition: 'transform 200ms' }} />
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </section>
  );
}
