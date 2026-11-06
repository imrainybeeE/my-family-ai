import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { Sheet } from '../ui/Sheet';
import { CopyButton, Segmented, SeedMark, useToast } from '../ui/bits';
import { onRovingKeyDown, rovingTabIndex } from '../ui/roving';
import { useHousehold } from '../../context/HouseholdContext';
import { useTheme, ThemeMode } from '../../context/ThemeContext';
import { FlowerBadge } from '../art/Flower';
import { ALLOWED_ROLES, validateMemberInput } from '../../utils/familyCode';
import { uniqueNames } from '../../utils/member';
import { MemberRole } from '../../types';

export function SettingsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { household, members, responses, activeMember, selectActiveMember, addMember, leaveHousehold, isDemo } = useHousehold();
  const { mode, setMode } = useTheme();
  const toast = useToast();
  const [adding, setAdding] = useState(false);
  const [role, setRole] = useState<MemberRole>('Sister');
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const names = uniqueNames(members);

  const add = async () => {
    setError(null);
    const v = validateMemberInput({ role, nickname });
    if (!v.isValid) return setError(v.error || 'Check the name.');
    try {
      await addMember(role, nickname);
      toast(`${nickname.trim() || role} added`);
      setAdding(false);
      setNickname('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Couldn’t add them.');
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title="Settings">
      <div className="grid gap-7 pb-4">
        <section>
          <h3 className="t-label ink-2 mb-2 px-1">Appearance</h3>
          <Segmented<ThemeMode>
            label="Appearance"
            value={mode}
            onChange={setMode}
            options={[
              { value: 'light', label: 'Light' },
              { value: 'dark', label: 'Dark' },
              { value: 'system', label: 'Automatic' },
            ]}
          />
        </section>

        <section>
          <h3 className="t-label ink-2 mb-2 px-1">Who’s using this phone?</h3>
          <div className="grid gap-2" role="radiogroup" aria-label="Who’s using this phone?" onKeyDown={(e) => onRovingKeyDown(e)}>
            {members.map((m, i) => {
              const on = m.id === activeMember?.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  tabIndex={rovingTabIndex(i, members.findIndex((x) => x.id === activeMember?.id))}
                  className="option"
                  onClick={async () => {
                    if (on) return;
                    try {
                      await selectActiveMember(m.id);
                      toast(`Switched to ${names.get(m.id)}`);
                    } catch (err) {
                      setError(err instanceof Error ? err.message : 'Couldn’t switch.');
                    }
                  }}
                >
                  <FlowerBadge style={responses[m.id]?.discoveryProfile?.primaryStyle} size={38} ring={false} />
                  <span className="flex-1">
                    <span className="block font-semibold">{names.get(m.id)}</span>
                    {m.nickname && <span className="block t-small ink-2">{m.role === 'Me' ? 'Student' : m.role}</span>}
                  </span>
                  <SeedMark on={on} />
                </button>
              );
            })}
          </div>
          {!adding ? (
            <button type="button" className="btn btn-block btn-sm mt-3" onClick={() => setAdding(true)}>
              <Plus size={18} strokeWidth={2.6} /> Add someone to the family
            </button>
          ) : (
            <div className="card p-3 grid gap-2 mt-3">
              <select className="field" value={role} onChange={(e) => setRole(e.target.value as MemberRole)} aria-label="Role">
                {ALLOWED_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r === 'Me' ? 'Me (the student)' : r === 'Other' ? 'Someone else' : r}
                  </option>
                ))}
              </select>
              <input className="field" value={nickname} maxLength={30} placeholder="Nickname (optional)" onChange={(e) => setNickname(e.target.value)} aria-label="Nickname" />
              <div className="grid grid-cols-2 gap-2">
                <button type="button" className="btn btn-sm" onClick={() => setAdding(false)}>
                  Cancel
                </button>
                <button type="button" className="btn btn-sm btn-primary" onClick={add}>
                  Add
                </button>
              </div>
            </div>
          )}
          {error && (
            <p role="alert" className="t-small mt-2" style={{ color: 'var(--danger)' }}>
              {error}
            </p>
          )}
        </section>

        <section className="card p-4">
          <h3 className="t-label ink-2">Family code</h3>
          <div className="flex items-center justify-between gap-3 mt-1">
            <p className="t-title tabular-nums tracking-[0.05em]">{household?.code}</p>
            <CopyButton value={household?.code || ''} />
          </div>
          <p className="t-small ink-2 mt-1">Anyone with this code can join and see the family’s answers, so share it only with family.</p>
        </section>

        <section className="card p-4">
          <h3 className="t-head" style={{ fontSize: '1.0625rem' }}>
            About this app
          </h3>
          <ul className="prose-ai t-small ink-2 mt-2">
            <li>My Family AI is a student-built project for Axcel International School.</li>
            <li>It never asks for emails, passwords, addresses or bank details. Use nicknames, not full names.</li>
            <li>Answers are shared with everyone in your family. They’re for discovering each other, not for keeping secrets.</li>
            <li>The six styles are a fun discovery profile from this app’s questions, not a psychological assessment.</li>
            <li>The AI helper (Claude, made by Anthropic) only sees your family’s saved answers. It can make mistakes, so don’t rely on it for medical, psychological, money or safety advice.</li>
          </ul>
        </section>

        <section>
          {!confirmLeave ? (
            <button type="button" className="btn btn-quiet btn-block" style={{ color: 'var(--danger)' }} onClick={() => setConfirmLeave(true)}>
              {isDemo ? 'Leave the demo family' : 'Leave this family on this phone'}
            </button>
          ) : (
            <div className="card p-4">
              <p className="t-body">
                {isDemo
                  ? 'Go back to the start screen?'
                  : 'This phone will forget the family. Everyone’s answers stay saved, and you can rejoin with the code.'}
              </p>
              <div className="grid grid-cols-2 gap-2 mt-3">
                <button type="button" className="btn btn-sm" onClick={() => setConfirmLeave(false)}>
                  Stay
                </button>
                <button
                  type="button"
                  className="btn btn-sm"
                  style={{ ['--btn-bg' as string]: 'var(--danger)', ['--btn-fg' as string]: '#fff', ['--btn-edge' as string]: '#7d1a13' }}
                  onClick={async () => {
                    onClose();
                    await leaveHousehold();
                  }}
                >
                  Leave
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </Sheet>
  );
}
