import { initializeApp } from 'firebase/app';
import { initializeAuth, indexedDBLocalPersistence, browserLocalPersistence, browserSessionPersistence, signInAnonymously } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase
export const app = initializeApp(firebaseConfig);

// Keep getAuth's persistence order, without the unused popup/redirect sign-in code.
export const auth = initializeAuth(app, {
  persistence: [indexedDBLocalPersistence, browserLocalPersistence, browserSessionPersistence],
});

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous ?? true,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export interface AppUser {
  uid: string;
  isAnonymous: boolean;
}

function getFallbackDeviceId(): string {
  const key = 'my_family_device_uid';
  let id = '';
  try {
    id = window.localStorage.getItem(key) || '';
  } catch {
    // ignore
  }
  if (!id) {
    id = `dev_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    try {
      window.localStorage.setItem(key, id);
    } catch {
      // ignore
    }
  }
  return id;
}

// Ensure anonymous authentication or seamless device UID fallback
export async function ensureAnonymousUser(): Promise<AppUser> {
  if (auth.currentUser) {
    return {
      uid: auth.currentUser.uid,
      isAnonymous: true,
    };
  }

  try {
    const cred = await signInAnonymously(auth);
    return {
      uid: cred.user.uid,
      isAnonymous: true,
    };
  } catch (err: unknown) {
    // If anonymous sign-in is disabled in Firebase console (admin-restricted-operation),
    // gracefully fall back to device UID so applet functions smoothly without blocker
    console.warn('Firebase Anonymous Auth provider not yet enabled in console, using device ID fallback:', err);
    return {
      uid: getFallbackDeviceId(),
      isAnonymous: true,
    };
  }
}
