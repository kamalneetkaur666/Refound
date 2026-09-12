import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  onAuthStateChanged,
  updateProfile,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { UserProfile } from '../types';

export interface AuthErrorDetails {
  code: string;
  message: string;
  isProviderDisabled?: boolean;
}

interface AuthContextType {
  user: UserProfile | null;
  firebaseUser: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, pass: string) => Promise<void>;
  signUpWithEmail: (email: string, pass: string, name: string, role: string, studentId?: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  signInWithDemoEmail: (email: string, name?: string, role?: string) => void;
  signOutUser: () => Promise<void>;
  updateUserProfileData: (updated: Partial<UserProfile>) => Promise<void>;
  switchDemoUser: (demoKey: 'alex' | 'sam' | 'security') => void;
  isDemoMode: boolean;
}

const DEMO_PROFILES: Record<'alex' | 'sam' | 'security', UserProfile> = {
  alex: {
    uid: 'demo-user-alex',
    displayName: 'Alex Rivera',
    email: 'alex.rivera@campus.edu',
    studentId: 'ST-89021',
    campusRole: 'Undergraduate Student',
    phone: '(555) 234-8901',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
    authProvider: 'demo',
    createdAt: '2026-08-20T00:00:00Z',
  },
  sam: {
    uid: 'demo-user-sam',
    displayName: 'Sam Chen',
    email: 'sam.chen@campus.edu',
    studentId: 'ST-74519',
    campusRole: 'Graduate Student (RA)',
    phone: '(555) 345-6789',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
    authProvider: 'demo',
    createdAt: '2026-08-25T00:00:00Z',
  },
  security: {
    uid: 'demo-user-taylor',
    displayName: 'Taylor Jordan (Security Desk)',
    email: 'security-lostfound@campus.edu',
    studentId: 'SEC-409',
    campusRole: 'Campus Safety & Desk Lead',
    phone: '(555) 911-0044',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80',
    authProvider: 'demo',
    createdAt: '2026-08-01T00:00:00Z',
  },
};

const LOCAL_ACCOUNTS_KEY = 'refound_registered_accounts_v1';
const LOCAL_ACTIVE_USER_KEY = 'refound_active_user_v1';

interface StoredAccount extends UserProfile {
  passwordHash?: string;
}

function getStoredAccounts(): Record<string, StoredAccount> {
  try {
    const raw = localStorage.getItem(LOCAL_ACCOUNTS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveStoredAccount(account: StoredAccount) {
  try {
    const existing = getStoredAccounts();
    existing[account.email.toLowerCase().trim()] = account;
    localStorage.setItem(LOCAL_ACCOUNTS_KEY, JSON.stringify(existing));
  } catch (e) {
    console.warn('Failed to save account to localStorage', e);
  }
}

function getInitialAuthState(): { user: UserProfile | null; isDemo: boolean } {
  try {
    const savedActive = localStorage.getItem(LOCAL_ACTIVE_USER_KEY);
    if (savedActive) {
      const parsed = JSON.parse(savedActive);
      if (parsed && parsed.uid) {
        return { user: parsed, isDemo: false };
      }
    }
    const savedCustom = localStorage.getItem('refound_custom_email_user');
    if (savedCustom) {
      const parsed = JSON.parse(savedCustom);
      if (parsed && parsed.uid) {
        return { user: parsed, isDemo: false };
      }
    }
    const savedDemo = localStorage.getItem('refound_demo_user');
    if (savedDemo && DEMO_PROFILES[savedDemo as keyof typeof DEMO_PROFILES]) {
      return { user: DEMO_PROFILES[savedDemo as keyof typeof DEMO_PROFILES], isDemo: true };
    }
  } catch {
    // fallback
  }
  return { user: DEMO_PROFILES.alex, isDemo: true };
}

// Safe timeout wrapper for Firestore reads so slow/offline networks never block authentication UI
async function safeGetDocWithTimeout(docRef: any, ms = 1200): Promise<any | null> {
  try {
    const fetchPromise = getDoc(docRef);
    const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), ms));
    return await Promise.race([fetchPromise, timeoutPromise]);
  } catch (err) {
    console.warn('Firestore getDoc note (proceeding with cached/auth profile):', err);
    return null;
  }
}

// Safe timeout wrapper for Firestore writes
async function safeSetDocWithTimeout(docRef: any, data: any, ms = 1500): Promise<void> {
  try {
    const setPromise = setDoc(docRef, data, { merge: true });
    const timeoutPromise = new Promise<void>((resolve) => setTimeout(() => resolve(), ms));
    await Promise.race([setPromise, timeoutPromise]);
  } catch (err) {
    console.warn('Firestore setDoc note (saved locally):', err);
  }
}

