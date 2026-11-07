import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  runTransaction,
  onSnapshot,
  Unsubscribe,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import { Household, HouseholdMember, MemberRole, UserSession, MemberTasteAnswers } from '../types';
import { AVATAR_PALETTE } from '../utils/familyCode';

export interface CreateHouseholdParams {
  code: string;
  name?: string;
  creatorUid: string;
  members: Array<{
    role: MemberRole;
    nickname?: string;
    avatarColor?: string;
  }>;
  selectedMemberIndex: number;
}

/**
 * Checks whether a given Family Code is available (unused)
 */
export async function checkFamilyCodeAvailability(code: string): Promise<boolean> {
  const path = `households/${code}`;
  try {
    const docRef = doc(db, 'households', code);
    const snap = await getDoc(docRef);
    return !snap.exists();
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

/**
 * Atomically creates a household, its members, and empty response placeholders
 */
export async function createHouseholdAtomic(
  params: CreateHouseholdParams
): Promise<{ household: Household; members: HouseholdMember[]; activeMemberId: string }> {
  const { code, name, creatorUid, members: inputMembers, selectedMemberIndex } = params;
  const householdRef = doc(db, 'households', code);
  const nowIso = new Date().toISOString();

  // Generate IDs and documents for members
  const preparedMembers: HouseholdMember[] = inputMembers.map((m, idx) => ({
    id: `m_${idx + 1}_${Math.random().toString(36).substring(2, 7)}`,
    role: m.role,
    nickname: m.nickname?.trim() || undefined,
    avatarColor: m.avatarColor || AVATAR_PALETTE[idx % AVATAR_PALETTE.length],
    createdAt: nowIso,
  }));

  const activeMember = preparedMembers[selectedMemberIndex] || preparedMembers[0];

  const householdData: Household = {
    code,
    name: name?.trim() || `${code} Household`,
    createdBy: creatorUid,
    createdAt: nowIso,
    memberCount: preparedMembers.length,
  };

  try {
    await runTransaction(db, async (transaction) => {
      // 1. Verify code is not already taken
      const existingDoc = await transaction.get(householdRef);
      if (existingDoc.exists()) {
        throw new Error('FAMILY_CODE_TAKEN');
      }

      // 2. Set household document
      transaction.set(householdRef, householdData);

      // 3. Set all initial member documents
      for (const member of preparedMembers) {
        const memberRef = doc(db, 'households', code, 'members', member.id);
        const memberPayload: Record<string, unknown> = {
          id: member.id,
          role: member.role,
          avatarColor: member.avatarColor,
          createdAt: member.createdAt,
        };
        if (member.nickname) {
          memberPayload.nickname = member.nickname;
        }
        transaction.set(memberRef, memberPayload);

        // 4. Set empty responses document for each member (Requirement: separate responses under household)
        const responseRef = doc(db, 'households', code, 'responses', member.id);
        transaction.set(responseRef, {
          memberId: member.id,
          answers: {},
          updatedAt: nowIso,
        });
      }

      // 5. Save device user session
      const sessionRef = doc(db, 'userSessions', creatorUid);
      transaction.set(sessionRef, {
        userId: creatorUid,
        householdCode: code,
        memberId: activeMember.id,
        updatedAt: nowIso,
      });
    });

    return {
      household: householdData,
      members: preparedMembers,
      activeMemberId: activeMember.id,
    };
  } catch (error) {
    if (error instanceof Error && error.message === 'FAMILY_CODE_TAKEN') {
      throw new Error(`Family Code "${code}" is already in use by another household. Please pick different letters or numbers.`);
    }
    handleFirestoreError(error, OperationType.WRITE, `households/${code}`);
  }
}

/**
 * Fetches household document by code
 */
export async function getHousehold(code: string): Promise<Household | null> {
  const path = `households/${code}`;
  try {
    const docRef = doc(db, 'households', code);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;
    return snap.data() as Household;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

/**
 * Fetches all members of a household
 */
export async function getHouseholdMembers(code: string): Promise<HouseholdMember[]> {
  const path = `households/${code}/members`;
  try {
    const colRef = collection(db, 'households', code, 'members');
    const snap = await getDocs(colRef);
    return snap.docs.map((d) => d.data() as HouseholdMember);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

/**
 * Adds a new member to an existing household
 */
export async function addMemberToHousehold(
  code: string,
  role: MemberRole,
  nickname?: string,
  avatarColor?: string
): Promise<HouseholdMember> {
  const memberId = `m_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const nowIso = new Date().toISOString();
  const path = `households/${code}/members/${memberId}`;

  const member: HouseholdMember = {
    id: memberId,
    role,
    nickname: nickname?.trim() || undefined,
    avatarColor: avatarColor || AVATAR_PALETTE[Math.floor(Math.random() * AVATAR_PALETTE.length)],
    createdAt: nowIso,
  };

  try {
    const memberRef = doc(db, 'households', code, 'members', memberId);
    const payload: Record<string, unknown> = {
      id: member.id,
      role: member.role,
      avatarColor: member.avatarColor,
      createdAt: member.createdAt,
    };
    if (member.nickname) {
      payload.nickname = member.nickname;
    }
    await setDoc(memberRef, payload);

    // Also initialize separate empty response doc
    const responseRef = doc(db, 'households', code, 'responses', memberId);
    await setDoc(responseRef, {
      memberId,
      answers: {},
      updatedAt: nowIso,
    });

    return member;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Real-time subscription to household document changes
 */
export function subscribeToHousehold(
  code: string,
  callback: (household: Household | null) => void,
  onError?: (err: unknown) => void
): Unsubscribe {
  const path = `households/${code}`;
  const docRef = doc(db, 'households', code);

  return onSnapshot(
    docRef,
    (snap) => {
      if (snap.exists()) {
        callback(snap.data() as Household);
      } else {
        callback(null);
      }
    },
    (err) => {
      if (onError) onError(err);
      handleFirestoreError(err, OperationType.GET, path);
    }
  );
}

/**
 * Real-time subscription to household members
 */
export function subscribeToMembers(
  code: string,
  callback: (members: HouseholdMember[]) => void,
  onError?: (err: unknown) => void
): Unsubscribe {
  const path = `households/${code}/members`;
  const colRef = collection(db, 'households', code, 'members');

  return onSnapshot(
    colRef,
    (snap) => {
      const list = snap.docs.map((d) => d.data() as HouseholdMember);
      callback(list);
    },
    (err) => {
      if (onError) onError(err);
      handleFirestoreError(err, OperationType.GET, path);
    }
  );
}

/**
 * Saves a member's full answers document. Callers merge with existing answers first so that
 * saving one part (tastes, Foundation, Advanced) never wipes another.
 */
export async function saveMemberAnswers(
  code: string,
  memberId: string,
  answers: MemberTasteAnswers
): Promise<void> {
  const path = `households/${code}/responses/${memberId}`;
  try {
    const responseRef = doc(db, 'households', code, 'responses', memberId);
    await setDoc(responseRef, {
      memberId,
      // Firestore rejects undefined values; JSON round-trip drops them.
      answers: JSON.parse(JSON.stringify(answers)),
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Fetches all member responses for a household
 */
export async function getHouseholdResponses(
  code: string
): Promise<Record<string, MemberTasteAnswers>> {
  const path = `households/${code}/responses`;
  try {
    const colRef = collection(db, 'households', code, 'responses');
    const snap = await getDocs(colRef);
    const result: Record<string, MemberTasteAnswers> = {};
    for (const d of snap.docs) {
      const data = d.data();
      if (data && data.memberId && data.answers) {
        result[data.memberId] = data.answers as MemberTasteAnswers;
      }
    }
    return result;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

/**
 * Real-time subscription to household responses
 */
export function subscribeToResponses(
  code: string,
  callback: (responses: Record<string, MemberTasteAnswers>) => void,
  onError?: (err: unknown) => void
): Unsubscribe {
  const path = `households/${code}/responses`;
  const colRef = collection(db, 'households', code, 'responses');

  return onSnapshot(
    colRef,
    (snap) => {
      const result: Record<string, MemberTasteAnswers> = {};
      for (const d of snap.docs) {
        const data = d.data();
        if (data && data.memberId && data.answers) {
          result[data.memberId] = data.answers as MemberTasteAnswers;
        }
      }
      callback(result);
    },
    (err) => {
      if (onError) onError(err);
      handleFirestoreError(err, OperationType.GET, path);
    }
  );
}

/**
 * Persists device user session in Firestore
 */
export async function saveUserSession(userId: string, householdCode: string, memberId: string): Promise<void> {
  const path = `userSessions/${userId}`;
  try {
    const sessionRef = doc(db, 'userSessions', userId);
    await setDoc(sessionRef, {
      userId,
      householdCode,
      memberId,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Retrieves device user session from Firestore
 */
export async function getUserSession(userId: string): Promise<UserSession | null> {
  const path = `userSessions/${userId}`;
  try {
    const sessionRef = doc(db, 'userSessions', userId);
    const snap = await getDoc(sessionRef);
    if (!snap.exists()) return null;
    return snap.data() as UserSession;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

/**
 * Clears device user session from Firestore
 */
export async function clearUserSession(userId: string): Promise<void> {
  const path = `userSessions/${userId}`;
  try {
    const sessionRef = doc(db, 'userSessions', userId);
    await deleteDoc(sessionRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}
