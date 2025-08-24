// src/context/AuthContext.tsx
'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useMemo, useCallback } from 'react';
import { onAuthStateChanged, User as FirebaseUser, signOut } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, DocumentReference, DocumentData } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export interface AppUser extends DocumentData {
  uid: string;
  name: string;
  employeeId: string;
  status: 'active' | 'inactive';
  hourlyWage: number;
  roleRef: DocumentReference; 
}

interface AuthContextType {
  user: FirebaseUser | null;
  appUser: AppUser | null;
  isLoading: boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  appUser: null,
  isLoading: true,
  logout: () => {},
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const router = useRouter();
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    console.log('AuthContext: Starting auth state listener');
    
    // 檢查 Firebase 是否正確初始化
    if (!auth || !db) {
      console.error('Firebase not properly initialized');
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log('AuthContext: Auth state changed', { firebaseUser: firebaseUser?.uid });
      
      try {
        if (!isMounted) return;

        if (firebaseUser) {
          console.log('AuthContext: User authenticated', firebaseUser.uid);
          setUser(firebaseUser);
          
          try {
            const userDocRef = doc(db, 'users', firebaseUser.uid);
            const userDocSnap = await getDoc(userDocRef);

            if (!isMounted) return;

            if (userDocSnap.exists()) {
              const firestoreData = userDocSnap.data();
              const userData = {
                uid: userDocSnap.id,
                ...firestoreData,
                hourlyWage: Number(firestoreData.hourlyWage) || 0,
              } as AppUser;
              console.log('AuthContext: User data loaded', userData);
              setAppUser(userData);
            } else {
              console.error("Firebase Auth user exists but Firestore document is missing.");
              setAppUser(null);
            }
          } catch (firestoreError) {
            console.error('Error loading user data from Firestore:', firestoreError);
            setAppUser(null);
          }
        } else {
          console.log('AuthContext: User signed out');
          setUser(null);
          setAppUser(null);
        }
      } catch (error) {
        console.error('Error in auth state change:', error);
        if (isMounted) {
          setUser(null);
          setAppUser(null);
        }
      } finally {
        if (isMounted) {
          console.log('AuthContext: Setting isLoading to false');
          setIsLoading(false);
        }
      }
    });

    return () => {
      console.log('AuthContext: Cleaning up auth listener');
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const logout = useCallback(async () => {
    try {
      await signOut(auth);
      toast.success("您已成功登出。");
      router.push('/');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error("登出時發生錯誤。");
    }
  }, [router]);

  const value = useMemo(() => ({
    user,
    appUser,
    isLoading,
    logout,
  }), [user, appUser, isLoading, logout]);

  console.log('AuthContext: Rendering with state', { user: user?.uid, appUser: appUser?.uid, isLoading });

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => useContext(AuthContext);