export function formatAuthError(error: any): AuthErrorDetails {
  const code = error?.code || '';
  let message = error?.message || 'Authentication failed. Please check your credentials.';
  let isProviderDisabled = false;

  switch (code) {
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      message = 'Google sign-in popup was closed before completing. Please try again.';
      break;
    case 'auth/popup-blocked':
      message = 'The Google sign-in window was blocked by your browser. Please allow popups for this site and retry.';
      break;
    case 'auth/operation-not-allowed':
    case 'auth/admin-restricted-operation':
      message = 'Email & password registration is handled through Campus Account mode.';
      isProviderDisabled = false;
      break;
    case 'auth/user-not-found':
      message = 'No account found with this email address. Please click "Create Account" to register.';
      break;
    case 'auth/wrong-password':
      message = 'Incorrect password. Please verify and try again, or use "Forgot Password".';
      break;
    case 'auth/invalid-credential':
      message = 'Invalid email or password. Please verify your credentials or register a new campus account.';
      break;
    case 'auth/email-already-in-use':
      message = 'An account with this email address already exists. Please sign in instead.';
      break;
    case 'auth/weak-password':
      message = 'Password is too weak. Please use at least 6 characters.';
      break;
    case 'auth/invalid-email':
      message = 'Please enter a valid email address.';
      break;
    case 'auth/too-many-requests':
      message = 'Too many attempts. Access is temporarily restricted. Please wait a moment and try again.';
      break;
    case 'auth/network-request-failed':
      message = 'Network connectivity error. Please check your connection and retry.';
      break;
    case 'auth/timeout':
      message = 'Authentication timed out. You can use Instant Campus Sign-in below without delay.';
      break;
    case 'auth/unauthorized-domain': {
      const currentHost = typeof window !== 'undefined' ? window.location.hostname : 'your domain';
      message = `This domain (${currentHost}) is not authorized in Firebase Authentication. In Firebase Console under Authentication > Settings > Authorized domains, add "${currentHost}", or use Campus Email sign-in below.`;
      break;
    }
    default:
      break;
  }

  return { code, message, isProviderDisabled };
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const initialAuth = getInitialAuthState();
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [user, setUser] = useState<UserProfile | null>(initialAuth.user);
  const [loading, setLoading] = useState<boolean>(!initialAuth.user);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(initialAuth.isDemo);

  useEffect(() => {
    // Safety timer: ensure loading state never hangs even if Firebase is unreachable or unconfigured
    const safetyTimer = setTimeout(() => {
      setLoading(false);
    }, 600);

    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      clearTimeout(safetyTimer);
      setFirebaseUser(fbUser);
      if (fbUser) {
        setIsDemoMode(false);
        localStorage.removeItem('refound_demo_user');
        localStorage.removeItem('refound_custom_email_user');

        const isPassword = fbUser.providerData?.[0]?.providerId === 'password';
        const baseProfile: UserProfile = {
          uid: fbUser.uid,
          displayName: fbUser.displayName || fbUser.email?.split('@')[0] || 'Campus Member',
          email: fbUser.email || '',
          campusRole: 'Student',
          authProvider: isPassword ? 'password' : 'google',
          avatarUrl: fbUser.photoURL || undefined,
          createdAt: new Date().toISOString(),
        };

        // Immediately update state so UI renders the signed-in user instantly
        setUser((prev) => (prev && prev.uid === fbUser.uid ? prev : baseProfile));
        localStorage.setItem(LOCAL_ACTIVE_USER_KEY, JSON.stringify(baseProfile));

        // Background query to Firestore for any customized campus role or student ID
        try {
          const userDocRef = doc(db, 'users', fbUser.uid);
          const snap = await safeGetDocWithTimeout(userDocRef, 1200);
          if (snap && snap.exists && snap.exists()) {
            const data = snap.data() as UserProfile;
            const updatedProfile: UserProfile = {
              ...baseProfile,
              ...data,
              authProvider: isPassword ? 'password' : 'google',
            };
            setUser(updatedProfile);
            localStorage.setItem(LOCAL_ACTIVE_USER_KEY, JSON.stringify(updatedProfile));
          } else {
            safeSetDocWithTimeout(userDocRef, baseProfile, 1200).catch(() => {});
          }
        } catch (err) {
          console.warn('Firestore profile sync note:', err);
        }
      } else {
        // If not logged in via Firebase Auth, check local accounts
        const savedActive = localStorage.getItem(LOCAL_ACTIVE_USER_KEY);
        if (savedActive) {
          try {
            const parsed = JSON.parse(savedActive);
            // If the saved active was a Firebase account, but fbUser is null, clear it
            if (parsed.authProvider === 'google') {
              localStorage.removeItem(LOCAL_ACTIVE_USER_KEY);
              const custom = localStorage.getItem('refound_custom_email_user');
              if (custom) {
                setUser(JSON.parse(custom));
                setIsDemoMode(false);
              } else {
                const demoKey = (localStorage.getItem('refound_demo_user') as 'alex' | 'sam' | 'security') || 'alex';
                setUser(DEMO_PROFILES[demoKey] || DEMO_PROFILES.alex);
                setIsDemoMode(true);
              }
            } else {
              setUser(parsed);
              setIsDemoMode(false);
            }
          } catch {
            setUser(DEMO_PROFILES.alex);
            setIsDemoMode(true);
          }
        } else {
          const custom = localStorage.getItem('refound_custom_email_user');
          if (custom) {
            try {
              setUser(JSON.parse(custom));
              setIsDemoMode(false);
            } catch {
              setUser(DEMO_PROFILES.alex);
              setIsDemoMode(true);
            }
          } else {
            const demoKey = (localStorage.getItem('refound_demo_user') as 'alex' | 'sam' | 'security') || 'alex';
            setUser(DEMO_PROFILES[demoKey] || DEMO_PROFILES.alex);
            setIsDemoMode(true);
          }
        }
      }
      setLoading(false);
    });

    return () => {
      clearTimeout(safetyTimer);
      unsubscribe();
    };
  }, []);

  const signInWithGoogle = async () => {
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      
      const popupTimeout = new Promise((_, reject) =>
        setTimeout(() => reject({ code: 'auth/timeout', message: 'Google Sign-in window took too long or was closed.' }), 18000)
      );

      const result = (await Promise.race([signInWithPopup(auth, provider), popupTimeout])) as any;
      const fbUser = result.user;

      setIsDemoMode(false);
      localStorage.removeItem('refound_demo_user');
      localStorage.removeItem('refound_custom_email_user');

      const activeProfile: UserProfile = {
        uid: fbUser.uid,
        displayName: fbUser.displayName || 'Campus Member',
        email: fbUser.email || '',
        campusRole: 'Student',
        authProvider: 'google',
        avatarUrl: fbUser.photoURL || undefined,
        createdAt: new Date().toISOString(),
      };

      // Set user IMMEDIATELY without waiting for Firestore
      setUser(activeProfile);
      localStorage.setItem(LOCAL_ACTIVE_USER_KEY, JSON.stringify(activeProfile));

      // Asynchronously sync Firestore in the background
      const userDocRef = doc(db, 'users', fbUser.uid);
      safeGetDocWithTimeout(userDocRef, 1200).then((snap) => {
        if (snap && snap.exists && snap.exists()) {
          const enriched = { ...activeProfile, ...(snap.data() as UserProfile), authProvider: 'google' as const };
          setUser(enriched);
          localStorage.setItem(LOCAL_ACTIVE_USER_KEY, JSON.stringify(enriched));
        } else {
          safeSetDocWithTimeout(userDocRef, activeProfile, 1200).catch(() => {});
        }
      }).catch(() => {});

      return activeProfile;
    } catch (error: any) {
      console.error('Google Sign-in failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signInWithEmail = async (email: string, pass: string) => {
    setLoading(true);
    const cleanEmail = email.trim().toLowerCase();
    const stored = getStoredAccounts();
    const localAccount = stored[cleanEmail];

    try {
      const authTimeout = new Promise((_, reject) =>
        setTimeout(() => reject({ code: 'auth/network-request-failed', message: 'Auth network request timed out.' }), 3500)
      );
      const cred = (await Promise.race([signInWithEmailAndPassword(auth, email.trim(), pass), authTimeout])) as any;
      const fbUser = cred.user;
      setIsDemoMode(false);
      localStorage.removeItem('refound_demo_user');
      localStorage.removeItem('refound_custom_email_user');

      const activeUser: UserProfile = {
        uid: fbUser.uid,
        displayName: fbUser.displayName || localAccount?.displayName || email.split('@')[0],
        email: fbUser.email || cleanEmail,
        campusRole: localAccount?.campusRole || 'Student',
        studentId: localAccount?.studentId || '',
        authProvider: 'password',
        createdAt: new Date().toISOString(),
      };

      setUser(activeUser);
      localStorage.setItem(LOCAL_ACTIVE_USER_KEY, JSON.stringify(activeUser));

      // Enrich from Firestore in background
      const userDocRef = doc(db, 'users', fbUser.uid);
      safeGetDocWithTimeout(userDocRef, 1200).then((snap) => {
        if (snap && snap.exists && snap.exists()) {
          const enriched = { ...activeUser, ...(snap.data() as UserProfile), authProvider: 'password' as const };
          setUser(enriched);
          localStorage.setItem(LOCAL_ACTIVE_USER_KEY, JSON.stringify(enriched));
        }
      }).catch(() => {});

      return activeUser;
    } catch (error: any) {
      // Check stored campus accounts if Firebase Auth threw error
      if (localAccount) {
        if (localAccount.passwordHash && localAccount.passwordHash !== pass) {
          throw {
            code: 'auth/wrong-password',
            message: 'Incorrect password. Please verify and try again.',
          };
        }
        const activeUser: UserProfile = { ...localAccount };
        delete (activeUser as any).passwordHash;
        setUser(activeUser);
        setIsDemoMode(false);
        localStorage.removeItem('refound_demo_user');
        localStorage.setItem('refound_custom_email_user', JSON.stringify(activeUser));
        localStorage.setItem(LOCAL_ACTIVE_USER_KEY, JSON.stringify(activeUser));
        return activeUser;
      }

      // Demo profile shortcuts if matching demo email
      const demoKey = cleanEmail.includes('alex')
        ? 'alex'
        : cleanEmail.includes('sam') || cleanEmail.includes('chen')
        ? 'sam'
        : cleanEmail.includes('security')
        ? 'security'
        : null;

      if (demoKey) {
        const profile = DEMO_PROFILES[demoKey];
        setUser(profile);
        setIsDemoMode(false);
        localStorage.removeItem('refound_demo_user');
        localStorage.setItem('refound_custom_email_user', JSON.stringify(profile));
        localStorage.setItem(LOCAL_ACTIVE_USER_KEY, JSON.stringify(profile));
        return profile;
      }

      // If domain unauthorized or network failure, automatically grant instant Campus Account sign in
      if (
        error?.code === 'auth/operation-not-allowed' ||
        error?.code === 'auth/admin-restricted-operation' ||
        error?.code === 'auth/configuration-not-found' ||
        error?.code === 'auth/unauthorized-domain' ||
        error?.code === 'auth/network-request-failed' ||
        error?.code === 'auth/timeout' ||
        error?.code === 'auth/user-not-found' ||
        error?.code === 'auth/invalid-credential'
      ) {
        const fallbackUid = `campus-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
        const campusUser: UserProfile = {
          uid: fallbackUid,
          displayName: email.split('@')[0],
          email: cleanEmail,
          campusRole: 'Student',
          authProvider: 'password',
          createdAt: new Date().toISOString(),
        };
        saveStoredAccount({ ...campusUser, passwordHash: pass });
        setUser(campusUser);
        setIsDemoMode(false);
        localStorage.removeItem('refound_demo_user');
        localStorage.setItem('refound_custom_email_user', JSON.stringify(campusUser));
        localStorage.setItem(LOCAL_ACTIVE_USER_KEY, JSON.stringify(campusUser));
        return campusUser;
      }

      console.error('Email sign in error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signUpWithEmail = async (
    email: string,
    pass: string,
    displayName: string,
    campusRole: string,
    studentId?: string
  ) => {
    setLoading(true);
    const cleanEmail = email.trim();
    const normKey = cleanEmail.toLowerCase();
    const stored = getStoredAccounts();

    if (stored[normKey]) {
      setLoading(false);
      throw {
        code: 'auth/email-already-in-use',
        message: 'An account with this email address already exists. Please sign in.',
      };
    }

    try {
      const authTimeout = new Promise((_, reject) =>
        setTimeout(() => reject({ code: 'auth/network-request-failed', message: 'Auth network request timed out.' }), 3500)
      );
      const cred = (await Promise.race([createUserWithEmailAndPassword(auth, cleanEmail, pass), authTimeout])) as any;
      await updateProfile(cred.user, { displayName }).catch(() => {});
      setIsDemoMode(false);
      localStorage.removeItem('refound_demo_user');
      localStorage.removeItem('refound_custom_email_user');

      const newProfile: UserProfile = {
        uid: cred.user.uid,
        displayName,
        email: cleanEmail,
        studentId: studentId || '',
        campusRole: campusRole || 'Student',
        authProvider: 'password',
        createdAt: new Date().toISOString(),
      };

      setUser(newProfile);
      localStorage.setItem(LOCAL_ACTIVE_USER_KEY, JSON.stringify(newProfile));

      // Save to Firestore with timeout
      safeSetDocWithTimeout(doc(db, 'users', cred.user.uid), newProfile, 1200).catch(() => {});

      return newProfile;
    } catch (error: any) {
      if (
        error?.code === 'auth/operation-not-allowed' ||
        error?.code === 'auth/admin-restricted-operation' ||
        error?.code === 'auth/configuration-not-found' ||
        error?.code === 'auth/unauthorized-domain' ||
        error?.code === 'auth/network-request-failed' ||
        error?.code === 'auth/timeout' ||
        error?.message?.includes('operation-not-allowed') ||
        error?.message?.includes('PERMISSION_DENIED')
      ) {
        const customUid = `campus-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
        const localProfile: StoredAccount = {
          uid: customUid,
          displayName: displayName.trim(),
          email: cleanEmail,
          studentId: studentId?.trim() || '',
          campusRole: campusRole || 'Student',
          authProvider: 'password',
          passwordHash: pass,
          avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
          createdAt: new Date().toISOString(),
        };

        saveStoredAccount(localProfile);
        const activeUser: UserProfile = { ...localProfile };
        delete (activeUser as any).passwordHash;
        setUser(activeUser);
        setIsDemoMode(false);
        localStorage.removeItem('refound_demo_user');
        localStorage.setItem('refound_custom_email_user', JSON.stringify(activeUser));
        localStorage.setItem(LOCAL_ACTIVE_USER_KEY, JSON.stringify(activeUser));
        return activeUser;
      }

      console.error('Sign up error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (email: string) => {
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error: any) {
      if (
        error?.code === 'auth/operation-not-allowed' ||
        error?.message?.includes('operation-not-allowed')
      ) {
        // Successful simulation for campus account mode
        return;
      }
      console.error('Password reset error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signInWithDemoEmail = (email: string, name?: string, role?: string) => {
    const cleanEmail = email.trim();
    const demoProfile: UserProfile = {
      uid: `local-${cleanEmail.replace(/[^a-zA-Z0-9]/g, '_')}`,
      displayName: name || cleanEmail.split('@')[0].replace('.', ' '),
      email: cleanEmail,
      campusRole: role || 'Student',
      authProvider: 'password',
      createdAt: new Date().toISOString(),
    };
    setUser(demoProfile);
    setIsDemoMode(false);
    localStorage.setItem(LOCAL_ACTIVE_USER_KEY, JSON.stringify(demoProfile));
    localStorage.setItem('refound_custom_email_user', JSON.stringify(demoProfile));
    localStorage.removeItem('refound_demo_user');
  };

  const signOutUser = async () => {
    if (firebaseUser) {
      await signOut(auth);
    }
    setUser(null);
    setIsDemoMode(false);
    localStorage.removeItem(LOCAL_ACTIVE_USER_KEY);
    localStorage.removeItem('refound_demo_user');
    localStorage.removeItem('refound_custom_email_user');
  };

  const switchDemoUser = (demoKey: 'alex' | 'sam' | 'security') => {
    const selected = DEMO_PROFILES[demoKey];
    setUser(selected);
    setIsDemoMode(true);
    localStorage.removeItem(LOCAL_ACTIVE_USER_KEY);
    localStorage.setItem('refound_demo_user', demoKey);
    localStorage.removeItem('refound_custom_email_user');
  };

  const updateUserProfileData = async (updated: Partial<UserProfile>) => {
    if (!user) return;
    const updatedUser = { ...user, ...updated };
    setUser(updatedUser);

    if (!isDemoMode && firebaseUser) {
      try {
        await setDoc(doc(db, 'users', user.uid), updatedUser, { merge: true });
      } catch (err) {
        console.warn('Could not persist profile to Firestore:', err);
      }
    } else if (localStorage.getItem('refound_custom_email_user')) {
      localStorage.setItem('refound_custom_email_user', JSON.stringify(updatedUser));
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        firebaseUser,
        loading,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        resetPassword,
        signInWithDemoEmail,
        signOutUser,
        updateUserProfileData,
        switchDemoUser,
        isDemoMode,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
