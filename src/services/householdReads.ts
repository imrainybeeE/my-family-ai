// Startup only needs server reads. Live listeners and writes load the full SDK
// from householdService after a real family is restored or someone joins one.
import { collection, doc, getDoc, getDocs, getFirestore } from 'firebase/firestore/lite';
import { app, handleFirestoreError, OperationType } from './firebase';
import firebaseConfig from '../../firebase-applet-config.json';
import type { Household, HouseholdMember, UserSession } from '../types';

const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

export async function getHousehold(code: string): Promise<Household | null> {
  try {
    const snap = await getDoc(doc(db, 'households', code));
    return snap.exists() ? snap.data() as Household : null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `households/${code}`);
  }
}

export async function getHouseholdMembers(code: string): Promise<HouseholdMember[]> {
  try {
    const snap = await getDocs(collection(db, 'households', code, 'members'));
    return snap.docs.map((d) => d.data() as HouseholdMember);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, `households/${code}/members`);
  }
}

export async function getUserSession(userId: string): Promise<UserSession | null> {
  try {
    const snap = await getDoc(doc(db, 'userSessions', userId));
    return snap.exists() ? snap.data() as UserSession : null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `userSessions/${userId}`);
  }
}
