import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import {
  ensureAnonymousUser,
  testConnection,
  AppUser,
} from '../services/firebase';
import {
  createHouseholdAtomic,
  getHousehold,
  getHouseholdMembers,
  subscribeToHousehold,
  subscribeToMembers,
  subscribeToResponses,
  addMemberToHousehold,
  saveMemberTasteAnswers,
  saveMemberFoundationAnswers,
  saveUserSession,
  getUserSession,
  clearUserSession,
} from '../services/householdService';
import { Household, HouseholdMember, MemberRole, MemberTasteAnswers, DiscoveryProfile } from '../types';

interface HouseholdContextType {
  user: AppUser | null;
  household: Household | null;
  members: HouseholdMember[];
  activeMember: HouseholdMember | null;
  responses: Record<string, MemberTasteAnswers>;
  isLoading: boolean;
  error: string | null;
  clearError: () => void;
  createHousehold: (
    code: string,
    name: string | undefined,
    members: Array<{ role: MemberRole; nickname?: string; avatarColor?: string }>,
    selectedMemberIndex: number
  ) => Promise<void>;
  joinWithCode: (code: string) => Promise<HouseholdMember[]>;
  selectActiveMember: (memberId: string) => Promise<void>;
  addMember: (role: MemberRole, nickname?: string) => Promise<void>;
  saveMyTasteAnswers: (answers: MemberTasteAnswers) => Promise<void>;
  saveMyFoundationAnswers: (
    foundationAnswers: Record<string, string | string[]>,
    discoveryProfile: DiscoveryProfile
  ) => Promise<void>;
  leaveHousehold: () => Promise<void>;
}

const HouseholdContext = createContext<HouseholdContextType | undefined>(undefined);

