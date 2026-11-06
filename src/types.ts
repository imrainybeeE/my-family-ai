export type MemberRole = 'Me' | 'Mum' | 'Dad' | 'Brother' | 'Sister' | 'Grandparent' | 'Other';

export interface HouseholdMember {
  id: string;
  role: MemberRole;
  nickname?: string;
  avatarColor: string;
  createdAt?: string;
  deviceId?: string;
}

export interface Household {
  code: string; // e.g. AX-PAN-4827
  name?: string;
  createdBy: string;
  createdAt: string;
  memberCount: number;
}

export type DiscoveryStyleId =
  | 'Explorer'
  | 'Creator'
  | 'Connector'
  | 'Achiever'
  | 'Chiller'
  | 'Thinker';

export interface DiscoveryStyleInfo {
  id: DiscoveryStyleId;
  title: string;
  badge: string;
  color: string;
  accentBg: string;
  borderColor: string;
  positiveDescription: string;
  weekendRecharge: string;
  familyInsight: string;
}

export interface DiscoveryProfile {
  primaryStyle: DiscoveryStyleId;
  secondaryStyle: DiscoveryStyleId;
  scores: Record<DiscoveryStyleId, number>;
  completedAt: string;
}

export interface MemberTasteAnswers {
  favoriteCuisines?: string[];
  foodDislikes?: string[];
  movieGenres?: string[];
  movieVibe?: string;
  weekendActivities?: string[];
  energyLevel?: string;
  snackPreference?: string;
  foundationAnswers?: Record<string, string | string[]>;
  discoveryProfile?: DiscoveryProfile;
}

export interface MemberResponse {
  memberId: string;
  answers: MemberTasteAnswers;
  updatedAt: string;
}

export interface UserSession {
  userId: string;
  householdCode: string;
  memberId: string;
  updatedAt: string;
}

export type TabType = 'home' | 'discover' | 'family' | 'ask-ai' | 'settings';

export interface CommonGroundData {
  answeredCount: number;
  totalMembers: number;
  allAnswered: boolean;
  topCuisines: { name: string; count: number }[];
  dietaryNotes: { memberName: string; note: string }[];
  topMovieGenres: { name: string; count: number }[];
  topActivities: { name: string; count: number }[];
  suggestedMovies: { title: string; genre: string; vibe: string; why: string }[];
  suggestedDinners: { title: string; cuisine: string; why: string }[];
}
