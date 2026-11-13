import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { Sheet } from '../ui/Sheet';
import { CopyButton, Segmented, SeedMark, useToast } from '../ui/bits';
import { onRovingKeyDown, rovingTabIndex } from '../ui/roving';
import { useHousehold } from '../../context/HouseholdContext';
import { useTheme, ThemeMode, Palette, PALETTES } from '../../context/ThemeContext';
import { FlowerBadge } from '../art/Flower';
import { ALLOWED_ROLES, validateMemberInput } from '../../utils/familyCode';
import { uniqueNames } from '../../utils/member';
import { MemberRole } from '../../types';
import { feel, setSoundOn, soundOn } from '../../feel/feel';

export function SettingsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { household, members, responses, activeMember, selectActiveMember, addMember, leaveHousehold, isDemo } = useHousehold();
  const { mode, setMode, palette, setPalette, isDark } = useTheme();
  const toast = useToast();
  const [adding, setAdding] = useState(false);
  const [role, setRole] = useState<MemberRole>('Sister');
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [sound, setSound] = useState(soundOn);
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
          <h3 className="t-label ink-2 mb-2">Theme</h3>
          <div className="grid grid-cols-2 gap-3 mb-3" role="radiogroup" aria-label="Theme" onKeyDown={(e) => onRovingKeyDown(e)}>
            {PALETTES.map((p, i) => (
              <PaletteTile
                key={p.value}
                palette={p.value}
                label={p.label}
                dark={isDark}
                on={palette === p.value}
                tabIndex={rovingTabIndex(i, PALETTES.findIndex((x) => x.value === palette))}
                onPick={(e) => {
                  if (palette === p.value) return;
                  feel('select');
                  setPalette(p.value, origin(e));
                }}
              />
            ))}
          </div>
          <Segmented<ThemeMode>
            label="Appearance"
            value={mode}
            onChange={(v, e) => setMode(v, origin(e))}
            options={[
              { value: 'light', label: 'Light' },
              { value: 'dark', label: 'Dark' },
              { value: 'system', label: 'Automatic' },
            ]}
          />
          <label className="card mt-3 flex items-center justify-between gap-3 px-4 min-h-[52px]">
            <span className="t-body">Sounds and haptics</span>
            <input
              type="checkbox"
              role="switch"
              className="switch"
              checked={sound}
              onChange={(e) => {
                setSoundOn(e.target.checked);
                setSound(e.target.checked);
                if (e.target.checked) feel('select');
                toast(e.target.checked ? 'Sounds and haptics on' : 'Sounds and haptics off');
              }}
            />
          </label>
        </section>

        <section>
          <h3 className="t-label ink-2 mb-2">Who’s using this phone?</h3>
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
          <p className="t-small ink-2 mt-1">Share it only with family: anyone with the code sees your answers.</p>
        </section>

        <section className="card p-4">
          <h3 className="t-head">
            About this app
          </h3>
          <ul className="prose-ai t-small ink-2 mt-2">
            <li>My Family AI is a student-built project for Axcel International School.</li>
            <li>It never asks for emails, passwords, addresses or bank details. Use nicknames, not full names.</li>
            <li>Answers are shared with everyone in your family. They’re for discovering each other, not for keeping secrets.</li>
            <li>The six styles are a fun discovery profile from this app’s questions, not a psychological assessment.</li>
            <li>The AI helper (Gemini, made by Google) only sees your family’s saved answers. It can make mistakes, so don’t rely on it for medical, psychological, money or safety advice.</li>
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

/** Where a repaint grows from: the tap, or the middle of the control when it came from the keyboard. */
function origin(e: React.MouseEvent<HTMLElement>) {
  if (e.detail > 0) return { x: e.clientX, y: e.clientY };
  const r = e.currentTarget.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

/** Each tile is drawn in its own palette, whichever one is showing, so you can see what you'd get. */
const SWATCH: Record<Palette, { light: string[]; dark: string[] }> = {
  // page, card, accent, accent-soft, ink-faint
  ocean: { light: ['#e4ecf5', '#ffffff', '#24345e', '#dfe6f5', '#d6deea'], dark: ['#131b2c', '#1c263b', '#e6ecf8', '#2a3653', '#2b3650'] },
  forest: { light: ['#e6ede2', '#ffffff', '#2e6b4a', '#dcebe0', '#d3dccd'], dark: ['#111a15', '#19251f', '#8fdcae', '#1d3a2b', '#29382f'] },
};

function PaletteTile({
  palette,
  label,
  dark,
  on,
  tabIndex,
  onPick,
}: {
  palette: Palette;
  label: string;
  dark: boolean;
  on: boolean;
  tabIndex: number;
  onPick: (e: React.MouseEvent<HTMLButtonElement>) => void;
}) {
  const [page, card, accent, soft, line] = SWATCH[palette][dark ? 'dark' : 'light'];
  return (
    <button type="button" role="radio" aria-checked={on} tabIndex={tabIndex} className="palette-tile" onClick={onPick}>
      <svg viewBox="0 0 120 84" className="palette-tile-art" aria-hidden>
        <rect width="120" height="84" fill={page} />
        {palette === 'ocean' ? (
          <path d="M0 70 q10 -6 20 0 t20 0 t20 0 t20 0 t20 0 t20 0 V84 H0Z" fill={soft} />
        ) : (
          <path d="M0 72 q18 -14 40 -4 q22 -14 46 -2 q18 -8 34 0 V84 H0Z" fill={soft} />
        )}
        <rect x="14" y="14" width="58" height="40" rx="7" fill={card} />
        <rect x="22" y="23" width="30" height="5" rx="2.5" fill={accent} />
        <rect x="22" y="33" width="40" height="4" rx="2" fill={line} />
        <rect x="22" y="41" width="26" height="4" rx="2" fill={line} />
        <path d="M78 10 C 88 30, 104 22, 108 44" stroke="#e86f8f" strokeWidth="3" fill="none" strokeLinecap="round" />
        <circle cx="96" cy="58" r="9" fill="#f4c542" />
        <circle cx="96" cy="58" r="4" fill={accent} />
      </svg>
      <span className="palette-tile-label">
        <span className="font-semibold">{label}</span>
        <SeedMark on={on} />
      </span>
    </button>
  );
}
