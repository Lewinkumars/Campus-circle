import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { auth, googleProvider, db, handleFirestoreError, OperationType } from '../firebase';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';

interface AuthContextType {
  user: User | null;
  dbUser: any | null;
  loading: boolean;
  isSigningIn: boolean;
  signIn: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [dbUser, setDbUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSigningIn, setIsSigningIn] = useState(false);

  useEffect(() => {
    let unsubscribeProfile: () => void;
    
    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Fetch or create user in Firestore and listen for real-time updates
        const userPath = `users/${currentUser.uid}`;
        const userRef = doc(db, 'users', currentUser.uid);
        
        unsubscribeProfile = onSnapshot(userRef, async (docSnap) => {
          if (docSnap.exists()) {
            setDbUser(docSnap.data());
            setLoading(false);
          } else {
            const newUser = {
              uid: currentUser.uid,
              email: currentUser.email,
              name: currentUser.displayName || 'Student',
              year: '1st Year', // Default
              branch: 'General', // Default
              trustScore: 0,
              createdAt: new Date().toISOString(),
            };
            try {
              await setDoc(userRef, newUser);
              setDbUser(newUser);
              setLoading(false);
            } catch (error) {
              handleFirestoreError(error, OperationType.WRITE, userPath);
            }
          }
        }, (error) => {
          handleFirestoreError(error, OperationType.GET, userPath);
        });
      } else {
        setDbUser(null);
        setLoading(false);
        if (unsubscribeProfile) unsubscribeProfile();
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, []);

  const signIn = async () => {
    if (isSigningIn) return;
    setIsSigningIn(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      if (error.code !== 'auth/cancelled-popup-request' && error.code !== 'auth/popup-closed-by-user') {
        console.error("Error signing in", error);
      }
    } finally {
      setIsSigningIn(false);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out", error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, dbUser, loading, isSigningIn, signIn, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
