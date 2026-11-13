import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { AppUser } from '../services/firebase';
import { buildBrief, FamilyBrief } from '../services/brief';
import { DEMO_ACTIVE_MEMBER, DEMO_HOUSEHOLD, DEMO_MEMBERS, DEMO_RESPONSES } from '../data/demoFamily';
import { AVATAR_PALETTE } from '../utils/familyCode';
import { mergeAnswers, rollbackAnswers } from '../utils/member';
import { Household, HouseholdMember, MemberRole, MemberTasteAnswers } from '../types';

// The demo never talks to Firebase. Keep the SDK off that route's import graph.
const firebase = () => import('../services/firebase');
const store = () => import('../services/householdService');

const SESSION_KEY = 'myfamilyai_last_session';
const DEMO_KEY = 'myfamilyai_demo';

interface HouseholdContextType {
  user: AppUser | null;
  household: Household | null;
  members: HouseholdMember[];
  activeMember: HouseholdMember | null;
  responses: Record<string, MemberTasteAnswers>;
  /** The active member's own answers (never undefined). */
  myAnswers: MemberTasteAnswers;
  /** Family data in the shape the AI receives, from the active member's point of view. */
  brief: FamilyBrief;
  isDemo: boolean;
  isLoading: boolean;
  error: string | null;
  clearError: () => void;
  createHousehold: (
    code: string,
    name: string | undefined,
    members: Array<{ role: MemberRole; nickname?: string; avatarColor?: string }>,
    selectedMemberIndex: number
  ) => Promise<void>;
  /** Looks a family up by code without joining it. */
  lookupFamily: (code: string) => Promise<{ household: Household; members: HouseholdMember[] }>;
  /** Joins a looked-up family as an existing member, or as a new one. */
  joinFamily: (
    found: { household: Household; members: HouseholdMember[] },
    who: { memberId: string } | { role: MemberRole; nickname?: string }
  ) => Promise<void>;
  selectActiveMember: (memberId: string) => Promise<void>;
  addMember: (role: MemberRole, nickname?: string) => Promise<HouseholdMember | undefined>;
  /** Merges a patch into the active member's answers and saves the whole document. */
  updateMyAnswers: (patch: Partial<MemberTasteAnswers>) => Promise<void>;
  startDemo: () => void;
  leaveHousehold: () => Promise<void>;
}

const HouseholdContext = createContext<HouseholdContextType | undefined>(undefined);

function remember(householdCode: string, memberId: string) {
  try {
    window.localStorage.setItem(SESSION_KEY, JSON.stringify({ householdCode, memberId }));
  } catch {
    // Storage can be unavailable (private mode); the Firestore session still restores.
  }
}

function errorText(err: unknown, fallback: string): string {
  if (!(err instanceof Error)) return fallback;
  // Firestore errors arrive as JSON blobs; show people something readable instead.
  return err.message.startsWith('{') ? fallback : err.message;
}

