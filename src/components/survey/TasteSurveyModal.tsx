import React, { useState } from 'react';
import { X, Check, Loader2, Utensils, Film, Gamepad2, Cookie } from 'lucide-react';
import { useHousehold } from '../../context/HouseholdContext';
import { MemberTasteAnswers } from '../../types';
import {
  CUISINE_OPTIONS,
  FOOD_DISLIKE_OPTIONS,
  MOVIE_GENRE_OPTIONS,
  MOVIE_VIBE_OPTIONS,
  WEEKEND_ACTIVITY_OPTIONS,
  ENERGY_LEVEL_OPTIONS,
  SNACK_OPTIONS,
} from '../../utils/tasteMatching';

interface TasteSurveyModalProps {
  onClose: () => void;
}

export const TasteSurveyModal: React.FC<TasteSurveyModalProps> = ({ onClose }) => {
  const { activeMember, responses, saveMyTasteAnswers } = useHousehold();

  const existingAnswers = activeMember ? responses[activeMember.id] : undefined;

  // Survey Form State
  const [favoriteCuisines, setFavoriteCuisines] = useState<string[]>(
    existingAnswers?.favoriteCuisines || []
  );
  const [foodDislikes, setFoodDislikes] = useState<string[]>(
    existingAnswers?.foodDislikes || []
  );
  const [movieGenres, setMovieGenres] = useState<string[]>(
    existingAnswers?.movieGenres || []
  );
  const [movieVibe, setMovieVibe] = useState<string>(
    existingAnswers?.movieVibe || MOVIE_VIBE_OPTIONS[0]
  );
  const [weekendActivities, setWeekendActivities] = useState<string[]>(
    existingAnswers?.weekendActivities || []
  );
  const [energyLevel, setEnergyLevel] = useState<string>(
    existingAnswers?.energyLevel || ENERGY_LEVEL_OPTIONS[0]
  );
  const [snackPreference, setSnackPreference] = useState<string>(
    existingAnswers?.snackPreference || SNACK_OPTIONS[0]
  );

  const [activeTab, setActiveTab] = useState<'food' | 'movies' | 'activities' | 'vibes'>('food');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const toggleItem = (list: string[], setList: (l: string[]) => void, item: string) => {
    if (list.includes(item)) {
      setList(list.filter((i) => i !== item));
    } else {
      setList([...list, item]);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    const answers: MemberTasteAnswers = {
      favoriteCuisines,
      foodDislikes,
      movieGenres,
      movieVibe,
      weekendActivities,
      energyLevel,
      snackPreference,
    };

    try {
      await saveMyTasteAnswers(answers);
      setSaveSuccess(true);
      setTimeout(() => {
        onClose();
      }, 700);
    } catch {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="w-full max-w-[420px] max-h-[92vh] bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Taste profile for {activeMember?.nickname || activeMember?.role}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Answer 4 quick topics to discover shared family favorites
            </p>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="w-8 h-8 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Category Tabs */}
        <div className="flex border-b border-slate-100 dark:border-slate-800 px-3 bg-slate-50/60 dark:bg-slate-950 text-xs font-medium text-slate-500 dark:text-slate-400">
          <button
            type="button"
            onClick={() => setActiveTab('food')}
            className={`py-2.5 px-3 border-b-2 flex items-center gap-1.5 transition cursor-pointer ${
              activeTab === 'food'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 font-semibold'
                : 'border-transparent hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            <Utensils className="w-3.5 h-3.5" />
            <span>Dinner</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('movies')}
            className={`py-2.5 px-3 border-b-2 flex items-center gap-1.5 transition cursor-pointer ${
              activeTab === 'movies'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 font-semibold'
                : 'border-transparent hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            <Film className="w-3.5 h-3.5" />
            <span>Movies</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('activities')}
            className={`py-2.5 px-3 border-b-2 flex items-center gap-1.5 transition cursor-pointer ${
              activeTab === 'activities'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 font-semibold'
                : 'border-transparent hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            <Gamepad2 className="w-3.5 h-3.5" />
            <span>Free Time</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('vibes')}
            className={`py-2.5 px-3 border-b-2 flex items-center gap-1.5 transition cursor-pointer ${
              activeTab === 'vibes'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 font-semibold'
                : 'border-transparent hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            <Cookie className="w-3.5 h-3.5" />
            <span>Snacks & Vibe</span>
          </button>
        </div>

        {/* Scrollable Questions Body */}
        <div className="p-5 overflow-y-auto no-scrollbar space-y-5 flex-1 text-slate-800 dark:text-slate-200">
          {activeTab === 'food' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-900 dark:text-slate-100 mb-1">
                  What dinners do you love eating? (Pick any)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 mt-2">
                  {CUISINE_OPTIONS.map((c) => {
                    const isSelected = favoriteCuisines.includes(c);
                    return (
                      <button
                        key={c}
                        type="button"
                        onClick={() => toggleItem(favoriteCuisines, setFavoriteCuisines, c)}
                        className={`p-2.5 rounded-xl border text-left text-xs font-medium transition flex items-center justify-between cursor-pointer ${
                          isSelected
                            ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200'
                            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-200'
                        }`}
                      >
                        <span>{c}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <label className="block text-xs font-semibold text-slate-900 dark:text-slate-100 mb-1">
                  Any foods or ingredients you dislike or avoid?
                </label>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {FOOD_DISLIKE_OPTIONS.map((d) => {
                    const isSelected = foodDislikes.includes(d);
                    return (
                      <button
                        key={d}
                        type="button"
                        onClick={() => toggleItem(foodDislikes, setFoodDislikes, d)}
                        className={`px-3 py-1.5 rounded-lg border text-xs transition cursor-pointer ${
                          isSelected
                            ? 'border-rose-400 bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 font-medium'
                            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        {d}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'movies' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-900 dark:text-slate-100 mb-1">
                  Movie genres you enjoy watching with family
                </label>
                <div className="grid grid-cols-2 gap-1.5 mt-2">
                  {MOVIE_GENRE_OPTIONS.map((g) => {
                    const isSelected = movieGenres.includes(g);
                    return (
                      <button
                        key={g}
                        type="button"
                        onClick={() => toggleItem(movieGenres, setMovieGenres, g)}
                        className={`p-2.5 rounded-xl border text-left text-xs font-medium transition flex items-center justify-between cursor-pointer ${
                          isSelected
                            ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200'
                            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-200'
                        }`}
                      >
                        <span>{g}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <label className="block text-xs font-semibold text-slate-900 dark:text-slate-100 mb-1">
                  Movie night mood
                </label>
                <div className="grid grid-cols-2 gap-1.5 mt-2">
                  {MOVIE_VIBE_OPTIONS.map((v) => {
                    const isSelected = movieVibe === v;
                    return (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setMovieVibe(v)}
                        className={`p-2.5 rounded-xl border text-left text-xs transition cursor-pointer ${
                          isSelected
                            ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 font-medium'
                            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-200'
                        }`}
                      >
                        {v}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'activities' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-900 dark:text-slate-100 mb-1">
                  Weekend and free time activities you'd enjoy doing together
                </label>
                <div className="space-y-1.5 mt-2">
                  {WEEKEND_ACTIVITY_OPTIONS.map((a) => {
                    const isSelected = weekendActivities.includes(a);
                    return (
                      <button
                        key={a}
                        type="button"
                        onClick={() => toggleItem(weekendActivities, setWeekendActivities, a)}
                        className={`w-full p-2.5 rounded-xl border text-left text-xs font-medium transition flex items-center justify-between cursor-pointer ${
                          isSelected
                            ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200'
                            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-200'
                        }`}
                      >
                        <span>{a}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'vibes' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-900 dark:text-slate-100 mb-1">
                  Your usual weekend energy level
                </label>
                <div className="grid grid-cols-1 gap-1.5 mt-2">
                  {ENERGY_LEVEL_OPTIONS.map((e) => {
                    const isSelected = energyLevel === e;
                    return (
                      <button
                        key={e}
                        type="button"
                        onClick={() => setEnergyLevel(e)}
                        className={`p-2.5 rounded-xl border text-left text-xs transition cursor-pointer ${
                          isSelected
                            ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 font-medium'
                            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-200'
                        }`}
                      >
                        {e}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <label className="block text-xs font-semibold text-slate-900 dark:text-slate-100 mb-1">
                  Family snack cravings
                </label>
                <div className="grid grid-cols-1 gap-1.5 mt-2">
                  {SNACK_OPTIONS.map((s) => {
                    const isSelected = snackPreference === s;
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setSnackPreference(s)}
                        className={`p-2.5 rounded-xl border text-left text-xs transition cursor-pointer ${
                          isSelected
                            ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 font-medium'
                            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-200'
                        }`}
                      >
                        {s}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-between">
          <div className="text-[11px] text-slate-400 dark:text-slate-500">
            {activeTab !== 'vibes' ? 'Review all tabs before saving' : 'All done!'}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="px-5 py-2.5 bg-slate-900 dark:bg-indigo-600 hover:bg-slate-800 dark:hover:bg-indigo-500 active:scale-95 text-white text-xs font-semibold rounded-xl shadow-xs flex items-center gap-1.5 transition disabled:opacity-60 cursor-pointer"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : saveSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Saved!</span>
                </>
              ) : (
                <span>Save Taste Profile</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
