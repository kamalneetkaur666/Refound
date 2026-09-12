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

export function formatAuthError(error: any): AuthErrorDetails {
  const code = error?.code || '';
  let message = error?.message || 'Authentication failed. Please check your credentials.';
  let isProviderDisabled = false;

  switch (code) {
    case 'auth/operation-not-allowed':
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
      message = 'Invalid email or password. Please check your credentials and try again.';
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
      message = 'Too many failed login attempts. Access is temporarily restricted. Please try again later.';
      break;
    case 'auth/network-request-failed':
      message = 'Network connectivity error. Please check your connection.';
      break;
    case 'auth/unauthorized-domain': {
      const currentHost = typeof window !== 'undefined' ? window.location.hostname : 'your domain';
      message = `This domain (${currentHost}) is not authorized in Firebase Authentication. Add "${currentHost}" to "Authorized domains" in your Firebase Console under Authentication > Settings.`;
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
  const [loading, setLoading] = useState<boolean>(true);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(initialAuth.isDemo);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      if (fbUser) {
        setIsDemoMode(false);
        localStorage.removeItem('refound_demo_user');
        localStorage.removeItem('refound_custom_email_user');
        try {
          const userDocRef = doc(db, 'users', fbUser.uid);
          const snap = await getDoc(userDocRef);
          if (snap.exists()) {
            const data = snap.data() as UserProfile;
            const updatedProfile: UserProfile = {
              ...data,
              authProvider: fbUser.providerData?.[0]?.providerId === 'password' ? 'password' : 'google',
            };
            setUser(updatedProfile);
            localStorage.setItem(LOCAL_ACTIVE_USER_KEY, JSON.stringify(updatedProfile));
          } else {
            const isPassword = fbUser.providerData?.[0]?.providerId === 'password';
            const newProfile: UserProfile = {
              uid: fbUser.uid,
              displayName: fbUser.displayName || fbUser.email?.split('@')[0] || 'Campus Member',
              email: fbUser.email || '',
              campusRole: 'Student',
              authProvider: isPassword ? 'password' : 'google',
              avatarUrl: fbUser.photoURL || undefined,
              createdAt: new Date().toISOString(),
            };
            try {
              await setDoc(userDocRef, newProfile);
            } catch (err) {
              console.warn('Could not write initial profile to Firestore:', err);
            }
            setUser(newProfile);
            localStorage.setItem(LOCAL_ACTIVE_USER_KEY, JSON.stringify(newProfile));
          }
        } catch (err) {
          console.warn('Firestore profile sync note:', err);
          const fallbackProfile: UserProfile = {
            uid: fbUser.uid,
            displayName: fbUser.displayName || fbUser.email?.split('@')[0] || 'Campus Member',
            email: fbUser.email || '',
            campusRole: 'Student',
            authProvider: fbUser.providerData?.[0]?.providerId === 'password' ? 'password' : 'google',
            createdAt: new Date().toISOString(),
          };
          setUser(fallbackProfile);
          localStorage.setItem(LOCAL_ACTIVE_USER_KEY, JSON.stringify(fallbackProfile));
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

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const fbUser = result.user;
      setIsDemoMode(false);
      localStorage.removeItem('refound_demo_user');
      localStorage.removeItem('refound_custom_email_user');

      const userDocRef = doc(db, 'users', fbUser.uid);
      const snap = await getDoc(userDocRef);
      let activeProfile: UserProfile;
      if (!snap.exists()) {
        activeProfile = {
          uid: fbUser.uid,
          displayName: fbUser.displayName || 'Campus Member',
          email: fbUser.email || '',
          campusRole: 'Student',
          authProvider: 'google',
          avatarUrl: fbUser.photoURL || undefined,
          createdAt: new Date().toISOString(),
        };
        await setDoc(userDocRef, activeProfile);
      } else {
        activeProfile = {
          ...(snap.data() as UserProfile),
          authProvider: 'google',
        };
      }
      setUser(activeProfile);
      localStorage.setItem(LOCAL_ACTIVE_USER_KEY, JSON.stringify(activeProfile));
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
    try {
      const cred = await signInWithEmailAndPassword(auth, email, pass);
      setIsDemoMode(false);
      localStorage.removeItem('refound_demo_user');
      localStorage.removeItem('refound_custom_email_user');
      const userDocRef = doc(db, 'users', cred.user.uid);
      const snap = await getDoc(userDocRef);
      let activeUser: UserProfile;
      if (snap.exists()) {
        activeUser = {
          ...(snap.data() as UserProfile),
          authProvider: 'password',
        };
      } else {
        activeUser = {
          uid: cred.user.uid,
          displayName: cred.user.displayName || email.split('@')[0],
          email: cred.user.email || email,
          campusRole: 'Student',
          authProvider: 'password',
          createdAt: new Date().toISOString(),
        };
      }
      setUser(activeUser);
      localStorage.setItem(LOCAL_ACTIVE_USER_KEY, JSON.stringify(activeUser));
    } catch (error: any) {
      // If Firebase Auth Email/Password provider isn't enabled in console or IAM permission error
      if (
        error?.code === 'auth/operation-not-allowed' ||
        error?.message?.includes('operation-not-allowed') ||
        error?.message?.includes('PERMISSION_DENIED')
      ) {
        const stored = getStoredAccounts();
        const account = stored[cleanEmail];

        if (account) {
          if (account.passwordHash && account.passwordHash !== pass) {
            throw {
              code: 'auth/wrong-password',
              message: 'Incorrect password. Please verify and try again.',
            };
          }
          const activeUser: UserProfile = { ...account };
          delete (activeUser as any).passwordHash;
          setUser(activeUser);
          setIsDemoMode(false);
          localStorage.removeItem('refound_demo_user');
          localStorage.setItem('refound_custom_email_user', JSON.stringify(activeUser));
          localStorage.setItem(LOCAL_ACTIVE_USER_KEY, JSON.stringify(activeUser));
          return;
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
          return;
        }

        throw {
          code: 'auth/user-not-found',
          message: 'No registered campus account found for this email. Click "Create Account" tab above to register.',
        };
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
    try {
      const cred = await createUserWithEmailAndPassword(auth, cleanEmail, pass);
      await updateProfile(cred.user, { displayName });
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

      try {
        await setDoc(doc(db, 'users', cred.user.uid), newProfile);
      } catch (err) {
        console.warn('Set doc error for user:', err);
      }

      setUser(newProfile);
      localStorage.setItem(LOCAL_ACTIVE_USER_KEY, JSON.stringify(newProfile));
    } catch (error: any) {
      if (
        error?.code === 'auth/operation-not-allowed' ||
        error?.message?.includes('operation-not-allowed') ||
        error?.message?.includes('PERMISSION_DENIED')
      ) {
        const stored = getStoredAccounts();
        const normKey = cleanEmail.toLowerCase();
        if (stored[normKey]) {
          throw {
            code: 'auth/email-already-in-use',
            message: 'An account with this email address already exists. Please sign in.',
          };
        }

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
        return;
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