export function HouseholdProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [household, setHousehold] = useState<Household | null>(null);
  const [members, setMembers] = useState<HouseholdMember[]>([]);
  const [activeMemberId, setActiveMemberId] = useState<string | null>(null);
  const [responses, setResponses] = useState<Record<string, MemberTasteAnswers>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  // Initial boot: anonymous auth, Firestore connection check, restore session
  useEffect(() => {
    let isMounted = true;

    async function initApp() {
      try {
        setIsLoading(true);
        // Test firestore connection per skill instructions
        await testConnection();

        // Ensure anonymous user session
        const authUser = await ensureAnonymousUser();
        if (!isMounted) return;
        setUser(authUser);

        // Check local storage redundancy first for instant restoration
        let targetCode = '';
        let targetMemberId = '';

        try {
          const localStored = window.localStorage.getItem('myfamilyai_last_session');
          if (localStored) {
            const parsed = JSON.parse(localStored);
            if (parsed && typeof parsed.householdCode === 'string') {
              targetCode = parsed.householdCode;
              targetMemberId = parsed.memberId || '';
            }
          }
        } catch {
          // ignore
        }

        // Check user session in Firestore if not found locally
        if (!targetCode) {
          const session = await getUserSession(authUser.uid);
          if (session && session.householdCode) {
            targetCode = session.householdCode;
            targetMemberId = session.memberId || '';
          }
        }

        if (targetCode) {
          const hh = await getHousehold(targetCode);
          if (hh && isMounted) {
            setHousehold(hh);
            const mList = await getHouseholdMembers(targetCode);
            if (isMounted) {
              setMembers(mList);
              const validMemberId =
                targetMemberId && mList.some((m) => m.id === targetMemberId)
                  ? targetMemberId
                  : mList[0]?.id || null;
              setActiveMemberId(validMemberId);
            }
          }
        }
      } catch (err) {
        console.error('Initialization error:', err);
        if (isMounted) {
          setError('Could not connect to database. Please refresh or check connection.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    initApp();

    return () => {
      isMounted = false;
    };
  }, []);

  // Real-time synchronization when a household is active
  useEffect(() => {
    if (!household?.code) return;

    const unsubHousehold = subscribeToHousehold(
      household.code,
      (updatedHh) => {
        if (updatedHh) {
          setHousehold(updatedHh);
        }
      },
      (err) => {
        console.warn('Realtime household sync note:', err);
      }
    );

    const unsubMembers = subscribeToMembers(
      household.code,
      (updatedMembers) => {
        if (updatedMembers && updatedMembers.length > 0) {
          const map = new Map(updatedMembers.map((m) => [m.id, m]));
          setMembers(Array.from(map.values()));
        }
      },
      (err) => {
        console.warn('Realtime members sync note:', err);
      }
    );

    const unsubResponses = subscribeToResponses(
      household.code,
      (updatedResponses) => {
        if (updatedResponses) {
          setResponses(updatedResponses);
        }
      },
      (err) => {
        console.warn('Realtime responses sync note:', err);
      }
    );

    return () => {
      unsubHousehold();
      unsubMembers();
      unsubResponses();
    };
  }, [household?.code]);

  // Derive active member object
  const activeMember = useMemo(() => {
    if (!activeMemberId || members.length === 0) return null;
    return members.find((m) => m.id === activeMemberId) || null;
  }, [activeMemberId, members]);

  // Create household action
  const createHousehold = useCallback(
    async (
      code: string,
      name: string | undefined,
      memberList: Array<{ role: MemberRole; nickname?: string; avatarColor?: string }>,
      selectedMemberIndex: number
    ) => {
      setError(null);
      let currentUser = user;
      if (!currentUser) {
        currentUser = await ensureAnonymousUser();
        setUser(currentUser);
      }

      try {
        const result = await createHouseholdAtomic({
          code,
          name,
          creatorUid: currentUser.uid,
          members: memberList,
          selectedMemberIndex,
        });

        setHousehold(result.household);
        setMembers(result.members);
        setActiveMemberId(result.activeMemberId);

        try {
          window.localStorage.setItem(
            'myfamilyai_last_session',
            JSON.stringify({
              householdCode: result.household.code,
              memberId: result.activeMemberId,
            })
          );
        } catch {
          // ignore
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to create household.';
        setError(msg);
        throw err;
      }
    },
    [user]
  );

  // Join existing household by Family Code (returns members so user can pick their profile)
  const joinWithCode = useCallback(
    async (code: string): Promise<HouseholdMember[]> => {
      setError(null);
      let currentUser = user;
      if (!currentUser) {
        currentUser = await ensureAnonymousUser();
        setUser(currentUser);
      }

      const hh = await getHousehold(code);
      if (!hh) {
        const notFoundErr = `No household found with code "${code}". Please check for typos.`;
        setError(notFoundErr);
        throw new Error(notFoundErr);
      }

      const mList = await getHouseholdMembers(code);
      setHousehold(hh);
      setMembers(mList);
      return mList;
    },
    [user]
  );

  // Select profile on device
  const selectActiveMember = useCallback(
    async (memberId: string) => {
      setError(null);
      if (!household || !user) return;

      try {
        await saveUserSession(user.uid, household.code, memberId);
        setActiveMemberId(memberId);
        try {
          window.localStorage.setItem(
            'myfamilyai_last_session',
            JSON.stringify({
              householdCode: household.code,
              memberId,
            })
          );
        } catch {
          // ignore
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to select member profile.';
        setError(msg);
        throw err;
      }
    },
    [household, user]
  );

  // Add new member to active household
  const addMember = useCallback(
    async (role: MemberRole, nickname?: string) => {
      setError(null);
      if (!household) return;

      try {
        const newMem = await addMemberToHousehold(household.code, role, nickname);
        setMembers((prev) => {
          const map = new Map(prev.map((m) => [m.id, m]));
          map.set(newMem.id, newMem);
          return Array.from(map.values());
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to add member.';
        setError(msg);
        throw err;
      }
    },
    [household]
  );

  // Save taste survey responses for active member
  const saveMyTasteAnswers = useCallback(
    async (answers: MemberTasteAnswers) => {
      setError(null);
      if (!household || !activeMember) return;

      try {
        await saveMemberTasteAnswers(household.code, activeMember.id, answers);
        setResponses((prev) => ({
          ...prev,
          [activeMember.id]: answers,
        }));
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to save taste answers.';
        setError(msg);
        throw err;
      }
    },
    [household, activeMember]
  );

  // Save Foundation Discovery responses & profile for active member
  const saveMyFoundationAnswers = useCallback(
    async (
      foundationAnswers: Record<string, string | string[]>,
      discoveryProfile: DiscoveryProfile
    ) => {
      setError(null);
      if (!household || !activeMember) return;

      try {
        const existingAnswers = responses[activeMember.id] || {};
        await saveMemberFoundationAnswers(
          household.code,
          activeMember.id,
          foundationAnswers,
          discoveryProfile,
          existingAnswers
        );
        setResponses((prev) => ({
          ...prev,
          [activeMember.id]: {
            ...existingAnswers,
            foundationAnswers,
            discoveryProfile,
          },
        }));
      } catch (err: unknown) {
        const msg =
          err instanceof Error
            ? err.message
            : 'Failed to save Foundation Discovery answers.';
        setError(msg);
        throw err;
      }
    },
    [household, activeMember, responses]
  );

  // Disconnect/Leave household
  const leaveHousehold = useCallback(async () => {
    setError(null);
    if (user) {
      try {
        await clearUserSession(user.uid);
      } catch (err) {
        console.warn('Failed to clear user session on leave:', err);
      }
    }
    try {
      window.localStorage.removeItem('myfamilyai_last_session');
    } catch {
      // ignore
    }
    setHousehold(null);
    setMembers([]);
    setResponses({});
    setActiveMemberId(null);
  }, [user]);

  const value = useMemo(
    () => ({
      user,
      household,
      members,
      activeMember,
      responses,
      isLoading,
      error,
      clearError,
      createHousehold,
      joinWithCode,
      selectActiveMember,
      addMember,
      saveMyTasteAnswers,
      saveMyFoundationAnswers,
      leaveHousehold,
    }),
    [
      user,
      household,
      members,
      activeMember,
      responses,
      isLoading,
      error,
      clearError,
      createHousehold,
      joinWithCode,
      selectActiveMember,
      addMember,
      saveMyTasteAnswers,
      saveMyFoundationAnswers,
      leaveHousehold,
    ]
  );

  return <HouseholdContext.Provider value={value}>{children}</HouseholdContext.Provider>;
}

export function useHousehold() {
  const context = useContext(HouseholdContext);
  if (!context) {
    throw new Error('useHousehold must be used within a HouseholdProvider');
  }
  return context;
}
