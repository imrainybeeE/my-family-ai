import React, { useEffect, useState } from 'react';
import { Sheet } from '../ui/Sheet';
import { useToast } from '../ui/bits';
import { useHousehold } from '../../context/HouseholdContext';
import {
  CUISINE_OPTIONS,
  ENERGY_LEVEL_OPTIONS,
  FOOD_DISLIKE_OPTIONS,
  MOVIE_GENRE_OPTIONS,
  MOVIE_VIBE_OPTIONS,
  SNACK_OPTIONS,
  WEEKEND_ACTIVITY_OPTIONS,
} from '../../utils/tasteMatching';
import { MemberTasteAnswers } from '../../types';

type Multi = 'favoriteCuisines' | 'foodDislikes' | 'movieGenres' | 'weekendActivities';
type Single = 'movieVibe' | 'energyLevel' | 'snackPreference';

const GROUPS: Array<{ key: Multi | Single; title: string; options: string[]; multi: boolean; hint?: string }> = [
  { key: 'favoriteCuisines', title: 'Food you love', options: CUISINE_OPTIONS, multi: true },
  { key: 'foodDislikes', title: 'Food you’d rather skip', options: FOOD_DISLIKE_OPTIONS, multi: true, hint: 'The planner keeps these off the menu.' },
  { key: 'movieGenres', title: 'Films and shows', options: MOVIE_GENRE_OPTIONS, multi: true },
  { key: 'movieVibe', title: 'Film night mood', options: MOVIE_VIBE_OPTIONS, multi: false },
  { key: 'weekendActivities', title: 'Favourite weekend things', options: WEEKEND_ACTIVITY_OPTIONS, multi: true },
  { key: 'energyLevel', title: 'Your usual weekend energy', options: ENERGY_LEVEL_OPTIONS, multi: false },
  { key: 'snackPreference', title: 'Snack of choice', options: SNACK_OPTIONS, multi: false },
];

/** Quick taste picks that make the planner's ideas fit. Saving merges with all other answers. */
export function TastesSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { myAnswers, updateMyAnswers } = useHousehold();
  const toast = useToast();
  const [draft, setDraft] = useState<MemberTasteAnswers>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setDraft({
        favoriteCuisines: myAnswers.favoriteCuisines || [],
        foodDislikes: myAnswers.foodDislikes || [],
        movieGenres: myAnswers.movieGenres || [],
        movieVibe: myAnswers.movieVibe,
        weekendActivities: myAnswers.weekendActivities || [],
        energyLevel: myAnswers.energyLevel,
        snackPreference: myAnswers.snackPreference,
      });
      setError(null);
    }
    // Reset the draft each time the sheet opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const toggle = (key: Multi | Single, option: string, multi: boolean) => {
    setDraft((d) => {
      if (!multi) return { ...d, [key]: d[key] === option ? undefined : option };
      const cur = (d[key] as string[]) || [];
      let next = cur.includes(option) ? cur.filter((o) => o !== option) : [...cur, option];
      if (key === 'foodDislikes') {
        const none = 'None / I eat anything';
        next = option === none ? (next.includes(none) ? [none] : []) : next.filter((o) => o !== none);
      }
      return { ...d, [key]: next };
    });
  };

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      await updateMyAnswers(draft);
      toast('Tastes saved');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Couldn’t save.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Your tastes"
      footer={
        <div className="grid gap-2">
          {error && (
            <p role="alert" className="t-small" style={{ color: 'var(--danger)' }}>
              {error}
            </p>
          )}
          <button type="button" className="btn btn-primary btn-block" onClick={save} disabled={busy}>
            {busy ? 'Saving…' : 'Save tastes'}
          </button>
        </div>
      }
    >
      <div className="grid gap-6 pb-2">
        {GROUPS.map((g) => (
          <fieldset key={g.key}>
            <legend className="t-head" style={{ fontSize: '1.0625rem' }}>
              {g.title}
            </legend>
            <p className="t-small ink-3 mt-0.5">{g.hint || (g.multi ? 'Pick any.' : 'Pick one.')}</p>
            <div className="flex flex-wrap gap-2 mt-2.5">
              {g.options.map((o) => {
                const value = draft[g.key];
                const on = Array.isArray(value) ? value.includes(o) : value === o;
                return (
                  <button key={o} type="button" className="chip" aria-pressed={on} onClick={() => toggle(g.key, o, g.multi)}>
                    {o}
                  </button>
                );
              })}
            </div>
          </fieldset>
        ))}
      </div>
    </Sheet>
  );
}
