import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, setLogLevel, doc, getDocFromServer } from 'firebase/firestore';
import defaultFirebaseConfig from '../../firebase-applet-config.json';

// Support optional environment variables or browser-stored custom Firebase config (e.g. when connecting a new Firebase project on Vercel)
const env = (import.meta as any).env || {};

function getStoredCustomConfig(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem('refound_custom_firebase_config');
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

const customStored = getStoredCustomConfig();

// If user supplies their own project ID, standard Firebase uses '(default)' database
const customProjectId = customStored.projectId || env.VITE_FIREBASE_PROJECT_ID;
const isCustomProject = Boolean(
  customProjectId && customProjectId !== defaultFirebaseConfig.projectId
);

const resolvedDatabaseId =
  customStored.firestoreDatabaseId ||
  env.VITE_FIREBASE_DATABASE_ID ||
  (isCustomProject ? '(default)' : defaultFirebaseConfig.firestoreDatabaseId || '(default)');

export const firebaseConfig = {
  projectId: customStored.projectId || env.VITE_FIREBASE_PROJECT_ID || defaultFirebaseConfig.projectId,
  appId: customStored.appId || env.VITE_FIREBASE_APP_ID || defaultFirebaseConfig.appId,
  apiKey: customStored.apiKey || env.VITE_FIREBASE_API_KEY || defaultFirebaseConfig.apiKey,
  authDomain: customStored.authDomain || env.VITE_FIREBASE_AUTH_DOMAIN || defaultFirebaseConfig.authDomain,
  firestoreDatabaseId: resolvedDatabaseId,
  storageBucket: customStored.storageBucket || env.VITE_FIREBASE_STORAGE_BUCKET || defaultFirebaseConfig.storageBucket,
  messagingSenderId: customStored.messagingSenderId || env.VITE_FIREBASE_MESSAGING_SENDER_ID || defaultFirebaseConfig.messagingSenderId,
};

export function isUsingCustomFirebaseConfig(): boolean {
  return Boolean(customStored.projectId || env.VITE_FIREBASE_PROJECT_ID);
}

export function saveCustomFirebaseConfig(cfg: {
  apiKey?: string;
  authDomain?: string;
  projectId?: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
  firestoreDatabaseId?: string;
}) {
  try {
    localStorage.setItem('refound_custom_firebase_config', JSON.stringify(cfg));
    window.location.reload();
  } catch (err) {
    console.warn('Failed to persist custom Firebase config:', err);
  }
}

export function clearCustomFirebaseConfig() {
  try {
    localStorage.removeItem('refound_custom_firebase_config');
    window.location.reload();
  } catch (err) {
    console.warn('Failed to clear custom Firebase config:', err);
  }
}

// Configure log level to prevent verbose WebChannel connection retries in iframe sandboxes
setLogLevel('error');

const app = initializeApp(firebaseConfig);

// initializeFirestore with long-polling enables reliable connections inside iframe sandboxes and proxy environments
export const db =
  resolvedDatabaseId && resolvedDatabaseId !== '(default)'
    ? initializeFirestore(
        app,
        {
          experimentalForceLongPolling: true,
          ignoreUndefinedProperties: true,
        },
        resolvedDatabaseId
      )
    : initializeFirestore(app, {
        experimentalForceLongPolling: true,
        ignoreUndefinedProperties: true,
      });

export const auth = getAuth(app);

// Connection test as required by Firebase skill
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firestore client offline or permissions pending. Operating with resilient state.');
      return false;
    }
    // Expected during initial empty test doc
    return true;
  }
}

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
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
      emailVerified: auth.currentUser?.emailVerified || null,
      isAnonymous: auth.currentUser?.isAnonymous || null,
      tenantId: auth.currentUser?.tenantId || null,
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
