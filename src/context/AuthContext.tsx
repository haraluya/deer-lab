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
    // 檢查 Firebase 是否正確初始化
    if (!auth || !db) {
      console.error('Firebase not properly initialized');
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (!isMounted) return;

        if (firebaseUser) {
          setUser(firebaseUser);
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
            setAppUser(userData);
          } else {
            setAppUser(null);
            console.error("Firebase Auth user exists but Firestore document is missing.");
          }
        } else {
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
          setIsLoading(false);
        }
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const logout = useCallback(async () => {
    try {
      await signOut(auth);
      toast.success("您已成功登出。");
      // 登入頁在根路徑 /
      router.push('/');
    } catch (error) {
      toast.error("登出時發生錯誤。");
    }
  }, [router]);

  const value = useMemo(() => ({
    user,
    appUser,
    isLoading,
    logout,
  }), [user, appUser, isLoading, logout]);

  // 【關鍵修正】
  // 移除 `!isLoading &&` 條件，永遠渲染 children。
  // 這樣伺服器端渲染 (SSR) 就不會因為 isLoading=true 而回傳 null。
  // 載入狀態的處理將完全由子元件 (如 DashboardLayout) 負責。
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => useContext(AuthContext);
