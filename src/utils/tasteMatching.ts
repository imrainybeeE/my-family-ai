import { HouseholdMember, MemberTasteAnswers, CommonGroundData } from '../types';

export const CUISINE_OPTIONS = [
  'Pizza & Italian',
  'Tacos & Mexican',
  'Burgers & Fries',
  'Asian Stir Fry & Noodles',
  'Curry & Rice',
  'Healthy Bowls & Salads',
  'Breakfast for Dinner',
  'BBQ & Grilling',
];

export const FOOD_DISLIKE_OPTIONS = [
  'Too spicy',
  'Seafood / Fish',
  'Mushrooms',
  'Olives',
  'Heavy cheese / Dairy',
  'Cilantro',
  'None / I eat anything',
];

export const MOVIE_GENRE_OPTIONS = [
  'Animation & Family',
  'Comedy & Laughs',
  'Action & Adventure',
  'Mystery & Whodunnit',
  'Sci-Fi & Space',
  'Sports & Underdogs',
  'Fantasy & Magic',
  'Nature & Animals',
];

export const MOVIE_VIBE_OPTIONS = [
  'Light & funny',
  'Exciting & fast-paced',
  'Warm & cozy',
  'Mind-bending mystery',
];

export const WEEKEND_ACTIVITY_OPTIONS = [
  'Board game & card night',
  'Movie marathon on the couch',
  'Walk in the park or bike ride',
  'Baking cookies / cooking a treat',
  'Video games & party co-op',
  'Quiet reading / creative hobbies',
  'Puzzle or building project',
];

export const ENERGY_LEVEL_OPTIONS = [
  'Chill & low energy',
  'Active & playful',
  'Creative & hands-on',
];

export const SNACK_OPTIONS = [
  'Popcorn & salty pretzels',
  'Chocolate & sweet candy',
  'Fresh fruit & smoothies',
  'Chips & salsa or dip',
];

export interface CuratedMovie {
  title: string;
  genre: string;
  vibe: string;
  genres: string[];
  why: string;
}

export const CURATED_MOVIES: CuratedMovie[] = [
  {
    title: 'The Mitchells vs. the Machines',
    genre: 'Animation & Family',
    vibe: 'Light & funny',
    genres: ['Animation & Family', 'Comedy & Laughs', 'Sci-Fi & Space'],
    why: 'Hilarious family road-trip robot invasion loved by parents and kids alike.',
  },
  {
    title: 'Spider-Man: Into the Spider-Verse',
    genre: 'Action & Adventure',
    vibe: 'Exciting & fast-paced',
    genres: ['Animation & Family', 'Action & Adventure', 'Sci-Fi & Space'],
    why: 'Stunning animation, brilliant soundtrack, and high energy for the whole house.',
  },
  {
    title: 'Paddington 2',
    genre: 'Comedy & Laughs',
    vibe: 'Warm & cozy',
    genres: ['Animation & Family', 'Comedy & Laughs'],
    why: 'Pure charm, universally rated 100% on Rotten Tomatoes, cozy feel-good comedy.',
  },
  {
    title: 'Knives Out',
    genre: 'Mystery & Whodunnit',
    vibe: 'Mind-bending mystery',
    genres: ['Mystery & Whodunnit', 'Comedy & Laughs'],
    why: 'Sharp, funny puzzle mystery where everyone tries to guess the culprit.',
  },
  {
    title: 'School of Rock',
    genre: 'Comedy & Laughs',
    vibe: 'Exciting & fast-paced',
    genres: ['Comedy & Laughs'],
    why: 'Great music, high energy, and classic family humor.',
  },
  {
    title: 'Spirited Away',
    genre: 'Fantasy & Magic',
    vibe: 'Warm & cozy',
    genres: ['Animation & Family', 'Fantasy & Magic'],
    why: 'Breathtaking fantasy adventure with wonder for all age groups.',
  },
];

export interface CuratedDinner {
  title: string;
  cuisine: string;
  why: string;
  customizable: boolean;
}

