// src/context/AuthContext.tsx
'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useMemo, useCallback } from 'react';
import { onAuthStateChanged, User as FirebaseUser, signOut } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, DocumentReference, DocumentData, collection, where, query, getDocs } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';


export interface AppUser extends DocumentData {
  uid: string;
  name: string;
  employeeId: string;
  phone: string;
  status: 'active' | 'inactive';
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

  // 添加調試信息
  useEffect(() => {
    console.log('AuthContext: 組件已載入');
    console.log('AuthContext: Firebase auth 狀態:', !!auth);
    console.log('AuthContext: Firebase db 狀態:', !!db);
  }, []);

  useEffect(() => {
    console.log('AuthContext: Starting auth state listener');
    
    if (!auth || !db) {
      console.error('Firebase not properly initialized');
      console.error('AuthContext: auth 存在:', !!auth);
      console.error('AuthContext: db 存在:', !!db);
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
            // 暫時使用 Firebase 用戶資料作為 appUser，繞過 Firestore 權限問題
            const employeeId = firebaseUser.email?.split('@')[0] || '001';
            console.log('AuthContext: Creating appUser from Firebase user, employeeId:', employeeId);
            
            // 創建一個基本的 appUser 物件
            const userData = {
              uid: firebaseUser.uid,
              name: firebaseUser.displayName || '使用者',
              employeeId: employeeId,
              phone: '0900000000', // 預設電話
              status: 'active' as const,
              roleRef: null as any,
            } as AppUser;
            
            console.log('AuthContext: Created appUser', userData);
            setAppUser(userData);
            
            // 重要：在 appUser 載入完成後設 isLoading 為 false
            if (isMounted) {
              console.log('AuthContext: Setting isLoading to false (after appUser created)');
              setIsLoading(false);
            }
          } catch (error) {
            console.error('AuthContext: Error creating appUser:', error);
            setAppUser(null);
            if (isMounted) {
              setIsLoading(false);
            }
          }
        } else {
          console.log('AuthContext: User signed out');
          setUser(null);
          setAppUser(null);
        }
      } catch (error) {
        console.error('AuthContext: Error in auth state change:', error);
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
      window.location.href = '/';
    } catch (error) {
      console.error('Logout error:', error);
      toast.error("登出時發生錯誤。");
    }
  }, []);

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
