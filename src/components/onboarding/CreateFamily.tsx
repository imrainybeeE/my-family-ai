import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronLeft, Plus, Shuffle, Trash2 } from 'lucide-react';
import { Sheet } from '../ui/Sheet';
import { SeedPacket } from './SeedPacket';
import { useHousehold } from '../../context/HouseholdContext';
import {
  ALLOWED_ROLES,
  AVATAR_PALETTE,
  cleanDigitsInput,
  cleanLettersInput,
  formatFamilyCode,
  generateRandomDigits,
  validateFamilyCode,
  validateMemberInput,
} from '../../utils/familyCode';
import { MemberRole } from '../../types';
import { Sprout } from '../art/Flower';
import { SeedMark } from '../ui/bits';

interface Draft {
  key: number;
  role: MemberRole;
  nickname: string;
}

const ROLE_LABEL: Record<MemberRole, string> = {
  Me: 'Me (the student)',
  Mum: 'Mum',
  Dad: 'Dad',
  Brother: 'Brother',
  Sister: 'Sister',
  Grandparent: 'Grandparent',
  Other: 'Someone else',
};

const STEPS = ['Name your family', 'Who lives with you?', 'Which one are you?'];

export function CreateFamily({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { createHousehold } = useHousehold();
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [letters, setLetters] = useState('');
  const [digits, setDigits] = useState(generateRandomDigits);
  const [people, setPeople] = useState<Draft[]>([
    { key: 1, role: 'Me', nickname: '' },
    { key: 2, role: 'Mum', nickname: '' },
  ]);
  const [me, setMe] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const suggestedLetters = useMemo(() => {
    const word = name.replace(/^the\s+/i, '').replace(/\s+family$/i, '');
    return cleanLettersInput(word).padEnd(3, 'X').slice(0, 3);
  }, [name]);
  const code = formatFamilyCode(letters || suggestedLetters, digits);

  const next = () => {
    setError(null);
    if (step === 0) {
      const v = validateFamilyCode(code);
      if (!v.isValid) return setError(v.error || 'Check the family code.');
    }
    if (step === 1) {
      if (!people.length) return setError('Add at least one person.');
      for (const p of people) {
        const v = validateMemberInput(p);
        if (!v.isValid) return setError(v.error || 'Check the names.');
      }
      if (me >= people.length) setMe(0);
    }
    setStep((s) => s + 1);
  };

  const finish = async () => {
    setBusy(true);
    setError(null);
    try {
      await createHousehold(
        code,
        name.trim() || undefined,
        people.map((p, i) => ({ role: p.role, nickname: p.nickname.trim() || undefined, avatarColor: AVATAR_PALETTE[i % AVATAR_PALETTE.length] })),
        me
      );
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Couldn’t create your family. Try again.');
      if (String(err).includes('already in use')) setStep(0);
    } finally {
      setBusy(false);
    }
  };

  const label = (p: Draft) => p.nickname.trim() || ROLE_LABEL[p.role];

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={STEPS[step]}
      full
      leading={
        step > 0 ? (
          <button type="button" className="icon-btn" onClick={() => setStep((s) => s - 1)} aria-label="Back">
            <ChevronLeft size={22} strokeWidth={2.4} />
          </button>
        ) : undefined
      }
      footer={
        <div className="grid gap-2">
          {error && (
            <p role="alert" className="t-small" style={{ color: 'var(--danger)' }}>
              {error}
            </p>
          )}
          {step < 2 ? (
            <button type="button" className="btn btn-primary btn-block" onClick={next}>
              Continue
            </button>
          ) : (
            <button type="button" className="btn btn-primary btn-block" onClick={finish} disabled={busy}>
              {busy ? 'Planting your garden…' : 'Plant our garden'}
            </button>
          )}
          <p className="t-label ink-3 text-center">Step {step + 1} of 3</p>
        </div>
      }
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -24 }}
          transition={{ duration: 0.2 }}
        >
          {step === 0 && (
            <div className="grid gap-5 pt-2">
              <label className="grid gap-2">
                <span className="t-label">Family name (optional)</span>
                <input
                  className="field"
                  value={name}
                  maxLength={40}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="The Tan family"
                  autoComplete="off"
                />
              </label>
              <fieldset className="grid gap-2">
                <legend className="t-label mb-2">Family code</legend>
                <div className="flex items-center gap-2">
                  <span className="t-head ink-2" aria-hidden>
                    AX
                  </span>
                  <span className="ink-3" aria-hidden>
                    –
                  </span>
                  <input
                    className="field text-center uppercase tracking-[0.2em] font-bold"
                    style={{ width: 104 }}
                    value={letters}
                    placeholder={suggestedLetters}
                    onChange={(e) => setLetters(cleanLettersInput(e.target.value))}
                    aria-label="Three letters"
                    autoCapitalize="characters"
                    autoComplete="off"
                    inputMode="text"
                  />
                  <span className="ink-3" aria-hidden>
                    –
                  </span>
                  <input
                    className="field text-center tracking-[0.2em] font-bold tabular-nums"
                    style={{ width: 112 }}
                    value={digits}
                    onChange={(e) => setDigits(cleanDigitsInput(e.target.value))}
                    aria-label="Four digits"
                    inputMode="numeric"
                    autoComplete="off"
                  />
                  <button type="button" className="icon-btn" onClick={() => setDigits(generateRandomDigits())} aria-label="New random numbers">
                    <Shuffle size={19} strokeWidth={2.4} />
                  </button>
                </div>
                <p className="t-small ink-2">Pick three letters you’ll remember. Everyone types this code to join.</p>
              </fieldset>
              <SeedPacket code={code} name={name.trim() || undefined} styles={[undefined, undefined, undefined]} />
            </div>
          )}

          {step === 1 && (
            <div className="grid gap-3 pt-2">
              <p className="t-small ink-2">Add everyone who’ll use the app. Nicknames are enough. Please don’t use full names.</p>
              {people.map((p, i) => (
                <div key={p.key} className="card p-3 grid grid-cols-[1fr_auto] gap-2 items-center">
                  <select
                    className="field"
                    value={p.role}
                    aria-label={`Role for person ${i + 1}`}
                    onChange={(e) => setPeople((list) => list.map((x) => (x.key === p.key ? { ...x, role: e.target.value as MemberRole } : x)))}
                  >
                    {ALLOWED_ROLES.map((r) => (
                      <option key={r} value={r}>
                        {ROLE_LABEL[r]}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="icon-btn"
                    aria-label={`Remove ${label(p)}`}
                    disabled={people.length === 1}
                    onClick={() => setPeople((list) => list.filter((x) => x.key !== p.key))}
                  >
                    <Trash2 size={18} strokeWidth={2.2} />
                  </button>
                  <input
                    className="field col-span-2"
                    value={p.nickname}
                    maxLength={30}
                    placeholder="Nickname (optional)"
                    aria-label={`Nickname for person ${i + 1}`}
                    onChange={(e) => setPeople((list) => list.map((x) => (x.key === p.key ? { ...x, nickname: e.target.value } : x)))}
                  />
                </div>
              ))}
              {people.length < 10 && (
                <button
                  type="button"
                  className="btn btn-block"
                  onClick={() => setPeople((list) => [...list, { key: Date.now(), role: 'Dad', nickname: '' }])}
                >
                  <Plus size={19} strokeWidth={2.6} /> Add someone
                </button>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="grid gap-3 pt-2" role="radiogroup" aria-label="Which one are you?">
              <p className="t-small ink-2">This phone will answer as you. Anyone can switch later in settings.</p>
              {people.map((p, i) => (
                <button key={p.key} type="button" role="radio" aria-checked={me === i} className="option" onClick={() => setMe(i)}>
                  <Sprout size={36} />
                  <span className="flex-1">
                    <span className="block font-semibold">{label(p)}</span>
                    {p.nickname.trim() && <span className="block t-small ink-2">{ROLE_LABEL[p.role]}</span>}
                  </span>
                  <SeedMark on={me === i} />
                </button>
              ))}
              <div className="mt-2">
                <SeedPacket code={code} name={name.trim() || undefined} styles={people.map(() => undefined)} />
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </Sheet>
  );
}