export const CURATED_DINNERS: CuratedDinner[] = [
  {
    title: 'Build-Your-Own Taco Bar',
    cuisine: 'Tacos & Mexican',
    why: 'Everyone builds their own plate with tortillas, mild salsa, beans, and meat.',
    customizable: true,
  },
  {
    title: 'Personal Flatbread Pizzas',
    cuisine: 'Pizza & Italian',
    why: 'Each person customizes their half or individual crust with their favorite toppings.',
    customizable: true,
  },
  {
    title: 'Custom Noodle & Rice Bowls',
    cuisine: 'Asian Stir Fry & Noodles',
    why: 'Sauteed veggies and protein kept separate so pickier eaters choose what goes in.',
    customizable: true,
  },
  {
    title: 'Homemade Burger Bar with Sweet Potato Fries',
    cuisine: 'Burgers & Fries',
    why: 'Comfort classic with easy swaps for cheese, sauces, and buns.',
    customizable: true,
  },
  {
    title: 'Breakfast-for-Dinner Pancake Extravaganza',
    cuisine: 'Breakfast for Dinner',
    why: 'Fun change of pace with scrambled eggs, berries, and pancake toppings.',
    customizable: true,
  },
];

/**
 * Pure calculation of common ground across household responses
 */
export function calculateCommonGround(
  members: HouseholdMember[],
  responses: Record<string, MemberTasteAnswers | undefined>
): CommonGroundData {
  const answeredMembers = members.filter((m) => {
    const ans = responses[m.id];
    return ans && Object.keys(ans).length > 0;
  });

  const answeredCount = answeredMembers.length;
  const totalMembers = members.length;
  const allAnswered = totalMembers > 0 && answeredCount === totalMembers;

  // Cuisine tally
  const cuisineTally: Record<string, number> = {};
  const dislikeNotes: { memberName: string; note: string }[] = [];
  const movieGenreTally: Record<string, number> = {};
  const activityTally: Record<string, number> = {};

  for (const m of answeredMembers) {
    const ans = responses[m.id];
    if (!ans) continue;

    const displayName = m.nickname || m.role;

    // Cuisines
    if (ans.favoriteCuisines) {
      for (const c of ans.favoriteCuisines) {
        cuisineTally[c] = (cuisineTally[c] || 0) + 1;
      }
    }

    // Dislikes
    if (ans.foodDislikes) {
      for (const d of ans.foodDislikes) {
        if (d !== 'None / I eat anything') {
          dislikeNotes.push({ memberName: displayName, note: d });
        }
      }
    }

    // Movie genres
    if (ans.movieGenres) {
      for (const g of ans.movieGenres) {
        movieGenreTally[g] = (movieGenreTally[g] || 0) + 1;
      }
    }

    // Activities
    if (ans.weekendActivities) {
      for (const a of ans.weekendActivities) {
        activityTally[a] = (activityTally[a] || 0) + 1;
      }
    }
  }

  // Sort top cuisines
  const topCuisines = Object.entries(cuisineTally)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  // Sort top movie genres
  const topMovieGenres = Object.entries(movieGenreTally)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  // Sort top activities
  const topActivities = Object.entries(activityTally)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  // Match suggested movies based on top genres
  const topGenreNames = topMovieGenres.slice(0, 3).map((g) => g.name);
  const matchedMovies = CURATED_MOVIES.filter((m) =>
    m.genres.some((g) => topGenreNames.includes(g))
  );
  const suggestedMovies = (matchedMovies.length > 0 ? matchedMovies : CURATED_MOVIES.slice(0, 3)).map((m) => ({
    title: m.title,
    genre: m.genre,
    vibe: m.vibe,
    why: m.why,
  }));

  // Match suggested dinners
  const topCuisineNames = topCuisines.slice(0, 2).map((c) => c.name);
  const matchedDinners = CURATED_DINNERS.filter((d) =>
    topCuisineNames.some((c) => d.cuisine.toLowerCase().includes(c.split(' ')[0].toLowerCase()))
  );
  const suggestedDinners = (matchedDinners.length > 0 ? matchedDinners : CURATED_DINNERS.slice(0, 3)).map((d) => ({
    title: d.title,
    cuisine: d.cuisine,
    why: d.why,
  }));

  return {
    answeredCount,
    totalMembers,
    allAnswered,
    topCuisines,
    dietaryNotes: dislikeNotes,
    topMovieGenres,
    topActivities,
    suggestedMovies,
    suggestedDinners,
  };
}

/**
 * Filter activities for a specific subset of people in the room
 */
export function filterActivitiesForActiveGroup(
  memberIds: string[],
  responses: Record<string, MemberTasteAnswers | undefined>
): { activity: string; matchCount: number }[] {
  const tally: Record<string, number> = {};

  for (const id of memberIds) {
    const ans = responses[id];
    if (ans?.weekendActivities) {
      for (const a of ans.weekendActivities) {
        tally[a] = (tally[a] || 0) + 1;
      }
    }
  }

  return Object.entries(tally)
    .map(([activity, matchCount]) => ({ activity, matchCount }))
    .sort((a, b) => b.matchCount - a.matchCount);
}