export function HouseholdProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [household, setHousehold] = useState<Household | null>(null);
  const [members, setMembers] = useState<HouseholdMember[]>([]);
  const [activeMemberId, setActiveMemberId] = useState<string | null>(null);
  const [responses, setResponses] = useState<Record<string, MemberTasteAnswers>>({});
  const [isDemo, setIsDemo] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const responsesRef = useRef(responses);
  responsesRef.current = responses;

  const clearError = useCallback(() => setError(null), []);

  const loadDemo = useCallback(() => {
    setHousehold(DEMO_HOUSEHOLD);
    setMembers(DEMO_MEMBERS);
    setResponses(DEMO_RESPONSES);
    setActiveMemberId(DEMO_ACTIVE_MEMBER);
    setIsDemo(true);
  }, []);

  // Boot: demo link or saved demo, else restore the saved household session.
  useEffect(() => {
    let alive = true;
    async function init() {
      const params = new URLSearchParams(window.location.search);
      let demoSaved = false;
      try {
        demoSaved = window.localStorage.getItem(DEMO_KEY) === '1';
      } catch {
        // ignore
      }
      if (params.has('demo') || demoSaved) {
        loadDemo();
        setIsLoading(false);
        return;
      }
      try {
        const [{ ensureAnonymousUser }, { getUserSession, getHousehold, getHouseholdMembers }] = await Promise.all([
          firebase(), import('../services/householdReads'),
        ]);
        const authUser = await ensureAnonymousUser();
        if (!alive) return;
        setUser(authUser);

        let code = '';
        let memberId = '';
        try {
          const saved = JSON.parse(window.localStorage.getItem(SESSION_KEY) || 'null');
          if (saved && typeof saved.householdCode === 'string') {
            code = saved.householdCode;
            memberId = saved.memberId || '';
          }
        } catch {
          // ignore
        }
        if (!code) {
          const session = await getUserSession(authUser.uid);
          if (session?.householdCode) {
            code = session.householdCode;
            memberId = session.memberId || '';
          }
        }
        if (code) {
          const hh = await getHousehold(code);
          if (hh && alive) {
            const list = await getHouseholdMembers(code);
            if (!alive) return;
            setHousehold(hh);
            setMembers(list);
            setActiveMemberId(list.some((m) => m.id === memberId) ? memberId : list[0]?.id || null);
          }
        }
      } catch (err) {
        console.error('Initialization error:', err);
        if (alive) setError('Couldn’t reach your family’s data. Check your connection, then reload.');
      } finally {
        if (alive) setIsLoading(false);
      }
    }
    init();
    return () => {
      alive = false;
    };
  }, [loadDemo]);

  // Live sync with Firestore (not in demo mode).
  useEffect(() => {
    if (!household?.code || isDemo) return;
    const note = (what: string) => (err: unknown) => console.warn(`Realtime ${what} sync note:`, err);
    let cancelled = false;
    let unsubs: Array<() => void> = [];
    store().then(({ subscribeToHousehold, subscribeToMembers, subscribeToResponses }) => {
      if (cancelled) return;
      unsubs = [
        subscribeToHousehold(household.code, (hh) => hh && setHousehold(hh), note('household')),
        subscribeToMembers(
          household.code,
          (list) => list.length && setMembers(Array.from(new Map(list.map((m) => [m.id, m])).values())),
          note('members')
        ),
        subscribeToResponses(household.code, (r) => setResponses(r), note('responses')),
      ];
    }).catch(note('initialization'));
    return () => {
      cancelled = true;
      unsubs.forEach((u) => u());
    };
  }, [household?.code, isDemo]);

  const activeMember = useMemo(
    () => members.find((m) => m.id === activeMemberId) || null,
    [activeMemberId, members]
  );

  const myAnswers = useMemo(
    () => (activeMember ? responses[activeMember.id] || {} : {}),
    [activeMember, responses]
  );

  const brief = useMemo(
    () => buildBrief(household?.name, members, responses, activeMember?.id),
    [household?.name, members, responses, activeMember?.id]
  );

  const ensureUser = useCallback(async () => {
    if (user) return user;
    const u = await (await firebase()).ensureAnonymousUser();
    setUser(u);
    return u;
  }, [user]);

  const createHousehold = useCallback<HouseholdContextType['createHousehold']>(
    async (code, name, memberList, selectedMemberIndex) => {
      setError(null);
      const currentUser = await ensureUser();
      try {
        const result = await (await store()).createHouseholdAtomic({
          code,
          name,
          creatorUid: currentUser.uid,
          members: memberList,
          selectedMemberIndex,
        });
        setIsDemo(false);
        setHousehold(result.household);
        setMembers(result.members);
        setResponses({});
        setActiveMemberId(result.activeMemberId);
        remember(result.household.code, result.activeMemberId);
      } catch (err) {
        throw new Error(errorText(err, 'Couldn’t create your family. Check your connection and try again.'));
      }
    },
    [ensureUser]
  );

  const lookupFamily = useCallback(
    async (code: string) => {
      setError(null);
      await ensureUser();
      let hh: Household | null;
      try {
        hh = await (await store()).getHousehold(code);
      } catch (err) {
        throw new Error(errorText(err, 'Couldn’t look up that code. Check your connection and try again.'));
      }
      if (!hh) throw new Error(`No family uses ${code}. Check the letters and numbers with whoever shared it.`);
      const list = await (await store()).getHouseholdMembers(code);
      return { household: hh, members: list };
    },
    [ensureUser]
  );

  const joinFamily = useCallback<HouseholdContextType['joinFamily']>(
    async (found, who) => {
      setError(null);
      const currentUser = await ensureUser();
      const code = found.household.code;
      let list = found.members;
      let memberId: string;
      try {
        if ('memberId' in who) {
          memberId = who.memberId;
        } else {
          const added = await (await store()).addMemberToHousehold(code, who.role, who.nickname);
          list = [...list, added];
          memberId = added.id;
        }
        await (await store()).saveUserSession(currentUser.uid, code, memberId);
      } catch (err) {
        throw new Error(errorText(err, 'Couldn’t join. Check your connection and try again.'));
      }
      setIsDemo(false);
      setResponses({});
      setMembers(list);
      setActiveMemberId(memberId);
      setHousehold(found.household);
      remember(code, memberId);
    },
    [ensureUser]
  );

  const selectActiveMember = useCallback(
    async (memberId: string) => {
      setError(null);
      if (!household) return;
      if (isDemo) {
        setActiveMemberId(memberId);
        return;
      }
      const currentUser = await ensureUser();
      try {
        await (await store()).saveUserSession(currentUser.uid, household.code, memberId);
      } catch (err) {
        throw new Error(errorText(err, 'Couldn’t switch profiles. Try again.'));
      }
      setActiveMemberId(memberId);
      remember(household.code, memberId);
    },
    [household, isDemo, ensureUser]
  );

  const addMember = useCallback(
    async (role: MemberRole, nickname?: string) => {
      setError(null);
      if (!household) return undefined;
      if (isDemo) {
        const m: HouseholdMember = {
          id: `demo_${Date.now()}`,
          role,
          nickname: nickname?.trim() || undefined,
          avatarColor: AVATAR_PALETTE[members.length % AVATAR_PALETTE.length],
        };
        setMembers((prev) => [...prev, m]);
        return m;
      }
      try {
        const m = await (await store()).addMemberToHousehold(household.code, role, nickname);
        setMembers((prev) => Array.from(new Map([...prev, m].map((x) => [x.id, x])).values()));
        return m;
      } catch (err) {
        throw new Error(errorText(err, 'Couldn’t add that person. Try again.'));
      }
    },
    [household, isDemo, members.length]
  );

  const updateMyAnswers = useCallback(
    async (patch: Partial<MemberTasteAnswers>) => {
      if (!household || !activeMember) return;
      const id = activeMember.id;
      const previous = responsesRef.current[id];
      const merged = mergeAnswers(previous, patch);
      // Show the change straight away; put it back if the save fails, so the screen and the
      // AI only ever reflect answers that were actually saved.
      responsesRef.current = { ...responsesRef.current, [id]: merged };
      setResponses((prev) => ({ ...prev, [id]: merged }));
      if (isDemo) return;
      try {
        await (await store()).saveMemberAnswers(household.code, id, merged);
      } catch (err) {
        responsesRef.current = rollbackAnswers(responsesRef.current, id, merged, previous);
        setResponses((prev) => rollbackAnswers(prev, id, merged, previous));
        const msg = errorText(err, 'Couldn’t save your answers. Check your connection and try again.');
        setError(msg);
        throw new Error(msg);
      }
    },
    [household, activeMember, isDemo]
  );

  const startDemo = useCallback(() => {
    try {
      window.localStorage.setItem(DEMO_KEY, '1');
    } catch {
      // ignore
    }
    loadDemo();
  }, [loadDemo]);

  const leaveHousehold = useCallback(async () => {
    setError(null);
    if (!isDemo && user) {
      try {
        await (await store()).clearUserSession(user.uid);
      } catch (err) {
        console.warn('Failed to clear user session on leave:', err);
      }
    }
    try {
      window.localStorage.removeItem(SESSION_KEY);
      window.localStorage.removeItem(DEMO_KEY);
    } catch {
      // ignore
    }
    if (isDemo && window.location.search.includes('demo')) {
      window.history.replaceState(null, '', window.location.pathname);
    }
    setIsDemo(false);
    setHousehold(null);
    setMembers([]);
    setResponses({});
    setActiveMemberId(null);
  }, [user, isDemo]);

  const value = useMemo(
    () => ({
      user,
      household,
      members,
      activeMember,
      responses,
      myAnswers,
      brief,
      isDemo,
      isLoading,
      error,
      clearError,
      createHousehold,
      lookupFamily,
      joinFamily,
      selectActiveMember,
      addMember,
      updateMyAnswers,
      startDemo,
      leaveHousehold,
    }),
    [
      user,
      household,
      members,
      activeMember,
      responses,
      myAnswers,
      brief,
      isDemo,
      isLoading,
      error,
      clearError,
      createHousehold,
      lookupFamily,
      joinFamily,
      selectActiveMember,
      addMember,
      updateMyAnswers,
      startDemo,
      leaveHousehold,
    ]
  );

  return <HouseholdContext.Provider value={value}>{children}</HouseholdContext.Provider>;
}

export function useHousehold() {
  const context = useContext(HouseholdContext);
  if (!context) throw new Error('useHousehold must be used within a HouseholdProvider');
  return context;
}
