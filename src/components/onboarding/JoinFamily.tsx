import React, { useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import { Sheet } from '../ui/Sheet';
import { SeedMark } from '../ui/bits';
import { onRovingKeyDown, rovingTabIndex } from '../ui/roving';
import { useHousehold } from '../../context/HouseholdContext';
import { ALLOWED_ROLES, cleanDigitsInput, cleanLettersInput, formatFamilyCode, validateFamilyCode, validateMemberInput } from '../../utils/familyCode';
import { Household, HouseholdMember, MemberRole } from '../../types';
import { Sprout } from '../art/Flower';
import { uniqueNames } from '../../utils/member';

export function JoinFamily({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { lookupFamily, joinFamily } = useHousehold();
  const [letters, setLetters] = useState('');
  const [digits, setDigits] = useState('');
  const [found, setFound] = useState<{ household: Household; members: HouseholdMember[] } | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [role, setRole] = useState<MemberRole>('Sister');
  const [nickname, setNickname] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const code = formatFamilyCode(letters, digits);
  const names = uniqueNames(found?.members || []);

  const find = async () => {
    setError(null);
    const v = validateFamilyCode(code);
    if (!v.isValid) return setError('Enter three letters and four numbers, like AX-TAN-2026.');
    setBusy(true);
    try {
      setFound(await lookupFamily(code));
      setPicked(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Couldn’t find that family.');
    } finally {
      setBusy(false);
    }
  };

  const join = async () => {
    setError(null);
    setBusy(true);
    try {
      if (!found) return;
      if (adding) {
        const v = validateMemberInput({ role, nickname });
        if (!v.isValid) throw new Error(v.error);
        await joinFamily(found, { role, nickname: nickname.trim() || undefined });
      } else if (picked) {
        await joinFamily(found, { memberId: picked });
      } else {
        throw new Error('Choose who you are first.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Couldn’t join. Try again.');
    } finally {
      setBusy(false);
    }
  };

  const back = () => {
    setFound(null);
    setAdding(false);
  };

  const close = () => {
    setFound(null);
    setAdding(false);
    onClose();
  };

  return (
    <Sheet
      open={open}
      onClose={close}
      title={found ? 'Which one are you?' : 'Join your family'}
      leading={
        found ? (
          <button type="button" className="icon-btn" onClick={back} aria-label="Back">
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
          {!found ? (
            <button type="button" className="btn btn-primary btn-block" onClick={find} disabled={busy}>
              {busy ? 'Looking…' : 'Find our family'}
            </button>
          ) : (
            <button type="button" className="btn btn-primary btn-block" onClick={join} disabled={busy || (!picked && !adding)}>
              {busy ? 'Joining…' : 'Join the garden'}
            </button>
          )}
        </div>
      }
    >
      {!found ? (
        <div className="grid gap-3 pt-2 pb-2">
          <p className="t-small ink-2">Ask whoever started your family for the code on their seed packet.</p>
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
              placeholder="TAN"
              onChange={(e) => setLetters(cleanLettersInput(e.target.value))}
              aria-label="Three letters"
              autoCapitalize="characters"
              autoComplete="off"
              autoFocus
            />
            <span className="ink-3" aria-hidden>
              –
            </span>
            <input
              className="field text-center tracking-[0.2em] font-bold tabular-nums flex-1"
              value={digits}
              placeholder="2026"
              onChange={(e) => setDigits(cleanDigitsInput(e.target.value))}
              onKeyDown={(e) => e.key === 'Enter' && find()}
              aria-label="Four digits"
              inputMode="numeric"
              autoComplete="off"
            />
          </div>
        </div>
      ) : (
        <div className="grid gap-3 pt-2" role="radiogroup" aria-label="Which one are you?" onKeyDown={(e) => onRovingKeyDown(e)}>
          {found.members.map((m, i) => (
            <button
              key={m.id}
              type="button"
              role="radio"
              aria-checked={!adding && picked === m.id}
              tabIndex={rovingTabIndex(i, adding ? found.members.length : found.members.findIndex((x) => x.id === picked))}
              className="option"
              onClick={() => {
                setAdding(false);
                setPicked(m.id);
              }}
            >
              <Sprout size={36} />
              <span className="flex-1 font-semibold">{names.get(m.id)}</span>
              <SeedMark on={!adding && picked === m.id} />
            </button>
          ))}
          <button type="button" role="radio" aria-checked={adding} tabIndex={adding ? 0 : -1} className="option" onClick={() => setAdding(true)}>
            <span className="w-9 h-9 grid place-items-center rounded-full t-head" style={{ background: 'var(--leaf-soft)', color: 'var(--leaf-ink)' }}>
              +
            </span>
            <span className="flex-1 font-semibold">I’m not on the list</span>
            <SeedMark on={adding} />
          </button>
          {adding && (
            <div className="card p-3 grid gap-2">
              <select className="field" value={role} onChange={(e) => setRole(e.target.value as MemberRole)} aria-label="Your role">
                {ALLOWED_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r === 'Me' ? 'Me (the student)' : r === 'Other' ? 'Someone else' : r}
                  </option>
                ))}
              </select>
              <input className="field" value={nickname} maxLength={30} placeholder="Nickname (optional)" onChange={(e) => setNickname(e.target.value)} aria-label="Your nickname" />
            </div>
          )}
        </div>
      )}
    </Sheet>
  );
}
